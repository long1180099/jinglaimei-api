/**
 * 数据库迁移脚本 - 创建所有核心表
 * 静莱美代理商系统
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../data/jinglaimei.db');

// 确保data目录存在
if (!fs.existsSync(path.dirname(DB_PATH))) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

const db = new Database(DB_PATH);

// 开启WAL模式提升并发性能
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

console.log('🚀 开始创建数据库表结构...\n');

// 使用事务批量建表
const createTables = db.transaction(() => {

  // ========== 1. 用户表 ==========
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      openid TEXT UNIQUE,
      unionid TEXT,
      username TEXT NOT NULL,
      phone TEXT UNIQUE,
      email TEXT,
      avatar_url TEXT,
      real_name TEXT,
      gender INTEGER DEFAULT 0,
      birthday TEXT,
      agent_level INTEGER DEFAULT 1,
      parent_id INTEGER DEFAULT NULL,
      team_id INTEGER DEFAULT NULL,
      invite_code TEXT UNIQUE,
      registered_at TEXT NOT NULL,
      balance REAL DEFAULT 0.00,
      frozen_balance REAL DEFAULT 0.00,
      total_income REAL DEFAULT 0.00,
      today_income REAL DEFAULT 0.00,
      status INTEGER DEFAULT 1,
      is_deleted INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);
  console.log('  ✅ users 用户表');

  // ========== 2. 管理员表 ==========
  db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      real_name TEXT,
      email TEXT,
      phone TEXT,
      avatar_url TEXT,
      role TEXT DEFAULT 'operator',
      permissions TEXT DEFAULT '[]',
      last_login_at TEXT,
      last_login_ip TEXT,
      status INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);
  console.log('  ✅ admins 管理员表');

  // ========== 3. 团队表 ==========
  db.exec(`
    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_name TEXT NOT NULL,
      leader_id INTEGER NOT NULL,
      description TEXT,
      member_count INTEGER DEFAULT 0,
      total_sales REAL DEFAULT 0.00,
      total_commission REAL DEFAULT 0.00,
      monthly_target REAL DEFAULT 0.00,
      monthly_achievement REAL DEFAULT 0.00,
      team_level INTEGER DEFAULT 1,
      performance_rating REAL DEFAULT 0.00,
      status INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (leader_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  console.log('  ✅ teams 团队表');

  // ========== 4. 商品分类表 ==========
  db.exec(`
    CREATE TABLE IF NOT EXISTS product_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_name TEXT NOT NULL,
      parent_id INTEGER DEFAULT 0,
      icon_url TEXT,
      sort_order INTEGER DEFAULT 0,
      status INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);
  console.log('  ✅ product_categories 商品分类表');

  // ========== 5. 商品表 ==========
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_code TEXT UNIQUE NOT NULL,
      product_name TEXT NOT NULL,
      category_id INTEGER NOT NULL,
      brand TEXT,
      retail_price REAL NOT NULL,
      vip_price REAL,
      agent_price REAL,
      partner_price REAL,
      wholesale_price REAL,
      chief_price REAL,
      division_price REAL,
      cost_price REAL,
      stock_quantity INTEGER DEFAULT 0,
      sold_quantity INTEGER DEFAULT 0,
      min_stock_alert INTEGER DEFAULT 10,
      description TEXT,
      specifications TEXT,
      main_image TEXT,
      image_gallery TEXT DEFAULT '[]',
      status INTEGER DEFAULT 1,
      is_hot INTEGER DEFAULT 0,
      is_recommend INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (category_id) REFERENCES product_categories(id)
    )
  `);
  console.log('  ✅ products 商品表');

  // ========== 6. 订单表 ==========
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL,
      total_amount REAL NOT NULL,
      discount_amount REAL DEFAULT 0.00,
      shipping_fee REAL DEFAULT 0.00,
      actual_amount REAL NOT NULL,
      paid_amount REAL DEFAULT 0.00,
      receiver_name TEXT NOT NULL,
      receiver_phone TEXT NOT NULL,
      receiver_address TEXT NOT NULL,
      shipping_method TEXT,
      shipping_no TEXT,
      order_status INTEGER DEFAULT 0,
      payment_status INTEGER DEFAULT 0,
      payment_method TEXT,
      payment_time TEXT,
      buyer_remark TEXT,
      seller_remark TEXT,
      order_time TEXT NOT NULL,
      shipping_time TEXT,
      confirm_time TEXT,
      cancel_time TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  console.log('  ✅ orders 订单表');

  // ========== 7. 订单明细表 ==========
  db.exec(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      product_image TEXT,
      unit_price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      subtotal REAL NOT NULL,
      specifications TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);
  console.log('  ✅ order_items 订单明细表');

  // ========== 8. 收益表 ==========
  db.exec(`
    CREATE TABLE IF NOT EXISTS commissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      order_id INTEGER NOT NULL,
      commission_type INTEGER DEFAULT 1,
      commission_rate REAL NOT NULL,
      order_amount REAL NOT NULL,
      commission_amount REAL NOT NULL,
      commission_status INTEGER DEFAULT 0,
      settlement_time TEXT,
      source_user_id INTEGER,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    )
  `);
  console.log('  ✅ commissions 收益表');

  // ========== 9. 提现表 ==========
  db.exec(`
    CREATE TABLE IF NOT EXISTS withdrawals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      withdrawal_no TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL,
      withdrawal_amount REAL NOT NULL,
      service_fee REAL DEFAULT 0.00,
      actual_amount REAL NOT NULL,
      bank_name TEXT NOT NULL,
      bank_card_no TEXT NOT NULL,
      account_name TEXT NOT NULL,
      withdrawal_status INTEGER DEFAULT 0,
      audit_user_id INTEGER,
      audit_time TEXT,
      audit_remark TEXT,
      payment_time TEXT,
      payment_remark TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  console.log('  ✅ withdrawals 提现表');

  // ========== 10. 商学院课程表 ==========
  db.exec(`
    CREATE TABLE IF NOT EXISTS school_courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_type INTEGER NOT NULL,
      course_title TEXT NOT NULL,
      course_subtitle TEXT,
      cover_image TEXT,
      video_url TEXT,
      content TEXT,
      attachments TEXT DEFAULT '[]',
      required_time INTEGER DEFAULT 0,
      difficulty_level INTEGER DEFAULT 1,
      credit_points INTEGER DEFAULT 0,
      status INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      view_count INTEGER DEFAULT 0,
      like_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);
  console.log('  ✅ school_courses 课程表');

  // ========== 11. 学习进度表 ==========
  db.exec(`
    CREATE TABLE IF NOT EXISTS study_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      course_id INTEGER NOT NULL,
      study_status INTEGER DEFAULT 0,
      progress_percent REAL DEFAULT 0.00,
      study_duration INTEGER DEFAULT 0,
      exam_score REAL,
      exam_time TEXT,
      start_time TEXT,
      complete_time TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime')),
      UNIQUE(user_id, course_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (course_id) REFERENCES school_courses(id) ON DELETE CASCADE
    )
  `);
  console.log('  ✅ study_progress 学习进度表');

  // ========== 12. 系统配置表 ==========
  db.exec(`
    CREATE TABLE IF NOT EXISTS system_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      config_key TEXT UNIQUE NOT NULL,
      config_value TEXT,
      config_type TEXT,
      description TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);
  console.log('  ✅ system_configs 系统配置表');

  // ========== 13. 月度统计表 ==========
  db.exec(`
    CREATE TABLE IF NOT EXISTS monthly_statistics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      statistic_month TEXT NOT NULL,
      sales_amount REAL DEFAULT 0.00,
      commission_amount REAL DEFAULT 0.00,
      order_count INTEGER DEFAULT 0,
      new_members INTEGER DEFAULT 0,
      active_members INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      UNIQUE(user_id, statistic_month),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  console.log('  ✅ monthly_statistics 月度统计表');

  // ========== 14. 操作日志表 ==========
  db.exec(`
    CREATE TABLE IF NOT EXISTS operation_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      operator_id INTEGER,
      operator_type TEXT DEFAULT 'admin',
      action TEXT NOT NULL,
      target_type TEXT,
      target_id INTEGER,
      description TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);
  console.log('  ✅ operation_logs 操作日志表');

  // ========== 创建索引 ==========
  console.log('\n📑 创建索引...');
  
  db.exec(`CREATE INDEX IF NOT EXISTS idx_users_parent_id ON users(parent_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_users_team_id ON users(team_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_users_agent_level ON users(agent_level)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_orders_order_no ON orders(order_no)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_orders_time ON orders(order_time)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_commissions_user_id ON commissions(user_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_commissions_order_id ON commissions(order_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(commission_status)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_products_status ON products(status)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_courses_type ON school_courses(course_type)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_study_user_id ON study_progress(user_id)`);
  
  console.log('  ✅ 所有索引创建完成');
});

createTables();

console.log('\n✨ 数据库表结构创建完成！');
console.log(`📁 数据库文件位置: ${DB_PATH}\n`);

db.close();
