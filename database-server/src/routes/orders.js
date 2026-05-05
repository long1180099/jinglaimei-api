/**
 * 订单路由
 */
const express = require('express');
const router = express.Router();
const { getDB } = require('../utils/db');
const { success, error } = require('../utils/response');
const { processOrderRebate } = require('../services/rebateService');

function generateOrderNo() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `JLM${y}${m}${d}${rand}`;
}

// GET /api/orders - 订单列表
router.get('/', async (req, res) => {
  const db = getDB();
  const { page = 1, pageSize = 10, keyword, status, userId, startDate, endDate } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(pageSize);
  
  let where = [];
  let params = [];
  if (keyword) {
    where.push('(o.order_no LIKE ? OR u.username LIKE ? OR u.phone LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  if (status !== undefined && status !== '') { where.push('o.order_status = ?'); params.push(parseInt(status)); }
  if (userId) { where.push('o.user_id = ?'); params.push(parseInt(userId)); }
  if (startDate) { where.push("o.order_time >= ?"); params.push(startDate); }
  if (endDate) { where.push("o.order_time <= ?"); params.push(endDate + ' 23:59:59'); }
  
  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const total = await db.prepare(`SELECT COUNT(*) as cnt FROM orders o LEFT JOIN users u ON o.user_id = u.id ${whereClause}`).get(...params).cnt;
  const orders = db.prepare(`
    SELECT o.*, u.username, u.phone, u.real_name, u.agent_level
    FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
    ${whereClause}
    ORDER BY o.order_time DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(pageSize), offset);
  
  return success(res, { list: orders, total, page: parseInt(page), pageSize: parseInt(pageSize) });
});

// GET /api/orders/stats - 订单统计
router.get('/stats', async (req, res) => {
  const db = getDB();
  const total = await db.prepare('SELECT COUNT(*) as cnt FROM orders').get().cnt;
  const pending = await db.prepare('SELECT COUNT(*) as cnt FROM orders WHERE order_status = 0').get().cnt;
  const processing = await db.prepare('SELECT COUNT(*) as cnt FROM orders WHERE order_status IN (1, 2)').get().cnt;
  const completed = await db.prepare('SELECT COUNT(*) as cnt FROM orders WHERE order_status = 3').get().cnt;
  const todayAmount = await db.prepare(`SELECT COALESCE(SUM(actual_amount), 0) as val FROM orders WHERE date(order_time) = date('now') AND order_status != 4`).get().val;
  const monthAmount = await db.prepare(`SELECT COALESCE(SUM(actual_amount), 0) as val FROM orders WHERE strftime('%Y-%m', order_time) = strftime('%Y-%m','now') AND order_status != 4`).get().val;
  
  // 最近7天趋势
  const trend = db.prepare(`
    SELECT date(order_time) as date, COUNT(*) as count, COALESCE(SUM(actual_amount), 0) as amount
    FROM orders WHERE order_time >= date('now', '-7 days') AND order_status != 4
    GROUP BY date(order_time) ORDER BY date
  `).all();
  
  return success(res, { total, pending, processing, completed, todayAmount, monthAmount, trend });
});

// GET /api/orders/:id - 订单详情
router.get('/:id', async (req, res) => {
  const db = getDB();
  const order = db.prepare(`
    SELECT o.*, u.username, u.phone as user_phone, u.real_name, u.agent_level, u.balance
    FROM orders o LEFT JOIN users u ON o.user_id = u.id
    WHERE o.id = ?
  `).get(req.params.id);
  if (!order) return error(res, '订单不存在', 404);
  
  const items = db.prepare(`
    SELECT oi.*, p.main_image FROM order_items oi
    LEFT JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = ?
  `).all(req.params.id);
  
  const commission = await db.prepare('SELECT * FROM commissions WHERE order_id = ?').all(req.params.id);
  
  return success(res, { ...order, items, commission });
});

// POST /api/orders - 创建订单
router.post('/', async (req, res) => {
  const db = getDB();
  const { user_id, items, receiver_name, receiver_phone, receiver_address, shipping_fee = 0, discount_amount = 0, payment_method } = req.body;
  if (!user_id || !items?.length) return error(res, '用户ID和商品列表不能为空');
  
  const createOrder = db.transaction(() => {
    let totalAmount = 0;
    const orderItems = [];
    
    // 获取用户等级
    const orderUser = await db.prepare('SELECT agent_level FROM users WHERE id = ?').get(user_id);
    const userLevel = orderUser ? (orderUser.agent_level || 1) : 1;
    
    const priceFieldMap = { 1: 'retail_price', 2: 'vip_price', 3: 'agent_price', 4: 'wholesale_price', 5: 'chief_price', 6: 'division_price' };
    const priceField = priceFieldMap[userLevel] || 'retail_price';
    
    for (const item of items) {
      const product = await db.prepare('SELECT * FROM products WHERE id = ? AND status = 1').get(item.product_id);
      if (!product) throw new Error(`商品不存在: ${item.product_id}`);
      if ((product.stock_quantity - product.sold_quantity) < item.quantity) throw new Error(`商品库存不足: ${product.product_name}`);
      
      const unitPrice = product[priceField] || product.retail_price;
      const subtotal = unitPrice * item.quantity;
      totalAmount += subtotal;
      orderItems.push({ product, quantity: item.quantity, subtotal, unitPrice });
    }
    
    const actualAmount = totalAmount + parseFloat(shipping_fee) - parseFloat(discount_amount);
    const orderNo = generateOrderNo();
    
    const orderResult = db.prepare(`
      INSERT INTO orders (order_no, user_id, total_amount, discount_amount, shipping_fee, actual_amount,
        receiver_name, receiver_phone, receiver_address, payment_method, order_status, payment_status, order_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, datetime('now','localtime'))
    `).run(orderNo, user_id, totalAmount, discount_amount, shipping_fee, actualAmount,
           receiver_name, receiver_phone, receiver_address, payment_method);
    
    const orderId = orderResult.lastInsertRowid;
    
    for (const { product, quantity, subtotal, unitPrice } of orderItems) {
      db.prepare(`INSERT INTO order_items (order_id, product_id, product_name, product_image, unit_price, quantity, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .run(orderId, product.id, product.product_name, product.main_image, unitPrice, quantity, subtotal);
      db.prepare("UPDATE products SET sold_quantity = sold_quantity + ?, updated_at = datetime('now','localtime') WHERE id = ?")
        .run(quantity, product.id);
      
      // 同步扣减库存管理表（inventory_stock）
      const invStock = await db.prepare("SELECT id, quantity FROM inventory_stock WHERE product_id = ?").get(product.id);
      if (invStock) {
        db.prepare("UPDATE inventory_stock SET quantity = quantity - ?, total_out = total_out + ?, updated_at = datetime('now','localtime') WHERE id = ?")
          .run(quantity, quantity, invStock.id);
        // 记录出库记录
        const newQty = Math.max(0, invStock.quantity - quantity);
        db.prepare(`
          INSERT INTO inventory_records (stock_id, product_name, record_type, quantity,
            stock_before, stock_after, remark, operator)
          VALUES (?, ?, 'out', ?, ?, ?, ?, ?)
        `).run(invStock.id, product.product_name, quantity, invStock.quantity, newQty, 
               `订单${orderNo}自动出库`, '系统');
      }
    }
    
    return { orderId, orderNo, actualAmount };
  });
  
  try {
    const result = createOrder();
    return success(res, result, '订单创建成功', 201);
  } catch (err) {
    return error(res, err.message);
  }
});

// PUT /api/orders/:id/status - 更新订单状态
router.put('/:id/status', async (req, res) => {
  const db = getDB();
  const { status, remark, shippingNo } = req.body;
  const order = await db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return error(res, '订单不存在', 404);
  
  const updateOrder = db.transaction(() => {
    let extraFields = '';
    let extraParams = [];
    
    if (status === 1) { // 待发货→待发货（支付）
      extraFields = ", payment_time = datetime('now','localtime'), payment_status = 1, paid_amount = actual_amount";
    } else if (status === 2) { // 发货
      extraFields = ", shipping_time = datetime('now','localtime')";
      if (shippingNo) { extraFields += ', shipping_no = ?'; extraParams.push(shippingNo); }
    } else if (status === 3) { // 完成
      extraFields = ", confirm_time = datetime('now','localtime')";
      // 差价返利：上级赚取下级差价
      const rebateResult = processOrderRebate(order.id, order.user_id, db);
      if (rebateResult.totalRebate > 0) {
        console.log('[差价返利] 管理端完成订单' + order.id + ' 返利 ¥' + rebateResult.totalRebate);
      }
    } else if (status === 4) { // 取消 — 恢复库存
      extraFields = ", cancel_time = datetime('now','localtime')";
      
      // 恢复 products 表的 sold_quantity
      const orderItems = await db.prepare("SELECT product_id, quantity FROM order_items WHERE order_id = ?").all(order.id);
      for (const item of orderItems) {
        db.prepare("UPDATE products SET sold_quantity = MAX(0, sold_quantity - ?), updated_at = datetime('now','localtime') WHERE id = ?")
          .run(item.quantity, item.product_id);
        
        // 同步恢复 inventory_stock
        const invStock = await db.prepare("SELECT id, quantity FROM inventory_stock WHERE product_id = ?").get(item.product_id);
        if (invStock) {
          db.prepare("UPDATE inventory_stock SET quantity = quantity + ?, total_out = MAX(0, total_out - ?), updated_at = datetime('now','localtime') WHERE id = ?")
            .run(item.quantity, item.quantity, invStock.id);
          db.prepare(`
            INSERT INTO inventory_records (stock_id, product_name, record_type, quantity,
              stock_before, stock_after, remark, operator)
            VALUES (?, ?, 'in', ?, ?, ?, ?, ?)
          `).run(invStock.id, '', item.quantity, invStock.quantity, 
                 invStock.quantity + item.quantity, `订单${order.order_no}取消恢复库存`, '系统');
        }
      }
    }
    
    if (remark) { extraFields += ', seller_remark = ?'; extraParams.push(remark); }
    db.prepare(`UPDATE orders SET order_status = ?, updated_at = datetime('now','localtime') ${extraFields} WHERE id = ?`)
      .run(status, ...extraParams, req.params.id);
  });
  
  updateOrder();
  return success(res, null, '订单状态更新成功');
});

module.exports = router;
