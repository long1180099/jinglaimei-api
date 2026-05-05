/**
 * 库存管理路由
 * /api/inventory
 *
 * 功能: 入库/出库/库存列表/记录查询/统计报表
 */
const express = require('express');
const router = express.Router();
const { getDB } = require('../utils/db');
const { success, error } = require('../utils/response');

// ==================== 库存商品管理 ====================

// GET /api/inventory - 库存商品列表（带分页+搜索）
router.get('/', async (req, res) => {
  const db = getDB();
  const { page = 1, pageSize = 10, keyword, category, status } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(pageSize);

  let where = [];
  let params = [];
  if (keyword) {
    where.push('(s.product_name LIKE ? OR s.product_code LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  if (category && category !== 'all') { where.push('s.category = ?'); params.push(category); }
  if (status !== undefined && status !== '') { where.push('s.status = ?'); params.push(parseInt(status)); }

  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

  const total = await db.prepare(`SELECT COUNT(*) as cnt FROM inventory_stock s ${whereClause}`).get(...params).cnt;

  const list = db.prepare(`
    SELECT s.*,
           (SELECT COUNT(*) FROM inventory_records r WHERE r.stock_id = s.id) as record_count,
           (SELECT SUM(cost_total) FROM inventory_records r WHERE r.stock_id = s.id AND r.record_type='in') as total_in_cost,
           (SELECT SUM(freight) FROM inventory_records r WHERE r.stock_id = s.id AND r.record_type='in') as total_in_freight
    FROM inventory_stock s
    ${whereClause}
    ORDER BY s.updated_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(pageSize), offset);

  // 聚合统计概览
  const overview = db.prepare(`
    SELECT COUNT(*) as totalProducts,
           COALESCE(SUM(quantity), 0) as totalQuantity,
           COALESCE(SUM(total_cost), 0) as totalCost,
           COALESCE(SUM(total_freight), 0) as totalFreight,
           COALESCE(SUM(quantity * avg_cost), 0) as stockValue
    FROM inventory_stock WHERE status = 1
  `).get();

  return success(res, { list, total, page: parseInt(page), pageSize: parseInt(pageSize), overview });
});

// GET /api/inventory/categories - 获取所有分类（去重）
router.get('/categories', async (req, res) => {
  const db = getDB();
  const categories = db.prepare(`
    SELECT DISTINCT category, COUNT(*) as count
    FROM inventory_stock WHERE status = 1 GROUP BY category ORDER BY category
  `).all();
  return success(res, categories);
});

// GET /api/inventory/stats - 统计概览
router.get('/stats', async (req, res) => {
  const db = getDB();

  // 基础统计
  const overview = db.prepare(`
    SELECT COUNT(*) as totalProducts,
           SUM(CASE WHEN quantity <= min_alert AND status=1 THEN 1 ELSE 0 END) as lowStockCount,
           COALESCE(SUM(CASE WHEN status=1 THEN quantity ELSE 0 END), 0) as totalQuantity,
           COALESCE(SUM(CASE WHEN status=1 THEN total_cost ELSE 0 END), 0) as totalCost,
           COALESCE(SUM(CASE WHEN status=1 THEN total_freight ELSE 0 END), 0) as totalFreight,
           COALESCE(SUM(CASE WHEN status=1 THEN quantity * avg_cost ELSE 0 END), 0) as stockValue
    FROM inventory_stock
  `).get();

  // 今日入库统计
  const today = new Date().toISOString().slice(0, 10);
  const todayStats = db.prepare(`
    SELECT COALESCE(SUM(quantity), 0) as todayInQty,
           COALESCE(SUM(cost_total), 0) as todayInCost,
           COALESCE(SUM(freight), 0) as todayFreight,
           COUNT(*) as todayRecords
    FROM inventory_records WHERE record_type = 'in' AND created_at LIKE ?
  `).get(`${today}%`);

  // 本月统计
  const monthStart = today.slice(0, 7);
  const monthStats = db.prepare(`
    SELECT COALESCE(SUM(CASE WHEN record_type='in' THEN quantity ELSE 0 END), 0) as monthInQty,
           COALESCE(SUM(CASE WHEN record_type='out' THEN quantity ELSE 0 END), 0) as monthOutQty,
           COALESCE(SUM(CASE WHEN record_type='in' THEN cost_total ELSE 0 END), 0) as monthInCost
    FROM inventory_records WHERE created_at LIKE ?
  `).get(`${monthStart}%`);

  return success(res, { ...overview, ...todayStats, ...monthStats });
});

// GET /api/inventory/report - 数据报表（按日/月/年）
router.get('/report', async (req, res) => {
  const db = getDB();
  const { type = 'month', year, month } = req.query; // day | month | year

  let sql, labelFormat;
  const now = new Date();
  const currentYear = year || now.getFullYear();
  const currentMonth = month || String(now.getMonth() + 1).padStart(2, '0');

  if (type === 'day') {
    // 日统计 - 当月每天
    labelFormat = "substr(created_at, 12, 2)";
    sql = `
      SELECT ${labelFormat} as label,
             SUM(CASE WHEN record_type='in' THEN quantity ELSE 0 END) as inQty,
             SUM(CASE WHEN record_type='out' THEN quantity ELSE 0 END) as outQty,
             SUM(CASE WHEN record_type='in' THEN cost_total ELSE 0 END) as inCost,
             SUM(CASE WHEN record_type='in' THEN freight ELSE 0 END) as inFreight,
             COUNT(*) as recordCount
      FROM inventory_records
      WHERE created_at LIKE '${currentYear}-${currentMonth}%' OR created_at LIKE '${currentYear}-${parseInt(currentMonth)}%'
      GROUP BY ${labelFormat} ORDER BY label
    `;
  } else if (type === 'year') {
    // 年统计 - 每月汇总
    sql = `
      SELECT substr(created_at, 6, 2) as label,
             SUM(CASE WHEN record_type='in' THEN quantity ELSE 0 END) as inQty,
             SUM(CASE WHEN record_type='out' THEN quantity ELSE 0 END) as outQty,
             SUM(CASE WHEN record_type='in' THEN cost_total ELSE 0 END) as inCost,
             SUM(CASE WHEN record_type='in' THEN freight ELSE 0 END) as inFreight,
             COUNT(*) as recordCount
      FROM inventory_records WHERE created_at LIKE '${currentYear}%'
      GROUP BY substr(created_at, 6, 2) ORDER BY label
    `;
  } else {
    // 月统计（默认）- 每月汇总近12个月
    sql = `
      SELECT substr(created_at, 1, 7) as label,
             SUM(CASE WHEN record_type='in' THEN quantity ELSE 0 END) as inQty,
             SUM(CASE WHEN record_type='out' THEN quantity ELSE 0 END) as outQty,
             SUM(CASE WHEN record_type='in' THEN cost_total ELSE 0 END) as inCost,
             SUM(CASE WHEN record_type='in' THEN freight ELSE 0 END) as inFreight,
             COUNT(*) as recordCount
      FROM inventory_records
      GROUP BY substr(created_at, 1, 7)
      ORDER BY label DESC LIMIT 12
    `;
  }

  const data = await db.prepare(sql).all();

  // TOP5 商品排行
  const top5 = db.prepare(`
    SELECT product_name, SUM(CASE WHEN record_type='in' THEN quantity ELSE 0 END) as totalIn,
           SUM(CASE WHEN record_type='out' THEN quantity ELSE 0 END) as totalOut,
           SUM(cost_total) as totalCost
    FROM inventory_records GROUP BY product_name ORDER BY totalIn DESC LIMIT 5
  `).all();

  return success(res, { data, top5, type });
});

// POST /api/inventory - 入库操作（同步更新products表）
router.post('/', async (req, res) => {
  const db = getDB();
  const {
    product_name, product_code, category, unit, quantity,
    unit_cost, freight, remark, supplier, batch_no
  } = req.body;

  if (!product_name) return error(res, '商品名称不能为空');
  if (!quantity || quantity <= 0) return error(res, '入库数量必须大于0');

  const costTotal = (quantity * (unit_cost || 0));

  const insertRecord = db.transaction(() => {
    // 1. 尝试在 products 表中查找对应商品（用于同步）
    let product = await db.prepare("SELECT id FROM products WHERE product_name = ? AND status != 0").get(product_name);

    // 2. 查找或创建库存商品
    let stock = await db.prepare("SELECT * FROM inventory_stock WHERE product_name = ?").get(product_name);

    if (stock) {
      // 更新现有库存 - 加权平均成本法
      const oldQty = stock.quantity;
      const oldAvgCost = stock.avg_cost;
      const newQty = oldQty + quantity;
      const newAvgCost = newQty > 0 ? ((oldQty * oldAvgCost) + costTotal) / newQty : unit_cost || 0;

      db.prepare(`
        UPDATE inventory_stock SET
          quantity = ?, total_in = total_in + ?,
          avg_cost = ?, total_cost = total_cost + ?,
          total_freight = total_freight + ?,
          updated_at = datetime('now','localtime')
        WHERE id = ?
      `).run(newQty, quantity, parseFloat(newAvgCost.toFixed(4)), costTotal, freight || 0, stock.id);

      stock = { ...stock, quantity: newQty, avg_cost: newAvgCost };
    } else {
      // 新建库存商品 — 尝试关联到产品表
      const result = db.prepare(`
        INSERT INTO inventory_stock (product_id, product_name, product_code, category, unit, quantity, total_in,
          avg_cost, total_cost, total_freight, remark)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        product?.id || null,
        product_name, product_code || '', category || '未分类', unit || '件',
        quantity, quantity, unit_cost || 0, costTotal, freight || 0, remark || ''
      );

      stock = { id: result.lastInsertRowid, quantity, avg_cost: unit_cost || 0 };

      // 如果之前没有 product_id，现在补上
      if (!stock.product_id && product?.id) {
        await db.prepare('UPDATE inventory_stock SET product_id = ? WHERE id = ?').run(product.id, stock.id);
        stock.product_id = product.id;
      }
    }

    // 3. 【关键】同步更新 products 表的库存字段
    if (product) {
      const prodInfo = await db.prepare('SELECT stock_quantity FROM products WHERE id = ?').get(product.id);
      if (prodInfo) {
        await db.prepare('UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?').run(quantity, product.id);
      }
    }

    // 4. 创建入库记录
    const recordResult = db.prepare(`
      INSERT INTO inventory_records (stock_id, product_name, record_type, quantity, unit_cost,
        cost_total, freight, stock_before, stock_after, remark, supplier, batch_no)
      VALUES (?, ?, 'in', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(stock.id, product_name, quantity, unit_cost || 0, costTotal, freight || 0,
      stock.quantity - quantity, stock.quantity, remark || '', supplier || '', batch_no || '');

    return { 
      stockId: stock.id, recordId: recordResult.lastInsertRowid, 
      newStock: stock.quantity, 
      syncedProductId: product?.id || null 
    };
  });

  try {
    const result = insertRecord();
    return success(res, result, '入库成功', 201);
  } catch (err) {
    return error(res, '入库失败: ' + err.message);
  }
});

// POST /api/inventory/out - 出库操作
router.post('/out', async (req, res) => {
  const db = getDB();
  const { stock_id, quantity, remark, operator } = req.body;

  if (!stock_id) return error(res, '请选择出库商品');
  if (!quantity || quantity <= 0) return error(res, '出库数量必须大于0');

  const stock = await db.prepare('SELECT * FROM inventory_stock WHERE id = ?').get(stock_id);
  if (!stock) return error(res, '商品不存在', 404);
  if (stock.quantity < quantity) return error(res, `库存不足！当前库存仅 ${stock.quantity}${stock.unit}`);

  const outTransaction = db.transaction(() => {
    const newQty = stock.quantity - quantity;

    db.prepare(`
      UPDATE inventory_stock SET
        quantity = ?, total_out = total_out + ?,
        updated_at = datetime('now','localtime')
      WHERE id = ?
    `).run(newQty, quantity, stock_id);

    // 同步更新 products 表的 sold_quantity
    if (stock.product_id) {
      db.prepare("UPDATE products SET sold_quantity = sold_quantity + ?, updated_at = datetime('now','localtime') WHERE id = ?")
        .run(quantity, stock.product_id);
    }

    const recordResult = db.prepare(`
      INSERT INTO inventory_records (stock_id, product_name, record_type, quantity,
        stock_before, stock_after, remark, operator)
      VALUES (?, ?, 'out', ?, ?, ?, ?, ?)
    `).run(stock_id, stock.product_name, quantity, stock.quantity, newQty, remark || '', operator || '管理员');

    return { recordId: recordResult.lastInsertRowid, newStock: newQty };
  });

  try {
    const result = outTransaction();
    return success(res, result, '出库成功');
  } catch (err) {
    return error(res, '出库失败: ' + err.message);
  }
});

// ==================== 特供产品出货 ====================
// 注意：这两个路由必须在 /:id 之前注册，否则 :id 会拦截

// GET /api/inventory/search-members - 搜索会员（按姓名/用户名模糊匹配）
router.get('/search-members', async (req, res) => {
  const db = getDB();
  const { keyword } = req.query;

  if (!keyword || keyword.trim().length === 0) {
    return success(res, []);
  }

  const kw = `%${keyword.trim()}%`;
  const members = db.prepare(`
    SELECT id, username, real_name, phone, agent_level,
           COALESCE(real_name, username) as display_name
    FROM users
    WHERE status = 1
      AND (real_name LIKE ? OR username LIKE ? OR phone LIKE ?)
    ORDER BY
      CASE WHEN real_name LIKE ? THEN 0 ELSE 1 END,
      agent_level DESC
    LIMIT 20
  `).all(kw, kw, kw, kw);

  return success(res, members);
});

// POST /api/inventory/special-out - 特供产品出货（不扣余额，只减库存）
router.post('/special-out', async (req, res) => {
  const db = getDB();
  const {
    stock_id,          // 库存商品ID（必填）
    member_id,         // 领取会员ID（必填）
    quantity,          // 出库数量（必填）
    remark             // 备注
  } = req.body;

  // 参数校验
  if (!stock_id) return error(res, '请选择出库商品');
  if (!member_id) return error(res, '请搜索并选择领取会员');
  if (!quantity || quantity <= 0) return error(res, '出库数量必须大于0');

  // 查询库存商品
  const stock = await db.prepare('SELECT * FROM inventory_stock WHERE id = ?').get(stock_id);
  if (!stock) return error(res, '库存商品不存在', 404);
  if (stock.quantity < quantity) return error(res, `库存不足！当前仅剩 ${stock.quantity}${stock.unit}`);

  // 查询会员信息（确认存在）
  const member = await db.prepare('SELECT id, real_name, username, agent_level FROM users WHERE id = ? AND status = 1').get(member_id);
  if (!member) return error(res, '会员不存在或已禁用', 404);

  const memberName = member.real_name || member.username;

  // 执行出库事务
  const outTransaction = db.transaction(() => {
    const newQty = stock.quantity - quantity;

    // 1. 减少库存
    db.prepare(`
      UPDATE inventory_stock SET
        quantity = ?, total_out = total_out + ?,
        updated_at = datetime('now','localtime')
      WHERE id = ?
    `).run(newQty, quantity, stock_id);

    // 2. 同步更新 products 表的 sold_quantity（如果有关联）
    if (stock.product_id) {
      db.prepare("UPDATE products SET sold_quantity = sold_quantity + ?, updated_at = datetime('now','localtime') WHERE id = ?")
        .run(quantity, stock.product_id);
    }

    // 3. 写入出库记录（record_type='out'，remark标注特供出货+会员信息）
    const recordResult = db.prepare(`
      INSERT INTO inventory_records (
        stock_id, product_name, record_type, quantity,
        stock_before, stock_after, remark, operator
      ) VALUES (?, ?, 'out', ?, ?, ?, ?, ?)
    `).run(
      stock_id, stock.product_name, quantity,
      stock.quantity, newQty,
      `【特供出货】领取人: ${memberName}(ID:${member_id}, Lv.${member.agent_level || 1})${remark ? ' | ' + remark : ''}`,
      '管理员'
    );

    return {
      recordId: recordResult.lastInsertRowid,
      newStock: newQty,
      productName: stock.product_name,
      memberName: memberName,
      memberLevel: member.agent_level || 1
    };
  });

  try {
    const result = outTransaction();
    console.log(`[特供出货] 商品=${result.productName} ×${quantity} → ${result.memberName}(Lv.${result.memberLevel}) 剩余库存=${result.newStock}`);
    return success(res, result, '✅ 特供出货成功');
  } catch (err) {
    return error(res, '特供出货失败: ' + err.message);
  }
});

// GET /api/inventory/:id - 商品详情（含所有出入库记录）
router.get('/:id', async (req, res) => {
  const db = getDB();
  const stock = await db.prepare('SELECT * FROM inventory_stock WHERE id = ?').get(req.params.id);
  if (!stock) return error(res, '商品不存在', 404);

  // 分页获取记录
  const { page = 1, pageSize = 20, type } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(pageSize);

  let where = ['stock_id = ?'];
  let params = [req.params.id];
  if (type && type !== 'all') { where.push('record_type = ?'); params.push(type); }

  const records = db.prepare(`
    SELECT * FROM inventory_records
    WHERE ${where.join(' AND ')}
    ORDER BY created_at DESC LIMIT ? OFFSET ?
  `).all(...params, parseInt(pageSize), offset);

  const total = await db.prepare(`SELECT COUNT(*) as cnt FROM inventory_records WHERE ${where.join(' AND ')}`).get(...params).cnt;

  return success(res, { ...stock, records, total, page: parseInt(page), pageSize: parseInt(pageSize) });
});

// PUT /api/inventory/:id - 编辑库存商品信息
router.put('/:id', async (req, res) => {
  const db = getDB();
  const { product_name, product_code, category, unit, min_alert, remark, status } = req.body;

  const stock = await db.prepare('SELECT id FROM inventory_stock WHERE id = ?').get(req.params.id);
  if (!stock) return error(res, '商品不存在', 404);

  const fields = [];
  const params = [];

  if (product_name !== undefined) { fields.push('product_name = ?'); params.push(product_name); }
  if (product_code !== undefined) { fields.push('product_code = ?'); params.push(product_code); }
  if (category !== undefined) { fields.push('category = ?'); params.push(category); }
  if (unit !== undefined) { fields.push('unit = ?'); params.push(unit); }
  if (min_alert !== undefined) { fields.push('min_alert = ?'); params.push(min_alert); }
  if (remark !== undefined) { fields.push('remark = ?'); params.push(remark); }
  if (status !== undefined) { fields.push('status = ?'); params.push(status); }

  if (!fields.length) return error(res, '没有需要更新的字段');

  fields.push("updated_at = datetime('now','localtime')");
  params.push(req.params.id);

  await db.prepare(`UPDATE inventory_stock SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  return success(res, null, '更新成功');
});

// DELETE /api/inventory/:id - 删除库存商品（级联删除记录）
router.delete('/:id', async (req, res) => {
  const db = getDB();
  const stock = await db.prepare('SELECT id FROM inventory_stock WHERE id = ?').get(req.params.id);
  if (!stock) return error(res, '商品不存在', 404);

  await db.prepare('DELETE FROM inventory_records WHERE stock_id = ?').run(req.params.id);
  await db.prepare('DELETE FROM inventory_stock WHERE id = ?').run(req.params.id);
  return success(res, null, '删除成功');
});

module.exports = router;
