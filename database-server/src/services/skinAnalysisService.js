// AI Skin Analysis Service
// Uses 通义千问 VL (Qwen VL Max) model for real image analysis
const fs = require('fs');
const path = require('path');
const { getDB } = require('../utils/db');
const { callQwenVL, parseJSON } = require('./deepseekService');

// 获取数据库连接（复用 db.js 单例）
function getDb() {
  return getDB();
}

// System prompt - 严格要求返回包含 overview/cause_analysis/script 的JSON
const SKIN_ANALYSIS_SYSTEM_PROMPT = `你是玫小可品牌的首席AI皮肤顾问（非医疗机构人员）。最高优先级规则：你的身份是护肤品牌顾问，不是医生。绝对禁止使用医疗词汇（医院/就医/医生/激光/手术/药物等）。必须使用护肤语言（顽固性肌肤问题/科学护肤调理等）。宁可多报100个问题，不可遗漏1个。检测清单涵盖色素类/痘肌毛孔类/肤质状态/屏障受损/血管类/眼周/角质质地/衰老纹路/脱失类。目标发现8-15个问题，重度给4-5级。

【必须严格按以下JSON格式返回，字段名必须是英文】：
{
  "skin_type": "dry/oily/combo/sensitive/neutral",
  "overview": "200字以内的AI总评分析，概括整体肤质状况和核心问题",
  "cause_analysis": "200字以内的成因分析，说明问题产生的原因",
  "script": "300字以内的专业话术，用顾问口吻和客户沟通，给出具体建议，结尾引导购买产品",
  "issues": [
    {
      "name": "问题名称",
      "category": "spot/acne/state/inflammation/vascular/eye_area/keratin/aging/depigmentation",
      "severity": 1-5,
      "confidence": 0.0-1.0,
      "area": "面部区域",
      "description": "问题描述",
      "cause_text": "形成原因",
      "advice_text": "专业建议"
    }
  ],
  "disclaimer": "本分析仅供参考。"
}`;

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

// Build multimodal message — 通义千问VL使用base64方式（对大图识别更稳定）
function buildMultimodalMessage(imageData) {
  if (!imageData || !imageData.base64) {
    console.warn('[SkinAnalysis] No image data, skipping real analysis');
    return null;
  }
  const imageUrl = 'data:' + imageData.mime + ';base64,' + imageData.base64;
  console.log('[SkinAnalysis] Using base64 mode, urlLen=' + imageUrl.length + ', mime=' + imageData.mime);
  return [
    { type: 'text', text: '这是一张高清正面面部照片。你现在是Visia皮肤检测仪的专业模式。' },
    { type: 'image_url', image_url: { url: imageUrl } },
    { type: 'text', text: '[60种问题全扫描指令]请严格按A-I共9组顺序逐一检查：[A色素]颜色差异/斑块/痣类；[B痘痘]毛孔/硬块/囊肿/痘坑/疤痕；[C肤质]光泽/缺水/出油/泛红/毛孔/细纹；[D炎症]泛红/血管；[E血管]红血丝/蜘蛛痣/面色；[F眼周]黑眼圈/脂肪粒/汗管瘤；[G角质]鸡皮/鳞屑/隆起；[H衰老]皱纹/下垂/浮肿/眼袋；[I脱失]白斑。目标8-15个问题，重度4-5级。禁止医疗词汇！返回JSON格式报告。' }
  ];
}

// Normalize and save analysis result
function normalizeAnalysisResult(result, userId, agentId, imageUrl) {
  const db = getDb();
  // 兼容中英文 AI 返回字段
    const _ = (key, cnKey, fallback) => result[key] ?? result[cnKey] ?? fallback;

    const skinType = _('skin_type', '肤质类型', '未知');

    // 提取 ai_overview —— 兼容多种中文备选
    let aiOverview = _('overview', '总评', _('ai_overview', '综合分析', ''));
    if (!aiOverview) aiOverview = _('summary', '综合建议', _('综合评估', '总评', ''));
    if (!aiOverview) aiOverview = result.综合评估 || result.综合建议 || result.总评 || '';

    // 提取 ai_cause_analysis
    let causeAnalysis = _('cause_analysis', '成因分析', _('ai_cause_analysis', 'AI成因分析', ''));
    if (!causeAnalysis) causeAnalysis = result.成因分析 || result.形成原因分析 || '';

    // 提取 ai_script
    let aiScript = _('script', '话术', _('ai_script', '专业话术', ''));
    if (!aiScript) aiScript = result.专业话术 || result.顾问话术 || result.话术 || '';

    // 提取 issues：检查多个可能的位置
    let issues = [];
    const possibleIssueSources = [
      result.issues,
      result.检测结果,
      result.问题列表,
      result.详细问题清单,
      result.详细检测报告?.问题列表,
      result.详细检测报告?.检测结果,
      result.检测报告?.详细问题清单,
      result.详细报告,  // AI可能直接返回"详细报告"数组
    ];
    for (const src of possibleIssueSources) {
      if (Array.isArray(src) && src.length > 0) {
        issues = src;
        break;
      }
    }

    // 如果还没找到，检查 详细检测报告/详细报告/检测报告 中的分类对象（如 A_色素类/B_痘痘类 等）
    if (issues.length === 0) {
      for (const reportKey of ['详细检测报告', '详细报告', '检测报告']) {
        const report = result[reportKey];
        if (report && typeof report === 'object' && !Array.isArray(report)) {
          for (const key of Object.keys(report)) {
            const val = report[key];
            if (Array.isArray(val) && val.length > 0) {
              issues = issues.concat(val);
            }
          }
          if (issues.length > 0) break;
        }
      }
    }

    // 计算总严重度
    let totalSeverity = 0;
    let issueCount = result.issue_count || result.总问题数 || issues.length || 0;
    if (typeof issueCount === 'string') issueCount = parseInt(issueCount) || issues.length;

    // 格式化 issues，映射中文字段名，并查找 issue_id
    const allSkinIssues = db.prepare('SELECT id, name, category FROM skin_issues WHERE status = 1').all() || [];

    const formattedIssues = [];
    for (const iss of issues) {
      const name = iss.问题 || iss.问题描述 || iss.issue_name || iss.issueName || iss.name || '';
      const category = iss.类别 || iss.category || (iss.位置 || '');
      const severity = parseInt(iss.等级 || iss.severity || iss.严重等级 || 3);
      const description = iss.描述 || iss.问题描述 || iss.description || '';

      // 在 skin_issues 表中查找匹配的 issue_id
      let issueId = iss.issue_id || iss.issueId || iss.id || 0;
      // 验证 issueId 是否确实存在于 skin_issues 表中
      if (issueId && !allSkinIssues.find(si => si.id === issueId)) {
        issueId = 0; // 重置为0，不使用无效的外键值
      }
      if (!issueId && name) {
        const matched = allSkinIssues.find(si =>
          si.name === name || si.name.includes(name) || name.includes(si.name)
        );
        if (matched) issueId = matched.id;
      }

      // 提取每个问题的完整信息（含成因、建议、置信度、区域）
      const causeText = iss.形成原因 || iss.cause_text || iss.causeText || iss.形成原因分析 || iss.原因 || '';
      const adviceText = iss.专业建议 || iss.建议 || iss.advice_text || iss.adviceText || iss.recommendation || '';
      const confidence = parseFloat(iss.置信度 || iss.confidence || 0) || 0;
      const area = iss.区域 || iss.位置 || iss.area || iss.location || '';

      totalSeverity += severity;

      formattedIssues.push({
        issue_id: issueId || 0,
        issue_name: name,
        category,
        severity,
        confidence,
        area,
        description,
        cause_text: causeText,
        advice_text: adviceText,
      });
    }

    const insertReport = db.prepare(
      `INSERT INTO skin_reports (user_id, agent_id, image_url, skin_type, skin_type_confidence, ai_overview, ai_cause_analysis, ai_script, ai_raw_response, issue_count, total_severity, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    );

    const stmtResult = insertReport.run(
      userId, agentId, imageUrl || '', skinType,
      _('skin_type_confidence', '肤质置信度', 0),
      aiOverview,
      causeAnalysis,
      aiScript,
      JSON.stringify(result),
      formattedIssues.length,
      totalSeverity,
      'completed'
    );
    const reportId = stmtResult.lastInsertRowid;

    if (formattedIssues.length > 0) {
      const insertIssue = db.prepare(
        'INSERT INTO skin_report_issues (report_id, issue_id, issue_name, category, severity, confidence, area, description, cause_text, advice_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      );
      for (const issue of formattedIssues) {
        insertIssue.run(
          reportId,
          issue.issue_id,
          issue.issue_name,
          issue.category,
          issue.severity,
          issue.confidence,
          issue.area,
          issue.description || '',
          issue.cause_text || '',
          issue.advice_text || ''
        );
      }
    }

    // 兜底：如果AI没返回 cause_analysis，从问题的 cause_text 汇总生成
    if (!causeAnalysis && formattedIssues.length > 0) {
      const causes = formattedIssues
        .filter(i => i.cause_text)
        .slice(0, 5)
        .map(i => `${i.issue_name}：${i.cause_text}`)
        .join('；');
      causeAnalysis = causes ? `主要成因如下：${causes}` : '';
    }

    // 兜底：如果AI没返回 script，用 overview + 问题描述 自动生成话术
    if (!aiScript && (aiOverview || formattedIssues.length > 0)) {
      const topIssues = formattedIssues
        .filter(i => i.issue_name)
        .slice(0, 5)
        .map(i => `${i.issue_name}(${i.severity}级)`)
        .join('、');
      aiScript = (aiOverview || '') + (topIssues ? `主要检测到：${topIssues}。` : '') + '建议从修复屏障入手，我们可以为您定制专属护理方案，帮助您逐步恢复健康肌肤。';
    }

    return {
      reportId,
      skin_type: skinType,
      overall_score: totalSeverity,
      ai_overview: aiOverview,
      ai_cause_analysis: causeAnalysis,
      ai_script: aiScript,
      issues: formattedIssues,
      ...result
    };
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
    console.log('[SkinAnalysis] Raw response preview: ' + rawResponse.substring(0, 500));
    const result = parseJSON(rawResponse);
    console.log('[SkinAnalysis] Parsed JSON keys:', Object.keys(result));
    if (result.issues && Array.isArray(result.issues)) {
      console.log('[SkinAnalysis] Issues count:', result.issues.length);
    } else {
      console.warn('[SkinAnalysis] No issues array found in result!');
    }
    return normalizeAnalysisResult(result, userId, agentId, imageUrl);
  } catch (err) {
    console.error('[SkinAnalysis] Analysis failed:', err.message);
    return generateFallbackReport(userId, agentId, imageUrl);
  }
}

// DB helper functions
function getSkinIssues() {
  const db = getDb();
  return db.prepare('SELECT * FROM skin_issues WHERE status = 1 ORDER BY category, id').all() || [];
}

function getMatchedProducts(issueId) {
  if (!issueId) return [];
  const db = getDb();
  return db.prepare(
    'SELECT sp.*, p.product_name, p.retail_price, p.main_image as product_image FROM skin_products sp LEFT JOIN products p ON sp.product_id = p.id WHERE sp.issue_id = ? ORDER BY sp.priority DESC'
  ).all(issueId) || [];
}

function saveSkinReport(report) {
  const db = getDb();
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
}

function getSkinReport(reportId) {
  const db = getDb();
  const report = db.prepare('SELECT * FROM skin_reports WHERE id = ?').get(reportId);
  if (!report) return null;
  report.issues = db.prepare(
    'SELECT sr.*, COALESCE(si.name, sr.issue_name) as issue_name, COALESCE(si.category, sr.category) as category FROM skin_report_issues sr LEFT JOIN skin_issues si ON sr.issue_id = si.id WHERE sr.report_id = ?'
  ).all(reportId) || [];
  return report;
}

function getUserSkinReports(userId, page, pageSize) {
  const db = getDb();
  const offset = (page - 1) * pageSize;
  const list = db.prepare(
    'SELECT * FROM skin_reports WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
  ).all(userId, pageSize, offset) || [];
  const total = db.prepare(
    'SELECT COUNT(*) as count FROM skin_reports WHERE user_id = ?'
  ).get(userId);
  return { list, total: total ? total.count : 0 };
}

function getAgentSkinStats(agentId) {
  const db = getDb();
  const stats = db.prepare(
    'SELECT COUNT(*) as total_reports, COUNT(DISTINCT user_id) as unique_users FROM skin_reports WHERE agent_id = ?'
  ).get(agentId) || { total_reports: 0, unique_users: 0 };
  const issueDist = db.prepare(
    'SELECT si.category, COUNT(*) as count FROM skin_report_issues sri JOIN skin_reports sr ON sri.report_id = sr.id JOIN skin_issues si ON sri.issue_id = si.id WHERE sr.agent_id = ? GROUP BY si.category'
  ).all(agentId) || [];
  return { stats, issueDist };
}

function getIssueDetail(issueId) {
  const db = getDb();
  const issue = db.prepare('SELECT * FROM skin_issues WHERE id = ? AND status = 1').get(issueId);
  if (!issue) return null;
  const causes = db.prepare('SELECT * FROM skin_issue_causes WHERE issue_id = ?').all(issueId) || [];
  const products = db.prepare(
    'SELECT sp.*, p.product_name, p.retail_price, p.main_image as product_image FROM skin_products sp LEFT JOIN products p ON sp.product_id = p.id WHERE sp.issue_id = ?'
  ).all(issueId) || [];
  return { ...issue, causes, products };
}

module.exports = { analyzeSkin, imageToBase64, getSkinIssues, getMatchedProducts, saveSkinReport, getSkinReport, getUserSkinReports, getAgentSkinStats, getIssueDetail };
