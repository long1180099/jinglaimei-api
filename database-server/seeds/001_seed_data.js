/**
 * 种子数据初始化
 * 静莱美代理商系统 - 完整测试数据
 */

const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/jinglaimei.db');
const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');

console.log('🌱 开始初始化种子数据...\n');

const seedAll = db.transaction(() => {

  // ========== 系统配置 ==========
  console.log('📋 初始化系统配置...');
  const configs = [
    { key: 'site_name', value: '静莱美代理商系统', type: 'string', desc: '站点名称' },
    { key: 'commission_rate_l1', value: '0.10', type: 'number', desc: '一级代理佣金比例' },
    { key: 'commission_rate_l2', value: '0.05', type: 'number', desc: '二级代理佣金比例' },
    { key: 'commission_rate_l3', value: '0.03', type: 'number', desc: '三级代理佣金比例' },
    { key: 'withdrawal_min', value: '100', type: 'number', desc: '最低提现金额' },
    { key: 'withdrawal_service_fee_rate', value: '0.005', type: 'number', desc: '提现手续费比例' },
    { key: 'order_auto_confirm_days', value: '7', type: 'number', desc: '订单自动确认天数' },
    { key: 'new_agent_trial_days', value: '30', type: 'number', desc: '新代理试用期天数' },
    { key: 'announce', value: '欢迎加入静莱美大家庭！共创美好未来！', type: 'string', desc: '公告内容' },
  ];
  const insertConfig = db.prepare(
    `INSERT OR IGNORE INTO system_configs (config_key, config_value, config_type, description) VALUES (?, ?, ?, ?)`
  );
  configs.forEach(c => insertConfig.run(c.key, c.value, c.type, c.desc));
  console.log(`  ✅ ${configs.length} 条系统配置`);

  // ========== 管理员 ==========
  console.log('👑 初始化管理员账号...');
  const adminPassword = bcrypt.hashSync('admin123456', 10);
  const insertAdmin = db.prepare(`
    INSERT OR IGNORE INTO admins (username, password, real_name, email, role, permissions, status)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `);
  insertAdmin.run('admin', adminPassword, '超级管理员', 'admin@jinglaimei.com', 'super_admin', JSON.stringify(['*']));
  insertAdmin.run('operator', bcrypt.hashSync('oper123456', 10), '运营管理员', 'operator@jinglaimei.com', 'operator', JSON.stringify(['user:read', 'order:read', 'order:write', 'product:read']));
  insertAdmin.run('finance', bcrypt.hashSync('fin123456', 10), '财务管理员', 'finance@jinglaimei.com', 'finance', JSON.stringify(['commission:read', 'withdrawal:read', 'withdrawal:write']));
  console.log('  ✅ 3 个管理员账号 (admin/admin123456)');

  // ========== 商品分类 ==========
  console.log('🏷️  初始化商品分类...');
  const insertCat = db.prepare(`INSERT OR IGNORE INTO product_categories (id, category_name, parent_id, sort_order) VALUES (?, ?, ?, ?)`);
  insertCat.run(1, '护肤品', 0, 1);
  insertCat.run(2, '彩妆', 0, 2);
  insertCat.run(3, '香水', 0, 3);
  insertCat.run(4, '身体护理', 0, 4);
  insertCat.run(5, '面部护理', 1, 1);
  insertCat.run(6, '眼部护理', 1, 2);
  insertCat.run(7, '口红系列', 2, 1);
  insertCat.run(8, '粉底系列', 2, 2);
  console.log('  ✅ 8 个商品分类');

  // ========== 用户（代理商）==========
  console.log('👥 初始化用户数据...');
  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users
    (id, username, phone, real_name, gender, agent_level, parent_id, team_id, invite_code,
     registered_at, balance, total_income, status, avatar_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `);

  const avatarBase = 'https://api.dicebear.com/7.x/avataaars/svg?seed=';
  
  // 顶级代理（首席分公司 + 集团事业部）
  insertUser.run(1, '王美丽', '13800001111', '王美丽', 2, 5, null, 1, 'WML001',
    '2025-01-15 09:00:00', 15820.50, 98650.00, avatarBase + 'wangmeili');
  insertUser.run(2, '李华成', '13800002222', '李华成', 1, 6, null, 2, 'LHC002',
    '2025-02-01 10:00:00', 12340.00, 75430.00, avatarBase + 'lihuacheng');

  // 批发商
  insertUser.run(3, '张晓燕', '13800003333', '张晓燕', 2, 4, 1, 1, 'ZXY003',
    '2025-03-10 11:00:00', 5680.00, 32400.00, avatarBase + 'zhangxiaoyan');
  insertUser.run(4, '陈大伟', '13800004444', '陈大伟', 1, 4, 1, 1, 'CDW004',
    '2025-03-20 14:00:00', 4230.00, 28900.00, avatarBase + 'chendawei');

  // 代理商
  insertUser.run(5, '刘芳芳', '13800005555', '刘芳芳', 2, 3, 2, 2, 'LFF005',
    '2025-04-05 09:30:00', 6120.00, 41200.00, avatarBase + 'liufangfang');

  // 打版代言人
  insertUser.run(6, '赵小红', '13800006666', '赵小红', 2, 2, 3, 1, 'ZXH006',
    '2025-05-01 10:00:00', 1280.00, 8640.00, avatarBase + 'zhaoxiaohong');
  insertUser.run(7, '周建国', '13800007777', '周建国', 1, 2, 3, 1, 'ZJG007',
    '2025-05-15 15:00:00', 980.00, 6200.00, avatarBase + 'zhoujianguo');

  // 会员
  insertUser.run(8, '吴小静', '13800008888', '吴小静', 2, 1, 4, 1, 'WXJ008',
    '2025-06-01 09:00:00', 2100.00, 12300.00, avatarBase + 'wuxiaojing');
  insertUser.run(9, '郑明月', '13800009999', '郑明月', 2, 1, 5, 2, 'ZMY009',
    '2025-06-20 11:00:00', 1560.00, 9800.00, avatarBase + 'zhengmingyue');
  insertUser.run(10, '孙晓峰', '13800010000', '孙晓峰', 1, 1, 5, 2, 'SXF010',
    '2025-07-01 14:00:00', 3200.00, 18600.00, avatarBase + 'sunxiaofeng');
  insertUser.run(11, '胡玲玲', '13800011111', '胡玲玲', 2, 1, 2, 2, 'HLL011',
    '2025-07-15 10:00:00', 890.00, 5400.00, avatarBase + 'hulingling');
  insertUser.run(12, '马天宇', '13800012222', '马天宇', 1, 2, 1, 1, 'MTY012',
    '2025-08-01 09:00:00', 1670.00, 10200.00, avatarBase + 'matianyu');
  insertUser.run(13, '何美云', '13800013333', '何美云', 2, 3, 4, 1, 'HMY013',
    '2025-08-20 15:00:00', 2340.00, 14500.00, avatarBase + 'hemeiyun');
  insertUser.run(14, '林小草', '13800014444', '林小草', 2, 1, 3, 1, 'LXC014',
    '2025-09-01 11:00:00', 760.00, 4300.00, avatarBase + 'linxiaocao');
  insertUser.run(15, '徐浩然', '13800015555', '徐浩然', 1, 1, 5, 2, 'XHR015',
    '2025-09-15 09:00:00', 4100.00, 24800.00, avatarBase + 'xuhaoran');
  console.log('  ✅ 15 个用户（代理商）');

  // ========== 团队 ==========
  console.log('🏆 初始化团队数据...');
  const insertTeam = db.prepare(`
    INSERT OR IGNORE INTO teams
    (id, team_name, leader_id, description, member_count, total_sales, total_commission,
     monthly_target, monthly_achievement, team_level, performance_rating)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertTeam.run(1, '星光战队', 1, '拼搏进取，共创辉煌！团队成员积极活跃，销售业绩稳步增长。',
    9, 285600.00, 28560.00, 50000.00, 38420.00, 3, 4.8);
  insertTeam.run(2, '荣耀精英', 2, '专业团队，精英汇聚，致力于提供最优质的产品和服务。',
    6, 198400.00, 19840.00, 40000.00, 31200.00, 3, 4.6);
  console.log('  ✅ 2 个团队');

  // ========== 商品 ==========
  console.log('🛍️  初始化商品数据...');
  const insertProduct = db.prepare(`
    INSERT OR IGNORE INTO products
    (id, product_code, product_name, category_id, brand, retail_price, agent_price, vip_price, partner_price,
     cost_price, stock_quantity, sold_quantity, min_stock_alert, description, main_image, status, is_hot, is_recommend, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
  `);
  insertProduct.run(1, 'SKU-001', '静莱美保湿精华液30ml', 5, '静莱美', 298.00, 178.00, 248.00, 158.00, 89.00, 200, 156, 20, '深层补水保湿，改善肤质，让肌肤水润透亮。含玻尿酸+烟酰胺双重精华。', null, 1, 1, 1);
  insertProduct.run(2, 'SKU-002', '静莱美美白淡斑面霜50g', 5, '静莱美', 368.00, 218.00, 308.00, 198.00, 109.00, 150, 98, 15, '淡化色斑，提亮肤色，持久保湿24小时。医研级美白成分VC导入。', null, 1, 1, 2);
  insertProduct.run(3, 'SKU-003', '静莱美修护眼霜15g', 6, '静莱美', 258.00, 158.00, 218.00, 138.00, 79.00, 180, 210, 20, '淡化黑眼圈、细纹，紧致眼周肌肤。含视黄醇+胜肽复合配方。', null, 0, 1, 3);
  insertProduct.run(4, 'SKU-004', '静莱美丝绒口红 #01玫瑰红', 7, '静莱美', 168.00, 98.00, 138.00, 88.00, 49.00, 300, 445, 30, '显色持久，不脱妆，滋润不干燥。玫瑰红色调，百搭显白。', null, 1, 0, 4);
  insertProduct.run(5, 'SKU-005', '静莱美丝绒口红 #02裸粉色', 7, '静莱美', 168.00, 98.00, 138.00, 88.00, 49.00, 280, 380, 30, '柔雾质地，显白显气质。适合日常通勤妆容。', null, 0, 0, 5);
  insertProduct.run(6, 'SKU-006', '静莱美轻薄粉底液30ml', 8, '静莱美', 238.00, 148.00, 198.00, 128.00, 74.00, 160, 132, 15, '轻薄透气，持久控油，自然裸妆感。SPF30+/PA++防晒。', null, 1, 1, 6);
  insertProduct.run(7, 'SKU-007', '静莱美玫瑰香水50ml', 3, '静莱美', 458.00, 278.00, 388.00, 248.00, 139.00, 100, 76, 10, '东方玫瑰木调，优雅浪漫，持久留香8-12小时。', null, 0, 1, 7);
  insertProduct.run(8, 'SKU-008', '静莱美身体乳200ml', 4, '静莱美', 198.00, 118.00, 168.00, 98.00, 59.00, 250, 189, 25, '滋润保湿，嫩滑肌肤。含牛油果+乳木果双重滋养。', null, 0, 0, 8);
  insertProduct.run(9, 'SKU-009', '静莱美洁面泡沫150ml', 5, '静莱美', 128.00, 78.00, 108.00, 68.00, 39.00, 400, 367, 40, '氨基酸温和洁面，深层清洁不紧绷。适合敏感肌。', null, 1, 0, 9);
  insertProduct.run(10, 'SKU-010', '静莱美防晒喷雾100ml', 5, '静莱美', 178.00, 108.00, 148.00, 88.00, 54.00, 200, 143, 20, 'SPF50+/PA++++，轻薄透气，随时补喷。适合户外运动。', null, 0, 0, 10);
  console.log('  ✅ 10 款商品（含4级价格体系）');

  // ========== 订单 ==========
  console.log('📦 初始化订单数据...');
  const insertOrder = db.prepare(`
    INSERT OR IGNORE INTO orders
    (id, order_no, user_id, total_amount, discount_amount, shipping_fee, actual_amount, paid_amount,
     receiver_name, receiver_phone, receiver_address, order_status, payment_status, payment_method,
     payment_time, order_time, shipping_time, confirm_time)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertItem = db.prepare(`
    INSERT OR IGNORE INTO order_items (order_id, product_id, product_name, unit_price, quantity, subtotal)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const ordersData = [
    { id: 1, no: 'JLM20260101001', uid: 6, total: 298, discount: 0, shipping: 0, actual: 298, paid: 298, rname: '赵小红', rphone: '13800006666', raddr: '广东省广州市天河区天河路123号', status: 3, pstatus: 1, pmethod: 'wechat', ptime: '2026-01-01 10:30:00', otime: '2026-01-01 10:00:00', stime: '2026-01-02 14:00:00', ctime: '2026-01-09 10:00:00', items: [{pid:1,name:'静莱美保湿精华液30ml',price:178,qty:1,sub:178},{pid:9,name:'静莱美洁面泡沫150ml',price:78,qty:1,sub:78}]},
    { id: 2, no: 'JLM20260103001', uid: 7, total: 490, discount: 0, shipping: 0, actual: 490, paid: 490, rname: '周建国', rphone: '13800007777', raddr: '广东省深圳市南山区科技园路456号', status: 3, pstatus: 1, pmethod: 'wechat', ptime: '2026-01-03 14:30:00', otime: '2026-01-03 14:00:00', stime: '2026-01-04 09:00:00', ctime: '2026-01-11 14:00:00', items: [{pid:2,name:'静莱美美白淡斑面霜50g',price:218,qty:1,sub:218},{pid:4,name:'静莱美丝绒口红#01玫瑰红',price:98,qty:1,sub:98},{pid:5,name:'静莱美丝绒口红#02裸粉色',price:98,qty:1,sub:98},{pid:8,name:'静莱美身体乳200ml',price:118,qty:1,sub:118}]},
    { id: 3, no: 'JLM20260105001', uid: 8, total: 596, discount: 20, shipping: 0, actual: 576, paid: 576, rname: '吴小静', rphone: '13800008888', raddr: '上海市浦东新区陆家嘴金融贸易区789号', status: 3, pstatus: 1, pmethod: 'alipay', ptime: '2026-01-05 11:00:00', otime: '2026-01-05 10:30:00', stime: '2026-01-06 15:00:00', ctime: '2026-01-13 11:00:00', items: [{pid:1,name:'静莱美保湿精华液30ml',price:178,qty:2,sub:356},{pid:3,name:'静莱美修护眼霜15g',price:158,qty:1,sub:158}]},
    { id: 4, no: 'JLM20260108001', uid: 9, total: 456, discount: 0, shipping: 0, actual: 456, paid: 456, rname: '郑明月', rphone: '13800009999', raddr: '北京市朝阳区望京SOHO A座', status: 3, pstatus: 1, pmethod: 'wechat', ptime: '2026-01-08 16:00:00', otime: '2026-01-08 15:30:00', stime: '2026-01-09 09:00:00', ctime: '2026-01-16 16:00:00', items: [{pid:6,name:'静莱美轻薄粉底液30ml',price:148,qty:1,sub:148},{pid:7,name:'静莱美玫瑰香水50ml',price:278,qty:1,sub:278}]},
    { id: 5, no: 'JLM20260110001', uid: 10, total: 726, discount: 30, shipping: 0, actual: 696, paid: 696, rname: '孙晓峰', rphone: '13800010000', raddr: '浙江省杭州市西湖区文三路321号', status: 3, pstatus: 1, pmethod: 'wechat', ptime: '2026-01-10 10:00:00', otime: '2026-01-10 09:30:00', stime: '2026-01-11 14:00:00', ctime: '2026-01-18 10:00:00', items: [{pid:2,name:'静莱美美白淡斑面霜50g',price:218,qty:2,sub:436},{pid:10,name:'静莱美防晒喷雾100ml',price:108,qty:1,sub:108},{pid:9,name:'静莱美洁面泡沫150ml',price:78,qty:1,sub:78}]},
    { id: 6, no: 'JLM20260115001', uid: 6, total: 316, discount: 0, shipping: 0, actual: 316, paid: 316, rname: '赵小红', rphone: '13800006666', raddr: '广东省广州市天河区天河路123号', status: 3, pstatus: 1, pmethod: 'wechat', ptime: '2026-01-15 14:30:00', otime: '2026-01-15 14:00:00', stime: '2026-01-16 09:00:00', ctime: '2026-01-23 14:00:00', items: [{pid:4,name:'静莱美丝绒口红#01玫瑰红',price:98,qty:1,sub:98},{pid:5,name:'静莱美丝绒口红#02裸粉色',price:98,qty:1,sub:98},{pid:8,name:'静莱美身体乳200ml',price:118,qty:1,sub:118}]},
    { id: 7, no: 'JLM20260120001', uid: 11, total: 218, discount: 0, shipping: 0, actual: 218, paid: 218, rname: '胡玲玲', rphone: '13800011111', raddr: '四川省成都市锦江区春熙路111号', status: 3, pstatus: 1, pmethod: 'alipay', ptime: '2026-01-20 11:00:00', otime: '2026-01-20 10:30:00', stime: '2026-01-21 15:00:00', ctime: '2026-01-28 11:00:00', items: [{pid:2,name:'静莱美美白淡斑面霜50g',price:218,qty:1,sub:218}]},
    { id: 8, no: 'JLM20260202001', uid: 12, total: 436, discount: 0, shipping: 0, actual: 436, paid: 436, rname: '马天宇', rphone: '13800012222', raddr: '湖北省武汉市武昌区解放路222号', status: 3, pstatus: 1, pmethod: 'wechat', ptime: '2026-02-02 10:00:00', otime: '2026-02-02 09:30:00', stime: '2026-02-03 14:00:00', ctime: '2026-02-10 10:00:00', items: [{pid:1,name:'静莱美保湿精华液30ml',price:178,qty:1,sub:178},{pid:3,name:'静莱美修护眼霜15g',price:158,qty:1,sub:158},{pid:9,name:'静莱美洁面泡沫150ml',price:78,qty:1,sub:78}]},
    { id: 9, no: 'JLM20260208001', uid: 13, total: 524, discount: 0, shipping: 0, actual: 524, paid: 524, rname: '何美云', rphone: '13800013333', raddr: '湖南省长沙市岳麓区麓谷大道333号', status: 3, pstatus: 1, pmethod: 'wechat', ptime: '2026-02-08 14:30:00', otime: '2026-02-08 14:00:00', stime: '2026-02-09 09:00:00', ctime: '2026-02-16 14:00:00', items: [{pid:2,name:'静莱美美白淡斑面霜50g',price:218,qty:1,sub:218},{pid:6,name:'静莱美轻薄粉底液30ml',price:148,qty:1,sub:148},{pid:4,name:'静莱美丝绒口红#01玫瑰红',price:98,qty:1,sub:98}]},
    { id: 10, no: 'JLM20260215001', uid: 14, total: 256, discount: 0, shipping: 0, actual: 256, paid: 256, rname: '林小草', rphone: '13800014444', raddr: '陕西省西安市雁塔区高新路444号', status: 3, pstatus: 1, pmethod: 'alipay', ptime: '2026-02-15 10:00:00', otime: '2026-02-15 09:30:00', stime: '2026-02-16 14:00:00', ctime: '2026-02-23 10:00:00', items: [{pid:1,name:'静莱美保湿精华液30ml',price:178,qty:1,sub:178},{pid:9,name:'静莱美洁面泡沫150ml',price:78,qty:1,sub:78}]},
    { id: 11, no: 'JLM20260301001', uid: 15, total: 1164, discount: 50, shipping: 0, actual: 1114, paid: 1114, rname: '徐浩然', rphone: '13800015555', raddr: '江苏省南京市鼓楼区中山北路555号', status: 3, pstatus: 1, pmethod: 'wechat', ptime: '2026-03-01 10:00:00', otime: '2026-03-01 09:30:00', stime: '2026-03-02 14:00:00', ctime: '2026-03-09 10:00:00', items: [{pid:2,name:'静莱美美白淡斑面霜50g',price:218,qty:2,sub:436},{pid:7,name:'静莱美玫瑰香水50ml',price:278,qty:1,sub:278},{pid:1,name:'静莱美保湿精华液30ml',price:178,qty:2,sub:356}]},
    { id: 12, no: 'JLM20260310001', uid: 8, total: 436, discount: 0, shipping: 0, actual: 436, paid: 436, rname: '吴小静', rphone: '13800008888', raddr: '上海市浦东新区陆家嘴金融贸易区789号', status: 2, pstatus: 1, pmethod: 'wechat', ptime: '2026-03-10 14:30:00', otime: '2026-03-10 14:00:00', stime: '2026-03-11 10:00:00', ctime: null, items: [{pid:3,name:'静莱美修护眼霜15g',price:158,qty:1,sub:158},{pid:2,name:'静莱美美白淡斑面霜50g',price:218,qty:1,sub:218}]},
    { id: 13, no: 'JLM20260320001', uid: 10, total: 356, discount: 0, shipping: 0, actual: 356, paid: 356, rname: '孙晓峰', rphone: '13800010000', raddr: '浙江省杭州市西湖区文三路321号', status: 1, pstatus: 1, pmethod: 'wechat', ptime: '2026-03-20 10:00:00', otime: '2026-03-20 09:30:00', stime: null, ctime: null, items: [{pid:1,name:'静莱美保湿精华液30ml',price:178,qty:2,sub:356}]},
    { id: 14, no: 'JLM20260325001', uid: 6, total: 276, discount: 0, shipping: 0, actual: 276, paid: 0, rname: '赵小红', rphone: '13800006666', raddr: '广东省广州市天河区天河路123号', status: 0, pstatus: 0, pmethod: null, ptime: null, otime: '2026-03-25 15:00:00', stime: null, ctime: null, items: [{pid:6,name:'静莱美轻薄粉底液30ml',price:148,qty:1,sub:148},{pid:8,name:'静莱美身体乳200ml',price:118,qty:1,sub:118}]},
    { id: 15, no: 'JLM20260328001', uid: 12, total: 178, discount: 0, shipping: 0, actual: 178, paid: 178, rname: '马天宇', rphone: '13800012222', raddr: '湖北省武汉市武昌区解放路222号', status: 1, pstatus: 1, pmethod: 'alipay', ptime: '2026-03-28 10:00:00', otime: '2026-03-28 09:30:00', stime: null, ctime: null, items: [{pid:1,name:'静莱美保湿精华液30ml',price:178,qty:1,sub:178}]},
  ];

  ordersData.forEach(o => {
    insertOrder.run(
      o.id, o.no, o.uid, o.total, o.discount, o.shipping, o.actual, o.paid,
      o.rname, o.rphone, o.raddr, o.status, o.pstatus, o.pmethod, o.ptime,
      o.otime, o.stime, o.ctime
    );
    o.items.forEach(item => {
      insertItem.run(o.id, item.pid, item.name, item.price, item.qty, item.sub);
    });
  });
  console.log(`  ✅ ${ordersData.length} 笔订单 + 明细`);

  // ========== 收益记录（已完成订单自动生成）==========
  console.log('💰 初始化收益数据...');
  const completedOrders = ordersData.filter(o => o.status === 3);
  const insertCommission = db.prepare(`
    INSERT OR IGNORE INTO commissions
    (user_id, order_id, commission_type, commission_rate, order_amount, commission_amount,
     commission_status, settlement_time, source_user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  completedOrders.forEach(o => {
    // 直接销售佣金 10%
    insertCommission.run(o.uid, o.id, 1, 10, o.actual, parseFloat((o.actual * 0.10).toFixed(2)), 1,
      new Date(new Date(o.ctime).getTime() + 86400000).toISOString().replace('T', ' ').substring(0, 19), null);

    // 上级团队提成 5%（获取用户parent_id的简化处理）
    const parentMap = {6:3, 7:3, 8:4, 9:5, 10:5, 11:2, 12:1, 13:4, 14:3, 15:5};
    const parentId = parentMap[o.uid];
    if (parentId) {
      insertCommission.run(parentId, o.id, 2, 5, o.actual, parseFloat((o.actual * 0.05).toFixed(2)), 1,
        new Date(new Date(o.ctime).getTime() + 86400000).toISOString().replace('T', ' ').substring(0, 19), o.uid);
    }
  });
  console.log(`  ✅ ${completedOrders.length * 2} 条收益记录（含团队提成）`);

  // ========== 提现记录 ==========
  console.log('🏦 初始化提现记录...');
  const insertWithdrawal = db.prepare(`
    INSERT OR IGNORE INTO withdrawals
    (withdrawal_no, user_id, withdrawal_amount, service_fee, actual_amount,
     bank_name, bank_card_no, account_name, withdrawal_status, audit_user_id, audit_time, payment_time)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertWithdrawal.run('WD20260115001', 1, 5000.00, 25.00, 4975.00, '招商银行', '6214830000000001', '王美丽', 4, 1, '2026-01-15 10:00:00', '2026-01-15 15:00:00');
  insertWithdrawal.run('WD20260201001', 3, 2000.00, 10.00, 1990.00, '工商银行', '6222020000000003', '张晓燕', 4, 1, '2026-02-01 10:00:00', '2026-02-01 16:00:00');
  insertWithdrawal.run('WD20260215001', 5, 3000.00, 15.00, 2985.00, '建设银行', '6227000000000005', '刘芳芳', 4, 1, '2026-02-15 14:00:00', '2026-02-16 10:00:00');
  insertWithdrawal.run('WD20260301001', 2, 8000.00, 40.00, 7960.00, '中国银行', '6013820000000002', '李华成', 1, 1, '2026-03-01 10:00:00', null);
  insertWithdrawal.run('WD20260320001', 10, 1500.00, 7.50, 1492.50, '农业银行', '6228000000000010', '孙晓峰', 0, null, null, null);
  console.log('  ✅ 5 条提现记录');

  // ========== 商学院课程 ==========
  console.log('🎓 初始化商学院课程...');
  const insertCourse = db.prepare(`
    INSERT OR IGNORE INTO school_courses
    (id, course_type, course_title, course_subtitle, cover_image, content, required_time, difficulty_level, credit_points, status, sort_order, view_count, like_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
  `);
  // 课程类型: 1-学习视频, 2-学习书籍, 3-话术通关, 4-行动日志
  insertCourse.run(1, 1, '代理商入门必看：如何快速起步', '7天掌握销售核心技巧', null,
    '本课程专为新加入的代理商设计，涵盖产品知识、销售技巧、客户维护三大核心模块...', 45, 1, 10, 1, 1289, 456);
  insertCourse.run(2, 1, '朋友圈营销实战秘籍', '打造个人品牌，轻松引流获客', null,
    '学习如何通过朋友圈内容策略建立个人信任感，实现被动引流...', 60, 2, 15, 2, 986, 321);
  insertCourse.run(3, 1, '团队管理与激励技巧', '从个人代理到团队领袖的蜕变', null,
    '深度解析团队建设的5大核心：招募、培训、激励、考核、留存...', 90, 3, 20, 3, 756, 234);
  insertCourse.run(4, 2, '《从零到一：代理商成长手册》', '100+个实战案例，指导你走向成功', null,
    '本书汇集了50位优秀代理商的成功经验，涵盖创业初期、成长期、成熟期三个阶段...', 120, 2, 25, 4, 645, 198);
  insertCourse.run(5, 2, '《美妆行业深度报告2026》', '洞察市场趋势，把握商机', null,
    '最新美妆行业数据分析，深入了解消费趋势变化...', 60, 2, 15, 5, 432, 156);
  insertCourse.run(6, 3, '护肤品推荐话术100例', '精准表达产品价值，提升成交率', null,
    '收录100个经过实战验证的护肤品推荐话术，覆盖保湿、美白、抗老三大功效...', 30, 1, 10, 6, 1543, 567);
  insertCourse.run(7, 3, '异议处理话术大全', '化解客户疑虑，促成成交', null,
    '针对价格贵、效果不确定、已有其他品牌等常见异议的专业应对话术...', 40, 2, 15, 7, 1123, 423);
  insertCourse.run(8, 3, '朋友圈文案模板50套', '每日更新，高效触达客户', null,
    '节日营销、产品推广、客户案例、团队招募等分类模板，可直接套用...', 20, 1, 8, 8, 2345, 890);
  console.log('  ✅ 8 门课程（视频3+书籍2+话术3）');

  // ========== 学习进度 ==========
  console.log('📚 初始化学习进度数据...');
  const insertProgress = db.prepare(`
    INSERT OR IGNORE INTO study_progress
    (user_id, course_id, study_status, progress_percent, study_duration, exam_score, start_time, complete_time)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const progressData = [
    [6, 1, 2, 100, 2700, 92.5, '2026-01-05 10:00:00', '2026-01-05 10:45:00'],
    [6, 2, 2, 100, 3600, 88.0, '2026-01-10 14:00:00', '2026-01-10 15:00:00'],
    [6, 6, 2, 100, 1800, null, '2026-01-15 09:00:00', '2026-01-15 09:30:00'],
    [7, 1, 2, 100, 2700, 85.0, '2026-01-08 10:00:00', '2026-01-08 10:45:00'],
    [7, 6, 1, 65, 1200, null, '2026-02-01 10:00:00', null],
    [8, 1, 2, 100, 2700, 95.0, '2025-12-20 10:00:00', '2025-12-20 10:45:00'],
    [8, 2, 2, 100, 3600, 91.5, '2025-12-25 14:00:00', '2025-12-25 15:00:00'],
    [8, 3, 1, 45, 2400, null, '2026-02-10 10:00:00', null],
    [8, 4, 2, 100, 7200, 87.0, '2026-01-15 09:00:00', '2026-01-15 11:00:00'],
    [9, 1, 2, 100, 2700, 89.0, '2026-01-10 10:00:00', '2026-01-10 10:45:00'],
    [9, 6, 0, 0, 0, null, null, null],
    [10, 1, 2, 100, 2700, 96.5, '2025-11-01 10:00:00', '2025-11-01 10:45:00'],
    [10, 2, 2, 100, 3600, 94.0, '2025-11-05 14:00:00', '2025-11-05 15:00:00'],
    [10, 3, 2, 100, 5400, 88.5, '2025-11-10 09:00:00', '2025-11-10 10:30:00'],
    [10, 7, 2, 100, 2400, null, '2026-01-05 09:00:00', '2026-01-05 09:40:00'],
    [15, 1, 2, 100, 2700, 97.0, '2025-10-15 10:00:00', '2025-10-15 10:45:00'],
    [15, 2, 2, 100, 3600, 95.5, '2025-10-20 14:00:00', '2025-10-20 15:00:00'],
    [15, 3, 2, 100, 5400, 92.0, '2025-10-25 09:00:00', '2025-10-25 10:30:00'],
    [15, 4, 1, 70, 5040, null, '2026-02-01 09:00:00', null],
    [15, 5, 2, 100, 3600, null, '2026-02-15 14:00:00', '2026-02-15 15:00:00'],
  ];
  progressData.forEach(p => insertProgress.run(...p));
  console.log(`  ✅ ${progressData.length} 条学习进度记录`);

  // ========== 月度统计 ==========
  console.log('📊 初始化月度统计数据...');
  const insertStats = db.prepare(`
    INSERT OR IGNORE INTO monthly_statistics
    (user_id, statistic_month, sales_amount, commission_amount, order_count, new_members, active_members)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const statsData = [
    [1, '2026-01-01', 45680.00, 4568.00, 38, 3, 12],
    [1, '2026-02-01', 38920.00, 3892.00, 32, 2, 10],
    [1, '2026-03-01', 52340.00, 5234.00, 45, 4, 14],
    [2, '2026-01-01', 32560.00, 3256.00, 28, 2, 8],
    [2, '2026-02-01', 28900.00, 2890.00, 24, 1, 7],
    [2, '2026-03-01', 41200.00, 4120.00, 36, 3, 9],
    [3, '2026-01-01', 12400.00, 1240.00, 12, 1, 5],
    [3, '2026-02-01', 9800.00, 980.00, 9, 0, 4],
    [3, '2026-03-01', 15600.00, 1560.00, 14, 2, 6],
    [5, '2026-01-01', 18600.00, 1860.00, 16, 2, 6],
    [5, '2026-02-01', 14200.00, 1420.00, 12, 1, 5],
    [5, '2026-03-01', 21800.00, 2180.00, 19, 2, 7],
  ];
  statsData.forEach(s => insertStats.run(...s));
  console.log(`  ✅ ${statsData.length} 条月度统计数据`);

  console.log('\n✨ 所有种子数据初始化完成！\n');
});

seedAll();

// 输出统计
const userCount = db.prepare('SELECT COUNT(*) as cnt FROM users').get();
const orderCount = db.prepare('SELECT COUNT(*) as cnt FROM orders').get();
const productCount = db.prepare('SELECT COUNT(*) as cnt FROM products').get();
const commissionCount = db.prepare('SELECT COUNT(*) as cnt FROM commissions').get();

console.log('📊 数据库统计：');
console.log(`   用户数量: ${userCount.cnt}`);
console.log(`   商品数量: ${productCount.cnt}`);
console.log(`   订单数量: ${orderCount.cnt}`);
console.log(`   收益记录: ${commissionCount.cnt}`);
console.log(`\n📁 数据库位置: /Users/apple/WorkBuddy/20260324191412/database-server/data/jinglaimei.db\n`);

db.close();
