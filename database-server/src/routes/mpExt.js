/**
 * 小程序端 API 路由 - 扩展模块
 * 电子书阅读、行动日志、性格色彩话术
 */
const express = require('express');
const router = express.Router();
const { getDB } = require('../utils/db');
const { success, error } = require('../utils/response');
const path = require('path');
const fs = require('fs');
const {
  generatePersonalityScript,
  generatePersonalityInsight,
} = require('../services/deepseekService');

// 确保user_read_progress表存在
try {
  const db = getDB();
  await db.exec(`
    CREATE TABLE IF NOT EXISTS user_read_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      book_id INTEGER NOT NULL,
      progress INTEGER DEFAULT 0,
      read_position INTEGER DEFAULT 0,
      last_read_time TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      UNIQUE(user_id, book_id)
    );
  `);

  // 电子书分类管理表
  await db.exec(`
    CREATE TABLE IF NOT EXISTS ebook_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      status INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );
  `);

  // 初始化默认分类
  const catCount = await db.prepare('SELECT COUNT(*) as c FROM ebook_categories').get().c;
  if (catCount === 0) {
    const defaultCats = [
      ['代理商培训', '🎓', 1],
      ['产品教程', '📦', 2],
      ['护肤知识', '🧴', 3],
      ['销售技巧', '💡', 4],
      ['团队管理', '👥', 5],
      ['品牌文化', '🏆', 6],
    ];
    await db.prepare('INSERT INTO ebook_categories (name, icon, sort_order) VALUES (?, ?, ?)').run(
      ...defaultCats.reduce((acc, c) => acc.concat(c), [])
    );
  }

  // 用户收藏电子书表
  await db.exec(`
    CREATE TABLE IF NOT EXISTS user_book_favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      book_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      UNIQUE(user_id, book_id)
    );
  `);

  // 给learning_books添加权限和置顶字段（如果不存在）
  try {
    await db.exec('ALTER TABLE learning_books ADD COLUMN access_level TEXT DEFAULT "all"');
  } catch(e) {}
  try {
    await db.exec('ALTER TABLE learning_books ADD COLUMN is_top INTEGER DEFAULT 0');
  } catch(e) {}
} catch(e) {}

// JWT验证辅助
function verifyUser(req, res, callback) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return error(res, '未登录', 401);
  const jwt = require('jsonwebtoken');
  const { JWT_SECRET } = require('../middleware/auth');
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  let decoded;
  try { decoded = jwt.verify(token, JWT_SECRET); } catch { return error(res, '登录已过期', 401); }
  return callback(decoded);
}

// ==================== 电子书阅读 ====================

/**
 * GET /api/mp/books
 * 小程序端电子书列表（支持分类Tab、搜索、权限过滤）
 */
router.get('/books', async (req, res) => {
  verifyUser(req, res, (decoded) => {
    const db = getDB();
    const { page = 1, pageSize = 10, keyword, category, tab = 'all' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const userLevel = decoded.agent_level || decoded.agentLevel || 1;

    let where = ["(lb.status = '1' OR lb.status = 'active' OR lb.status = 'available' OR lb.status = 'recommended' OR lb.status IS NULL)"];
    let params = [];

    // 关键词搜索
    if (keyword) { where.push('(lb.title LIKE ? OR lb.author LIKE ? OR lb.description LIKE ?)'); params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`); }

    // 分类过滤（使用ebook_categories的name匹配）
    if (category) { where.push('lb.category = ?'); params.push(category); }

    // 权限过滤：access_level为all或用户等级>=access_level的数值
    where.push("(lb.access_level = 'all' OR lb.access_level IS NULL OR CAST(lb.access_level AS INTEGER) <= ?)");
    params.push(userLevel);

    const whereClause = 'WHERE ' + where.join(' AND ');

    // 统计总数
    const total = await db.prepare(`SELECT COUNT(*) as cnt FROM learning_books lb ${whereClause}`).get(...params).cnt;

    // 查询书籍列表
    const books = db.prepare(`
      SELECT lb.id, lb.title, lb.author, lb.category, lb.file_format, lb.cover_url, lb.description,
             lb.views, lb.downloads, lb.created_at, lb.access_level, lb.is_top,
             COALESCE(lb.file_url, '') as file_url,
             EXISTS(SELECT 1 FROM user_book_favorites WHERE user_id = ? AND book_id = lb.id) as is_favorited
      FROM learning_books lb
      ${whereClause}
      ORDER BY lb.is_top DESC, lb.created_at DESC
      LIMIT ? OFFSET ?
    `).all(decoded.id, ...params, parseInt(pageSize), offset);

    // 如果是"收藏"tab，改为查询收藏列表
    if (tab === 'favorites') {
      const favTotal = await db.prepare(`SELECT COUNT(*) as cnt FROM user_book_favorites WHERE user_id = ?`).get(decoded.id).cnt;
      const favBooks = db.prepare(`
        SELECT lb.id, lb.title, lb.author, lb.category, lb.file_format, lb.cover_url, lb.description,
               lb.views, lb.downloads, lb.created_at, lb.access_level, lb.is_top,
               COALESCE(lb.file_url, '') as file_url,
               1 as is_favorited
        FROM user_book_favorites f
        JOIN learning_books lb ON f.book_id = lb.id
        WHERE f.user_id = ?
          AND (lb.status IN ('1','active','available','recommended') OR lb.status IS NULL)
        ORDER BY f.created_at DESC
        LIMIT ? OFFSET ?
      `).all(decoded.id, parseInt(pageSize), offset);
      return success(res, { list: favBooks, total: favTotal, page: parseInt(page), pageSize: parseInt(pageSize) });
    }

    return success(res, { list: books, total, page: parseInt(page), pageSize: parseInt(pageSize) });
  });
});

/**
 * GET /api/mp/books/:id/read
 * 电子书在线阅读
 */
router.get('/books/:id/read', async (req, res) => {
  verifyUser(req, res, (decoded) => {
    const db = getDB();
    const book = await db.prepare("SELECT * FROM learning_books WHERE id = ? AND (status = '1' OR status = 'active' OR status = 'available' OR status = 'recommended' OR status IS NULL)").get(req.params.id);
    if (!book) return error(res, '电子书不存在', 404);

    // 更新阅读量
    await db.prepare('UPDATE learning_books SET views = COALESCE(views, 0) + 1 WHERE id = ?').run(req.params.id);

    // 记录阅读进度（如果用户有阅读记录就返回）
    const readRecord = db.prepare('SELECT * FROM user_read_progress WHERE user_id = ? AND book_id = ?')
      .get(decoded.id, req.params.id);

    const ext = (book.file_format || '').toLowerCase();
    if (!book.file_url) return error(res, '该电子书暂无文件', 404);

    // 文件实际存放路径: database-server/data/uploads/
    const filePath = path.join(__dirname, '../../data', book.file_url);
    if (!fs.existsSync(filePath)) return error(res, '文件已被删除', 404);

    if (ext === 'txt') {
      const content = fs.readFileSync(filePath, 'utf-8');
      return success(res, {
        type: 'text',
        content,
        format: 'txt',
        title: book.title,
        author: book.author,
        readProgress: readRecord ? readRecord.progress : 0,
        readPosition: readRecord ? readRecord.read_position : 0,
        bookId: book.id
      });
    }

    // PDF/其他格式返回文件URL
    const fileUrl = book.file_url.startsWith('/') ? book.file_url : '/' + book.file_url;
    return success(res, {
      type: 'file',
      url: fileUrl,
      format: ext,
      title: book.title,
      author: book.author,
      readProgress: readRecord ? readRecord.progress : 0,
      bookId: book.id
    });
  });
});

/**
 * POST /api/mp/books/:id/progress
 * 保存电子书阅读进度
 */
router.post('/books/:id/progress', async (req, res) => {
  verifyUser(req, res, (decoded) => {
    const db = getDB();
    const bookId = req.params.id;
    const { progress, read_position } = req.body;

    db.prepare(`
      INSERT INTO user_read_progress (user_id, book_id, progress, read_position, last_read_time)
      VALUES (?, ?, ?, ?, datetime('now','localtime'))
      ON CONFLICT(user_id, book_id) DO UPDATE SET
        progress = MAX(progress, excluded.progress),
        read_position = excluded.read_position,
        last_read_time = datetime('now','localtime')
    `).run(decoded.id, bookId, progress || 0, read_position || 0);

    return success(res, null, '阅读进度已保存');
  });
});

/**
 * GET /api/mp/books/my-progress
 * 我的电子书阅读列表（含进度）
 */
router.get('/books/my-progress', async (req, res) => {
  verifyUser(req, res, (decoded) => {
    const db = getDB();
    const records = db.prepare(`
      SELECT rp.progress, rp.read_position, rp.last_read_time,
             b.id, b.title, b.author, b.file_format, b.cover_url, b.category
      FROM user_read_progress rp
      JOIN learning_books b ON rp.book_id = b.id
      WHERE rp.user_id = ?
      ORDER BY rp.last_read_time DESC
    `).all(decoded.id);
    return success(res, records);
  });
});

// ==================== 电子书收藏 ====================

/**
 * POST /api/mp/books/:id/favorite
 * 收藏/取消收藏电子书
 */
router.post('/books/:id/favorite', async (req, res) => {
  verifyUser(req, res, (decoded) => {
    const db = getDB();
    const bookId = req.params.id;
    const existing = db.prepare('SELECT id FROM user_book_favorites WHERE user_id = ? AND book_id = ?')
      .get(decoded.id, bookId);
    if (existing) {
      await db.prepare('DELETE FROM user_book_favorites WHERE id = ?').run(existing.id);
      return success(res, { favorited: false }, '已取消收藏');
    } else {
      await db.prepare('INSERT INTO user_book_favorites (user_id, book_id) VALUES (?, ?)').run(decoded.id, bookId);
      return success(res, { favorited: true }, '收藏成功');
    }
  });
});

/**
 * GET /api/mp/books/categories
 * 获取电子书分类列表
 */
router.get('/books/categories', async (req, res) => {
  const db = getDB();
  const categories = await db.prepare('SELECT * FROM ebook_categories WHERE status = 1 ORDER BY sort_order ASC').all();
  // 统计每个分类下的书籍数量
  const catsWithCount = categories.map(cat => {
    const count = await db.prepare("SELECT COUNT(*) as c FROM learning_books WHERE category = ? AND status IN ('1','active','available','recommended')").get(cat.name);
    return { ...cat, book_count: count ? count.c : 0 };
  });
  return success(res, catsWithCount);
});

/**
 * GET /api/mp/books/stats
 * 获取电子书阅读统计（总阅读数、总阅读人数、我的进度概览）
 */
router.get('/books/stats', async (req, res) => {
  verifyUser(req, res, (decoded) => {
    const db = getDB();
    // 总阅读次数
    const totalReads = await db.prepare("SELECT COALESCE(SUM(views), 0) as v FROM learning_books").get().v;
    // 阅读人数（有阅读记录的用户数）
    const readerCount = await db.prepare('SELECT COUNT(DISTINCT user_id) as c FROM user_read_progress WHERE progress > 0').get().c;
    // 我的统计
    const myStats = db.prepare(`
      SELECT
        COUNT(*) as total_read,
        SUM(CASE WHEN progress >= 100 THEN 1 ELSE 0 END) as completed,
        AVG(progress) as avg_progress
      FROM user_read_progress WHERE user_id = ?
    `).get(decoded.id);
    // 我的收藏数
    const favCount = await db.prepare('SELECT COUNT(*) as c FROM user_book_favorites WHERE user_id = ?').get(decoded.id).c;

    return success(res, {
      totalReads,
      readerCount,
      myStats: {
        totalRead: myStats.total_read || 0,
        completed: myStats.completed || 0,
        avgProgress: Math.round(myStats.avg_progress || 0),
        favoriteCount: favCount || 0
      }
    });
  });
});

// ==================== 行动日志 ====================

/**
 * 确保行动日志相关表存在
 */
function ensureActionLogTables() {
  const db = getDB();
  await db.exec(`
    -- 年度/月度目标（统一表，goal_type区分）
    CREATE TABLE IF NOT EXISTS action_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      goal_type TEXT NOT NULL DEFAULT 'annual',
      category TEXT NOT NULL DEFAULT '',
      title TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      priority TEXT DEFAULT '',
      status INTEGER DEFAULT 0,
      progress INTEGER DEFAULT 0,
      start_date TEXT,
      end_date TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );

    -- 周目标
    CREATE TABLE IF NOT EXISTS action_weekly_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      week_start TEXT NOT NULL,
      week_end TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'A1',
      title TEXT NOT NULL DEFAULT '',
      deadline TEXT DEFAULT '',
      is_completed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );

    -- 周总结
    CREATE TABLE IF NOT EXISTS action_weekly_summary (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      week_start TEXT NOT NULL,
      week_end TEXT NOT NULL,
      completion TEXT DEFAULT '',
      uncompleted_reason TEXT DEFAULT '',
      improvement TEXT DEFAULT '',
      harvest TEXT DEFAULT '',
      next_plan TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime')),
      UNIQUE(user_id, week_start)
    );

    -- 日目标（升级版：ABC分类+心态管理）
    CREATE TABLE IF NOT EXISTS action_daily_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      log_date TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      score INTEGER DEFAULT 0,
      mood TEXT DEFAULT '',
      remark TEXT DEFAULT '',
      study_content TEXT DEFAULT '',
      improvement TEXT DEFAULT '',
      mindset_serious INTEGER DEFAULT 0,
      mindset_optimistic INTEGER DEFAULT 0,
      mindset_confident INTEGER DEFAULT 0,
      mindset_commitment INTEGER DEFAULT 0,
      mindset_love INTEGER DEFAULT 0,
      mindset_no_excuse INTEGER DEFAULT 0,
      mindset_total INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );

    -- 日目标事项（ABC分类）
    CREATE TABLE IF NOT EXISTS action_daily_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      log_date TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'A1',
      time_range TEXT DEFAULT '',
      task TEXT NOT NULL DEFAULT '',
      is_completed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    -- 月度达成追踪
    CREATE TABLE IF NOT EXISTS action_monthly_tracking (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      month TEXT NOT NULL,
      goal_title TEXT NOT NULL DEFAULT '',
      target_value TEXT DEFAULT '',
      actual_value TEXT DEFAULT '',
      gap TEXT DEFAULT '',
      completion_rate REAL DEFAULT 0,
      reflection TEXT DEFAULT '',
      note TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );

    -- 承诺书
    CREATE TABLE IF NOT EXISTS action_commitments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      supervisor TEXT DEFAULT '',
      pk_person TEXT DEFAULT '',
      duration INTEGER DEFAULT 30,
      start_date TEXT,
      end_date TEXT,
      status INTEGER DEFAULT 0,
      checkin_count INTEGER DEFAULT 0,
      total_days INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );

    -- 承诺书每日打卡记录
    CREATE TABLE IF NOT EXISTS action_commitments_checkins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      commitment_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      checkin_date TEXT NOT NULL,
      daily_completed INTEGER DEFAULT 0,
      a_class_done INTEGER DEFAULT 0,
      mindset_score INTEGER DEFAULT 0,
      remark TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      UNIQUE(commitment_id, checkin_date)
    );
  `);
}

/**
 * GET /api/mp/action-log/annual-goals
 * 获取我的年度目标
 */
router.get('/action-log/annual-goals', async (req, res) => {
  verifyUser(req, res, (decoded) => {
    ensureActionLogTables();
    const db = getDB();
    const goals = db.prepare(`
      SELECT * FROM action_goals WHERE user_id = ? AND goal_type = 'annual'
      ORDER BY category, created_at
    `).all(decoded.id);
    return success(res, goals);
  });
});

/**
 * POST /api/mp/action-log/annual-goals
 * 创建/更新年度目标
 */
router.post('/action-log/annual-goals', async (req, res) => {
  verifyUser(req, res, (decoded) => {
    ensureActionLogTables();
    const db = getDB();
    const { category, title, content, start_date, end_date } = req.body;
    if (!category || !title) return error(res, '目标和类别不能为空');

    try {
      db.prepare(`
        INSERT INTO action_goals (user_id, goal_type, category, title, content, start_date, end_date, status)
        VALUES (?, 'annual', ?, ?, ?, ?, ?, 0)
        ON CONFLICT(user_id, goal_type, category, title) DO UPDATE SET
          content = excluded.content,
          start_date = excluded.start_date,
          end_date = excluded.end_date,
          updated_at = datetime('now','localtime')
      `).run(decoded.id, category, title, content, start_date, end_date);
      return success(res, null, '目标已保存');
    } catch (err) {
      return error(res, '保存失败: ' + err.message);
    }
  });
});

/**
 * PUT /api/mp/action-log/goals/:id
 * 更新目标进度和状态
 */
router.put('/action-log/goals/:id', async (req, res) => {
  verifyUser(req, res, (decoded) => {
    ensureActionLogTables();
    const db = getDB();
    const { progress, status } = req.body;

    const goal = db.prepare('SELECT * FROM action_goals WHERE id = ? AND user_id = ?')
      .get(req.params.id, decoded.id);
    if (!goal) return error(res, '目标不存在');

    db.prepare(`
      UPDATE action_goals SET
        progress = COALESCE(?, progress),
        status = COALESCE(?, status),
        updated_at = datetime('now','localtime')
      WHERE id = ?
    `).run(progress, status, req.params.id);

    return success(res, null, '目标已更新');
  });
});

/**
 * DELETE /api/mp/action-log/goals/:id
 * 删除目标
 */
router.delete('/action-log/goals/:id', async (req, res) => {
  verifyUser(req, res, (decoded) => {
    ensureActionLogTables();
    const db = getDB();
    await db.prepare('DELETE FROM action_goals WHERE id = ? AND user_id = ?').run(req.params.id, decoded.id);
    return success(res, null, '目标已删除');
  });
});

/**
 * POST /api/mp/action-log/daily
 * 创建/更新每日日志
 */
router.post('/action-log/daily', async (req, res) => {
  verifyUser(req, res, (decoded) => {
    ensureActionLogTables();
    const db = getDB();
    const { log_date, content, score, mood, remark } = req.body;
    const date = log_date || new Date().toISOString().split('T')[0];

    try {
      db.prepare(`
        INSERT INTO action_daily_logs (user_id, log_date, goal_type, content, score, mood, remark)
        VALUES (?, ?, 'daily', ?, ?, ?, ?)
        ON CONFLICT(user_id, log_date, goal_type) DO UPDATE SET
          content = excluded.content,
          score = excluded.score,
          mood = excluded.mood,
          remark = excluded.remark
      `).run(decoded.id, date, content || '', score || 0, mood || '', remark || '');
      return success(res, null, '日志已保存');
    } catch (err) {
      return error(res, '保存失败: ' + err.message);
    }
  });
});

/**
 * GET /api/mp/action-log/daily
 * 获取每日日志
 */
router.get('/action-log/daily', async (req, res) => {
  verifyUser(req, res, (decoded) => {
    ensureActionLogTables();
    const db = getDB();
    const { month, limit = 30 } = req.query;

    let where = ['user_id = ?', "goal_type = 'daily'"];
    let params = [decoded.id];

    if (month) {
      where.push("log_date LIKE ?");
      params.push(month + '%');
    }

    const records = db.prepare(`
      SELECT * FROM action_daily_logs WHERE ${where.join(' AND ')}
      ORDER BY log_date DESC LIMIT ?
    `).all(...params, parseInt(limit));

    return success(res, records);
  });
});

/**
 * GET /api/mp/action-log/daily/today
 * 获取今日日志
 */
router.get('/action-log/daily/today', async (req, res) => {
  verifyUser(req, res, (decoded) => {
    ensureActionLogTables();
    const db = getDB();
    const today = new Date().toISOString().split('T')[0];
    const record = db.prepare(`
      SELECT * FROM action_daily_logs WHERE user_id = ? AND log_date = ? AND goal_type = 'daily'
    `).get(decoded.id, today);
    return success(res, record || null);
  });
});

/**
 * POST /api/mp/action-log/commitments
 * 创建承诺书
 */
router.post('/action-log/commitments', async (req, res) => {
  verifyUser(req, res, (decoded) => {
    ensureActionLogTables();
    const db = getDB();
    const { title, content, duration } = req.body;
    if (!title) return error(res, '请填写承诺标题');

    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() + (duration || 30) * 86400000).toISOString().split('T')[0];

    db.prepare(`
      INSERT INTO action_commitments (user_id, title, content, duration, start_date, end_date, total_days)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(decoded.id, title, content || '', duration || 30, startDate, endDate, duration || 30);

    return success(res, null, '承诺书已创建', 201);
  });
});

/**
 * POST /api/mp/action-log/commitments/:id/checkin
 * 承诺书打卡
 */
router.post('/action-log/commitments/:id/checkin', async (req, res) => {
  verifyUser(req, res, (decoded) => {
    ensureActionLogTables();
    const db = getDB();
    const { remark } = req.body;

    const commitment = db.prepare('SELECT * FROM action_commitments WHERE id = ? AND user_id = ?')
      .get(req.params.id, decoded.id);
    if (!commitment) return error(res, '承诺书不存在');

    db.prepare(`
      UPDATE action_commitments SET
        checkin_count = checkin_count + 1,
        status = CASE WHEN checkin_count + 1 >= total_days THEN 1 ELSE 0 END,
        updated_at = datetime('now','localtime')
      WHERE id = ?
    `).run(req.params.id);

    return success(res, null, '打卡成功');
  });
});

/**
 * GET /api/mp/action-log/commitments
 * 我的承诺书列表
 */
router.get('/action-log/commitments', async (req, res) => {
  verifyUser(req, res, (decoded) => {
    ensureActionLogTables();
    const db = getDB();
    const commitments = db.prepare(`
      SELECT * FROM action_commitments WHERE user_id = ? ORDER BY created_at DESC
    `).all(decoded.id);
    return success(res, commitments);
  });
});

/**
 * GET /api/mp/action-log/monthly-tracking
 * 月度追踪数据
 */
router.get('/action-log/monthly-tracking', async (req, res) => {
  verifyUser(req, res, (decoded) => {
    ensureActionLogTables();
    const db = getDB();
    const { month } = req.query;
    const targetMonth = month || new Date().toISOString().slice(0, 7);

    const tracking = db.prepare(`
      SELECT * FROM action_monthly_tracking WHERE user_id = ? AND month = ?
      ORDER BY created_at ASC
    `).all(decoded.id, targetMonth);

    const dailyLogs = db.prepare(`
      SELECT log_date, score, mood, mindset_total
      FROM action_daily_logs WHERE user_id = ? AND log_date LIKE ?
      ORDER BY log_date ASC
    `).all(decoded.id, targetMonth + '%');

    const dailyStats = {
      total_days: dailyLogs.length,
      avg_score: dailyLogs.length ? Math.round(dailyLogs.reduce((s, l) => s + (l.score || 0), 0) / dailyLogs.length * 10) / 10 : 0,
      avg_mindset: dailyLogs.length ? Math.round(dailyLogs.reduce((s, l) => s + (l.mindset_total || 0), 0) / dailyLogs.length * 10) / 10 : 0
    };

    return success(res, { tracking, dailyLogs, dailyStats });
  });
});

/**
 * POST /api/mp/action-log/monthly-tracking
 * 保存月度追踪数据（批量）
 */
router.post('/action-log/monthly-tracking', async (req, res) => {
  verifyUser(req, res, (decoded) => {
    ensureActionLogTables();
    const db = getDB();
    const { month, items } = req.body;
    if (!month || !items || !Array.isArray(items)) return error(res, '参数错误');

    const upsert = db.prepare(`
      INSERT INTO action_monthly_tracking (user_id, month, goal_title, target_value, actual_value, gap, completion_rate, reflection, note)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        goal_title = excluded.goal_title, target_value = excluded.target_value,
        actual_value = excluded.actual_value, gap = excluded.gap,
        completion_rate = excluded.completion_rate, reflection = excluded.reflection,
        note = excluded.note, updated_at = datetime('now','localtime')
    `);

    const update = db.prepare(`
      UPDATE action_monthly_tracking SET
        target_value = ?, actual_value = ?, gap = ?,
        completion_rate = ?, reflection = ?, note = ?,
        updated_at = datetime('now','localtime')
      WHERE id = ? AND user_id = ?
    `);

    const transaction = db.transaction(() => {
      items.forEach(item => {
        if (item.id) {
          update.run(item.target_value || '', item.actual_value || '', item.gap || '',
            item.completion_rate || 0, item.reflection || '', item.note || '',
            item.id, decoded.id);
        } else {
          upsert.run(decoded.id, month, item.goal_title || '', item.target_value || '',
            item.actual_value || '', item.gap || '', item.completion_rate || 0,
            item.reflection || '', item.note || '');
        }
      });
    });

    try {
      transaction();
      return success(res, null, '月度追踪已保存');
    } catch (err) {
      return error(res, '保存失败: ' + err.message);
    }
  });
});

// ==================== 月度目标 ====================

/**
 * GET /api/mp/action-log/monthly-goals
 * 获取月度目标（按月筛选）
 */
router.get('/action-log/monthly-goals', async (req, res) => {
  verifyUser(req, res, (decoded) => {
    ensureActionLogTables();
    const db = getDB();
    const { month } = req.query;
    const targetMonth = month || new Date().toISOString().slice(0, 7);

    const goals = db.prepare(`
      SELECT * FROM action_goals WHERE user_id = ? AND goal_type = 'monthly'
        AND (category = ? OR content LIKE ? OR start_date LIKE ?)
      ORDER BY priority ASC, created_at ASC
    `).all(decoded.id, targetMonth, '%' + targetMonth + '%', targetMonth + '%');

    // 如果没有精确匹配到月，返回所有月度目标
    const allMonthly = goals.length > 0 ? goals : db.prepare(`
      SELECT * FROM action_goals WHERE user_id = ? AND goal_type = 'monthly'
      ORDER BY priority ASC, created_at DESC
    `).all(decoded.id);

    return success(res, allMonthly);
  });
});

/**
 * POST /api/mp/action-log/monthly-goals
 * 创建/更新月度目标
 */
router.post('/action-log/monthly-goals', async (req, res) => {
  verifyUser(req, res, (decoded) => {
    ensureActionLogTables();
    const db = getDB();
    const { id, category, title, content, priority, start_date, end_date } = req.body;
    if (!title) return error(res, '请输入目标内容');

    if (id) {
      db.prepare(`
        UPDATE action_goals SET category = ?, title = ?, content = ?, priority = ?,
          start_date = ?, end_date = ?, updated_at = datetime('now','localtime')
        WHERE id = ? AND user_id = ?
      `).run(category || '', title, content || '', priority || 'A1',
        start_date || '', end_date || '', id, decoded.id);
      return success(res, null, '月度目标已更新');
    } else {
      const result = db.prepare(`
        INSERT INTO action_goals (user_id, goal_type, category, title, content, priority, start_date, end_date)
        VALUES (?, 'monthly', ?, ?, ?, ?, ?, ?)
      `).run(decoded.id, category || '', title, content || '', priority || 'A1',
        start_date || '', end_date || '');
      return success(res, { id: result.lastInsertRowid }, '月度目标已创建', 201);
    }
  });
});

// ==================== 周目标 ====================

/**
 * GET /api/mp/action-log/weekly-goals
 * 获取周目标
 */
router.get('/action-log/weekly-goals', async (req, res) => {
  verifyUser(req, res, (decoded) => {
    ensureActionLogTables();
    const db = getDB();
    const { week_start } = req.query;
    const now = new Date();
    const dayOfWeek = now.getDay() || 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayOfWeek + 1);
    const mondayStr = monday.toISOString().split('T')[0];
    const targetWeek = week_start || mondayStr;

    const goals = db.prepare(`
      SELECT * FROM action_weekly_goals WHERE user_id = ? AND week_start = ?
      ORDER BY priority ASC
    `).all(decoded.id, targetWeek);

    const summary = db.prepare(`
      SELECT * FROM action_weekly_summary WHERE user_id = ? AND week_start = ?
    `).get(decoded.id, targetWeek);

    return success(res, { goals, summary, week_start: targetWeek });
  });
});

/**
 * POST /api/mp/action-log/weekly-goals
 * 保存周目标（批量）
 */
router.post('/action-log/weekly-goals', async (req, res) => {
  verifyUser(req, res, (decoded) => {
    ensureActionLogTables();
    const db = getDB();
    const { week_start, week_end, goals } = req.body;
    if (!week_start) return error(res, '请选择周次');

    const insert = db.prepare(`
      INSERT INTO action_weekly_goals (user_id, week_start, week_end, priority, title, deadline, is_completed)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `);

    const dbWeekEnd = week_end || (() => {
      const d = new Date(week_start);
      d.setDate(d.getDate() + 6);
      return d.toISOString().split('T')[0];
    })();

    const transaction = db.transaction(() => {
      // 删除旧数据
      db.prepare('DELETE FROM action_weekly_goals WHERE user_id = ? AND week_start = ?')
        .run(decoded.id, week_start);
      // 插入新数据
      (goals || []).forEach(g => {
        if (g.title && g.title.trim()) {
          insert.run(decoded.id, week_start, dbWeekEnd, g.priority || 'A1', g.title.trim(), g.deadline || '');
        }
      });
    });

    try {
      transaction();
      return success(res, null, '周目标已保存');
    } catch (err) {
      return error(res, '保存失败: ' + err.message);
    }
  });
});

/**
 * PUT /api/mp/action-log/weekly-goals/:id/complete
 * 切换周目标完成状态
 */
router.put('/action-log/weekly-goals/:id/complete', async (req, res) => {
  verifyUser(req, res, (decoded) => {
    ensureActionLogTables();
    const db = getDB();
    const goal = db.prepare('SELECT * FROM action_weekly_goals WHERE id = ? AND user_id = ?')
      .get(req.params.id, decoded.id);
    if (!goal) return error(res, '目标不存在');

    db.prepare('UPDATE action_weekly_goals SET is_completed = ?, updated_at = datetime(\'now\',\'localtime\') WHERE id = ?')
      .run(goal.is_completed ? 0 : 1, req.params.id);
    return success(res, { is_completed: !goal.is_completed });
  });
});

/**
 * POST /api/mp/action-log/weekly-summary
 * 保存周总结
 */
router.post('/action-log/weekly-summary', async (req, res) => {
  verifyUser(req, res, (decoded) => {
    ensureActionLogTables();
    const db = getDB();
    const { week_start, week_end, completion, uncompleted_reason, improvement, harvest, next_plan } = req.body;
    if (!week_start) return error(res, '请选择周次');

    db.prepare(`
      INSERT INTO action_weekly_summary (user_id, week_start, week_end, completion, uncompleted_reason, improvement, harvest, next_plan)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, week_start) DO UPDATE SET
        week_end = excluded.week_end,
        completion = excluded.completion,
        uncompleted_reason = excluded.uncompleted_reason,
        improvement = excluded.improvement,
        harvest = excluded.harvest,
        next_plan = excluded.next_plan,
        updated_at = datetime('now','localtime')
    `).run(decoded.id, week_start, week_end || '', completion || '',
      uncompleted_reason || '', improvement || '', harvest || '', next_plan || '');

    return success(res, null, '周总结已保存');
  });
});

// ==================== 日目标（升级版） ====================

/**
 * POST /api/mp/action-log/daily
 * 创建/更新每日日志（升级版：含ABC事项+心态管理）
 */
router.post('/action-log/daily', async (req, res) => {
  verifyUser(req, res, (decoded) => {
    ensureActionLogTables();
    const db = getDB();
    const {
      log_date, study_content, improvement, gratitude_content,
      mindset_serious, mindset_optimistic, mindset_confident,
      mindset_commitment, mindset_love, mindset_no_excuse,
      energy_morning, energy_afternoon, energy_evening,
      items, top_three
    } = req.body;
    const date = log_date || new Date().toISOString().split('T')[0];

    const mindsetTotal = (mindset_serious || 0) + (mindset_optimistic || 0)
      + (mindset_confident || 0) + (mindset_commitment || 0)
      + (mindset_love || 0) + (mindset_no_excuse || 0);
    const energyTotal = (energy_morning || 5) + (energy_afternoon || 5) + (energy_evening || 5);
    const topThreeJSON = (top_three && top_three.length > 0) ? JSON.stringify(top_three) : null;

    // 计算完成率
    const completedCount = (items || []).filter(i => i.is_completed).length;
    const totalCount = (items || []).filter(i => i.task && i.task.trim()).length;
    const completionRate = totalCount > 0 ? completedCount / totalCount : 0;

    // 确保新字段存在（兼容旧表）
    try {
      await db.prepare('ALTER TABLE action_daily_logs ADD COLUMN gratitude_text TEXT DEFAULT \'\'').run();
    } catch(e) {}
    try { await db.prepare('ALTER TABLE action_daily_logs ADD COLUMN energy_morning INTEGER DEFAULT 5').run(); } catch(e) {}
    try { await db.prepare('ALTER TABLE action_daily_logs ADD COLUMN energy_afternoon INTEGER DEFAULT 5').run(); } catch(e) {}
    try { await db.prepare('ALTER TABLE action_daily_logs ADD COLUMN energy_evening INTEGER DEFAULT 5').run(); } catch(e) {}
    try { await db.prepare('ALTER TABLE action_daily_logs ADD COLUMN energy_total INTEGER DEFAULT 15').run(); } catch(e) {}
    try { await db.prepare('ALTER TABLE action_daily_logs ADD COLUMN top_three TEXT').run(); } catch(e) {}

    const upsertLogByDate = db.prepare(`
      INSERT INTO action_daily_logs (user_id, log_date, score, mindset_serious, mindset_optimistic, mindset_confident,
        mindset_commitment, mindset_love, mindset_no_excuse, mindset_total, study_content, improvement,
        gratitude_text, energy_morning, energy_afternoon, energy_evening, energy_total, top_three)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, log_date) DO UPDATE SET
        score = excluded.score,
        mindset_serious = excluded.mindset_serious,
        mindset_optimistic = excluded.mindset_optimistic,
        mindset_confident = excluded.mindset_confident,
        mindset_commitment = excluded.mindset_commitment,
        mindset_love = excluded.mindset_love,
        mindset_no_excuse = excluded.mindset_no_excuse,
        mindset_total = excluded.mindset_total,
        study_content = excluded.study_content,
        improvement = excluded.improvement,
        gratitude_text = excluded.gratitude_text,
        energy_morning = excluded.energy_morning,
        energy_afternoon = excluded.energy_afternoon,
        energy_evening = excluded.energy_evening,
        energy_total = excluded.energy_total,
        top_three = excluded.top_three,
        updated_at = datetime('now','localtime')
    `);

    const deleteOldItems = db.prepare('DELETE FROM action_daily_items WHERE user_id = ? AND log_date = ?');
    const insertItem = db.prepare(`
      INSERT INTO action_daily_items (user_id, log_date, priority, time_range, task, is_completed)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction(() => {
      upsertLogByDate.run(decoded.id, date, Math.round(completionRate * 100),
        mindset_serious || 0, mindset_optimistic || 0, mindset_confident || 0,
        mindset_commitment || 0, mindset_love || 0, mindset_no_excuse || 0,
        mindsetTotal, study_content || '', improvement || '',
        gratitude_content || '',
        energy_morning || 5, energy_afternoon || 5, energy_evening || 5,
        energyTotal, topThreeJSON);

      deleteOldItems.run(decoded.id, date);
      (items || []).forEach(item => {
        if (item.task && item.task.trim()) {
          insertItem.run(decoded.id, date, item.priority || 'A1', item.time_range || '',
            item.task.trim(), item.is_completed ? 1 : 0);
        }
      });
    });

    try {
      transaction();
      return success(res, null, '日目标已保存');
    } catch (err) {
      return error(res, '保存失败: ' + err.message);
    }
  });
});

/**
 * GET /api/mp/action-log/daily/detail
 * 获取某日日目标详情（含ABC事项+心态评分）
 */
router.get('/action-log/daily/detail', async (req, res) => {
  verifyUser(req, res, (decoded) => {
    ensureActionLogTables();
    const db = getDB();
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const log = db.prepare('SELECT * FROM action_daily_logs WHERE user_id = ? AND log_date = ?')
      .get(decoded.id, targetDate);

    const items = db.prepare(`
      SELECT * FROM action_daily_items WHERE user_id = ? AND log_date = ?
      ORDER BY priority ASC
    `).all(decoded.id, targetDate);

    return success(res, {
      log: log || null,
      items: items || [],
      completedCount: (items || []).filter(i => i.is_completed).length,
      totalCount: (items || []).filter(i => i.task && i.task.trim()).length
    });
  });
});

/**
 * PUT /api/mp/action-log/daily-items/:id/complete
 * 切换事项完成状态
 */
router.put('/action-log/daily-items/:id/complete', async (req, res) => {
  verifyUser(req, res, (decoded) => {
    ensureActionLogTables();
    const db = getDB();
    const item = db.prepare('SELECT * FROM action_daily_items WHERE id = ? AND user_id = ?')
      .get(req.params.id, decoded.id);
    if (!item) return error(res, '事项不存在');

    db.prepare('UPDATE action_daily_items SET is_completed = ? WHERE id = ?')
      .run(item.is_completed ? 0 : 1, req.params.id);

    return success(res, { is_completed: !item.is_completed });
  });
});

// ==================== 性格色彩话术 ====================

/**
 * GET /api/mp/personality/overview
 * 性格色彩概览（4种性格介绍 + AI深度解读）
 */
router.get('/personality/overview', async (req, res) => {
  const personalities = [
    {
      type: 'red',
      name: '红色性格',
      subtitle: '活泼型 · 社交导向',
      traits: ['热情开朗', '善于表达', '注重氛围', '喜欢被认可', '决策快速'],
      color: '#e94560',
      bgColor: '#fff5f7',
      icon: '🔥',
      description: '红色性格的人充满活力和热情，喜欢社交互动。他们在购买决策中更注重产品带来的快乐和社交认可。',
      buyingStyle: '冲动型消费，容易被情绪和故事打动'
    },
    {
      type: 'blue',
      name: '蓝色性格',
      subtitle: '完美型 · 品质导向',
      traits: ['注重细节', '追求品质', '理性分析', '需要数据', '信任专业'],
      color: '#1890ff',
      bgColor: '#f0f7ff',
      icon: '💎',
      description: '蓝色性格的人注重品质和细节，喜欢深入了解产品。他们需要充分的信息和数据支持才能做出购买决策。',
      buyingStyle: '理性消费，需要充分的信息和专业的建议'
    },
    {
      type: 'yellow',
      name: '黄色性格',
      subtitle: '力量型 · 结果导向',
      traits: ['目标明确', '效率优先', '看重结果', '果断决策', '重视价值'],
      color: '#faad14',
      bgColor: '#fffbe6',
      icon: '⚡',
      description: '黄色性格的人目标明确，注重效率和结果。他们看重产品的性价比和实际价值，决策果断。',
      buyingStyle: '目标导向，看重性价比和实际效果'
    },
    {
      type: 'green',
      name: '绿色性格',
      subtitle: '和平型 · 关系导向',
      traits: ['温和友善', '重视关系', '追求和谐', '决策缓慢', '需要陪伴'],
      color: '#52c41a',
      bgColor: '#f6ffed',
      icon: '🌿',
      description: '绿色性格的人温和友善，重视人际关系。他们需要被关心和陪伴，购买决策需要充分的时间考虑。',
      buyingStyle: '关系驱动，需要信任感和足够的考虑时间'
    }
  ];

  // 如果请求带 ai_insight=true，则额外返回AI深度分析
  if (req.query.ai_insight === 'true') {
    try {
      const insights = {};
      for (const p of personalities) {
        const insight = await generatePersonalityInsight(p.type, req.query.context || '');
        insights[p.type] = insight;
      }
      return success(res, { personalities, ai_insights: insights });
    } catch(e) {
      console.warn('性格AI解读失败，返回基础信息:', e.message);
    }
  }

  return success(res, personalities);
});

/**
 * 内置话术兜底数据（数据库无数据时使用）
 */
const BUILTIN_SCRIPTS = [
  { id: 1, type: 'red', scene: '破冰', title: '热情开场白', content: '哎呀亲爱的，你今天状态真好！我一看就知道你是个特别有品味的人，来来来，让我给你看个好东西，保证你一眼就喜欢！', tips: '用热情的语调和肢体语言配合，让客户感受到你的真诚和活力。', difficulty: 1 },
  { id: 2, type: 'red', scene: '产品推荐', title: '氛围感推荐', content: '你看这款产品，我们很多代理都在用，效果特别好！关键是特别显气质，用完之后整个人都不一样了，身边的朋友都追着问呢！', tips: '强调社交属性和他人认可，红色性格最在意别人怎么看。', difficulty: 1 },
  { id: 3, type: 'red', scene: '逼单', title: '情感促单法', content: '亲爱的，这个真的特别适合你！我第一个就想到你了，而且现在刚好有活动，错过了太可惜了，而且你也值得用最好的呀！', tips: '用"第一个想到你"创造专属感，强调机会难得。', difficulty: 2 },
  { id: 4, type: 'blue', scene: '破冰', title: '专业开场白', content: '您好，我注意到您对品质要求很高。我们这款产品经过了严格的质检认证，成分和生产工艺都非常讲究，我先给您详细介绍一下吧。', tips: '展现专业和严谨，用数据和事实说话，蓝色性格尊重专业。', difficulty: 2 },
  { id: 5, type: 'blue', scene: '产品推荐', title: '数据化推荐', content: '这款产品的有效成分浓度达到XX%，临床测试显示使用28天后有明显改善。您可以看一下这份检测报告和使用前后的对比数据。', tips: '提供具体数据和证明材料，蓝色需要逻辑支撑。', difficulty: 2 },
  { id: 6, type: 'blue', scene: '异议处理', title: '理性解答法', content: '我完全理解您的顾虑。关于这个问题，我给您看几个方面：第一，成分安全；第二，生产资质；第三，售后保障。您看还有什么想了解的吗？', tips: '逐条分析，不回避问题，蓝色客户尊重坦诚和专业。', difficulty: 3 },
  { id: 7, type: 'yellow', scene: '破冰', title: '高效开场白', content: '您好，我直接说重点——我们这款产品性价比很高，同品质市场价至少翻一倍。今天有特别优惠，我建议您先了解一下。', tips: '直接了当，突出核心价值，黄色性格不喜欢废话。', difficulty: 1 },
  { id: 8, type: 'yellow', scene: '产品推荐', title: 'ROI导向推荐', content: '这款产品一盒可以用XX天，平均每天才XX元，但效果特别明显。很多客户反馈说比之前用的贵的产品效果还好，所以其实是帮您省钱了。', tips: '算经济账，强调性价比和实际效果，黄色最吃这一套。', difficulty: 1 },
  { id: 9, type: 'yellow', scene: '逼单', title: '紧迫感促单', content: '说实话，这个价格今天才有。我知道您很忙，我长话短说——这个决定对您来说是稳赚不赔的，早用早受益。', tips: '创造紧迫感但不过度，尊重对方的时间。', difficulty: 2 },
  { id: 10, type: 'green', scene: '破冰', title: '温暖开场白', content: '你好呀~ 不着急，先坐下来聊聊天。最近怎么样？有什么我可以帮到你的吗？我们是朋友嘛，有什么问题随时说。', tips: '放慢节奏，建立信任关系，绿色性格需要安全感。', difficulty: 1 },
  { id: 11, type: 'green', scene: '产品推荐', title: '温和推荐法', content: '我觉得这款产品特别适合你的气质，温和不刺激。很多和我关系好的客户都在用，反馈都很好。你也可以先试试看，觉得好再继续用。', tips: '不给压力，强调温和安全，绿色性格害怕做错决定。', difficulty: 1 },
  { id: 12, type: 'green', scene: '逼单', title: '陪伴促单法', content: '没关系的，你不用着急决定。但是我觉得以你的情况，这款真的很合适。你回去想想，有什么问题随时微信我，我会一直在这里帮你的。', tips: '给足思考空间，承诺持续服务，绿色最怕被冷落。', difficulty: 2 },
];

/**
 * 将 ai_scripts 表字段映射为小程序前端期望的字段格式
 */
function mapDbScriptToFrontend(row) {
  return {
    id: row.id,
    type: row.personality_type || 'red',       // personality_type → type
    scene: row.scenario,                      // scenario → scene
    title: row.title || row.scenario + '话术',   // title 可能为空
    content: row.script_content,               // script_content → content
    tips: row.tips,                           // tips → tips
    difficulty: row.difficulty_level || 2,     // difficulty_level → difficulty
    is_ai_generated: row.is_ai_generated === 1 || row.category === 'personality_based' || (row.source || '').includes('ai'),
    is_optimized: row.is_optimized === 1,       // 是否经过AI二次优化
    source: row.source || 'admin',             // 数据来源
    createdAt: row.created_at,
  };
}

/**
 * GET /api/mp/personality/scripts
 * 性格色彩成交话术库（数据库优先 + 内置兜底 + AI生成）
 */
router.get('/personality/scripts', async (req, res) => {
  verifyUser(req, res, async (decoded) => {
    const db = getDB();
    const { type, scene } = req.query;

    // 获取用户收藏的话术
    const favorites = db.prepare('SELECT script_id FROM personality_favorites WHERE user_id = ?')
      .all(decoded.id).map(f => f.script_id);

    let scripts = [];

    try {
      // 优先从 ai_scripts 表读取（管理员投喂的话术）
      let sql = 'SELECT * FROM ai_scripts WHERE status = 1';
      const params = [];
      if (type) { sql += ' AND personality_type = ?'; params.push(type); }
      if (scene) { sql += ' AND scenario LIKE ?'; params.push('%' + scene + '%'); }
      sql += ' ORDER BY sort_order ASC, created_at DESC';

      const dbScripts = await db.prepare(sql).all(...params);

      if (dbScripts && dbScripts.length > 0) {
        // 有数据库数据，使用数据库话术
        scripts = dbScripts.map(mapDbScriptToFrontend);
      } else {
        // 无数据库数据时，使用内置话术兜底
        scripts = BUILTIN_SCRIPTS.filter(s => {
          if (type && s.type !== type) return false;
          if (scene && s.scene !== scene) return false;
          return true;
        });
      }
    } catch(e) {
      console.warn('[personality/scripts] 数据库查询失败，使用内置话术:', e.message);
      scripts = BUILTIN_SCRIPTS.filter(s => {
        if (type && s.type !== type) return false;
        if (scene && s.scene !== scene) return false;
        return true;
      });
    }

    // 如果请求AI生成额外话术（实时生成，不入库）
    if (req.query.ai_generate === 'true' && type && scene) {
      try {
        const aiScript = await generatePersonalityScript(type, scene, req.query.keyword);
        if (aiScript) {
          scripts.unshift({
            ...aiScript,
            id: Date.now(),
            type,
            scene,
            is_ai_generated: true,
          });
        }
      } catch(e) {
        console.warn('AI话术生成失败，仅返回已有话术:', e.message);
      }
    }

    // 标记收藏状态
    scripts = scripts.map(s => ({
      ...s,
      isFavorited: favorites.includes(s.id)
    }));

    return success(res, scripts);
  });
});

/**
 * POST /api/mp/personality/scripts/generate
 * AI生成个性化话术（按需调用）
 */
router.post('/personality/scripts/generate', async (req, res) => {
  verifyUser(req, res, async (decoded) => {
    const { personality_type, scene, keyword } = req.body;
    if (!personality_type || !scene) return error(res, '缺少必要参数：personality_type 和 scene');

    try {
      const result = await generatePersonalityScript(personality_type, scene, keyword);
      if (result) {
        return success(res, {
          ...result,
          type: personality_type,
          scene,
        }, 'AI话术生成成功');
      } else {
        return error(res, 'AI话术生成失败，请稍后重试', 500);
      }
    } catch(err) {
      error(res, 'AI话术生成出错: ' + err.message, 500);
    }
  });
});

/**
 * POST /api/mp/personality/scripts/:id/favorite
 * 收藏/取消收藏话术
 */
router.post('/personality/scripts/:id/favorite', async (req, res) => {
  verifyUser(req, res, (decoded) => {
    const db = getDB();
    const scriptId = parseInt(req.params.id);

    // 确保收藏表存在
    await db.exec(`CREATE TABLE IF NOT EXISTS personality_favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      script_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      UNIQUE(user_id, script_id)
    )`);

    const existing = db.prepare('SELECT id FROM personality_favorites WHERE user_id = ? AND script_id = ?')
      .get(decoded.id, scriptId);

    if (existing) {
      await db.prepare('DELETE FROM personality_favorites WHERE user_id = ? AND script_id = ?').run(decoded.id, scriptId);
      return success(res, { favorited: false }, '已取消收藏');
    } else {
      await db.prepare('INSERT INTO personality_favorites (user_id, script_id) VALUES (?, ?)').run(decoded.id, scriptId);
      return success(res, { favorited: true }, '已收藏', 201);
    }
  });
});

/**
 * GET /api/mp/personality/my-favorites
 * 我的收藏话术
 */
router.get('/personality/my-favorites', async (req, res) => {
  verifyUser(req, res, (decoded) => {
    const db = getDB();
    const favorites = db.prepare(`
      SELECT pf.script_id, pf.created_at as favorited_at
      FROM personality_favorites pf WHERE pf.user_id = ?
      ORDER BY pf.created_at DESC
    `).all(decoded.id);
    return success(res, favorites);
  });
});

// ==================== 学习积分系统 ====================

// ==================== 公告资讯（小程序端） ====================

// 确保公告表存在
getDB().exec(`
    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      summary TEXT DEFAULT '',
      category TEXT DEFAULT 'notice',
      cover_url TEXT DEFAULT '',
      author TEXT DEFAULT '管理员',
      is_top INTEGER DEFAULT 0,
      status INTEGER DEFAULT 1,
      view_count INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      published_at TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    ).catch(() => {});
  `)).catch(() => {})

/**
 * GET /api/mp/announcements
 * 小程序端公告列表（仅返回已发布的）
 */
router.get('/announcements', async (req, res) => {
  const db = getDB();
  const { page = 1, pageSize = 10, category } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(pageSize);

  let where = ["status = 1"];
  let params = [];
  if (category) { where.push('category = ?'); params.push(category); }

  const whereClause = 'WHERE ' + where.join(' AND ');
  const total = await db.prepare(`SELECT COUNT(*) as cnt FROM announcements ${whereClause}`).get(...params).cnt;
  const list = db.prepare(`
    SELECT id, title, summary, category, cover_url, author,
           view_count, published_at, created_at, is_top
    FROM announcements ${whereClause}
    ORDER BY is_top DESC, sort_order DESC, published_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(pageSize), offset);

  return success(res, { list, total, page: parseInt(page), pageSize: parseInt(pageSize) });
});

/**
 * GET /api/mp/announcements/:id
 * 小程序端公告详情
 */
router.get('/announcements/:id', async (req, res) => {
  const db = getDB();
  const item = await db.prepare('SELECT * FROM announcements WHERE id = ? AND status = 1').get(req.params.id);
  if (!item) return error(res, '公告不存在', 404);

  // 更新阅读量
  await db.prepare('UPDATE announcements SET view_count = COALESCE(view_count, 0) + 1 WHERE id = ?').run(req.params.id);

  return success(res, item);
});

/**
 * GET /api/mp/announcements-home
 * 首页公告资讯精简列表（置顶+最新4条）
 */
router.get('/announcements-home', async (req, res) => {
  const db = getDB();

  const list = db.prepare(`
    SELECT id, title, summary, category, cover_url, author,
           view_count, published_at, is_top
    FROM announcements WHERE status = 1
    ORDER BY is_top DESC, sort_order DESC, published_at DESC
    LIMIT 5
  `).all();

  return success(res, list);
});

// 获取学习积分概览
router.get('/study-points/overview', async (req, res) => {
  try {
    const userId = req.user?.id || req.query.user_id || 1;
    const db = getDB();

    // 计算课程学习积分：完成每个课程得10分
    const coursePoints = db.prepare(
      `SELECT COALESCE(SUM(10), 0) as points,
              COUNT(DISTINCT course_id) as completed_courses
       FROM study_progress
       WHERE user_id = ? AND progress >= 80`
    ).get(userId);

    // 计算电子书阅读积分：阅读每本书得5分
    const bookPoints = db.prepare(
      `SELECT COALESCE(SUM(5), 0) as points,
              COUNT(DISTINCT book_id) as read_books
       FROM user_read_progress
       WHERE user_id = ? AND progress >= 50`
    ).get(userId);

    // 计算日志积分：写每日日志得3分
    const logPoints = db.prepare(
      `SELECT COALESCE(SUM(3), 0) as points,
              COUNT(*) as log_days
       FROM action_daily_logs
       WHERE user_id = ?`
    ).get(userId);

    // 计算打卡积分：每天打卡得2分
    const checkinPoints = db.prepare(
      `SELECT COALESCE(SUM(2), 0) as points,
              COUNT(DISTINCT DATE(created_at)) as checkin_days
       FROM action_commitments_checkins cc
       JOIN action_commitments c ON cc.commitment_id = c.id
       WHERE c.user_id = ?`
    ).get(userId);

    const totalPoints = (coursePoints?.points || 0)
      + (bookPoints?.points || 0)
      + (logPoints?.points || 0)
      + (checkinPoints?.points || 0);

    // 计算学习天数（有记录的不重复天数）
    const studyDays = db.prepare(
      `SELECT COUNT(DISTINCT DATE(updated_at)) as days
       FROM study_progress WHERE user_id = ? AND progress > 0
       UNION ALL
       SELECT COUNT(DISTINCT DATE(created_at)) as days
       FROM action_daily_logs WHERE user_id = ?`
    ).all(userId, userId);
    const totalStudyDays = studyDays.reduce((sum, row) => sum + (row.days || 0), 0);

    // 学习等级
    let level = '初学者';
    let levelIcon = '🌱';
    if (totalPoints >= 500) { level = '学霸大师'; levelIcon = '👑'; }
    else if (totalPoints >= 300) { level = '学习达人'; levelIcon = '🏆'; }
    else if (totalPoints >= 150) { level = '积极学员'; levelIcon = '⭐'; }
    else if (totalPoints >= 50) { level = '上进学员'; levelIcon = '📈'; }

    // 最近7天学习记录
    const recentActivity = db.prepare(
      `SELECT DATE(updated_at) as date, 'course' as type, COUNT(*) as count
       FROM study_progress WHERE user_id = ? AND progress > 0
         AND updated_at >= DATE('now', '-7 days')
       GROUP BY DATE(updated_at)
       UNION ALL
       SELECT DATE(created_at) as date, 'log' as type, COUNT(*) as count
       FROM action_daily_logs WHERE user_id = ?
         AND created_at >= DATE('now', '-7 days')
       GROUP BY DATE(created_at)
       ORDER BY date DESC LIMIT 14`
    ).all(userId, userId);

    // 积分明细
    const pointDetails = [
      { type: '视频学习', icon: '🎬', points: coursePoints?.points || 0, count: coursePoints?.completed_courses || 0, unit: '门课程' },
      { type: '电子书阅读', icon: '📕', points: bookPoints?.points || 0, count: bookPoints?.read_books || 0, unit: '本书' },
      { type: '行动日志', icon: '📋', points: logPoints?.points || 0, count: logPoints?.log_days || 0, unit: '篇日志' },
      { type: '承诺打卡', icon: '✅', points: checkinPoints?.points || 0, count: checkinPoints?.checkin_days || 0, unit: '次打卡' }
    ];

    res.json({
      code: 0,
      data: {
        total_points: totalPoints,
        study_days: totalStudyDays,
        level,
        level_icon: levelIcon,
        details: pointDetails,
        recent_activity: recentActivity,
        next_level_points: totalPoints < 50 ? 50 : totalPoints < 150 ? 150 : totalPoints < 300 ? 300 : totalPoints < 500 ? 500 : null
      }
    });
  } catch (e) {
    console.error('获取学习积分失败:', e);
    res.json({ code: 0, data: { total_points: 0, study_days: 0, level: '初学者', level_icon: '🌱', details: [], recent_activity: [], next_level_points: 50 } });
  }
});

// 学习积分排行榜
router.get('/study-points/ranking', async (req, res) => {
  try {
    const db = getDB();

    // 简单计算每个用户的总分
    const rankings = db.prepare(`
      SELECT u.id, u.nickname, u.avatar_url, u.agent_level,
             COALESCE(sp.course_pts, 0) + COALESCE(bp.book_pts, 0) + COALESCE(lp.log_pts, 0) + COALESCE(cp.checkin_pts, 0) as total_points
      FROM users u
      LEFT JOIN (
        SELECT user_id, SUM(10) as course_pts FROM study_progress WHERE progress >= 80 GROUP BY user_id
      ) sp ON u.id = sp.user_id
      LEFT JOIN (
        SELECT user_id, SUM(5) as book_pts FROM user_read_progress WHERE progress >= 50 GROUP BY user_id
      ) bp ON u.id = bp.user_id
      LEFT JOIN (
        SELECT user_id, SUM(3) as log_pts FROM action_daily_logs GROUP BY user_id
      ) lp ON u.id = lp.user_id
      LEFT JOIN (
        SELECT c.user_id, SUM(2) as checkin_pts
        FROM action_commitments_checkins cc
        JOIN action_commitments c ON cc.commitment_id = c.id
        GROUP BY c.user_id
      ) cp ON u.id = cp.user_id
      ORDER BY total_points DESC
      LIMIT 20
    `).all();

    res.json({ code: 0, data: rankings.map((r, i) => ({ ...r, rank: i + 1 })) });
  } catch (e) {
    console.error('获取排行榜失败:', e);
    res.json({ code: 0, data: [] });
  }
});

module.exports = router;
