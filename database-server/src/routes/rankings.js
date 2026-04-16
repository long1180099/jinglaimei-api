/**
 * 排行榜管理路由 - 后台可编辑业绩排行榜配置
 * GET/PUT /api/rankings/configs  - 排行榜用户配置CRUD
 * GET/PUT /api/rankings/settings - 排行榜展示设置
 * POST /api/rankings/sync      - 手动同步排行数据
 */

const express = require('express');
const router = express.Router();
const { getDB } = require('../utils/db');
const { success, error } = require('../utils/response');

// ==================== 排行榜用户配置 ====================

// 获取排行榜配置列表（分页+搜索）
router.get('/configs', (req, res) => {
  const db = getDB();
  const { page = 1, pageSize = 10, search = '', period = 'month' } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(pageSize);

  let whereClause = "WHERE u.is_deleted = 0 AND u.status != 0";
  const params = [];

  if (search) {
    whereClause += " AND (u.username LIKE ? OR u.real_name LIKE ? OR u.phone LIKE ?)";
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  let dateFilter = '';
  if (period === 'month') {
    dateFilter = "AND strftime('%Y-%m', c.created_at) = strftime('%Y-%m','now') AND c.commission_status = 1";
  } else if (period === 'all') {
    dateFilter = "AND c.commission_status = 1";
  } else if (period === 'quarter') {
    dateFilter = "AND c.created_at >= date('now', '-90 days') AND c.commission_status = 1";
  }

  const countSql = `SELECT COUNT(DISTINCT u.id) as cnt FROM users u ${whereClause}`;
  const total = db.prepare(countSql).get(...params).cnt;

  const dataSql = `
    SELECT u.id, u.username, u.real_name, u.avatar_url, u.phone,
           u.agent_level, u.total_income, u.team_id, u.created_at,
           COALESCE(SUM(c.commission_amount), 0) as period_income,
           COUNT(DISTINCT o.id) as period_orders,
           (SELECT COUNT(*) FROM users sub WHERE sub.parent_id = u.id AND sub.is_deleted = 0) as direct_count,
           rc.rank_position, rc.display_name, rc.highlight_color, 
           rc.badge_text, rc.is_pinned, rc.is_hidden, rc.custom_note
    FROM users u
    LEFT JOIN ranking_configs rc ON u.id = rc.user_id
    LEFT JOIN commissions c ON u.id = c.user_id ${dateFilter}
    LEFT JOIN orders o ON u.id = o.user_id ${period === 'month' 
      ? "AND strftime('%Y-%m', o.order_time) = strftime('%Y-%m','now') AND o.order_status = 3" 
      : period === 'quarter' 
        ? "AND o.order_time >= date('now', '-90 days') AND o.order_status = 3"
        : "AND o.order_status = 3"}
    ${whereClause}
    GROUP BY u.id
    ORDER BY COALESCE(rc.rank_position, 9999), period_income DESC
    LIMIT ? OFFSET ?
  `;

  const list = db.prepare(dataSql).all(...params, parseInt(pageSize), offset);

  return success(res, { list, total, page: parseInt(page), pageSize: parseInt(pageSize) });
});

// 更新单个用户的排行榜配置
router.put('/configs/:userId', (req, res) => {
  const db = getDB();
  const userId = req.params.userId;
  const { rank_position, display_name, highlight_color, badge_text, is_pinned, is_hidden, custom_note } = req.body;

  const existing = db.prepare('SELECT id FROM ranking_configs WHERE user_id = ?').get(userId);
  
  if (existing) {
    db.prepare(`
      UPDATE ranking_configs SET
        rank_position = COALESCE(?, rank_position),
        display_name = COALESCE(?, display_name),
        highlight_color = COALESCE(?, highlight_color),
        badge_text = COALESCE(?, badge_text),
        is_pinned = COALESCE(?, is_pinned),
        is_hidden = COALESCE(?, is_hidden),
        custom_note = COALESCE(?, custom_note),
        updated_at = datetime('now','localtime'),
        updated_by = ?
      WHERE user_id = ?
    `).run(rank_position, display_name, highlight_color, badge_text, is_pinned, is_hidden, custom_note, (req.user && req.user.id) || null, userId);
  } else {
    db.prepare(`
      INSERT INTO ranking_configs (user_id, rank_position, display_name, highlight_color, badge_text, is_pinned, is_hidden, custom_note, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, rank_position || null, display_name || null, highlight_color || '#e94560', badge_text || null, is_pinned || 0, is_hidden || 0, custom_note || null, (req.user && req.user.id) || null);
  }

  return success(res, null, '更新成功');
});

// 批量更新排名位置
router.put('/configs/batch-position', (req, res) => {
  const db = getDB();
  const { items } = req.body;
  
  if (!Array.isArray(items)) return error(res, 'items 必须是数组');

  const update = db.prepare('UPDATE ranking_configs SET rank_position = ?, updated_at = datetime(\'now\',\'localtime\') WHERE user_id = ?');
  const insert = db.prepare(`
    INSERT OR IGNORE INTO ranking_configs (user_id, rank_position)
    VALUES (?, ?)
  `);

  const batchUpdate = db.transaction(() => {
    items.forEach(item => {
      const existing = db.prepare('SELECT id FROM ranking_configs WHERE user_id = ?').get(item.user_id);
      if (existing) {
        update.run(item.rank_position, item.user_id);
      } else {
        insert.run(item.user_id, item.rank_position);
      }
    });
  });

  try {
    batchUpdate();
    return success(res, null, '批量更新成功，共' + items.length + '条');
  } catch (err) {
    return error(res, '批量更新失败: ' + err.message);
  }
});

// ==================== 排行榜展示设置 ====================

router.get('/settings', (req, res) => {
  const db = getDB();
  const rows = db.prepare('SELECT * FROM ranking_settings ORDER BY setting_key').all();
  const settings = {};
  rows.forEach(r => { settings[r.setting_key] = r.setting_value; });
  return success(res, settings);
});

router.put('/settings', (req, res) => {
  const db = getDB();
  const updates = req.body;

  Object.keys(updates).forEach(key => {
    db.prepare(`
      INSERT INTO ranking_settings (setting_key, setting_value, description, updated_at)
      VALUES (?, ?, '', datetime('now','localtime'))
      ON CONFLICT(setting_key) DO UPDATE SET 
        setting_value = excluded.setting_value,
        updated_at = datetime('now','localtime')
    `).run(key, String(updates[key]));
  });

  return success(res, null, '设置已保存');
});

// ==================== 同步数据 ====================

router.post('/sync', (req, res) => {
  const db = getDB();
  const { limit = 50, period = 'month' } = req.body;

  let dateFilter = '';
  if (period === 'month') {
    dateFilter = "AND strftime('%Y-%m', c.created_at) = strftime('%Y-%m','now') AND c.commission_status = 1";
  } else if (period === 'all') {
    dateFilter = "AND c.commission_status = 1";
  }

  const ranking = db.prepare(`
    SELECT u.id as user_id, 
           ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(c.commission_amount),0) DESC) as auto_rank
    FROM users u
    LEFT JOIN commissions c ON u.id = c.user_id ${dateFilter}
    WHERE u.is_deleted = 0 AND u.status != 0
    GROUP BY u.id
    ORDER BY auto_rank
    LIMIT ?
  `).all(limit);

  const upsertConfig = db.prepare(`
    INSERT INTO ranking_configs (user_id, rank_position, created_at)
    VALUES (?, ?, datetime('now','localtime'))
    ON CONFLICT(user_id) DO UPDATE SET 
      rank_position = excluded.rank_position,
      updated_at = datetime('now','localtime')
  `);

  const syncTxn = db.transaction(() => {
    ranking.forEach(r => upsertConfig.run(r.user_id, r.auto_rank));
  });

  try {
    syncTxn();
    return success(res, { synced: ranking.length }, `已同步 ${ranking.length} 条记录`);
  } catch (err) {
    return error(res, '同步失败: ' + err.message);
  }
});

module.exports = router;
