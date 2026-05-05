/**
 * AI销售学院服务层
 * 
 * 提供成就系统、经验值系统、学习路径、每日任务、训练快照等功能
 */

const { getDB } = require('../utils/db');
// 兼容直接 await getDb().prepare() 调用方式，每次调用时获取最新连接
async function getDb() { return getDB(); }

// ==========================================
// 经验值等级配置
// ==========================================
const LEVEL_THRESHOLDS = [
  { level: 1, xp: 0, title: '销售新人', icon: '🌱', minScore: 0 },
  { level: 2, xp: 100, title: '见习顾问', icon: '📝', minScore: 50 },
  { level: 3, xp: 300, title: '初级讲师', icon: '🎯', minScore: 55 },
  { level: 4, xp: 700, title: '中级教练', icon: '⭐', minScore: 65 },
  { level: 5, xp: 1500, title: '高级导师', icon: '💎', minScore: 75 },
  { level: 6, xp: 3000, title: '资深专家', icon: '🏆', minScore: 85 },
  { level: 7, xp: 6000, title: '金牌大师', icon: '👑', minScore: 90 },
  { level: 8, xp: 12000, title: '传奇讲师', icon: '🔥', minScore: 95 },
];

async function getLevelFromXp(xp) {
  let level = 1;
  for (const t of LEVEL_THRESHOLDS) {
    if (xp >= t.xp) level = t.level;
  }
  return level;
}

// ==========================================
// 经验值操作
// ==========================================

/**
 * 添加经验值
 */
async function addXp(userId, amount, source, sourceId = null, description = '') {
  const insertLog = await getDb().prepare(`
    INSERT INTO socratic_xp_log (user_id, xp_amount, source, source_id, description)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertLog.run(userId, amount, source, sourceId, description);

  // 更新用户总经验值和等级
  const user = await getDb().prepare('SELECT socratic_xp FROM users WHERE id = ?').get(userId);
  if (user) {
    const newXp = (user.socratic_xp || 0) + amount;
    const newLevel = getLevelFromXp(newXp);
    const levelInfo = LEVEL_THRESHOLDS.find(l => l.level === newLevel);
    
    await getDb().prepare('UPDATE users SET socratic_xp = ?, socratic_level = ?, socratic_title = ? WHERE id = ?')
      .run(newXp, newLevel, levelInfo.title, userId);

    return { newXp, oldXp: user.socratic_xp || 0, newLevel, oldLevel: getLevelFromXp(user.socratic_xp || 0), leveledUp: newLevel > getLevelFromXp(user.socratic_xp || 0) };
  }
  return null;
}

/**
 * 获取用户等级信息
 */
async function getUserLevelInfo(userId) {
  const user = await getDb().prepare('SELECT socratic_xp, socratic_level, socratic_title, total_training_minutes FROM users WHERE id = ?').get(userId);
  if (!user) return null;

  const xp = user.socratic_xp || 0;
  const currentLevel = getLevelFromXp(xp);
  const currentConfig = LEVEL_THRESHOLDS.find(l => l.level === currentLevel);
  const nextConfig = LEVEL_THRESHOLDS.find(l => l.level === currentLevel + 1);

  return {
    xp,
    level: currentLevel,
    title: user.socratic_title || currentConfig.title,
    icon: currentConfig.icon,
    totalMinutes: user.total_training_minutes || 0,
    nextLevelXp: nextConfig ? nextConfig.xp : null,
    currentLevelXp: currentConfig.xp,
    progressToNext: nextConfig ? Math.floor(((xp - currentConfig.xp) / (nextConfig.xp - currentConfig.xp)) * 100) : 100,
    maxLevel: !nextConfig,
  };
}

// ==========================================
// 成就系统
// ==========================================

/**
 * 检查并解锁成就（在训练结束时调用）
 */
async async function checkAndUnlockAchievements(userId, stats) {
  /**
   * stats 格式:
   * {
   *   total_sessions: number,
   *   overall_score: number,
   *   questioning_score: number,
   *   listening_score: number,
   *   guiding_score: number,
   *   timing_score: number,
   *   depth_score: number,
   *   daily_streak: number,
   *   unique_categories: string[],
   *   unique_question_types: string[],
   *   unique_personalities: string[],
   *   session_id: number
   * }
   */
  
  const unlockedAchievements = [];

  // 获取所有未解锁的成就
  const existingUnlocked = await getDb().prepare(
    'SELECT achievement_id FROM user_achievements WHERE user_id = ?'
  ).all(userId).map(u => u.achievement_id);

  const achievements = await getDb().prepare('SELECT * FROM achievements WHERE status = 1 AND id NOT IN (' +
    (existingUnlocked.length > 0 ? existingUnlocked.join(',') : '0') + ')'
  ).all();

  if (existingUnlocked.length > 0) {
    var allAchievements = await getDb().prepare(`SELECT * FROM achievements WHERE status = 1 AND id NOT IN (${existingUnlocked.join(',')})`).all();
  } else {
    var allAchievements = await getDb().prepare('SELECT * FROM achievements WHERE status = 1').all();
  }

  for (const achievement of allAchievements) {
    let shouldUnlock = false;
    
    switch (achievement.condition_type) {
      case 'count':
        if (achievement.condition_field === 'total_sessions') {
          shouldUnlock = stats.total_sessions >= achievement.condition_target;
        } else if (achievement.condition_field === 'unique_categories') {
          shouldUnlock = (stats.unique_categories?.length || 0) >= achievement.condition_target;
        } else if (achievement.condition_field === 'unique_question_types') {
          shouldUnlock = (stats.unique_question_types?.length || 0) >= achievement.condition_target;
        } else if (achievement.condition_field === 'unique_personalities') {
          shouldUnlock = (stats.unique_personalities?.length || 0) >= achievement.condition_target;
        }
        break;

      case 'score':
        const fieldValue = stats[achievement.condition_field] || 0;
        shouldUnlock = fieldValue >= achievement.condition_target;
        break;

      case 'streak':
        shouldUnlock = (stats.daily_streak || 0) >= achievement.condition_target;
        break;

      case 'special':
        // 特殊条件，后续扩展
        break;
    }

    if (shouldUnlock) {
      // 解锁成就
      await getDb().prepare(`
        INSERT INTO user_achievements (user_id, achievement_id, session_id, notified)
        VALUES (?, ?, ?, 0)
      `).run(userId, achievement.id, stats.session_id);

      // 奖励经验值
      addXp(userId, achievement.xp_reward, 'achievement', achievement.id, `解锁成就: ${achievement.name}`);

      unlockedAchievements.push(achievement);
    }
  }

  return unlockedAchievements;
}

/**
 * 获取用户的成就列表（含解锁状态）
 */
async function getUserAchievements(userId) {
  const unlockedIds = await getDb().prepare(
    'SELECT achievement_id, unlocked_at FROM user_achievements WHERE user_id = ? ORDER BY unlocked_at DESC'
  ).all(userId);

  const allAchievements = await getDb().prepare('SELECT * FROM achievements WHERE status = 1 ORDER BY sort_order ASC').all();

  return allAchievements.map(a => {
    const unlocked = unlockedIds.find(u => u.achievement_id === a.id);
    return {
      ...a,
      unlocked: !!unlocked,
      unlockedAt: unlocked ? unlocked.unlocked_at : null,
      progress: calculateProgress(a, userId),  // 进度百分比
    };
  });
}

async function calculateProgress(achievement, userId) {
  // 简化的进度计算，实际应根据具体字段统计
  // 返回 0-100 或已解锁返回null
  try {
    switch (achievement.condition_field) {
      case 'total_sessions': {
        const count = await getDb().prepare('SELECT COUNT(*) as c FROM socratic_sessions WHERE user_id = ? AND status = "completed"').get(userId).c;
        return Math.min(100, Math.floor((count / achievement.condition_target) * 100));
      }
      default:
        return 0;
    }
  } catch(e) {
    return 0;
  }
}

// ==========================================
// 学习路径系统
// ==========================================

/**
 * 获取所有学习路径
 */
async function getAllPaths() {
  return await getDb().prepare('SELECT * FROM learning_paths WHERE status = 1 ORDER BY sort_order ASC').all().map(p => ({
    ...p,
    scenario_ids: JSON.parse(p.scenario_ids || '[]'),
  }));
}

/**
 * 获取用户学习进度概览
 */
async function getUserPathProgress(userId) {
  const paths = getAllPaths();
  const progresses = await getDb().prepare(
    'SELECT path_id, current_step, completed_scenario_ids, status, started_at, completed_at, score_summary FROM user_path_progress WHERE user_id = ?'
  ).all(userId);

  return paths.map(path => {
    const prog = progresses.find(p => p.path_id === path.id);
    const scenarioCount = path.scenario_ids.length;
    const completedCount = prog ? JSON.parse(prog.completed_scenario_ids || '[]').length : 0;

    return {
      ...path,
      enrolled: !!prog,
      progress: scenarioCount > 0 ? Math.round((completedCount / scenarioCount) * 100) : 0,
      completedScenarios: completedCount,
      totalScenarios: scenarioCount,
      currentStep: prog?.current_step || 0,
      status: prog?.status || 'not_started',
      startedAt: prog?.started_at || null,
      completedAt: prog?.completed_at || null,
      scores: prog?.score_summary ? JSON.parse(prog.score_summary) : {},
    };
  });
}

/**
 * 开始一条学习路径
 */
async function startPath(userId, pathId) {
  // 检查是否已开始
  const existing = await getDb().prepare('SELECT id FROM user_path_progress WHERE user_id = ? AND path_id = ?').get(userId, pathId);
  if (existing) throw new Error('已经加入此学习路径');

  const insert = await getDb().prepare(`
    INSERT INTO user_path_progress (user_id, path_id, status)
    VALUES (?, ?, 'in_progress')
  `);
  insert.run(userId, pathId);

  return true;
}

/**
 * 更新路径进度（完成某个场景后调用）
 */
async function updatePathProgress(userId, scenarioId, scoreData) {
  // 找到包含该场景的所有活跃路径
  const paths = await getDb().prepare('SELECT * FROM learning_paths WHERE status = 1 AND scenario_ids LIKE ?')
    .all('%' + scenarioId + '%');

  for (const path of paths) {
    let progress = await getDb().prepare(
      'SELECT id, current_step, completed_scenario_ids, status FROM user_path_progress WHERE user_id = ? AND path_id = ? AND status = "in_progress"'
    ).get(userId, path.id);

    if (!progress) continue;

    const completedIds = JSON.parse(progress.completed_scenario_ids || '[]');
    if (!completedIds.includes(scenarioId)) {
      completedIds.push(scenarioId);
      const newStep = progress.current_step + 1;
      const isComplete = newStep >= path.scenario_ids.split(', ').length;

      // 保存分数摘要
      let scoreSummary = {};
      try { scoreSummary = JSON.parse(progress.score_summary || '{}'); } catch(e) {}

      await getDb().prepare(`UPDATE user_path_progress SET current_step = ?, completed_scenario_ids = ?, status = ?, score_summary = ?, completed_at = ? WHERE id = ?`).run(
        newStep,
        JSON.stringify(completedIds),
        isComplete ? 'completed' : 'in_progress',
        JSON.stringify({ ...scoreSummary, [scenarioId]: scoreData }),
        isComplete ? new Date().toISOString() : null,
        progress.id
      );

      // 完成整个路径奖励经验值
      if (isComplete) {
        addXp(userId, 200, 'path_complete', path.id, `完成学习路径: ${path.name}`);
      }
    }
  }
}

// ==========================================
// 每日任务系统
// ==========================================

/**
 * 获取今日任务列表及完成状态
 */
async function getDailyTasks(userId) {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  const tasks = await getDb().prepare('SELECT * FROM daily_tasks ORDER BY sort_order ASC').all();
  const completions = await getDb().prepare(
    'SELECT task_id, current_count, completed FROM daily_task_completions WHERE user_id = ? AND completion_date = ?'
  ).all(userId, today);

  return tasks.map(t => {
    const comp = completions.find(c => c.task_id === t.id);
    return {
      ...t,
      currentProgress: comp?.current_count || 0,
      targetCount: t.target_count,
      completed: !!comp?.completed,
      claimed: !!comp && comp.completed === 1,
      canClaim: comp && comp.current_count >= t.target_count && comp.completed === 0,
    };
  });
}

/**
 * 更新每日任务进度
 */
async function updateDailyTaskProgress(userId, taskKey, increment = 1) {
  const today = new Date().toISOString().split('T')[0];
  const task = await getDb().prepare('SELECT id, target_count, xp_reward FROM daily_tasks WHERE key = ?').get(taskKey);
  if (!task) return null;

  // 获取或创建今日记录
  let completion = await getDb().prepare(
    'SELECT id, current_count, completed FROM daily_task_completions WHERE user_id = ? AND task_id = ? AND completion_date = ?'
  ).get(userId, task.id, today);

  if (!completion) {
    await getDb().prepare(
      'INSERT INTO daily_task_completions (user_id, task_id, completion_date, current_count) VALUES (?, ?, ?, ?)'
    ).run(userId, task.id, today, increment);
    completion = { current_count: increment, completed: 0 };
  } else if (completion.completed === 0) {
    const newCount = Math.min(completion.current_count + increment, task.target_count + 5); // 允许超额
    await getDb().prepare('UPDATE daily_task_completions SET current_count = ? WHERE id = ?').run(newCount, completion.id);
    completion.current_count = newCount;
  }

  return {
    taskId: task.id,
    currentCount: completion.current_count,
    targetCount: task.target_count,
    completed: completion.current_count >= task.target_count,
    xpReward: task.xp_reward,
  };
}

/**
 * 领取任务奖励
 */
async function claimDailyTaskReward(userId, taskKey) {
  const today = new Date().toISOString().split('T')[0];
  const task = await getDb().prepare('SELECT id, xp_reward FROM daily_tasks WHERE key = ?').get(taskKey);
  if (!task) throw new Error('任务不存在');

  const completion = await getDb().prepare(
    'SELECT id, current_count, completed FROM daily_task_completions WHERE user_id = ? AND task_id = ? AND completion_date = ?'
  ).get(userId, task.id, today);

  if (!completion || completion.current_count < task.target_count) throw new Error('任务尚未完成');
  if (completion.completed === 1) throw new Error('奖励已领取');

  // 标记为已领取
  await getDb().prepare('UPDATE daily_task_completions SET completed = 1 WHERE id = ?').run(completion.id);

  // 增加经验值
  const xpResult = addXp(userId, task.xp_reward, 'daily_task', task.id, `领取每日任务: ${task.name}`);

  return { success: true, xpEarned: task.xp_reward, ...xpResult };
}

// ==========================================
// 训练快照（历史对比用）
// ==========================================

/**
 * 创建训练快照
 */
async function createSessionSnapshot(userId, sessionId, data) {
  // 检查是否已有快照
  const existing = await getDb().prepare('SELECT id FROM session_snapshots WHERE session_id = ?').get(sessionId);
  if (existing) return existing.id;

  const insert = await getDb().prepare(`
    INSERT INTO session_snapshots 
    (user_id, session_id, snapshot_date, scores_json, grade, overall_score, scenario_category, personality_type, duration)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = insert.run(
    userId,
    sessionId,
    data.date || new Date().toISOString(),
    JSON.stringify(data.scores || {}),
    data.grade || '',
    data.overallScore || 0,
    data.category || '',
    data.personality || '',
    data.duration || 0
  );

  return result.lastInsertRowid;
}

/**
 * 获取用户的历史快照（用于趋势图）
 */
async function getSessionSnapshots(userId, limit = 20) {
  return await getDb().prepare(
    'SELECT * FROM session_snapshots WHERE user_id = ? ORDER BY snapshot_date DESC LIMIT ?'
  ).all(userId, limit).map(s => ({
    ...s,
    scores: JSON.parse(s.scores_json),
  }));
}

// ==========================================
// 仪表盘概览数据
// ==========================================

/**
 * 获取AI销售学院首页仪表盘数据
 */
async function getDashboardOverview(userId) {
  // 基础统计
  const totalSessions = await getDb().prepare(
    'SELECT COUNT(*) as c FROM socratic_sessions WHERE user_id = ? AND status = "completed"'
  ).get(userId)?.c || 0;

  const avgScoreRow = await getDb().prepare(
    'SELECT AVG(CAST(overall_score AS FLOAT)) as avg FROM session_snapshots WHERE user_id = ?'
  ).get(userId);
  const avgScore = Math.round(avgScoreRow?.avg || 0);

  const totalMinutes = await getDb().prepare('SELECT total_training_minutes FROM users WHERE id = ?').get(userId)?.total_training_minutes || 0;

  // 今日训练次数
  const today = new Date().toISOString().split('T')[0];
  const todaySessions = await getDb().prepare(
    'SELECT COUNT(*) as c FROM socratic_sessions WHERE user_id = ? AND DATE(created_at) = ? AND status = "completed"'
  ).get(userId, today)?.c || 0;

  // 连续训练天数
  const streak = calculateStreak(userId);

  // 等级信息
  const levelInfo = getUserLevelInfo(userId);

  // 成就统计
  const totalAchievements = await getDb().prepare('SELECT COUNT(*) as c FROM achievements WHERE status = 1').get()?.c || 0;
  const unlockedAchievements = await getDb().prepare('SELECT COUNT(*) as c FROM user_achievements WHERE user_id = ?').get(userId)?.c || 0;

  // 最近5次训练趋势
  const recentSnapshots = getSessionSnapshots(userId, 5).reverse(); // 时间正序

  // 推荐下一个场景（基于弱项）
  const recommendation = generateRecommendation(userId, recentSnapshots);

  // 每日任务概览
  const dailyTasks = getDailyTasks(userId);
  const tasksCompleted = dailyTasks.filter(t => t.completed).length;
  const tasksTotal = dailyTasks.length;

  return {
    summary: {
      totalSessions,
      avgScore,
      totalMinutes,
      todaySessions,
      streak,
    },
    level: levelInfo,
    achievements: {
      total: totalAchievements,
      unlocked: unlockedAchievements,
      progress: totalAchievements > 0 ? Math.round((unlockedAchievements / totalAchievements) * 100) : 0,
    },
    dailyTasks: {
      completed: tasksCompleted,
      total: tasksTotal,
      allCompleted: tasksCompleted >= tasksTotal,
    },
    recentTrend: recentSnapshots.map(s => ({
      date: s.snapshot_date,
      score: s.overallScore,
      grade: s.grade,
    })),
    recommendation,
  };
}

/**
 * 计算连续训练天数
 */
async function calculateStreak(userId) {
  let streak = 0;
  let checkDate = new Date();
  checkDate.setHours(0, 0, 0, 0);

  while (true) {
    const dateStr = checkDate.toISOString().split('T')[0];
    const hasTraining = await getDb().prepare(
      'SELECT id FROM socratic_sessions WHERE user_id = ? AND DATE(created_at) = ? AND status = "completed" LIMIT 1'
    ).get(userId, dateStr);

    if (hasTraining) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (streak === 0) {
      // 今天还没练，检查昨天
      checkDate.setDate(checkDate.getDate() - 1);
      const yesterdayHas = await getDb().prepare(
        'SELECT id FROM socratic_sessions WHERE user_id = ? AND DATE(created_at) = ? AND status = "completed" LIMIT 1'
      ).get(userId, checkDate.toISOString().split('T')[0]);
      if (yesterdayHas) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    } else {
      break;
    }

    if (streak > 365) break; // 安全限制
  }

  return streak;
}

/**
 * 基于历史表现生成智能推荐
 */
function generateRecommendation(userId, recentSnapshots) {
  if (recentSnapshots.length === 0) {
    return {
      type: 'welcome',
      message: '开始你的第一次苏格拉底训练吧！',
      suggestedScenarioId: 1,
      reason: '从基础场景开始，逐步提升你的提问技巧',
    };
  }

  // 计算各维度平均分
  const dimensionAverages = {
    questioning_score: 0,
    listening_score: 0,
    guiding_score: 0,
    timing_score: 0,
    depth_score: 0,
  };

  let validSnapshots = 0;
  for (const snap of recentSnapshots) {
    if (snap.scores && typeof snap.scores === 'object') {
      for (const key of Object.keys(dimensionAverages)) {
        dimensionAverages[key] += (snap.scores[key] || 0);
      }
      validSnapshots++;
    }
  }

  if (validSnapshots === 0) {
    return {
      type: 'continue',
      message: '继续保持训练频率！',
      suggestedScenarioId: null,
      reason: '持续练习是进步的关键',
    };
  }

  // 找出最弱的维度
  let weakestDimension = '';
  let lowestScore = Infinity;
  for (const [key, value] of Object.entries(dimensionAverages)) {
    const avg = value / validSnapshots;
    if (avg < lowestScore) {
      lowestScore = avg;
      weakestDimension = key;
    }
  }

  const dimensionNames = {
    questioning_score: '提问技巧',
    listening_score: '倾听确认',
    guiding_score: '引导能力',
    timing_score: '时机把握',
    depth_score: '深度挖掘',
  };

  // 推荐一个针对弱项的场景
  const scenarios = await getDb().prepare(
    'SELECT id, name, category FROM socratic_scenarios WHERE status = 1 ORDER BY RANDOM() LIMIT 3'
  ).all();

  return {
    type: 'improvement',
    message: `你的${dimensionNames[weakestDimension]}维度有提升空间`,
    suggestedScenarioId: scenarios[0]?.id,
    weakDimension: weakestDimension,
    weakDimensionName: dimensionNames[weakestDimension],
    weakScore: Math.round(lowestScore),
    reason: `建议多练习${dimensionNames[weakestDimension]}相关的场景`,
    alternativeScenarios: scenarios.slice(1).map(s => ({ id: s.id, name: s.name })),
  };
}

module.exports = {
  // 等级配置
  LEVEL_THRESHOLDS,
  getLevelFromXp,

  // 经验值
  addXp,
  getUserLevelInfo,

  // 成就
  checkAndUnlockAchievements,
  getUserAchievements,

  // 学习路径
  getAllPaths,
  getUserPathProgress,
  startPath,
  updatePathProgress,

  // 每日任务
  getDailyTasks,
  updateDailyTaskProgress,
  claimDailyTaskReward,

  // 快照
  createSessionSnapshot,
  getSessionSnapshots,

  // 仪表盘
  getDashboardOverview,
  calculateStreak,
  generateRecommendation,
};
