/**
 * 数据迁移路由 - 用于将本地数据库和文件迁移到云托管
 * 仅限 super_admin 使用
 */
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const router = express.Router();
const { getDB } = require('../utils/db');
const { success, error } = require('../utils/response');

const DB_PATH = path.join(__dirname, '../../data/jinglaimei.db');
const UPLOADS_DIR = path.join(__dirname, '../../data/uploads');
const DATA_DIR = path.join(__dirname, '../../data');

// multer 配置 - 临时目录
const tmpDir = path.join(DATA_DIR, '_migration_tmp');
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, tmpDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}_${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB
});

// ==================== 导出本地数据为 JSON ====================
// GET /api/migrate/export-data
// 将本地数据库中所有核心表数据导出为 JSON
router.get('/export-data', (req, res) => {
  try {
    const db = getDB();

    // 要导出的核心表
    const tables = [
      'admins', 'users', 'teams', 'product_categories', 'products',
      'orders', 'order_items', 'commissions', 'withdrawals',
      'school_courses', 'study_progress', 'system_configs',
      'monthly_statistics', 'operation_logs', 'announcements',
      'inventory_records', 'inventory_stock',
      'videos', 'video_categories', 'video_series',
      'learning_books', 'user_book_favorites', 'user_read_progress',
      'video_orders', 'video_progress',
      'skin_reports', 'skin_issues', 'skin_issue_causes', 'skin_products', 'skin_care_plans',
      'ai_coach_sessions', 'ai_coach_messages', 'ai_coach_scenarios',
      'ai_levels', 'ai_level_questions', 'ai_level_attempts', 'ai_level_progress', 'ai_rankings',
      'ai_scripts',
      'socratic_sessions', 'socratic_questions', 'socratic_messages', 'socratic_scenarios',
      'balance_logs', 'system_settings',
      'action_commitments', 'action_commitments_checkins', 'action_daily_items',
      'action_daily_logs', 'action_goals', 'action_weekly_goals', 'action_weekly_summary',
      'action_monthly_tracking',
      'print_logs',
    ];

    const data = {};
    for (const table of tables) {
      try {
        const rows = db.prepare(`SELECT * FROM ${table}`).all();
        if (rows.length > 0) {
          data[table] = rows;
        }
      } catch (err) {
        // 表不存在则跳过
        console.log(`  ⚠️ 表 ${table} 不存在，跳过`);
      }
    }

    // 替换所有 localhost URL 为正式域名
    const jsonStr = JSON.stringify(data);
    const fixedStr = jsonStr
      .replace(/http:\/\/localhost:\d+/g, 'https://api.jinglaimei.com')
      .replace(/http:\/\/\d+\.\d+\.\d+\.\d+:\d+/g, 'https://api.jinglaimei.com');

    const result = JSON.parse(fixedStr);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=jinglaimei_data.json');
    res.send(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('导出数据失败:', err);
    error(res, '导出数据失败: ' + err.message);
  }
});

// ==================== 导入数据（从 JSON） ====================
// POST /api/migrate/import-data
// 接收 JSON 数据，逐表导入
router.post('/import-data', (req, res) => {
  try {
    const Database = require('better-sqlite3');
    const db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = OFF'); // 关闭外键检查，避免导入时约束冲突
    const data = req.body;
    const results = { imported: 0, errors: [] };

    for (const [table, rows] of Object.entries(data)) {
      if (!Array.isArray(rows) || rows.length === 0) continue;

      try {
        for (const row of rows) {
          // 获取列名
          const columns = Object.keys(row);
          const values = columns.map(c => row[c]);
          const placeholders = columns.map(() => '?').join(', ');
          const colStr = columns.join(', ');

          // 尝试 INSERT OR REPLACE（兼容已有数据）
          db.prepare(`INSERT OR REPLACE INTO ${table} (${colStr}) VALUES (${placeholders})`)
            .run(...values);
        }
        results.imported += rows.length;
        console.log(`  ✅ ${table}: ${rows.length} 条`);
      } catch (err) {
        console.error(`  ❌ ${table}: ${err.message}`);
        results.errors.push({ table, error: err.message });
      }
    }

    db.pragma('wal_checkpoint(TRUNCATE)'); // 确保数据刷盘
    db.close();
    success(res, results);
  } catch (err) {
    console.error('导入数据失败:', err);
    error(res, '导入数据失败: ' + err.message);
  }
});

// ==================== 创建缺失表 ====================
// POST /api/migrate/create-missing-tables
// 自动创建所有缺失的表（从本地的迁移SQL中读取）
router.post('/create-missing-tables', (req, res) => {
  try {
    const db = getDB();
    const results = [];

    const createTableSQLs = [
      `CREATE TABLE IF NOT EXISTS inventory_stock (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_name TEXT NOT NULL, product_code TEXT, category TEXT DEFAULT '未分类',
        unit TEXT DEFAULT '件', quantity INTEGER DEFAULT 0, total_in INTEGER DEFAULT 0,
        total_out INTEGER DEFAULT 0, avg_cost REAL DEFAULT 0.00, total_cost REAL DEFAULT 0.00,
        total_freight REAL DEFAULT 0.00, min_alert INTEGER DEFAULT 10, remark TEXT,
        status INTEGER DEFAULT 1, product_id INTEGER REFERENCES products(id),
        created_at TEXT DEFAULT (datetime('now','localtime')), updated_at TEXT DEFAULT (datetime('now','localtime'))
      )`,
      `CREATE TABLE IF NOT EXISTS inventory_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT, stock_id INTEGER NOT NULL,
        product_name TEXT NOT NULL, record_type TEXT NOT NULL, quantity INTEGER NOT NULL,
        unit_cost REAL DEFAULT 0.00, cost_total REAL DEFAULT 0.00, freight REAL DEFAULT 0.00,
        stock_before INTEGER DEFAULT 0, stock_after INTEGER DEFAULT 0,
        operator TEXT DEFAULT '管理员', remark TEXT, batch_no TEXT, supplier TEXT,
        created_at TEXT DEFAULT (datetime('now','localtime'))
      )`,
      `CREATE TABLE IF NOT EXISTS videos (
        id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT DEFAULT '',
        cover_url TEXT DEFAULT '', video_url TEXT NOT NULL, video_source TEXT DEFAULT 'upload',
        duration INTEGER DEFAULT 0, file_size INTEGER DEFAULT 0, category_id INTEGER DEFAULT 0,
        category_name TEXT DEFAULT '', series_id INTEGER, series_episode INTEGER DEFAULT 0,
        access_level TEXT DEFAULT 'all', price REAL DEFAULT 0, instructor TEXT DEFAULT '',
        instructor_avatar TEXT DEFAULT '', view_count INTEGER DEFAULT 0, like_count INTEGER DEFAULT 0,
        purchase_count INTEGER DEFAULT 0, tags TEXT DEFAULT '[]', difficulty TEXT DEFAULT 'beginner',
        status INTEGER DEFAULT 1, is_recommend INTEGER DEFAULT 0, is_top INTEGER DEFAULT 0,
        sort_order INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now','localtime')),
        updated_at TEXT DEFAULT (datetime('now','localtime'))
      )`,
      `CREATE TABLE IF NOT EXISTS video_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, icon TEXT DEFAULT '',
        description TEXT DEFAULT '', sort_order INTEGER DEFAULT 0, status INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now','localtime')), updated_at TEXT DEFAULT (datetime('now','localtime'))
      )`,
      `CREATE TABLE IF NOT EXISTS video_series (
        id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT DEFAULT '',
        cover_url TEXT DEFAULT '', category_id INTEGER DEFAULT 0, category_name TEXT DEFAULT '',
        price REAL DEFAULT 0, original_price REAL DEFAULT 0, access_level TEXT DEFAULT 'all',
        instructor TEXT DEFAULT '', instructor_avatar TEXT DEFAULT '', total_episodes INTEGER DEFAULT 0,
        total_duration INTEGER DEFAULT 0, difficulty TEXT DEFAULT 'beginner', tags TEXT DEFAULT '[]',
        view_count INTEGER DEFAULT 0, purchase_count INTEGER DEFAULT 0, student_count INTEGER DEFAULT 0,
        status INTEGER DEFAULT 1, is_recommend INTEGER DEFAULT 0, sort_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now','localtime')), updated_at TEXT DEFAULT (datetime('now','localtime'))
      )`,
      `CREATE TABLE IF NOT EXISTS video_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT, order_no TEXT NOT NULL UNIQUE, user_id INTEGER NOT NULL,
        target_type TEXT NOT NULL, target_id INTEGER NOT NULL, target_title TEXT DEFAULT '',
        amount REAL DEFAULT 0, payment_method TEXT DEFAULT 'balance', status TEXT DEFAULT 'pending',
        paid_at TEXT, created_at TEXT DEFAULT (datetime('now','localtime'))
      )`,
      `CREATE TABLE IF NOT EXISTS video_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, video_id INTEGER NOT NULL,
        progress_seconds INTEGER DEFAULT 0, total_seconds INTEGER DEFAULT 0,
        progress_percent INTEGER DEFAULT 0, is_completed INTEGER DEFAULT 0, completed_at TEXT,
        last_watch_time TEXT DEFAULT (datetime('now','localtime')), watch_count INTEGER DEFAULT 0,
        watch_duration INTEGER DEFAULT 0, notes TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now','localtime')), updated_at TEXT DEFAULT (datetime('now','localtime')),
        UNIQUE(user_id, video_id)
      )`,
      `CREATE TABLE IF NOT EXISTS learning_books (
        id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, author TEXT DEFAULT '',
        description TEXT DEFAULT '', category TEXT DEFAULT 'sales_psychology',
        difficulty TEXT DEFAULT 'beginner', pages INTEGER DEFAULT 0, reading_time INTEGER DEFAULT 0,
        tags TEXT DEFAULT '[]', summary TEXT DEFAULT '', key_points TEXT DEFAULT '[]',
        status TEXT DEFAULT 'available', file_url TEXT DEFAULT '', file_name TEXT DEFAULT '',
        file_format TEXT DEFAULT '', file_size INTEGER DEFAULT 0, cover_url TEXT DEFAULT '',
        views INTEGER DEFAULT 0, downloads INTEGER DEFAULT 0, sort_order INTEGER DEFAULT 0,
        access_level TEXT DEFAULT 'all', is_top INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now','localtime')), updated_at TEXT DEFAULT (datetime('now','localtime'))
      )`,
      `CREATE TABLE IF NOT EXISTS user_book_favorites (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, book_id INTEGER NOT NULL,
        created_at TEXT DEFAULT (datetime('now','localtime')), UNIQUE(user_id, book_id)
      )`,
      `CREATE TABLE IF NOT EXISTS skin_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, agent_id INTEGER DEFAULT 0,
        image_url TEXT NOT NULL DEFAULT '', image_path TEXT DEFAULT '',
        skin_type TEXT DEFAULT 'unknown', skin_type_confidence REAL DEFAULT 0,
        ai_overview TEXT DEFAULT '', ai_cause_analysis TEXT DEFAULT '', ai_script TEXT DEFAULT '',
        ai_raw_response TEXT DEFAULT '', issue_count INTEGER DEFAULT 0, total_severity INTEGER DEFAULT 0,
        status TEXT DEFAULT 'completed', error_msg TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS skin_issues (
        id INTEGER PRIMARY KEY AUTOINCREMENT, category TEXT NOT NULL DEFAULT 'other',
        name TEXT NOT NULL, icon TEXT DEFAULT '⚠', color TEXT DEFAULT '#e94560',
        description TEXT DEFAULT '', severity_range TEXT DEFAULT '1-5',
        sort_order INTEGER DEFAULT 0, status INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS skin_issue_causes (
        id INTEGER PRIMARY KEY AUTOINCREMENT, issue_id INTEGER NOT NULL,
        cause_text TEXT NOT NULL DEFAULT '', ai_analysis_template TEXT DEFAULT '',
        advice_text TEXT DEFAULT '', is_ai_generated INTEGER DEFAULT 0,
        sort_order INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS skin_products (
        id INTEGER PRIMARY KEY AUTOINCREMENT, issue_id INTEGER NOT NULL, product_id INTEGER NOT NULL,
        match_reason TEXT DEFAULT '', priority INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(issue_id, product_id)
      )`,
      `CREATE TABLE IF NOT EXISTS skin_care_plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT, issue_id INTEGER NOT NULL,
        care_type TEXT NOT NULL DEFAULT 'moisture', title TEXT NOT NULL DEFAULT '',
        content TEXT NOT NULL DEFAULT '', steps TEXT DEFAULT '[]',
        frequency TEXT DEFAULT '每日', duration TEXT DEFAULT '持续28天见效',
        sort_order INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS socratic_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, scenario_id INTEGER NOT NULL,
        personality_type TEXT DEFAULT '', status TEXT DEFAULT 'active', total_rounds INTEGER DEFAULT 0,
        question_score INTEGER DEFAULT 0, listening_score INTEGER DEFAULT 0,
        guiding_score INTEGER DEFAULT 0, timing_score INTEGER DEFAULT 0,
        depth_score INTEGER DEFAULT 0, overall_score INTEGER DEFAULT 0, grade TEXT DEFAULT '',
        feedback TEXT DEFAULT '', highlight_question TEXT DEFAULT '', duration INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP, ended_at DATETIME
      )`,
      `CREATE TABLE IF NOT EXISTS socratic_questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT, scenario_id INTEGER, question_type TEXT NOT NULL,
        question_text TEXT NOT NULL, purpose TEXT DEFAULT '', hint TEXT DEFAULT '',
        example_answer TEXT DEFAULT '', sort_order INTEGER DEFAULT 0, status INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS socratic_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT, session_id INTEGER NOT NULL, round_num INTEGER DEFAULT 0,
        role TEXT NOT NULL, content TEXT NOT NULL, question_type TEXT DEFAULT '', score INTEGER,
        hint TEXT DEFAULT '', is_best_question INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS socratic_scenarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, category TEXT NOT NULL DEFAULT 'general',
        personality_type TEXT DEFAULT '', difficulty TEXT DEFAULT 'medium', description TEXT DEFAULT '',
        customer_background TEXT DEFAULT '', initial_situation TEXT DEFAULT '', goal TEXT DEFAULT '',
        tips TEXT DEFAULT '', status INTEGER DEFAULT 1, sort_order INTEGER DEFAULT 0,
        usage_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS balance_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL,
        change_type TEXT NOT NULL DEFAULT 'manual', change_amount REAL NOT NULL,
        balance_before REAL NOT NULL DEFAULT 0, balance_after REAL NOT NULL DEFAULT 0,
        operator_id INTEGER, operator_name TEXT DEFAULT 'system', remark TEXT DEFAULT '',
        order_id INTEGER, related_id INTEGER,
        created_at TEXT DEFAULT (datetime('now','localtime'))
      )`,
      `CREATE TABLE IF NOT EXISTS system_settings (
        id INTEGER PRIMARY KEY CHECK(id=1), default_shipper TEXT DEFAULT '',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS print_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER NOT NULL, order_no TEXT NOT NULL,
        print_type TEXT DEFAULT 'shipping', shipper_name TEXT DEFAULT '', reviewer_name TEXT DEFAULT '',
        receiver_name TEXT NOT NULL, operator_id INTEGER DEFAULT 0, operator_name TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS action_commitments (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, title TEXT NOT NULL DEFAULT '',
        content TEXT NOT NULL DEFAULT '', duration INTEGER DEFAULT 30, start_date TEXT, end_date TEXT,
        status INTEGER DEFAULT 0, checkin_count INTEGER DEFAULT 0, total_days INTEGER DEFAULT 0,
        supervisor TEXT DEFAULT '', pk_person TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now','localtime')), updated_at TEXT DEFAULT (datetime('now','localtime'))
      )`,
      `CREATE TABLE IF NOT EXISTS action_commitments_checkins (
        id INTEGER PRIMARY KEY AUTOINCREMENT, commitment_id INTEGER NOT NULL, user_id INTEGER NOT NULL,
        checkin_date TEXT NOT NULL, daily_completed INTEGER DEFAULT 0, a_class_done INTEGER DEFAULT 0,
        mindset_score INTEGER DEFAULT 0, remark TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now','localtime')), UNIQUE(commitment_id, checkin_date)
      )`,
      `CREATE TABLE IF NOT EXISTS action_daily_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, log_date TEXT NOT NULL,
        priority TEXT NOT NULL DEFAULT 'A1', time_range TEXT DEFAULT '', task TEXT NOT NULL DEFAULT '',
        is_completed INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now','localtime'))
      )`,
      `CREATE TABLE IF NOT EXISTS action_daily_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, log_date TEXT NOT NULL,
        goal_type TEXT NOT NULL DEFAULT 'daily', content TEXT NOT NULL DEFAULT '', score INTEGER DEFAULT 0,
        mood TEXT DEFAULT '', remark TEXT DEFAULT '', study_content TEXT DEFAULT '',
        improvement TEXT DEFAULT '', mindset_serious INTEGER DEFAULT 0, mindset_optimistic INTEGER DEFAULT 0,
        mindset_confident INTEGER DEFAULT 0, mindset_commitment INTEGER DEFAULT 0, mindset_love INTEGER DEFAULT 0,
        mindset_no_excuse INTEGER DEFAULT 0, mindset_total INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now','localtime')), UNIQUE(user_id, log_date, goal_type)
      )`,
      `CREATE TABLE IF NOT EXISTS action_goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL,
        goal_type TEXT NOT NULL DEFAULT 'annual', category TEXT NOT NULL DEFAULT '',
        title TEXT NOT NULL DEFAULT '', content TEXT NOT NULL DEFAULT '', status INTEGER DEFAULT 0,
        progress INTEGER DEFAULT 0, start_date TEXT, end_date TEXT, priority TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now','localtime')), updated_at TEXT DEFAULT (datetime('now','localtime')),
        UNIQUE(user_id, goal_type, category, title)
      )`,
      `CREATE TABLE IF NOT EXISTS action_weekly_goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, week_start TEXT NOT NULL,
        week_end TEXT NOT NULL, priority TEXT NOT NULL DEFAULT 'A1', title TEXT NOT NULL DEFAULT '',
        deadline TEXT DEFAULT '', is_completed INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now','localtime')), updated_at TEXT DEFAULT (datetime('now','localtime'))
      )`,
      `CREATE TABLE IF NOT EXISTS action_weekly_summary (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, week_start TEXT NOT NULL,
        week_end TEXT NOT NULL, completion TEXT DEFAULT '', uncompleted_reason TEXT DEFAULT '',
        improvement TEXT DEFAULT '', harvest TEXT DEFAULT '', next_plan TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now','localtime')), updated_at TEXT DEFAULT (datetime('now','localtime')),
        UNIQUE(user_id, week_start)
      )`,
      `CREATE TABLE IF NOT EXISTS action_monthly_tracking (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, month TEXT NOT NULL,
        goal_title TEXT NOT NULL DEFAULT '', target_value TEXT DEFAULT '', actual_value TEXT DEFAULT '',
        gap TEXT DEFAULT '', completion_rate REAL DEFAULT 0, reflection TEXT DEFAULT '', note TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now','localtime')), updated_at TEXT DEFAULT (datetime('now','localtime'))
      )`,
      // ==================== 苏格拉底学院补充表 ====================
      `CREATE TABLE IF NOT EXISTS user_achievements (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, achievement_id INTEGER NOT NULL,
        session_id INTEGER, notified INTEGER DEFAULT 0, unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, achievement_id)
      )`,
      `CREATE TABLE IF NOT EXISTS achievements (
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, description TEXT DEFAULT '',
        icon TEXT DEFAULT '', category TEXT DEFAULT 'training', condition_type TEXT DEFAULT 'count',
        condition_field TEXT DEFAULT '', condition_target INTEGER DEFAULT 1, xp_reward INTEGER DEFAULT 10,
        sort_order INTEGER DEFAULT 0, status INTEGER DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS learning_paths (
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, description TEXT DEFAULT '',
        scenario_ids TEXT DEFAULT '[]', difficulty TEXT DEFAULT 'medium', xp_reward INTEGER DEFAULT 0,
        sort_order INTEGER DEFAULT 0, status INTEGER DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS user_path_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, path_id INTEGER NOT NULL,
        current_step INTEGER DEFAULT 0, completed_scenario_ids TEXT DEFAULT '[]', status TEXT DEFAULT 'in_progress',
        score_summary TEXT DEFAULT '{}', started_at DATETIME DEFAULT CURRENT_TIMESTAMP, completed_at DATETIME,
        UNIQUE(user_id, path_id)
      )`,
      `CREATE TABLE IF NOT EXISTS daily_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
        description TEXT DEFAULT '', target_count INTEGER DEFAULT 1, xp_reward INTEGER DEFAULT 10,
        sort_order INTEGER DEFAULT 0, status INTEGER DEFAULT 1
      )`,
      `CREATE TABLE IF NOT EXISTS daily_task_completions (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, task_id INTEGER NOT NULL,
        completion_date TEXT NOT NULL, current_count INTEGER DEFAULT 0, completed INTEGER DEFAULT 0,
        UNIQUE(user_id, task_id, completion_date)
      )`,
      `CREATE TABLE IF NOT EXISTS session_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, session_id INTEGER NOT NULL UNIQUE,
        snapshot_date TEXT DEFAULT '', scores_json TEXT DEFAULT '{}', grade TEXT DEFAULT '',
        overall_score INTEGER DEFAULT 0, scenario_category TEXT DEFAULT '', personality_type TEXT DEFAULT '',
        duration INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      // ==================== AI话术教练补充表 ====================
      `CREATE TABLE IF NOT EXISTS ai_coach_scenarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, category TEXT NOT NULL DEFAULT 'general',
        personality_type TEXT DEFAULT '', difficulty TEXT DEFAULT 'medium', description TEXT DEFAULT '',
        customer_background TEXT DEFAULT '', initial_situation TEXT DEFAULT '', goal TEXT DEFAULT '',
        tips TEXT DEFAULT '', status INTEGER DEFAULT 1, sort_order INTEGER DEFAULT 0,
        usage_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS ai_coach_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, scenario_id INTEGER NOT NULL,
        personality_type TEXT DEFAULT '', status TEXT DEFAULT 'active', total_rounds INTEGER DEFAULT 0,
        overall_score INTEGER DEFAULT 0, grade TEXT DEFAULT '', feedback TEXT DEFAULT '',
        duration INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP, ended_at DATETIME
      )`,
      `CREATE TABLE IF NOT EXISTS ai_coach_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT, session_id INTEGER NOT NULL, round_num INTEGER DEFAULT 0,
        role TEXT NOT NULL, content TEXT NOT NULL, score INTEGER DEFAULT NULL,
        hint TEXT DEFAULT '', is_best_response INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      // ==================== 学习积分表 ====================
      `CREATE TABLE IF NOT EXISTS study_point_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, source_type TEXT NOT NULL,
        source_id INTEGER DEFAULT 0, points INTEGER NOT NULL DEFAULT 0, description TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now','localtime'))
      )`,
      `CREATE TABLE IF NOT EXISTS study_points_config (
        id INTEGER PRIMARY KEY CHECK(id=1), total_points INTEGER DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      // ==================== 话术收藏表 ====================
      `CREATE TABLE IF NOT EXISTS personality_favorites (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, script_id INTEGER NOT NULL,
        created_at TEXT DEFAULT (datetime('now','localtime')), UNIQUE(user_id, script_id)
      )`,
    ];

    for (const sql of createTableSQLs) {
      try {
        const tableName = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)[1];
        const exists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(tableName);
        if (!exists) {
          db.exec(sql);
          results.push({ table: tableName, status: 'created' });
        } else {
          results.push({ table: tableName, status: 'already_exists' });
        }
      } catch (err) {
        results.push({ table: 'unknown', status: 'error', error: err.message });
      }
    }

    success(res, { created: results.filter(r => r.status === 'created').length, results });
  } catch (err) {
    error(res, '创建表失败: ' + err.message);
  }
});

// ==================== 替换 URL ====================
// POST /api/migrate/fix-urls
// 将数据库中所有 localhost URL 替换为正式域名
router.post('/fix-urls', (req, res) => {
  try {
    const db = getDB();
    const { from = 'http://localhost', to = 'https://api.jinglaimei.com' } = req.body;

    let totalFixed = 0;
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();

    for (const t of tables) {
      try {
        const cols = db.prepare(`PRAGMA table_info("${t.name}")`).all();
        for (const col of cols) {
          if (col.type && col.type.toUpperCase().includes('TEXT')) {
            const result = db.prepare(`UPDATE "${t.name}" SET "${col.name}" = REPLACE("${col.name}", ?, ?) WHERE "${col.name}" LIKE ?`)
              .run(from, to, `%${from}%`);
            if (result.changes > 0) {
              totalFixed += result.changes;
              console.log(`  🔧 ${t.name}.${col.name}: ${result.changes} 条已替换`);
            }
          }
        }
      } catch { /* skip */ }
    }

    success(res, { message: `URL替换完成`, totalFixed, from, to });
  } catch (err) {
    error(res, 'URL替换失败: ' + err.message);
  }
});

// ==================== 上传 SQLite 数据库文件 ====================
// POST /api/migrate/upload-db
// 接收 SQLite 数据库文件，替换当前数据库
router.post('/upload-db', upload.single('dbfile'), (req, res) => {
  try {
    if (!req.file) {
      return error(res, '请上传数据库文件');
    }

    const uploadedPath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();

    if (ext !== '.db' && ext !== '.sqlite' && ext !== '.sqlite3') {
      fs.unlinkSync(uploadedPath);
      return error(res, '仅支持 .db / .sqlite / .sqlite3 格式的数据库文件');
    }

    // 验证上传的文件是否为有效的 SQLite 数据库
    try {
      const Database = require('better-sqlite3');
      const testDb = new Database(uploadedPath, { readonly: true });
      const tables = testDb.prepare("SELECT COUNT(*) as cnt FROM sqlite_master WHERE type='table'").get();
      testDb.close();

      if (tables.cnt === 0) {
        fs.unlinkSync(uploadedPath);
        return error(res, '数据库文件中没有找到任何表');
      }
    } catch (err) {
      fs.unlinkSync(uploadedPath);
      return error(res, '无效的 SQLite 数据库文件: ' + err.message);
    }

    // 备份当前数据库
    const backupPath = DB_PATH + '.backup_' + Date.now();
    if (fs.existsSync(DB_PATH)) {
      fs.copyFileSync(DB_PATH, backupPath);
      console.log('📦 当前数据库已备份到:', backupPath);
    }

    // 关闭当前数据库连接（通过 db.js 模块暴露的 close 方法）
    const dbModulePath = require.resolve('../utils/db');
    delete require.cache[dbModulePath];

    // 替换数据库文件
    fs.copyFileSync(uploadedPath, DB_PATH);
    fs.unlinkSync(uploadedPath);

    // 删除残余的 WAL/SHM 文件
    try {
      if (fs.existsSync(DB_PATH + '-wal')) fs.unlinkSync(DB_PATH + '-wal');
      if (fs.existsSync(DB_PATH + '-shm')) fs.unlinkSync(DB_PATH + '-shm');
      console.log('🗑️ WAL/SHM 文件已清理');
    } catch (e) { /* 忽略 */ }

    // 重新加载数据库并验证
    const { getDB: reloadDB } = require('../utils/db');
    const newDb = reloadDB();
    const admins = newDb.prepare('SELECT COUNT(*) as cnt FROM admins').get();

    // 删除预置数据库文件，防止启动后自动覆盖
    const preseedPath = path.join(DATA_DIR, 'jinglaimei.db.preseed');
    if (fs.existsSync(preseedPath)) {
      try {
        fs.unlinkSync(preseedPath);
        console.log('🗑️ 预置数据库已删除，防止自动覆盖');
      } catch (e) {
        console.warn('⚠️ 删除预置数据库失败:', e.message);
      }
    }

    // 清除所有引用了旧 getDB 的路由模块缓存，强制重新加载
    try {
      const routeDir = path.join(__dirname, '../routes');
      const files = fs.readdirSync(routeDir).filter(f => f.endsWith('.js'));
      for (const file of files) {
        const fullPath = path.join(routeDir, file);
        if (require.cache[fullPath]) {
          delete require.cache[fullPath];
        }
      }
      // 也清除 services 缓存
      const svcDir = path.join(__dirname, '../services');
      if (fs.existsSync(svcDir)) {
        const svcFiles = fs.readdirSync(svcDir).filter(f => f.endsWith('.js'));
        for (const file of svcFiles) {
          const fullPath = path.join(svcDir, file);
          if (require.cache[fullPath]) {
            delete require.cache[fullPath];
          }
        }
      }
      console.log('🗑️ 已清除所有路由/服务模块缓存');
    } catch (e) {
      console.warn('⚠️ 清除模块缓存失败:', e.message);
    }

    success(res, {
      message: '数据库替换成功',
      backupPath,
      adminsCount: admins.cnt,
      note: '备份文件保留在服务器上，如需回滚请联系技术人员'
    });
  } catch (err) {
    console.error('数据库替换失败:', err);
    error(res, '数据库替换失败: ' + err.message);
  }
});

// ==================== 上传文件压缩包 ====================
// POST /api/migrate/upload-files
// 接收 zip 压缩包，解压到 uploads 目录
router.post('/upload-files', upload.single('zipfile'), (req, res) => {
  try {
    if (!req.file) {
      return error(res, '请上传文件压缩包');
    }

    const uploadedPath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();

    if (ext !== '.zip') {
      fs.unlinkSync(uploadedPath);
      return error(res, '仅支持 .zip 格式的压缩包');
    }

    // 解压到 uploads 目录
    const extractDir = UPLOADS_DIR;
    if (!fs.existsSync(extractDir)) {
      fs.mkdirSync(extractDir, { recursive: true });
    }

    // 使用 unzip 命令解压
    try {
      execSync(`unzip -o "${uploadedPath}" -d "${extractDir}"`, {
        stdio: 'pipe',
        timeout: 120000 // 2分钟超时
      });
    } catch (err) {
      // 如果 unzip 不可用，尝试用 node 的方式
      console.warn('unzip 命令不可用，尝试其他方式...');
      // 回退: 使用 Python
      try {
        execSync(`python3 -c "
import zipfile, os, sys
with zipfile.ZipFile('${uploadedPath}', 'r') as z:
    z.extractall('${extractDir}')
    print(f'Extracted {len(z.namelist())} files')
"`, { stdio: 'pipe', timeout: 120000 });
      } catch (err2) {
        fs.unlinkSync(uploadedPath);
        return error(res, '解压失败: ' + err2.message);
      }
    }

    // 清理临时文件
    fs.unlinkSync(uploadedPath);

    // 统计解压后的文件
    const dirs = {};
    const subdirs = fs.readdirSync(extractDir, { withFileTypes: true });
    for (const d of subdirs) {
      if (d.isDirectory()) {
        const files = fs.readdirSync(path.join(extractDir, d.name));
        dirs[d.name] = files.length;
      }
    }

    success(res, {
      message: '文件解压成功',
      extractedDirs: dirs,
      extractPath: extractDir
    });
  } catch (err) {
    console.error('文件上传解压失败:', err);
    error(res, '文件上传解压失败: ' + err.message);
  }
});

// ==================== 获取当前状态 ====================
// GET /api/migrate/status
router.get('/status', (req, res) => {
  try {
    const db = getDB();

    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
    const tableStats = {};

    for (const t of tables) {
      try {
        const count = db.prepare(`SELECT COUNT(*) as cnt FROM "${t.name}"`).get();
        tableStats[t.name] = count.cnt;
      } catch {
        tableStats[t.name] = -1; // 无法读取
      }
    }

    // 上传目录大小
    let uploadSize = 0;
    let uploadFiles = 0;
    if (fs.existsSync(UPLOADS_DIR)) {
      const calcSize = (dir) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const e of entries) {
          const fullPath = path.join(dir, e.name);
          if (e.isDirectory()) calcSize(fullPath);
          else {
            uploadFiles++;
            uploadSize += fs.statSync(fullPath).size;
          }
        }
      };
      calcSize(UPLOADS_DIR);
    }

    success(res, {
      dbPath: DB_PATH,
      dbSize: fs.existsSync(DB_PATH) ? fs.statSync(DB_PATH).size : 0,
      tables: tableStats,
      uploadsDir: UPLOADS_DIR,
      uploadsSize: uploadSize,
      uploadsFiles: uploadFiles,
    });
  } catch (err) {
    error(res, '获取状态失败: ' + err.message);
  }
});

// ==================== 执行SQL ====================
// POST /api/migrate/execute-sql
// 执行原始SQL（仅super_admin，用于修复表结构等紧急操作）
router.post('/execute-sql', (req, res) => {
  try {
    const db = getDB();
    const { sql } = req.body;
    if (!sql || typeof sql !== 'string') {
      return error(res, '请提供sql参数');
    }
    // 安全检查：仅允许DDL语句
    const normalized = sql.trim().toUpperCase();
    if (!normalized.startsWith('CREATE') && !normalized.startsWith('ALTER') && !normalized.startsWith('DROP') && !normalized.startsWith('INSERT') && !normalized.startsWith('UPDATE') && !normalized.startsWith('DELETE') && !normalized.startsWith('SELECT')) {
      return error(res, '仅允许DDL/DML语句');
    }
    const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
    const results = [];
    for (const stmt of statements) {
      try {
        if (stmt.toUpperCase().startsWith('SELECT')) {
          const rows = db.prepare(stmt).all();
          results.push({ statement: stmt.substring(0, 80) + '...', type: 'query', rows: rows.length, data: rows });
        } else {
          const info = db.exec(stmt);
          results.push({ statement: stmt.substring(0, 80) + '...', type: 'exec', success: true });
        }
      } catch (err) {
        results.push({ statement: stmt.substring(0, 80) + '...', type: 'error', error: err.message });
      }
    }
    success(res, { executed: results.length, results });
  } catch (err) {
    error(res, '执行SQL失败: ' + err.message);
  }
});

/**
 * POST /api/migrate/upload-to-cos
 * 将本地 uploads 目录下的所有文件批量上传到 COS（保持原始路径）
 * 上传完成后本地文件仍然保留，COS代理中间件会优先使用COS版本
 */
router.post('/upload-to-cos', async (req, res) => {
  try {
    const { useCOS, uploadFromDisk } = require('../utils/cosUpload');

    if (!useCOS) {
      return error(res, 'COS 未配置，无法上传到 COS');
    }

    if (!fs.existsSync(UPLOADS_DIR)) {
      return error(res, '本地 uploads 目录不存在');
    }

    // 收集所有文件
    const allFiles = [];
    function walkDir(dir, baseDir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walkDir(fullPath, baseDir);
        } else {
          const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
          const stat = fs.statSync(fullPath);
          allFiles.push({ localPath: fullPath, cosKey: relPath, size: stat.size });
        }
      }
    }
    walkDir(UPLOADS_DIR, UPLOADS_DIR);

    if (allFiles.length === 0) {
      return success(res, { total: 0, uploaded: 0, message: '没有找到需要上传的文件' });
    }

    // 排除视频文件（太大）
    const files = allFiles.filter(f => !f.localPath.toLowerCase().endsWith('.mp4'));

    console.log(`[COS迁移] 开始上传 ${files.length} 个文件到 COS...`);
    let uploaded = 0;
    let failed = 0;
    const errors = [];

    for (const file of files) {
      try {
        const cosUrl = await uploadFromDisk(file.localPath, file.cosKey);
        if (cosUrl) {
          uploaded++;
        } else {
          failed++;
          errors.push(file.cosKey + ': uploadFromDisk返回null');
        }
      } catch (err) {
        failed++;
        errors.push(file.cosKey + ': ' + err.message);
      }
    }

    console.log(`[COS迁移] 完成: 成功 ${uploaded}, 失败 ${failed}`);

    success(res, {
      total: files.length,
      uploaded,
      failed,
      errors: errors.slice(0, 20), // 最多返回20个错误
      message: `已上传 ${uploaded} 个文件到 COS`
    });
  } catch (err) {
    console.error('[COS迁移] 异常:', err);
    error(res, 'COS迁移失败: ' + err.message);
  }
});

// ==================== COS 诊断 ====================
// GET /api/migrate/cos-diagnose - 诊断 COS 连接和上传状态
router.get('/cos-diagnose', async (req, res) => {
  try {
    const result = {};

    // 1. 检查环境变量
    result.env = {
      COS_BUCKET: process.env.COS_BUCKET || '未设置',
      COS_REGION: process.env.COS_REGION || '未设置',
      useCOS: !!(process.env.COS_BUCKET && process.env.COS_REGION),
    };

    // 2. 测试 getauth 接口
    try {
      const { getCOSAuth } = require('../utils/cosUpload');
      const auth = await getCOSAuth();
      result.getauth = {
        success: true,
        hasTmpSecretId: !!auth.TmpSecretId,
        hasTmpSecretKey: !!auth.TmpSecretKey,
        hasToken: !!auth.Token,
        expiredTime: auth.ExpiredTime,
      };
    } catch (err) {
      result.getauth = { success: false, error: err.message };
    }

    // 3. 测试 COS 上传一个测试文件
    try {
      const { uploadFile } = require('../utils/cosUpload');
      const testContent = Buffer.from('COS diagnostic test ' + new Date().toISOString());
      const testUrl = await uploadFile(testContent, 'uploads/__cos_test__.txt', 'text/plain');
      result.uploadTest = {
        success: !!testUrl,
        url: testUrl,
      };
    } catch (err) {
      result.uploadTest = { success: false, error: err.message };
    }

    // 4. 测试 COS 下载（getObject）
    try {
      const { getObject } = require('../utils/cosUpload');
      const obj = await getObject('uploads/__cos_test__.txt');
      result.downloadTest = {
        success: !!obj,
        hasBody: !!obj.Body,
        contentType: obj.ContentType,
      };
    } catch (err) {
      result.downloadTest = { success: false, error: err.message };
    }

    // 5. 测试一个真实商品图片的 COS 下载
    try {
      const { getObject } = require('../utils/cosUpload');
      const obj = await getObject('products/8ae9471f-da45-4624-98f3-43c6d620ae60.jpg');
      result.realImageTest = {
        success: !!obj,
        hasBody: !!obj.Body,
        contentLength: obj.ContentLength,
      };
    } catch (err) {
      result.realImageTest = { success: false, error: err.message };
    }

    success(res, result);
  } catch (err) {
    error(res, 'COS诊断异常: ' + err.message);
  }
});

module.exports = router;
