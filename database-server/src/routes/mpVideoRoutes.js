/**
 * 视频学习系统 - 小程序端路由
 * /api/mp/videos/*
 * 视频列表/播放/购买/学习进度/系列课/学习中心
 */
const express = require('express');
const router = express.Router();
const { getDB } = require('../utils/db');
const { success, error } = require('../utils/response');

// ==================== 初始化表 ====================
function ensureTables() {
  try {
    require('../migrations/005_init_video_learning');
  } catch(e) {}
}

// JWT验证辅助
function verifyUser(req, res, callback) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return error(res, '未登录', 401);
  const jwt = require('jsonwebtoken');
  const { JWT_SECRET } = require('../middleware/auth');
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  let decoded;
  try { decoded = jwt.verify(token, JWT_SECRET); } catch { return error(res, '登录已过期', 401); }
  return callback(decoded);
}

// ==================== 视频分类 ====================

/**
 * GET /api/mp/videos/categories - 获取视频分类列表
 */
router.get('/videos/categories', async (req, res) => {
  ensureTables();
  const db = getDB();
  const categories = db.prepare(`
    SELECT c.*, COUNT(v.id) as video_count
    FROM video_categories c
    LEFT JOIN videos v ON v.category_id = c.id AND v.status = 1 AND (v.access_level = 'all' OR v.access_level IS NULL)
    WHERE c.status = 1
    GROUP BY c.id ORDER BY c.sort_order ASC
  `).all();
  return success(res, categories);
});

// ==================== 视频列表（小程序端） ====================

/**
 * GET /api/mp/videos - 视频列表（权限过滤+分页）
 * 支持: 分类筛选、搜索、排序、系列课筛选、推荐Tab等
 */
router.get('/videos', async (req, res) => {
  verifyUser(req, res, (decoded) => {
    ensureTables();
    const db = getDB();
    const {
      page = 1, pageSize = 10,
      keyword, category_id,
      tab = 'all',
      sort_by = 'created_at',
      difficulty,
    } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const userLevel = decoded.agent_level || decoded.agentLevel || 1;

    let where = ["v.status = 1"];
    let params = [];

    // 权限过滤: access_level为all或用户等级>=access_level数值
    where.push("(v.access_level = 'all' OR v.access_level IS NULL OR CAST(v.access_level AS INTEGER) <= ?)");
    params.push(userLevel);

    // 关键词搜索
    if (keyword) {
      where.push('(v.title LIKE ? OR v.description LIKE ? OR v.instructor LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }

    // 分类过滤
    if (category_id) {
      where.push('v.category_id = ?');
      params.push(parseInt(category_id));
    }

    // 难度
    if (difficulty) {
      where.push('v.difficulty = ?');
      params.push(difficulty);
    }

    // Tab切换
    // "recommend" = 推荐视频
    if (tab === 'recommend') {
      where.push('v.is_recommend = 1');
    }
    // "free" = 免费视频
    else if (tab === 'free') {
      where.push('(v.price = 0 OR v.price IS NULL)');
    }
    // "paid" = 已购买（需要JOIN订单表，稍后特殊处理）
    // "series" = 系列课（排除单集）
    else if (tab === 'series') {
      where.push('v.series_id IS NOT NULL');
    }
    // "single" = 单集课程
    else if (tab === 'single') {
      where.push('v.series_id IS NULL');
    }

    // 排除系列课中的子集（默认不显示，除非在tab=series中）
    // 注：这里保留所有视频，前端可按需展示

    const whereClause = 'WHERE ' + where.join(' AND ');

    // 统计总数
    const total = await db.prepare(`SELECT COUNT(*) as cnt FROM videos v ${whereClause}`).get(...params).cnt;

    // 排序
    const allowedSort = ['created_at', 'view_count', 'like_count', 'purchase_count', 'duration'];
    const sortBy = allowedSort.includes(sort_by) ? sort_by : 'created_at';
    const sortOrder = sortBy === 'view_count' || sortBy === 'like_count' ? 'DESC' : 'DESC';

    // 查询视频列表 + 购买状态 + 学习进度
    const videos = db.prepare(`
      SELECT v.*,
             vc.name as category_name_real,
             s.title as series_title,
             EXISTS(SELECT 1 FROM video_orders WHERE user_id = ? AND target_type = 'video'
               AND target_id = v.id AND status = 'paid') as is_purchased,
             COALESCE(vp.progress_percent, 0) as progress_percent,
             COALESCE(vp.is_completed, 0) as is_completed,
             vp.watch_count
      FROM videos v
      LEFT JOIN video_categories vc ON v.category_id = vc.id
      LEFT JOIN video_series s ON v.series_id = s.id
      LEFT JOIN video_progress vp ON vp.video_id = v.id AND vp.user_id = ?
      ${whereClause}
      ORDER BY v.is_top DESC, v.${sortBy} ${sortOrder}
      LIMIT ? OFFSET ?
    `).all(decoded.id, decoded.id, ...params, parseInt(pageSize), offset);

    // 如果是"已购"tab，改为查询订单记录
    if (tab === 'purchased') {
      const purchasedTotal = db.prepare(`
        SELECT COUNT(DISTINCT CASE WHEN target_type='series' THEN target_id ELSE target_type||'-'||target_id END) as cnt
        FROM video_orders WHERE user_id = ? AND status = 'paid'
      `).get(decoded.id).cnt;

      const purchasedVideos = db.prepare(`
        SELECT DISTINCT v.*, vc.name as category_name_real, s.title as series_title,
          vo.target_type, 1 as is_purchased,
          COALESCE(vp.progress_percent, 0) as progress_percent
        FROM video_orders vo
        JOIN videos v ON (vo.target_type = 'video' AND vo.target_id = v.id)
           OR (vo.target_type = 'series' AND v.series_id = vo.target_id)
        LEFT JOIN video_categories vc ON v.category_id = vc.id
        LEFT JOIN video_series s ON v.series_id = s.id
        LEFT JOIN video_progress vp ON vp.video_id = v.id AND vp.user_id = ?
        WHERE vo.user_id = ? AND vo.status = 'paid'
        ORDER BY vo.paid_at DESC LIMIT ? OFFSET ?
      `).all(decoded.id, decoded.id, parseInt(pageSize), offset);

      return success(res, {
        list: purchasedVideos.map(formatVideoForMP),
        total: purchasedTotal,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
      });
    }

    return success(res, {
      list: videos.map(formatVideoForMP),
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
    });
  });
});

/**
 * 格式化视频数据给小程序端
 */
function formatVideoForMP(v) {
  return {
    id: String(v.id),
    title: v.title,
    description: v.description,
    coverUrl: v.cover_url || '',
    duration: v.duration || 0,
    categoryId: v.category_id,
    categoryName: v.category_name_real || v.category_name || '',
    seriesId: v.series_id ? String(v.series_id) : null,
    seriesTitle: v.series_title || '',
    instructor: v.instructor || '',
    difficulty: v.difficulty || 'beginner',
    price: parseFloat(v.price) || 0,
    accessLevel: v.access_level || 'all',
    viewCount: v.view_count || 0,
    likeCount: v.like_count || 0,
    purchaseCount: v.purchase_count || 0,
    tags: JSON.parse(v.tags || '[]'),
    isRecommend: v.is_recommend === 1,
    isTop: v.is_top === 1,
    createdAt: v.created_at,
    isPurchased: v.is_purchased === 1,
    progressPercent: v.progress_percent || 0,
    isCompleted: v.is_completed === 1,
    watchCount: v.watch_count || 0,
  };
}

// ==================== 视频详情与播放 ====================

/**
 * GET /api/mp/videos/:id - 视频详情
 */
router.get('/videos/:id', async (req, res) => {
  verifyUser(req, res, (decoded) => {
    ensureTables();
    const db = getDB();
    const video = db.prepare(`
      SELECT v.*, vc.name as category_name_real, s.title as series_title,
             EXISTS(SELECT 1 FROM video_orders WHERE user_id = ? AND target_type = 'video'
               AND target_id = v.id AND status = 'paid') as is_purchased,
             COALESCE(vp.progress_percent, 0) as progress_percent,
             COALESCE(vp.progress_seconds, 0) as progress_seconds,
             COALESCE(vp.is_completed, 0) as is_completed,
             vp.notes
      FROM videos v
      LEFT JOIN video_categories vc ON v.category_id = vc.id
      LEFT JOIN video_series s ON v.series_id = s.id
      LEFT JOIN video_progress vp ON vp.video_id = v.id AND vp.user_id = ?
      WHERE v.id = ? AND v.status = 1
    `).get(decoded.id, decoded.id, req.params.id);

    if (!video) return error(res, '视频不存在或已下架', 404);

    // 更新播放量（每个用户每天只算一次，通过progress接口更新更准确）
    // 这里只返回详情数据

    // 获取同系列其他集
    let relatedEpisodes = [];
    if (video.series_id) {
      relatedEpisodes = db.prepare(`
        SELECT id, title, series_episode, duration, cover_url,
          COALESCE(ep.progress_percent, 0) as my_progress
        FROM videos ep
        LEFT JOIN video_progress ep_prog ON ep_prog.video_id = ep.id AND ep_prog.user_id = ?
        WHERE ep.series_id = ? AND ep.status = 1
        ORDER BY ep.series_episode ASC
      `).all(decoded.id, video.series_id);
    }

    return success(res, {
      ...formatVideoForMP(video),
      notes: video.notes || '',
      relatedEpisodes: relatedEpisodes.map(e => ({
        ...e,
        id: String(e.id),
      })),
    });
  });
});

/**
 * POST /api/mp/videos/:id/buy - 购买视频（代理商余额支付）
 */
router.post('/videos/:id/buy', async (req, res) => {
  verifyUser(req, res, (decoded) => {
    ensureTables();
    const db = getDB();
    const videoId = req.params.id;

    const video = await db.prepare('SELECT * FROM videos WHERE id = ? AND status = 1').get(videoId);
    if (!video) return error(res, '视频不存在或已下架', 404);

    const price = parseFloat(video.price) || 0;
    if (price <= 0) return error(res, '该视频免费，无需购买');

    // 检查是否已购买
    const existingOrder = db.prepare(
      "SELECT * FROM video_orders WHERE user_id = ? AND target_type = 'video' AND target_id = ? AND status = 'paid'"
    ).get(decoded.id, videoId);
    if (existingOrder) return success(res, { orderId: existingOrder.id }, '您已购买过此视频');

    // 查询用户余额
    const user = await db.prepare('SELECT id, balance FROM users WHERE id = ?').get(decoded.id);
    if (!user) return error(res, '用户信息异常');
    if ((user.balance || 0) < price) return error(res, `余额不足，当前余额 ¥${user.balance || 0}，需要 ¥${price}`);

    // 生成订单号
    const orderNo = 'VID' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase();

    const transaction = db.transaction(() => {
      // 扣减余额
      await db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?').run(price, decoded.id);
      // 创建订单
      db.prepare(`
        INSERT INTO video_orders (order_no, user_id, target_type, target_id, target_title, amount, payment_method, status, paid_at)
        VALUES (?, ?, 'video', ?, ?, ?, 'balance', 'paid', datetime('now','localtime'))
      `).run(orderNo, decoded.id, videoId, video.title, price);
      // 增加购买计数
      await db.prepare('UPDATE videos SET purchase_count = purchase_count + 1 WHERE id = ?').run(videoId);
    });

    try {
      transaction();
      return success(res, { orderNo, amount: price, newBalance: parseFloat((user.balance - price).toFixed(2)) }, '购买成功');
    } catch (err) {
      console.error('[VIDEO_BUY] 错误:', err.message);
      return error(res, '购买失败，请重试', 500);
    }
  });
});

/**
 * POST /api/mp/videos/:id/progress - 保存播放进度
 */
router.post('/videos/:id/progress', async (req, res) => {
  verifyUser(req, res, (decoded) => {
    ensureTables();
    const db = getDB();
    const videoId = req.params.id;
    const { progress_seconds, total_seconds, progress_percent } = req.body;

    // 验证视频存在
    const video = await db.prepare('SELECT id, duration FROM videos WHERE id = ?').get(videoId);
    if (!video) return error(res, '视频不存在', 404);

    const pSeconds = parseInt(progress_seconds) || 0;
    const tSeconds = parseInt(total_seconds) || video.duration || 0;
    const pPercent = parseInt(progress_percent) || (tSeconds > 0 ? Math.round((pSeconds / tSeconds) * 100) : 0);
    const isCompleted = pPercent >= 90 ? 1 : 0;

    db.prepare(`
      INSERT INTO video_progress (
        user_id, video_id, progress_seconds, total_seconds,
        progress_percent, is_completed, completed_at,
        last_watch_time, watch_count, watch_duration, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, IF(? >= 90, datetime('now','localtime'), NULL), datetime('now','localtime'),
        COALESCE((SELECT watch_count FROM video_progress WHERE user_id = ? AND video_id = ?), 0) + 1,
        COALESCE((SELECT watch_duration FROM video_progress WHERE user_id = ? AND video_id = ?), 0) + ?,
        datetime('now','localtime')
      )
      ON CONFLICT(user_id, video_id) DO UPDATE SET
        progress_seconds = MAX(progress_seconds, excluded.progress_seconds),
        total_seconds = COALESCE(excluded.total_seconds, total_seconds),
        progress_percent = MAX(progress_percent, excluded.progress_percent),
        is_completed = IF(EXCLUDED.progress_percent >= 90 OR progress_percent >= 90, 1, is_completed),
        completed_at = IF(EXCLUDED.progress_percent >= 90 OR progress_percent >= 90, datetime('now','localtime'), completed_at),
        last_watch_time = datetime('now','localtime'),
        watch_count = watch_count + 1,
        watch_duration = watch_duration + COALESCE(?, 0),
        updated_at = datetime('now','localtime')
    `).run(
      decoded.id, videoId, pSeconds, tSeconds, pPercent, isCompleted, pPercent,
      decoded.id, videoId, decoded.id, videoId, pSeconds, pSeconds
    );

    // 首次观看时增加视频view_count
    const existingProgress = await db.prepare('SELECT id FROM video_progress WHERE user_id = ? AND video_id = ?').get(decoded.id, videoId);
    // view_count由前端首次进入播放页触发一次即可，这里不做自动累加

    return success(res, {
      savedAt: new Date().toISOString(),
      progressPercent: pPercent,
      isCompleted: isCompleted === 1,
    }, '进度已保存');
  });
});

// ==================== 系列课（小程序端） ====================

/**
 * GET /api/mp/videos/series-list - 系列课列表
 */
router.get('/videos/series-list', async (req, res) => {
  verifyUser(req, res, (decoded) => {
    ensureTables();
    const db = getDB();
    const userLevel = decoded.agent_level || decoded.agentLevel || 1;
    const { page = 1, pageSize = 10, keyword } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    let where = ["s.status = 1", "(s.access_level = 'all' OR s.access_level IS NULL OR CAST(s.access_level AS INTEGER) <= ?)"];
    let params = [userLevel];

    if (keyword) {
      where.push("(s.title LIKE ? OR s.description LIKE ?)");
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    const whereClause = 'WHERE ' + where.join(' AND ');
    const total = await db.prepare(`SELECT COUNT(*) as cnt FROM video_series s ${whereClause}`).get(...params).cnt;

    const seriesList = db.prepare(`
      SELECT s.*,
             EXISTS(SELECT 1 FROM video_orders WHERE user_id = ? AND target_type = 'series'
               AND target_id = s.id AND status = 'paid') as is_purchased,
             vc.name as category_name_real
      FROM video_series s
      LEFT JOIN video_categories vc ON s.category_id = vc.id
      ${whereClause}
      ORDER BY s.is_recommend DESC, s.sort_order DESC, s.created_at DESC
      LIMIT ? OFFSET ?
    `).all(decoded.id, ...params, parseInt(pageSize), offset);

    // 为每个系列附加剧集数和是否已购
    const result = seriesList.map(s => ({
      id: String(s.id),
      title: s.title,
      description: s.description,
      coverUrl: s.cover_url || '',
      categoryId: s.category_id,
      categoryName: s.category_name_real || '',
      price: parseFloat(s.price) || 0,
      originalPrice: parseFloat(s.original_price) || 0,
      instructor: s.instructor || '',
      difficulty: s.difficulty || 'beginner',
      totalEpisodes: s.total_episodes || 0,
      totalDuration: s.total_duration || 0,
      studentCount: s.student_count || 0,
      viewCount: s.view_count || 0,
      purchaseCount: s.purchase_count || 0,
      isRecommend: s.is_recommend === 1,
      isPurchased: s.is_purchased === 1,
      tags: JSON.parse(s.tags || '[]'),
      createdAt: s.created_at,
    }));

    return success(res, { list: result, total, page: parseInt(page), pageSize: parseInt(pageSize) });
  });
});

/**
 * GET /api/mp/videos/series-list/:id - 系列课详情（含剧集列表+购买状态）
 */
router.get('/videos/series-list/:id', async (req, res) => {
  verifyUser(req, res, (decoded) => {
    ensureTables();
    const db = getDB();

    const series = db.prepare(`
      SELECT s.*,
             EXISTS(SELECT 1 FROM video_orders WHERE user_id = ? AND target_type = 'series'
               AND target_id = s.id AND status = 'paid') as is_purchased
      FROM video_series s
      WHERE s.id = ? AND s.status = 1
    `).get(decoded.id, req.params.id);

    if (!series) return error(res, '系列课不存在或已下架', 404);

    // 获取剧集列表（含个人进度）
    const episodes = db.prepare(`
      SELECT v.*,
             COALESCE(vp.progress_percent, 0) as progress_percent,
             COALESCE(vp.is_completed, 0) as is_completed
      FROM videos v
      LEFT JOIN video_progress vp ON vp.video_id = v.id AND vp.user_id = ?
      WHERE v.series_id = ? AND v.status = 1
      ORDER BY v.series_episode ASC, v.created_at ASC
    `).all(decoded.id, req.params.id);

    return success(res, {
      ...series,
      id: String(series.id),
      price: parseFloat(series.price) || 0,
      originalPrice: parseFloat(series.original_price) || 0,
      isPurchased: series.is_purchased === 1,
      tags: JSON.parse(series.tags || '[]'),
      episodes: episodes.map(e => formatVideoForMP(e)),
    });
  });
});

/**
 * POST /api/mp/videos/series-list/:id/buy - 购买系列课
 */
router.post('/videos/series-list/:id/buy', async (req, res) => {
  verifyUser(req, res, (decoded) => {
    ensureTables();
    const db = getDB();
    const seriesId = req.params.id;

    const series = await db.prepare('SELECT * FROM video_series WHERE id = ? AND status = 1').get(seriesId);
    if (!series) return error(res, '系列课不存在或已下架', 404);

    const price = parseFloat(series.price) || 0;
    if (price <= 0) return error(res, '该系列课免费，可直接观看');

    // 检查是否已购买
    const existing = db.prepare(
      "SELECT * FROM video_orders WHERE user_id = ? AND target_type = 'series' AND target_id = ? AND status = 'paid'"
    ).get(decoded.id, seriesId);
    if (existing) return success(res, { orderId: existing.id }, '您已购买过此系列课');

    // 查余额
    const user = await db.prepare('SELECT balance FROM users WHERE id = ?').get(decoded.id);
    if (!user || (user.balance || 0) < price) {
      return error(res, `余额不足，需要 ¥${price}，当前余额 ¥${user?.balance || 0}`);
    }

    const orderNo = 'SER' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase();

    const transaction = db.transaction(() => {
      await db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?').run(price, decoded.id);
      db.prepare(`
        INSERT INTO video_orders (order_no, user_id, target_type, target_id, target_title, amount, payment_method, status, paid_at)
        VALUES (?, ?, 'series', ?, ?, ?, 'balance', 'paid', datetime('now','localtime'))
      `).run(orderNo, decoded.id, seriesId, series.title, price);
      await db.prepare('UPDATE video_series SET purchase_count = purchase_count + 1, student_count = student_count + 1 WHERE id = ?').run(seriesId);
    });

    try {
      transaction();
      return success(res, { orderNo, amount: price }, '购买成功，可以开始学习了！');
    } catch (err) {
      return error(res, '购买失败', 500);
    }
  });
});

// ==================== 学习中心 ====================

/**
 * GET /api/mp/videos/learning-center - 我的学习中心
 * 包含: 正在学习、已完成、收藏推荐、学习统计
 */
router.get('/videos/learning-center', async (req, res) => {
  verifyUser(req, res, (decoded) => {
    ensureTables();
    const db = getDB();

    // 正在学习（有进度但未完成）
    const learning = db.prepare(`
      SELECT v.id, v.title, v.cover_url, v.duration, v.instructor, v.category_name,
             vp.progress_percent, vp.last_watch_time, vp.watch_count
      FROM video_progress vp
      JOIN videos v ON v.id = vp.video_id AND v.status = 1
      WHERE vp.user_id = ? AND vp.is_completed = 0
      ORDER BY vp.last_watch_time DESC
      LIMIT 10
    `).all(decoded.id);

    // 已完成
    const completed = db.prepare(`
      SELECT v.id, v.title, v.cover_url, v.duration, v.instructor,
             vp.completed_at, vp.watch_count, vp.progress_percent
      FROM video_progress vp
      JOIN videos v ON v.id = vp.video_id AND v.status = 1
      WHERE vp.user_id = ? AND vp.is_completed = 1
      ORDER BY vp.completed_at DESC
      LIMIT 20
    `).all(decoded.id);

    // 统计概览
    const stats = db.prepare(`
      SELECT
        COUNT(*) as total_watched,
        SUM(CASE WHEN vp.is_completed = 1 THEN 1 ELSE 0 END) as completed_count,
        ROUND(AVG(vp.progress_percent), 1) as avg_progress,
        ROUND(SUM(vp.watch_duration) / 60.0, 1) as total_minutes
      FROM video_progress vp
      JOIN videos v ON v.id = vp.video_id AND v.status = 1
      WHERE vp.user_id = ?
    `).get(decoded.id);

    // 连续学习天数
    const streakInfo = calculateStudyStreak(db, decoded.id);

    // 推荐继续看（从正在学习的取前3个，或推荐视频）
    const recommendContinue = learning.slice(0, 3).map(item => ({
      ...item,
      id: String(item.id),
      continueTip: `上次学到 ${item.progress_percent}%`,
    }));

    return success(res, {
      learning: learning.map(v => ({ ...v, id: String(v.id), coverUrl: v.cover_url })),
      completed: completed.map(v => ({ ...v, id: String(v.id), coverUrl: v.cover_url })),
      stats: {
        totalWatched: stats.total_watched || 0,
        completedCount: stats.completed_count || 0,
        avgProgress: Math.round(stats.avg_progress || 0),
        totalMinutes: Math.round(stats.total_minutes || 0),
        ...streakInfo,
      },
      recommendContinue,
    });
  });
});

/**
 * 计算连续学习天数
 */
function calculateStudyStreak(db, userId) {
  // 获取最近有学习记录的日期
  const dates = db.prepare(`
    SELECT DISTINCT DATE(last_watch_time) as study_date
    FROM video_progress
    WHERE user_id = ? AND last_watch_time IS NOT NULL
    ORDER BY study_date DESC
    LIMIT 30
  `).all(userId);

  if (dates.length === 0) return { streakDays: 0, totalStudyDays: 0 };

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // 如果今天或昨天没有学习，连续天数断开
  if (dates[0].study_date !== today && dates[0].study_date !== yesterday) {
    return { streakDays: 0, totalStudyDates: dates.length };
  }

  // 计算连续天数
  let streak = 1;
  for (let i = 0; i < dates.length - 1; i++) {
    const current = new Date(dates[i].study_date);
    const next = new Date(dates[i + 1].study_date);
    const diffDays = Math.round((current - next) / 86400000);
    if (diffDays === 1) streak++;
    else break;
  }

  return { streakDays: streak, totalStudyDates: dates.length };
}

/**
 * GET /api/mp/videos/my-notes - 我的笔记列表
 */
router.get('/videos/my-notes', async (req, res) => {
  verifyUser(req, res, (decoded) => {
    ensureTables();
    const db = getDB();

    const notes = db.prepare(`
      SELECT vp.video_id, v.title, v.cover_url, vp.notes, vp.updated_at
      FROM video_progress vp
      JOIN videos v ON v.id = vp.video_id AND v.status = 1
      WHERE vp.user_id = ? AND vp.notes IS NOT NULL AND vp.notes != ''
      ORDER BY vp.updated_at DESC
    `).all(decoded.id);

    return success(res, notes.map(n => ({
      ...n,
      videoId: String(n.video_id),
      coverUrl: n.cover_url,
    })));
  });
});

/**
 * POST /api/mp/videos/:id/notes - 保存笔记
 */
router.post('/videos/:id/notes', async (req, res) => {
  verifyUser(req, res, (decoded) => {
    ensureTables();
    const db = getDB();
    const { notes } = req.body;

    // 确保有进度记录（如果没有则创建一条空进度）
    db.prepare(`
      INSERT INTO video_progress (user_id, video_id, notes)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id, video_id) DO UPDATE SET notes = ?, updated_at = datetime('now','localtime')
    `).run(decoded.id, req.params.id, notes || '', notes || '');

    return success(res, null, '笔记已保存');
  });
});

// ==================== 视频搜索 ====================

/**
 * GET /api/mp/videos/search - 视频搜索
 */
router.get('/videos/search', async (req, res) => {
  verifyUser(req, res, (decoded) => {
    ensureTables();
    const db = getDB();
    const { q, page = 1, pageSize = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const userLevel = decoded.agent_level || decoded.agentLevel || 1;

    if (!q || !q.trim()) return error(res, '请输入搜索关键词');

    const keyword = '%' + q.trim() + '%';
    const videos = db.prepare(`
      SELECT v.*, vc.name as category_name_real,
             EXISTS(SELECT 1 FROM video_orders WHERE user_id = ? AND target_type = 'video'
               AND target_id = v.id AND status = 'paid') as is_purchased
      FROM videos v
      LEFT JOIN video_categories vc ON v.category_id = vc.id
      WHERE v.status = 1
        AND (v.access_level = 'all' OR v.access_level IS NULL OR CAST(v.access_level AS INTEGER) <= ?)
        AND (v.title LIKE ? OR v.description LIKE ? OR v.tags LIKE ? OR v.instructor LIKE ?)
      ORDER BY v.view_count DESC
      LIMIT ? OFFSET ?
    `).all(decoded.id, userLevel, keyword, keyword, keyword, keyword, parseInt(pageSize), offset);

    // 同时搜索系列课
    const seriesList = db.prepare(`
      SELECT s.* as series_match
      FROM video_series s
      WHERE s.status = 1
        AND (s.access_level = 'all' OR s.access_level IS NULL OR CAST(s.access_level AS INTEGER) <= ?)
        AND (s.title LIKE ? OR s.description LIKE ? OR s.tags LIKE ? OR s.instructor LIKE ?)
      ORDER BY s.view_count DESC
      LIMIT 5
    `).all(userLevel, keyword, keyword, keyword, keyword);

    return success(res, {
      videos: videos.map(formatVideoForMP),
      series: seriesList.map(s => ({
        id: String(s.id),
        title: s.title,
        coverUrl: s.cover_url || '',
        price: parseFloat(s.price) || 0,
        instructor: s.instructor || '',
        totalEpisodes: s.total_episodes || 0,
      })),
      hasMore: videos.length >= parseInt(pageSize),
    });
  });
});

module.exports = router;
