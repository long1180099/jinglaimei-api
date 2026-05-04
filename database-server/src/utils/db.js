/**
 * 数据库连接单例（自动初始化表结构）
 */
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '../../data/jinglaimei.db');

if (!fs.existsSync(path.dirname(DB_PATH))) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

// ⚠️ 已禁用 preseed：微信云托管容器重建时持久化存储可能丢失，
// preseed 会覆盖生产数据（导致用户丢失、已删除用户恢复）。
// 改用 CREATE TABLE IF NOT EXISTS 纯建空表，不包含任何业务数据。
console.log('📂 数据库路径:', DB_PATH, '存在:', fs.existsSync(DB_PATH));

let db;

function getDB() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    // 自动初始化表结构（仅首次/表不存在时）
    _autoInit(db);
  }
  return db;
}

function _autoInit(db) {
  // 始终执行建表语句（CREATE TABLE IF NOT EXISTS 幂等，不会覆盖已有表）
  // 这样即使数据库已有旧表结构，新增的表也能被正确创建
  console.log('🚀 检查数据库表结构...');
  const isNew = !db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='admins'").get();

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT, openid TEXT UNIQUE, unionid TEXT,
      username TEXT NOT NULL, phone TEXT UNIQUE, email TEXT, avatar_url TEXT,
      real_name TEXT, gender INTEGER DEFAULT 0, birthday TEXT,
      agent_level INTEGER DEFAULT 1, parent_id INTEGER DEFAULT NULL,
      team_id INTEGER DEFAULT NULL, invite_code TEXT UNIQUE,
      registered_at TEXT NOT NULL, balance REAL DEFAULT 0.00,
      frozen_balance REAL DEFAULT 0.00, total_income REAL DEFAULT 0.00,
      today_income REAL DEFAULT 0.00, status INTEGER DEFAULT 1,
      is_deleted INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL, real_name TEXT, email TEXT, phone TEXT,
      avatar_url TEXT, role TEXT DEFAULT 'operator', permissions TEXT DEFAULT '[]',
      last_login_at TEXT, last_login_ip TEXT, status INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT, team_name TEXT NOT NULL,
      leader_id INTEGER NOT NULL, description TEXT, member_count INTEGER DEFAULT 0,
      total_sales REAL DEFAULT 0.00, total_commission REAL DEFAULT 0.00,
      monthly_target REAL DEFAULT 0.00, monthly_achievement REAL DEFAULT 0.00,
      team_level INTEGER DEFAULT 1, performance_rating REAL DEFAULT 0.00,
      status INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (leader_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS product_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT, category_name TEXT NOT NULL,
      parent_id INTEGER DEFAULT 0, icon_url TEXT, sort_order INTEGER DEFAULT 0,
      status INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT, product_code TEXT UNIQUE NOT NULL,
      product_name TEXT NOT NULL, category_id INTEGER NOT NULL, brand TEXT,
      retail_price REAL NOT NULL, vip_price REAL, agent_price REAL,
      partner_price REAL, wholesale_price REAL, chief_price REAL,
      division_price REAL, cost_price REAL, stock_quantity INTEGER DEFAULT 0,
      sold_quantity INTEGER DEFAULT 0, min_stock_alert INTEGER DEFAULT 10,
      description TEXT, specifications TEXT, main_image TEXT,
      image_gallery TEXT DEFAULT '[]', status INTEGER DEFAULT 1,
      is_hot INTEGER DEFAULT 0, is_recommend INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (category_id) REFERENCES product_categories(id)
    );
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT, order_no TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL, total_amount REAL NOT NULL,
      discount_amount REAL DEFAULT 0.00, shipping_fee REAL DEFAULT 0.00,
      actual_amount REAL NOT NULL, paid_amount REAL DEFAULT 0.00,
      receiver_name TEXT NOT NULL, receiver_phone TEXT NOT NULL,
      receiver_address TEXT NOT NULL, shipping_method TEXT, shipping_no TEXT,
      order_status INTEGER DEFAULT 0, payment_status INTEGER DEFAULT 0,
      payment_method TEXT, payment_time TEXT, buyer_remark TEXT,
      seller_remark TEXT, order_time TEXT NOT NULL, shipping_time TEXT,
      confirm_time TEXT, cancel_time TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL, product_name TEXT NOT NULL,
      product_image TEXT, unit_price REAL NOT NULL, quantity INTEGER NOT NULL,
      subtotal REAL NOT NULL, specifications TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );
    CREATE TABLE IF NOT EXISTS commissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL,
      order_id INTEGER NOT NULL, commission_type INTEGER DEFAULT 1,
      commission_rate REAL NOT NULL, order_amount REAL NOT NULL,
      commission_amount REAL NOT NULL, commission_status INTEGER DEFAULT 0,
      settlement_time TEXT, source_user_id INTEGER,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS withdrawals (
      id INTEGER PRIMARY KEY AUTOINCREMENT, withdrawal_no TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL, withdrawal_amount REAL NOT NULL,
      service_fee REAL DEFAULT 0.00, actual_amount REAL NOT NULL,
      bank_name TEXT NOT NULL, bank_card_no TEXT NOT NULL,
      account_name TEXT NOT NULL, withdrawal_status INTEGER DEFAULT 0,
      audit_user_id INTEGER, audit_time TEXT, audit_remark TEXT,
      payment_time TEXT, payment_remark TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS school_courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT, course_type INTEGER NOT NULL,
      course_title TEXT NOT NULL, course_subtitle TEXT, cover_image TEXT,
      video_url TEXT, content TEXT, attachments TEXT DEFAULT '[]',
      required_time INTEGER DEFAULT 0, difficulty_level INTEGER DEFAULT 1,
      credit_points INTEGER DEFAULT 0, status INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0, view_count INTEGER DEFAULT 0,
      like_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE TABLE IF NOT EXISTS study_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL,
      course_id INTEGER NOT NULL, study_status INTEGER DEFAULT 0,
      progress_percent REAL DEFAULT 0.00, study_duration INTEGER DEFAULT 0,
      exam_score REAL, exam_time TEXT, start_time TEXT, complete_time TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime')),
      UNIQUE(user_id, course_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (course_id) REFERENCES school_courses(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS system_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT, config_key TEXT UNIQUE NOT NULL,
      config_value TEXT, config_type TEXT, description TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE TABLE IF NOT EXISTS monthly_statistics (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL,
      statistic_month TEXT NOT NULL, sales_amount REAL DEFAULT 0.00,
      commission_amount REAL DEFAULT 0.00, order_count INTEGER DEFAULT 0,
      new_members INTEGER DEFAULT 0, active_members INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      UNIQUE(user_id, statistic_month),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS operation_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT, operator_id INTEGER,
      operator_type TEXT DEFAULT 'admin', action TEXT NOT NULL,
      target_type TEXT, target_id INTEGER, description TEXT,
      ip_address TEXT, user_agent TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE TABLE IF NOT EXISTS balance_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL,
      change_type TEXT NOT NULL DEFAULT 'manual', change_amount REAL NOT NULL,
      balance_before REAL DEFAULT 0, balance_after REAL DEFAULT 0,
      operator_id INTEGER, operator_name TEXT, remark TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS user_admin_roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL,
      role TEXT NOT NULL, permissions TEXT DEFAULT '[]',
      assigned_by INTEGER, status INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime')),
      UNIQUE(user_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    -- ==================== 以下表从 migrate.js 同步，确保容器重建后自动创建 ====================
    CREATE TABLE IF NOT EXISTS inventory_stock (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_name TEXT NOT NULL, product_code TEXT, category TEXT DEFAULT '未分类',
      unit TEXT DEFAULT '件', quantity INTEGER DEFAULT 0, total_in INTEGER DEFAULT 0,
      total_out INTEGER DEFAULT 0, avg_cost REAL DEFAULT 0.00, total_cost REAL DEFAULT 0.00,
      total_freight REAL DEFAULT 0.00, min_alert INTEGER DEFAULT 10, remark TEXT,
      status INTEGER DEFAULT 1, product_id INTEGER REFERENCES products(id),
      created_at TEXT DEFAULT (datetime('now','localtime')), updated_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE TABLE IF NOT EXISTS inventory_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT, stock_id INTEGER NOT NULL,
      product_name TEXT NOT NULL, record_type TEXT NOT NULL, quantity INTEGER NOT NULL,
      unit_cost REAL DEFAULT 0.00, cost_total REAL DEFAULT 0.00, freight REAL DEFAULT 0.00,
      stock_before INTEGER DEFAULT 0, stock_after INTEGER DEFAULT 0,
      operator TEXT DEFAULT '管理员', remark TEXT, batch_no TEXT, supplier TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE TABLE IF NOT EXISTS videos (
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
    );
    CREATE TABLE IF NOT EXISTS video_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, icon TEXT DEFAULT '',
      description TEXT DEFAULT '', sort_order INTEGER DEFAULT 0, status INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime')), updated_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE TABLE IF NOT EXISTS video_series (
      id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT DEFAULT '',
      cover_url TEXT DEFAULT '', category_id INTEGER DEFAULT 0, category_name TEXT DEFAULT '',
      price REAL DEFAULT 0, original_price REAL DEFAULT 0, access_level TEXT DEFAULT 'all',
      instructor TEXT DEFAULT '', instructor_avatar TEXT DEFAULT '', total_episodes INTEGER DEFAULT 0,
      total_duration INTEGER DEFAULT 0, difficulty TEXT DEFAULT 'beginner', tags TEXT DEFAULT '[]',
      view_count INTEGER DEFAULT 0, purchase_count INTEGER DEFAULT 0, student_count INTEGER DEFAULT 0,
      status INTEGER DEFAULT 1, is_recommend INTEGER DEFAULT 0, sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime')), updated_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE TABLE IF NOT EXISTS video_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT, order_no TEXT NOT NULL UNIQUE, user_id INTEGER NOT NULL,
      target_type TEXT NOT NULL, target_id INTEGER NOT NULL, target_title TEXT DEFAULT '',
      amount REAL DEFAULT 0, payment_method TEXT DEFAULT 'balance', status TEXT DEFAULT 'pending',
      paid_at TEXT, created_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE TABLE IF NOT EXISTS video_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, video_id INTEGER NOT NULL,
      progress_seconds INTEGER DEFAULT 0, total_seconds INTEGER DEFAULT 0,
      progress_percent INTEGER DEFAULT 0, is_completed INTEGER DEFAULT 0, completed_at TEXT,
      last_watch_time TEXT DEFAULT (datetime('now','localtime')), watch_count INTEGER DEFAULT 0,
      watch_duration INTEGER DEFAULT 0, notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime')), updated_at TEXT DEFAULT (datetime('now','localtime')),
      UNIQUE(user_id, video_id)
    );
    CREATE TABLE IF NOT EXISTS learning_books (
      id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, author TEXT DEFAULT '',
      description TEXT DEFAULT '', category TEXT DEFAULT 'sales_psychology',
      difficulty TEXT DEFAULT 'beginner', pages INTEGER DEFAULT 0, reading_time INTEGER DEFAULT 0,
      tags TEXT DEFAULT '[]', summary TEXT DEFAULT '', key_points TEXT DEFAULT '[]',
      status TEXT DEFAULT 'available', file_url TEXT DEFAULT '', file_name TEXT DEFAULT '',
      file_format TEXT DEFAULT '', file_size INTEGER DEFAULT 0, cover_url TEXT DEFAULT '',
      views INTEGER DEFAULT 0, downloads INTEGER DEFAULT 0, sort_order INTEGER DEFAULT 0,
      access_level TEXT DEFAULT 'all', is_top INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime')), updated_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE TABLE IF NOT EXISTS user_book_favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, book_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now','localtime')), UNIQUE(user_id, book_id)
    );
    CREATE TABLE IF NOT EXISTS skin_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, agent_id INTEGER DEFAULT 0,
      image_url TEXT NOT NULL DEFAULT '', image_path TEXT DEFAULT '',
      skin_type TEXT DEFAULT 'unknown', skin_type_confidence REAL DEFAULT 0,
      ai_overview TEXT DEFAULT '', ai_cause_analysis TEXT DEFAULT '', ai_script TEXT DEFAULT '',
      ai_raw_response TEXT DEFAULT '', issue_count INTEGER DEFAULT 0, total_severity INTEGER DEFAULT 0,
      status TEXT DEFAULT 'completed', error_msg TEXT DEFAULT '',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS skin_issues (
      id INTEGER PRIMARY KEY AUTOINCREMENT, category TEXT NOT NULL DEFAULT 'other',
      name TEXT NOT NULL, icon TEXT DEFAULT '⚠', color TEXT DEFAULT '#e94560',
      description TEXT DEFAULT '', severity_range TEXT DEFAULT '1-5',
      sort_order INTEGER DEFAULT 0, status INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS skin_issue_causes (
      id INTEGER PRIMARY KEY AUTOINCREMENT, issue_id INTEGER NOT NULL,
      cause_text TEXT NOT NULL DEFAULT '', ai_analysis_template TEXT DEFAULT '',
      advice_text TEXT DEFAULT '', is_ai_generated INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS skin_products (
      id INTEGER PRIMARY KEY AUTOINCREMENT, issue_id INTEGER NOT NULL, product_id INTEGER NOT NULL,
      match_reason TEXT DEFAULT '', priority INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP, UNIQUE(issue_id, product_id)
    );
    CREATE TABLE IF NOT EXISTS skin_care_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT, issue_id INTEGER NOT NULL,
      care_type TEXT NOT NULL DEFAULT 'moisture', title TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '', steps TEXT DEFAULT '[]',
      frequency TEXT DEFAULT '每日', duration TEXT DEFAULT '持续28天见效',
      sort_order INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS skin_report_issues (
      id INTEGER PRIMARY KEY AUTOINCREMENT, report_id INTEGER NOT NULL,
      issue_name TEXT NOT NULL DEFAULT '', category TEXT NOT NULL DEFAULT '',
      severity INTEGER DEFAULT 1, confidence REAL DEFAULT 0, area TEXT DEFAULT '',
      description TEXT DEFAULT '', cause_text TEXT DEFAULT '', advice_text TEXT DEFAULT '',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (report_id) REFERENCES skin_reports(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS socratic_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, scenario_id INTEGER NOT NULL,
      personality_type TEXT DEFAULT '', status TEXT DEFAULT 'active', total_rounds INTEGER DEFAULT 0,
      question_score INTEGER DEFAULT 0, listening_score INTEGER DEFAULT 0,
      guiding_score INTEGER DEFAULT 0, timing_score INTEGER DEFAULT 0,
      depth_score INTEGER DEFAULT 0, overall_score INTEGER DEFAULT 0, grade TEXT DEFAULT '',
      feedback TEXT DEFAULT '', highlight_question TEXT DEFAULT '', duration INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP, ended_at TEXT
    );
    CREATE TABLE IF NOT EXISTS socratic_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, scenario_id INTEGER, question_type TEXT NOT NULL,
      question_text TEXT NOT NULL, purpose TEXT DEFAULT '', hint TEXT DEFAULT '',
      example_answer TEXT DEFAULT '', sort_order INTEGER DEFAULT 0, status INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS socratic_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT, session_id INTEGER NOT NULL, round_num INTEGER DEFAULT 0,
      role TEXT NOT NULL, content TEXT NOT NULL, question_type TEXT DEFAULT '', score INTEGER,
      hint TEXT DEFAULT '', is_best_question INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS socratic_scenarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, category TEXT NOT NULL DEFAULT 'general',
      personality_type TEXT DEFAULT '', difficulty TEXT DEFAULT 'medium', description TEXT DEFAULT '',
      customer_background TEXT DEFAULT '', initial_situation TEXT DEFAULT '', goal TEXT DEFAULT '',
      tips TEXT DEFAULT '', status INTEGER DEFAULT 1, sort_order INTEGER DEFAULT 0,
      usage_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS system_settings (
      id INTEGER PRIMARY KEY CHECK(id=1), default_shipper TEXT DEFAULT '',
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS print_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER NOT NULL, order_no TEXT NOT NULL,
      print_type TEXT DEFAULT 'shipping', shipper_name TEXT DEFAULT '', reviewer_name TEXT DEFAULT '',
      receiver_name TEXT NOT NULL, operator_id INTEGER DEFAULT 0, operator_name TEXT DEFAULT '',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS action_commitments (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, title TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '', duration INTEGER DEFAULT 30, start_date TEXT, end_date TEXT,
      status INTEGER DEFAULT 0, checkin_count INTEGER DEFAULT 0, total_days INTEGER DEFAULT 0,
      supervisor TEXT DEFAULT '', pk_person TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime')), updated_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE TABLE IF NOT EXISTS action_commitments_checkins (
      id INTEGER PRIMARY KEY AUTOINCREMENT, commitment_id INTEGER NOT NULL, user_id INTEGER NOT NULL,
      checkin_date TEXT NOT NULL, daily_completed INTEGER DEFAULT 0, a_class_done INTEGER DEFAULT 0,
      mindset_score INTEGER DEFAULT 0, remark TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime')), UNIQUE(commitment_id, checkin_date)
    );
    CREATE TABLE IF NOT EXISTS action_daily_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, log_date TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'A1', time_range TEXT DEFAULT '', task TEXT NOT NULL DEFAULT '',
      is_completed INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE TABLE IF NOT EXISTS action_daily_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, log_date TEXT NOT NULL,
      goal_type TEXT NOT NULL DEFAULT 'daily', content TEXT NOT NULL DEFAULT '', score INTEGER DEFAULT 0,
      mood TEXT DEFAULT '', remark TEXT DEFAULT '', study_content TEXT DEFAULT '',
      improvement TEXT DEFAULT '', mindset_serious INTEGER DEFAULT 0, mindset_optimistic INTEGER DEFAULT 0,
      mindset_confident INTEGER DEFAULT 0, mindset_commitment INTEGER DEFAULT 0, mindset_love INTEGER DEFAULT 0,
      mindset_no_excuse INTEGER DEFAULT 0, mindset_total INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime')), UNIQUE(user_id, log_date, goal_type)
    );
    CREATE TABLE IF NOT EXISTS action_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL,
      goal_type TEXT NOT NULL DEFAULT 'annual', category TEXT NOT NULL DEFAULT '',
      title TEXT NOT NULL DEFAULT '', content TEXT NOT NULL DEFAULT '', status INTEGER DEFAULT 0,
      progress INTEGER DEFAULT 0, start_date TEXT, end_date TEXT, priority TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime')), updated_at TEXT DEFAULT (datetime('now','localtime')),
      UNIQUE(user_id, goal_type, category, title)
    );
    CREATE TABLE IF NOT EXISTS action_weekly_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, week_start TEXT NOT NULL,
      week_end TEXT NOT NULL, priority TEXT NOT NULL DEFAULT 'A1', title TEXT NOT NULL DEFAULT '',
      deadline TEXT DEFAULT '', is_completed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime')), updated_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE TABLE IF NOT EXISTS action_weekly_summary (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, week_start TEXT NOT NULL,
      week_end TEXT NOT NULL, completion TEXT DEFAULT '', uncompleted_reason TEXT DEFAULT '',
      improvement TEXT DEFAULT '', harvest TEXT DEFAULT '', next_plan TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime')), updated_at TEXT DEFAULT (datetime('now','localtime')),
      UNIQUE(user_id, week_start)
    );
    CREATE TABLE IF NOT EXISTS action_monthly_tracking (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, month TEXT NOT NULL,
      goal_title TEXT NOT NULL DEFAULT '', target_value TEXT DEFAULT '', actual_value TEXT DEFAULT '',
      gap TEXT DEFAULT '', completion_rate REAL DEFAULT 0, reflection TEXT DEFAULT '', note TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime')), updated_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE TABLE IF NOT EXISTS user_achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, achievement_id INTEGER NOT NULL,
      session_id INTEGER, notified INTEGER DEFAULT 0, unlocked_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, achievement_id)
    );
    CREATE TABLE IF NOT EXISTS achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, description TEXT DEFAULT '',
      icon TEXT DEFAULT '', category TEXT DEFAULT 'training', condition_type TEXT DEFAULT 'count',
      condition_field TEXT DEFAULT '', condition_target INTEGER DEFAULT 1, xp_reward INTEGER DEFAULT 10,
      sort_order INTEGER DEFAULT 0, status INTEGER DEFAULT 1, created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS learning_paths (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, description TEXT DEFAULT '',
      scenario_ids TEXT DEFAULT '[]', difficulty TEXT DEFAULT 'medium', xp_reward INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0, status INTEGER DEFAULT 1, created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS user_path_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, path_id INTEGER NOT NULL,
      current_step INTEGER DEFAULT 0, completed_scenario_ids TEXT DEFAULT '[]', status TEXT DEFAULT 'in_progress',
      score_summary TEXT DEFAULT '{}', started_at TEXT DEFAULT CURRENT_TIMESTAMP, completed_at TEXT,
      UNIQUE(user_id, path_id)
    );
    CREATE TABLE IF NOT EXISTS daily_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
      description TEXT DEFAULT '', target_count INTEGER DEFAULT 1, xp_reward INTEGER DEFAULT 10,
      sort_order INTEGER DEFAULT 0, status INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS daily_task_completions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, task_id INTEGER NOT NULL,
      completion_date TEXT NOT NULL, current_count INTEGER DEFAULT 0, completed INTEGER DEFAULT 0,
      UNIQUE(user_id, task_id, completion_date)
    );
    CREATE TABLE IF NOT EXISTS session_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, session_id INTEGER NOT NULL UNIQUE,
      snapshot_date TEXT DEFAULT '', scores_json TEXT DEFAULT '{}', grade TEXT DEFAULT '',
      overall_score INTEGER DEFAULT 0, scenario_category TEXT DEFAULT '', personality_type TEXT DEFAULT '',
      duration INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS ai_coach_scenarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, category TEXT NOT NULL DEFAULT 'general',
      personality_type TEXT DEFAULT '', difficulty TEXT DEFAULT 'medium', description TEXT DEFAULT '',
      customer_background TEXT DEFAULT '', initial_situation TEXT DEFAULT '', goal TEXT DEFAULT '',
      tips TEXT DEFAULT '', status INTEGER DEFAULT 1, sort_order INTEGER DEFAULT 0,
      usage_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS ai_coach_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, scenario_id INTEGER NOT NULL,
      personality_type TEXT DEFAULT '', status TEXT DEFAULT 'active', total_rounds INTEGER DEFAULT 0,
      overall_score INTEGER DEFAULT 0, grade TEXT DEFAULT '', feedback TEXT DEFAULT '',
      duration INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP, ended_at TEXT
    );
    CREATE TABLE IF NOT EXISTS ai_coach_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT, session_id INTEGER NOT NULL, round_num INTEGER DEFAULT 0,
      role TEXT NOT NULL, content TEXT NOT NULL, score INTEGER DEFAULT NULL,
      hint TEXT DEFAULT '', is_best_response INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS study_point_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, source_type TEXT NOT NULL,
      source_id INTEGER DEFAULT 0, points INTEGER NOT NULL DEFAULT 0, description TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE TABLE IF NOT EXISTS study_points_config (
      id INTEGER PRIMARY KEY CHECK(id=1), total_points INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS personality_favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, script_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now','localtime')), UNIQUE(user_id, script_id)
    );
    CREATE TABLE IF NOT EXISTS ranking_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL UNIQUE,
      rank_position INTEGER DEFAULT 0, display_name TEXT, highlight_color TEXT DEFAULT '#e94560',
      badge_text TEXT, is_pinned INTEGER DEFAULT 0, is_hidden INTEGER DEFAULT 0, custom_note TEXT,
      created_by INTEGER, updated_by INTEGER,
      created_at TEXT DEFAULT (datetime('now','localtime')), updated_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS ranking_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT, setting_key TEXT NOT NULL UNIQUE,
      setting_value TEXT, description TEXT,
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE TABLE IF NOT EXISTS script_feeds (
      id INTEGER PRIMARY KEY AUTOINCREMENT, raw_content TEXT NOT NULL,
      target_personality TEXT DEFAULT '', target_scene TEXT DEFAULT '', admin_notes TEXT DEFAULT '',
      status TEXT DEFAULT 'pending', priority INTEGER DEFAULT 0,
      optimized_content TEXT, optimization_prompt TEXT, optimized_at TEXT,
      created_script_id TEXT, published_at TEXT, ai_raw_response TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')), updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS sales_scripts (
      id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT DEFAULT '', content TEXT DEFAULT '',
      category TEXT DEFAULT '', difficulty INTEGER DEFAULT 1, sort_order INTEGER DEFAULT 0,
      status INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime')), updated_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE TABLE IF NOT EXISTS study_points (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL,
      points INTEGER DEFAULT 0, available_points INTEGER DEFAULT 0, spent_points INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime')), updated_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, content TEXT DEFAULT '',
      announcement_type TEXT DEFAULT 'notice', priority INTEGER DEFAULT 0,
      status INTEGER DEFAULT 1, published_at TEXT, expired_at TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')), updated_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL,
      customer_name TEXT NOT NULL, phone TEXT, wechat TEXT, notes TEXT,
      source TEXT DEFAULT 'manual', status INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime')), updated_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS product_usage_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, product_id INTEGER NOT NULL,
      usage_date TEXT, usage_frequency TEXT DEFAULT 'daily', skin_feedback TEXT DEFAULT '',
      satisfaction INTEGER DEFAULT 0, notes TEXT DEFAULT '', status INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime')), updated_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );
    CREATE TABLE IF NOT EXISTS ebook_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, icon TEXT DEFAULT '',
      description TEXT DEFAULT '', sort_order INTEGER DEFAULT 0, status INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime')), updated_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE TABLE IF NOT EXISTS ai_scripts (
      id INTEGER PRIMARY KEY AUTOINCREMENT, content TEXT NOT NULL,
      category TEXT DEFAULT 'general', personality_type TEXT DEFAULT '',
      difficulty INTEGER DEFAULT 1, tips TEXT DEFAULT '',
      status INTEGER DEFAULT 1, feed_id INTEGER,
      is_optimized INTEGER DEFAULT 0, published_at TEXT,
      sort_order INTEGER DEFAULT 0, source TEXT DEFAULT 'admin',
      created_at TEXT DEFAULT (datetime('now','localtime')), updated_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE TABLE IF NOT EXISTS ai_levels (
      id INTEGER PRIMARY KEY AUTOINCREMENT, level_name TEXT NOT NULL,
      description TEXT DEFAULT '', min_score INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0, status INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS ai_level_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, level_id INTEGER NOT NULL,
      question_text TEXT NOT NULL, correct_answer TEXT NOT NULL,
      options TEXT DEFAULT '[]', explanation TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0, status INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (level_id) REFERENCES ai_levels(id)
    );
    CREATE TABLE IF NOT EXISTS ai_level_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, level_id INTEGER NOT NULL,
      total_questions INTEGER DEFAULT 0, correct_count INTEGER DEFAULT 0,
      best_score INTEGER DEFAULT 0, best_time INTEGER DEFAULT 0,
      attempt_count INTEGER DEFAULT 0, status TEXT DEFAULT 'locked',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, level_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (level_id) REFERENCES ai_levels(id)
    );
    CREATE TABLE IF NOT EXISTS ai_level_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, level_id INTEGER NOT NULL,
      score INTEGER DEFAULT 0, time_spent INTEGER DEFAULT 0,
      answers_json TEXT DEFAULT '[]', created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (level_id) REFERENCES ai_levels(id)
    );
    CREATE TABLE IF NOT EXISTS ai_rankings (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL,
      category TEXT DEFAULT 'overall', score INTEGER DEFAULT 0,
      rank_position INTEGER DEFAULT 0, period TEXT DEFAULT 'all_time',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, category, period),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // 仅首次创建时插入默认管理员账号
  if (isNew) {
    const adminExists = db.prepare('SELECT id FROM admins WHERE username = ?').get('admin');
    if (!adminExists) {
      const hashedPassword = bcrypt.hashSync('admin123456', 10);
      db.prepare('INSERT INTO admins (username, password, real_name, role, permissions, status) VALUES (?, ?, ?, ?, ?, ?)')
        .run('admin', hashedPassword, '超级管理员', 'super_admin', '["all"]', 1);
      console.log('  ✅ 默认管理员账号已创建: admin / admin123456');
    }
  }

  console.log('✅ 数据库检查完成！');
}

module.exports = { getDB };
