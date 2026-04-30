/**
 * JWT 鉴权中间件（增强版 - 查库获取完整权限信息）
 */
const jwt = require('jsonwebtoken');
const { error } = require('../utils/response');
const { getDB } = require('../utils/db');

const JWT_SECRET = process.env.JWT_SECRET || 'jinglaimei_secret_2026';

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return error(res, '未提供认证令牌', 401);
  }
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // 查库获取完整管理员信息（含权限），而不是仅依赖JWT payload
    const db = getDB();
    const admin = db.prepare(
      'SELECT id, username, role, permissions, status FROM admins WHERE id = ? AND status = 1'
    ).get(decoded.id);
    
    if (!admin) {
      return error(res, '账户不存在或已被禁用', 401);
    }
    
    // 将完整信息挂载到 req.user，供后续路由使用
    req.user = {
      id: admin.id,
      username: admin.username,
      role: admin.role,
      permissions: JSON.parse(admin.permissions || '[]'),
    };
    
    next();
  } catch (err) {
    return error(res, '认证令牌无效或已过期', 401);
  }
}

// 权限检查中间件工厂
function requirePermission(requiredPermissions) {
  const perms = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
  
  return (req, res, next) => {
    if (!req.user) return error(res, '未认证', 401);
    
    // super_admin / admin 跳过权限检查
    if (req.user.role === 'super_admin' || req.user.role === 'admin') return next();
    
    const userPerms = req.user.permissions || [];
    
    // 通配符
    if (userPerms.includes('*') || userPerms.includes('all')) return next();
    
    // 检查是否拥有任一所需权限（OR逻辑：满足一个即可）
    const hasAccess = perms.some(p => userPerms.includes(p));
    
    if (!hasAccess) {
      return error(res, '权限不足：需要 ' + perms.join(' 或 '), 403);
    }
    
    next();
  };
}

// 角色检查中间件工厂
function requireRole(allowedRoles) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  
  return (req, res, next) => {
    if (!req.user) return error(res, '未认证', 401);
    
    if (!roles.includes(req.user.role)) {
      return error(res, '角色限制：仅限 ' + roles.join(' 或 '), 403);
    }
    
    next();
  };
}

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

module.exports = { authMiddleware, requirePermission, requireRole, generateToken, JWT_SECRET };
