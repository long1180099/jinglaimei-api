/**
 * 数据库连接单例（自动初始化表结构）
 */
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '../../data/jinglaimei.db');
const DB_PRESEED = path.join(__dirname, '../../data/jinglaimei.db.preseed');

if (!fs.existsSync(path.dirname(DB_PATH))) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

// 仅在数据库文件不存在时才使用预置种子（避免覆盖生产数据）
if (!fs.existsSync(DB_PATH) && fs.existsSync(DB_PRESEED)) {
  console.log('🌱 检测到预置数据库，正在初始化...');
  fs.copyFileSync(DB_PRESEED, DB_PATH);
  console.log('✅ 预置数据库已就绪');
}
// 注意：不再根据用户数判断是否覆盖，防止每次部署覆盖生产数据

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
  // 检查 admins 表是否存在
  const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='admins'").get();
  if (tableExists) return;

  console.log('🚀 首次启动，自动初始化数据库表结构...');

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
  `);

  // 插入默认管理员账号
  const adminExists = db.prepare('SELECT id FROM admins WHERE username = ?').get('admin');
  if (!adminExists) {
    const hashedPassword = bcrypt.hashSync('admin123456', 10);
    db.prepare('INSERT INTO admins (username, password, real_name, role, permissions, status) VALUES (?, ?, ?, ?, ?, ?)')
      .run('admin', hashedPassword, '超级管理员', 'super_admin', '["all"]', 1);
    console.log('  ✅ 默认管理员账号已创建: admin / admin123456');
  }

  console.log('✅ 数据库初始化完成！');
}

module.exports = { getDB };
