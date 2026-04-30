/**
 * 视频学习系统 - 数据库初始化 (005)
 * 5张表：video_categories, videos, video_series, video_orders, video_progress
 */
const path = require('path');
const dbPath = path.join(__dirname, '../data/jinglaimei.db');
const Database = require('better-sqlite3');

function init() {
  const db = new Database(dbPath);

  // ==================== 1. 视频分类表 ====================
  db.exec(`
    CREATE TABLE IF NOT EXISTS video_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT DEFAULT '',
      description TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      status INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  // 初始化默认分类
  const catCount = db.prepare('SELECT COUNT(*) as c FROM video_categories').get().c;
  if (catCount === 0) {
    const defaultCats = [
      ['产品培训', '📦', '产品知识、成分解析、使用教程', 1],
      ['销售技巧', '💡', '成交话术、客户沟通、销售心理学', 2],
      ['团队管理', '👥', '团队建设、代理培训、激励方案', 3],
      ['护肤科普', '🧴', '皮肤护理知识、问题肌肤解决方案', 4],
      ['品牌文化', '🏆', '品牌故事、企业文化、发展历程', 5],
      ['新人入门', '🌱', '新手必看、平台操作、基础培训', 6],
    ];
    const insertCat = db.prepare('INSERT INTO video_categories (name, icon, description, sort_order) VALUES (?, ?, ?, ?)');
    defaultCats.forEach(c => insertCat.run(...c));
  }

  // ==================== 2. 视频主表 ====================
  db.exec(`
    CREATE TABLE IF NOT EXISTS videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      cover_url TEXT DEFAULT '',
      video_url TEXT NOT NULL,
      video_source TEXT DEFAULT 'upload',
      duration INTEGER DEFAULT 0,
      file_size INTEGER DEFAULT 0,

      -- 分类
      category_id INTEGER DEFAULT 0,
      category_name TEXT DEFAULT '',

      -- 系列课关联
      series_id INTEGER,
      series_episode INTEGER DEFAULT 0,

      -- 权限控制
      access_level TEXT DEFAULT 'all',
      price REAL DEFAULT 0,

      -- 讲师信息
      instructor TEXT DEFAULT '',
      instructor_avatar TEXT DEFAULT '',

      -- 统计数据
      view_count INTEGER DEFAULT 0,
      like_count INTEGER DEFAULT 0,
      purchase_count INTEGER DEFAULT 0,

      -- 内容标签
      tags TEXT DEFAULT '[]',
      difficulty TEXT DEFAULT 'beginner',

      -- 状态
      status INTEGER DEFAULT 1,
      is_recommend INTEGER DEFAULT 0,
      is_top INTEGER DEFAULT 0,

      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  // ==================== 3. 视频系列课表 ====================
  db.exec(`
    CREATE TABLE IF NOT EXISTS video_series (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      cover_url TEXT DEFAULT '',
      category_id INTEGER DEFAULT 0,
      category_name TEXT DEFAULT '',

      -- 定价策略
      price REAL DEFAULT 0,
      original_price REAL DEFAULT 0,

      -- 权限
      access_level TEXT DEFAULT 'all',

      -- 讲师
      instructor TEXT DEFAULT '',
      instructor_avatar TEXT DEFAULT '',

      -- 课程元数据
      total_episodes INTEGER DEFAULT 0,
      total_duration INTEGER DEFAULT 0,
      difficulty TEXT DEFAULT 'beginner',
      tags TEXT DEFAULT '[]',

      -- 统计
      view_count INTEGER DEFAULT 0,
      purchase_count INTEGER DEFAULT 0,
      student_count INTEGER DEFAULT 0,

      status INTEGER DEFAULT 1,
      is_recommend INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  // ==================== 4. 视频订单表（代理商余额购买） ====================
  db.exec(`
    CREATE TABLE IF NOT EXISTS video_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL,

      -- 购买内容
      target_type TEXT NOT NULL,
      target_id INTEGER NOT NULL,
      target_title TEXT DEFAULT '',

      -- 金额
      amount REAL DEFAULT 0,

      -- 支付方式
      payment_method TEXT DEFAULT 'balance',

      -- 状态
      status TEXT DEFAULT 'pending',

      -- 时间
      paid_at TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),

      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // ==================== 5. 视频学习进度表 ====================
  db.exec(`
    CREATE TABLE IF NOT EXISTS video_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      video_id INTEGER NOT NULL,

      -- 播放进度(秒)
      progress_seconds INTEGER DEFAULT 0,
      total_seconds INTEGER DEFAULT 0,

      -- 进度百分比
      progress_percent INTEGER DEFAULT 0,

      -- 学习状态
      is_completed INTEGER DEFAULT 0,
      completed_at TEXT,

      -- 最后播放时间
      last_watch_time TEXT DEFAULT (datetime('now','localtime')),

      -- 观看次数
      watch_count INTEGER DEFAULT 0,
      watch_duration INTEGER DEFAULT 0, -- 累计观看秒数

      -- 学习笔记
      notes TEXT DEFAULT '',

      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime')),

      UNIQUE(user_id, video_id),

      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (video_id) REFERENCES videos(id)
    )
  `);

  // 创建索引加速查询
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_videos_category ON videos(category_id);
    CREATE INDEX IF NOT EXISTS idx_videos_series ON videos(series_id);
    CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);
    CREATE INDEX IF NOT EXISTS idx_video_series_status ON video_series(status);
    CREATE INDEX IF NOT EXISTS idx_video_orders_user ON video_orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_video_orders_target ON video_orders(target_type, target_id);
    CREATE INDEX IF NOT EXISTS idx_video_progress_user ON video_progress(user_id);
    CREATE INDEX IF NOT EXISTS idx_video_progress_video ON video_progress(video_id);
  `);

  console.log('✅ 视频学习系统数据库初始化完成 (5张表)');
  db.close();
}

try {
  init();
} catch (err) {
  console.error('❌ 视频学习系统初始化失败:', err.message);
}

module.exports = { init };
