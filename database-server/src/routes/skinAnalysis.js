/**
 * AI 皮肤分析 API 路由
 * /api/mp/skin-analysis/*
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const skinAnalysisService = require('../services/skinAnalysisService');

const DB_PATH = path.join(__dirname, '../../data/jinglaimei.db');

function getDb() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = OFF');
  return db;
}

// 配置文件上传（皮肤分析图片）
const uploadDir = path.join(__dirname, '../../data/uploads/skin-analysis');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `skin_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  }
});

/**
 * POST /api/mp/skin-analysis/analyze
 * 上传图片并执行AI皮肤分析
 * 
 * 请求：
 * - multipart/form-data: image(文件) + user_id
 * 
 * 响应：
 * - report: 完整分析报告
 */
router.post('/analyze', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.json({ success: false, error: '请上传面部照片' });
    }

    const userId = parseInt(req.body.user_id || req.body.userId || '0');
    if (!userId) {
      // 删除已上传的文件
      try { fs.unlinkSync(req.file.path); } catch(e) {}
      return res.json({ success: false, error: '请先登录' });
    }

    // 获取用户信息（含agent信息）
    const db = getDb();
    const user = db.prepare('SELECT id, parent_id FROM users WHERE id = ?').get(userId);
    
    // 构建图片URL（返回给小程序）
    const imageUrl = `/uploads/skin-analysis/${req.file.filename}`;

    console.log(`[皮肤分析] ✅ 收到请求! 用户=${userId} 图片=${req.file.filename} 大小=${req.file.size}`);

    // 执行AI分析（异步，可能需要几秒）
    console.log('[皮肤分析] ⏳ 调用AI分析服务...');
    const analysisResult = await skinAnalysisService.analyzeSkin({
      userId,
      agentId: user?.parent_id || 0,
      imagePath: req.file.path,
      imageUrl,
    });
    console.log(`[皮肤分析] AI分析完成! status=${analysisResult.status} issues=${analysisResult.issue_count || (analysisResult.issues||[]).length}`);

    // 返回完整报告（analyzeSkin内部已保存到数据库）
    const reportId = analysisResult.reportId;
    console.log(`[皮肤分析] 报告已保存, ID=${reportId}`);

    // 返回完整报告
    const responseData = {
      success: true,
      data: {
        ...analysisResult,
        id: reportId,
      },
    };
    console.log(`[皮肤分析] 📤 返回前端! keys=`, Object.keys(responseData.data));
    res.json(responseData);

  } catch (err) {
    console.error('[皮肤分析] 分析接口错误:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    // 注意：不要在这里关闭db，因为saveReport已经用了它
  }
});

/**
 * GET /api/mp/skin-analysis/reports?user_id=&page=&pageSize=
 * 获取用户历史报告列表
 */
router.get('/reports', (req, res) => {
  try {
    const db = getDb();
    const userId = parseInt(req.query.user_id);
    const page = parseInt(req.query.page || '1');
    const pageSize = parseInt(req.query.pageSize || '10');

    if (!userId) {
      return res.json({ success: false, error: '缺少user_id参数' });
    }

    const result = skinAnalysisService.getUserSkinReports(userId, page, pageSize);
    res.json({ success: true, data: result });

  } catch (err) {
    console.error('[皮肤分析] 获取报告列表失败:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/mp/skin-analysis/report/:id
 * 获取报告详情
 */
router.get('/report/:id', (req, res) => {
  try {
    const db = getDb();
    const reportId = parseInt(req.params.id);

    const result = skinAnalysisService.getSkinReport(reportId);
    
    if (!result) {
      return res.status(404).json({ success: false, error: '报告不存在' });
    }

    res.json({ success: true, data: result });

  } catch (err) {
    console.error('[皮肤分析] 获取报告详情失败:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/mp/skin-analysis/issues
 * 获取皮肤问题库（供前端展示）
 */
router.get('/issues', (req, res) => {
  try {
    const db = getDb();
    const issues = skinAnalysisService.getSkinIssues();
    res.json({ success: true, data: issues });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/mp/skin-analysis/issue/:id/detail
 * 获取问题详情（含成因+养护方案+产品推荐）
 */
router.get('/issue/:id/detail', (req, res) => {
  try {
    const db = getDb();
    const detail = skinAnalysisService.getIssueDetail(parseInt(req.params.id));
    
    if (!detail) {
      return res.status(404).json({ success: false, error: '问题不存在' });
    }

    res.json({ success: true, data: detail });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/admin/skin-analysis/stats?agent_id=
 * 管理后台 - 数据统计
 */
router.get('/stats', (req, res) => {
  try {
    const db = getDb();
    const agentId = parseInt(req.query.agent_id || '0');

    let stats;
    if (agentId > 0) {
      stats = skinAnalysisService.getAgentSkinStats(agentId);
    } else {
      // 全局统计
      stats = db.prepare(`
        SELECT 
          COUNT(*) as total_reports,
          COUNT(CASE WHEN date(created_at) = date('now') THEN 1 END) as today_reports,
          COUNT(CASE WHEN date(created_at) >= date('now','-30 days') THEN 1 END) as month_reports
        FROM skin_reports
      `).get();

      const issueDist = db.prepare(`
        SELECT ri.issue_name, ri.category, COUNT(*) as cnt
        FROM skin_report_issues ri
        GROUP BY ri.issue_name
        ORDER BY cnt DESC
        LIMIT 15
      `).all();

      stats.issueDistribution = issueDist;
    }

    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * ========== 管理后台 CRUD：问题库 ==========
 */

// GET /api/admin/skin-issues - 问题列表
router.get('/admin/issues', (req, res) => {
  try {
    const db = getDb();
    const category = req.query.category || '';
    let sql = 'SELECT * FROM skin_issues WHERE status = 1';
    let params = [];
    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    sql += ' ORDER BY sort_order, id';
    const list = db.prepare(sql).all(...params);
    res.json({ success: true, data: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/skin-issues - 新增问题
router.post('/admin/issues', (req, res) => {
  try {
    const db = getDb();
    const { category, name, icon, color, description, severity_range, sort_order } = req.body;
    const result = db.prepare(`
      INSERT INTO skin_issues (category, name, icon, color, description, severity_range, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(category || 'other', name, icon || '⚠', color || '#e94560', description || '', severity_range || '1-5', sort_order || 0);
    
    res.json({ success: true, data: { id: result.lastInsertRowid } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/admin/skin-issues/:id - 编辑问题
router.put('/admin/issues/:id', (req, res) => {
  try {
    const db = getDb();
    const id = parseInt(req.params.id);
    const fields = [];
    const values = [];
    
    for (const key of ['name', 'icon', 'color', 'description', 'severity_range', 'sort_order', 'category']) {
      if (req.body[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(req.body[key]);
      }
    }
    
    if (fields.length === 0) {
      return res.json({ success: false, error: '没有要更新的字段' });
    }
    
    values.push(id);
    db.prepare(`UPDATE skin_issues SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/admin/skin-issues/:id - 删除问题
router.delete('/admin/issues/:id', (req, res) => {
  try {
    const db = getDb();
    db.prepare("UPDATE skin_issues SET status = 0 WHERE id = ?").run(parseInt(req.params.id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * ========== 管理后台 CRUD：成因话术库 ==========
 */

// GET /api/admin/skin-causes - 成因列表（可按issue_id筛选）
router.get('/admin/causes', (req, res) => {
  try {
    const db = getDb();
    const issueId = req.query.issue_id ? parseInt(req.query.issue_id) : null;
    let sql = `
      SELECT c.*, i.name as issue_name 
      FROM skin_issue_causes c
      LEFT JOIN skin_issues i ON c.issue_id = i.id
      WHERE 1=1
    `;
    if (issueId) {
      sql += ' AND c.issue_id = ' + issueId;
    }
    sql += ' ORDER BY c.id';
    const list = db.prepare(sql).all();
    res.json({ success: true, data: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/skin-causes - 新增成因
router.post('/admin/causes', (req, res) => {
  try {
    const db = getDb();
    const { issue_id, cause_text, advice_text } = req.body;
    const result = db.prepare(`
      INSERT INTO skin_issue_causes (issue_id, cause_text, advice_text)
      VALUES (?, ?, ?)
    `).run(issue_id || 0, cause_text || '', advice_text || '');
    res.json({ success: true, data: { id: result.lastInsertRowid } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/admin/skin-causes/:id - 编辑成因
router.put('/admin/causes/:id', (req, res) => {
  try {
    const db = getDb();
    const id = parseInt(req.params.id);
    const { issue_id, cause_text, advice_text } = req.body;
    db.prepare(`
      UPDATE skin_issue_causes SET 
        issue_id = COALESCE(?, issue_id),
        cause_text = COALESCE(?, cause_text),
        advice_text = COALESCE(?, advice_text)
      WHERE id = ?
    `).run(issue_id, cause_text, advice_text, id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/admin/skin-causes/:id - 删除成因
router.delete('/admin/causes/:id', (req, res) => {
  try {
    const db = getDb();
    db.prepare("DELETE FROM skin_issue_causes WHERE id = ?").run(parseInt(req.params.id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * ========== 管理后台 CRUD：养护方案库 ==========
 */

// GET /api/admin/care-plans - 养护方案列表
router.get('/admin/care-plans', (req, res) => {
  try {
    const db = getDb();
    const list = db.prepare('SELECT * FROM skin_care_plans ORDER BY care_type, sort_order').all();
    res.json({ success: true, data: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/care-plans - 新增方案
router.post('/admin/care-plans', (req, res) => {
  try {
    const db = getDb();
    const { care_type, title, content, steps, frequency, duration } = req.body;
    const result = db.prepare(`
      INSERT INTO skin_care_plans (care_type, title, content, steps, frequency, duration)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(care_type || 'moisturizing', title || '', content || '', steps || '', frequency || '', duration || '');
    res.json({ success: true, data: { id: result.lastInsertRowid } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/admin/care-plans/:id - 编辑方案
router.put('/admin/care-plans/:id', (req, res) => {
  try {
    const db = getDb();
    const id = parseInt(req.params.id);
    const { care_type, title, content, steps, frequency, duration } = req.body;
    db.prepare(`
      UPDATE skin_care_plans SET 
        care_type = COALESCE(?, care_type),
        title = COALESCE(?, title),
        content = COALESCE(?, content),
        steps = COALESCE(?, steps),
        frequency = COALESCE(?, frequency),
        duration = COALESCE(?, duration)
      WHERE id = ?
    `).run(care_type, title, content, steps, frequency, duration, id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/admin/care-plans/:id - 删除方案
router.delete('/admin/care-plans/:id', (req, res) => {
  try {
    const db = getDb();
    db.prepare("DELETE FROM skin_care_plans WHERE id = ?").run(parseInt(req.params.id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * ========== 管理后台 CRUD：产品匹配库 ==========
 */

// GET /api/admin/product-matches?issue_id= - 匹配列表
router.get('/admin/product-matches', (req, res) => {
  try {
    const db = getDb();
    const issueId = req.query.issue_id ? parseInt(req.query.issue_id) : null;
    let sql = `
      SELECT pm.*, p.product_name, p.retail_price as price, i.name as issue_name, i.category as issue_category
      FROM skin_products pm
      LEFT JOIN products p ON pm.product_id = p.id
      LEFT JOIN skin_issues i ON pm.issue_id = i.id
      WHERE p.status = 1
    `;
    if (issueId) {
      sql += ' AND pm.issue_id = ' + issueId;
    }
    sql += ' ORDER BY pm.id DESC';
    const list = db.prepare(sql).all();
    res.json({ success: true, data: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/product-matches - 绑定产品
router.post('/admin/product-matches', (req, res) => {
  try {
    const db = getDb();
    const { issue_id, product_id, recommend_reason, usage_method } = req.body;
    
    // 检查是否已存在
    const existing = db.prepare(
      'SELECT id FROM skin_products WHERE issue_id = ? AND product_id = ?'
    ).get(issue_id, product_id);
    
    if (existing) {
      return res.json({ success: false, error: '该产品已绑定到此问题' });
    }

    const result = db.prepare(`
      INSERT INTO skin_products (issue_id, product_id, match_reason, priority)
      VALUES (?, ?, ?, ?)
    `).run(issue_id, product_id, recommend_reason || '', 0);
    res.json({ success: true, data: { id: result.lastInsertRowid } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/admin/product-matches/:id - 解绑产品
router.delete('/admin/product-matches/:id', (req, res) => {
  try {
    const db = getDb();
    db.prepare("DELETE FROM skin_products WHERE id = ?").run(parseInt(req.params.id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/products-for-skin - 可选商品列表
router.get('/admin/products', (req, res) => {
  try {
    const db = getDb();
    const list = db.prepare('SELECT id, product_name, retail_price as price FROM products WHERE status = 1 ORDER BY product_name').all();
    res.json({ success: true, data: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * ========== 管理后台：诊断记录查询 ==========
 */

// GET /api/admin/reports?page=&pageSize=&userId=&keyword= - 报告列表（管理端）
router.get('/admin/reports', (req, res) => {
  try {
    const db = getDb();
    const page = parseInt(req.query.page || '1');
    const pageSize = parseInt(req.query.pageSize || '10');
    const offset = (page - 1) * pageSize;

    let whereSql = 'WHERE 1=1';
    const params = [];

    if (req.query.userId) {
      whereSql += ' AND r.user_id = ?';
      params.push(parseInt(req.query.userId));
    }
    if (req.query.keyword) {
      whereSql += " AND (u.username LIKE ? OR u.real_name LIKE ? OR u.phone LIKE ?)";
      const kw = '%' + req.query.keyword + '%';
      params.push(kw, kw, kw);
    }

    // 查总数
    const countResult = db.prepare(`SELECT COUNT(*) as total FROM skin_reports r ${whereSql}`).get(...params);

    // 查列表
    const reports = db.prepare(`
      SELECT r.*,
        COALESCE(u.real_name, u.username) as user_name,
        (SELECT COUNT(*) FROM skin_report_issues ri WHERE ri.report_id = r.id) as issue_count
      FROM skin_reports r
      LEFT JOIN users u ON r.user_id = u.id
      ${whereSql}
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, pageSize, offset);

    res.json({
      success: true,
      data: {
        list: reports,
        total: countResult.total,
        page,
        pageSize
      }
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * ========== 管理后台：数据统计 ==========
 */

// GET /api/admin/stats/overview - 总览统计
router.get('/admin/stats/overview', (req, res) => {
  try {
    const db = getDb();

    const totalReports = db.prepare('SELECT COUNT(*) as cnt FROM skin_reports').get().cnt;
    const todayReports = db.prepare(`SELECT COUNT(*) as cnt FROM skin_reports WHERE date(created_at) = date('now')`).get().cnt;
    const yesterdayReports = db.prepare(`SELECT COUNT(*) as cnt FROM skin_reports WHERE date(created_at) = date('now','-1')`).get().cnt;
    const todayGrowth = yesterdayReports > 0 ? Math.round(((todayReports - yesterdayReports) / yesterdayReports) * 100) : 0;
    const issueTypes = db.prepare('SELECT COUNT(DISTINCT issue_name) as cnt FROM skin_report_issues').get().cnt;
    const productMatches = db.prepare('SELECT COUNT(*) as cnt FROM skin_products').get().cnt;

    res.json({
      success: true,
      data: {
        totalReports,
        todayReports,
        todayGrowth: Math.max(todayGrowth, 0),
        issueTypes,
        productMatches
      }
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/stats/issues - 问题类型分布
router.get('/admin/stats/issues', (req, res) => {
  try {
    const db = getDb();
    const dist = db.prepare(`
      SELECT ri.issue_name, ri.category,
             COUNT(*) as count,
             MAX(i.sort_order) as sort_order
      FROM skin_report_issues ri
      LEFT JOIN skin_issues i ON ri.issue_name = i.name
      GROUP BY ri.issue_name, ri.category
      ORDER BY count DESC
    `).all();
    res.json({ success: true, data: dist.map(d => ({
      ...d,
      category_label: d.category === 'spot' ? '斑类' : d.category === 'acne' ? '痘类' : '肤质状态'
    })) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/stats/trend?period=daily|monthly|yearly - 趋势数据
router.get('/admin/stats/trend', (req, res) => {
  try {
    const db = getDb();
    const period = req.query.period || 'daily';

    let dateFmt, limit;
    switch (period) {
      case 'yearly': dateFmt = '%Y'; limit = 12; break;
      case 'monthly': dateFmt = '%Y-%m'; limit = 24; break;
      default: dateFmt = '%Y-%m-%d'; limit = 30; break; // daily
    }

    const trend = db.prepare(`
      SELECT strftime('${dateFmt}', created_at) as date_or_period, COUNT(*) as count
      FROM skin_reports
      WHERE created_at > datetime('now', '-${limit} ${period === 'yearly' ? "years" : period.slice(0,-2) + "s"}')
      GROUP BY strftime('${dateFmt}', created_at)
      ORDER BY date_or_period
    `).all();

    res.json({ success: true, data: trend.map(t => ({ ...t, period: t.date_or_period })) });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/stats/products?limit= - 产品推荐排行
router.get('/admin/stats/products', (req, res) => {
  try {
    const db = getDb();
    const limit = parseInt(req.query.limit || '10');

    const ranking = db.prepare(`
      SELECT sp.product_id, p.product_name,
             COUNT(r.id) as recommend_count,
             (SELECT COUNT(*) FROM skin_products sp2 WHERE sp2.product_id = sp.product_id) as issue_count
      FROM skin_products sp
      LEFT JOIN products p ON sp.product_id = p.id
      LEFT JOIN skin_reports r ON r.id IN (
        SELECT DISTINCT report_id FROM skin_report_issues
      )
      GROUP BY sp.product_id, p.product_name
      ORDER BY recommend_count DESC
      LIMIT ?
    `).all(limit);

    res.json({ success: true, data: ranking });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/reports/agent/:agentId - 代理商客户报告
router.get('/admin/reports/agent/:agentId', (req, res) => {
  try {
    const db = getDb();
    const agentId = parseInt(req.params.agentId);
    
    const reports = db.prepare(`
      SELECT r.*, COALESCE(u.real_name, u.username) as user_name, u.phone,
             (SELECT COUNT(*) FROM skin_report_issues ri WHERE ri.report_id = r.id) as issue_count
      FROM skin_reports r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE u.parent_id = ?
      ORDER BY r.created_at DESC
      LIMIT 50
    `).all(agentId);

    // 统计
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN date(r.created_at) = date('now') THEN 1 ELSE 0 END) as today
      FROM skin_reports r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE u.parent_id = ?
    `).get(agentId);

    res.json({
      success: true,
      data: { reports, stats }
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = { router };
