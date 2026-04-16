/**
 * 收益路由
 */
const express = require('express');
const router = express.Router();
const { getDB } = require('../utils/db');
const { success, error } = require('../utils/response');

// GET /api/commissions - 收益列表
router.get('/', (req, res) => {
  const db = getDB();
  const { page = 1, pageSize = 10, userId, status, type, startDate, endDate } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(pageSize);
  
  let where = [];
  let params = [];
  if (userId) { where.push('c.user_id = ?'); params.push(parseInt(userId)); }
  if (status !== undefined && status !== '') { where.push('c.commission_status = ?'); params.push(parseInt(status)); }
  if (type) { where.push('c.commission_type = ?'); params.push(parseInt(type)); }
  if (startDate) { where.push('c.created_at >= ?'); params.push(startDate); }
  if (endDate) { where.push('c.created_at <= ?'); params.push(endDate + ' 23:59:59'); }
  
  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const total = db.prepare(`SELECT COUNT(*) as cnt FROM commissions c ${whereClause}`).get(...params).cnt;
  const commissions = db.prepare(`
    SELECT c.*, u.username, u.real_name, u.agent_level,
           o.order_no, o.order_time
    FROM commissions c
    LEFT JOIN users u ON c.user_id = u.id
    LEFT JOIN orders o ON c.order_id = o.id
    ${whereClause}
    ORDER BY c.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(pageSize), offset);
  
  return success(res, { list: commissions, total, page: parseInt(page), pageSize: parseInt(pageSize) });
});

// GET /api/commissions/stats - 收益概览
router.get('/stats', (req, res) => {
  const db = getDB();
  const totalSettled = db.prepare("SELECT COALESCE(SUM(commission_amount), 0) as val FROM commissions WHERE commission_status = 1").get().val;
  const totalPending = db.prepare("SELECT COALESCE(SUM(commission_amount), 0) as val FROM commissions WHERE commission_status = 0").get().val;
  const todayIncome = db.prepare("SELECT COALESCE(SUM(commission_amount), 0) as val FROM commissions WHERE date(created_at) = date('now') AND commission_status = 1").get().val;
  const monthIncome = db.prepare("SELECT COALESCE(SUM(commission_amount), 0) as val FROM commissions WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m','now') AND commission_status = 1").get().val;
  
  // 月度收益趋势（近6个月）
  const monthlyTrend = db.prepare(`
    SELECT strftime('%Y-%m', created_at) as month,
           SUM(CASE WHEN commission_status = 1 THEN commission_amount ELSE 0 END) as settled,
           COUNT(*) as count
    FROM commissions
    WHERE created_at >= date('now', '-6 months')
    GROUP BY strftime('%Y-%m', created_at)
    ORDER BY month
  `).all();

  // 用户收益排行（TOP10）
  const topUsers = db.prepare(`
    SELECT u.id, u.username, u.real_name, u.agent_level,
           SUM(c.commission_amount) as total_commission,
           COUNT(c.id) as commission_count
    FROM commissions c
    JOIN users u ON c.user_id = u.id
    WHERE c.commission_status = 1
    GROUP BY c.user_id
    ORDER BY total_commission DESC
    LIMIT 10
  `).all();
  
  return success(res, { totalSettled, totalPending, todayIncome, monthIncome, monthlyTrend, topUsers });
});

// GET /api/commissions/withdrawals - 提现列表
router.get('/withdrawals', (req, res) => {
  const db = getDB();
  const { page = 1, pageSize = 10, status, userId } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(pageSize);
  
  let where = [];
  let params = [];
  if (status !== undefined && status !== '') { where.push('w.withdrawal_status = ?'); params.push(parseInt(status)); }
  if (userId) { where.push('w.user_id = ?'); params.push(parseInt(userId)); }
  
  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const total = db.prepare(`SELECT COUNT(*) as cnt FROM withdrawals w ${whereClause}`).get(...params).cnt;
  const withdrawals = db.prepare(`
    SELECT w.*, u.username, u.real_name, u.phone
    FROM withdrawals w LEFT JOIN users u ON w.user_id = u.id
    ${whereClause}
    ORDER BY w.created_at DESC LIMIT ? OFFSET ?
  `).all(...params, parseInt(pageSize), offset);
  
  return success(res, { list: withdrawals, total, page: parseInt(page), pageSize: parseInt(pageSize) });
});

// PUT /api/commissions/withdrawals/:id/audit - 审核提现
router.put('/withdrawals/:id/audit', (req, res) => {
  const db = getDB();
  const { status, remark, auditUserId } = req.body; // status: 1=通过, 2=拒绝
  
  db.prepare(`
    UPDATE withdrawals SET withdrawal_status = ?, audit_user_id = ?, audit_time = datetime('now','localtime'), audit_remark = ?, updated_at = datetime('now','localtime')
    WHERE id = ?
  `).run(status, auditUserId || 1, remark, req.params.id);
  
  return success(res, null, status === 1 ? '审核通过' : '审核拒绝');
});

// POST /api/commissions/withdrawals - 申请提现
router.post('/withdrawals', (req, res) => {
  const db = getDB();
  const { user_id, withdrawal_amount, bank_name, bank_card_no, account_name } = req.body;
  if (!user_id || !withdrawal_amount) return error(res, '用户ID和提现金额不能为空');
  
  const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(user_id);
  if (!user || user.balance < withdrawal_amount) return error(res, '余额不足');
  
  const serviceFee = parseFloat((withdrawal_amount * 0.005).toFixed(2));
  const actualAmount = parseFloat((withdrawal_amount - serviceFee).toFixed(2));
  const no = 'WD' + Date.now();
  
  try {
    const doWithdraw = db.transaction(() => {
      db.prepare(`INSERT INTO withdrawals (withdrawal_no, user_id, withdrawal_amount, service_fee, actual_amount, bank_name, bank_card_no, account_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(no, user_id, withdrawal_amount, serviceFee, actualAmount, bank_name || '招商银行', bank_card_no || '', account_name || '');
      db.prepare("UPDATE users SET balance = balance - ?, frozen_balance = frozen_balance + ?, updated_at = datetime('now','localtime') WHERE id = ?")
        .run(withdrawal_amount, withdrawal_amount, user_id);
    });
    doWithdraw();
    return success(res, { withdrawalNo: no, actualAmount }, '提现申请提交成功', 201);
  } catch (err) {
    return error(res, '提现申请失败: ' + err.message);
  }
});

module.exports = router;
