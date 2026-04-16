/**
 * 团队路由
 */
const express = require('express');
const router = express.Router();
const { getDB } = require('../utils/db');
const { success, error } = require('../utils/response');

// GET /api/teams - 团队列表
router.get('/', (req, res) => {
  const db = getDB();
  const { page = 1, pageSize = 10, keyword } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(pageSize);
  
  let where = ["t.status = 1"];
  let params = [];
  if (keyword) {
    where.push('(t.team_name LIKE ? OR u.username LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  
  const whereClause = 'WHERE ' + where.join(' AND ');
  const total = db.prepare(`SELECT COUNT(*) as cnt FROM teams t LEFT JOIN users u ON t.leader_id = u.id ${whereClause}`).get(...params).cnt;
  const teams = db.prepare(`
    SELECT t.*, u.username as leader_name, u.real_name as leader_real_name, u.phone as leader_phone,
           (SELECT COUNT(*) FROM users m WHERE m.team_id = t.id AND m.is_deleted = 0) as actual_member_count
    FROM teams t
    LEFT JOIN users u ON t.leader_id = u.id
    ${whereClause}
    ORDER BY t.total_sales DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(pageSize), offset);
  
  return success(res, { list: teams, total, page: parseInt(page), pageSize: parseInt(pageSize) });
});

// GET /api/teams/stats - 团队统计
router.get('/stats', (req, res) => {
  const db = getDB();
  const total = db.prepare('SELECT COUNT(*) as cnt FROM teams WHERE status = 1').get().cnt;
  const totalMembers = db.prepare('SELECT COUNT(*) as cnt FROM users WHERE is_deleted = 0 AND team_id IS NOT NULL').get().cnt;
  const totalSales = db.prepare('SELECT COALESCE(SUM(total_sales), 0) as val FROM teams WHERE status = 1').get().val;
  const avgPerformance = db.prepare('SELECT COALESCE(AVG(performance_rating), 0) as val FROM teams WHERE status = 1').get().val;
  
  return success(res, { total, totalMembers, totalSales, avgPerformance });
});

// GET /api/teams/:id - 团队详情
router.get('/:id', (req, res) => {
  const db = getDB();
  const team = db.prepare(`
    SELECT t.*, u.username as leader_name, u.real_name as leader_real_name, u.phone as leader_phone, u.avatar_url as leader_avatar
    FROM teams t LEFT JOIN users u ON t.leader_id = u.id
    WHERE t.id = ?
  `).get(req.params.id);
  if (!team) return error(res, '团队不存在', 404);
  
  const members = db.prepare(`
    SELECT u.id, u.username, u.real_name, u.phone, u.agent_level, u.total_income, u.status, u.avatar_url, u.registered_at,
           (SELECT COUNT(*) FROM orders WHERE user_id = u.id AND order_status = 3) as order_count
    FROM users u WHERE u.team_id = ? AND u.is_deleted = 0
    ORDER BY u.agent_level DESC, u.total_income DESC
  `).all(req.params.id);
  
  // 月度业绩趋势
  const performanceTrend = db.prepare(`
    SELECT ms.statistic_month, SUM(ms.sales_amount) as total_sales, SUM(ms.commission_amount) as total_commission, SUM(ms.order_count) as order_count
    FROM monthly_statistics ms
    JOIN users u ON ms.user_id = u.id
    WHERE u.team_id = ?
    GROUP BY ms.statistic_month
    ORDER BY ms.statistic_month DESC LIMIT 6
  `).all(req.params.id);
  
  return success(res, { ...team, members, performanceTrend });
});

// POST /api/teams - 创建团队
router.post('/', (req, res) => {
  const db = getDB();
  const { team_name, leader_id, description, monthly_target } = req.body;
  if (!team_name || !leader_id) return error(res, '团队名称和负责人不能为空');
  
  try {
    const result = db.prepare(`
      INSERT INTO teams (team_name, leader_id, description, monthly_target) VALUES (?, ?, ?, ?)
    `).run(team_name, leader_id, description, monthly_target || 0);
    
    db.prepare("UPDATE users SET team_id = ?, updated_at = datetime('now','localtime') WHERE id = ?")
      .run(result.lastInsertRowid, leader_id);
    
    return success(res, { id: result.lastInsertRowid }, '团队创建成功', 201);
  } catch (err) {
    return error(res, '创建失败: ' + err.message);
  }
});

// PUT /api/teams/:id - 更新团队
router.put('/:id', (req, res) => {
  const db = getDB();
  const { team_name, description, monthly_target, performance_rating, status } = req.body;
  db.prepare(`
    UPDATE teams SET 
      team_name = COALESCE(?, team_name),
      description = COALESCE(?, description),
      monthly_target = COALESCE(?, monthly_target),
      performance_rating = COALESCE(?, performance_rating),
      status = COALESCE(?, status),
      updated_at = datetime('now','localtime')
    WHERE id = ?
  `).run(team_name, description, monthly_target, performance_rating, status, req.params.id);
  return success(res, null, '更新成功');
});

// GET /api/teams/:id/ranking - 团队成员排行
router.get('/:id/ranking', (req, res) => {
  const db = getDB();
  const ranking = db.prepare(`
    SELECT u.id, u.username, u.real_name, u.avatar_url, u.agent_level, u.total_income,
           COALESCE(SUM(c.commission_amount), 0) as month_income,
           COUNT(DISTINCT o.id) as month_orders
    FROM users u
    LEFT JOIN commissions c ON u.id = c.user_id AND strftime('%Y-%m', c.created_at) = strftime('%Y-%m','now') AND c.commission_status = 1
    LEFT JOIN orders o ON u.id = o.user_id AND strftime('%Y-%m', o.order_time) = strftime('%Y-%m','now') AND o.order_status = 3
    WHERE u.team_id = ? AND u.is_deleted = 0
    GROUP BY u.id
    ORDER BY month_income DESC
  `).all(req.params.id);
  return success(res, ranking);
});

module.exports = router;
