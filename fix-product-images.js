/**
 * 修复商品图片 + 添加轮播图 + 公告数据
 * 用法: node fix-product-images.js
 * 然后上传到服务器执行: scp fix-product-images.js root@118.195.185.6:/root/database-server/
 * SSH执行: node /root/database-server/fix-product-images.js
 */
const Database = require('better-sqlite3');
const path = require('path');

// 尝试多个可能的数据库路径
const possiblePaths = [
  path.join(__dirname, 'data', 'jinglaimei.db'),
  path.join(__dirname, 'database-server', 'data', 'jinglaimei.db'),
  '/root/database-server/data/jinglaimei.db',
  './data/jinglaimei.db'
];

let db = null;
for (const p of possiblePaths) {
  try {
    db = new Database(p, { readonly: false });
    console.log('✅ 数据库已连接:', p);
    break;
  } catch(e) {
    // 继续尝试下一个路径
  }
}

if (!db) {
  console.error('❌ 找不到数据库文件，尝试过的路径:');
  possiblePaths.forEach(p => console.error('  -', p));
  process.exit(1);
}

// ===== 1. 更新商品图片 =====
const productImages = {
  1: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&h=800&fit=crop&crop=center',
  2: 'https://images.unsplash.com/photo-1570194065650-d99fb4ee38f1?w=800&h=800&fit=crop&crop=center',
  3: 'https://images.unsplash.com/photo-1617897903246-719242758050?w=800&h=800&fit=crop&crop=center',
  4: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=800&h=800&fit=crop&crop=center',
  5: 'https://images.unsplash.com/photo-1631214524020-7e18db9a8f89?w=800&h=800&fit=crop&crop=center',
  6: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&h=800&fit=crop&crop=center',
  7: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=800&h=800&fit=crop&crop=center',
  8: 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=800&h=800&fit=crop&crop=center',
  9: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&h=800&fit=crop&crop=center',
  10: 'https://images.unsplash.com/photo-1515688594390-b6baf3a27bae?w=800&h=800&fit=crop&crop=center'
};

console.log('=== 1. 更新商品图片 ===');
const updateImg = db.prepare('UPDATE products SET main_image = ?, image_gallery = ? WHERE id = ?');
for (const [id, url] of Object.entries(productImages)) {
  updateImg.run(url, JSON.stringify([url]), parseInt(id));
  console.log('  ✅ 商品ID', id, '图片已更新');
}

// ===== 2. 添加轮播图 =====
console.log('\n=== 2. 添加首页轮播图 ===');
// 先清除旧的banner配置
db.prepare("DELETE FROM system_configs WHERE config_key LIKE 'banner_%'").run();

const banners = [
  { title: '新品上市', desc: '静莱美2026春季限定系列', image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=1200&h=500&fit=crop', link_type: 'category', link_id: 3 },
  { title: '代理商招募', desc: '加入我们，共创美丽事业', image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1200&h=500&fit=crop', link_type: 'category', link_id: 0 },
  { title: '商学院课程', desc: '免费培训，助力成长', image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&h=500&fit=crop', link_type: 'page', link_id: 'school' }
];

const insertBanner = db.prepare('INSERT INTO system_configs (config_key, config_value, sort_order) VALUES (?, ?, ?)');
banners.forEach((b, i) => {
  const value = JSON.stringify({
    id: i + 1,
    image_url: b.image,
    title: b.title,
    description: b.desc,
    link_type: b.link_type,
    link_id: b.link_id
  });
  insertBanner.run('banner_' + (i + 1), value, i + 1);
  console.log('  ✅ 轮播图:', b.title);
});

// ===== 3. 添加公告 =====
console.log('\n=== 3. 添加系统公告 ===');
// 清除旧公告
db.prepare("DELETE FROM system_configs WHERE config_key LIKE 'notice_%'").run();

const notices = [
  { title: '关于隐私政策更新的通知', content: '《隐私政策》已更新，请您仔细阅读。', type: 'notice', is_top: 1 },
  { title: '春季新品限时优惠活动', content: '即日起至月底，全场商品满299减30，欢迎选购！', type: 'activity', is_top: 0 },
  { title: '商学院新课上线', content: '《美妆销售话术实战》课程现已上线，免费学习！', type: 'update', is_top: 0 }
];

const insertNotice = db.prepare('INSERT OR REPLACE INTO system_configs (config_key, config_value, sort_order) VALUES (?, ?, ?)');
notices.forEach((n, i) => {
  const noticeValue = JSON.stringify({ id: i + 1, title: n.title, content: n.content, category: n.type, is_top: n.is_top, published_at: new Date().toISOString() });
  insertNotice.run('notice_' + (i + 1), noticeValue, i + 1);
  
  // 同时尝试写入 announcements 表
  try {
    db.prepare("INSERT OR REPLACE INTO announcements (title, content, category, is_top, status, published_at) VALUES (?, ?, ?, ?, 1, datetime('now','localtime'))").run(n.title, n.content, n.type, n.is_top);
  } catch(e) {
    // announcements表可能字段不同，忽略
  }
  console.log('  ✅ 公告:', n.title);
});

// ===== 4. 验证结果 =====
console.log('\n=== 验证结果 ===');
const products = db.prepare('SELECT id, product_name, main_image FROM products LIMIT 10').all();
products.forEach(p => {
  console.log('商品', p.id, ':', p.product_name, '| 图片:', p.main_image ? '✅ 有图' : '❌ 无图');
});

const bannerCount = db.prepare("SELECT COUNT(*) as cnt FROM system_configs WHERE config_key LIKE 'banner_%'").get().cnt;
const noticeCount = db.prepare("SELECT COUNT(*) as cnt FROM system_configs WHERE config_key LIKE 'notice_%'").get().cnt;
console.log('\n轮播图数量:', bannerCount);
console.log('公告数量:', noticeCount);

db.close();
console.log('\n🎉 全部修复完成！');
