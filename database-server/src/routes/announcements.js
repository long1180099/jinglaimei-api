/**
 * 公告资讯管理路由 (管理后台)
 * 管理员可CRUD公告、设置置顶、分类等
 */
const express = require('express');
const router = express.Router();
const { getDB } = require('../utils/db');
const { success, error } = require('../utils/response');

// 确保表存在
function ensureTable() {
  const db = getDB();
  await db.exec(`
    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      summary TEXT DEFAULT '',
      category TEXT DEFAULT 'notice',
      cover_url TEXT DEFAULT '',
      author TEXT DEFAULT '管理员',
      is_top INTEGER DEFAULT 0,
      status INTEGER DEFAULT 1,
      view_count INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      published_at TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );
  `);
}

/**
 * GET /api/announcements
 * 公告列表（管理后台，支持分页/搜索/筛选）
 */
router.get('/', async (req, res) => {
  ensureTable();
  const db = getDB();
  const { page = 1, pageSize = 10, keyword, category, status } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(pageSize);

  let where = ['1=1'];
  let params = [];
  if (keyword) { where.push('(title LIKE ? OR content LIKE ?)'); params.push(`%${keyword}%`, `%${keyword}%`); }
  if (category) { where.push('category = ?'); params.push(category); }
  if (status !== undefined && status !== '') { where.push('status = ?'); params.push(parseInt(status)); }

  const whereClause = where.join(' AND ');
  const total = await db.prepare(`SELECT COUNT(*) as cnt FROM announcements WHERE ${whereClause}`).get(...params).cnt;
  const list = db.prepare(`
    SELECT * FROM announcements WHERE ${whereClause}
    ORDER BY is_top DESC, sort_order DESC, created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(pageSize), offset);

  return success(res, { list, total, page: parseInt(page), pageSize: parseInt(pageSize) });
});

/**
 * GET /api/announcements/:id
 * 公告详情
 */
router.get('/:id', async (req, res) => {
  ensureTable();
  const db = getDB();
  const item = await db.prepare('SELECT * FROM announcements WHERE id = ?').get(req.params.id);
  if (!item) return error(res, '公告不存在', 404);

  // 更新阅读量
  await db.prepare('UPDATE announcements SET view_count = COALESCE(view_count, 0) + 1 WHERE id = ?').run(req.params.id);

  return success(res, item);
});

/**
 * POST /api/announcements
 * 创建公告
 */
router.post('/', async (req, res) => {
  ensureTable();
  const db = getDB();
  const { title, content, summary, category, cover_url, author, is_top, status, sort_order, published_at } = req.body;
  if (!title) return error(res, '公告标题不能为空');
  if (!content) return error(res, '公告内容不能为空');

  try {
    const result = db.prepare(`
      INSERT INTO announcements (title, content, summary, category, cover_url, author, is_top, status, sort_order, published_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      title, content,
      summary || content.slice(0, 100),
      category || 'notice',
      cover_url || '',
      author || '管理员',
      is_top ? 1 : 0,
      status !== undefined ? parseInt(status) : 1,
      sort_order || 0,
      published_at || new Date().toISOString().slice(0, 10)
    );
    const newItem = await db.prepare('SELECT * FROM announcements WHERE id = ?').get(result.lastInsertRowid);
    return success(res, newItem, '公告创建成功', 201);
  } catch (err) {
    return error(res, '创建失败: ' + err.message);
  }
});

/**
 * PUT /api/announcements/:id
 * 更新公告
 */
router.put('/:id', async (req, res) => {
  ensureTable();
  const db = getDB();
  const { title, content, summary, category, cover_url, author, is_top, status, sort_order, published_at } = req.body;

  const existing = await db.prepare('SELECT * FROM announcements WHERE id = ?').get(req.params.id);
  if (!existing) return error(res, '公告不存在', 404);

  // 动态构建 SET 子句
  const setClauses = [];
  const setParams = [];
  if (title !== undefined) { setClauses.push('title = ?'); setParams.push(title); }
  if (content !== undefined) { setClauses.push('content = ?'); setParams.push(content); }
  if (summary !== undefined) { setClauses.push('summary = ?'); setParams.push(summary); }
  else if (content !== undefined) { setClauses.push('summary = ?'); setParams.push(content.slice(0, 100)); }
  if (category !== undefined) { setClauses.push('category = ?'); setParams.push(category); }
  if (cover_url !== undefined) { setClauses.push('cover_url = ?'); setParams.push(cover_url); }
  if (author !== undefined) { setClauses.push('author = ?'); setParams.push(author); }
  if (is_top !== undefined) { setClauses.push('is_top = ?'); setParams.push(is_top ? 1 : 0); }
  if (status !== undefined) { setClauses.push('status = ?'); setParams.push(parseInt(status)); }
  if (sort_order !== undefined) { setClauses.push('sort_order = ?'); setParams.push(sort_order); }
  if (published_at !== undefined) { setClauses.push('published_at = ?'); setParams.push(published_at); }
  setClauses.push("updated_at = datetime('now','localtime')");
  setParams.push(req.params.id);
  await db.prepare(`UPDATE announcements SET ${setClauses.join(', ')} WHERE id = ?`).run(...setParams);

  const updated = await db.prepare('SELECT * FROM announcements WHERE id = ?').get(req.params.id);
  return success(res, updated, '公告更新成功');
});

/**
 * DELETE /api/announcements/:id
 * 删除公告
 */
router.delete('/:id', async (req, res) => {
  ensureTable();
  const db = getDB();
  await db.prepare('DELETE FROM announcements WHERE id = ?').run(req.params.id);
  return success(res, null, '公告已删除');
});

/**
 * PUT /api/announcements/:id/top
 * 置顶/取消置顶
 */
router.put('/:id/top', async (req, res) => {
  ensureTable();
  const db = getDB();
  const { is_top } = req.body;
  db.prepare('UPDATE announcements SET is_top = ?, updated_at = datetime(\'now\',\'localtime\') WHERE id = ?')
    .run(is_top ? 1 : 0, req.params.id);
  return success(res, null, is_top ? '已置顶' : '已取消置顶');
});

module.exports = router;
