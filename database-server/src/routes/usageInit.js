/**
 * 产品使用日志 - 数据库初始化
 * 包含：customers 表、product_usage_logs 表、products 表新增字段、索引
 */
const { getDB } = require('../utils/db');

function initUsageDB() {
  const db = getDB();

  // 1. 顾客档案表
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      agent_user_id INTEGER NOT NULL,
      user_id INTEGER,
      notes TEXT DEFAULT '',
      status INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  // 2. 产品使用日志表
  db.exec(`
    CREATE TABLE IF NOT EXISTS product_usage_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_user_id INTEGER NOT NULL,
      customer_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      trace_code TEXT UNIQUE,
      start_date TEXT NOT NULL,
      usage_instructions TEXT DEFAULT '',
      created_by_user_id INTEGER NOT NULL,
      source_type TEXT DEFAULT 'self',
      status INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  // 3. products 表新增 usage_instructions 字段（幂等）
  try {
    db.exec(`ALTER TABLE products ADD COLUMN usage_instructions TEXT DEFAULT '[]'`);
  } catch (e) {
    // 字段已存在，忽略
  }

  // 4. users 表 team_id 索引（提升查询性能，幂等）
  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_users_team_id ON users(team_id)`);
  } catch (e) {
    // 索引创建失败不影响主流程
  }

  // 5. product_usage_logs 常用查询索引
  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_usage_logs_agent ON product_usage_logs(agent_user_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_usage_logs_customer ON product_usage_logs(customer_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_usage_logs_product ON product_usage_logs(product_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_usage_logs_created_by ON product_usage_logs(created_by_user_id)`);
  } catch (e) {
    // 索引创建失败不影响主流程
  }

  console.log('[usageInit] 产品使用日志模块初始化完成');
}

module.exports = { initUsageDB };
