/**
 * 仪表盘路由 - 数据分析汇总
 */
const express = require('express');
const router = express.Router();
const { getDB } = require('../utils/db');
const { success } = require('../utils/response');

// GET /api/dashboard/overview - 总览数据
router.get('/overview', (req, res) => {
  const db = getDB();
  
  const totalUsers = db.prepare('SELECT COUNT(*) as cnt FROM users WHERE is_deleted = 0').get().cnt;
  const newUsersToday = db.prepare("SELECT COUNT(*) as cnt FROM users WHERE date(registered_at) = date('now') AND is_deleted = 0").get().cnt;
  const newUsersMonth = db.prepare("SELECT COUNT(*) as cnt FROM users WHERE strftime('%Y-%m', registered_at) = strftime('%Y-%m','now') AND is_deleted = 0").get().cnt;
  
  const totalOrders = db.prepare('SELECT COUNT(*) as cnt FROM orders').get().cnt;
  const pendingOrders = db.prepare('SELECT COUNT(*) as cnt FROM orders WHERE order_status = 0').get().cnt;
  const todayOrders = db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE date(order_time) = date('now')").get().cnt;
  
  const totalSales = db.prepare("SELECT COALESCE(SUM(actual_amount), 0) as val FROM orders WHERE order_status = 3").get().val;
  const todaySales = db.prepare("SELECT COALESCE(SUM(actual_amount), 0) as val FROM orders WHERE date(order_time) = date('now') AND order_status != 4").get().val;
  const monthSales = db.prepare("SELECT COALESCE(SUM(actual_amount), 0) as val FROM orders WHERE strftime('%Y-%m', order_time) = strftime('%Y-%m','now') AND order_status != 4").get().val;
  
  const totalCommission = db.prepare("SELECT COALESCE(SUM(commission_amount), 0) as val FROM commissions WHERE commission_status = 1").get().val;
  const pendingWithdrawal = db.prepare("SELECT COALESCE(SUM(withdrawal_amount), 0) as val FROM withdrawals WHERE withdrawal_status = 0").get().val;
  
  return success(res, {
    users: { total: totalUsers, newToday: newUsersToday, newThisMonth: newUsersMonth },
    orders: { total: totalOrders, pending: pendingOrders, today: todayOrders },
    sales: { total: parseFloat(totalSales.toFixed(2)), today: parseFloat(todaySales.toFixed(2)), thisMonth: parseFloat(monthSales.toFixed(2)) },
    commissions: { total: parseFloat(totalCommission.toFixed(2)), pendingWithdrawal: parseFloat(pendingWithdrawal.toFixed(2)) }
  });
});

// GET /api/dashboard/sales-trend - 销售趋势（近30天）
router.get('/sales-trend', (req, res) => {
  const db = getDB();
  const { days = 30 } = req.query;
  
  const trend = db.prepare(`
    SELECT date(order_time) as date,
           COUNT(*) as order_count,
           COALESCE(SUM(actual_amount), 0) as sales_amount,
           COUNT(DISTINCT user_id) as active_users
    FROM orders 
    WHERE order_time >= date('now', ? || ' days') AND order_status != 4
    GROUP BY date(order_time)
    ORDER BY date ASC
  `).all(`-${days}`);
  
  return success(res, trend);
});

// GET /api/dashboard/top-products - 热销商品TOP10
router.get('/top-products', (req, res) => {
  const db = getDB();
  const topProducts = db.prepare(`
    SELECT p.id, p.product_name, p.main_image, p.agent_price,
           SUM(oi.quantity) as total_qty,
           SUM(oi.subtotal) as total_amount,
           COUNT(DISTINCT o.user_id) as buyer_count
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    JOIN orders o ON oi.order_id = o.id
    WHERE o.order_status = 3
    GROUP BY p.id
    ORDER BY total_qty DESC
    LIMIT 10
  `).all();
  return success(res, topProducts);
});

// GET /api/dashboard/agent-rank - 代理商业绩排行
router.get('/agent-rank', (req, res) => {
  const db = getDB();
  const { period = 'month' } = req.query; // month | quarter | year | all
  
  let dateFilter = '';
  if (period === 'month') dateFilter = "AND strftime('%Y-%m', o.order_time) = strftime('%Y-%m','now')";
  else if (period === 'quarter') dateFilter = "AND o.order_time >= date('now', '-90 days')";
  else if (period === 'year') dateFilter = "AND strftime('%Y', o.order_time) = strftime('%Y','now')";
  
  const ranking = db.prepare(`
    SELECT u.id, u.username, u.real_name, u.avatar_url, u.agent_level, t.team_name,
           COUNT(DISTINCT o.id) as order_count,
           COALESCE(SUM(o.actual_amount), 0) as sales_amount
    FROM users u
    LEFT JOIN orders o ON u.id = o.user_id AND o.order_status = 3 ${dateFilter}
    LEFT JOIN teams t ON u.team_id = t.id
    WHERE u.is_deleted = 0
    GROUP BY u.id
    ORDER BY sales_amount DESC
    LIMIT 20
  `).all();
  
  return success(res, ranking);
});

// GET /api/dashboard/team-performance - 团队业绩对比
router.get('/team-performance', (req, res) => {
  const db = getDB();
  const performance = db.prepare(`
    SELECT t.id, t.team_name, t.monthly_target, t.total_sales, t.performance_rating,
           t.monthly_achievement, t.team_level,
           COUNT(u.id) as member_count,
           u2.username as leader_name
    FROM teams t
    LEFT JOIN users u ON t.id = u.team_id AND u.is_deleted = 0
    LEFT JOIN users u2 ON t.leader_id = u2.id
    WHERE t.status = 1
    GROUP BY t.id
    ORDER BY t.total_sales DESC
  `).all();
  return success(res, performance);
});

// GET /api/dashboard/user-growth - 用户增长趋势
router.get('/user-growth', (req, res) => {
  const db = getDB();
  const growth = db.prepare(`
    SELECT strftime('%Y-%m', registered_at) as month,
           COUNT(*) as new_users,
           SUM(COUNT(*)) OVER (ORDER BY strftime('%Y-%m', registered_at)) as cumulative
    FROM users WHERE is_deleted = 0 AND registered_at >= date('now', '-12 months')
    GROUP BY strftime('%Y-%m', registered_at)
    ORDER BY month
  `).all();
  return success(res, growth);
});

module.exports = router;
