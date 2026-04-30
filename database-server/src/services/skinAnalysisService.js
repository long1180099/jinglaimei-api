// AI Skin Analysis Service
// Uses Qwen VL vision model for real image analysis
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { callQwenVL, parseJSON } = require('./deepseekService');

// 数据库路径（与 db.js 保持一致）
const DB_PATH = path.join(__dirname, '../../data/jinglaimei.db');

// 获取新的数据库连接（每次调用创建新连接，避免共享连接问题）
function getDb() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

// System prompt
const SKIN_ANALYSIS_SYSTEM_PROMPT = '你是玫小可品牌的首席AI皮肤顾问（非医疗机构人员）。最高优先级规则：你的身份是护肤品牌顾问，不是医生。绝对禁止使用医疗词汇（医院/就医/医生/激光/手术/药物等）。必须使用护肤语言（顽固性肌肤问题/科学护肤调理等）。宁可多报100个问题，不可遗漏1个。检测清单涵盖色素类/痘肌毛孔类/肤质状态/屏障受损/血管类/眼周/角质质地/衰老纹路/脱失类。目标发现8-15个问题，重度给4-5级。请返回JSON格式专业检测报告。';

// Convert image to base64
function imageToBase64(imagePath) {
  try {
    if (!imagePath || !fs.existsSync(imagePath)) {
      console.warn('[SkinAnalysis] Image file not found:', imagePath);
      return null;
    }
    const buffer = fs.readFileSync(imagePath);
    const ext = path.extname(imagePath).toLowerCase() || '.jpg';
    const mimeMap = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
    const mime = mimeMap[ext] || 'image/jpeg';
    const base64Str = buffer.toString('base64');
    console.log('[SkinAnalysis] base64 ok, size=' + buffer.length + ', mime=' + mime);
    return { mime, base64: base64Str };
  } catch (e) {
    console.error('[SkinAnalysis] Image to base64 failed:', e.message);
    return null;
  }
}

// Build multimodal message for Qwen VL
function buildMultimodalMessage(imageData) {
  if (!imageData || !imageData.base64) {
    console.warn('[SkinAnalysis] No image data, skipping real analysis');
    return null;
  }
  const imageUrl = 'data:' + imageData.mime + ';base64,' + imageData.base64;
  console.log('[SkinAnalysis] Multimodal msg built, urlLen=' + imageUrl.length + ', mime=' + imageData.mime);
  return [
    { type: 'text', text: '这是一张高清正面面部照片。你现在是Visia皮肤检测仪的专业模式。' },
    { type: 'image_url', image_url: { url: imageUrl } },
    { type: 'text', text: '[60种问题全扫描指令]请严格按A-I共9组顺序逐一检查：[A色素]颜色差异/斑块/痣类；[B痘痘]毛孔/硬块/囊肿/痘坑/疤痕；[C肤质]光泽/缺水/出油/泛红/毛孔/细纹；[D炎症]泛红/血管；[E血管]红血丝/蜘蛛痣/面色；[F眼周]黑眼圈/脂肪粒/汗管瘤；[G角质]鸡皮/鳞屑/隆起；[H衰老]皱纹/下垂/浮肿/眼袋；[I脱失]白斑。目标8-15个问题，重度4-5级。禁止医疗词汇！返回JSON格式报告。' }
  ];
}

// Normalize and save analysis result
function normalizeAnalysisResult(result, userId, agentId, imageUrl) {
  const db = getDb();
  try {
    // 兼容中英文 AI 返回字段
    const _ = (key, cnKey, fallback) => {
      return result[key] ?? result[cnKey] ?? fallback;
    };

    const skinType = _('skin_type', '肤质类型', 'unknown');
    const overallScore = _('overall_score', '综合评分', 0);
    const summary = _('summary', '综合建议', '');
    const recommendations = _('recommendations', '产品推荐', []);
    const aiOverview = _('ai_overview', '综合分析', summary) || summary;
    const causeAnalysis = _('cause_analysis', '成因分析', '');
    const detectionReport = _('detailed_report', '详细检测报告', {});
    const issueCount = result.issue_count ?? detectionReport?.总问题数 ?? result.总问题数 ?? 0;

    // 尝试提取 issues 列表（支持嵌套或平铺）
    let issues = result.issues || result.问题列表 || detectionReport?.问题列表 || [];
    if (!Array.isArray(issues)) issues = [];
    // 如果 issues 是中文对象数组，转成英文格式
    issues = issues.map((iss, idx) => ({
      issue_id: iss.issue_id || iss.issueId || iss.id || idx + 1,
      issue_name: iss.issue_name || iss.问题名称 || iss.name || '',
      category: iss.category || iss.类别 || '',
      severity: iss.severity || iss.严重等级 || 3,
      description: iss.description || iss.描述 || '',
    }));

    const insertReport = db.prepare(
      `INSERT INTO skin_reports (user_id, agent_id, image_url, skin_type, skin_type_confidence, ai_overview, ai_cause_analysis, ai_script, ai_raw_response, issue_count, total_severity, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    );
    const insertIssue = db.prepare(
      'INSERT INTO skin_report_issues (report_id, issue_id, severity, description) VALUES (?, ?, ?, ?)'
    );
    const stmtResult = insertReport.run(
      userId, agentId, imageUrl || '', skinType,
      _('skin_type_confidence', '肤质置信度', 0),
      aiOverview,
      causeAnalysis,
      JSON.stringify(Array.isArray(recommendations) ? recommendations : []),
      JSON.stringify(result),
      issues.length,
      typeof overallScore === 'number' ? overallScore : 0,
      'completed'
    );
    const reportId = stmtResult.lastInsertRowid;

    if (issues.length > 0) {
      const insertIssue = db.prepare(
        'INSERT INTO skin_report_issues (report_id, issue_id, severity, description) VALUES (?, ?, ?, ?)'
      );
      for (const issue of issues) {
        insertIssue.run(reportId, issue.issue_id, issue.severity, issue.description || '');
      }
    }

    return { reportId, skin_type: skinType, overall_score: overallScore, summary, issues, ...result };
  } finally {
    db.close();
  }
}

// Fallback when AI fails
function generateFallbackReport(userId, agentId, imageUrl) {
  const result = {
    skin_type: '待分析',
    overall_score: 0,
    summary: '皮肤分析服务繁忙，请稍后再试',
    recommendations: [],
    issues: [],
    fake: true
  };
  return normalizeAnalysisResult(result, userId, agentId, imageUrl);
}

// Core analysis function
async function analyzeSkin(options) {
  const { userId, agentId, imagePath, imageUrl } = options;
  if (!imageUrl && !imagePath) {
    throw new Error('Missing image info');
  }
  try {
    const imageData = imageToBase64(imagePath);
    if (!imageData) {
      throw new Error('Image file read failed');
    }
    const userContent = buildMultimodalMessage(imageData);
    if (!userContent) {
      throw new Error('Cannot build analysis request');
    }
    const messages = [
      { role: 'system', content: SKIN_ANALYSIS_SYSTEM_PROMPT },
      { role: 'user', content: userContent }
    ];
    console.log('[SkinAnalysis] Sending to QwenVL... imgSize=' + imageData.base64.length + ' chars');
    const rawResponse = await callQwenVL(messages, {
      temperature: 0.6,
      max_tokens: 3000,
      model: 'qwen-vl-max',
      timeout: 120000,
    });
    console.log('[SkinAnalysis] QwenVL response, len=' + rawResponse.length);
    const result = parseJSON(rawResponse);
    return normalizeAnalysisResult(result, userId, agentId, imageUrl);
  } catch (err) {
    console.error('[SkinAnalysis] Analysis failed:', err.message);
    return generateFallbackReport(userId, agentId, imageUrl);
  }
}

// DB helper functions
function getSkinIssues() {
  const db = getDb();
  try {
    return db.prepare('SELECT * FROM skin_issues WHERE status = 1 ORDER BY category, id').all() || [];
  } finally {
    db.close();
  }
}

function getMatchedProducts(issueId) {
  if (!issueId) return [];
  const db = getDb();
  try {
    return db.prepare(
      'SELECT sp.*, p.product_name, p.retail_price, p.image as product_image FROM skin_products sp LEFT JOIN products p ON sp.product_id = p.id WHERE sp.issue_id = ? ORDER BY sp.priority DESC'
    ).all(issueId) || [];
  } finally {
    db.close();
  }
}

function saveSkinReport(report) {
  const db = getDb();
  try {
    const insertReport = db.prepare(
      `INSERT INTO skin_reports (user_id, agent_id, image_url, skin_type, skin_type_confidence, ai_overview, ai_cause_analysis, ai_script, ai_raw_response, issue_count, total_severity, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    );
    const stmtResult = insertReport.run(
      report.userId, report.agentId, report.imageUrl || '', report.skinType || 'unknown',
      report.skinTypeConfidence || 0,
      report.summary || '',
      report.causeAnalysis || '',
      JSON.stringify(report.recommendations || []),
      JSON.stringify(report),
      (report.issues || []).length,
      report.overallScore || 0,
      'completed'
    );
    const reportId = stmtResult.lastInsertRowid;
    if (report.issues && report.issues.length > 0) {
      const insertIssue = db.prepare(
        'INSERT INTO skin_report_issues (report_id, issue_id, severity, description) VALUES (?, ?, ?, ?)'
      );
      for (const issue of report.issues) {
        insertIssue.run(reportId, issue.issue_id || issue.issueId, issue.severity, issue.description || '');
      }
    }
    return reportId;
  } finally {
    db.close();
  }
}

function getSkinReport(reportId) {
  const db = getDb();
  try {
    const report = db.prepare('SELECT * FROM skin_reports WHERE id = ?').get(reportId);
    if (!report) return null;
    report.issues = db.prepare(
      'SELECT sr.*, si.issue_name, si.category FROM skin_report_issues sr JOIN skin_issues si ON sr.issue_id = si.id WHERE sr.report_id = ?'
    ).all(reportId) || [];
    return report;
  } finally {
    db.close();
  }
}

function getUserSkinReports(userId, page, pageSize) {
  const db = getDb();
  try {
    const offset = (page - 1) * pageSize;
    const list = db.prepare(
      'SELECT * FROM skin_reports WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).all(userId, pageSize, offset) || [];
    const total = db.prepare(
      'SELECT COUNT(*) as count FROM skin_reports WHERE user_id = ?'
    ).get(userId);
    return { list, total: total ? total.count : 0 };
  } finally {
    db.close();
  }
}

function getAgentSkinStats(agentId) {
  const db = getDb();
  try {
    const stats = db.prepare(
      'SELECT COUNT(*) as total_reports, COUNT(DISTINCT user_id) as unique_users FROM skin_reports WHERE agent_id = ?'
    ).get(agentId) || { total_reports: 0, unique_users: 0 };
    const issueDist = db.prepare(
      'SELECT si.category, COUNT(*) as count FROM skin_report_issues sri JOIN skin_reports sr ON sri.report_id = sr.id JOIN skin_issues si ON sri.issue_id = si.id WHERE sr.agent_id = ? GROUP BY si.category'
    ).all(agentId) || [];
    return { stats, issueDist };
  } finally {
    db.close();
  }
}

function getIssueDetail(issueId) {
  const db = getDb();
  try {
    const issue = db.prepare('SELECT * FROM skin_issues WHERE id = ? AND status = 1').get(issueId);
    if (!issue) return null;
    const causes = db.prepare('SELECT * FROM skin_issue_causes WHERE issue_id = ?').all(issueId) || [];
    const products = db.prepare(
      'SELECT sp.*, p.product_name, p.retail_price, p.image as product_image FROM skin_products sp LEFT JOIN products p ON sp.product_id = p.id WHERE sp.issue_id = ?'
    ).all(issueId) || [];
    return { ...issue, causes, products };
  } finally {
    db.close();
  }
}

module.exports = { analyzeSkin, imageToBase64, getSkinIssues, getMatchedProducts, saveSkinReport, getSkinReport, getUserSkinReports, getAgentSkinStats, getIssueDetail };
