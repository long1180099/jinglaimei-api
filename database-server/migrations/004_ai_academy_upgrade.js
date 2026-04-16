/**
 * 004 - AI销售学院全面升级
 * 
 * 新增功能模块：
 * 1. 成就系统 (achievements / user_achievements)
 * 2. 经验值与等级系统 (socratic_xp_log) + users扩展字段
 * 3. 学习路径系统 (learning_paths / user_path_progress)
 * 4. 每日任务系统 (daily_tasks / daily_task_completions)
 * 5. 训练快照 (session_snapshots) - 用于历史对比
 */

const db = require('../src/utils/db');

exports.up = function() {
  db.exec(`
    -- ==========================================
    -- 1. 成就系统
    -- ==========================================
    CREATE TABLE IF NOT EXISTS achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      icon TEXT DEFAULT '🏆',
      category TEXT DEFAULT 'milestone',
      rarity TEXT DEFAULT 'common',
      xp_reward INTEGER DEFAULT 0,
      condition_type TEXT DEFAULT 'count',
      condition_target INTEGER DEFAULT 1,
      condition_field TEXT DEFAULT '',
      badge_color TEXT DEFAULT '#e94560',
      hidden INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      status INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      achievement_id INTEGER NOT NULL,
      unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      session_id INTEGER,
      notified INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (achievement_id) REFERENCES achievements(id),
      FOREIGN KEY (session_id) REFERENCES socratic_sessions(id),
      UNIQUE(user_id, achievement_id)
    );
  `);

  // 尝试添加users表扩展字段
  try { db.exec(`ALTER TABLE users ADD COLUMN socratic_xp INTEGER DEFAULT 0`); } catch(e) {}
  try { db.exec(`ALTER TABLE users ADD COLUMN socratic_level INTEGER DEFAULT 1`); } catch(e) {}
  try { db.exec(`ALTER TABLE users ADD COLUMN socratic_title TEXT DEFAULT '销售新人'`); } catch(e) {}
  try { db.exec(`ALTER TABLE users ADD COLUMN total_training_minutes INTEGER DEFAULT 0`); } catch(e) {}

  db.exec(`
    -- ==========================================
    -- 2. 经验值日志
    -- ==========================================
    CREATE TABLE IF NOT EXISTS socratic_xp_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      xp_amount INTEGER NOT NULL DEFAULT 0,
      source TEXT NOT NULL DEFAULT 'training',
      source_id INTEGER,
      description TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- ==========================================
    -- 3. 学习路径系统
    -- ==========================================
    CREATE TABLE IF NOT EXISTS learning_paths (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      icon TEXT DEFAULT '📚',
      difficulty TEXT DEFAULT 'medium',
      estimated_minutes INTEGER DEFAULT 30,
      min_level INTEGER DEFAULT 0,
      scenario_ids TEXT DEFAULT '',
      tags TEXT DEFAULT '',
      cover_color TEXT DEFAULT '#e94560',
      sort_order INTEGER DEFAULT 0,
      status INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_path_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      path_id INTEGER NOT NULL,
      current_step INTEGER DEFAULT 0,
      completed_scenario_ids TEXT DEFAULT '',
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      status TEXT DEFAULT 'in_progress',
      score_summary TEXT DEFAULT '{}',
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (path_id) REFERENCES learning_paths(id),
      UNIQUE(user_id, path_id)
    );

    -- ==========================================
    -- 4. 每日任务系统
    -- ==========================================
    CREATE TABLE IF NOT EXISTS daily_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      icon TEXT DEFAULT '✅',
      target_count INTEGER DEFAULT 1,
      xp_reward INTEGER DEFAULT 10,
      sort_order INTEGER DEFAULT 0,
      is_daily INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS daily_task_completions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      task_id INTEGER NOT NULL,
      completion_date TEXT NOT NULL,
      current_count INTEGER DEFAULT 0,
      completed INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (task_id) REFERENCES daily_tasks(id),
      UNIQUE(user_id, task_id, completion_date)
    );

    -- ==========================================
    -- 5. 训练快照（用于历史对比）
    -- ==========================================
    CREATE TABLE IF NOT EXISTS session_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      session_id INTEGER NOT NULL UNIQUE,
      snapshot_date TEXT NOT NULL,
      scores_json TEXT NOT NULL,
      grade TEXT DEFAULT '',
      overall_score INTEGER DEFAULT 0,
      scenario_category TEXT DEFAULT '',
      personality_type TEXT DEFAULT '',
      duration INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (session_id) REFERENCES socratic_sessions(id)
    );
  `);

  // ===== 插入成就种子数据 =====
  const achievements = [
    // 里程碑类
    { key: 'first_training', name: '初出茅庐', description: '完成第一次苏格拉底训练', icon: '🌱', category: 'milestone', rarity: 'common', xp_reward: 20, condition_type: 'count', condition_target: 1, condition_field: 'total_sessions', badge_color: '#52c41a', sort_order: 1 },
    { key: 'trainings_5', name: '渐入佳境', description: '完成5次训练', icon: '🔥', category: 'milestone', rarity: 'common', xp_reward: 50, condition_type: 'count', condition_target: 5, condition_field: 'total_sessions', badge_color: '#1890ff', sort_order: 2 },
    { key: 'trainings_10', name: '勤学苦练', description: '完成10次训练', icon: '💪', category: 'milestone', rarity: 'common', xp_reward: 100, condition_type: 'count', condition_target: 10, condition_field: 'total_sessions', badge_color: '#722ed1', sort_order: 3 },
    { key: 'trainings_25', name: '训练达人', description: '完成25次训练', icon: '⭐', category: 'milestone', rarity: 'rare', xp_reward: 250, condition_type: 'count', condition_target: 25, condition_field: 'total_sessions', badge_color: '#fa8c16', sort_order: 4 },
    { key: 'trainings_50', name: '百炼成钢', description: '完成50次训练', icon: '🎖️', category: 'milestone', rarity: 'rare', xp_reward: 500, condition_type: 'count', condition_target: 50, condition_field: 'total_sessions', badge_color: '#eb2f96', sort_order: 5 },
    { key: 'trainings_100', name: '训练大师', description: '完成100次训练', icon: '👑', category: 'milestone', rarity: 'legendary', xp_reward: 2000, condition_type: 'count', condition_target: 100, condition_field: 'total_sessions', badge_color: '#f5222d', sort_order: 6 },

    // 技能类成就（基于评分维度）
    { key: 'score_a_first', name: '初露锋芒', description: '首次获得A级评价', icon: '🎯', category: 'skill', rarity: 'rare', xp_reward: 80, condition_type: 'score', condition_target: 85, condition_field: 'overall_score', badge_color: '#13c2c2', hidden: 0, sort_order: 10 },
    { key: 'score_s_first', name: '完美表现', description: '首次获得S级评价', icon: '💎', category: 'skill', rarity: 'legendary', xp_reward: 300, condition_type: 'score', condition_target: 95, condition_field: 'overall_score', badge_color: '#f5222d', hidden: 0, sort_order: 11 },
    { key: 'question_master', name: '提问大师', description: '提问技巧维度达到90分以上', icon: '❓', category: 'skill', rarity: 'epic', xp_reward: 150, condition_type: 'score', condition_target: 90, condition_field: 'questioning_score', badge_color: '#1890ff', hidden: 0, sort_order: 12 },
    { key: 'listen_master', name: '倾听达人', description: '倾听确认维度达到90分以上', icon: '👂', category: 'skill', rarity: 'epic', xp_reward: 150, condition_type: 'score', condition_target: 90, condition_field: 'listening_score', badge_color: '#52c41a', hidden: 0, sort_order: 13 },
    { key: 'guide_master', name: '引导专家', description: '引导能力维度达到90分以上', icon: '➡️', category: 'skill', rarity: 'epic', xp_reward: 150, condition_type: 'score', condition_target: 90, condition_field: 'guiding_score', badge_color: '#722ed1', hidden: 0, sort_order: 14 },

    // 连续类成就
    { key: 'streak_3', name: '三连击', description: '连续3天进行训练', icon: '⚡', category: 'streak', rarity: 'common', xp_reward: 40, condition_type: 'streak', condition_target: 3, condition_field: 'daily_streak', badge_color: '#faad14', sort_order: 20 },
    { key: 'streak_7', name: '周周练', description: '连续7天进行训练', icon: '🔥', category: 'streak', rarity: 'rare', xp_reward: 120, condition_type: 'streak', condition_target: 7, condition_field: 'daily_streak', badge_color: '#ff7a45', sort_order: 21 },
    { key: 'streak_14', name: '两周坚持', description: '连续14天进行训练', icon: '💫', category: 'streak', rarity: 'epic', xp_reward: 300, condition_type: 'streak', condition_target: 14, condition_field: 'daily_streak', badge_color: '#f759ab', sort_order: 22 },
    { key: 'streak_30', name: '月度冠军', description: '连续30天进行训练', icon: '🏆', category: 'streak', rarity: 'legendary', xp_reward: 800, condition_type: 'streak', condition_target: 30, condition_field: 'daily_streak', badge_color: '#cf1322', sort_order: 23 },

    // 场景探索类
    { key: 'explore_3_categories', name: '多面手', description: '体验3个不同场景分类', icon: '🔄', category: 'milestone', rarity: 'common', xp_reward: 60, condition_type: 'count', condition_target: 3, condition_field: 'unique_categories', badge_color: '#597ef7', sort_order: 30 },
    { key: 'explore_all_types', name: '全场景探索者', description: '体验全部6种提问类型', icon: '🌟', category: 'milestone', rarity: 'rare', xp_reward: 200, condition_type: 'count', condition_target: 6, condition_field: 'unique_question_types', badge_color: '#ffc53d', sort_order: 31 },

    // 性格类成就
    { key: 'all_personalities', name: '性格变色龙', description: '用所有4种性格角色都完成过训练', icon: '🦎', category: 'milestone', rarity: 'epic', xp_reward: 350, condition_type: 'count', condition_target: 4, condition_field: 'unique_personalities', badge_color: '#b37feb', sort_order: 40 },
  ];

  const insertAchievement = db.prepare(`
    INSERT OR IGNORE INTO achievements 
    (key, name, description, icon, category, rarity, xp_reward, condition_type, condition_target, condition_field, badge_color, hidden, sort_order, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);

  achievements.forEach(a => {
    insertAchievement.run(
      a.key, a.name, a.description, a.icon, a.category, a.rarity,
      a.xp_reward, a.condition_type, a.condition_target, a.condition_field,
      a.badge_color, a.hidden || 0, a.sort_order
    );
  });

  // ===== 插入每日任务种子数据 =====
  const dailyTasks = [
    { key: 'daily_train_once', name: '每日一练', description: '每天至少完成1次训练', icon: '🎯', target_count: 1, xp_reward: 15, is_daily: 1, sort_order: 1 },
    { key: 'daily_train_three', name: '三连训', description: '每天完成3次训练', icon: '🔥', target_count: 3, xp_reward: 30, is_daily: 1, sort_order: 2 },
    { key: 'daily_all_types', name: '全能练习', description: '用3种不同提问类型完成训练', icon: '🌈', target_count: 3, xp_reward: 40, is_daily: 1, sort_order: 3 },
    { key: 'daily_high_score', name: '追求卓越', description: '单次训练获得80分以上', icon: '💎', target_count: 1, xp_reward: 35, is_daily: 1, sort_order: 4 },
    { key: 'daily_explore', name: '勇于尝试', description: '尝试一个新场景或新性格', icon: '🚀', target_count: 1, xp_reward: 20, is_daily: 1, sort_order: 5 },
  ];

  const insertTask = db.prepare(`
    INSERT OR IGNORE INTO daily_tasks (key, name, description, icon, target_count, xp_reward, is_daily, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  dailyTasks.forEach(t => {
    insertTask.run(t.key, t.name, t.description, t.icon, t.target_count, t.xp_reward, t.is_daily, t.sort_order);
  });

  // ===== 插入学习路径种子数据 =====
  const learningPaths = [
    {
      name: '新人入门之路',
      description: '从零开始掌握苏格拉底式提问的核心技巧，适合刚接触销售话术的新人。',
      icon: '🌱',
      difficulty: 'easy',
      estimated_minutes: 20,
      min_level: 0,
      scenario_ids: [1, 2, 3],  // 假设ID 1-3是基础场景
      tags: '入门,基础,新人',
      cover_color: '#52c41a',
      sort_order: 1,
    },
    {
      name: '异议处理进阶',
      description: '学习如何用苏格拉底式提问化解客户常见异议，提升转化率。',
      icon: '🛡️',
      difficulty: 'medium',
      estimated_minutes: 35,
      min_level: 3,
      scenario_ids: [4, 5, 6],
      tags: '异议处理,中级,实战',
      cover_color: '#1890ff',
      sort_order: 2,
    },
    {
      name: '成交高手特训',
      description: '高级场景训练，聚焦临门一脚的成交话术和谈判技巧。',
      icon: '🏆',
      difficulty: 'hard',
      estimated_minutes: 45,
      min_level: 5,
      scenario_ids: [7, 8, 9],
      tags: '成交,高级,谈判',
      cover_color: '#e94560',
      sort_order: 3,
    },
    {
      name: '全场景挑战营',
      description: '覆盖全部场景的综合训练，检验你的综合能力水平。',
      icon: '🔥',
      difficulty: 'master',
      estimated_minutes: 60,
      min_level: 8,
      scenario_ids: [10, 11, 12],
      tags: '全能,挑战,综合',
      cover_color: '#f5222d',
      sort_order: 4,
    },
  ];

  const insertPath = db.prepare(`
    INSERT OR IGNORE INTO learning_paths (name, description, icon, difficulty, estimated_minutes, min_level, scenario_ids, tags, cover_color, sort_order, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);

  learningPaths.forEach(p => {
    insertPath.run(
      p.name, p.description, p.icon, p.difficulty, p.estimated_minutes,
      p.min_level, JSON.stringify(p.scenario_ids), p.tags, p.cover_color, p.sort_order
    );
  });

  console.log('[004] AI销售学院数据库升级完成!');
};

exports.down = function() {
  // 回滚：删除新增的表（谨慎使用！）
  console.log('[004] 回滚AI销售学院升级...（未实现自动回滚）');
};
