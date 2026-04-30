/**
 * 皮肤分析系统 - 数据库初始化 v1.0
 */
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/jinglaimei.db');

function init() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = OFF');

  console.log('[皮肤分析] 开始初始化表结构...');

  /* ========== 1. 皮肤问题库 ========== */
  db.exec(`
    CREATE TABLE IF NOT EXISTS skin_issues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL DEFAULT 'other',
      name TEXT NOT NULL,
      icon TEXT DEFAULT '⚠',
      color TEXT DEFAULT '#e94560',
      description TEXT DEFAULT '',
      severity_range TEXT DEFAULT '1-5',
      sort_order INTEGER DEFAULT 0,
      status INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  /* ========== 2. 成因话术库 ========== */
  db.exec(`
    CREATE TABLE IF NOT EXISTS skin_issue_causes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      issue_id INTEGER NOT NULL,
      cause_text TEXT NOT NULL DEFAULT '',
      ai_analysis_template TEXT DEFAULT '',
      advice_text TEXT DEFAULT '',
      is_ai_generated INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (issue_id) REFERENCES skin_issues(id)
    )
  `);

  /* ========== 3. 养护方案库 ========== */
  db.exec(`
    CREATE TABLE IF NOT EXISTS skin_care_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      issue_id INTEGER NOT NULL,
      care_type TEXT NOT NULL DEFAULT 'moisture',
      title TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      steps TEXT DEFAULT '[]',
      frequency TEXT DEFAULT '每日',
      duration TEXT DEFAULT '持续28天见效',
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (issue_id) REFERENCES skin_issues(id)
    )
  `);

  /* ========== 4. 产品匹配库 ========== */
  db.exec(`
    CREATE TABLE IF NOT EXISTS skin_products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      issue_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      match_reason TEXT DEFAULT '',
      priority INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (issue_id) REFERENCES skin_issues(id),
      FOREIGN KEY (product_id) REFERENCES products(id),
      UNIQUE(issue_id, product_id)
    )
  `);

  /* ========== 5. AI诊断报告 ========== */
  db.exec(`
    CREATE TABLE IF NOT EXISTS skin_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      agent_id INTEGER DEFAULT 0,
      image_url TEXT NOT NULL DEFAULT '',
      image_path TEXT DEFAULT '',
      skin_type TEXT DEFAULT 'unknown',
      skin_type_confidence REAL DEFAULT 0,
      ai_overview TEXT DEFAULT '',
      ai_cause_analysis TEXT DEFAULT '',
      ai_script TEXT DEFAULT '',
      ai_raw_response TEXT DEFAULT '',
      issue_count INTEGER DEFAULT 0,
      total_severity INTEGER DEFAULT 0,
      status TEXT DEFAULT 'completed',
      error_msg TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.exec(`CREATE INDEX IF NOT EXISTS idx_skin_reports_user ON skin_reports(user_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_skin_reports_agent ON skin_reports(agent_id)`);

  /* ========== 6. 报告-问题明细 ========== */
  db.exec(`
    CREATE TABLE IF NOT EXISTS skin_report_issues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id INTEGER NOT NULL,
      issue_id INTEGER NOT NULL,
      issue_name TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT '',
      severity INTEGER DEFAULT 1,
      confidence REAL DEFAULT 0,
      area TEXT DEFAULT '',
      description TEXT DEFAULT '',
      cause_text TEXT DEFAULT '',
      advice_text TEXT DEFAULT '',
      FOREIGN KEY (report_id) REFERENCES skin_reports(id) ON DELETE CASCADE,
      FOREIGN KEY (issue_id) REFERENCES skin_issues(id)
    )
  `);

  db.exec(`CREATE INDEX IF NOT EXISTS idx_report_issues_report ON skin_report_issues(report_id)`);

  /* ========== 种子数据：皮肤问题库 ========== */
  const issuesCount = db.prepare('SELECT COUNT(*) as c FROM skin_issues').get().c;
  
  if (issuesCount === 0) {
    console.log('[皮肤分析] 插入种子数据...');
    
    const insertIssue = db.prepare(`
      INSERT INTO skin_issues (category, name, icon, color, description, severity_range, sort_order) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const allIssues = [
      ['freckle', '雀斑', '🟤', '#8B4513', '面部褐色小斑点', '1-5', 1],
      ['sunspot', '晒斑', '☀️', '#D2691E', '日晒形成的色素沉着斑', '1-5', 2],
      ['pigmentation', '色沉', '🟫', '#A0522D', '炎症后色素沉着', '1-4', 3],
      ['melasma', '黄褐斑', '🔶', '#CD853F', '对称性黄褐色斑片', '2-5', 4],
      ['uneven', '肤色不均', '🎨', '#BC8F8F', '肤色明暗不均', '1-3', 5],
      ['comedone', '闭口粉刺', '⚪', '#DAA520', '毛孔堵塞形成小突起', '1-3', 10],
      ['blackhead', '黑头', '⚫', '#696969', '氧化变黑的开放性粉刺', '1-3', 11],
      ['acne_pustule', '红肿痘痘', '🔴', '#DC143C', '炎症性丘疹或脓疱', '2-5', 12],
      ['acne_mark_red', '红色痘印', '🩸', '#FF4500', '新生痘印血管扩张', '1-3', 13],
      ['acne_mark_dark', '黑色痘印', '⬛', '#8B0000', '陈旧性黑色素沉积', '1-4', 14],
      ['dry', '干燥缺水', '💧', '#4169E1', '紧绷起皮缺水', '1-5', 20],
      ['oily', '出油过多', '🛢️', '#FFD700', 'T区或全脸油光明显', '1-4', 21],
      ['sensitive', '敏感泛红', '😣', '#FF6347', '容易泛红发热刺痛', '1-5', 22],
      ['pore_large', '毛孔粗大', '🕳️', '#A9A9A9', '毛孔扩张尤其T区', '1-4', 23],
      ['fine_line', '细纹干纹', '〰️', '#9370DB', '眼周面部细小皱纹', '1-4', 24],
      ['rough', '粗糙不平', '🧱', '#808080', '触感粗糙不光滑', '1-3', 25],
    ];

    for (const iss of allIssues) {
      insertIssue.run(...iss);
    }

    const insertCause = db.prepare(`
      INSERT INTO skin_issue_causes (issue_id, cause_text, ai_analysis_template, advice_text, is_ai_generated)
      VALUES (?, ?, ?, ?, ?)
    `);

    const causes = [
      [1, '紫外线损伤导致黑色素细胞活跃', '', '注意防晒，使用SPF30以上防晒产品', 0],
      [2, '长期日晒未做防护措施', '', '每日防晒是预防晒斑的关键', 0],
      [3, '炎症后色素沉着（PIH）', '', '先抗炎再美白，避免挤压', 0],
      [4, '内分泌失调+紫外线协同作用', '', '规律作息+严格防晒+内调外养', 0],
      [5, '角质代谢不均+紫外线影响', '', '定期去角质+使用美白精华', 0],
      [10, '油脂分泌旺盛+毛囊口角化异常', '', '温和清洁+酸类疏通毛孔', 0],
      [11, '油脂氧化+清洁不到位', '', '定期深层清洁+泥膜吸附', 0],
      [12, '痤疮丙酸杆菌感染+炎症反应', '', '消炎抗菌+避免手挤', 0],
      [13, '炎症消退期血管尚未收缩', '', '抗炎修复+严格防晒', 0],
      [14, '炎症后黑色素沉积', '', '美白淡斑+抗氧化', 0],
      [20, '皮脂膜受损+环境湿度低', '', '加强保湿，选择含神经酰胺产品', 0],
      [21, '皮脂腺分泌过剩+内分泌因素', '', '控油清洁+水油平衡护理', 0],
      [22, '屏障功能受损+外界刺激敏感', '', '精简护肤+修复屏障', 0],
      [23, '油脂分泌+胶原蛋白流失', '', '控油+补充胶原蛋白', 0],
      [24, '胶原蛋白流失+表情肌运动', '', '抗皱保湿+眼部专项护理', 0],
      [25, '角质层代谢减缓+干燥堆积', '', '定期去角质+补水滋润', 0],
    ];
    
    for (const c of causes) {
      insertCause.run(...c);
    }

    console.log('[皮肤分析] ✅ 种子数据插入完成: ' + allIssues.length + '个问题');
  } else {
    console.log('[皮肤分析] 问题库已有 ' + issuesCount + ' 条记录');
  }

  console.log('[皮肤分析] 🎉 表结构初始化完成！');
}

try {
  init();
} catch (e) {
  console.error('[皮肤分析] 初始化失败:', e.message);
  process.exit(1);
}
