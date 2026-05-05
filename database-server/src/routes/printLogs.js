/**
 * 打印记录 + 系统设置（发货人默认名）API
 */
const express = require('express');
const router = express.Router();
const { getDB } = require('../utils/db');
const { success, error } = require('../utils/response');

// ==================== 系统设置 ====================

// GET /api/print-logs/settings — 获取发货人默认名等设置
router.get('/settings', async (req, res) => {
  const db = getDB();
  const row = await db.prepare('SELECT * FROM system_settings WHERE id=1').get();
  return success(res, {
    defaultShipper: row?.default_shipper || '',
  });
});

// PUT /api/print-logs/settings — 更新发货人默认名
router.put('/settings', async (req, res) => {
  const db = getDB();
  const { defaultShipper } = req.body;
  if (typeof defaultShipper !== 'string') return error(res, '参数错误');
  
  db.prepare("UPDATE system_settings SET default_shipper=?, updated_at=datetime('now','localtime') WHERE id=1")
    .run(defaultShipper);
  return success(res, { defaultShipper }, '设置已保存');
});

// ==================== 打印记录 CRUD ====================

// POST /api/print-logs — 创建打印记录（打印成功后调用）
router.post('/', async (req, res) => {
  const db = getDB();
  const { orderId, orderNo, printType, shipperName, reviewerName, receiverName, operatorId, operatorName } = req.body;
  
  if (!orderId || !receiverName) return error(res, '订单ID和取货人不能为空');
  
  db.prepare(`
    INSERT INTO print_logs (order_id, order_no, print_type, shipper_name, reviewer_name,
      receiver_name, operator_id, operator_name)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(orderId, orderNo || '', printType || 'shipping', shipperName || '', 
         reviewerName || '', receiverName, operatorId || 0, operatorName || '');
  
  // 同步更新订单状态为"已发货"
  await db.prepare(`UPDATE orders SET order_status=2, shipping_time=datetime('now','localtime'), updated_at=datetime('now','localtime') WHERE id=? AND order_status < 2`).run(orderId);
  
  const logId = await db.prepare('SELECT last_insert_rowid() as id').get().id;
  return success(res, { id: logId }, '打印记录已保存');
});

// GET /api/print-logs — 打印记录列表（支持分页/搜索）
router.get('/', async (req, res) => {
  const db = getDB();
  const { page=1, pageSize=20, keyword, startDate, endDate, orderStatus } = req.query;
  const offset = (parseInt(page)-1)*parseInt(pageSize);
  
  let where = [];
  let params = [];
  if (keyword) {
    where.push('(pl.order_no LIKE ? OR pl.receiver_name LIKE ?)');
    params.push('%'+keyword+'%', '%'+keyword+'%');
  }
  if (startDate) { where.push('pl.created_at >= ?'); params.push(startDate); }
  if (endDate) { where.push('pl.created_at <= ?'); params.push(endDate + ' 23:59:59'); }
  
  const wc = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const total = await db.prepare(`SELECT COUNT(*) as cnt FROM print_logs pl ${wc}`).get(...params).cnt;
  
  const logs = db.prepare(`
    SELECT pl.*, o.receiver_name as order_receiver, o.receiver_phone,
      o.actual_amount, o.order_status, u.username as buyer_name
    FROM print_logs pl
    LEFT JOIN orders o ON pl.order_id = o.id
    LEFT JOIN users u ON o.user_id = u.id
    ${wc}
    ORDER BY pl.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(pageSize), offset);
  
  return success(res, { list: logs, total, page: parseInt(page), pageSize: parseInt(pageSize) });
});

// GET /api/print-logs/:orderId — 查询某订单的打印记录
router.get('/order/:orderId', async (req, res) => {
  const db = getDB();
  const logs = db.prepare(
    'SELECT * FROM print_logs WHERE order_id = ? ORDER BY created_at DESC'
  ).all(req.params.orderId);
  return success(res, logs);
});

// DELETE /api/print-logs/:id — 删除打印记录
router.delete('/:id', async (req, res) => {
  const db = getDB();
  await db.prepare('DELETE FROM print_logs WHERE id = ?').run(req.params.id);
  return success(res, null, '记录已删除');
});

module.exports = router;
