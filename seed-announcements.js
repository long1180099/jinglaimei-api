/**
 * 插入公告种子数据
 */
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database-server/data/jinglaimei.db');
const db = new Database(dbPath);

// 创建表
db.exec(`
  CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    summary TEXT DEFAULT '',
    category TEXT DEFAULT 'notice',
    cover_url TEXT DEFAULT '',
    author TEXT DEFAULT '管理员',
    is_top INTEGER DEFAULT 0,
    status INTEGER DEFAULT 1,
    view_count INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    published_at TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime'))
  );
`);

// 检查是否已有数据
const existing = db.prepare('SELECT COUNT(*) as cnt FROM announcements').get().cnt;
if (existing > 0) {
  console.log(`公告表已有 ${existing} 条数据，跳过种子数据插入`);
  process.exit(0);
}

// 种子数据
const seeds = [
  {
    title: '静莱美2026春季新品发布通知',
    content: '各位代理商伙伴，大家好！\n\n静莱美2026春季新品已正式发布，本次新品涵盖护肤、彩妆两大系列，共12款新品。\n\n【护肤系列】\n1. 玫瑰焕颜精华液 —— 蕴含大马士革玫瑰精华，深层滋养\n2. 玻尿酸补水面膜 —— 三重玻尿酸，补水锁水48小时\n3. 胶原蛋白紧致眼霜 —— 淡化细纹，紧致眼周\n4. 神经酰胺修护乳 —— 修复肌肤屏障，温和不刺激\n\n【彩妆系列】\n1. 持久雾感唇釉 —— 12色可选，一抹定色持久不脱\n2. 光感气垫BB —— 遮瑕提亮，轻薄透气\n3. 眉笔三件套 —— 眉笔+眉粉+眉刷，打造自然立体眉\n\n新品价格已更新至系统，请各位代理商及时查看。首批进货享受8折优惠，活动截止至4月15日。\n\n如有疑问请联系区域负责人。',
    summary: '2026春季新品发布，护肤彩妆12款新品上市',
    category: 'notice',
    author: '静莱美总部',
    is_top: 1,
    status: 1,
    sort_order: 100,
    published_at: '2026-03-28',
    view_count: 328
  },
  {
    title: '4月代理商培训计划安排',
    content: '为帮助各位代理商提升业务能力，公司将于4月开展系列培训课程：\n\n【第1周】4月3日-4月7日\n主题：新品知识培训\n内容：春季新品成分解析、功效说明、使用方法、搭配推荐\n形式：线上直播（每晚20:00-21:30）\n\n【第2周】4月10日-4月14日\n主题：销售技巧提升\n内容：客户沟通技巧、异议处理方法、逼单话术实战\n形式：线上直播+分组演练\n\n【第3周】4月17日-4月21日\n主题：团队管理进阶\n内容：如何发展下级代理、团队激励策略、业绩倍增方法\n形式：线上直播\n\n【第4周】4月24日-4月28日\n主题：品牌运营实战\n内容：朋友圈营销技巧、短视频拍摄剪辑、社群运营策略\n形式：线上直播+作业打卡\n\n培训地点：静莱美商学院直播间\n培训费用：免费\n参与方式：登录小程序-商学院-培训课程\n\n请各位代理商提前安排时间，积极参与培训！',
    summary: '4月代理商系列培训，涵盖新品知识、销售技巧、团队管理、品牌运营',
    category: 'activity',
    author: '培训部',
    is_top: 1,
    status: 1,
    sort_order: 90,
    published_at: '2026-03-30',
    view_count: 256
  },
  {
    title: '系统升级通知：库存管理功能优化',
    content: '各位代理商：\n\n为提升使用体验，系统将于4月1日凌晨2:00-5:00进行升级维护。\n\n【升级内容】\n1. 库存管理功能优化，支持多仓库管理\n2. 订单处理速度提升，预计提升50%\n3. 新增批量导出功能，支持Excel导出订单数据\n4. 收益报表优化，新增月度对比图表\n5. 修复已知bug若干\n\n【注意事项】\n- 升级期间系统将暂停服务，请提前完成紧急订单处理\n- 升级完成后数据自动同步，无需手动操作\n- 如升级后遇到问题，请联系技术支持\n\n感谢大家的理解与支持！',
    summary: '4月1日系统升级，新增多仓库管理、批量导出等功能',
    category: 'update',
    author: '技术部',
    is_top: 0,
    status: 1,
    sort_order: 80,
    published_at: '2026-03-31',
    view_count: 189
  },
  {
    title: '2026年Q2代理商激励政策',
    content: '为进一步激励各位代理商的积极性，公司特制定Q2季度激励政策：\n\n【业绩激励】\n- 季度销售额达到5万元：奖励现金1000元\n- 季度销售额达到10万元：奖励现金3000元+精美礼包\n- 季度销售额达到20万元：奖励现金8000元+高端护肤套盒\n- 季度销售额达到50万元：奖励现金20000元+海外游名额1个\n\n【团队激励】\n- 新发展代理商5人以上：额外奖励500元\n- 团队月均业绩增长20%以上：额外奖励1000元\n\n【学习激励】\n- 完成所有培训课程并通过考核：奖励200积分\n- 学分累计达500分：晋升一级代理资格\n\n【活动时间】\n2026年4月1日 - 2026年6月30日\n\n详细规则请咨询区域负责人或查看商学院-政策专区。',
    summary: 'Q2季度激励政策：业绩奖励、团队奖励、学习奖励',
    category: 'policy',
    author: '运营部',
    is_top: 0,
    status: 1,
    sort_order: 70,
    published_at: '2026-03-25',
    view_count: 412
  },
  {
    title: '3月优秀代理商表彰公告',
    content: '热烈祝贺以下代理商在3月取得优异成绩！\n\n【月度销售冠军】\n🏆 张晓慧 —— 月销售额：58,600元\n\n【月度团队冠军】\n🏆 李美琪 —— 团队业绩：126,000元（团队15人）\n\n【最佳新人奖】\n🌟 王小雨 —— 入驻首月销售额突破20,000元\n\n【学习达人奖】\n📚 陈思思 —— 完成全部12门培训课程\n\n【最佳服务奖】\n💝 刘婷婷 —— 客户好评率100%，零投诉\n\n恭喜以上获奖的代理商伙伴！公司将为获奖者发放荣誉证书及对应奖励。\n\n希望所有代理商伙伴向优秀看齐，4月再创佳绩！',
    summary: '3月优秀代理商表彰：销售冠军、团队冠军、最佳新人等奖项',
    category: 'notice',
    author: '静莱美总部',
    is_top: 0,
    status: 1,
    sort_order: 60,
    published_at: '2026-03-29',
    view_count: 536
  }
];

// 插入种子数据
const insert = db.prepare(`
  INSERT INTO announcements (title, content, summary, category, cover_url, author, is_top, status, sort_order, published_at, view_count, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now','localtime'))
`);

const insertMany = db.transaction((items) => {
  for (const item of items) {
    insert.run(
      item.title, item.content, item.summary, item.category,
      item.cover_url || '', item.author, item.is_top, item.status,
      item.sort_order, item.published_at, item.view_count
    );
  }
});

insertMany(seeds);
console.log(`成功插入 ${seeds.length} 条公告种子数据`);

// 验证
const count = db.prepare('SELECT COUNT(*) as cnt FROM announcements').get().cnt;
console.log(`公告表当前数据量: ${count}`);

db.close();
