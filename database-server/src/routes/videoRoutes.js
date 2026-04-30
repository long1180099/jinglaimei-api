/**
 * 视频学习系统 - Admin管理后台路由
 * /api/school/videos/*
 * 包含: 分类管理、视频CRUD、系列课管理、订单管理、数据统计
 */
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const { getDB } = require('../utils/db');
const { success, error } = require('../utils/response');

// ==================== 文件存储配置 ====================
const VIDEO_DIR = path.join(__dirname, '../../data/uploads/videos');
const VIDEO_COVER_DIR = path.join(__dirname, '../../data/uploads/video-covers');

[VIDEO_DIR, VIDEO_COVER_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// multer配置 - 视频上传(500MB)
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = file.fieldname === 'cover' ? VIDEO_COVER_DIR : VIDEO_DIR;
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage: videoStorage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 视频最大500MB
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'cover') {
      const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
      const ext = path.extname(file.originalname).toLowerCase();
      return allowed.includes(ext) ? cb(null, true) : cb(new Error('封面仅支持JPG/PNG/WEBP'), false);
    }
    // 视频文件
    const allowed = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m3u8'];
    const ext = path.extname(file.originalname).toLowerCase();
    return allowed.includes(ext) ? cb(null, true) : cb(new Error('视频仅支持MP4/MOV/AVI/MKV/WebM'), false);
  }
});

// ==================== 确保表存在（引用迁移文件） ====================
function ensureTables() {
  try {
    require('../migrations/005_init_video_learning');
  } catch(e) {}
}

// ==================== 视频分类管理 ====================

/**
 * GET /api/school/videos/categories - 分类列表
 */
router.get('/videos/categories', (req, res) => {
  ensureTables();
  const db = getDB();
  const categories = db.prepare(`
    SELECT c.*, COUNT(v.id) as video_count
    FROM video_categories c
    LEFT JOIN videos v ON v.category_id = c.id AND v.status = 1
    GROUP BY c.id
    ORDER BY c.sort_order ASC
  `).all();
  return success(res, categories);
});

/**
 * POST /api/school/videos/categories - 新增分类
 */
router.post('/videos/categories', (req, res) => {
  ensureTables();
  const db = getDB();
  const { name, icon, description, sort_order } = req.body;
  if (!name) return error(res, '分类名称不能为空');

  const result = db.prepare(
    'INSERT INTO video_categories (name, icon, description, sort_order) VALUES (?, ?, ?, ?)'
  ).run(name, icon || '', description || '', sort_order || 0);

  return success(res, { id: result.lastInsertRowid }, '分类创建成功', 201);
});

/**
 * PUT /api/school/videos/categories/:id - 更新分类
 */
router.put('/videos/categories/:id', (req, res) => {
  ensureTables();
  const db = getDB();
  const { name, icon, description, sort_order, status } = req.body;

  db.prepare(`
    UPDATE video_categories SET
      name = COALESCE(?, name),
      icon = COALESCE(?, icon),
      description = COALESCE(?, description),
      sort_order = COALESCE(?, sort_order),
      status = COALESCE(?, status),
      updated_at = datetime('now','localtime')
    WHERE id = ?
  `).run(name, icon, description, sort_order, status, req.params.id);

  return success(res, null, '分类更新成功');
});

/**
 * DELETE /api/school/videos/categories/:id - 删除分类
 */
router.delete('/videos/categories/:id', (req, res) => {
  ensureTables();
  const db = getDB();
  // 检查是否有视频使用此分类
  const videoCount = db.prepare('SELECT COUNT(*) as c FROM videos WHERE category_id = ?').get(req.params.id).c;
  if (videoCount > 0) {
    return error(res, `该分类下有${videoCount}个视频，请先移动或删除视频`);
  }
  db.prepare('DELETE FROM video_categories WHERE id = ?').run(req.params.id);
  return success(res, null, '分类删除成功');
});

// ==================== 视频文件上传 ====================

/**
 * POST /api/school/videos/upload - 上传视频文件
 */
router.post('/videos/upload', upload.single('video'), (req, res) => {
  try {
    if (!req.file) return error(res, '请选择要上传的视频');

    const ext = path.extname(req.file.originalname).toLowerCase().replace('.', '');
    const fileUrl = `/uploads/videos/${req.file.filename}`;

    return success(res, {
      url: fileUrl,
      filename: req.file.originalname,
      format: ext,
      size: req.file.size,
    }, '视频上传成功');
  } catch (err) {
    error(res, err.message, 500);
  }
});

/**
 * POST /api/school/videos/upload-cover - 上传视频封面
 */
router.post('/videos/upload-cover', upload.single('cover'), (req, res) => {
  try {
    if (!req.file) return error(res, '请选择封面图片');
    const coverUrl = `/uploads/video-covers/${req.file.filename}`;
    return success(res, { url: coverUrl }, '封面上传成功');
  } catch (err) {
    error(res, err.message, 500);
  }
});

// ==================== 视频CRUD ====================

/**
 * GET /api/school/videos - 视频列表
 */
router.get('/videos', (req, res) => {
  ensureTables();
  const db = getDB();
  const { page = 1, pageSize = 20, keyword, category_id, status, difficulty, access_level, series_id, sort_by = 'created_at', sort_order = 'desc' } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(pageSize);

  let where = [];
  let params = [];
  if (keyword) { where.push('(v.title LIKE ? OR v.description LIKE ? OR v.instructor LIKE ?)'); params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`); }
  if (category_id) { where.push('v.category_id = ?'); params.push(parseInt(category_id)); }
  if (status !== undefined && status !== '') { where.push('v.status = ?'); params.push(parseInt(status)); }
  if (difficulty) { where.push('v.difficulty = ?'); params.push(difficulty); }
  if (access_level) { where.push('v.access_level = ?'); params.push(access_level); }
  if (series_id) { where.push('v.series_id = ?'); params.push(series_id === 'null' ? null : parseInt(series_id)); }

  const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';
  const allowedSort = ['created_at', 'updated_at', 'view_count', 'like_count', 'purchase_count', 'sort_order', 'title', 'duration'];
  const sortBy = allowedSort.includes(sort_by) ? sort_by : 'created_at';
  const sortOrder = sort_order === 'asc' ? 'ASC' : 'DESC';

  const total = db.prepare(`SELECT COUNT(*) as cnt FROM videos v ${whereClause}`).get(...params).cnt;
  const videos = db.prepare(`
    SELECT v.*, vc.name as category_name_real
    FROM videos v
    LEFT JOIN video_categories vc ON v.category_id = vc.id
    ${whereClause}
    ORDER BY v.${sortBy} ${sortOrder}
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(pageSize), offset);

  const parsedVideos = videos.map(v => ({
    ...v,
    id: String(v.id),
    tags: JSON.parse(v.tags || '[]'),
    price: parseFloat(v.price) || 0,
  }));

  return success(res, { list: parsedVideos, total, page: parseInt(page), pageSize: parseInt(pageSize) });
});

/**
 * GET /api/school/videos/:id - 视频详情
 */
router.get('/videos/:id', (req, res) => {
  ensureTables();
  const db = getDB();
  const video = db.prepare(`
    SELECT v.*, vc.name as category_name_real, s.title as series_title
    FROM videos v
    LEFT JOIN video_categories vc ON v.category_id = vc.id
    LEFT JOIN video_series s ON v.series_id = s.id
    WHERE v.id = ?
  `).get(req.params.id);
  if (!video) return error(res, '视频不存在', 404);

  return success(res, {
    ...video,
    id: String(video.id),
    tags: JSON.parse(video.tags || '[]'),
    price: parseFloat(video.price) || 0,
  });
});

/**
 * POST /api/school/videos/create-with-file - 上传+创建一步完成
 */
router.post('/videos/create-with-file', upload.single('video'), (req, res) => {
  try {
    ensureTables();

    let videoUrl = '';
    let fileSize = 0;
    let format = '';

    if (req.file) {
      const ext = path.extname(req.file.originalname).toLowerCase().replace('.', '');
      videoUrl = `/uploads/videos/${req.file.filename}`;
      fileSize = req.file.size;
      format = ext;
    }

    const {
      title, description, category_id, category_name,
      series_id, access_level, price,
      instructor, instructor_avatar,
      duration, difficulty, tags,
      cover_url, is_recommend, is_top, status
    } = req.body;

    if (!title) return error(res, '视频标题不能为空');

    const db = getDB();
    const result = db.prepare(`
      INSERT INTO videos (
        title, description, cover_url, video_url, video_source,
        duration, file_size, category_id, category_name,
        series_id, series_episode,
        access_level, price,
        instructor, instructor_avatar,
        tags, difficulty, status, is_recommend, is_top
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      title, description || '', cover_url || '', videoUrl, 'upload',
      parseInt(duration) || 0, fileSize,
      parseInt(category_id) || 0, category_name || '',
      series_id ? parseInt(series_id) : null, 0,
      access_level || 'all',
      parseFloat(price) || 0,
      instructor || '', instructor_avatar || '',
      JSON.stringify(tags || []),
      difficulty || 'beginner',
      status !== undefined ? parseInt(status) : 1,
      is_recommend ? 1 : 0, is_top ? 1 : 0
    );

    const newId = result.lastInsertRowid;

    // 如果是系列课，更新系列集数统计
    if (series_id) {
      db.prepare(`
        UPDATE video_series SET
          total_episodes = (SELECT COUNT(*) FROM videos WHERE series_id = ?),
          updated_at = datetime('now','localtime')
        WHERE id = ?
      `).run(series_id, series_id);
    }

    const newVideo = db.prepare('SELECT * FROM videos WHERE id = ?').get(newId);
    return success(res, {
      ...newVideo,
      id: String(newVideo.id),
      tags: JSON.parse(newVideo.tags || '[]'),
      price: parseFloat(newVideo.price) || 0,
    }, '视频创建成功', 201);
  } catch (err) {
    console.error('[VIDEO_CREATE] 错误:', err.message);
    error(res, err.message, 500);
  }
});

/**
 * PUT /api/school/videos/:id - 更新视频
 */
router.put('/videos/:id', (req, res) => {
  try {
    ensureTables();
    const db = getDB();
    const existing = db.prepare('SELECT id, series_id FROM videos WHERE id = ?').get(req.params.id);
    if (!existing) return error(res, '视频不存在', 404);

    const {
      title, description, cover_url, video_url,
      duration, category_id, category_name,
      series_id, access_level, price,
      instructor, instructor_avatar,
      difficulty, tags, status, is_recommend, is_top
    } = req.body;

    // 处理series_id变更（移出原系列或加入新系列）
    const newSeriesId = series_id !== undefined ? (series_id === '' || series_id === 'null' ? null : parseInt(series_id)) : existing.series_id;
    const oldSeriesId = existing.series_id;

    db.prepare(`
      UPDATE videos SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        cover_url = COALESCE(?, cover_url),
        video_url = COALESCE(?, video_url),
        duration = COALESCE(?, duration),
        category_id = COALESCE(?, category_id),
        category_name = COALESCE(?, category_name),
        series_id = ?,
        access_level = COALESCE(?, access_level),
        price = COALESCE(?, price),
        instructor = COALESCE(?, instructor),
        instructor_avatar = COALESCE(?, instructor_avatar),
        difficulty = COALESCE(?, difficulty),
        tags = COALESCE(?, tags),
        status = COALESCE(?, status),
        is_recommend = COALESCE(?, is_recommend),
        is_top = COALESCE(?, is_top),
        updated_at = datetime('now','localtime')
      WHERE id = ?
    `).run(
      title, description, cover_url, video_url,
      duration, category_id, category_name,
      newSeriesId,
      access_level, price,
      instructor, instructor_avatar,
      difficulty,
      Array.isArray(tags) ? JSON.stringify(tags) : tags,
      status, is_recommend, is_top,
      req.params.id
    );

    // 更新旧系列和新系列的集数统计
    if (oldSeriesId && oldSeriesId !== newSeriesId) {
      db.prepare(`UPDATE video_series SET total_episodes = (SELECT COUNT(*) FROM videos WHERE series_id = ?), updated_at = datetime('now','localtime') WHERE id = ?`).run(oldSeriesId, oldSeriesId);
    }
    if (newSeriesId && newSeriesId !== oldSeriesId) {
      db.prepare(`UPDATE video_series SET total_episodes = (SELECT COUNT(*) FROM videos WHERE series_id = ?), updated_at = datetime('now','localtime') WHERE id = ?`).run(newSeriesId, newSeriesId);
    }

    return success(res, null, '更新成功');
  } catch (err) {
    error(res, err.message, 500);
  }
});

/**
 * DELETE /api/school/videos/:id - 删除视频
 */
router.delete('/videos/:id', (req, res) => {
  try {
    ensureTables();
    const db = getDB();
    const video = db.prepare('SELECT * FROM videos WHERE id = ?').get(req.params.id);
    if (!video) return error(res, '视频不存在', 404);

    // 删除关联文件
    if (video.video_url) {
      const filePath = path.join(__dirname, '../../data', video.video_url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    if (video.cover_url) {
      const coverPath = path.join(__dirname, '../../data', video.cover_url);
      if (fs.existsSync(coverPath)) fs.unlinkSync(coverPath);
    }

    // 删除学习进度
    db.prepare('DELETE FROM video_progress WHERE video_id = ?').run(req.params.id);
    // 删除订单
    db.prepare('DELETE FROM video_orders WHERE target_type = "video" AND target_id = ?').run(req.params.id);

    db.prepare('DELETE FROM videos WHERE id = ?').run(req.params.id);

    // 如果属于系列课，更新系列集数
    if (video.series_id) {
      db.prepare(`UPDATE video_series SET total_episodes = (SELECT COUNT(*) FROM videos WHERE series_id = ?) WHERE id = ?`).run(video.series_id, video.series_id);
    }

    return success(res, null, '删除成功');
  } catch (err) {
    error(res, err.message, 500);
  }
});

/**
 * PUT /api/school/videos/:id/toggle-status - 切换上下架状态
 */
router.put('/videos/:id/toggle-status', (req, res) => {
  ensureTables();
  const db = getDB();
  const video = db.prepare('SELECT status FROM videos WHERE id = ?').get(req.params.id);
  if (!video) return error(res, '视频不存在', 404);
  const newStatus = video.status === 1 ? 0 : 1;
  db.prepare('UPDATE videos SET status = ?, updated_at = datetime(\'now\',\'localtime\') WHERE id = ?').run(newStatus, req.params.id);
  return success(res, { status: newStatus }, newStatus ? '已上架' : '已下架');
});

// ==================== 系列课管理 ====================

/**
 * GET /api/school/videos/series-list - 系列课列表
 */
router.get('/videos/series-list', (req, res) => {
  ensureTables();
  const db = getDB();
  const { keyword, status, page = 1, pageSize = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(pageSize);

  let where = [];
  let params = [];
  if (keyword) { where.push('(s.title LIKE ? OR s.description LIKE ? OR s.instructor LIKE ?)'); params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`); }
  if (status !== undefined && status !== '') { where.push('s.status = ?'); params.push(parseInt(status)); }

  const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const total = db.prepare(`SELECT COUNT(*) as cnt FROM video_series s ${whereClause}`).get(...params).cnt;
  const seriesList = db.prepare(`
    SELECT s.*,
           (SELECT COUNT(*) FROM videos WHERE series_id = s.id AND status = 1) as active_episodes,
           vc.name as category_name_real
    FROM video_series s
    LEFT JOIN video_categories vc ON s.category_id = vc.id
    ${whereClause}
    ORDER BY s.sort_order DESC, s.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(pageSize), offset);

  const parsed = seriesList.map(s => ({
    ...s,
    id: String(s.id),
    tags: JSON.parse(s.tags || '[]'),
    price: parseFloat(s.price) || 0,
    original_price: parseFloat(s.original_price) || 0,
  }));

  return success(res, { list: parsed, total, page: parseInt(page), pageSize: parseInt(pageSize) });
});

/**
 * POST /api/school/videos/series-list - 创建系列课
 */
router.post('/videos/series-list', (req, res) => {
  try {
    ensureTables();
    const db = getDB();
    const {
      title, description, cover_url, category_id, category_name,
      price, original_price, access_level,
      instructor, instructor_avatar,
      difficulty, tags, status, is_recommend, sort_order
    } = req.body;
    if (!title) return error(res, '系列课标题不能为空');

    const result = db.prepare(`
      INSERT INTO video_series (title, description, cover_url, category_id, category_name,
        price, original_price, access_level, instructor, instructor_avatar,
        difficulty, tags, status, is_recommend, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      title, description || '', cover_url || '',
      parseInt(category_id) || 0, category_name || '',
      parseFloat(price) || 0, parseFloat(original_price) || 0,
      access_level || 'all',
      instructor || '', instructor_avatar || '',
      difficulty || 'beginner',
      JSON.stringify(tags || []),
      status !== undefined ? parseInt(status) : 1,
      is_recommend ? 1 : 0,
      sort_order || 0
    );

    return success(res, { id: result.lastInsertRowid }, '系列课创建成功', 201);
  } catch (err) {
    error(res, err.message, 500);
  }
});

/**
 * PUT /api/school/videos/series-list/:id - 更新系列课
 */
router.put('/videos/series-list/:id', (req, res) => {
  try {
    ensureTables();
    const db = getDB();
    const exists = db.prepare('SELECT id FROM video_series WHERE id = ?').get(req.params.id);
    if (!exists) return error(res, '系列课不存在', 404);

    const {
      title, description, cover_url, category_id, category_name,
      price, original_price, access_level,
      instructor, instructor_avatar,
      difficulty, tags, status, is_recommend, sort_order
    } = req.body;

    db.prepare(`
      UPDATE video_series SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        cover_url = COALESCE(?, cover_url),
        category_id = COALESCE(?, category_id),
        category_name = COALESCE(?, category_name),
        price = COALESCE(?, price),
        original_price = COALESCE(?, original_price),
        access_level = COALESCE(?, access_level),
        instructor = COALESCE(?, instructor),
        instructor_avatar = COALESCE(?, instructor_avatar),
        difficulty = COALESCE(?, difficulty),
        tags = COALESCE(?, tags),
        status = COALESCE(?, status),
        is_recommend = COALESCE(?, is_recommend),
        sort_order = COALESCE(?, sort_order),
        updated_at = datetime('now','localtime')
      WHERE id = ?
    `).run(
      title, description, cover_url, category_id, category_name,
      price, original_price, access_level,
      instructor, instructor_avatar,
      difficulty,
      Array.isArray(tags) ? JSON.stringify(tags) : tags,
      status, is_recommend, sort_order,
      req.params.id
    );

    return success(res, null, '系列课更新成功');
  } catch (err) {
    error(res, err.message, 500);
  }
});

/**
 * GET /api/school/videos/series-list/:id - 系列课详情(含剧集列表)
 */
router.get('/videos/series-list/:id', (req, res) => {
  ensureTables();
  const db = getDB();
  const series = db.prepare(`
    SELECT s.*, vc.name as category_name_real
    FROM video_series s
    LEFT JOIN video_categories vc ON s.category_id = vc.id
    WHERE s.id = ?
  `).get(req.params.id);
  if (!series) return error(res, '系列课不存在', 404);

  const episodes = db.prepare(`
    SELECT * FROM videos WHERE series_id = ? ORDER BY series_episode ASC, created_at ASC
  `).all(req.params.id);

  return success(res, {
    ...series,
    id: String(series.id),
    tags: JSON.parse(series.tags || '[]'),
    price: parseFloat(series.price) || 0,
    episodes: episodes.map(ep => ({
      ...ep,
      id: String(ep.id),
      tags: JSON.parse(ep.tags || '[]'),
      price: parseFloat(ep.price) || 0,
    })),
  });
});

/**
 * DELETE /api/school/videos/series-list/:id - 删除系列课(含所有剧集)
 */
router.delete('/videos/series-list/:id', (req, res) => {
  try {
    ensureTables();
    const db = getDB();
    const series = db.prepare('SELECT * FROM video_series WHERE id = ?').get(req.params.id);
    if (!series) return error(res, '系列课不存在', 404);

    // 获取所有剧集，删除视频文件
    const episodes = db.prepare('SELECT id, video_url, cover_url FROM videos WHERE series_id = ?').all(req.params.id);
    episodes.forEach(ep => {
      if (ep.video_url) { const fp = path.join(__dirname, '../../data', ep.video_url); if (fs.existsSync(fp)) fs.unlinkSync(fp); }
      if (ep.cover_url) { const cp = path.join(__dirname, '../../data', ep.cover_url); if (fs.existsSync(cp)) fs.unlinkSync(cp); }
    });

    // 删除剧集进度和订单
    const episodeIds = episodes.map(ep => ep.id);
    if (episodeIds.length > 0) {
      db.prepare(`DELETE FROM video_progress WHERE video_id IN (${episodeIds.join(',')})`).run();
      db.prepare(`DELETE FROM video_orders WHERE target_type = "video" AND target_id IN (${episodeIds.join(',')})`).run();
    }
    // 删除系列课本身订单
    db.prepare('DELETE FROM video_orders WHERE target_type = "series" AND target_id = ?').run(req.params.id);
    // 删除剧集
    db.prepare('DELETE FROM videos WHERE series_id = ?').run(req.params.id);
    // 删除系列课
    db.prepare('DELETE FROM video_series WHERE id = ?').run(req.params.id);

    return success(res, null, `系列课已删除(共${episodes.length}集)`);
  } catch (err) {
    error(res, err.message, 500);
  }
});

// ==================== 订单管理 ====================

/**
 * GET /api/school/videos/orders - 订单列表
 */
router.get('/videos/orders', (req, res) => {
  ensureTables();
  const db = getDB();
  const { page = 1, pageSize = 20, status, user_id } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(pageSize);

  let where = [];
  let params = [];
  if (status) { where.push('vo.status = ?'); params.push(status); }
  if (user_id) { where.push('vo.user_id = ?'); params.push(user_id); }

  const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const total = db.prepare(`SELECT COUNT(*) as cnt FROM video_orders vo ${whereClause}`).get(...params).cnt;
  const orders = db.prepare(`
    SELECT vo.*, COALESCE(u.real_name, u.username) as buyer_name, u.avatar_url
    FROM video_orders vo
    LEFT JOIN users u ON vo.user_id = u.id
    ${whereClause}
    ORDER BY vo.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(pageSize), offset);

  return success(res, { list: orders.map(o => ({ ...o, amount: parseFloat(o.amount) || 0 })), total, page: parseInt(page), pageSize: parseInt(pageSize) });
});

// ==================== 数据统计 ====================

/**
 * GET /api/school/videos/stats - 视频数据总览
 */
router.get('/videos/stats', (req, res) => {
  ensureTables();
  const db = getDB();

  // 基础数据
  const totalVideos = db.prepare("SELECT COUNT(*) as c FROM videos WHERE status = 1").get().c;
  const totalSeries = db.prepare("SELECT COUNT(*) as c FROM video_series WHERE status = 1").get().c;
  const totalCategories = db.prepare("SELECT COUNT(*) as c FROM video_categories WHERE status = 1").get().c;

  // 播放量、购买量
  const viewStats = db.prepare(`
    SELECT COALESCE(SUM(view_count), 0) as total_views, COALESCE(SUM(purchase_count), 0) as total_purchases,
           COALESCE(SUM(like_count), 0) as total_likes
    FROM videos
  `).get();

  // 总收入
  const revenueStats = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total_revenue, COUNT(*) as total_orders
    FROM video_orders WHERE status = 'paid'
  `).get();

  // 今日新增
  const today = new Date().toISOString().split('T')[0];
  const todayViews = db.prepare("SELECT SUM(view_count) as c FROM videos WHERE DATE(created_at) = ?").get(today).c || 0;
  const todayOrders = db.prepare("SELECT COUNT(*) as c FROM video_orders WHERE DATE(created_at) = ? AND status = 'paid'").get(today).c;
  const todayRevenue = db.prepare("SELECT COALESCE(SUM(amount), 0) as c FROM video_orders WHERE DATE(created_at) = ? AND status = 'paid'").get(today).c;

  // 热门视频 TOP10
  const topVideos = db.prepare(`
    SELECT id, title, cover_url, view_count, like_count, purchase_count, category_name
    FROM videos WHERE status = 1 ORDER BY view_count DESC LIMIT 10
  `).all();

  // 各分类视频数量
  const categoryStats = db.prepare(`
    SELECT vc.name as category_name, COUNT(v.id) as video_count,
           SUM(v.view_count) as total_views, SUM(v.purchase_count) as total_purchases
    FROM video_categories vc
    LEFT JOIN videos v ON v.category_id = vc.id AND v.status = 1
    WHERE vc.status = 1
    GROUP BY vc.id
    ORDER BY video_count DESC
  `).all();

  // 学习人数(有观看记录的用户数)
  const learnerCount = db.prepare('SELECT COUNT(DISTINCT user_id) as c FROM video_progress WHERE watch_count > 0').get().c;

  // 最近7天播放趋势
  const weeklyTrend = db.prepare(`
    SELECT DATE(updated_at) as date, SUM(watch_duration) as total_watch_seconds,
           COUNT(DISTINCT user_id) as active_users, COUNT(*) as sessions
    FROM video_progress
    WHERE updated_at >= DATE('now', '-7 days')
    GROUP BY DATE(updated_at)
    ORDER BY date
  `).all();

  return success(res, {
    overview: {
      totalVideos, totalSeries, totalCategories,
      totalViews: viewStats.total_views || 0,
      totalPurchases: viewStats.total_purchases || 0,
      totalLikes: viewStats.total_likes || 0,
      totalRevenue: parseFloat(revenueStats.total_revenue) || 0,
      totalOrders: revenueStats.total_orders || 0,
      learnerCount,
      todayViews, todayOrders,
      todayRevenue: parseFloat(todayRevenue) || 0,
    },
    topVideos, categoryStats, weeklyTrend,
  });
});

// ==================== 补充统计/批量路由(Admin前端需要) ====================

/**
 * GET /api/school/videos/stats/categories - 分类维度统计
 */
router.get('/videos/stats/categories', (req, res) => {
  ensureTables();
  const db = getDB();
  const stats = db.prepare(`
    SELECT c.id, c.name, c.icon,
           COUNT(v.id) as video_count,
           COALESCE(SUM(v.view_count), 0) as total_views,
           COALESCE(SUM(v.purchase_count), 0) as total_purchases,
           COALESCE(SUM(CASE WHEN v.status=1 THEN 1 ELSE 0 END), 0) as active_count
    FROM video_categories c
    LEFT JOIN videos v ON v.category_id = c.id
    WHERE c.status = 1
    GROUP BY c.id
    ORDER BY video_count DESC
  `).all();
  return success(res, stats);
});

/**
 * GET /api/school/videos/stats/difficulties - 难度分布统计
 */
router.get('/videos/stats/difficulties', (req, res) => {
  ensureTables();
  const db = getDB();
  const stats = db.prepare(`
    SELECT difficulty, COUNT(*) as count,
           COALESCE(SUM(view_count), 0) as total_views
    FROM videos WHERE status = 1
    GROUP BY difficulty
    ORDER BY count DESC
  `).all();
  return success(res, stats);
});

/**
 * GET /api/school/videos/learning-records - 学习记录列表
 */
router.get('/videos/learning-records', (req, res) => {
  ensureTables();
  const db = getDB();
  const { page = 1, pageSize = 20, user_id } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(pageSize);

  let where = [];
  let params = [];
  if (user_id) { where.push('vp.user_id = ?'); params.push(user_id); }

  const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';
  const total = db.prepare(`SELECT COUNT(*) as cnt FROM video_progress vp ${whereClause}`).get(...params).cnt;
  const records = db.prepare(`
    SELECT vp.*, v.title as video_title, v.cover_url, v.duration,
           COALESCE(u.real_name, u.username) as learner_name
    FROM video_progress vp
    LEFT JOIN videos v ON v.id = vp.video_id
    LEFT JOIN users u ON u.id = vp.user_id
    ${whereClause}
    ORDER BY vp.updated_at DESC LIMIT ? OFFSET ?
  `).all(...params, parseInt(pageSize), offset);

  return success(res, { list: records, total, page: parseInt(page), pageSize: parseInt(pageSize) });
});

/**
 * GET /api/school/videos/user-progress - 用户学习进度概览
 */
router.get('/videos/user-progress', (req, res) => {
  ensureTables();
  const db = getDB();
  const { user_id } = req.query;
  if (!user_id) return error(res, '缺少user_id参数');

  // 用户学习的所有视频进度
  const progressList = db.prepare(`
    SELECT vp.*, v.title, v.cover_url, v.category_name, s.title as series_title
    FROM video_progress vp
    LEFT JOIN videos v ON v.id = vp.video_id
    LEFT JOIN video_series s ON s.id = v.series_id
    WHERE vp.user_id = ?
    ORDER BY vp.updated_at DESC
  `).all(user_id);

  // 汇总统计
  const summary = db.prepare(`
    SELECT COUNT(*) as total_learned,
           SUM(CASE WHEN is_completed=1 THEN 1 ELSE 0 END) as completed_count,
           COALESCE(SUM(watch_duration), 0) as total_seconds,
           COALESCE(SUM(watch_count), 0) as total_watches
    FROM video_progress WHERE user_id = ?
  `).get(user_id);

  return success(res, { list: progressList, summary });
});

/**
 * POST /api/school/videos/batch-status - 批量修改视频状态(上下架)
 */
router.post('/videos/batch-status', (req, res) => {
  try {
    ensureTables();
    const db = getDB();
    const { ids, status } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) return error(res, '请选择要操作的视频');
    if (status === undefined) return error(res, '请指定目标状态');

    const newStatus = parseInt(status);
    const stmt = db.prepare('UPDATE videos SET status = ?, updated_at = datetime("now","localtime") WHERE id IN (' + ids.map('?').join(',') + ')');
    stmt.run(...ids, newStatus);

    return success(res, null, `已更新${ids.length}个视频状态`);
  } catch (err) {
    error(res, err.message, 500);
  }
});

module.exports = router;
