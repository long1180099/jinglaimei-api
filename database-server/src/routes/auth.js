/**
 * 认证路由 - 登录/登出
 */
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { getDB } = require('../utils/db');
const { success, error } = require('../utils/response');
const { generateToken } = require('../middleware/auth');

// POST /api/auth/login - 管理员登录
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return error(res, '用户名和密码不能为空');
  }
  const db = getDB();
  const admin = db.prepare('SELECT * FROM admins WHERE username = ? AND status = 1').get(username);
  if (!admin) {
    return error(res, '用户名或密码错误', 401);
  }
  const isValid = bcrypt.compareSync(password, admin.password);
  if (!isValid) {
    return error(res, '用户名或密码错误', 401);
  }
  // 更新最后登录时间
  db.prepare('UPDATE admins SET last_login_at = datetime(\'now\',\'localtime\'), last_login_ip = ? WHERE id = ?')
    .run(req.ip || '127.0.0.1', admin.id);

  const token = generateToken({ id: admin.id, username: admin.username, role: admin.role });
  return success(res, {
    token,
    userInfo: {
      id: admin.id,
      username: admin.username,
      realName: admin.real_name,
      email: admin.email,
      role: admin.role,
      permissions: JSON.parse(admin.permissions || '[]'),
      avatar: admin.avatar_url
    }
  }, '登录成功');
});

// POST /api/auth/logout - 登出
router.post('/logout', (req, res) => {
  return success(res, null, '已退出登录');
});

// GET /api/auth/profile - 获取当前用户信息
router.get('/profile', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return error(res, '未认证', 401);
  try {
    const jwt = require('jsonwebtoken');
    const { JWT_SECRET } = require('../middleware/auth');
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    const decoded = jwt.verify(token, JWT_SECRET);
    const db = getDB();
    const admin = db.prepare('SELECT id, username, real_name, email, role, permissions, avatar_url, last_login_at FROM admins WHERE id = ?').get(decoded.id);
    if (!admin) return error(res, '用户不存在', 404);
    return success(res, {
      id: admin.id,
      username: admin.username,
      realName: admin.real_name,
      email: admin.email,
      role: admin.role,
      permissions: JSON.parse(admin.permissions || '[]'),
      avatar: admin.avatar_url,
      lastLoginAt: admin.last_login_at
    });
  } catch {
    return error(res, '认证失败', 401);
  }
});

module.exports = router;
