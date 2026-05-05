/**
 * 轮播图管理路由
 * 基于 system_configs 表存储，config_key 格式: banner_1, banner_2, ...
 * config_value 存储JSON: { image_url, title?, link_url?, status, sort_order }
 */
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

function getDB() {
  const dbPath = path.join(__dirname, '../../data/jinglaimei.db');
  return require('better-sqlite3')(dbPath);
}

function success(res, data) {
  return res.json({ code: 0, message: 'success', data, timestamp: Date.now() });
}

function error(res, msg, code = 500) {
  return res.status(code).json({ code, message: msg, timestamp: Date.now() });
}

// ==================== 获取轮播图列表 ====================
router.get('/', async (req, res) => {
  const db = getDB();
  try {
    const rows = db.prepare(`
      SELECT id, config_key, config_value, config_type, description, sort_order, created_at, updated_at
      FROM system_configs
      WHERE config_key LIKE 'banner_%'
      ORDER BY sort_order ASC
    `).all();

    // 解析 JSON 配置值
    const banners = rows.map(r => {
      let parsed = {};
      try { parsed = JSON.parse(r.config_value || '{}'); } catch (e) {}
      return {
        id: r.id,
        key: r.config_key,
        ...parsed,
        sort_order: r.sort_order,
        created_at: r.created_at,
        updated_at: r.updated_at
      };
    });

    return success(res, { list: banners, total: banners.length });
  } catch (e) {
    console.error('[Banner] List error:', e.message);
    return error(res, '获取轮播图列表失败');
  } finally {
    db.close();
  }
});

// ==================== 获取单条轮播图 ====================
router.get('/:id', async (req, res) => {
  const db = getDB();
  try {
    const row = await db.prepare('SELECT * FROM system_configs WHERE id = ? AND config_key LIKE "banner_%"').get(req.params.id);
    if (!row) {
      return error(res, '轮播图不存在', 404);
    }
    let parsed = {};
    try { parsed = JSON.parse(row.config_value || '{}'); } catch (e) {}
    return success(res, { id: row.id, key: row.config_key, ...parsed, sort_order: row.sort_order });
  } catch (e) {
    console.error('[Banner] Get error:', e.message);
    return error(res, '获取轮播图详情失败');
  } finally {
    db.close();
  }
});

// ==================== 新增轮播图 ====================
router.post('/', async (req, res) => {
  const db = getDB();
  try {
    const { image_url, title, link_url, description, status = 1 } = req.body;

    if (!image_url) {
      return error(res, '图片地址不能为空', 400);
    }

    // 获取当前最大排序号
    const maxOrder = await db.prepare("SELECT MAX(sort_order) as max_sort FROM system_configs WHERE config_key LIKE 'banner_%'").get();
    const nextSort = (maxOrder.max_sort || 0) + 1;

    // 找到最大的 banner_N 编号
    const maxKey = await db.prepare("SELECT config_key FROM system_configs WHERE config_key LIKE 'banner_%' ORDER BY CAST(SUBSTR(config_key,8) AS INTEGER) DESC LIMIT 1").get();
    const nextNum = maxKey ? parseInt(maxKey.config_key.replace('banner_', '')) + 1 : 1;
    const configKey = `banner_${nextNum}`;

    const configValue = JSON.stringify({ id: nextNum, image_url, title, link_url, status });

    const result = db.prepare(`
      INSERT INTO system_configs (config_key, config_value, config_type, description, sort_order)
      VALUES (?, ?, 'banner', ?, ?)
    `).run(configKey, configValue, description || '', nextSort);

    const newId = result.lastInsertRowid;
    const newRow = await db.prepare('SELECT * FROM system_configs WHERE id = ?').get(newId);
    let parsed = {};
    try { parsed = JSON.parse(newRow.config_value || '{}'); } catch (e) {}

    console.log(`[Banner] 新增轮播图 #${newId}: ${configKey}`);
    return success(res, { id: newRow.id, key: newRow.config_key, ...parsed, sort_order: newRow.sort_order }, 201);
  } catch (e) {
    console.error('[Banner] Create error:', e.message);
    return error(res, '新增轮播图失败');
  } finally {
    db.close();
  }
});

// ==================== 更新轮播图 ====================
router.put('/:id', async (req, res) => {
  const db = getDB();
  try {
    const existing = await db.prepare('SELECT * FROM system_configs WHERE id = ? AND config_key LIKE "banner_%"').get(req.params.id);
    if (!existing) {
      return error(res, '轮播图不存在', 404);
    }

    const { image_url, title, link_url, description, status, sort_order } = req.body;

    let parsed = {};
    try { parsed = JSON.parse(existing.config_value || '{}'); } catch (e) {}

    // 合并更新字段
    if (image_url !== undefined) parsed.image_url = image_url;
    if (title !== undefined) parsed.title = title;
    if (link_url !== undefined) parsed.link_url = link_url;
    if (status !== undefined) parsed.status = status;

    const configValue = JSON.stringify(parsed);

    db.prepare(`
      UPDATE system_configs
      SET config_value = ?,
          description = COALESCE(?, description),
          sort_order = COALESCE(?, sort_order),
          updated_at = datetime('now','localtime')
      WHERE id = ?
    `).run(configValue, description, sort_order, req.params.id);

    console.log(`[Banner] 更新轮播图 #${req.params.id}`);
    return success(res, { id: parseInt(req.params.id), key: existing.config_key, ...parsed, sort_order: sort_order || existing.sort_order });
  } catch (e) {
    console.error('[Banner] Update error:', e.message);
    return error(res, '更新轮播图失败');
  } finally {
    db.close();
  }
});

// ==================== 删除轮播图 ====================
router.delete('/:id', async (req, res) => {
  const db = getDB();
  try {
    const existing = await db.prepare('SELECT * FROM system_configs WHERE id = ? AND config_key LIKE "banner_%"').get(req.params.id);
    if (!existing) {
      return error(res, '轮播图不存在', 404);
    }

    await db.prepare('DELETE FROM system_configs WHERE id = ?').run(req.params.id);

    console.log(`[Banner] 删除轮播图 #${req.params.id} (${existing.config_key})`);
    return success(res, { deleted: true, id: parseInt(req.params.id) });
  } catch (e) {
    console.error('[Banner] Delete error:', e.message);
    return error(res, '删除轮播图失败');
  } finally {
    db.close();
  }
});

// ==================== 批量更新排序 ====================
router.put('/batch-sort', async (req, res) => {
  const db = getDB();
  try {
    const { items } = req.body; // items: [{ id, sort_order }]
    if (!items || !Array.isArray(items)) {
      return error(res, '参数格式错误：需要 items 数组', 400);
    }

    const updateStmt = db.prepare('UPDATE system_configs SET sort_order = ?, updated_at = datetime("now","localtime") WHERE id = ?');
    for (const item of items) {
      updateStmt.run(item.sort_order, item.id);
    }

    console.log(`[Banner] 批量更新 ${items.length} 条排序`);
    return success(res, { updated: items.length });
  } catch (e) {
    console.error('[Banner] Batch sort error:', e.message);
    return error(res, '批量更新排序失败');
  } finally {
    db.close();
  }
});

// ==================== 更新状态（启用/禁用） ====================
router.patch('/:id/status', async (req, res) => {
  const db = getDB();
  try {
    const { status } = req.body;
    const existing = await db.prepare('SELECT * FROM system_configs WHERE id = ? AND config_key LIKE "banner_%"').get(req.params.id);
    if (!existing) {
      return error(res, '轮播图不存在', 404);
    }

    let parsed = {};
    try { parsed = JSON.parse(existing.config_value || '{}'); } catch (e) {}
    parsed.status = status ? 1 : 0;

    db.prepare('UPDATE system_configs SET config_value = ?, updated_at = datetime("now","localtime") WHERE id = ?')
      .run(JSON.stringify(parsed), req.params.id);

    return success(res, { id: parseInt(req.params.id), status: parsed.status });
  } catch (e) {
    console.error('[Banner] Status error:', e.message);
    return error(res, '更新状态失败');
  } finally {
    db.close();
  }
});

module.exports = router;
