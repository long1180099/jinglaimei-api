const db = require('better-sqlite3')('./data/jinglaimei.db');

// 更新实际存在的商品 ID 22-31
var updates = [
  [22, '/uploads/products/product_22.png'],
  [23, '/uploads/products/product_23.png'],
  [24, '/uploads/products/product_24.png'],
  [25, '/uploads/products/product_25.png'],
  [26, '/uploads/products/product_26.png'],
  [27, '/uploads/products/product_27.png'],
  [28, '/uploads/products/product_28.png'],
  [29, '/uploads/products/product_29.png'],
  [30, '/uploads/products/product_30.png'],
  [31, '/uploads/products/product_31.png'],
];

var updateStmt = db.prepare('UPDATE products SET main_image = ? WHERE id = ?');

console.log('=== Updating product images ===');
updates.forEach(function(pair) {
  var id = pair[0];
  var img = pair[1];
  updateStmt.run(img, id);
});

// 验证结果
console.log('\n=== Verification ===');
var rows = db.prepare("SELECT id, product_name, CASE WHEN main_image IS NULL OR main_image = '' THEN 'NO IMAGE' ELSE main_image END as img FROM products WHERE status = 1 ORDER BY id").all();
rows.forEach(function(r) {
  console.log('ID' + r.id + ': ' + r.product_name + ' => ' + (r.img || '(empty)').substring(0, 60));
});

db.close();
console.log('\nDONE');
