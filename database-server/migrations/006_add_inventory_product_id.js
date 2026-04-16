/**
 * 迁移006: 库存商品表增加product_id关联字段
 * 解决商品管理和库存管理双轨不同步问题
 */
const path = require('path');
const Database = require('better-sqlite3');
const dbPath = path.join(__dirname, '../data/jinglaimei.db');

console.log('[Migration 006] 开始: 添加 inventory_stock.product_id 字段');

let db;
try {
  db = new Database(dbPath);

  // 1. 给 inventory_stock 表添加 product_id 列（可为空，因为有些库存项可能没有对应商品）
  const colCheck = db.pragma("table_info(inventory_stock)");
  const hasProductId = colCheck.some(col => col.name === 'product_id');
  
  if (!hasProductId) {
    db.exec(`
      ALTER TABLE inventory_stock ADD COLUMN product_id INTEGER;
    `);
    console.log('  ✅ 已添加 product_id 列到 inventory_stock');

    // 2. 尝试根据 product_name 匹配已有的 products 记录，回填 product_id
    const matches = db.prepare(`
      UPDATE inventory_stock 
      SET product_id = (
        SELECT p.id FROM products p 
        WHERE p.product_name = inventory_stock.product_name 
          AND p.status != 0
        LIMIT 1
      )
      WHERE EXISTS (
        SELECT 1 FROM products p 
        WHERE p.product_name = inventory_stock.product_name 
          AND p.status != 0
      )
    `).run();
    
    console.log(`  ✅ 已回填 ${matches.changes} 条记录的 product_id`);
  } else {
    console.log('  ⏭️ product_id 列已存在，跳过');
  }

  // 3. 验证结果
  const linkedCount = db.prepare("SELECT COUNT(*) as cnt FROM inventory_stock WHERE product_id IS NOT NULL").get().cnt;
  const totalStock = db.prepare("SELECT COUNT(*) as cnt FROM inventory_stock").get().cnt;

  console.log(`  📊 库存商品: ${totalStock.cnt} 总数, ${linkedCount} 已关联到 products 表`);
  console.log('[Migration 006] 完成\n');

} catch (e) {
  console.error('❌ Migration 006 失败:', e.message);
  process.exit(1);
} finally {
  if (db) db.close();
}
