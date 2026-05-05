/**
 * 级差利润服务层（终极版）
 *
 * 核心规则（100%匹配用户需求）：
 * - 从直属上级开始，向上逐级遍历所有上级
 * - 找到第一个【权重 > 下单用户】的上级 → 该上级赚差价（仅1人赚）
 * - 平级/级别更低 → 跳过，继续往上找
 * - 所有上级都不符合 → 无任何级差利润
 *
 * 权重 = agent_level 数字本身：1=会员 2=打版代言人 3=代理商 4=批发商 5=首席分公司 6=集团事业部
 */

const { getDB } = require('../utils/db');

// 等级对应的价格字段名（与商品表7级价格字段一一对应）
const LEVEL_PRICE_FIELD = {
  1: 'retail_price',     // 会员
  2: 'vip_price',         // 打版代言人
  3: 'agent_price',       // 代理商
  4: 'wholesale_price',   // 批发商
  5: 'chief_price',       // 首席分公司
  6: 'division_price',    // 集团事业部
};

// 等级名称映射
const LEVEL_NAMES = {
  1: '会员',
  2: '打版代言人',
  3: '代理商',
  4: '批发商',
  5: '首席分公司',
  6: '集团事业部',
};

/**
 * 获取指定用户等级对应的价格字段名
 */
function getPriceField(agentLevel) {
  return LEVEL_PRICE_FIELD[agentLevel] || LEVEL_PRICE_FIELD[1];
}

/**
 * 获取指定商品在指定等级下的价格
 */
function getPriceByLevel(product, level) {
  const field = getPriceField(level);
  const price = product[field];
  return price != null && price > 0 ? price : product.retail_price;
}

/**
 * 计算单个商品的差价返利
 * @param {Object} product - 商品记录（包含所有价格字段）
 * @param {number} buyerLevel - 买家等级权重(1-6)
 * @param {number} profitOwnerLevel - 赚取利润者等级权重(1-6)
 * @param {number} quantity - 数量
 * @returns {number} 差价金额
 */
function calcItemRebate(product, buyerLevel, profitOwnerLevel, quantity) {
  if (!product || profitOwnerLevel <= buyerLevel) return 0;
  
  // 差价 = 下级支付价 - 上级拿货价
  const buyerPrice = getPriceByLevel(product, buyerLevel);
  const ownerPrice = getPriceByLevel(product, profitOwnerLevel);
  const diff = buyerPrice - ownerPrice;
  
  return diff > 0 ? parseFloat((diff * quantity).toFixed(2)) : 0;
}

/**
 * 向上遍历上级链路，找到第一个权重大于下单用户的上级
 *
 * 规则：
 *   1. 从直属上级开始
 *   2. 判断上级权重 > 下单用户权重 → 找到了！该上级赚取
 *   3. 否则 → 继续找上上级
 *   4. 直到链路尽头或找到为止
 *   5. 仅给第一个人赚差价
 *
 * @param {number} buyerId - 下单用户ID
 * @param {number} buyerWeight - 下单用户权重(agent_level值)
 * @param {Object} db - 数据库实例
 * @returns {{ found: boolean, ownerId: number, ownerLevel: number, chain: Array }} 利润归属信息 + 遍历过的链路
 */
function findProfitOwner(buyerId, buyerWeight, db) {
  // 获取买家当前parent_id
  let currentUserId = await db.prepare('SELECT parent_id FROM users WHERE id = ?').get(buyerId)?.parent_id;
  
  if (!currentUserId) {
    return { found: false, ownerId: 0, ownerLevel: 0, chain: [], reason: '无上级' };
  }

  const visited = new Set();
  const chain = []; // 记录遍历过程（用于日志和调试）
  const maxDepth = 20; // 安全上限，防止循环引用

  while (currentUserId && visited.size < maxDepth) {
    // 防止死循环（数据异常时）
    if (visited.has(currentUserId)) {
      break;
    }
    visited.add(currentUserId);

    const upper = await db.prepare('SELECT id, agent_level, username FROM users WHERE id = ? AND is_deleted = 0').get(currentUserId);
    if (!upper) break;

    chain.push({
      userId: upper.id,
      username: upper.username,
      level: upper.agent_level,
      levelName: LEVEL_NAMES[upper.agent_level] || '未知',
    });

    // 核心判断：权重大于下单用户？
    if (upper.agent_level > buyerWeight) {
      // ✅ 找到了！这个上级赚差价
      return {
        found: true,
        ownerId: upper.id,
        ownerLevel: upper.agent_level,
        ownerUsername: upper.username,
        chain,
        reason: `${LEVEL_NAMES[upper.agent_level] || upper.agent_level}级(${upper.agent_level}) > ${LEVEL_NAMES[buyerWeight] || buyerWeight}级(${buyerWeight})`,
      };
    }

    // ❌ 平级或级别更低 → 继续往上找
    currentUserId = upper.parent_id;
  }

  // 整条链路都没人能赚
  return {
    found: false,
    ownerId: 0,
    ownerLevel: 0,
    chain,
    reason: chain.length > 0 
      ? `遍历了${chain.length}个上级，无人符合条件（全部平级或更低）`
      : '无上级链路',
  };
}

/**
 * 为订单计算并分发级差利润（核心函数 — 改造后支持多级链路）
 *
 * @param {number} orderId - 订单ID
 * @param {number} buyerId - 买家用户ID
 * @param {Object} db - 数据库实例（用于事务内调用）
 * @returns {Object} 返利汇总
 */
function processOrderRebate(orderId, buyerId, db) {
  // 1. 获取买家信息
  const buyer = await db.prepare('SELECT id, agent_level, parent_id, username FROM users WHERE id = ? AND is_deleted = 0').get(buyerId);
  if (!buyer) {
    return { totalRebate: 0, details: [], reason: '买家不存在' };
  }

  const buyerWeight = buyer.agent_level || 1;

  // 2. 向上遍历链路，找利润归属人
  const result = findProfitOwner(buyerId, buyerWeight, db);

  if (!result.found) {
    return { 
      totalRebate: 0, 
      details: [], 
      reason: result.reason || '无符合条件的上级',
      chain: result.chain,
    };
  }

  // 3. 获取订单明细
  const items = db.prepare(`
    SELECT oi.product_id, oi.product_name, oi.unit_price, oi.quantity, oi.subtotal,
           p.retail_price, p.vip_price, p.agent_price, p.partner_price,
           p.wholesale_price, p.chief_price, p.division_price
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = ?
  `).all(orderId);

  if (!items.length) {
    return { totalRebate: 0, details: [], reason: '无订单明细' };
  }

  // 4. 逐商品计算差价
  const order = await db.prepare('SELECT order_no, actual_amount FROM orders WHERE id = ?').get(orderId);
  let totalRebate = 0;
  const details = [];

  for (const item of items) {
    const rebate = calcItemRebate(item, buyerWeight, result.ownerLevel, item.quantity);
    if (rebate > 0) {
      totalRebate += rebate;

      // 写入佣金记录
      db.prepare(`
        INSERT INTO commissions (user_id, order_id, commission_type, commission_rate, 
          order_amount, commission_amount, commission_status, settlement_time, source_user_id, created_at)
        VALUES (?, ?, 3, 0, ?, ?, 1, datetime('now','localtime'), ?, datetime('now','localtime'))
      `).run(result.ownerId, orderId, item.subtotal, rebate, buyerId);

      details.push({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        buyer_price: getPriceByLevel(item, buyerWeight),
        owner_price: getPriceByLevel(item, result.ownerLevel),
        unit_diff: parseFloat((getPriceByLevel(item, buyerWeight) - getPriceByLevel(item, result.ownerLevel)).toFixed(2)),
        rebate: rebate,
      });
    }
  }

  // 5. 如果有返利，计入利润归属人的余额和累计收入
  if (totalRebate > 0) {
    db.prepare(`
      UPDATE users SET 
        balance = balance + ?,
        total_income = total_income + ?,
        today_income = COALESCE(today_income, 0) + ?,
        updated_at = datetime('now','localtime')
      WHERE id = ?
    `).run(totalRebate, totalRebate, totalRebate, result.ownerId);
  }

  return {
    totalRebate,
    details,
    orderNo: order?.order_no,
    profitOwner: {
      id: result.ownerId,
      level: result.ownerLevel,
      levelName: LEVEL_NAMES[result.ownerLevel],
      username: result.ownerUsername,
    },
    buyer: {
      id: buyerId,
      level: buyerWeight,
      levelName: LEVEL_NAMES[buyerWeight],
      username: buyer.username,
    },
    chain: result.chain,
    reason: result.reason,
  };
}

module.exports = {
  getPriceField,
  getPriceByLevel,
  calcItemRebate,
  processOrderRebate,
  findProfitOwner,
  LEVEL_PRICE_FIELD,
  LEVEL_NAMES,
};
