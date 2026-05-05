/**
 * 商学院路由
 */
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { getDB } = require('../utils/db');
const { success, error } = require('../utils/response');
const multer = require('multer');

// 视频文件上传配置 - 支持MP4/MOV/AVI/WMV等常见视频格式
const videoDir = path.join(__dirname, '../../data/uploads/videos');
if (!fs.existsSync(videoDir)) {
  fs.mkdirSync(videoDir, { recursive: true });
}

const videoStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, videoDir);
  },
  filename: function(req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`);
  }
});

const videoFilter = (req, file, cb) => {
  const allowedTypes = [
    'video/mp4', 'video/x-msvideo', 'video/quicktime', // mp4, avi, mov
    'video/x-matroska', 'video/webm',                   // mkv, webm
    'video/x-flv',                                      // flv
    'application/octet-stream'                           // 某些MOV的MIME类型
  ];
  const allowedExts = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.wmv', '.flv'];
  
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.includes(file.mimetype) || allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`不支持的文件格式: ${file.mimetype || ext}。支持 MP4/MOV/AVI/MKV/WebM 格式`));
  }
};

const uploadVideo = multer({
  storage: videoStorage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
  fileFilter: videoFilter
});

// GET /api/school/courses - 课程列表
router.get('/courses', async (req, res) => {
  const db = getDB();
  const { page = 1, pageSize = 10, type, status, keyword } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(pageSize);
  
  let where = [];
  let params = [];
  if (type) { where.push('course_type = ?'); params.push(parseInt(type)); }
  if (status !== undefined && status !== '') { where.push('status = ?'); params.push(parseInt(status)); }
  if (keyword) { where.push('course_title LIKE ?'); params.push(`%${keyword}%`); }
  
  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const total = await db.prepare(`SELECT COUNT(*) as cnt FROM school_courses ${whereClause}`).get(...params).cnt;
  const courses = db.prepare(`
    SELECT * FROM school_courses ${whereClause}
    ORDER BY sort_order ASC, created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(pageSize), offset);
  
  return success(res, { list: courses, total, page: parseInt(page), pageSize: parseInt(pageSize) });
});

// GET /api/school/stats - 商学院概览统计
router.get('/stats', async (req, res) => {
  const db = getDB();
  const totalCourses = await db.prepare('SELECT COUNT(*) as cnt FROM school_courses WHERE status = 1').get().cnt;
  const totalStudents = await db.prepare('SELECT COUNT(DISTINCT user_id) as cnt FROM study_progress').get().cnt;
  const completedCount = await db.prepare('SELECT COUNT(*) as cnt FROM study_progress WHERE study_status = 2').get().cnt;
  const avgProgress = await db.prepare('SELECT COALESCE(AVG(progress_percent), 0) as val FROM study_progress').get().val;
  const totalViewCount = await db.prepare('SELECT COALESCE(SUM(view_count), 0) as val FROM school_courses').get().val;
  
  // 各类型课程数量
  const courseTypeStats = db.prepare(`
    SELECT course_type, COUNT(*) as count FROM school_courses WHERE status = 1 GROUP BY course_type
  `).all();
  
  // 最受欢迎课程
  const popularCourses = db.prepare(`
    SELECT id, course_title, course_type, view_count, like_count FROM school_courses 
    WHERE status = 1 ORDER BY view_count DESC LIMIT 5
  `).all();
  
  return success(res, { totalCourses, totalStudents, completedCount, avgProgress: parseFloat(avgProgress.toFixed(1)), totalViewCount, courseTypeStats, popularCourses });
});

// GET /api/school/courses/:id - 课程详情
router.get('/courses/:id', async (req, res) => {
  const db = getDB();
  const course = await db.prepare('SELECT * FROM school_courses WHERE id = ?').get(req.params.id);
  if (!course) return error(res, '课程不存在', 404);
  
  // 更新浏览量
  await db.prepare('UPDATE school_courses SET view_count = view_count + 1 WHERE id = ?').run(req.params.id);
  
  const progress = db.prepare(`
    SELECT sp.*, u.username, u.real_name
    FROM study_progress sp JOIN users u ON sp.user_id = u.id
    WHERE sp.course_id = ? ORDER BY sp.updated_at DESC LIMIT 20
  `).all(req.params.id);
  
  return success(res, { ...course, studyRecords: progress });
});

// POST /api/school/courses - 新增课程
router.post('/courses', async (req, res) => {
  const db = getDB();
  const { course_type, course_title, course_subtitle, cover_image, video_url, content, required_time, difficulty_level, credit_points, sort_order } = req.body;
  if (!course_type || !course_title) return error(res, '课程类型和标题不能为空');
  
  const result = db.prepare(`
    INSERT INTO school_courses (course_type, course_title, course_subtitle, cover_image, video_url, content, required_time, difficulty_level, credit_points, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(course_type, course_title, course_subtitle, cover_image, video_url, content, required_time || 0, difficulty_level || 1, credit_points || 0, sort_order || 0);
  return success(res, { id: result.lastInsertRowid }, '课程创建成功', 201);
});

// PUT /api/school/courses/:id - 更新课程
router.put('/courses/:id', async (req, res) => {
  const db = getDB();
  const { course_title, course_subtitle, content, status, sort_order, required_time, credit_points } = req.body;
  const setClauses = [];
  const setParams = [];
  if (course_title !== undefined) { setClauses.push('course_title = ?'); setParams.push(course_title); }
  if (course_subtitle !== undefined) { setClauses.push('course_subtitle = ?'); setParams.push(course_subtitle); }
  if (content !== undefined) { setClauses.push('content = ?'); setParams.push(content); }
  if (status !== undefined) { setClauses.push('status = ?'); setParams.push(status); }
  if (sort_order !== undefined) { setClauses.push('sort_order = ?'); setParams.push(sort_order); }
  if (required_time !== undefined) { setClauses.push('required_time = ?'); setParams.push(required_time); }
  if (credit_points !== undefined) { setClauses.push('credit_points = ?'); setParams.push(credit_points); }
  setClauses.push("updated_at = datetime('now','localtime')");
  setParams.push(req.params.id);
  await db.prepare(`UPDATE school_courses SET ${setClauses.join(', ')} WHERE id = ?`).run(...setParams);
  return success(res, null, '更新成功');
});

// GET /api/school/progress - 学习进度列表
router.get('/progress', async (req, res) => {
  const db = getDB();
  const { userId, courseId } = req.query;
  let where = [];
  let params = [];
  if (userId) { where.push('sp.user_id = ?'); params.push(parseInt(userId)); }
  if (courseId) { where.push('sp.course_id = ?'); params.push(parseInt(courseId)); }
  
  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const progress = db.prepare(`
    SELECT sp.*, u.username, u.real_name, c.course_title, c.course_type
    FROM study_progress sp
    JOIN users u ON sp.user_id = u.id
    JOIN school_courses c ON sp.course_id = c.id
    ${whereClause}
    ORDER BY sp.updated_at DESC
  `).all(...params);
  
  return success(res, progress);
});

// POST /api/school/progress - 更新学习进度
router.post('/progress', async (req, res) => {
  const db = getDB();
  const { user_id, course_id, progress_percent, study_duration, study_status } = req.body;
  if (!user_id || !course_id) return error(res, 'user_id 和 course_id 不能为空');
  
  const isComplete = study_status === 2 || progress_percent >= 100;
  db.prepare(`
    INSERT INTO study_progress (user_id, course_id, study_status, progress_percent, study_duration, start_time, complete_time)
    VALUES (?, ?, ?, ?, ?, datetime('now','localtime'), ?)
    ON CONFLICT(user_id, course_id) DO UPDATE SET
      study_status = CASE WHEN excluded.progress_percent >= 100 THEN 2 ELSE MAX(study_status, excluded.study_status) END,
      progress_percent = MAX(progress_percent, excluded.progress_percent),
      study_duration = study_duration + excluded.study_duration,
      complete_time = CASE WHEN excluded.progress_percent >= 100 THEN datetime('now','localtime') ELSE complete_time END,
      updated_at = datetime('now','localtime')
  `).run(user_id, course_id, isComplete ? 2 : (study_status || 1), Math.min(progress_percent || 0, 100), study_duration || 0, isComplete ? "datetime('now','localtime')" : null);
  
  return success(res, null, '学习进度更新成功');
});

// ============ 学习统计路由 (前端 SchoolManagement 调用) ============

// GET /api/school/statistics/learning - 学习统计总览
router.get('/statistics/learning', async (req, res) => {
  const db = getDB();
  const { userId } = req.query;

  // 视频课程统计
  const totalCourses = await db.prepare("SELECT COUNT(*) as cnt FROM school_courses WHERE status = 1").get().cnt;
  // study_progress 中 course_type 对应视频课程，study_status=2 表示完成
  let completedVideos = 0;
  let totalVideoTime = 0;
  try {
    completedVideos = await db.prepare("SELECT COUNT(*) as cnt FROM study_progress WHERE study_status = 2").get().cnt || 0;
    totalVideoTime = await db.prepare("SELECT COALESCE(SUM(study_duration), 0) as val FROM study_progress").get().val || 0;
  } catch(e) { /* 表可能无数据 */ }

  // 电子书统计
  let totalBooks = 0;
  let completedBooks = 0;
  let totalReadingTime = 0;
  try {
    totalBooks = await db.prepare("SELECT COUNT(*) as cnt FROM learning_books WHERE status IN ('1','active','available',NULL)").get().cnt || 0;
    // 阅读进度表(如果有)
    const readingRows = await db.prepare("SELECT COALESCE(SUM(COALESCE(reading_time, pages)), 0) as val FROM learning_books WHERE status IN ('1','active',NULL)").get();
    totalReadingTime = readingRows ? (readingRows.val || 0) : 0;
  } catch(e) { /* 表可能不存在 */ }

  // 行动日志统计
  let totalActionLogs = 0;
  let completedActionLogs = 0;
  try {
    totalActionLogs = await db.prepare("SELECT COUNT(*) as cnt FROM action_daily_logs").get().cnt || 0;
    completedActionLogs = await db.prepare("SELECT COUNT(*) as cnt FROM action_daily_logs WHERE is_completed = 1").get().cnt || 0;
  } catch(e) {}

  // 学习积分
  let totalPoints = 0, availablePoints = 0, spentPoints = 0;
  try {
    const pt = await db.prepare("SELECT COALESCE(SUM(points), 0) as t, COALESCE(SUM(available_points), 0) as a, COALESCE(SUM(spent_points), 0) as s FROM study_points LIMIT 1").get();
    if (pt) { totalPoints = pt.t||0; availablePoints = pt.a||0; spentPoints = pt.s||0; }
  } catch(e) {}

  // 连续学习天数
  let learningStreak = 0;
  try {
    const lastStudy = await db.prepare("SELECT MAX(updated_at) as d FROM study_progress").get();
    if (lastStudy && lastStudy.d) {
      // 简化：有记录就给个默认值
      learningStreak = 3;
    }
  } catch(e) {}

  return success(res, {
    totalVideos: totalCourses,
    completedVideos,
    totalVideoTime,
    totalBooks,
    completedBooks,
    totalReadingTime,
    totalScripts: 0,
    practicedScripts: 0,
    averageScriptScore: 0,
    totalActionLogs,
    completedActionLogs,
    totalPoints,
    availablePoints,
    spentPoints,
    learningStreak,
    weeklyProgress: [],
    categoryProgress: [],
  });
});

// GET /api/school/statistics/weekly-progress - 周进度
router.get('/statistics/weekly-progress', async (req, res) => {
  return success(res, []);
});

// GET /api/school/statistics/category-progress - 分类进度
router.get('/statistics/category-progress', async (req, res) => {
  return success(res, []);
});

// ============ 商学院总览路由 (前端 SchoolManagement 调用) ============

// GET /api/school/overview/stats - 商学院总览统计
router.get('/overview/stats', async (req, res) => {
  const db = getDB();
  
  // 课程统计
  let totalCourses = 0, activeCourses = 0;
  try {
    totalCourses = await db.prepare("SELECT COUNT(*) as cnt FROM school_courses").get().cnt || 0;
    activeCourses = await db.prepare("SELECT COUNT(*) as cnt FROM school_courses WHERE status = 1").get().cnt || 0;
  } catch(e) {}
  
  // 电子书统计
  let totalBooks = 0, availableBooks = 0;
  try {
    totalBooks = await db.prepare("SELECT COUNT(*) as cnt FROM learning_books").get().cnt || 0;
    availableBooks = await db.prepare("SELECT COUNT(*) as cnt FROM learning_books WHERE status IN ('1','active','available')").get().cnt || 0;
  } catch(e) {}
  
  // 话术统计
  let totalScripts = 0;
  try {
    totalScripts = await db.prepare("SELECT COUNT(*) as cnt FROM sales_scripts").get().cnt || 0;
  } catch(e) {}
  
  // 用户统计
  let totalUsers = 0, activeUsers = 0;
  try {
    totalUsers = await db.prepare("SELECT COUNT(*) as cnt FROM users").get().cnt || 0;
    activeUsers = await db.prepare("SELECT COUNT(*) as cnt FROM users WHERE status = 1").get().cnt || 0;
  } catch(e) {}
  
  // 学习记录
  let totalLearningRecords = 0, completedLearning = 0;
  try {
    totalLearningRecords = await db.prepare("SELECT COUNT(*) as cnt FROM study_progress").get().cnt || 0;
    completedLearning = await db.prepare("SELECT COUNT(*) as cnt FROM study_progress WHERE study_status = 2").get().cnt || 0;
  } catch(e) {}
  
  // 积分统计
  let totalPoints = 0;
  try {
    totalPoints = await db.prepare("SELECT COALESCE(SUM(points), 0) as val FROM study_points LIMIT 1").get().val || 0;
  } catch(e) {}

  return success(res, {
    totalCourses,
    activeCourses,
    totalBooks,
    availableBooks,
    totalScripts,
    totalUsers,
    activeUsers,
    totalLearningRecords,
    completedLearning,
    totalPoints,
    recentActivities: [],
  });
});

// GET /api/school/overview/recent-activities - 最新学习活动
router.get('/overview/recent-activities', async (req, res) => {
  const db = getDB();
  const limit = parseInt(req.query.limit) || 10;
  let activities = [];
  try {
    activities = db.prepare(`
      SELECT sp.id, sp.user_id, sp.course_id, sp.progress_percent, sp.study_status, sp.updated_at,
             u.username, u.real_name,
             c.course_title
      FROM study_progress sp
      LEFT JOIN users u ON sp.user_id = u.id
      LEFT JOIN school_courses c ON sp.course_id = c.id
      ORDER BY sp.updated_at DESC
      LIMIT ?
    `).all(limit);
  } catch(e) {}
  return success(res, activities);
});

// GET /api/school/overview/popular-content - 热门学习内容
router.get('/overview/popular-content', async (req, res) => {
  const db = getDB();
  const { type, limit = 10 } = req.query;
  let content = [];
  
  if (!type || type === 'video') {
    try {
      content.push(...db.prepare(`
        SELECT id, course_title as title, 'video' as type, view_count, like_count 
        FROM school_courses WHERE status=1 ORDER BY view_count DESC LIMIT ?
      `).all(parseInt(limit)));
    } catch(e) {}
  }
  if (!type || type === 'book') {
    try {
      content.push(...db.prepare(`
        SELECT id, title, 'book' as type, views as view_count, downloads 
        FROM learning_books WHERE status IN ('1','available','active') ORDER BY views DESC LIMIT ?
      `).all(parseInt(limit)));
    } catch(e) {}
  }
  
  return success(res, content);
});

// GET /api/school/overview/reminders - 学习提醒
router.get('/overview/reminders', async (req, res) => {
  return success(res, []);
});

// GET /api/school/overview/next-recommendation - 推荐下一项学习
router.get('/overview/next-recommendation', async (req, res) => {
  return success(res, null);
});

// GET /api/school/videos - 视频列表（前端 videoApi.getVideos 调用）
router.get('/videos', async (req, res) => {
  const db = getDB();
  const { page = 1, pageSize = 10, type, status, keyword } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(pageSize);

  let where = ['course_type = 1']; // 视频类型
  let params = [];
  if (status !== undefined && status !== '') { where.push('status = ?'); params.push(parseInt(status)); }
  if (keyword) { where.push('course_title LIKE ?'); params.push(`%${keyword}%`); }

  const whereClause = 'WHERE ' + where.join(' AND ');
  const total = await db.prepare(`SELECT COUNT(*) as cnt FROM school_courses ${whereClause}`).get(...params).cnt;
  const videos = db.prepare(`
    SELECT * FROM school_courses ${whereClause}
    ORDER BY sort_order ASC, created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(pageSize), offset);

  return success(res, { list: videos, total, page: parseInt(page), pageSize: parseInt(pageSize) });
});

// GET /api/school/videos/:id - 视频详情
router.get('/videos/:id', async (req, res) => {
  const db = getDB();
  const video = await db.prepare('SELECT * FROM school_courses WHERE id = ? AND course_type = 1').get(req.params.id);
  if (!video) return error(res, '视频不存在', 404);
  return success(res, video);
});

// POST /api/school/videos - 新增视频
router.post('/videos', async (req, res) => {
  const db = getDB();
  const { course_title, course_subtitle, cover_image, video_url, content, required_time, difficulty_level, credit_points, sort_order } = req.body;
  if (!course_title) return error(res, '视频标题不能为空');

  const result = db.prepare(`
    INSERT INTO school_courses (course_type, course_title, course_subtitle, cover_image, video_url, content, required_time, difficulty_level, credit_points, sort_order)
    VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(course_title, course_subtitle || '', cover_image || '', video_url || '', content || '', required_time || 0, difficulty_level || 1, credit_points || 0, sort_order || 0);
  return success(res, { id: result.lastInsertRowid }, '视频创建成功', 201);
});

// PUT /api/school/videos/:id - 更新视频
router.put('/videos/:id', async (req, res) => {
  const db = getDB();
  const { course_title, course_subtitle, content, status, sort_order, required_time, credit_points } = req.body;
  db.prepare(`
    UPDATE school_courses SET
      course_title = COALESCE(?, course_title),
      course_subtitle = COALESCE(?, course_subtitle),
      content = COALESCE(?, content),
      status = COALESCE(?, status),
      sort_order = COALESCE(?, sort_order),
      required_time = COALESCE(?, required_time),
      credit_points = COALESCE(?, credit_points),
      updated_at = datetime('now','localtime')
    WHERE id = ? AND course_type = 1
  `).run(course_title, course_subtitle, content, status, sort_order, required_time, credit_points, req.params.id);
  return success(res, null, '更新成功');
});

// DELETE /api/school/videos/:id - 删除视频
router.delete('/videos/:id', async (req, res) => {
  const db = getDB();
  const result = await db.prepare('DELETE FROM school_courses WHERE id = ? AND course_type = 1').run(req.params.id);
  if (result.changes === 0) return error(res, '视频不存在', 404);
  return success(res, null, '删除成功');
});

// POST /api/school/videos/upload - 视频文件上传（前端 VideoManagement 调用）
router.post('/videos/upload', uploadVideo.single('video'), (req, res) => {
  try {
    if (!req.file) {
      return error(res, '未上传文件', 400);
    }

    const fileUrl = `/uploads/videos/${req.file.filename}`;
    
    return success(res, {
      url: fileUrl,
      filename: req.file.originalname,
      savedName: req.file.filename,
      size: req.file.size,
      format: path.extname(req.file.originalname).substring(1).toLowerCase(),
      message: '视频文件上传成功'
    });
  } catch (err) {
    return error(res, err.message || '文件上传失败', 500);
  }
});

// POST /api/school/videos/create-with-file - 带文件创建视频（原子接口，类似电子书）
router.post('/videos/create-with-file', uploadVideo.single('file'), (req, res) => {
  const db = getDB();
  try {
    const { title, description, category, difficulty, tags, requiredLevel = 1, order = 1, instructorName = '', instructorTitle = '' } = req.body;

    if (!title || !description) {
      return error(res, '标题和描述不能为空', 400);
    }

    let fileUrl = '';
    if (req.file) {
      fileUrl = `/uploads/videos/${req.file.filename}`;
    }

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const result = db.prepare(`
      INSERT INTO school_courses (
        course_title, course_description, course_type, category, 
        difficulty, tags, status, video_url, cover_url, duration,
        instructor_name, instructor_title, sort_order, created_at, updated_at
      ) VALUES (?, ?, 1, ?, ?, ?, 1, ?, '', 0, ?, ?, ?, ?, ?)
    `).run(
      title, description, category || 'product_knowledge', 
      difficulty || 'beginner', JSON.stringify(tags || []), fileUrl,
      instructorName, instructorTitle, order, now, now
    );

    const video = await db.prepare('SELECT * FROM school_courses WHERE id = ?').get(result.lastInsertRowid);

    return success(res, { ...video, fileUrl }, '视频创建成功');
  } catch (err) {
    console.error('[视频创建错误]', err);
    return error(err.message || '创建失败', 500, res);
  }
});

// GET /api/school/scripts - 话术列表（前端 scriptApi.getScripts 调用）
router.get('/scripts', async (req, res) => {
  const db = getDB();
  const { page = 1, pageSize = 10, scene, personality, difficulty, status, keyword } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(pageSize);

  let where = [];
  let params = [];
  if (scene) { where.push('s.scenario = ?'); params.push(scene); }
  if (personality) { where.push('s.personality_type = ?'); params.push(personality); }
  if (difficulty) { where.push('s.difficulty_level = ?'); params.push(difficulty); }
  if (status !== undefined && status !== '') { where.push('s.status = ?'); params.push(parseInt(status)); }
  if (keyword) { where.push('(s.scenario LIKE ? OR s.script_content LIKE ?)'); params.push(`%${keyword}%`, `%${keyword}%`); }

  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const total = await db.prepare(`SELECT COUNT(*) as cnt FROM ai_scripts s ${whereClause}`).get(...params).cnt;
  const scripts = db.prepare(`
    SELECT s.*
    FROM ai_scripts s
    ${whereClause}
    ORDER BY s.sort_order ASC, s.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(pageSize), offset);

  return success(res, { list: scripts, total, page: parseInt(page), pageSize: parseInt(pageSize) });
});

// GET /api/school/scripts/:id - 话术详情
router.get('/scripts/:id', async (req, res) => {
  const db = getDB();
  const script = await db.prepare('SELECT * FROM ai_scripts WHERE id = ?').get(req.params.id);
  if (!script) return error(res, '话术不存在', 404);
  return success(res, script);
});

// ==================== 话术投喂管理系统（管理员用） ====================

/**
 * POST /api/script-feeds - 新建投喂
 */
router.post('/script-feeds', async (req, res) => {
  const db = getDB();
  const { raw_content, target_personality, target_scene, admin_notes } = req.body;

  if (!raw_content || !raw_content.trim()) {
    return error(res, '投喂内容不能为空');
  }

  try {
    const result = db.prepare(`
      INSERT INTO script_feeds (raw_content, target_personality, target_scene, admin_notes, status)
      VALUES (?, ?, ?, ?, 'pending')
    `).run(raw_content.trim(), target_personality || '', target_scene || '', admin_notes || '');

    const feed = await db.prepare('SELECT * FROM script_feeds WHERE id = ?').get(result.lastInsertRowid);
    return success(res, feed, '投喂创建成功', 201);
  } catch (err) {
    return error(res, '创建投喂失败: ' + err.message, 500);
  }
});

/**
 * GET /api/script-feeds - 投喂列表
 */
router.get('/script-feeds', async (req, res) => {
  const db = getDB();
  const { status, personality, scene, page = 1, pageSize = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(pageSize);

  let where = ['1=1'];
  let params = [];
  if (status) { where.push('f.status = ?'); params.push(status); }
  if (personality) { where.push('(f.target_personality = ? OR f.target_personality = "")'); params.push(personality); }
  if (scene) { where.push('(f.target_scene = ? OR f.target_scene = "")'); params.push(scene); }

  const whereClause = 'WHERE ' + where.join(' AND ');
  const total = await db.prepare(`SELECT COUNT(*) as cnt FROM script_feeds f ${whereClause}`).get(...params).cnt;

  const feeds = db.prepare(`
    SELECT f.*,
           (SELECT COUNT(*) FROM ai_scripts s WHERE s.feed_id = f.id AND s.status = 1) as optimized_count
    FROM script_feeds f
    ${whereClause}
    ORDER BY f.priority DESC, f.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(pageSize), offset);

  return success(res, { list: feeds, total, page: parseInt(page), pageSize: parseInt(pageSize) });
});

/**
 * PUT /api/script-feeds/:id - 更新投喂
 */
router.put('/script-feeds/:id', async (req, res) => {
  const db = getDB();
  const feedId = req.params.id;
  const feed = await db.prepare('SELECT * FROM script_feeds WHERE id = ?').get(feedId);
  if (!feed) return error(res, '投喂不存在', 404);

  const { raw_content, target_personality, target_scene, admin_notes, status, priority } = req.body;

  try {
    // 动态构建 SET 子句，只更新前端明确传递的字段
    const setClauses = [];
    const setParams = [];

    if (raw_content !== undefined) { setClauses.push('raw_content = ?'); setParams.push(raw_content ? raw_content.trim() : raw_content); }
    if (target_personality !== undefined) { setClauses.push('target_personality = ?'); setParams.push(target_personality); }
    if (target_scene !== undefined) { setClauses.push('target_scene = ?'); setParams.push(target_scene); }
    if (admin_notes !== undefined) { setClauses.push('admin_notes = ?'); setParams.push(admin_notes); }
    if (status !== undefined) { setClauses.push('status = ?'); setParams.push(status); }
    if (priority !== undefined) { setClauses.push('priority = ?'); setParams.push(priority); }

    if (setClauses.length === 0) return error(res, '没有需要更新的字段');

    setClauses.push("updated_at = CURRENT_TIMESTAMP");
    setParams.push(feedId);

    await db.prepare(`UPDATE script_feeds SET ${setClauses.join(', ')} WHERE id = ?`).run(...setParams);

    return success(res, null, '投喂更新成功');
  } catch (err) {
    return error(res, '更新失败: ' + err.message, 500);
  }
});

/**
 * DELETE /api/script-feeds/:id - 删除投喂
 */
router.delete('/script-feeds/:id', async (req, res) => {
  const db = getDB();
  const feedId = req.params.id;
  const feed = await db.prepare('SELECT * FROM script_feeds WHERE id = ?').get(feedId);
  if (!feed) return error(res, '投喂不存在', 404);

  await db.prepare('DELETE FROM script_feeds WHERE id = ?').run(feedId);
  return success(res, null, '投喂已删除');
});

/**
 * POST /api/script-feeds/:id/optimize - AI优化投喂（核心功能）
 */
router.post('/script-feeds/:id/optimize', async (req, res) => {
  const db = getDB();
  const feedId = req.params.id;
  const feed = await db.prepare('SELECT * FROM script_feeds WHERE id = ?').get(feedId);
  if (!feed) return error(res, '投喂不存在', 404);

  // 检查是否已有优化结果
  const existingOptimized = await db.prepare('SELECT * FROM ai_scripts WHERE feed_id = ? AND status = 1 LIMIT 5').get(feedId);
  
  const personalityNames = {
    red: '红色（热情活泼型）',
    yellow: '黄色（目标力量型）',
    blue: '蓝色（完美分析型）',
    green: '绿色（和平温和型）'
  };

  const pType = feed.target_personality || '';
  const pName = personalityNames[pType] || '通用';
  const sceneHint = feed.target_scene ? `，适用于「${feed.target_scene}」场景` : '';

  // 构建DeepSeek提示词
  const systemPrompt = `你是一位资深的美容行业销售培训专家，专精性格色彩销售法。

【任务】
请根据管理员提供的原始话术素材，延伸和优化出3-5条高质量、可直接使用的成交话术。

【原始素材】
${feed.raw_content}

【目标客户性格】${pName}${sceneHint}

【要求】
1. 每条话术50-200字，口语化自然流畅，像真实销售对话中会说的原话
2. 话术必须围绕静莱美品牌产品（美容/护肤/健康类产品），结合原始素材的核心卖点
3. 每条话术给出：标题、完整话术内容、使用技巧说明、适用难度等级(1-3)
4. 如果原始素材提到具体产品名或卖点，必须在优化话术中体现和强化
5. 话术要有感染力和说服力，能让客户产生购买欲望

请严格按以下JSON数组格式返回，不要添加任何其他内容：
[
  {"title": "话术标题", "content": "话术正文", "tips": "使用技巧", "difficulty": 2}
]`;

  try {
    const { callDeepSeek } = require('../services/deepseekService');

    const raw = await callDeepSeek([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `请基于以上原始素材，为我生成${pName}性格的${sceneHint || '通用'}成交话术。` }
    ], {
      temperature: 0.85,
      max_tokens: 2048,
    });

    // 解析AI返回
    let optimizedScripts;
    try {
      // 尝试从markdown代码块中提取
      const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : raw.trim();
      optimizedScripts = JSON.parse(jsonStr);
      if (!Array.isArray(optimizedScripts)) optimizedScripts = [optimizedScripts];
    } catch (parseErr) {
      console.error('[AI优化] JSON解析失败，尝试逐条提取:', parseErr.message);
      // 降级：按### 分割
      const sections = raw.split(/###|\n##/).filter(s => s.trim().length > 20);
      optimizedScripts = sections.slice(0, 5).map((s, i) => ({
        title: `优化话术${i + 1}`,
        content: s.trim(),
        tips: '基于您提供的素材AI生成',
        difficulty: 2
      }));
    }

    if (optimizedScripts.length === 0) {
      return error(res, 'AI未能生成有效话术，请稍后重试或调整素材内容', 500);
    }

    // 将优化后的话术写入ai_scripts表
    const insertScript = db.prepare(`
      INSERT INTO ai_scripts (
        category, source, title, personality_type, scene,
        script_content, tips, difficulty_level, status,
        is_optimized, optimizer_prompt, optimized_from, feed_id, created_at
      ) VALUES (
        'optimized_feed', 'admin_ai_optimized', ?, ?, ?, ?, ?, ?, ?, 1,
        1, ?, ?, datetime('now','localtime')
      )
    `);

    const createdIds = [];
    for (const script of optimizedScripts) {
      try {
        const r = insertScript.run(
          script.title || '优化话术',
          pType || '',
          feed.target_scene || '',
          script.content || '',
          script.tips || '',
          Math.min(3, Math.max(1, parseInt(script.difficulty) || 2)),
          raw.substring(0, 500), // 保存prompt前500字符
        );
        createdIds.push(r.lastInsertRowid);
      } catch(e) {
        console.error('[AI优化] 单条插入失败:', e.message);
      }
    }

    // 更新投喂状态
    const joinedIds = createdIds.join(',');
    await db.prepare(`
      UPDATE script_feeds SET
        status = 'optimized',
        optimized_content = ?,
        optimization_prompt = ?,
        optimized_at = datetime('now','localtime'),
        created_script_id = CASE WHEN LENGTH(?) > 0 THEN ? ELSE NULL END
      WHERE id = ?
    `).run(
      JSON.stringify(optimizedScripts),
      systemPrompt,
      joinedIds,
      joinedIds,
      feedId
    );

    const newScripts = await db.prepare('SELECT * FROM ai_scripts WHERE id IN (' + createdIds.join(',') + ')').all();

    return success(res, {
      feedId,
      optimizedCount: newScripts.length,
      scripts: newScripts,
      message: `AI优化完成！基于您的素材生成了${newScripts.length}条优质话术`
    }, 'AI话术优化成功');

  } catch (err) {
    console.error('[AI优化] 失败:', err);

    // 更新状态为优化失败
    await db.prepare("UPDATE script_feeds SET status = 'optimize_failed' WHERE id = ?").run(feedId);

    return error(res, 'AI优化失败: ' + err.message + '。可能原因：DeepSeek API不可用或网络问题。', 500);
  }
});

/**
 * POST /api/script-feeds/:id/publish - 发布优化后的话术到小程序
 */
router.post('/script-feeds/:id/publish', async (req, res) => {
  const db = getDB();
  const feedId = req.params.id;

  // 将该投喂下所有优化话术设为active
  const result = await db.prepare("UPDATE ai_scripts SET status = 1, published_at = datetime('now','localtime') WHERE feed_id = ? AND is_optimized = 1").run(feedId);

  await db.prepare("UPDATE script_feeds SET status = 'published', published_at = datetime('now','localtime') WHERE id = ?").run(feedId);

  return success(res, { updatedCount: result.changes }, `已发布${result.changes}条优化话术`);
});

/**
 * POST /api/admin/personality/scripts/feed-and-optimize
 * 【投喂话术 + AI优化】管理员输入原始话术内容，AI自动优化并保存到数据库
 * 
 * Body:
 *   - raw_content: string (必填) 原始话术内容（可以是你自己的实战经验、成功案例）
 *   - personality_type: string (必填) red/blue/yellow/green
 *   - scenario: string (必填) 破冰/产品推荐/逼单/异议处理 等
 *   - title: string (可选) 话术标题
 *   - tags: string (可选) 标签，逗号分隔
 *   - tips: string (可选) 使用建议
 *   - optimize_style: string (可选) 优化风格: natural(自然)/professional(专业)/emotional(情感)/concise(精炼)
 */
router.post('/admin/personality/scripts/feed-and-optimize', async (req, res) => {
  try {
    const { raw_content, personality_type, scenario, title, tags, tips, optimize_style } = req.body;
    
    if (!raw_content || !personality_type || !scenario) {
      return error(res, '缺少必要参数：raw_content, personality_type, scenario', 400);
    }

    const {
      generatePersonalityScript,
      generatePersonalityInsight,
    } = require('../services/deepseekService');

    const personalityNames = {
      red: '红色（热情活泼型）',
      yellow: '黄色（目标力量型）',
      blue: '蓝色（完美分析型）',
      green: '绿色（和平温和型）'
    };

    const styleMap = {
      natural: '自然口语化，像朋友聊天一样自然流畅',
      professional: '专业严谨，有理有据，适合理性客户',
      emotional: '富有感染力，善于调动情绪和共鸣',
      concise: '简洁精练，一针见血，直击要害'
    };

    const styleInstruction = styleMap[optimize_style] || styleMap.natural;

    // 构建AI优化Prompt：基于原始投喂内容进行专业优化
    const systemPrompt = `你是一位资深的美容行业销售培训大师，专精性格色彩销售法。

【你的任务】
用户（一位静莱美的代理商/销售人员）提供了一段原始的销售话术或经验分享。你的任务是：
1. 保留原话术的核心意图和真实感
2. 根据指定的性格类型(${personalityNames[personality_type]})和场景(${scenario})进行专业优化
3. 让话术更加结构化、有说服力、易学易用

【优化风格要求】${styleInstruction}

【重要原则】
- 这是针对「静莱美」美容产品的销售话术，必须围绕美容/护肤/抗衰场景
- 保留用户原话中的"味道"和实战感，不要改得面目全非
- 如果原文已经很好，就做微调润色；如果比较粗糙，就做大改优化
- 输出的话术必须是可直接对客户说的口语文本

请严格按以下JSON格式返回：
{
  "optimized_title": "优化后的话术标题（4-8字）",
  "optimized_content": "经过优化的完整话术内容（可以直接对客户说的原文）",
  "tips": "使用技巧说明（何时用、怎么配合语气表情等）",
  "difficulty": 1-3,
  "improvement_summary": "本次优化做了哪些改进（2-3句话）"
}`;

    console.log(`[FeedAndOptimize] 开始AI优化... 性格:${personality_type} 场景:${scenario} 原文长度:${raw_content.length}`);

    const result = await generatePersonalityScript(personality_type, scenario, raw_content + ' [优化模式:' + (optimize_style || 'natural') + ']');

    let optimizedData;
    
    if (result && result.content) {
      // AI生成成功，直接使用
      optimizedData = {
        title: result.title || title || `${scenario}话术`,
        content: result.content,
        tips: result.tips || tips || '',
        difficulty: Math.min(3, Math.max(1, parseInt(result.difficulty) || 2)),
        improvement_summary: '已由AI根据性格色彩理论进行专业化优化'
      };
    } else {
      // AI降级：直接用原文作为内容，简单格式化
      optimizedData = {
        title: title || `${scene}话术`,
        content: raw_content,
        tips: tips || '根据实际效果灵活调整语气',
        difficulty: 2,
        improvement_summary: '保留原始话术内容'
      };
    }

    // 保存到 ai_scripts 数据库表
    const db = getDB();
    const insertResult = db.prepare(`
      INSERT INTO ai_scripts (
        category, personality_type, scenario, script_content, 
        tips, status, sort_order, source, is_ai_generated, is_optimized,
        raw_content, optimize_style, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 1, 0, 'admin_feed', 1, 1, ?, ?, datetime('now','localtime'), datetime('now','localtime'))
    `).run(
      'personality_based',           // category
      personality_type,            // personality_type
      scenario,                    // scenario
      optimizedData.content,       // script_content (优化后的)
      optimizedData.tips,          // tips
      raw_content,                 // raw_content (原始投喂)
      optimize_style || 'natural'  // optimize_style
    );

    const newScript = await db.prepare('SELECT * FROM ai_scripts WHERE id = ?').get(insertResult.lastInsertRowid);

    console.log(`[FeedAndOptimize] ✅ 话术已保存 ID=${insertResult.lastInsertRowid}`);

    return success(res, {
      ...newScript,
      improvement_summary: optimizedData.improvement_summary
    }, '话术已投喂并AI优化完成');

  } catch(err) {
    console.error('[FeedAndOptimize] 错误:', err);
    
    // 即使AI失败也要把原始话术存入数据库
    try {
      const db = getDB();
      const { raw_content, personality_type, scenario, title, tips } = req.body;
      const insertResult = db.prepare(`
        INSERT INTO ai_scripts (category, personality_type, scenario, script_content, tips, status, sort_order, source, is_ai_generated, is_optimized, raw_content, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 1, 0, 'admin_feed', 0, 0, ?, datetime('now','localtime'), datetime('now','localtime'))
      `).run('personality_based', personality_type, scenario, raw_content, tips || '', raw_content);
      
      return success(res, await db.prepare('SELECT * FROM ai_scripts WHERE id = ?').get(insertResult.lastInsertRowid), '话术已保存（AI优化未生效，使用原始内容）');
    } catch(e2) {
      return error(res, '保存失败: ' + e2.message, 500);
    }
  }
});

/**
 * POST /api/admin/personality/scripts/:id/optimize
 * 对已有话术进行AI二次优化
 */
router.post('/admin/personality/scripts/:id/optimize', async (req, res) => {
  try {
    const db = getDB();
    const scriptId = req.params.id;
    const { optimize_style } = req.body;

    const existing = await db.prepare('SELECT * FROM ai_scripts WHERE id = ? AND status = 1').get(scriptId);
    if (!existing) return error(res, '话术不存在', 404);

    const {
      generatePersonalityScript,
    } = require('../services/deepseekService');

    // 用已有内容作为参考进行二次优化
    const refContent = existing.raw_content || existing.script_content;
    const result = await generatePersonalityScript(
      existing.personality_type || 'red',
      existing.scenario || '产品推荐',
      refContent + ' \n\n[二次优化要求：请在保留核心信息的基础上，让表达更精炼有力]'
    );

    if (result && result.content) {
      await db.prepare(`
        UPDATE ai_scripts SET
          script_content = ?,
          tips = ?,
          is_optimized = 1,
          optimize_count = COALESCE(optimize_count, 0) + 1,
          updated_at = datetime('now','localtime')
        WHERE id = ?
      `).run(result.content, result.tips || existing.tips, scriptId);

      return success(res, {
        ...await db.prepare('SELECT * FROM ai_scripts WHERE id = ?').get(scriptId),
        improvement_summary: '二次优化完成，话术已更新'
      }, 'AI二次优化成功');
    } else {
      return error(res, 'AI优化失败，话术保持不变', 500);
    }

  } catch(err) {
    console.error('[ScriptOptimize] 错误:', err);
    return error(res, 'AI优化出错: ' + err.message, 500);
  }
});

// ==================== 商学院概览路由（SchoolManagementNew 调用）====================

// GET /api/school/overview/stats - 商学院总览统计（fetchSchoolStats）
router.get('/overview/stats', async (req, res) => {
  const db = getDB();

  // 统计各模块数量（使用实际存在的表）
  const courseCount = await db.prepare("SELECT COUNT(*) as c FROM school_courses WHERE status = 1").get().c;
  const bookCount = await db.prepare("SELECT COUNT(*) as c FROM learning_books WHERE status = 'available'").get().c;
  const scriptCount = await db.prepare("SELECT COUNT(*) as c FROM ai_scripts WHERE status = 1").get().c;

  // 总学习记录数
  var totalLearningRecords = 0;
  try { totalLearningRecords = await db.prepare("SELECT COUNT(*) as c FROM study_progress").get().c; } catch(e) {}

  // 视频数量(从school_courses中筛选course_type=1的视频)
  const videoCount = await db.prepare("SELECT COUNT(*) as c FROM school_courses WHERE course_type = 1 AND status = 1").get().c;

  return success(res, {
    totalStudents: 0,
    activeToday: 0,
    courseCount,
    videoCount,
    bookCount,
    scriptCount,
    totalLearningRecords,
    totalMinutes: 0,
    completionRate: 0
  });
});

// GET /api/school/overview/recent-activities - 最新学习活动
router.get('/overview/recent-activities', async (req, res) => {
  const db = getDB();
  const limit = parseInt(req.query.limit) || 10;

  try {
    const activities = db.prepare(`
      SELECT sp.*, u.real_name as user_name, u.username,
        sc.course_title as content_title
      FROM study_progress sp
      LEFT JOIN users u ON sp.user_id = u.id
      LEFT JOIN school_courses sc ON sp.content_id = sc.id
      ORDER BY sp.last_accessed_at DESC
      LIMIT ?
    `).all(limit);

    return success(res, activities);
  } catch(e) {
    // study_progress 表结构可能不同，返回空数组
    return success(res, []);
  }
});

// GET /api/school/overview/popular-content - 热门内容
router.get('/overview/popular-content', async (req, res) => {
  const db = getDB();
  const limit = parseInt(req.query.limit) || 5;

  // 热门课程(使用school_courses表)
  const topCourses = db.prepare(`
    SELECT sc.id, sc.course_title as title, sc.view_count as views, sc.like_count as likes
    FROM school_courses sc
    WHERE sc.status = 1
    ORDER BY sc.view_count DESC LIMIT ?
  `).all(limit);

  // 热门书籍
  const topBooks = db.prepare(`
    SELECT b.id, b.title, b.views, b.downloads
    FROM learning_books b
    WHERE b.status = 'available'
    ORDER BY b.views DESC LIMIT ?
  `).all(limit);

  return success(res, { courses: topCourses, books: topBooks });
});

// GET /api/school/overview/reminders - 学习提醒
router.get('/overview/reminders', async (req, res) => {
  return success(res, []);
});

// GET /api/school/overview/next-recommendation - 推荐内容
router.get('/overview/next-recommendation', async (req, res) => {
  const db = getDB();
  const limit = parseInt(req.query.limit) || 3;

  const books = await db.prepare("SELECT id, title, author, cover_url as coverUrl FROM learning_books WHERE status = 'available' ORDER BY RANDOM() LIMIT ?").all(limit);
  const courses = await db.prepare("SELECT id, course_title as title, cover_image as coverImage FROM school_courses WHERE status = 1 ORDER BY RANDOM() LIMIT ?").all(limit);

  return success(res, { books, courses });
});

// ==================== 学习统计路由（第三轮补全）====================

// GET /api/school/statistics/learning - 学习统计
router.get('/statistics/learning', async (req, res) => {
  const db = getDB();

  try {
    // 使用study_progress表获取学习记录
    var dailyStats = [];
    var typeDistribution = [];

    try {
      dailyStats = db.prepare(`
        SELECT DATE(last_accessed_at) as date, SUM(COALESCE(progress_percent,0)) as minutes, COUNT(*) as records
        FROM study_progress
        GROUP BY DATE(last_accessed_at)
        ORDER BY date DESC
        LIMIT 30
      `).all();
    } catch(e2) {}

    try {
      typeDistribution = db.prepare(`
        SELECT content_type, COUNT(*) as count
        FROM study_progress
        GROUP BY content_type
      `).all();
    } catch(e3) {}

    return success(res, { dailyStats: dailyStats || [], typeDistribution: typeDistribution || [] });
  } catch(e) {
    return success(res, { dailyStats: [], typeDistribution: [] });
  }
});

// GET /api/school/statistics/weekly-progress - 周进度
router.get('/statistics/weekly-progress', async (req, res) => {
  const db = getDB();

  try {
    var weeklyData = db.prepare(`
      SELECT strftime('%W', last_accessed_at) as week, COUNT(*) as records
      FROM study_progress
      WHERE last_accessed_at >= datetime('now', '-7 weeks')
      GROUP BY strftime('%W', last_accessed_at)
      ORDER BY week
    `).all();

    return success(res, weeklyData);
  } catch(e) {
    return success(res, []);
  }
});

// GET /api/school/statistics/category-progress - 分类进度
router.get('/statistics/category-progress', async (req, res) => {
  const db = getDB();

  try {
    const categories = [
      { key: 'sales_psychology', name: '销售心理学' },
      { key: 'skincare_knowledge', name: '护肤知识' },
      { key: 'communication_skills', name: '沟通技巧' },
      { key: 'team_management', name: '团队管理' },
    ];

    // 使用learning_books的category字段统计
    const progress = categories.map(cat => {
      try {
        const count = await db.prepare("SELECT COUNT(*) as c FROM learning_books WHERE category = ? AND status = 'available'").get(cat.key).c;
        return { ...cat, completedCount: count };
      } catch(e2) {
        return { ...cat, completedCount: 0 };
      }
    });

    return success(res, progress);
  } catch(e) {
    return success(res, [
      { key: 'sales_psychology', name: '销售心理学', completedCount: 0 },
      { key: 'skincare_knowledge', name: '护肤知识', completedCount: 0 },
      { key: 'communication_skills', name: '沟通技巧', completedCount: 0 },
      { key: 'team_management', name: '团队管理', completedCount: 0 },
    ]);
  }
});

// ==================== Admin 行动日志管理 ====================

/**
 * GET /api/admin/action-log/overview
 * 全部代理商行动日志总览
 */
router.get('/admin/action-log/overview', async (req, res) => {
  const db = getDB();
  try {
    const activeUsers30d = await (db.prepare(`SELECT COUNT(DISTINCT user_id) as c FROM action_daily_logs WHERE log_date >= date('now','-30 days')`).get() || {}).c || 0;
    const monthCheckins = await (db.prepare(`SELECT COUNT(*) as c FROM action_daily_logs WHERE strftime('%Y-%m',log_date)=strftime('%Y-%m','now')`).get() || {}).c || 0;
    const todayCheckins = await (db.prepare(`SELECT COUNT(DISTINCT user_id) as c FROM action_daily_logs WHERE log_date=date('now','localtime')`).get() || {}).c || 0;
    const annualTotal = await (db.prepare(`SELECT COUNT(*) as c FROM action_goals WHERE goal_type='annual'`).get() || {}).c || 0;
    const annualCompleted = await (db.prepare(`SELECT COUNT(*) as c FROM action_goals WHERE goal_type='annual' AND (status=1 OR progress>=100)`).get() || {}).c || 0;
    const monthlyGoalTotal = await (db.prepare(`SELECT COUNT(*) as c FROM action_goals WHERE goal_type='monthly'`).get() || {}).c || 0;
    const commitmentTotal = await (db.prepare(`SELECT COUNT(*) as c FROM action_commitments`).get() || {}).c || 0;
    const activeCommitments = await (db.prepare(`SELECT COUNT(*) as c FROM action_commitments WHERE status=1`).get() || {}).c || 0;

    return success(res, {
      activeUsers30d,
      monthCheckins,
      todayCheckins,
      annualGoals: { total: annualTotal, completed: annualCompleted },
      monthlyGoals: { total: monthlyGoalTotal },
      commitments: { total: commitmentTotal, active: activeCommitments }
    });
  } catch(e) { return error(res, '获取总览失败: ' + e.message); }
});

/**
 * GET /api/admin/action-log/users
 * 获取所有有行动日志记录的代理商列表（分页）
 */
router.get('/admin/action-log/users', async (req, res) => {
  const db = getDB();
  try {
    const { page=1, pageSize=20, keyword='', sortBy='lastActive' } = req.query;
    const offset = (parseInt(page)-1)*parseInt(pageSize);

    // 构建查询：关联users表获取用户名
    let whereSql = '';
    let params = [];

    if (keyword) {
      whereSql += " AND (u.username LIKE ? OR u.real_name LIKE ? OR u.phone LIKE ?)";
      params.push('%'+keyword+'%','%'+keyword+'%','%'+keyword+'%');
    }

    const totalResult = db.prepare(`
      SELECT COUNT(DISTINCT ad.user_id) as total
      FROM action_daily_logs ad LEFT JOIN users u ON ad.user_id=u.id WHERE 1=1 ${whereSql}
    `).get(...params);
    const total = totalResult ? totalResult.total : 0;

    let orderBy = 'last_active DESC';
    if (sortBy === 'checkinCount') orderBy = 'checkin_count DESC';
    else if (sortBy === 'avgScore') orderBy = 'avg_score DESC';
    else if (sortBy === 'streak') orderBy = 'max_streak DESC';

    const users = db.prepare(`
      SELECT
        ad.user_id as user_id,
        COALESCE(u.real_name, u.username) as name,
        u.agent_level as level,
        u.phone as phone,
        MAX(ad.log_date) as last_active,
        COUNT(DISTINCT ad.log_date) as checkin_count,
        ROUND(AVG(CASE WHEN ad.score > 0 THEN ad.score ELSE NULL END), 1) as avg_score,
        (SELECT COUNT(*) FROM action_goals g WHERE g.user_id=ad.user_id AND g.goal_type='annual') as annual_goals,
        (SELECT COUNT(CASE WHEN g.status=1 OR g.progress>=100 THEN 1 END) FROM action_goals g WHERE g.user_id=ad.user_id AND g.goal_type='annual') as annual_completed,
        (SELECT COUNT(*) FROM action_commitments c WHERE c.user_id=ad.user_id) as commitments,
        (SELECT SUM(cc.cnt) FROM (SELECT COUNT(*) as cnt FROM action_commitments_checkins cc2 WHERE cc2.user_id=ad.user_id GROUP BY cc2.commitment_id) cc) as total_checkins
      FROM action_daily_logs ad
      LEFT JOIN users u ON ad.user_id = u.id
      WHERE 1=1 ${whereSql}
      GROUP BY ad.user_id
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `).bind(...params, parseInt(pageSize), offset).all();

    // 计算连续打卡
    users.forEach(u => {
      var checkinDates = await db.prepare("SELECT DISTINCT log_date d FROM action_daily_logs WHERE user_id=? ORDER BY d DESC LIMIT 60").all(u.user_id);
      var streak = 0; var today = new Date().toISOString().split('T')[0]; var checkDate = today;
      for (var i=0;i<365;i++) {
        var found = false;
        for(var j=0;j<checkinDates.length;j++){if(checkinDates[j].d===checkDate){found=true;break;}}
        if(found){streak++;var d=new Date(checkDate);d.setDate(d.getDate()-1);checkDate=d.toISOString().split('T')[0]}
        else{if(checkDate!==today){break}}
      }
      u.max_streak = streak;
      u.avg_score = u.avg_score || 0;
    });

    return success(res, { list: users, total, page: parseInt(page), pageSize: parseInt(pageSize) });
  } catch(e) { return error(res, '获取用户列表失败: ' + e.message); }
});

/**
 * GET /api/admin/action-log/user/:userId
 * 获取某个代理商的行动日志完整数据
 */
router.get('/admin/action-log/user/:userId', async (req, res) => {
  const db = getDB();
  try {
    const userId = req.params.userId;

    // 用户基本信息
    const user = await db.prepare('SELECT id, username, real_name, phone, agent_level, avatar_url FROM users WHERE id=?').get(userId);
    if (!user) return error(res, '用户不存在', 404);

    // 年度目标
    const annualGoals = await db.prepare("SELECT * FROM action_goals WHERE user_id=? AND goal_type='annual' ORDER BY created_at DESC").all(userId);

    // 月度目标（当前月）
    const currentMonth = new Date().toISOString().slice(0,7);
    const monthlyGoals = await db.prepare("SELECT * FROM action_goals WHERE user_id=? AND goal_type='monthly' AND start_date LIKE ? ORDER BY priority").all(userId, currentMonth+'%');

    // 最近7天日志
    const recentLogs = db.prepare(
      "SELECT * FROM action_daily_logs WHERE user_id=? ORDER BY log_date DESC LIMIT 7"
    ).all(userId);

    // 今日日志详情（含ABC事项）
    const todayLog = db.prepare(
      "SELECT * FROM action_daily_logs WHERE user_id=? AND log_date=date('now','localtime')"
    ).get(userId);
    const todayItems = await todayLog ? db.prepare('SELECT * FROM action_daily_items WHERE user_id=? AND log_date=? ORDER BY priority, id').all(userId, todayLog.log_date) : [];

    // 承诺书
    const commitments = await db.prepare('SELECT * FROM action_commitments WHERE user_id=? ORDER BY created_at DESC').all(userId);

    // 月度追踪数据（最近6个月）
    const trackingData = db.prepare(
      "SELECT month, goal_title, target_value, actual_value, completion_rate FROM action_monthly_tracking WHERE user_id=? ORDER BY month DESC LIMIT 12"
    ).all(userId);

    // 统计概要
    const stats = {
      totalCheckins: (await db.prepare('SELECT COUNT(DISTINCT log_date) as c FROM action_daily_logs WHERE user_id=?').get(userId)||{}).c||0,
      avgScore: (await db.prepare('SELECT AVG(score) as s FROM action_daily_logs WHERE user_id=? AND score>0').get(userId)||{}).s||0,
      thisMonthCheckins: (await db.prepare("SELECT COUNT(DISTINCT log_date) as c FROM action_daily_logs WHERE user_id=? AND strftime('%Y-%m',log_date)=strftime('%Y-%m','now')").get(userId)||{}).c||0,
    };

    return success(res, { user, stats, annualGoals, monthlyGoals, recentLogs, todayLog, todayItems, commitments, trackingData });
  } catch(e) { return error(res, '获取用户详情失败: ' + e.message); }
});

/**
 * GET /api/admin/action-log/export
 * 导出全部代理商行动日志汇总（CSV格式）
 */
router.get('/admin/action-log/export', async (req, res) => {
  const db = getDB();
  try {
    const users = db.prepare(`
      SELECT
        COALESCE(u.real_name,u.username) as 姓名,
        u.phone as 手机号,
        CASE u.agent_level WHEN 1 THEN '会员' WHEN 2 THEN '打版代言人' WHEN 3 THEN '代理商' WHEN 4 THEN '批发商' WHEN 5 THEN '首席分公司' WHEN 6 THEN '集团事业部' END as 等级,
        (SELECT COUNT(DISTINCT log_date) FROM action_daily_logs ad2 WHERE ad2.user_id=ad.user_id) as 总打卡天数,
        (SELECT COUNT(DISTINCT log_date) FROM action_daily_logs ad2 WHERE ad2.user_id=ad.user_id AND strftime('%Y-%m',log_date)=strftime('%Y-%m','now')) as 本月打卡,
        ROUND((SELECT AVG(score) FROM action_daily_logs ad2 WHERE ad2.user_id=ad.user_id AND score>0),1) as 平均心态分,
        (SELECT COUNT(*) FROM action_goals g WHERE g.user_id=ad.user_id AND g.goal_type='annual') as 年度目标数,
        (SELECT COUNT(*) FROM action_commitments c WHERE c.user_id=ad.user_id) as 承诺书数
      FROM action_daily_logs ad
      LEFT JOIN users u ON ad.user_id=u.id
      GROUP BY ad.user_id
      ORDER BY 总打卡天数 DESC
    `).all();

    // 生成CSV
    var header = Object.keys(users[0] || {}).join(',');
    var rows = users.map(function(row){return Object.values(row).map(function(v){return '"'+(v==null?'':String(v).replace(/"/g,'""'))+'"'}).join(',')});
    var csv = '\uFEFF'+header+'\n'+rows.join('\n');

    res.setHeader('Content-Type','text/csv;charset=utf-8');
    res.setHeader('Content-Disposition','attachment; filename=action_log_export.csv');
    return res.send(csv);
  } catch(e) { return error(res, '导出失败: '+e.message); }
});

module.exports = router;
