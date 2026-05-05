/**
 * AI话术通关系统 - 小程序端API路由
 * 包含：关卡学习/考核、进度管理、AI教练对话、排行榜
 */
const express = require('express');
const router = express.Router();
const { getDB } = require('../utils/db');
const { success, error } = require('../utils/response');
const { generateCoachReply, generateEvaluation, generateCoachOpening, generateLevelEvaluation } = require('../services/deepseekService');

// ==================== 小程序 - 关卡通关 ====================

// 获取关卡列表（含用户进度）
router.get('/ai-levels', async (req, res) => {
  try {
    const db = getDB();
    const userId = req.query.user_id;
    if (!userId) return error(res, '缺少user_id');

    const levels = db.prepare(`
      SELECT l.*,
        COALESCE(p.best_score, 0) as user_best_score,
        COALESCE(p.attempts, 0) as user_attempts,
        COALESCE(p.passed, 0) as user_passed,
        CASE WHEN p.passed = 1 OR p.id IS NOT NULL OR l.sort_order = 1 THEN 1 ELSE 0 END as unlocked
      FROM ai_levels l
      LEFT JOIN ai_level_progress p ON l.id = p.level_id AND p.user_id = ?
      WHERE l.status = 1
      ORDER BY l.sort_order ASC
    `).all(userId);

    success(res, levels);
  } catch (err) {
    error(res, '获取关卡列表失败: ' + err.message, 500);
  }
});

// 获取关卡详情（含学习资料）
router.get('/ai-levels/:id', async (req, res) => {
  try {
    const db = getDB();
    const userId = req.query.user_id;

    const level = await db.prepare('SELECT * FROM ai_levels WHERE id = ? AND status = 1').get(req.params.id);
    if (!level) return error(res, '关卡不存在', 404);

    const questions = db.prepare(`
      SELECT id, question_type, scenario, options, score, sort_order, difficulty, personality_type
      FROM ai_level_questions WHERE level_id = ? AND status = 1 ORDER BY sort_order ASC
    `).all(req.params.id);

    let progress = null;
    if (userId) {
      progress = await db.prepare('SELECT * FROM ai_level_progress WHERE user_id = ? AND level_id = ?').get(userId, req.params.id);
    }

    success(res, {
      ...level,
      questions: questions.map(q => ({ ...q, options: JSON.parse(q.options || '[]') })),
      user_progress: progress
    });
  } catch (err) {
    error(res, '获取关卡详情失败: ' + err.message, 500);
  }
});

// 开始挑战（获取考核题目，不包含答案）
router.post('/ai-levels/:id/start', async (req, res) => {
  try {
    const db = getDB();
    const { user_id } = req.body;
    if (!user_id) return error(res, '缺少user_id');

    const level = await db.prepare('SELECT * FROM ai_levels WHERE id = ? AND status = 1').get(req.params.id);
    if (!level) return error(res, '关卡不存在', 404);

    const questions = db.prepare(`
      SELECT id, question_type, scenario, options, score, sort_order, difficulty, personality_type
      FROM ai_level_questions WHERE level_id = ? AND status = 1 ORDER BY sort_order ASC
    `).all(req.params.id);

    success(res, {
      level_id: level.id,
      level_name: level.name,
      pass_score: level.pass_score,
      questions: questions.map(q => ({ ...q, options: JSON.parse(q.options || '[]') })),
      started_at: Date.now()
    });
  } catch (err) {
    error(res, '开始挑战失败: ' + err.message, 500);
  }
});

// 提交答案并评分（传统选择评分 + DeepSeek AI深度分析）
router.post('/ai-levels/:id/submit', async (req, res) => {
  try {
    const db = getDB();
    const { user_id, answers, duration } = req.body;
    if (!user_id || !answers) return error(res, '缺少必要参数');

    const level = await db.prepare('SELECT * FROM ai_levels WHERE id = ? AND status = 1').get(req.params.id);
    if (!level) return error(res, '关卡不存在', 404);

    // 获取所有题目（含正确答案）
    const questions = db.prepare(`
      SELECT * FROM ai_level_questions WHERE level_id = ? AND status = 1 ORDER BY sort_order ASC
    `).all(req.params.id);

    // 传统选择题评分
    let totalScore = 0;
    const results = [];
    let correctCount = 0;

    for (const q of questions) {
      const userAnswer = answers[q.id] || '';
      const options = JSON.parse(q.options || '[]');
      const correctOption = options.find(o => o.key === q.correct_answer);
      const userOption = options.find(o => o.key === userAnswer);
      const isCorrect = userAnswer === q.correct_answer;
      const earnedScore = isCorrect ? (correctOption ? correctOption.score : q.score) : 0;

      totalScore += earnedScore;
      if (isCorrect) correctCount++;

      results.push({
        question_id: q.id,
        scenario: q.scenario,
        user_answer: userAnswer,
        correct_answer: q.correct_answer,
        is_correct: isCorrect,
        earned_score: earnedScore,
        analysis: q.answer_analysis,
        difficulty: q.difficulty,
        personality_type: q.personality_type
      });
    }

    const passed = totalScore >= level.pass_score ? 1 : 0;
    const dur = duration || 0;

    // 记录本次挑战
    db.prepare(`
      INSERT INTO ai_level_attempts (user_id, level_id, score, duration, answers, passed)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(user_id, req.params.id, totalScore, dur, JSON.stringify(answers), passed);

    // 更新用户进度
    const existing = db.prepare('SELECT * FROM ai_level_progress WHERE user_id = ? AND level_id = ?')
      .get(user_id, req.params.id);

    if (existing) {
      const newBest = Math.max(existing.best_score, totalScore);
      const newPassed = existing.passed || passed;
      const newDuration = dur < existing.best_duration || existing.best_duration === 0 ? dur : existing.best_duration;

      await db.prepare(`
        UPDATE ai_level_progress SET
          best_score = ?,
          attempts = attempts + 1,
          passed = ?,
          passed_at = CASE WHEN ? = 1 AND passed = 0 THEN CURRENT_TIMESTAMP ELSE passed_at END,
          best_duration = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND level_id = ?
      `).run(newBest, newPassed, passed, newDuration, user_id, req.params.id);
    } else {
      db.prepare(`
        INSERT INTO ai_level_progress (user_id, level_id, best_score, attempts, passed, passed_at, best_duration)
        VALUES (?, ?, ?, 1, ?, CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE NULL END, ?)
      `).run(user_id, req.params.id, totalScore, passed, passed, dur);
    }

    // 获取下一个关卡信息
    const nextLevel = db.prepare(`
      SELECT * FROM ai_levels WHERE sort_order > ? AND status = 1 ORDER BY sort_order ASC LIMIT 1
    `).get(level.sort_order);

    // DeepSeek AI深度分析（异步，不影响基础返回）
    let aiAnalysis = null;
    try {
      aiAnalysis = await generateLevelEvaluation(
        { name: level.name, description: level.description },
        results.map(r => ({
          scenario: r.scenario,
          question_type: '',
          user_answer: r.user_answer,
          correct_answer: r.correct_answer,
          is_correct: r.is_correct,
          analysis: r.analysis,
        })),
        { totalScore, passScore: level.pass_score, totalQuestions: questions.length, correctCount }
      );
    } catch (e) {
      console.warn('关卡AI分析失败，仅返回基础评分:', e.message);
    }

    success(res, {
      score: totalScore,
      passed: passed === 1,
      pass_score: level.pass_score,
      results,
      duration: dur,
      next_level: nextLevel ? { id: nextLevel.id, name: nextLevel.name } : null,
      // AI深度分析（新增字段，前端可选展示）
      ai_analysis: aiAnalysis,
    });
  } catch (err) {
    error(res, '提交答案失败: ' + err.message, 500);
  }
});

// 获取用户通关进度总览
router.get('/ai-levels/progress/:userId', async (req, res) => {
  try {
    const db = getDB();
    const userId = req.params.userId;

    const totalLevels = await db.prepare('SELECT COUNT(*) as cnt FROM ai_levels WHERE status = 1').get().cnt;
    const passedLevels = await db.prepare('SELECT COUNT(*) as cnt FROM ai_level_progress WHERE user_id = ? AND passed = 1').get(userId).cnt;
    const totalAttempts = await db.prepare('SELECT COUNT(*) as cnt FROM ai_level_attempts WHERE user_id = ?').get(userId).cnt;
    const avgScore = await db.prepare('SELECT AVG(best_score) as avg FROM ai_level_progress WHERE user_id = ?').get(userId).avg;

    // 获取排行榜位置
    const rankResult = db.prepare(`
      SELECT COUNT(*) + 1 as rank FROM (
        SELECT user_id FROM ai_level_progress 
        WHERE passed = 1 
        GROUP BY user_id 
        HAVING COUNT(*) > (SELECT COUNT(*) FROM ai_level_progress WHERE user_id = ? AND passed = 1)
      )
    `).get(userId);

    success(res, {
      total_levels: totalLevels,
      passed_levels: passedLevels,
      total_attempts: totalAttempts,
      avg_score: avgScore ? Math.round(avgScore) : 0,
      rank: rankResult ? rankResult.rank : 0,
      progress_percent: totalLevels > 0 ? Math.round((passedLevels / totalLevels) * 100) : 0
    });
  } catch (err) {
    error(res, '获取进度失败: ' + err.message, 500);
  }
});

// ==================== 小程序 - AI教练 ====================

// 获取可用场景列表
router.get('/ai-coach/scenarios', async (req, res) => {
  try {
    const db = getDB();
    const userId = req.query.user_id;

    const scenarios = db.prepare(`
      SELECT id, name, personality_type, personality_name, description, difficulty, opening_line, tips
      FROM ai_coach_scenarios WHERE status = 1 ORDER BY sort_order ASC
    `).all();

    // 添加用户在该场景的练习统计
    if (userId) {
      const enriched = scenarios.map(s => {
        const stats = db.prepare(`
          SELECT COUNT(*) as sessions, AVG(overall_score) as avg_score
          FROM ai_coach_sessions WHERE user_id = ? AND scenario_id = ? AND status = 'completed'
        `).get(userId, s.id);
        return { ...s, user_sessions: stats.sessions || 0, user_avg_score: stats.avg_score ? Math.round(stats.avg_score) : 0 };
      });
      success(res, enriched);
    } else {
      success(res, scenarios);
    }
  } catch (err) {
    error(res, '获取场景列表失败: ' + err.message, 500);
  }
});

// 开始AI教练对话（DeepSeek AI开场白）
router.post('/ai-coach/sessions', async (req, res) => {
  try {
    const db = getDB();
    const { user_id, scenario_id } = req.body;
    if (!user_id || !scenario_id) return error(res, '缺少必要参数');

    // 统一规范化user_id（防止浮点字符串如 "1.0" 导致后续匹配失败）
    const normalizedUserId = String(Number(user_id));

    const scenario = await db.prepare('SELECT * FROM ai_coach_scenarios WHERE id = ? AND status = 1').get(scenario_id);
    if (!scenario) return error(res, '场景不存在', 404);

    // 创建会话
    const result = db.prepare(`
      INSERT INTO ai_coach_sessions (user_id, scenario_id, status)
      VALUES (?, ?, 'active')
    `).run(normalizedUserId, scenario_id);

    const sessionId = result.lastInsertRowid;

    // 优先使用DeepSeek AI动态生成开场白
    let openingLine = scenario.opening_line; // 默认用数据库预设作为降级

    try {
      const aiOpening = await generateCoachOpening(scenario.personality_type, {
        name: scenario.name,
        description: scenario.description,
        opening_line: scenario.opening_line,
        tips: scenario.tips,
      });
      if (aiOpening) {
        openingLine = aiOpening;
      }
    } catch (e) {
      console.warn('AI教练开场白生成失败，使用数据库预设:', e.message);
    }

    // AI发送第一条消息
    db.prepare(`
      INSERT INTO ai_coach_messages (session_id, role, content)
      VALUES (?, 'ai', ?)
    `).run(sessionId, openingLine);

    const firstMessage = await db.prepare('SELECT * FROM ai_coach_messages WHERE id = last_insert_rowid()').get();

    success(res, {
      session_id: sessionId,
      scenario: {
        id: scenario.id,
        name: scenario.name,
        personality_type: scenario.personality_type,
        personality_name: scenario.personality_name,
        difficulty: scenario.difficulty
      },
      first_message: {
        role: firstMessage.role,
        content: firstMessage.content,
        created_at: firstMessage.created_at
      }
    }, '对话已开始', 201);
  } catch (err) {
    error(res, '开始对话失败: ' + err.message, 500);
  }
});

// 发送消息并获取AI回复（DeepSeek + 模拟降级）
router.post('/ai-coach/sessions/:sessionId/message', async (req, res) => {
  console.log('[教练Message] ===== 收到消息请求 =====');
  const t0 = Date.now();
  try {
    const db = getDB();
    const { user_id, content } = req.body;
    if (!user_id || !content) return error(res, '缺少必要参数');

    const sessionId = req.params.sessionId;
    console.log(`[教练Message] step1 参数校验 OK (${Date.now()-t0}ms)`);

    // 规范化user_id（防止浮点字符串 "1.0" vs 整数 28 不匹配）
    const normalizedUserId = String(Number(user_id));

    // 验证会话
    const session = await db.prepare('SELECT s.*, sc.personality_type, sc.personality_name, sc.opening_line, sc.personality_traits, sc.tips FROM ai_coach_sessions s JOIN ai_coach_scenarios sc ON s.scenario_id = sc.id WHERE s.id = ?').get(sessionId);
    if (!session) return error(res, '会话不存在', 404);
    if (session.status !== 'active') return error(res, '对话已结束');
    if (String(session.user_id) !== normalizedUserId) {
      console.warn(`[教练Message] ⚠️ 用户ID不匹配! session.user_id=${session.user_id}(type:${typeof session.user_id}) vs request=${normalizedUserId}`);
      return error(res, '无权访问此会话');
    }
    console.log(`[教练Message] step2 会话验证 OK (${Date.now()-t0}ms)`);

    // 保存用户消息
    db.prepare(`
      INSERT INTO ai_coach_messages (session_id, role, content)
      VALUES (?, 'user', ?)
    `).run(sessionId, content);
    console.log(`[教练Message] step3 用户消息已保存 (${Date.now()-t0}ms)`);

    // 获取对话历史（用于AI上下文）
    const history = db.prepare(`
      SELECT role, content FROM ai_coach_messages 
      WHERE session_id = ? ORDER BY created_at ASC
    `).all(sessionId);

    // 更新轮次
    await db.prepare('UPDATE ai_coach_sessions SET total_rounds = total_rounds + 1 WHERE id = ?').run(sessionId);
    console.log(`[教练Message] step4 历史查询完成, ${history.length}条 (${Date.now()-t0}ms)`);

    // 调用AI获取回复，失败时降级到模拟回复
    let aiReply;
    try {
      console.log(`[教练Message] step5 开始调用AI...`);
      aiReply = await generateCoachReply(
        session.personality_type,
        session.personality_name,
        session.personality_traits,
        session.tips,
        history,
        content
      );
      console.log(`[教练Message] step6 AI调用返回! reply=${!!aiReply} (${Date.now()-t0}ms)`);
    } catch (aiErr) {
      console.warn('[教练Message] AI调用异常，降级到模拟回复:', aiErr.message);
      aiReply = null; // 让下面的null检查走降级逻辑
    }

    if (!aiReply) {
      aiReply = generateMockAIReply(session, history, content);
    }
    console.log(`[教练Message] step7 最终回复准备完毕 (${Date.now()-t0}ms)`);

    // 保存AI回复
    db.prepare(`
      INSERT INTO ai_coach_messages (session_id, role, content, hint)
      VALUES (?, 'ai', ?, ?)
    `).run(sessionId, aiReply.reply, aiReply.hint || null);

    // 获取最新消息
    const latestMsg = db.prepare(`
      SELECT * FROM ai_coach_messages WHERE session_id = ? ORDER BY id DESC LIMIT 1
    `).get(sessionId);

    success(res, {
      message: {
        role: latestMsg.role,
        content: latestMsg.content,
        hint: latestMsg.hint,
        created_at: latestMsg.created_at
      },
      round: session.total_rounds + 1,
      can_end: (session.total_rounds + 1) >= 5
    });
  } catch (err) {
    error(res, '发送消息失败: ' + err.message, 500);
  }
});

// 结束对话并获取AI评分（DeepSeek + 模拟降级）
router.post('/ai-coach/sessions/:sessionId/end', async (req, res) => {
  try {
    const db = getDB();
    const { user_id } = req.body;
    const sessionId = req.params.sessionId;

    // 规范化user_id
    const normalizedUserId = String(Number(user_id));

    const session = db.prepare(`
      SELECT s.*, sc.name as scenario_name, sc.personality_type, sc.personality_traits, sc.tips
      FROM ai_coach_sessions s
      JOIN ai_coach_scenarios sc ON s.scenario_id = sc.id
      WHERE s.id = ?
    `).get(sessionId);

    if (!session) return error(res, '会话不存在', 404);
    if (String(session.user_id) !== normalizedUserId) return error(res, '无权访问此会话');

    // 获取完整对话历史
    const messages = db.prepare(`
      SELECT role, content FROM ai_coach_messages 
      WHERE session_id = ? ORDER BY created_at ASC
    `).all(sessionId);

    // 计算对话时长
    const firstMsg = await db.prepare('SELECT created_at FROM ai_coach_messages WHERE session_id = ? ORDER BY created_at ASC LIMIT 1').get(sessionId);
    const lastMsg = await db.prepare('SELECT created_at FROM ai_coach_messages WHERE session_id = ? ORDER BY created_at DESC LIMIT 1').get(sessionId);
    const duration = firstMsg && lastMsg ? Math.round((new Date(lastMsg.created_at) - new Date(firstMsg.created_at)) / 1000) : 0;

    // 调用AI评分，失败时降级到模拟评分
    let evaluation;
    try {
      evaluation = await generateEvaluation(
        session.personality_type,
        session.personality_type === 'red' ? '红色-热情型' :
        session.personality_type === 'yellow' ? '黄色-目标型' :
        session.personality_type === 'blue' ? '蓝色-分析型' : '绿色-温和型',
        messages,
        duration
      );
    } catch (aiErr) {
      console.warn('[教练] AI评分失败，降级到模拟评分:', aiErr.message);
      evaluation = null;
    }

    if (!evaluation) {
      evaluation = generateMockEvaluation(session, messages);
    }

    const clamp = (v) => Math.max(30, Math.min(100, Math.round(v)));
    const scores = evaluation.scores;

    // 更新会话状态
    db.prepare(`
      UPDATE ai_coach_sessions SET
        status = 'completed',
        ended_at = CURRENT_TIMESTAMP,
        duration = ?,
        result = ?,
        overall_score = ?,
        personality_score = ?,
        need_discovery_score = ?,
        empathy_score = ?,
        professional_score = ?,
        objection_score = ?,
        closing_score = ?,
        naturalness_score = ?,
        feedback = ?
      WHERE id = ?
    `).run(
      evaluation.duration,
      evaluation.result,
      clamp(scores.overall || 60),
      clamp(scores.personality || 60),
      clamp(scores.need_discovery || 60),
      clamp(scores.empathy || 60),
      clamp(scores.professional || 60),
      clamp(scores.objection || 60),
      clamp(scores.closing || 60),
      clamp(scores.naturalness || 60),
      JSON.stringify(evaluation.feedback),
      sessionId
    );

    success(res, evaluation);
  } catch (err) {
    error(res, '结束对话失败: ' + err.message, 500);
  }
});

// 获取用户历史对话列表
router.get('/ai-coach/history', async (req, res) => {
  try {
    const db = getDB();
    const userId = req.query.user_id;
    if (!userId) return error(res, '缺少user_id');

    const { page = 1, pageSize = 10 } = req.query;
    const offset = (page - 1) * pageSize;

    const sessions = db.prepare(`
      SELECT s.id, s.scenario_id, sc.name as scenario_name, sc.personality_name,
        s.status, s.total_rounds, s.overall_score, s.result, s.created_at, s.ended_at
      FROM ai_coach_sessions s
      JOIN ai_coach_scenarios sc ON s.scenario_id = sc.id
      WHERE s.user_id = ?
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?
    `).all(userId, parseInt(pageSize), offset);

    const total = await db.prepare('SELECT COUNT(*) as cnt FROM ai_coach_sessions WHERE user_id = ?').get(userId).cnt;

    success(res, {
      items: sessions,
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      totalPages: Math.ceil(total / pageSize)
    });
  } catch (err) {
    error(res, '获取历史记录失败: ' + err.message, 500);
  }
});

// 获取对话详情
router.get('/ai-coach/sessions/:sessionId', async (req, res) => {
  try {
    const db = getDB();
    const userId = req.query.user_id;

    const session = db.prepare(`
      SELECT s.*, sc.name as scenario_name, sc.personality_name
      FROM ai_coach_sessions s
      JOIN ai_coach_scenarios sc ON s.scenario_id = sc.id
      WHERE s.id = ?
    `).get(req.params.sessionId);

    if (!session) return error(res, '会话不存在', 404);

    const messages = db.prepare(`
      SELECT * FROM ai_coach_messages WHERE session_id = ? ORDER BY created_at ASC
    `).all(req.params.sessionId);

    let feedback = null;
    if (session.feedback) {
      try { feedback = JSON.parse(session.feedback); } catch(e) { feedback = session.feedback; }
    }

    success(res, {
      ...session,
      feedback,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
        hint: m.hint,
        created_at: m.created_at
      }))
    });
  } catch (err) {
    error(res, '获取对话详情失败: ' + err.message, 500);
  }
});

// ==================== 小程序 - 排行榜 ====================

router.get('/ai-coach/rankings', async (req, res) => {
  try {
    const db = getDB();
    const { type = 'overall', limit = 20 } = req.query;
    const lim = Math.min(parseInt(limit) || 20, 100);

    let sql;
    if (type === 'level') {
      sql = `
        SELECT p.user_id, u.nickname, u.avatar_url as avatar,
          COUNT(CASE WHEN p.passed = 1 THEN 1 END) as levels_passed,
          SUM(p.best_score) as total_score
        FROM ai_level_progress p
        LEFT JOIN users u ON p.user_id = CAST(u.id AS TEXT)
        GROUP BY p.user_id
        ORDER BY levels_passed DESC, total_score DESC
        LIMIT ?
      `;
    } else {
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
    }

    const rankings = await db.prepare(sql).all(lim);
    success(res, rankings);
  } catch (err) {
    error(res, '获取排行榜失败: ' + err.message, 500);
  }
});

// ==================== 模拟AI回复（DeepSeek 降级方案） ====================

function generateMockAIReply(session, history, userMessage) {
  const traits = JSON.parse(session.personality_traits || '{}');
  const personality = session.personality_type;

  // 根据性格类型生成不同风格的回复
  const roundCount = history.filter(m => m.role === 'user').length;
  const replyVariants = getPersonalityReplies(personality, roundCount, userMessage);

  const randomIdx = Math.floor(Math.random() * replyVariants.length);
  const reply = replyVariants[randomIdx];

  return {
    reply: reply.text,
    hint: reply.hint
  };
}

function getPersonalityReplies(personality, round, userMessage) {
  if (personality === 'red') {
    if (round <= 1) return [
      { text: '哇你说得好好！不过我有个朋友之前用过类似的，她说效果一般...你们这个跟她的有什么不一样吗？', hint: '红色开始对比竞品，要展示差异化优势' },
      { text: '好好好，听起来不错！对了这个包装好漂亮啊，是不是限量版的？我朋友要是看到肯定羡慕死！', hint: '红色被外表吸引，强调独特性和社交价值' }
    ];
    if (round <= 3) return [
      { text: '感觉还不错诶！那这个多少钱呀？有没有什么优惠活动呀？我最近刚好想换一套护肤品！', hint: '红色开始关心价格，用赠品和专属福利代替降价' },
      { text: '好的好的！那你们有没有那种一套全包的套餐呀？我比较喜欢成套买的，省心！', hint: '红色想要完整方案，提供搭配套装' }
    ];
    return [
      { text: '好好好！那我拿这套吧！对了你们还有什么赠品吗？别家买都会送好多小样的！', hint: '成交信号！红色要赠品是"赢"的感觉，给足面子' },
      { text: '太好了！那快帮我包起来！我发朋友圈炫耀一下哈哈！', hint: '成交！红色喜欢分享，引导她发朋友圈做裂变' }
    ];
  }
  if (personality === 'yellow') {
    if (round <= 1) return [
      { text: '直接说重点，你这个产品凭什么比别家贵？效果好在哪？给我看看数据。', hint: '黄色要直接看数据，用对比图和真实案例回应' },
      { text: '行，我听你说了。但是你要告诉我，用多久能看到效果？我需要确定性。', hint: '黄色需要明确的时间承诺，给28天等具体节点' }
    ];
    if (round <= 3) return [
      { text: '成分我看了，还行。但是价格确实有点高。你给我算算性价比，一天要花多少钱？', hint: '黄色在算账，拆解日均成本证明性价比' },
      { text: '我之前用的XX品牌也很便宜，你说你的好，到底好在哪里？给我一个说服我的理由。', hint: '黄色在比较，用技术专利或独特优势来区分' }
    ];
    return [
      { text: '行，你说的有点道理。那你给我一个最终方案，包含什么、多少钱、多久见效。', hint: '黄色准备决策了，给清晰的完整方案' },
      { text: '好，就按你说的来。但我要看效果，一个月后要是没变化我可不认。', hint: '成交！但要设定回访计划跟进效果' }
    ];
  }
  if (personality === 'blue') {
    if (round <= 1) return [
      { text: '你说得对，但我需要看更多证据。你们有没有做过双盲测试？或者有没有第三方检测报告？', hint: '蓝色需要更多专业数据，提供检测报告和权威认证' },
      { text: '成分表我看过了，但这个XX成分的浓度是多少？有没有超过安全使用量？', hint: '蓝色关注安全性细节，给出具体浓度数据' }
    ];
    if (round <= 3) return [
      { text: '嗯，你说的有些道理。不过我还需要考虑一下。能不能给我几天时间研究一下再决定？', hint: '蓝色需要时间消化信息，但不要放走！提供试用装降低门槛' },
      { text: '我问完了，基本了解了。但是还有一个问题：如果用着过敏了怎么办？你们有什么售后保障？', hint: '蓝色最后的安全感确认，给出明确的售后保障承诺' }
    ];
    return [
      { text: '好吧，你回答了我的大部分问题。我决定先试试小包装的，如果效果好再买正装。可以吗？', hint: '蓝色决定试用，这是很好的开始！给试用装+使用指导' },
      { text: '行，我相信你的专业。那就按你推荐的来吧。不过你一定要加我微信，有问题我要能找到你。', hint: '成交！蓝色需要持续的专业支持，加微信是必须的' }
    ];
  }
  // green
  if (round <= 1) return [
    { text: '嗯...听起来还可以吧...不过我也不太懂这些，你说好就好吧...嗯，我再看看...', hint: '绿色犹豫不决，不要催，用温和的话语降低压力' },
    { text: '哦...是吗...那我这个皮肤问题...真的能改善吗？我之前试过好几个都没什么效果...', hint: '绿色有过失败经历，需要共情+安全承诺' }
  ];
  if (round <= 3) return [
    { text: '嗯...好的...不过这个价格...稍微有点贵了...我回去跟我老公商量一下吧...', hint: '绿色用"商量"做挡箭牌，帮她做决定或降低门槛' },
    { text: '好的...你说的我都记下了...那个...如果我买回去用着不好怎么办呢？...', hint: '绿色需要售后保障，明确退换货政策' }
  ];
  return [
    { text: '嗯...那好吧...你看着帮我搭配一套吧...我也不知道哪个好...你帮我选...', hint: '绿色让出选择权！帮她做决定并用二选一法成交' },
    { text: '好...那就这样吧...谢谢你的耐心...你人真好...那我以后有问题可以找你吗？', hint: '成交！绿色被真诚打动，强调以后随时可以找你' }
  ];
}

function generateMockEvaluation(session, messages) {
  const userMessages = messages.filter(m => m.role === 'user').length;
  const msgCount = userMessages;

  // 基于对话轮数生成模拟评分
  const baseScore = 60;
  const roundBonus = Math.min(msgCount * 3, 15);
  const randomBonus = Math.floor(Math.random() * 15);

  const overall = Math.min(baseScore + roundBonus + randomBonus, 98);
  const personality = Math.min(overall + Math.floor(Math.random() * 10 - 5), 100);
  const needDiscovery = Math.min(overall + Math.floor(Math.random() * 10 - 5), 100);
  const empathy = Math.min(overall + Math.floor(Math.random() * 10 - 3), 100);
  const professional = Math.min(overall + Math.floor(Math.random() * 10 - 5), 100);
  const objection = Math.min(overall + Math.floor(Math.random() * 15 - 5), 100);
  const closing = msgCount >= 5 ? Math.min(overall + Math.floor(Math.random() * 10), 100) : Math.max(overall - 20, 30);
  const naturalness = Math.min(overall + Math.floor(Math.random() * 10 - 3), 100);

  const clamp = (v) => Math.max(30, Math.min(100, v));

  const result = overall >= 80 ? '成交' : overall >= 60 ? '有兴趣但未成交' : '流失';

  const feedback = {
    strengths: [],
    improvements: [],
    summary: ''
  };

  if (personality >= 75) feedback.strengths.push('能够较好地运用针对该性格的沟通策略');
  else feedback.improvements.push('建议多学习该性格类型的沟通技巧，注意调整语速和用词');

  if (needDiscovery >= 75) feedback.strengths.push('需求挖掘做得不错，通过提问了解了客户真实需求');
  else feedback.improvements.push('需要加强需求挖掘环节，建议使用"时问、因问、果问、期问、预问"五步法');

  if (empathy >= 75) feedback.strengths.push('共情能力较好，让客户感到被理解和关怀');
  else feedback.improvements.push('注意在对话中加入更多共情表达，让客户感到你理解ta的困扰');

  if (professional >= 75) feedback.strengths.push('专业呈现清晰，产品价值传递到位');
  else feedback.improvements.push('建议更清晰地使用FAB法则（特点-优势-利益）来介绍产品');

  if (objection >= 75) feedback.strengths.push('异议处理得当，能自然地化解客户疑虑');
  else feedback.improvements.push('面对客户异议时，记住先倾听认可，再探究原因，最后回应化解');

  if (closing >= 75) feedback.strengths.push('成交推动有力，抓住时机促成了成交');
  else feedback.improvements.push('注意识别成交信号，大胆使用假定成交法和二选一法');

  if (msgCount < 5) feedback.improvements.push('对话轮次较少，建议多与客户互动，充分了解需求后再推荐产品');

  feedback.summary = overall >= 80 
    ? '整体表现优秀！你展现了良好的销售沟通能力，特别是在' + (feedback.strengths[0] || '多个方面') + '。继续保持！'
    : '整体表现不错，还有提升空间。重点改进方向：' + (feedback.improvements[0] || '综合提升各项技能') + '。多练习会越来越好！';

  return {
    result,
    duration: msgCount * 45 + Math.floor(Math.random() * 120),
    scores: {
      overall: clamp(overall),
      personality: clamp(personality),
      need_discovery: clamp(needDiscovery),
      empathy: clamp(empathy),
      professional: clamp(professional),
      objection: clamp(objection),
      closing: clamp(closing),
      naturalness: clamp(naturalness)
    },
    feedback
  };
}

module.exports = router;
