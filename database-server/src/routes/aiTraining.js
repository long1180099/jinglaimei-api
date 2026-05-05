/**
 * AI话术通关系统 - 后台管理API路由
 * 包含：关卡管理、题目管理、场景管理、话术库管理、排行榜、数据报表
 */
const express = require('express');
const router = express.Router();
const { getDB } = require('../utils/db');
const { success, error, paginate } = require('../utils/response');

// ==================== 关卡管理 ====================

// 获取所有关卡
router.get('/levels', async (req, res) => {
  try {
    const db = getDB();
    const levels = db.prepare(`
      SELECT * FROM ai_levels WHERE status = 1 ORDER BY sort_order ASC
    `).all();
    success(res, levels);
  } catch (err) {
    error(res, '获取关卡列表失败: ' + err.message, 500);
  }
});

// 获取单个关卡详情
router.get('/levels/:id', async (req, res) => {
  try {
    const db = getDB();
    const level = await db.prepare('SELECT * FROM ai_levels WHERE id = ?').get(req.params.id);
    if (!level) return error(res, '关卡不存在', 404);

    // 获取该关卡的题目
    const questions = db.prepare(`
      SELECT * FROM ai_level_questions WHERE level_id = ? AND status = 1 ORDER BY sort_order ASC
    `).all(req.params.id);

    // 获取该关卡的统计信息
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_attempts,
        COUNT(CASE WHEN passed = 1 THEN 1 END) as pass_count,
        AVG(score) as avg_score
      FROM ai_level_attempts WHERE level_id = ?
    `).get(req.params.id);

    success(res, { ...level, questions, stats });
  } catch (err) {
    error(res, '获取关卡详情失败: ' + err.message, 500);
  }
});

// 创建关卡
router.post('/levels', async (req, res) => {
  try {
    const db = getDB();
    const { name, description, sort_order, pass_score, study_material, study_material_type } = req.body;

    if (!name) return error(res, '关卡名称不能为空');

    const result = db.prepare(`
      INSERT INTO ai_levels (name, description, sort_order, pass_score, study_material, study_material_type)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(name, description || '', sort_order || 0, pass_score || 80,
      study_material || '', study_material_type || 'text');

    const newLevel = await db.prepare('SELECT * FROM ai_levels WHERE id = ?').get(result.lastInsertRowid);
    success(res, newLevel, '关卡创建成功', 201);
  } catch (err) {
    error(res, '创建关卡失败: ' + err.message, 500);
  }
});

// 更新关卡
router.put('/levels/:id', async (req, res) => {
  try {
    const db = getDB();
    const { name, description, sort_order, pass_score, study_material, study_material_type, status } = req.body;

    const existing = await db.prepare('SELECT * FROM ai_levels WHERE id = ?').get(req.params.id);
    if (!existing) return error(res, '关卡不存在', 404);

    const setClauses = [];
    const setParams = [];
    if (name !== undefined) { setClauses.push('name = ?'); setParams.push(name); }
    if (description !== undefined) { setClauses.push('description = ?'); setParams.push(description); }
    if (sort_order !== undefined) { setClauses.push('sort_order = ?'); setParams.push(sort_order); }
    if (pass_score !== undefined) { setClauses.push('pass_score = ?'); setParams.push(pass_score); }
    if (study_material !== undefined) { setClauses.push('study_material = ?'); setParams.push(study_material); }
    if (study_material_type !== undefined) { setClauses.push('study_material_type = ?'); setParams.push(study_material_type); }
    if (status !== undefined) { setClauses.push('status = ?'); setParams.push(status); }
    setClauses.push("updated_at = CURRENT_TIMESTAMP");
    setParams.push(req.params.id);
    await db.prepare(`UPDATE ai_levels SET ${setClauses.join(', ')} WHERE id = ?`).run(...setParams);

    const updated = await db.prepare('SELECT * FROM ai_levels WHERE id = ?').get(req.params.id);
    success(res, updated, '关卡更新成功');
  } catch (err) {
    error(res, '更新关卡失败: ' + err.message, 500);
  }
});

// 删除关卡
router.delete('/levels/:id', async (req, res) => {
  try {
    const db = getDB();
    const existing = await db.prepare('SELECT * FROM ai_levels WHERE id = ?').get(req.params.id);
    if (!existing) return error(res, '关卡不存在', 404);

    await db.prepare('UPDATE ai_levels SET status = 0 WHERE id = ?').run(req.params.id);
    success(res, null, '关卡已删除');
  } catch (err) {
    error(res, '删除关卡失败: ' + err.message, 500);
  }
});

// ==================== 题目管理 ====================

// 获取关卡题目
router.get('/levels/:levelId/questions', async (req, res) => {
  try {
    const db = getDB();
    const questions = db.prepare(`
      SELECT * FROM ai_level_questions WHERE level_id = ? AND status = 1 ORDER BY sort_order ASC
    `).all(req.params.levelId);
    success(res, questions);
  } catch (err) {
    error(res, '获取题目失败: ' + err.message, 500);
  }
});

// 创建题目
router.post('/levels/:levelId/questions', async (req, res) => {
  try {
    const db = getDB();
    const { question_type, scenario, options, correct_answer, answer_analysis,
            score, sort_order, difficulty, personality_type } = req.body;

    if (!scenario) return error(res, '题目场景不能为空');

    const opts = typeof options === 'string' ? options : JSON.stringify(options || []);

    const result = db.prepare(`
      INSERT INTO ai_level_questions (level_id, question_type, scenario, options, correct_answer, answer_analysis, score, sort_order, difficulty, personality_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(req.params.levelId, question_type || 'scenario', scenario, opts,
      correct_answer || '', answer_analysis || '', score || 20,
      sort_order || 0, difficulty || 'medium', personality_type || '');

    const newQuestion = await db.prepare('SELECT * FROM ai_level_questions WHERE id = ?').get(result.lastInsertRowid);
    success(res, newQuestion, '题目创建成功', 201);
  } catch (err) {
    error(res, '创建题目失败: ' + err.message, 500);
  }
});

// 更新题目
router.put('/questions/:id', async (req, res) => {
  try {
    const db = getDB();
    const { scenario, options, correct_answer, answer_analysis,
            score, sort_order, difficulty, personality_type, status } = req.body;

    const existing = await db.prepare('SELECT * FROM ai_level_questions WHERE id = ?').get(req.params.id);
    if (!existing) return error(res, '题目不存在', 404);

    const opts = typeof options === 'string' ? options : JSON.stringify(options);

    const setClauses = [];
    const setParams = [];
    if (scenario !== undefined) { setClauses.push('scenario = ?'); setParams.push(scenario); }
    if (options !== undefined) { setClauses.push('options = ?'); setParams.push(opts); }
    if (correct_answer !== undefined) { setClauses.push('correct_answer = ?'); setParams.push(correct_answer); }
    if (answer_analysis !== undefined) { setClauses.push('answer_analysis = ?'); setParams.push(answer_analysis); }
    if (score !== undefined) { setClauses.push('score = ?'); setParams.push(score); }
    if (sort_order !== undefined) { setClauses.push('sort_order = ?'); setParams.push(sort_order); }
    if (difficulty !== undefined) { setClauses.push('difficulty = ?'); setParams.push(difficulty); }
    if (personality_type !== undefined) { setClauses.push('personality_type = ?'); setParams.push(personality_type); }
    if (status !== undefined) { setClauses.push('status = ?'); setParams.push(status); }
    await db.prepare(`UPDATE ai_level_questions SET ${setClauses.join(', ')} WHERE id = ?`).run(...setParams, req.params.id);

    success(res, null, '题目更新成功');
  } catch (err) {
    error(res, '更新题目失败: ' + err.message, 500);
  }
});

// 删除题目
router.delete('/questions/:id', async (req, res) => {
  try {
    const db = getDB();
    await db.prepare('UPDATE ai_level_questions SET status = 0 WHERE id = ?').run(req.params.id);
    success(res, null, '题目已删除');
  } catch (err) {
    error(res, '删除题目失败: ' + err.message, 500);
  }
});

// ==================== 场景管理 ====================

// 获取所有场景
router.get('/scenarios', async (req, res) => {
  try {
    const db = getDB();
    const scenarios = db.prepare(`
      SELECT * FROM ai_coach_scenarios WHERE status = 1 ORDER BY sort_order ASC
    `).all();
    success(res, scenarios);
  } catch (err) {
    error(res, '获取场景列表失败: ' + err.message, 500);
  }
});

// 获取单个场景
router.get('/scenarios/:id', async (req, res) => {
  try {
    const db = getDB();
    const scenario = await db.prepare('SELECT * FROM ai_coach_scenarios WHERE id = ?').get(req.params.id);
    if (!scenario) return error(res, '场景不存在', 404);

    // 获取场景使用统计
    const stats = db.prepare(`
      SELECT COUNT(*) as total_sessions, AVG(overall_score) as avg_score
      FROM ai_coach_sessions WHERE scenario_id = ?
    `).get(req.params.id);

    success(res, { ...scenario, stats });
  } catch (err) {
    error(res, '获取场景详情失败: ' + err.message, 500);
  }
});

// 创建场景
router.post('/scenarios', async (req, res) => {
  try {
    const db = getDB();
    const { name, personality_type, personality_name, description, initial_intent,
            difficulty, opening_line, personality_traits, tips } = req.body;

    if (!name || !personality_type || !opening_line) {
      return error(res, '场景名称、性格类型和开场白不能为空');
    }

    const traits = typeof personality_traits === 'string' ? personality_traits : JSON.stringify(personality_traits || {});

    const result = db.prepare(`
      INSERT INTO ai_coach_scenarios (name, personality_type, personality_name, description, initial_intent, difficulty, opening_line, personality_traits, tips)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, personality_type, personality_name || '', description || '',
      initial_intent || '', difficulty || 'medium', opening_line, traits, tips || '');

    const newScenario = await db.prepare('SELECT * FROM ai_coach_scenarios WHERE id = ?').get(result.lastInsertRowid);
    success(res, newScenario, '场景创建成功', 201);
  } catch (err) {
    error(res, '创建场景失败: ' + err.message, 500);
  }
});

// 更新场景
router.put('/scenarios/:id', async (req, res) => {
  try {
    const db = getDB();
    const { name, personality_type, personality_name, description, initial_intent,
            difficulty, opening_line, personality_traits, tips, status, sort_order } = req.body;

    const existing = await db.prepare('SELECT * FROM ai_coach_scenarios WHERE id = ?').get(req.params.id);
    if (!existing) return error(res, '场景不存在', 404);

    const traits = personality_traits ? (typeof personality_traits === 'string' ? personality_traits : JSON.stringify(personality_traits)) : undefined;

    const setClauses = [];
    const setParams = [];
    if (name !== undefined) { setClauses.push('name = ?'); setParams.push(name); }
    if (personality_type !== undefined) { setClauses.push('personality_type = ?'); setParams.push(personality_type); }
    if (personality_name !== undefined) { setClauses.push('personality_name = ?'); setParams.push(personality_name); }
    if (description !== undefined) { setClauses.push('description = ?'); setParams.push(description); }
    if (initial_intent !== undefined) { setClauses.push('initial_intent = ?'); setParams.push(initial_intent); }
    if (difficulty !== undefined) { setClauses.push('difficulty = ?'); setParams.push(difficulty); }
    if (opening_line !== undefined) { setClauses.push('opening_line = ?'); setParams.push(opening_line); }
    if (traits !== undefined) { setClauses.push('personality_traits = ?'); setParams.push(traits); }
    if (tips !== undefined) { setClauses.push('tips = ?'); setParams.push(tips); }
    if (status !== undefined) { setClauses.push('status = ?'); setParams.push(status); }
    if (sort_order !== undefined) { setClauses.push('sort_order = ?'); setParams.push(sort_order); }
    setClauses.push("updated_at = CURRENT_TIMESTAMP");
    setParams.push(req.params.id);
    await db.prepare(`UPDATE ai_coach_scenarios SET ${setClauses.join(', ')} WHERE id = ?`).run(...setParams);

    const updated = await db.prepare('SELECT * FROM ai_coach_scenarios WHERE id = ?').get(req.params.id);
    success(res, updated, '场景更新成功');
  } catch (err) {
    error(res, '更新场景失败: ' + err.message, 500);
  }
});

// 删除场景
router.delete('/scenarios/:id', async (req, res) => {
  try {
    const db = getDB();
    await db.prepare('UPDATE ai_coach_scenarios SET status = 0 WHERE id = ?').run(req.params.id);
    success(res, null, '场景已删除');
  } catch (err) {
    error(res, '删除场景失败: ' + err.message, 500);
  }
});

// ==================== 话术库管理 ====================

// 获取话术列表
router.get('/scripts', async (req, res) => {
  try {
    const db = getDB();
    const { category, personality_type } = req.query;

    let sql = 'SELECT * FROM ai_scripts WHERE status = 1';
    const params = [];

    if (category) { sql += ' AND category = ?'; params.push(category); }
    if (personality_type) { sql += ' AND (personality_type = ? OR personality_type = "")'; params.push(personality_type); }

    sql += ' ORDER BY sort_order ASC';

    const scripts = await db.prepare(sql).all(...params);
    success(res, scripts);
  } catch (err) {
    error(res, '获取话术列表失败: ' + err.message, 500);
  }
});

// 创建话术
router.post('/scripts', async (req, res) => {
  try {
    const db = getDB();
    const { category, personality_type, scenario, script_content, tips } = req.body;

    if (!category || !script_content) return error(res, '分类和话术内容不能为空');

    const result = db.prepare(`
      INSERT INTO ai_scripts (category, personality_type, scenario, script_content, tips)
      VALUES (?, ?, ?, ?, ?)
    `).run(category, personality_type || '', scenario || '', script_content, tips || '');

    const newScript = await db.prepare('SELECT * FROM ai_scripts WHERE id = ?').get(result.lastInsertRowid);
    success(res, newScript, '话术创建成功', 201);
  } catch (err) {
    error(res, '创建话术失败: ' + err.message, 500);
  }
});

// 更新话术
router.put('/scripts/:id', async (req, res) => {
  try {
    const db = getDB();
    const { category, personality_type, scenario, script_content, tips, status, sort_order } = req.body;

    const setClauses = [];
    const setParams = [];
    if (category !== undefined) { setClauses.push('category = ?'); setParams.push(category); }
    if (personality_type !== undefined) { setClauses.push('personality_type = ?'); setParams.push(personality_type); }
    if (scenario !== undefined) { setClauses.push('scenario = ?'); setParams.push(scenario); }
    if (script_content !== undefined) { setClauses.push('script_content = ?'); setParams.push(script_content); }
    if (tips !== undefined) { setClauses.push('tips = ?'); setParams.push(tips); }
    if (status !== undefined) { setClauses.push('status = ?'); setParams.push(status); }
    if (sort_order !== undefined) { setClauses.push('sort_order = ?'); setParams.push(sort_order); }
    setClauses.push("updated_at = CURRENT_TIMESTAMP");
    setParams.push(req.params.id);
    await db.prepare(`UPDATE ai_scripts SET ${setClauses.join(', ')} WHERE id = ?`).run(...setParams);

    success(res, null, '话术更新成功');
  } catch (err) {
    error(res, '更新话术失败: ' + err.message, 500);
  }
});

// 删除话术
router.delete('/scripts/:id', async (req, res) => {
  try {
    const db = getDB();
    await db.prepare('UPDATE ai_scripts SET status = 0 WHERE id = ?').run(req.params.id);
    success(res, null, '话术已删除');
  } catch (err) {
    error(res, '删除话术失败: ' + err.message, 500);
  }
});

// ==================== 数据报表 ====================

// 获取仪表盘统计数据
router.get('/dashboard/stats', async (req, res) => {
  try {
    const db = getDB();

    // 总体统计
    const overall = db.prepare(`
      SELECT 
        COUNT(DISTINCT user_id) as total_users,
        (SELECT COUNT(*) FROM ai_levels WHERE status = 1) as total_levels,
        (SELECT COUNT(*) FROM ai_coach_scenarios WHERE status = 1) as total_scenarios
      FROM ai_level_progress
    `).get();

    // 通关统计
    const levelStats = db.prepare(`
      SELECT 
        l.id, l.name,
        COUNT(p.id) as attempt_users,
        COUNT(CASE WHEN p.passed = 1 THEN 1 END) as pass_users,
        IFNULL(AVG(p.best_score), 0) as avg_score
      FROM ai_levels l
      LEFT JOIN ai_level_progress p ON l.id = p.level_id
      WHERE l.status = 1
      GROUP BY l.id
      ORDER BY l.sort_order
    `).all();

    // 教练统计
    const coachStats = db.prepare(`
      SELECT 
        s.id, s.name, s.personality_name,
        COUNT(sess.id) as total_sessions,
        IFNULL(AVG(sess.overall_score), 0) as avg_score,
        COUNT(CASE WHEN sess.overall_score >= 80 THEN 1 END) as excellent_count
      FROM ai_coach_scenarios s
      LEFT JOIN ai_coach_sessions sess ON s.id = sess.scenario_id
      WHERE s.status = 1
      GROUP BY s.id
      ORDER BY s.sort_order
    `).all();

    // 最近7天活动
    const recentActivity = db.prepare(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count,
        'level' as type
      FROM ai_level_attempts 
      WHERE created_at >= DATE('now', '-7 days')
      GROUP BY DATE(created_at)
      UNION ALL
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count,
        'coach' as type
      FROM ai_coach_sessions 
      WHERE created_at >= DATE('now', '-7 days')
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `).all();

    success(res, { overall, levelStats, coachStats, recentActivity });
  } catch (err) {
    error(res, '获取统计数据失败: ' + err.message, 500);
  }
});

// 获取排行榜
router.get('/rankings', async (req, res) => {
  try {
    const db = getDB();
    const { period = 'all', type = 'overall', limit = 20 } = req.query;
    const lim = Math.min(parseInt(limit) || 20, 100);

    let sql;
    if (type === 'level') {
      sql = `
        SELECT p.user_id, u.nickname, u.avatar_url as avatar,
          SUM(p.best_score) as total_score,
          COUNT(CASE WHEN p.passed = 1 THEN 1 END) as levels_passed
        FROM ai_level_progress p
        LEFT JOIN users u ON p.user_id = CAST(u.id AS TEXT)
        GROUP BY p.user_id
        ORDER BY levels_passed DESC, total_score DESC
        LIMIT ?
      `;
    } else if (type === 'coach') {
      sql = `
        SELECT s.user_id, u.nickname, u.avatar_url as avatar,
          AVG(s.overall_score) as avg_score,
          COUNT(s.id) as sessions
        FROM ai_coach_sessions s
        LEFT JOIN users u ON s.user_id = CAST(u.id AS TEXT)
        WHERE s.status = 'completed'
        GROUP BY s.user_id
        ORDER BY avg_score DESC
        LIMIT ?
      `;
    } else {
      sql = `
        SELECT u.id as user_id, u.nickname, u.avatar_url as avatar,
          COALESCE(lp.levels_passed, 0) as levels_passed,
          COALESCE(lp.total_score, 0) as level_score,
          COALESCE(cs.avg_score, 0) as coach_avg_score,
          COALESCE(cs.sessions, 0) as coach_sessions,
          (COALESCE(lp.levels_passed, 0) * 100 + COALESCE(cs.avg_score, 0)) as total_score
        FROM users u
        LEFT JOIN (
          SELECT user_id, 
            COUNT(CASE WHEN passed = 1 THEN 1 END) as levels_passed,
            SUM(best_score) as total_score
          FROM ai_level_progress GROUP BY user_id
        ) lp ON u.id = lp.user_id
        LEFT JOIN (
          SELECT user_id, AVG(overall_score) as avg_score, COUNT(id) as sessions
          FROM ai_coach_sessions WHERE status = 'completed' GROUP BY user_id
        ) cs ON u.id = cs.user_id
        ORDER BY total_score DESC
        LIMIT ?
      `;
    }

    const rankings = await db.prepare(sql).all(lim);
    success(res, rankings);
  } catch (err) {
    error(res, '获取排行榜失败: ' + err.message, 500);
  }
});

module.exports = router;
