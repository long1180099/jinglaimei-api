/**
 * 库存管理模块 - 数据库迁移
 * 新增: inventory_stock(库存商品表) + inventory_records(出入库记录表)
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../data/jinglaimei.db');

if (!fs.existsSync(DB_PATH)) {
  console.error('❌ 数据库文件不存在，请先运行主迁移脚本');
  process.exit(1);
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

console.log('📦 开始创建库存管理表结构...\n');

const createTables = db.transaction(() => {

  // ========== 库存商品表 ==========
  // 独立于products表的库存管理商品（可关联也可独立）
  db.exec(`
    CREATE TABLE IF NOT EXISTS inventory_stock (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_name TEXT NOT NULL,
      product_code TEXT,
      category TEXT DEFAULT '未分类',
      unit TEXT DEFAULT '件',
      quantity INTEGER DEFAULT 0,           -- 当前库存数量
      total_in INTEGER DEFAULT 0,           -- 累计入库量
      total_out INTEGER DEFAULT 0,          -- 累计出库量
      avg_cost REAL DEFAULT 0.00,           -- 加权平均成本
      total_cost REAL DEFAULT 0.00,         -- 总成本金额
      total_freight REAL DEFAULT 0.00,      -- 总运费
      min_alert INTEGER DEFAULT 10,         -- 库存预警阈值
      remark TEXT,
      status INTEGER DEFAULT 1,            -- 1=正常 0=停用
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);
  console.log('  ✅ inventory_stock 库存商品表');

  // ========== 出入库记录表 ==========
  db.exec(`
    CREATE TABLE IF NOT EXISTS inventory_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stock_id INTEGER NOT NULL,             -- 关联的库存商品ID
      product_name TEXT NOT NULL,            -- 冗余存储商品名（防止改名后历史数据丢失）
      record_type TEXT NOT NULL,             -- 'in'=入库 | 'out'=出库 | 'adjust'=盘点调整
      quantity INTEGER NOT NULL,             -- 数量（出库为负数或正数，这里统一用正数+type区分）
      unit_cost REAL DEFAULT 0.00,           -- 单位成本
      cost_total REAL DEFAULT 0.00,          -- 本次成本小计
      freight REAL DEFAULT 0.00,             -- 本次运费
      stock_before INTEGER DEFAULT 0,        -- 操作前库存
      stock_after INTEGER DEFAULT 0,         -- 操作后库存
      operator TEXT DEFAULT '管理员',        -- 操作人
      remark TEXT,                           -- 备注/来源说明
      batch_no TEXT,                         -- 批次号
      supplier TEXT,                         -- 供应商
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (stock_id) REFERENCES inventory_stock(id) ON DELETE CASCADE
    )
  `);
  console.log('  ✅ inventory_records 出入库记录表');

  // ========== 创建索引 ==========
  db.exec(`CREATE INDEX IF NOT EXISTS idx_inventory_stock_name ON inventory_stock(product_name)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_inventory_stock_code ON inventory_stock(product_code)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_inventory_records_stock_id ON inventory_records(stock_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_inventory_records_type ON inventory_records(record_type)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_inventory_records_date ON inventory_records(created_at)`);

  console.log('  ✅ 所有索引创建完成');
});

createTables();

console.log('\n✨ 库存管理表创建完成！');
console.log(`📁 数据库文件: ${DB_PATH}\n`);
db.close();
