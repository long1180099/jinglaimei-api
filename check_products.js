const db = require('better-sqlite3')('./data/jinglaimei.db');

console.log('=== 所有商品 ===');
const all = db.prepare("SELECT id, product_name, main_image FROM products ORDER BY id").all();
all.forEach(p => console.log(p.id + ' | ' + p.product_name + ' | ' + (p.main_image || '(空)')));

db.close();
