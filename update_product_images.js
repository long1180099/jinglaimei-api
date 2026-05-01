const db = require('better-sqlite3')('./data/jinglaimei.db');

// 更新ID 1-10的商品图片
const updates = [
  [1, '/uploads/products/product_01.png'],
  [2, '/uploads/products/product_02.png'],
  [3, '/uploads/products/product_03.png'],
  [4, '/uploads/products/product_04.png'],
  [5, '/uploads/products/product_05.png'],
  [6, '/uploads/products/product_06.png'],
  [7, '/uploads/products/product_07.png'],
  [8, '/uploads/products/product_08.png'],
  [9, '/uploads/products/product_09.png'],
  [10, '/uploads/products/product_10.png'],
];

const updateStmt = db.prepare('UPDATE products SET main_image = ? WHERE id = ?');
const checkStmt = db.prepare('SELECT id, product_name, main_image FROM products WHERE id = ?');

console.log('=== 开始更新商品图片 ===');
updates.forEach(([id, img]) => {
  updateStmt.run(img, id);
  const row = checkStmt.get(id);
  console.log(`ID ${row.id}: ${row.product_name} => ${row.main_image}`);
});

// 也检查所有上架商品
console.log('\n=== 所有上架商品图片状态 ===');
const allProducts = db.prepare("SELECT id, product_name, CASE WHEN main_image IS NULL OR main_image = '' THEN '❌ 无图' ELSE '✅ 有图' END as status, main_image FROM products WHERE status = 1 ORDER BY id").all();
allProducts.forEach(p => {
  console.log(`  ${p.status} ID${p.id}: ${p.product_name} | ${(p.main_image || '(空)').slice(0,60)}`);
});

db.close();
console.log('\n✅ 完成！');
