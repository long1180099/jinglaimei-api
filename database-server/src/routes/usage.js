/**
 * 管理后台 - 产品使用日志 API
 * 挂载路径：/api/usage-logs
 * 鉴权方式：authMiddleware（与 users/orders 一致）
 */
const express = require('express');
const router = express.Router();
const { getDB } = require('../utils/db');
const { success, error } = require('../utils/response');

// GET /api/usage-logs - 全平台使用日志列表（分页+筛选）
router.get('/', (req, res) => {
  const db = getDB();
  const {
    page = 1, pageSize = 20,
    customer_phone, product_id, agent_id, trace_code,
    date_from, date_to, source_type
  } = req.query;

  let where = 'pul.status = 1';
  let params = [];

  if (customer_phone) {
    where += ' AND c.phone LIKE ?';
    params.push(`%${customer_phone}%`);
  }
  if (product_id) {
    where += ' AND pul.product_id = ?';
    params.push(parseInt(product_id));
  }
  if (agent_id) {
    where += ' AND pul.agent_user_id = ?';
    params.push(parseInt(agent_id));
  }
  if (trace_code) {
    where += ' AND pul.trace_code = ?';
    params.push(trace_code);
  }
  if (date_from) {
    where += ' AND pul.start_date >= ?';
    params.push(date_from);
  }
  if (date_to) {
    where += ' AND pul.start_date <= ?';
    params.push(date_to);
  }
  if (source_type) {
    where += ' AND pul.source_type = ?';
    params.push(source_type);
  }

  const total = db.prepare(`
    SELECT COUNT(*) as cnt FROM product_usage_logs pul
    LEFT JOIN customers c ON pul.customer_id = c.id
    WHERE ${where}
  `).get(...params).cnt;

  const offset = (parseInt(page) - 1) * parseInt(pageSize);
  params.push(parseInt(pageSize), offset);

  const list = db.prepare(`
    SELECT pul.*,
           c.name as customer_name, c.phone as customer_phone,
           p.product_name, p.product_code, p.image_gallery,
           u1.username as agent_name, u1.phone as agent_phone, u1.agent_level as agent_level,
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

  return success(res, { list, total, page: parseInt(page), pageSize: parseInt(pageSize) });
});

// GET /api/usage-logs/export - 导出 Excel（必须放在 /:id 之前）
router.get('/export', async (req, res) => {
  try {
    const db = getDB();
    const XLSX = require('xlsx');
    const {
      customer_phone, product_id, agent_id, trace_code,
      date_from, date_to, source_type
    } = req.query;

    let where = 'pul.status = 1';
    let params = [];

    if (customer_phone) {
      where += ' AND c.phone LIKE ?';
      params.push(`%${customer_phone}%`);
    }
    if (product_id) {
      where += ' AND pul.product_id = ?';
      params.push(parseInt(product_id));
    }
    if (agent_id) {
      where += ' AND pul.agent_user_id = ?';
      params.push(parseInt(agent_id));
    }
    if (trace_code) {
      where += ' AND pul.trace_code = ?';
      params.push(trace_code);
    }
    if (date_from) {
      where += ' AND pul.start_date >= ?';
      params.push(date_from);
    }
    if (date_to) {
      where += ' AND pul.start_date <= ?';
      params.push(date_to);
    }
    if (source_type) {
      where += ' AND pul.source_type = ?';
      params.push(source_type);
    }

    // 限制最多导出 5000 条
    const list = db.prepare(`
      SELECT pul.id, c.name as customer_name, c.phone as customer_phone,
             p.product_name, p.product_code,
             pul.trace_code, pul.start_date, pul.usage_instructions,
             u1.username as agent_name, u1.phone as agent_phone,
             u2.username as created_by_name,
             pul.source_type, pul.created_at
      FROM product_usage_logs pul
      LEFT JOIN customers c ON pul.customer_id = c.id
      LEFT JOIN products p ON pul.product_id = p.id
      LEFT JOIN users u1 ON pul.agent_user_id = u1.id
      LEFT JOIN users u2 ON pul.created_by_user_id = u2.id
      WHERE ${where}
      ORDER BY pul.created_at DESC
      LIMIT 5000
    `).all(...params);

    // 等级映射
    const levelMap = ['', '会员', '打版代言人', '代理商', '批发商', '首席分公司', '集团事业部'];
    const sourceMap = { self: '自己录入', superior: '上级代填' };

    // 构建表格数据
    const data = list.map((row, index) => ({
      '序号': index + 1,
      '顾客姓名': row.customer_name || '',
      '顾客手机号': row.customer_phone || '',
      '产品名称': row.product_name || '',
      '产品编码': row.product_code || '',
      '溯源码': row.trace_code || '',
      '开始使用日期': row.start_date || '',
      '使用说明': row.usage_instructions || '',
      '负责代理商': row.agent_name || '',
      '代理商手机号': row.agent_phone || '',
      '录入人': row.created_by_name || '',
      '录入来源': sourceMap[row.source_type] || row.source_type,
      '录入时间': row.created_at || ''
    }));

    // 生成 Excel
    const ws = XLSX.utils.json_to_sheet(data);
    // 设置列宽
    ws['!cols'] = [
      { wch: 6 },   // 序号
      { wch: 12 },  // 顾客姓名
      { wch: 15 },  // 顾客手机号
      { wch: 20 },  // 产品名称
      { wch: 15 },  // 产品编码
      { wch: 25 },  // 溯源码
      { wch: 15 },  // 开始使用日期
      { wch: 30 },  // 使用说明
      { wch: 12 },  // 负责代理商
      { wch: 15 },  // 代理商手机号
      { wch: 12 },  // 录入人
      { wch: 10 },  // 录入来源
      { wch: 20 },  // 录入时间
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '使用记录');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // 生成文件名
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
    const fileName = `产品使用记录_${dateStr}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(fileName)}`);
    res.send(buf);
  } catch (err) {
    return error(res, '导出失败: ' + err.message);
  }
});

// GET /api/usage-logs/:id - 详情
router.get('/:id', (req, res) => {
  const db = getDB();
  const log = db.prepare(`
    SELECT pul.*,
           c.name as customer_name, c.phone as customer_phone, c.notes as customer_notes, c.agent_user_id as customer_agent_id,
           p.product_name, p.product_code, p.image_gallery, p.usage_instructions as product_usage_template,
           u1.username as agent_name, u1.phone as agent_phone, u1.agent_level as agent_level, u1.real_name as agent_real_name,
           u2.username as created_by_name, u2.phone as created_by_phone
    FROM product_usage_logs pul
    LEFT JOIN customers c ON pul.customer_id = c.id
    LEFT JOIN products p ON pul.product_id = p.id
    LEFT JOIN users u1 ON pul.agent_user_id = u1.id
    LEFT JOIN users u2 ON pul.created_by_user_id = u2.id
    WHERE pul.id = ? AND pul.status = 1
  `).get(req.params.id);

  if (!log) return error(res, '记录不存在');

  return success(res, log);
});

// DELETE /api/usage-logs/:id - 软删除（仅超管）
router.delete('/:id', (req, res) => {
  // 通过 authMiddleware 的 req.user 判断角色
  const user = req.user;
  if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
    return error(res, '权限不足', 403);
  }

  const db = getDB();
  const log = db.prepare('SELECT id FROM product_usage_logs WHERE id = ? AND status = 1').get(req.params.id);
  if (!log) return error(res, '记录不存在');

  db.prepare("UPDATE product_usage_logs SET status = 0, updated_at = datetime('now','localtime') WHERE id = ?").run(req.params.id);

  return success(res, null, '删除成功');
});

module.exports = router;
