/**
 * 小程序端 - 产品使用日志 API
 * 挂载路径：/api/mp/usage
 * 鉴权方式：路由内部验证 token（与 mp.js 一致，不使用 authMiddleware）
 */
const express = require('express');
const router = express.Router();
const { getDB } = require('../utils/db');
const { success, error } = require('../utils/response');

// ============ 鉴权辅助函数 ============

function getUserFromRequest(req) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return null;
  const jwt = require('jsonwebtoken');
  const { JWT_SECRET } = require('../middleware/auth');
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== 'mp') return null;
    return decoded;
  } catch (e) {
    return null;
  }
}

function requireAuth(req, res) {
  const decoded = getUserFromRequest(req);
  if (!decoded) {
    error(res, '未登录', 401);
    return null;
  }
  const db = getDB();
  const user = db.prepare('SELECT * FROM users WHERE id = ? AND is_deleted = 0').get(decoded.id);
  if (!user) {
    error(res, '用户不存在', 401);
    return null;
  }
  return user;
}

// ============ 下级树查询（同团队链路） ============

/**
 * 获取当前用户下级树中同团队链路的所有用户 ID
 * 逻辑：从当前用户出发，递归查 parent_id 下级，但要求下级的 team_id 与其 parent 相同
 * 等级 5+ 的用户：查自己 team_id 下所有成员
 */
function getTeamDescendantIds(db, currentUser) {
  const level = currentUser.agent_level || 1;

  if (level >= 5) {
    // 分公司及以上：查同 team_id 的所有成员
    const rows = db.prepare(
      'SELECT id FROM users WHERE team_id = ? AND is_deleted = 0 AND id != ?'
    ).all(currentUser.team_id, currentUser.id);
    return rows.map(r => r.id);
  }

  // 等级 3-4：递归查下级树，仅同团队链路
  const rows = db.prepare(`
    WITH RECURSIVE sub_tree(id) AS (
      SELECT :userId
      UNION ALL
      SELECT u.id FROM users u
      JOIN sub_tree t ON u.parent_id = t.id
      WHERE u.is_deleted = 0 AND u.team_id = (
        SELECT team_id FROM users WHERE id = t.id
      )
    )
    SELECT id FROM sub_tree WHERE id != :userId
  `).all({ userId: currentUser.id });
  return rows.map(r => r.id);
}

// ============ 顾客处理（混合方案） ============

/**
 * 处理顾客信息：优先匹配 users 表，无匹配则创建 customers 记录
 * 返回 { customerId, isNew }
 */
function resolveCustomer(db, phone, name, agentUserId) {
  // 1. 优先匹配 users 表
  if (phone) {
    const existingUser = db.prepare(
      'SELECT id FROM users WHERE phone = ? AND is_deleted = 0'
    ).get(phone);

    if (existingUser) {
      // 查是否已有 customers 记录
      let customer = db.prepare(
        'SELECT id FROM customers WHERE user_id = ? AND agent_user_id = ? AND status = 1'
      ).get(existingUser.id, agentUserId);

      if (!customer) {
        // 自动创建 customers 记录关联
        const result = db.prepare(
          'INSERT INTO customers (name, phone, agent_user_id, user_id) VALUES (?, ?, ?, ?)'
        ).run(name || '', phone, agentUserId, existingUser.id);
        customer = { id: result.lastInsertRowid };
      }
      return { customerId: customer.id, isNew: false };
    }
  }

  // 2. 查 customers 表是否已有该手机号的记录
  if (phone) {
    const existingCustomer = db.prepare(
      'SELECT id FROM customers WHERE phone = ? AND agent_user_id = ? AND status = 1'
    ).get(phone, agentUserId);
    if (existingCustomer) {
      return { customerId: existingCustomer.id, isNew: false };
    }
  }

  // 3. 创建新 customers 记录
  const result = db.prepare(
    'INSERT INTO customers (name, phone, agent_user_id) VALUES (?, ?, ?)'
  ).run(name || '', phone || '', agentUserId);
  return { customerId: result.lastInsertRowid, isNew: true };
}

// ============ API 接口 ============

// GET /api/mp/usage/logs - 查看使用日志列表
router.get('/logs', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const db = getDB();
  const {
    page = 1, pageSize = 20,
    subordinate_agent_id, // 筛选特定下级
    customer_name, product_id, date_from, date_to
  } = req.query;
  const level = user.agent_level || 1;

  let agentIds = [user.id]; // 默认包含自己

  if (level >= 3) {
    // 等级 3+ 查看团队使用记录
    const descendantIds = getTeamDescendantIds(db, user);
    agentIds = [user.id, ...descendantIds];
  }

  // 构建查询条件
  let where = 'pul.status = 1 AND pul.agent_user_id IN (' + agentIds.map(() => '?').join(',') + ')';
  let params = agentIds;

  if (subordinate_agent_id) {
    where += ' AND pul.agent_user_id = ?';
    params.push(parseInt(subordinate_agent_id));
  }
  if (customer_name) {
    where += ' AND (c.name LIKE ? OR c.phone LIKE ?)';
    params.push(`%${customer_name}%`, `%${customer_name}%`);
  }
  if (product_id) {
    where += ' AND pul.product_id = ?';
    params.push(parseInt(product_id));
  }
  if (date_from) {
    where += ' AND pul.start_date >= ?';
    params.push(date_from);
  }
  if (date_to) {
    where += ' AND pul.start_date <= ?';
    params.push(date_to);
  }

  // 查总数
  const total = db.prepare(`SELECT COUNT(*) as cnt FROM product_usage_logs pul LEFT JOIN customers c ON pul.customer_id = c.id WHERE ${where}`).get(...params).cnt;

  // 查列表
  const offset = (parseInt(page) - 1) * parseInt(pageSize);
  params.push(parseInt(pageSize), offset);

  const list = db.prepare(`
    SELECT pul.*, c.name as customer_name, c.phone as customer_phone,
           p.product_name, p.image_gallery,
           u1.username as agent_name,
           u2.username as created_by_name
    FROM product_usage_logs pul
    LEFT JOIN customers c ON pul.customer_id = c.id
    LEFT JOIN products p ON pul.product_id = p.id
    LEFT JOIN users u1 ON pul.agent_user_id = u1.id
    LEFT JOIN users u2 ON pul.created_by_user_id = u2.id
    WHERE ${where}
    ORDER BY pul.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params);

  // 后处理：image_gallery 是 JSON 字符串，解析为数组方便前端使用
  list.forEach(row => {
    if (typeof row.image_gallery === 'string') {
      try { row.image_gallery = JSON.parse(row.image_gallery); } catch(e) { row.image_gallery = []; }
    } else if (!Array.isArray(row.image_gallery)) {
      row.image_gallery = [];
    }
    // image_gallery 里的 URL 转为 HTTPS（小程序要求）
    row.image_gallery = row.image_gallery.map(url => {
      if (!url) return '';
      return url.replace(/^http:\/\//, 'https://api.jinglaimei.com/');
    });
  });

  // 如果 level >= 4，返回可筛选的下级代理商列表
  let subordinateAgents = [];
  if (level >= 4) {
    const subIds = getTeamDescendantIds(db, user);
    if (subIds.length > 0) {
      subordinateAgents = db.prepare(
        'SELECT id, username, phone, agent_level FROM users WHERE id IN (' + subIds.map(() => '?').join(',') + ') AND is_deleted = 0 ORDER BY agent_level DESC, username'
      ).all(...subIds);
    }
  }

  return success(res, { list, total, page: parseInt(page), pageSize: parseInt(pageSize), subordinateAgents });
});

// GET /api/mp/usage/logs/:id - 使用日志详情
router.get('/logs/:id', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const db = getDB();
  const log = db.prepare(`
    SELECT pul.*, c.name as customer_name, c.phone as customer_phone, c.notes as customer_notes,
           p.product_name, p.image_gallery,
           u1.username as agent_name, u1.phone as agent_phone,
           u2.username as created_by_name
    FROM product_usage_logs pul
    LEFT JOIN customers c ON pul.customer_id = c.id
    LEFT JOIN products p ON pul.product_id = p.id
    LEFT JOIN users u1 ON pul.agent_user_id = u1.id
    LEFT JOIN users u2 ON pul.created_by_user_id = u2.id
    WHERE pul.id = ? AND pul.status = 1
  `).get(req.params.id);

  if (!log) return error(res, '记录不存在');

  // image_gallery 解析
  if (typeof log.image_gallery === 'string') {
    try { log.image_gallery = JSON.parse(log.image_gallery); } catch(e) { log.image_gallery = []; }
  }
  if (Array.isArray(log.image_gallery)) {
    log.image_gallery = log.image_gallery.map(url => {
      if (!url) return '';
      return url.replace(/^http:\/\//, 'https://api.jinglaimei.com/');
    });
  }

  return success(res, log);
});

// POST /api/mp/usage/create - 创建使用日志（自己为顾客录入）
router.post('/create', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const level = user.agent_level || 1;
  if (level < 3) return error(res, '权限不足', 403);

  const db = getDB();
  const {
    customer_name, customer_phone, customer_id,
    product_id, trace_code, start_date, usage_instructions
  } = req.body;

  // 参数校验
  if (!product_id) return error(res, '请选择产品');
  if (!start_date) return error(res, '请选择使用日期');

  // 验证产品存在
  const product = db.prepare('SELECT id, product_name FROM products WHERE id = ? AND status = 1').get(product_id);
  if (!product) return error(res, '产品不存在');

  // 处理顾客
  let customerId = customer_id;
  if (!customerId && (customer_name || customer_phone)) {
    const result = resolveCustomer(db, customer_phone, customer_name, user.id);
    customerId = result.customerId;
  }
  if (!customerId) return error(res, '请选择或填写顾客信息');

  // 验证溯源码唯一性
  if (trace_code) {
    const existing = db.prepare('SELECT id FROM product_usage_logs WHERE trace_code = ? AND status = 1').get(trace_code);
    if (existing) return error(res, '该溯源码已被使用');
  }

  // 默认用量说明
  const instructions = usage_instructions || '';

  try {
    const result = db.prepare(`
      INSERT INTO product_usage_logs (agent_user_id, customer_id, product_id, trace_code, start_date, usage_instructions, created_by_user_id, source_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'self')
    `).run(user.id, customerId, product_id, trace_code || null, start_date, instructions, user.id);

    // 返回完整记录
    const log = db.prepare(`
      SELECT pul.*, c.name as customer_name, c.phone as customer_phone,
             p.product_name, u1.username as agent_name, u2.username as created_by_name
      FROM product_usage_logs pul
      LEFT JOIN customers c ON pul.customer_id = c.id
      LEFT JOIN products p ON pul.product_id = p.id
      LEFT JOIN users u1 ON pul.agent_user_id = u1.id
      LEFT JOIN users u2 ON pul.created_by_user_id = u2.id
      WHERE pul.id = ?
    `).get(result.lastInsertRowid);

    return success(res, log, '录入成功');
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return error(res, '该溯源码已被使用');
    }
    return error(res, '录入失败: ' + err.message);
  }
});

// POST /api/mp/usage/create-for-subordinate - 上级为下级代填写
router.post('/create-for-subordinate', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const level = user.agent_level || 1;
  if (level < 4) return error(res, '权限不足，仅批发商及以上可代填写', 403);

  const db = getDB();
  const {
    subordinate_agent_id,
    customer_name, customer_phone, customer_id,
    product_id, trace_code, start_date, usage_instructions
  } = req.body;

  // 参数校验
  if (!subordinate_agent_id) return error(res, '请选择负责代理商');
  if (!product_id) return error(res, '请选择产品');
  if (!start_date) return error(res, '请选择使用日期');

  // 验证下级是否在当前用户的团队树中（同团队链路）
  const descendantIds = getTeamDescendantIds(db, user);
  if (!descendantIds.includes(parseInt(subordinate_agent_id))) {
    return error(res, '该用户不是您的下级团队成员', 403);
  }

  // 验证下级代理商存在
  const subordinate = db.prepare('SELECT id, username, agent_level FROM users WHERE id = ? AND is_deleted = 0').get(subordinate_agent_id);
  if (!subordinate) return error(res, '代理商不存在');

  // 验证产品存在
  const product = db.prepare('SELECT id, product_name FROM products WHERE id = ? AND status = 1').get(product_id);
  if (!product) return error(res, '产品不存在');

  // 处理顾客
  let customerId = customer_id;
  if (!customerId && (customer_name || customer_phone)) {
    const result = resolveCustomer(db, customer_phone, customer_name, parseInt(subordinate_agent_id));
    customerId = result.customerId;
  }
  if (!customerId) return error(res, '请选择或填写顾客信息');

  // 验证溯源码唯一性
  if (trace_code) {
    const existing = db.prepare('SELECT id FROM product_usage_logs WHERE trace_code = ? AND status = 1').get(trace_code);
    if (existing) return error(res, '该溯源码已被使用');
  }

  // 使用说明
  let instructions = usage_instructions || '';

  try {
    const result = db.prepare(`
      INSERT INTO product_usage_logs (agent_user_id, customer_id, product_id, trace_code, start_date, usage_instructions, created_by_user_id, source_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'superior')
    `).run(parseInt(subordinate_agent_id), customerId, product_id, trace_code || null, start_date, instructions, user.id);

    const log = db.prepare(`
      SELECT pul.*, c.name as customer_name, c.phone as customer_phone,
             p.product_name, u1.username as agent_name, u2.username as created_by_name
      FROM product_usage_logs pul
      LEFT JOIN customers c ON pul.customer_id = c.id
      LEFT JOIN products p ON pul.product_id = p.id
      LEFT JOIN users u1 ON pul.agent_user_id = u1.id
      LEFT JOIN users u2 ON pul.created_by_user_id = u2.id
      WHERE pul.id = ?
    `).get(result.lastInsertRowid);

    return success(res, log, '代填写成功');
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return error(res, '该溯源码已被使用');
    }
    return error(res, '代填写失败: ' + err.message);
  }
});

// GET /api/mp/usage/subordinates - 获取可代填的下级代理商列表
router.get('/subordinates', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const level = user.agent_level || 1;
  if (level < 4) return error(res, '权限不足', 403);

  const db = getDB();
  const { search } = req.query;

  const descendantIds = getTeamDescendantIds(db, user);
  if (descendantIds.length === 0) {
    return success(res, []);
  }

  let sql = 'SELECT id, username, phone, agent_level FROM users WHERE id IN (' + descendantIds.map(() => '?').join(',') + ') AND is_deleted = 0';
  let params = descendantIds;

  if (search) {
    sql += ' AND (username LIKE ? OR phone LIKE ? OR real_name LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  sql += ' ORDER BY agent_level DESC, username';

  const list = db.prepare(sql).all(...params);
  return success(res, list);
});

// GET /api/mp/usage/customers - 查看自己的顾客列表
router.get('/customers', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const level = user.agent_level || 1;
  if (level < 3) return error(res, '权限不足', 403);

  const db = getDB();
  const { search, page = 1, pageSize = 20 } = req.query;

  let where = 'c.status = 1 AND c.agent_user_id = ?';
  let params = [user.id];

  if (search) {
    where += ' AND (c.name LIKE ? OR c.phone LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  const total = db.prepare(`SELECT COUNT(*) as cnt FROM customers c WHERE ${where}`).get(...params).cnt;
  const offset = (parseInt(page) - 1) * parseInt(pageSize);
  params.push(parseInt(pageSize), offset);

  const list = db.prepare(`
    SELECT c.*, u.id as user_id, u.avatar_url
    FROM customers c
    LEFT JOIN users u ON c.user_id = u.id AND u.is_deleted = 0
    WHERE ${where}
    ORDER BY c.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params);

  return success(res, { list, total, page: parseInt(page), pageSize: parseInt(pageSize) });
});

// GET /api/mp/usage/customers/search - 按手机号搜索顾客（匹配 users + customers）
router.get('/customers/search', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const db = getDB();
  const { phone } = req.query;
  if (!phone) return error(res, '请输入手机号');

  const level = user.agent_level || 1;

  // 搜索范围：自己 + 下级（如果 level >= 4）
  let agentIds = [user.id];
  if (level >= 4) {
    agentIds = [user.id, ...getTeamDescendantIds(db, user)];
  }

  // 1. 在 users 表中搜索
  const users = db.prepare(
    'SELECT id, username as name, phone, avatar_url, NULL as customer_id, 1 as is_user FROM users WHERE phone LIKE ? AND is_deleted = 0 LIMIT 10'
  ).all(`%${phone}%`);

  // 2. 在 customers 表中搜索
  const agentIdList = agentIds.map(() => '?').join(',');
  const customers = db.prepare(
    `SELECT c.id as customer_id, c.name, c.phone, c.agent_user_id, c.user_id,
            u.avatar_url, 0 as is_user
     FROM customers c
     LEFT JOIN users u ON c.user_id = u.id
     WHERE c.phone LIKE ? AND c.status = 1 AND c.agent_user_id IN (${agentIdList})
     LIMIT 10`
  ).all(`%${phone}%`, ...agentIds);

  return success(res, { users, customers });
});

// GET /api/mp/usage/products - 使用记录专用产品列表（不受上架状态限制）
router.get('/products', (req, res) => {
  const user = getUserFromRequest(req);
  if (!user) return error(res, '请先登录', 401);

  const db = getDB();
  const { keyword } = req.query;

  let where = '1 = 1';
  let params = [];
  if (keyword) {
    where += ' AND (product_name LIKE ? OR product_code LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }

  const products = db.prepare(`
    SELECT id, product_name, product_code, main_image, image_gallery, status
    FROM products WHERE ${where}
    ORDER BY sort_order ASC, id ASC
    LIMIT 200
  `).all(...params);

  // 解析 image_gallery 为数组
  products.forEach(p => {
    if (typeof p.image_gallery === 'string') {
      try { p.image_gallery = JSON.parse(p.image_gallery); } catch(e) { p.image_gallery = []; }
    }
    if (!Array.isArray(p.image_gallery)) p.image_gallery = [];
  });

  return success(res, products);
});

module.exports = router;
