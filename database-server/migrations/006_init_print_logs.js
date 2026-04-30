/**
 * 006_init_print_logs - 打印记录表 + 系统设置(发货人默认名)
 */
const path = require('path');
const dbPath = path.join(__dirname, '../data/jinglaimei.db');
const Database = require('better-sqlite3');

function init() {
  const db = new Database(dbPath);

  // 打印记录表
  db.exec(`
    CREATE TABLE IF NOT EXISTS print_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      order_no TEXT NOT NULL,
      print_type TEXT DEFAULT 'shipping',
      shipper_name TEXT DEFAULT '',
      reviewer_name TEXT DEFAULT '',
      receiver_name TEXT NOT NULL,
      operator_id INTEGER DEFAULT 0,
      operator_name TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 系统设置表（存储发货人默认名等）
  db.exec(`
    CREATE TABLE IF NOT EXISTS system_settings (
      id INTEGER PRIMARY KEY CHECK(id=1),
      default_shipper TEXT DEFAULT '',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 确保系统设置有初始行
  const existing = db.prepare('SELECT COUNT(*) as cnt FROM system_settings WHERE id=1').get().cnt;
  if (!existing) {
    db.prepare("INSERT INTO system_settings (id, default_shipper) VALUES (1, '')").run();
  }

  // 为 print_logs 创建索引
  try {
    db.prepare('CREATE INDEX IF NOT EXISTS idx_print_logs_order_id ON print_logs(order_id)').run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_print_logs_created ON print_logs(created_at DESC)').run();
  } catch(e) {}

  console.log('[打印记录] 表结构初始化完成');
}

module.exports = { init };
