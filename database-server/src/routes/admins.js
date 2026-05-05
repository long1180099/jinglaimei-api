/**
 * 管理员账户管理路由 - CRUD + 重置密码
 * 
 * 路径: /api/admins (需 authMiddleware)
 */
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { getDB } = require('../utils/db');
const { success, error } = require('../utils/response');

// ==================== 辅助函数 ====================

/** 将行对象转为驼峰+解析JSON */
function formatAdmin(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    realName: row.real_name,
    email: row.email,
    phone: row.phone,
    avatarUrl: row.avatar_url,
    role: row.role,
    permissions: JSON.parse(row.permissions || '[]'),
    status: row.status,
    lastLoginAt: row.last_login_at,
    lastLoginIp: row.last_login_ip,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ==================== 路由 ====================

// GET /api/admins - 管理员列表
router.get('/', async (req, res) => {
  const db = getDB();
  const { page = 1, pageSize = 20, keyword, role, status } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(pageSize);

  let where = [];
  let params = [];

  if (keyword) {
    where.push('(a.username LIKE ? OR a.real_name LIKE ? OR a.email LIKE ? OR a.phone LIKE ?)');
    const kw = `%${keyword}%`;
    params.push(kw, kw, kw, kw);
  }
  if (role) { where.push('a.role = ?'); params.push(role); }
  if (status !== undefined && status !== '') { where.push('a.status = ?'); params.push(parseInt(status)); }

  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

  const total = await db.prepare(`SELECT COUNT(*) as cnt FROM admins a ${whereClause}`).get(...params).cnt;
  const list = db.prepare(`
    SELECT a.*,
           (SELECT COUNT(*) FROM operation_logs WHERE operator_id = a.id AND operator_type='admin') as op_count
    FROM admins a
    ${whereClause}
    ORDER BY a.id ASC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(pageSize), offset).map(formatAdmin);

  return success(res, { list, total, page: parseInt(page), pageSize: parseInt(pageSize) });
});

// GET /api/admins/stats - 管理员统计
router.get('/stats', async (req, res) => {
  const db = getDB();
  const total = await db.prepare('SELECT COUNT(*) as cnt FROM admins').get().cnt;
  const active = await db.prepare("SELECT COUNT(*) as cnt FROM admins WHERE status = 1").get().cnt;
  
  // 各角色统计
  const roles = await db.prepare("SELECT role, COUNT(*) as cnt FROM admins GROUP BY role").all();
  const roleStats = {};
  roles.forEach(r => { roleStats[r.role] = r.cnt; });

  // 本月新增
  const newThisMonth = db.prepare(
    "SELECT COUNT(*) as cnt FROM admins WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m','now')"
  ).get().cnt;

  // 今日登录
  const todayLogin = db.prepare(
    "SELECT COUNT(*) as cnt FROM admins WHERE date(last_login_at) = date('now','localtime')"
  ).get().cnt;

  return success(res, { total, active, roleStats, newThisMonth, todayLogin });
});

// POST /api/admins - 创建管理员账号
router.post('/', async (req, res) => {
  const db = getDB();
  const { username, password, real_name, email, phone, role = 'operator', permissions = [] } = req.body;

  if (!username || !password) {
    return error(res, '用户名和密码不能为空');
  }
  if (username.length < 3) return error(res, '用户名至少3个字符');
  if (password.length < 6) return error(res, '密码至少6个字符');

  // 检查用户名唯一性
  const existing = await db.prepare('SELECT id FROM admins WHERE username = ?').get(username);
  if (existing) return error(res, '该用户名已存在');

  try {
    const hashedPwd = bcrypt.hashSync(password, 10);
    const result = db.prepare(`
      INSERT INTO admins (username, password, real_name, email, phone, role, permissions, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `).run(username, hashedPwd, real_name || null, email || null, phone || null, role, JSON.stringify(permissions));

    const created = await db.prepare('SELECT * FROM admins WHERE id = ?').get(result.lastInsertRowid);
    return success(res, formatAdmin(created), '管理员创建成功', 201);
  } catch (err) {
    if (err.message.includes('UNIQUE')) return error(res, '用户名或邮箱已存在');
    return error(res, '创建失败: ' + err.message);
  }
});

// GET /api/admins/:id - 获取单个管理员详情
router.get('/:id', async (req, res) => {
  const db = getDB();
  const admin = await db.prepare('SELECT * FROM admins WHERE id = ?').get(req.params.id);
  if (!admin) return error(res, '管理员不存在', 404);
  return success(res, formatAdmin(admin));
});

// PUT /api/admins/:id - 更新管理员信息（不含密码）
router.put('/:id', async (req, res) => {
  const db = getDB();
  const { real_name, email, phone, role, permissions, status } = req.body;

  const existing = await db.prepare('SELECT id FROM admins WHERE id = ?').get(req.params.id);
  if (!existing) return error(res, '管理员不存在', 404);

  // 如果修改用户名，检查唯一性
  if (req.body.username) {
    const nameDup = db.prepare('SELECT id FROM admins WHERE username = ? AND id != ?')
      .get(req.body.username, req.params.id);
    if (nameDup) return error(res, '该用户名已被使用');
  }

  try {
    // 动态构建 SET 子句，只更新前端明确传递的字段
    const setClauses = [];
    const setParams = [];

    if (req.body.username !== undefined) { setClauses.push('username = ?'); setParams.push(req.body.username); }
    if (real_name !== undefined) { setClauses.push('real_name = ?'); setParams.push(real_name); }
    if (email !== undefined) { setClauses.push('email = ?'); setParams.push(email); }
    if (phone !== undefined) { setClauses.push('phone = ?'); setParams.push(phone); }
    if (role !== undefined) { setClauses.push('role = ?'); setParams.push(role); }
    if (permissions !== undefined) { setClauses.push('permissions = ?'); setParams.push(JSON.stringify(permissions)); }
    if (status !== undefined) { setClauses.push('status = ?'); setParams.push(status); }

    if (setClauses.length === 0) return error(res, '没有需要更新的字段');

    setClauses.push("updated_at = datetime('now','localtime')");
    setParams.push(req.params.id);

    await db.prepare(`UPDATE admins SET ${setClauses.join(', ')} WHERE id = ?`).run(...setParams);

    const updated = await db.prepare('SELECT * FROM admins WHERE id = ?').get(req.params.id);
    return success(res, formatAdmin(updated), '更新成功');
  } catch (err) {
    return error(res, '更新失败: ' + err.message);
  }
});

// DELETE /api/admins/:id - 禁用/删除管理员
router.delete('/:id', async (req, res) => {
  const db = getDB();
  const admin = await db.prepare('SELECT id, username, role FROM admins WHERE id = ?').get(req.params.id);
  if (!admin) return error(res, '管理员不存在', 404);

  // 不允许删除超级管理员自己（安全检查：通过中间件判断当前操作者）
  if (admin.role === 'super_admin') {
    return error(res, '不能删除超级管理员账户');
  }

  // 软删除（禁用）而非物理删除，保留审计记录
  await db.prepare("UPDATE admins SET status = 0, updated_at = datetime('now','localtime') WHERE id = ?")
    .run(req.params.id);

  return success(res, null, `管理员「${admin.username}」已禁用`);
});

// POST /api/admins/:id/reset-password - 重置密码
router.post('/:id/reset-password', async (req, res) => {
  const db = getDB();
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) return error(res, '新密码至少6个字符');

  const admin = await db.prepare('SELECT id, username FROM admins WHERE id = ?').get(req.params.id);
  if (!admin) return error(res, '管理员不存在', 404);

  const hashedPwd = bcrypt.hashSync(newPassword, 10);
  await db.prepare("UPDATE admins SET password = ?, updated_at = datetime('now','localtime') WHERE id = ?")
    .run(hashedPwd, req.params.id);

  return success(res, null, `管理员「${admin.username}」的密码已重置`);
});

module.exports = router;
