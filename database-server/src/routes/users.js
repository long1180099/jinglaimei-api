/**
 * 用户路由
 */
const express = require('express');
const router = express.Router();
const { getDB } = require('../utils/db');
const { success, error } = require('../utils/response');

// GET /api/users - 获取用户列表
router.get('/', async (req, res) => {
  const db = getDB();
  const { page = 1, pageSize = 10, keyword, status, agentLevel, teamId } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(pageSize);
  
  let where = ['u.is_deleted = 0'];
  let params = [];
  
  if (keyword) {
    where.push('(u.username LIKE ? OR u.phone LIKE ? OR u.real_name LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  if (status !== undefined && status !== '') {
    where.push('u.status = ?');
    params.push(parseInt(status));
  }
  if (agentLevel) {
    where.push('u.agent_level = ?');
    params.push(parseInt(agentLevel));
  }
  if (teamId) {
    where.push('u.team_id = ?');
    params.push(parseInt(teamId));
  }
  
  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const total = await db.prepare(`SELECT COUNT(*) as cnt FROM users u ${whereClause}`).get(...params).cnt;
  const users = db.prepare(`
    SELECT u.*, t.team_name,
           (SELECT COUNT(*) FROM users sub WHERE sub.parent_id = u.id AND sub.is_deleted = 0) as direct_members
    FROM users u
    LEFT JOIN teams t ON u.team_id = t.id
    ${whereClause}
    ORDER BY u.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(pageSize), offset);

  return success(res, {
    list: users,
    total,
    page: parseInt(page),
    pageSize: parseInt(pageSize)
  });
});

// GET /api/users/stats - 用户统计（扩展到全部6级）
router.get('/stats', async (req, res) => {
  const db = getDB();
  const total = await db.prepare('SELECT COUNT(*) as cnt FROM users WHERE is_deleted = 0').get().cnt;
  const active = await db.prepare('SELECT COUNT(*) as cnt FROM users WHERE status = 1 AND is_deleted = 0').get().cnt;
  // 全部6级统计
  const levels = {};
  for (let i = 1; i <= 6; i++) {
    levels['level' + i] = await db.prepare('SELECT COUNT(*) as cnt FROM users WHERE agent_level = ? AND is_deleted = 0').get(i).cnt;
  }
  const newThisMonth = await db.prepare(`SELECT COUNT(*) as cnt FROM users WHERE strftime('%Y-%m', registered_at) = strftime('%Y-%m','now') AND is_deleted = 0`).get().cnt;
  
  return success(res, { total, active, ...levels, newThisMonth });
});

// GET /api/users/level-distribution - 用户等级分布（必须在 :/id 之前！）
router.get('/level-distribution', async (req, res) => {
  const db = getDB();
  
  const distribution = db.prepare(`
    SELECT agent_level as level, COUNT(*) as count 
    FROM users 
    WHERE is_deleted = 0 AND agent_level > 0
    GROUP BY agent_level
    ORDER BY agent_level ASC
  `).all();

  // 确保所有6个级别都有（缺失的补0）
  const allLevels = [1, 2, 3, 4, 5, 6];
  const result = allLevels.map(level => {
    const found = distribution.find(d => d.level === level);
    return { level, count: found ? found.count : 0 };
  });

  return success(res, result);
});

// GET /api/users/:id - 获取用户详情
router.get('/:id', async (req, res) => {
  const db = getDB();
  const user = db.prepare(`
    SELECT u.*, t.team_name, t.team_level,
           (SELECT COUNT(*) FROM users sub WHERE sub.parent_id = u.id AND sub.is_deleted = 0) as direct_members,
           parent.username as parent_username, parent.real_name as parent_real_name
    FROM users u
    LEFT JOIN teams t ON u.team_id = t.id
    LEFT JOIN users parent ON u.parent_id = parent.id
    WHERE u.id = ? AND u.is_deleted = 0
  `).get(req.params.id);
  
  if (!user) return error(res, '用户不存在', 404);
  
  // 附加最近订单
  const recentOrders = db.prepare(`
    SELECT id, order_no, actual_amount, order_status, order_time 
    FROM orders WHERE user_id = ? ORDER BY order_time DESC LIMIT 5
  `).all(req.params.id);
  
  // 附加收益统计
  const commStats = db.prepare(`
    SELECT 
      SUM(CASE WHEN commission_status = 1 THEN commission_amount ELSE 0 END) as settled,
      SUM(CASE WHEN commission_status = 0 THEN commission_amount ELSE 0 END) as pending,
      COUNT(*) as total_count
    FROM commissions WHERE user_id = ?
  `).get(req.params.id);
  
  return success(res, { ...user, recentOrders, commissionStats: commStats });
});

// POST /api/users - 新增用户
router.post('/', async (req, res) => {
  const db = getDB();
  const { username, phone, real_name, gender, agent_level, parent_id, team_id, invite_code } = req.body;
  if (!username || !phone) return error(res, '用户名和手机号不能为空');
  
  try {
    const result = db.prepare(`
      INSERT INTO users (username, phone, real_name, gender, agent_level, parent_id, team_id, invite_code, registered_at, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now','localtime'), 1)
    `).run(username, phone, real_name, gender || 0, agent_level || 1, parent_id || null, team_id || null, invite_code || null);
    
    return success(res, { id: result.lastInsertRowid }, '用户创建成功', 201);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      // 检查是否是已被删除的用户占用了该手机号
      const deletedUser = await db.prepare('SELECT id, username, is_deleted FROM users WHERE phone = ?').get(phone);
      if (deletedUser && deletedUser.is_deleted === 1) {
        // 清除已删除用户的手机号，释放给新用户使用
        await db.prepare("UPDATE users SET phone = NULL WHERE id = ?").run(deletedUser.id);
        // 重新插入
        const retryResult = db.prepare(`
          INSERT INTO users (username, phone, real_name, gender, agent_level, parent_id, team_id, invite_code, registered_at, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now','localtime'), 1)
        `).run(username, phone, real_name, gender || 0, agent_level || 1, parent_id || null, team_id || null, invite_code || null);
        return success(res, { id: retryResult.lastInsertRowid }, '用户创建成功', 201);
      }
      return error(res, '手机号已存在');
    }
    return error(res, '创建失败: ' + err.message);
  }
});

// PUT /api/users/:id - 更新用户（支持改等级、改上级、改状态等）
router.put('/:id', async (req, res) => {
  const db = getDB();
  const { username, phone, real_name, gender, agent_level, status, team_id, balance, parent_id } = req.body;
  
  // 如果要修改parent_id，做合法性校验（仅当前端明确传递了 parent_id 字段时才校验和更新）
  if (parent_id !== undefined) {
    if (parent_id !== null) {
      const targetUser = await db.prepare('SELECT id FROM users WHERE id = ? AND is_deleted = 0').get(parent_id);
      if (!targetUser) return error(res, '目标上级用户不存在');
      // 不能设置自己为上级
      if (parseInt(parent_id) === parseInt(req.params.id)) return error(res, '不能将自己设为上级');
    }
  }
  
  try {
    // 构建 SET 子句和参数，只更新前端明确传递的字段
    const setClauses = [];
    const setParams = [];
    
    if (username !== undefined) { setClauses.push('username = ?'); setParams.push(username); }
    if (phone !== undefined) { setClauses.push('phone = ?'); setParams.push(phone); }
    if (real_name !== undefined) { setClauses.push('real_name = ?'); setParams.push(real_name); }
    if (gender !== undefined) { setClauses.push('gender = ?'); setParams.push(gender); }
    if (agent_level !== undefined) { setClauses.push('agent_level = ?'); setParams.push(agent_level); }
    if (status !== undefined) { setClauses.push('status = ?'); setParams.push(status); }
    if (team_id !== undefined) { setClauses.push('team_id = ?'); setParams.push(team_id); }
    if (balance !== undefined) { setClauses.push('balance = ?'); setParams.push(balance); }
    if (parent_id !== undefined) { setClauses.push('parent_id = ?'); setParams.push(parent_id ?? null); }
    
    if (setClauses.length === 0) return error(res, '没有需要更新的字段');
    
    setClauses.push("updated_at = datetime('now','localtime')");
    setParams.push(req.params.id);
    
    await db.prepare(`UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`).run(...setParams);
    
    // 返回更新后的完整数据
    const updated = db.prepare(`
      SELECT u.*, 
             (SELECT COUNT(*) FROM users sub WHERE sub.parent_id = u.id AND sub.is_deleted = 0) as direct_members,
             p.username as parent_username
      FROM users u
      LEFT JOIN users p ON u.parent_id = p.id
      WHERE u.id = ? AND u.is_deleted = 0
    `).get(req.params.id);
    
    return success(res, updated, '更新成功');
  } catch (err) {
    return error(res, '更新失败: ' + err.message);
  }
});

// POST /api/users/:id/bind-parent - 管理员手动绑定/更换/解绑上级
router.post('/:id/bind-parent', async (req, res) => {
  const db = getDB();
  const { parent_id, reason } = req.body;
  
  const user = await db.prepare('SELECT id, username FROM users WHERE id = ? AND is_deleted = 0').get(req.params.id);
  if (!user) return error(res, '用户不存在', 404);
  
  if (parent_id !== undefined && parent_id !== null) {
    // 绑定/换上级
    const targetParent = await db.prepare('SELECT id, username FROM users WHERE id = ? AND is_deleted = 0').get(parent_id);
    if (!targetParent) return error(res, '目标上级用户不存在');
    if (parseInt(parent_id) === parseInt(req.params.id)) return error(res, '不能将自己设为上级');
    
    // 检查是否会形成循环引用（简单检查：确保目标不是自己的下级）
    function isDescendant(userId, targetId, depth = 0) {
      if (depth > 20) return false;
      const children = await db.prepare('SELECT id FROM users WHERE parent_id = ? AND is_deleted = 0').all(userId);
      for (const child of children) {
        if (child.id === targetId) return true;
        if (isDescendant(child.id, targetId, depth + 1)) return true;
      }
      return false;
    }
    if (isDescendant(req.params.id, parent_id)) return error(res, '不能将下级设为自己的上级（会形成循环）');
    
    db.prepare("UPDATE users SET parent_id = ?, updated_at = datetime('now','localtime') WHERE id = ?")
      .run(parent_id, req.params.id);
    
    return success(res, { 
      userId: user.id,
      newParentId: parent_id,
      newParentName: targetParent.username
    }, `已将 ${user.username} 的上级设置为 ${targetParent.username}`);
  } else {
    // 解绑上级（清空parent_id）
    db.prepare("UPDATE users SET parent_id = NULL, updated_at = datetime('now','localtime') WHERE id = ?")
      .run(req.params.id);
    
    return success(res, { 
      userId: user.id
    }, `已解绑 ${user.username} 的上级关系`);
  }
});

// GET /api/users/:id/upline-chain - 查询用户的完整上级链路
router.get('/:id/upline-chain', async (req, res) => {
  const db = getDB();
  const maxDepth = 20;
  const visited = new Set();
  const chain = [];
  
  let currentUserId = await db.prepare('SELECT parent_id FROM users WHERE id = ? AND is_deleted = 0').get(req.params.id)?.parent_id;
  
  while (currentUserId && visited.size < maxDepth) {
    if (visited.has(currentUserId)) break; // 防循环
    visited.add(currentUserId);
    
    const upper = db.prepare(`
      SELECT u.id, u.username, u.real_name, u.phone, u.agent_level, u.invite_code,
             (SELECT COUNT(*) FROM users sub WHERE sub.parent_id = u.id AND sub.is_deleted = 0) as direct_members
      FROM users u WHERE u.id = ? AND u.is_deleted = 0
    `).get(currentUserId);
    
    if (!upper) break;
    
    chain.push({
      ...upper,
      levelName: ['','会员','打版代言人','代理商','批发商','首席分公司','集团事业部'][upper.agent_level] || '未知',
      relation: chain.length === 0 ? '直属上级' : `上${'上'.repeat(chain.length)}级`,
    });
    
    currentUserId = upper.parent_id;
  }
  
  // 同时返回直属下级信息
  const directDownlines = db.prepare(`
    SELECT id, username, real_name, phone, agent_level, total_income, created_at
    FROM users WHERE parent_id = ? AND is_deleted = 0 ORDER BY agent_level DESC, created_at ASC
  `).all(req.params.id);
  
  return success(res, { 
    userId: parseInt(req.params.id),
    uplineChain: chain, 
    uplineCount: chain.length,
    downlines: directDownlines.map(d => ({
      ...d,
      levelName: ['','会员','打版代言人','代理商','批发商','首席分公司','集团事业部'][d.agent_level] || '未知',
    })),
    downlineCount: directDownlines.length,
  });
});

// GET /api/users/check-invite-code - 验证邀请码是否有效，返回对应用户信息
router.get('/check-invite-code', async (req, res) => {
  const db = getDB();
  const { code } = req.query;
  if (!code) return error(res, '请提供邀请码');
  
  const user = db.prepare(
    "SELECT id, username, real_name, phone, avatar_url, agent_level, invite_code FROM users WHERE invite_code = ? AND is_deleted = 0"
  ).get(code.trim());
  
  if (!user) return error(res, '邀请码不存在或已失效');
  
  return success(res, {
    id: user.id,
    username: user.username,
    real_name: user.real_name || '',
    avatar_url: user.avatar_url || '',
    agentLevel: user.agent_level,
    inviteCode: user.invite_code,
  }, '邀请码验证成功');
});

// PUT /api/users/:id/invite-code - 管理员修改用户邀请码
router.put('/:id/invite-code', async (req, res) => {
  const db = getDB();
  const userId = parseInt(req.params.id);
  if (!userId || isNaN(userId)) return error(res, '无效的用户ID');
  
  let { new_code } = req.body;
  
  // 如果 new_code 为空或为 "random"，自动生成4位随机码
  if (!new_code || String(new_code).trim() === '' || String(new_code).toLowerCase() === 'random') {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code;
    let attempts = 0;
    do {
      code = '';
      for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
      attempts++;
      if (attempts > 20) return error(res, '生成邀请码失败，请重试');
    } while (await db.prepare('SELECT 1 FROM users WHERE invite_code = ? AND id != ?').get(code, userId));
    new_code = code;
  } else {
    new_code = String(new_code).trim().toUpperCase();
    if (new_code.length < 2 || new_code.length > 10) return error(res, '邀请码长度应在2-10位之间');
    
    // 检查唯一性（排除自己）
    const existing = await db.prepare('SELECT id, username FROM users WHERE invite_code = ? AND id != ? AND is_deleted = 0').get(new_code, userId);
    if (existing) return error(res, `邀请码已被用户「${existing.username}」使用`);
  }
  
  await db.prepare('UPDATE users SET invite_code = ?, updated_at = datetime("now","localtime") WHERE id = ?').run(new_code, userId);
  return success(res, { invite_code: new_code }, '邀请码已更新');
});

// GET /api/users/:id/balance - 查询用户当前余额
router.get('/:id/balance', async (req, res) => {
  const db = getDB();
  const user = await db.prepare('SELECT id, username, real_name, balance FROM users WHERE id = ? AND is_deleted = 0').get(req.params.id);
  if (!user) return error(res, '用户不存在', 404);
  return success(res, { userId: user.id, balance: user.balance || 0 });
});

// POST /api/users/:id/balance - 管理员调整用户余额（含审计日志）
router.post('/:id/balance', async (req, res) => {
  const db = getDB();
  const { amount, remark, operator_id, operator_name } = req.body;
  if (amount === undefined || amount === 0) return error(res, '调整金额不能为0');
  
  const user = await db.prepare('SELECT id, username, balance FROM users WHERE id = ? AND is_deleted = 0').get(req.params.id);
  if (!user) return error(res, '用户不存在', 404);
  
  const balanceBefore = user.balance;
  const balanceAfter = parseFloat((balanceBefore + amount).toFixed(2));
  
  if (balanceAfter < 0) return error(res, '调整后余额不能为负数');
  
  try {
    const doAdjust = db.transaction(() => {
      db.prepare('UPDATE users SET balance = ?, updated_at = datetime(\'now\',\'localtime\') WHERE id = ?')
        .run(balanceAfter, req.params.id);
      db.prepare(`
        INSERT INTO balance_logs (user_id, change_type, change_amount, balance_before, balance_after, 
          operator_id, operator_name, remark)
        VALUES (?, 'manual', ?, ?, ?, ?, ?, ?)
      `).run(req.params.id, amount, balanceBefore, balanceAfter, operator_id || null, operator_name || 'system', remark || '');
    });
    doAdjust();
    
    return success(res, { 
      userId: user.id, 
      balanceBefore, 
      balanceAfter, 
      changeAmount: amount 
    }, amount > 0 ? '余额增加成功' : '余额扣减成功');
  } catch (err) {
    return error(res, '余额调整失败: ' + err.message);
  }
});

// GET /api/users/:id/balance-logs - 用户余额变动日志
router.get('/:id/balance-logs', async (req, res) => {
  const db = getDB();
  const { page = 1, pageSize = 20, type } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(pageSize);
  
  let where = ['user_id = ?'];
  let params = [req.params.id];
  if (type) { where.push('change_type = ?'); params.push(type); }
  
  const whereClause = 'WHERE ' + where.join(' AND ');
  const total = await db.prepare(`SELECT COUNT(*) as cnt FROM balance_logs ${whereClause}`).get(...params).cnt;
  const logs = db.prepare(`
    SELECT * FROM balance_logs ${whereClause}
    ORDER BY created_at DESC LIMIT ? OFFSET ?
  `).all(...params, parseInt(pageSize), offset);
  
  return success(res, { list: logs, total, page: parseInt(page), pageSize: parseInt(pageSize) });
});

// DELETE /api/users/:id - 软删除用户
router.delete('/:id', async (req, res) => {
  const db = getDB();
  await db.prepare('UPDATE users SET is_deleted = 1, updated_at = datetime(\'now\',\'localtime\') WHERE id = ?').run(req.params.id);
  return success(res, null, '用户已删除');
});

// GET /api/users/:id/team-tree - 获取用户下级树形结构
router.get('/:id/team-tree', async (req, res) => {
  const db = getDB();
  
  function buildTree(parentId) {
    const children = db.prepare(`
      SELECT id, username, real_name, phone, agent_level, total_income, status, avatar_url,
             (SELECT COUNT(*) FROM orders WHERE user_id = users.id) as order_count
      FROM users WHERE parent_id = ? AND is_deleted = 0 ORDER BY created_at
    `).all(parentId);
    
    return children.map(child => ({
      ...child,
      children: buildTree(child.id)
    }));
  }
  
  const user = await db.prepare('SELECT id, username, real_name, agent_level FROM users WHERE id = ?').get(req.params.id);
  if (!user) return error(res, '用户不存在', 404);
  
  return success(res, { ...user, children: buildTree(req.params.id) });
});

module.exports = router;
