/**
 * 苏格拉底式提问训练系统 - 小程序端 API
 * 
 * 路由前缀: /api/mp/socratic/
 * 功能:
 *   - 场景列表（按分类/难度/性格筛选）
 *   - 训练会话管理（创建/对话/结束/评分）
 *   - 历史记录
 *   - 5种提问类型实时识别与反馈
 */
const express = require('express');
const router = express.Router();
const { getDB } = require('../utils/db');
const { success, error } = require('../utils/response');
const {
  generateSocraticReply,
  detectQuestionTypeAI,
  generateSocraticEvaluation,
  generateSocraticOpening,
} = require('../services/deepseekService');

// JWT验证
function verifyUser(req, res, callback) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return error(res, '未登录', 401);
  const jwt = require('jsonwebtoken');
  const { JWT_SECRET } = require('../middleware/auth');
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch {
    return error(res, '登录已过期', 401);
  }
  return callback(decoded);
}

// ==================== 初始化表结构 ====================

function ensureTables() {
  const db = getDB();
  await db.exec(`
    CREATE TABLE IF NOT EXISTS socratic_scenarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'general',
      personality_type TEXT DEFAULT '',
      difficulty TEXT DEFAULT 'medium',
      description TEXT DEFAULT '',
      customer_background TEXT DEFAULT '',
      initial_situation TEXT DEFAULT '',
      goal TEXT DEFAULT '',
      tips TEXT DEFAULT '',
      status INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      usage_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS socratic_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scenario_id INTEGER,
      question_type TEXT NOT NULL,
      question_text TEXT NOT NULL,
      purpose TEXT DEFAULT '',
      hint TEXT DEFAULT '',
      example_answer TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      status INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS socratic_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      scenario_id INTEGER NOT NULL,
      personality_type TEXT DEFAULT '',
      status TEXT DEFAULT 'active',
      total_rounds INTEGER DEFAULT 0,
      question_score INTEGER DEFAULT 0,
      listening_score INTEGER DEFAULT 0,
      guiding_score INTEGER DEFAULT 0,
      timing_score INTEGER DEFAULT 0,
      depth_score INTEGER DEFAULT 0,
      overall_score INTEGER DEFAULT 0,
      grade TEXT DEFAULT '',
      feedback TEXT DEFAULT '',
      highlight_question TEXT DEFAULT '',
      duration INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ended_at DATETIME,
      FOREIGN KEY (scenario_id) REFERENCES socratic_scenarios(id)
    );
    CREATE TABLE IF NOT EXISTS socratic_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      round_num INTEGER DEFAULT 0,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      question_type TEXT DEFAULT '',
      score INTEGER,
      hint TEXT DEFAULT '',
      is_best_question INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES socratic_sessions(id)
    );
  `);
}

// ==================== 5种提问类型定义 ====================

const QUESTION_TYPES = {
  clarification: {
    name: '澄清式提问',
    icon: '🔍',
    color: '#1890ff',
    description: '确认理解、明确需求、聚焦问题',
    examples: ['您说的XX是指...？', '所以您的核心诉求是...？', '能具体说说吗？'],
    tips: '当客户表达模糊时使用，帮助双方达成共识'
  },
  hypothesis: {
    name: '假设式提问',
    icon: '💭',
    color: '#722ed1',
    description: '探索可能性、测试意愿、降低防御',
    examples: ['如果...您会...？', '假如有一个方法...？', '要是这样的话呢？'],
    tips: '用"假设"安全地探询客户的真实想法'
  },
  reverse: {
    name: '反向式提问',
    icon: '🔄',
    color: '#e94560',
    description: '挑战固有思维、引发思考、制造紧迫感',
    examples: ['很多人认为...但您觉得呢？', '有没有想过另一种可能？', '这样做真的有效吗？'],
    tips: '温和地打破客户的固有认知，但不要说教'
  },
  guiding: {
    name: '引导式提问',
    icon: '➡️',
    color: '#52c41a',
    description: '引导方向、推进话题、自然过渡',
    examples: ['那接下来您想了解...？', '除了这个还有...？', '您有没有关注过...？'],
    tips: '把控对话节奏，自然地引导到你想聊的话题'
  },
  summary: {
    name: '总结式提问',
    icon: '✅',
    color: '#faad14',
    description: '确认理解、展示倾听、推动决策',
    examples: ['所以我理解下来...对吗？', '刚才我们聊到的...是这个意思吗？', '也就是说...？'],
    tips: '每次聊完一个阶段后使用，避免误解并展示专业度'
  }
};

// ==================== 性格色彩反应模式 ====================

const PERSONALITY_RESPONSES = {
  red: {
    name: '红色性格',
    traits: ['热情', '爱分享', '感性决策', '注重社交认同'],
    response_style: '回应热情、喜欢被赞美、容易跑题、需要被引导回正题',
    reaction_patterns: {
      good: [
        '哇！你说得太对了！我就是这么想的！',
        '天哪你太懂我了！我之前怎么没遇到过这么专业的！',
        '真的吗？听起来很不错诶！快跟我说说！'
      ],
      neutral: [
        '嗯嗯，你说的是有道理的...',
        '这样啊...我回去想想吧。',
        '好的好的，了解了。'
      ],
      objection: [
        '但是别的家更便宜啊...',
        '我感觉差不多嘛，没什么特别的。',
        '我再考虑考虑吧，不着急。'
      ]
    }
  },
  blue: {
    name: '蓝色性格',
    traits: ['严谨', '理性分析', '注重数据', '需要证据'],
    response_style: '回应谨慎、会追问细节、做笔记、需要充分信息才做决定',
    reaction_patterns: {
      good: [
        '你这个说法有依据吗？有什么数据支持？',
        '成分方面你能详细解释一下作用机理吗？',
        '我想了解一下你们产品的临床测试结果。'
      ],
      neutral: [
        '我需要再对比一下。',
        '让我查一下资料。',
        '你的说法有一定道理。'
      ],
      objection: [
        '我看了一下成分表，和XX品牌基本一样，价格却贵了一倍。',
        '你们有没有做过双盲测试？没有的话我不能相信效果。',
        '我需要看到更多的第三方检测报告。'
      ]
    }
  },
  yellow: {
    name: '黄色性格',
    traits: ['直接', '目标明确', '效率优先', '看重性价比'],
    response_style: '回应简短、直奔主题、不耐烦废话、要确定答案',
    reaction_patterns: {
      good: [
        '直接告诉我，多少钱？多久见效？',
        '好，如果确实有效我就买。给我最划算的方案。',
        '不用多说，核心优势是什么？一分钟说完。'
      ],
      neutral: [
        '知道了。还有呢？',
        '行，了解了。',
        '可以，继续说。'
      ],
      objection: [
        '太贵了。便宜一半还差不多。',
        '别绕弯子，直接给底线价格。',
        '我没那么多时间，下次再说吧。'
      ]
    }
  },
  green: {
    name: '绿色性格',
    traits: ['温和', '怕冲突', '决策慢', '需要安全感'],
    response_style: '回应缓慢、不会直接拒绝、常用"考虑考虑"、需要被推动',
    reaction_patterns: {
      good: [
        '我觉得你说得挺有道理的...',
        '这样听起来好像还不错？',
        '那我试试看吧...你觉得哪个适合我？'
      ],
      neutral: [
        '嗯...好的，我了解一下。',
        '让我想想吧...',
        '不太确定呢...'
      ],
      objection: [
        '我怕用了过敏...之前有过一次...',
        '我再考虑考虑吧，不着急的。',
        '我得回家问问家里人/老公的意见。'
      ]
    }
  }
};

// ==================== 辅助函数：识别问题类型 ====================

function detectQuestionType(userMessage) {
  const msg = userMessage.trim();
  
  // 澄清式关键词
  const clarificationKeywords = ['是不是', '是...吗', '是指', '意思是', '具体说说', '哪些方面', '什么样的', '能详细', '换句话说', '所以您的'];
  
  // 假设式关键词
  const hypothesisKeywords = ['如果', '假如', '要是', '万一', '假设', '比如说', '可不可以', '能不能', '是否可以', '会不会'];
  
  // 反向式关键词
  const reverseKeywords = ['为什么', '怎么会', '真的吗', '您觉得呢', '有没有想过', '反过来想', '其实', '难道', '真的是', '这样真的'];
  
  // 引导式关键词
  const guidingKeywords = ['那接下来', '除此之外', '您有没有', '除了这个', '那关于', '怎么看', '想了解', '有没有考虑', '那您觉得'];
  
  // 总结式关键词
  const summaryKeywords = ['所以我', '也就是说', '总而言之', '这么说来', '刚才我们聊到', '总结一下', '理解下来', '确认一下', '对吗'];

  // 按权重打分
  const scores = {
    clarification: 0,
    hypothesis: 0,
    reverse: 0,
    guiding: 0,
    summary: 0
  };

  for (const kw of clarificationKeywords) {
    if (msg.includes(kw)) scores.clarification += 3;
  }
  for (const kw of hypothesisKeywords) {
    if (msg.includes(kw)) scores.hypothesis += 3;
  }
  for (const kw of reverseKeywords) {
    if (msg.includes(kw)) scores.reverse += 2;
  }
  for (const kw of guidingKeywords) {
    if (msg.includes(kw)) scores.guiding += 2;
  }
  for (const kw of summaryKeywords) {
    if (msg.includes(kw)) scores.summary += 4;
  }

  // 问号加分（所有提问都以问号结尾）
  if (msg.includes('？') || msg.includes('?')) {
    scores.clarification += 1;
    scores.hypothesis += 1;
  }

  // 找最高分的类型
  let maxType = 'clarification';
  let maxScore = 0;
  for (const [type, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      maxType = type;
    }
  }

  // 如果分数太低（可能不是提问），默认为引导式
  if (maxScore < 1 && !msg.includes('？') && !msg.includes('?')) {
    maxType = 'guiding'; // 陈述性回复归类为引导
  }

  return maxType;
}

// ==================== 辅助函数：生成AI客户回复 ====================

function generateCustomerResponse(sessionInfo, roundNum, userMessage, questionType) {
  const personality = sessionInfo.personality_type || '';
  const profile = PERSONALITY_RESPONSES[personality] || PERSONALITY_RESPONSES.red;
  const patterns = profile.reaction_patterns;

  let responseType = 'neutral';
  const qType = QUESTION_TYPES[questionType];
  
  // 根据提问质量决定反应类型
  // 高质量提问（澄清、总结）更容易得到积极反应
  if (['clarification', 'summary'].includes(questionType)) {
    responseType = Math.random() > 0.25 ? 'good' : 'neutral';
  } else if (questionType === 'reverse') {
    responseType = Math.random() > 0.5 ? 'good' : (Math.random() > 0.5 ? 'neutral' : 'objection');
  } else if (['hypothesis', 'guiding'].includes(questionType)) {
    responseType = Math.random() > 0.35 ? 'good' : 'neutral';
  }

  // 随着轮次增加，增加积极反应概率（模拟客户越来越信任）
  if (roundNum >= 4 && responseType === 'neutral') {
    responseType = Math.random() > 0.5 ? 'good' : 'neutral';
  }

  const responses = patterns[responseType];
  let content = responses[Math.floor(Math.random() * responses.length)];

  // 根据轮次添加一些上下文相关的内容
  if (roundNum === 1) {
    // 第一轮根据场景给出初始回应
    if (personality === 'red') {
      content = '你好呀！我是在朋友圈看到你们的产品的~感觉还不错就想来了解一下！';
    } else if (personality === 'blue') {
      content = '你好。我之前做了些功课，想了解一下你们产品的具体成分和功效原理。';
    } else if (personality === 'yellow') {
      content = '你好。直接告诉我，你们产品多少钱？多久见效？我比较忙。';
    } else if (personality === 'green') {
      content = '你好呀~我是朋友介绍来的，不过我也不太懂这些...你们这里人多吗？';
    } else {
      content = responses[Math.floor(Math.random() * responses.length)];
    }
  } else if (roundNum === 2) {
    if (responseType === 'good') {
      content += ' 对了，我最近确实在为皮肤的事情烦恼...';
    }
  } else if (roundNum >= 5 && responseType === 'good') {
    if (Math.random() > 0.6) {
      const buySignals = [
        '那你帮我推荐一下吧，我觉得你还挺专业的。',
        '听起来不错诶！那价格是多少？有没有活动？',
        '行，我相信你。你说哪个好我就用哪个！',
        '感觉你比之前遇到的那些销售专业多了~'
      ];
      content = buySignals[Math.floor(Math.random() * buySignals.length)];
    }
  }

  // 根据问题类型生成提示
  let hint = '';
  if (responseType === 'objection') {
    hint = `客户提出了异议！建议用${QUESTION_TYPES.clarification.name}或${QUESTION_TYPES.hypothesis.name}来化解。`;
  } else if (responseType === 'good') {
    hint = `很好！客户反应积极。可以用${QUESTION_TYPES.guiding.name}深入推进话题，或用${QUESTION_TYPES.summary.name}确认需求。`;
  } else if (responseType === 'neutral') {
    hint = `客户还在观望。尝试用${QUESTION_TYPES.clarification.name}挖掘深层需求，或用${QUESTION_TYPES.hypothesis.name}测试购买意愿。`;
  }

  return {
    content,
    responseType,
    hint,
    questionTypeDetected: questionType,
    questionTypeInfo: qType
  };
}

// ==================== 辅助函数：计算评分 ====================

function calculateSessionScore(sessionId) {
  const db = getDB();
  
  const messages = db.prepare(`
    SELECT * FROM socratic_messages WHERE session_id = ? ORDER BY round_num ASC
  `).all(sessionId);

  if (messages.length < 2) return null;

  const userMessages = messages.filter(m => m.role === 'user');
  if (userMessages.length === 0) return null;

  // 1. 提问技巧分 - 基于问题类型多样性
  const typeCounts = {};
  userMessages.forEach(m => {
    typeCounts[m.question_type] = (typeCounts[m.question_type] || 0) + 1;
  });
  const typeDiversity = Object.keys(typeCounts).length; // 使用了几种提问类型
  const questionScore = Math.min(100, typeDiversity * 18 + (userMessages.length >= 5 ? 10 : 0));

  // 2. 倾听理解分 - 基于是否使用了澄清和总结式
  const listeningCount = (typeCounts['clarification'] || 0) + (typeCounts['summary'] || 0);
  const listeningScore = Math.min(100, listeningCount * 20);

  // 3. 引导能力分 - 基于引导式和假设式的使用
  const guidingCount = (typeCounts['guiding'] || 0) + (typeCounts['hypothesis'] || 0);
  const guidingScore = Math.min(100, guidingCount * 18);

  // 4. 时机把握分 - 基于反向提问的使用时机（不应过早使用）
  const reverseMessages = userMessages.filter(m => m.question_type === 'reverse');
  const earlyReverse = reverseMessages.some(m => m.round_num <= 2); // 前2轮用反向扣分
  const timingScore = Math.min(100, 
    (reverseMessages.length > 0 ? 50 : 30) +
    (earlyReverse ? -15 : 15) +
    (typeCounts['summary'] && userMessages.length >= 4 ? 40 : 20)
  );

  // 5. 深度挖掘分 - 基于对话轮数和质量
  const depthScore = Math.min(100, 
    userMessages.length * 12 +
    ((typeCounts['clarification'] || 0) >= 2 ? 15 : 0) +
    ((typeCounts['hypothesis'] || 0) >= 2 ? 13 : 0)
  );

  // 综合评分（加权平均）
  const overallScore = Math.round(
    questionScore * 0.2 +
    listeningScore * 0.2 +
    guidingScore * 0.2 +
    timingScore * 0.15 +
    depthScore * 0.25
  );

  // 等级评定
  let grade = 'C';
  if (overallScore >= 90) grade = 'S';
  else if (overallScore >= 80) grade = 'A';
  else if (overallScore >= 65) grade = 'B';
  else if (overallScore >= 50) grade = 'C';
  else grade = 'D';

  // 最佳提问
  const bestMsg = userMessages.reduce((best, m) => {
    const isReverseOK = m.question_type !== 'reverse' || m.round_num > 2;
    const hasGoodType = ['clarification', 'summary'].includes(m.question_type);
    const bestScore = (isReverseOK ? 60 : 30) + (hasGoodType ? 30 : 10) + (m.content.length > 10 ? 10 : 0);
    return (!best || bestScore > best._score) ? { ...m, _score: bestScore } : best;
  }, null);

  // 生成反馈评语
  const feedbackParts = [];
  
  if (typeDiversity >= 4) {
    feedbackParts.push(`提问非常多样化！您使用了${typeDiversity}种不同类型的提问技巧，展现了出色的沟通灵活性。`);
  } else if (typeDiversity >= 2) {
    feedbackParts.push('提问类型较为丰富，可以进一步练习反向式和假设式提问来增强说服力。');
  } else {
    feedbackParts.push('提问类型偏单一，建议多尝试澄清式和总结式提问来建立更好的沟通基础。');
  }

  if (listeningCount >= 3) {
    feedbackParts.push('倾听和理解做得很好，多次使用澄清和总结让客户感受到被尊重和理解。');
  }

  if (earlyReverse && reverseMessages.length > 0) {
    feedbackParts.push('注意：反向式提问不宜在对话初期使用，可能会引起客户防御。建议先建立信任再挑战其思维。');
  }

  if (userMessages.length >= 6) {
    feedbackParts.push('对话深度不错，能够持续深入地挖掘客户需求。');
  } else if (userMessages.length <= 3) {
    feedbackParts.push('对话偏短，建议在促成前多问几个问题以确保真正了解客户需求。');
  }

  // 核心建议
  const weakDims = [];
  if (questionScore < 70) weakDims.push('提问多样性');
  if (listeningScore < 70) weakDims.push('倾听确认');
  if (timingScore < 65) weakDims.push('时机把握');
  if (depthScore < 65) weakDims.push('深度挖掘');
  if (weakDims.length > 0) {
    feedbackParts.push(`下一步提升重点：${weakDims.join('、')}。`);
  }

  const scores = {
    question: questionScore,
    listening: listeningScore,
    guiding: guidingScore,
    timing: timingScore,
    depth: depthScore,
    overall: overallScore
  };

  return {
    scores,
    grade,
    feedback: feedbackParts.join('\n'),
    highlight_question: bestMsg?.content || '',
    stats: {
      total_rounds: userMessages.length,
      type_distribution: typeCounts,
      type_diversity: typeDiversity
    }
  };
}

// ==================== API路由 ====================

/**
 * GET /api/mp/socratic/question-types
 * 获取5种提问类型的说明
 */
router.get('/question-types', async (req, res) => {
  return success(res, {
    types: QUESTION_TYPES,
    tip: '苏格拉底式提问的核心：不是告诉客户答案，而是通过提问让她自己找到答案！'
  });
});

/**
 * GET /api/mp/socratic/scenarios
 * 获取训练场景列表
 */
router.get('/scenarios', async (req, res) => {
  verifyUser(req, res, (decoded) => {
    ensureTables();
    const db = getDB();
    const { category, difficulty, personality_type } = req.query;

    let where = ['status = 1'];
    let params = [];
    
    if (category) { where.push('category = ?'); params.push(category); }
    if (difficulty) { where.push('difficulty = ?'); params.push(difficulty); }
    if (personality_type) { where.push("personality_type = '' OR personality_type = ?"); params.push(personality_type); }

    const scenarios = db.prepare(`
      SELECT id, name, category, personality_type, difficulty, description, goal, tips, usage_count
      FROM socratic_scenarios WHERE ${where.join(' AND ')}
      ORDER BY sort_order ASC, id ASC
    `).all(...params);

    // 添加该用户在每个场景下的最佳成绩
    const scenariosWithStats = scenarios.map(s => {
      const best = db.prepare(`
        SELECT overall_score, grade FROM socratic_sessions 
        WHERE user_id = ? AND scenario_id = ? AND status = 'completed'
        ORDER BY overall_score DESC LIMIT 1
      `).get(decoded.id, s.id);
      
      return { ...s, best_score: best?.overall_score || null, best_grade: best?.grade || null };
    });

    // 分类统计
    const categories = [
      { key: 'icebreaking', name: '破冰建立信任', icon: '🤝', count: 0 },
      { key: 'discovery', name: '需求深度挖掘', icon: '🔎', count: 0 },
      { key: 'objection', name: '异议处理转化', icon: '💪', count: 0 },
      { key: 'closing', name: '成交促成', icon: '✨', count: 0 },
      { key: 'referral', name: '转介绍裂变', icon: '🎁', count: 0 }
    ];
    
    categories.forEach(c => {
      c.count = scenarios.filter(s => s.category === c.key).length;
    });

    return success(res, { list: scenariosWithStats, categories, types: QUESTION_TYPES });
  });
});

/**
 * GET /api/mp/socratic/scenarios/:id
 * 获取场景详情（含标准问题列表）
 */
router.get('/scenarios/:id', async (req, res) => {
  verifyUser(req, res, (decoded) => {
    ensureTables();
    const db = getDB();
    const scenario = await db.prepare('SELECT * FROM socratic_scenarios WHERE id = ?').get(req.params.id);
    if (!scenario) return error(res, '场景不存在', 404);

    const questions = db.prepare(`
      SELECT * FROM socratic_questions WHERE scenario_id = ? AND status = 1 ORDER BY sort_order ASC
    `).all(req.params.id);

    // 按问题类型分组
    const questionsByType = {};
    questions.forEach(q => {
      if (!questionsByType[q.question_type]) {
        questionsByType[q.question_type] = [];
      }
      questionsByType[q.question_type].push({
        ...q,
        type_info: QUESTION_TYPES[q.question_type] || null
      });
    });

    return success(res, {
      scenario,
      questions: questionsByType,
      question_types: QUESTION_TYPES
    });
  });
});

/**
 * POST /api/mp/socratic/sessions
 * 创建新的训练会话
 */
router.post('/sessions', async (req, res) => {
  verifyUser(req, res, (decoded) => {
    ensureTables();
    const db = getDB();
    const { scenario_id, personality_type } = req.body;

    const scenario = await db.prepare('SELECT * FROM socratic_scenarios WHERE id = ? AND status = 1').get(scenario_id);
    if (!scenario) return error(res, '场景不存在', 404);

    // 更新使用次数
    await db.prepare('UPDATE socratic_scenarios SET usage_count = usage_count + 1 WHERE id = ?').run(scenario_id);

    // 创建会话
    const result = db.prepare(`
      INSERT INTO socratic_sessions (user_id, scenario_id, personality_type, status)
      VALUES (?, ?, ?, 'active')
    `).run(decoded.id, scenario_id, personality_type || scenario.personality_type || '');

    const sessionId = result.lastInsertRowid;

    // 生成开场白（优先用AI，失败时降级到硬编码）
    const personality = personality_type || scenario.personality_type || '';
    
    let openingContent = '';
    const profile = PERSONALITY_RESPONSES[personality] || PERSONALITY_RESPONSES.red;
    
    // 尝试用AI生成开场白（异步，但不阻塞）
    generateSocraticOpening(personality, scenario).then(aiOpening => {
      if (aiOpening) openingContent = aiOpening;
      // 更新数据库中的开场白
      await db.prepare('UPDATE socratic_messages SET content = ? WHERE id = (SELECT id FROM socratic_messages WHERE session_id = ? AND round_num = 0)').run(openingContent, sessionId);
    }).catch(err => {
      console.warn('AI开场白生成失败，使用硬编码:', err.message);
    });

    // 立即返回硬编码开场白（AI生成后会异步更新）
    if (personality === 'red') {
      openingContent = '你好呀！我听朋友说你们这边不错，就过来啦~你是？';
    } else if (personality === 'blue') {
      openingContent = '你好。我做了一些功课想来了解一下具体情况。';
    } else if (personality === 'yellow') {
      openingContent = '你好。直接说吧，你们产品怎么样？多少钱？我时间不多。';
    } else if (personality === 'green') {
      openingContent = '你好呀...我是朋友介绍来的，我也不太懂这些...';
    } else {
      openingContent = scenario.initial_situation || '你好，我想了解一下你们的产品。';
    }

    // 保存AI消息（开场白）
    db.prepare(`
      INSERT INTO socratic_messages (session_id, round_num, role, content, hint)
      VALUES (?, 0, 'ai', ?, ?)
    `).run(sessionId, openingContent, 
      `这是${profile.name}客户。${profile.response_style}\n\n${scenario.tips || ''}`);

    return success(res, {
      session_id: sessionId,
      scenario: {
        id: scenario.id,
        name: scenario.name,
        category: scenario.category,
        difficulty: scenario.difficulty,
        customer_background: scenario.customer_background,
        initial_situation: scenario.initial_situation,
        goal: scenario.goal,
        tips: scenario.tips
      },
      personality_type: personality,
      first_message: {
        content: openingContent,
        hint: `${profile.name}客户特征：${profile.traits.join('、')}\n\n${scenario.tips || ''}`
      },
      question_types: QUESTION_TYPES,
      aiPowered: true  // 标识此会话使用AI驱动
    }, '会话已创建（AI增强版）');
  });
});

/**
 * POST /api/mp/socratic/sessions/:id/message
 * 发送消息（代理商提问 → AI客户回复）
 */
router.post('/sessions/:id/message', async (req, res) => {
  verifyUser(req, res, async (decoded) => {
    ensureTables();
    const db = getDB();
    const { content } = req.body;
    const sessionId = parseInt(req.params.id);

    if (!content || !content.trim()) return error(res, '消息不能为空');

    const session = db.prepare("SELECT * FROM socratic_sessions WHERE id = ? AND user_id = ? AND status = 'active'")
      .get(sessionId, decoded.id);
    if (!session) return error(res, '会话不存在或已结束', 404);

    // 保存用户消息
    const currentRound = session.total_rounds + 1;

    db.prepare(`
      INSERT INTO socratic_messages (session_id, round_num, role, content, question_type)
      VALUES (?, ?, 'user', ?, ?)
    `).run(sessionId, currentRound, content, 'pending'); // 暂时标记为pending，后面AI识别后更新

    // 更新轮次
    await db.prepare('UPDATE socratic_sessions SET total_rounds = ? WHERE id = ?').run(currentRound, sessionId);

    // 获取对话历史（用于AI上下文）
    const history = db.prepare(`
      SELECT role, content FROM socratic_messages 
      WHERE session_id = ? ORDER BY round_num ASC
    `).all(sessionId);

    // 获取场景信息
    const scenarioInfo = await db.prepare('SELECT * FROM socratic_scenarios WHERE id = ?').get(session.scenario_id);

    // ========== AI增强：优先调用DeepSeek ==========
    let aiContent, questionTypeInfo, responseType, hint;

    try {
      const aiResult = await generateSocraticReply(
        session.personality_type || '',
        scenarioInfo,
        history,
        content
      );

      if (aiResult) {
        aiContent = aiResult.reply;
        questionTypeInfo = aiResult.questionType;
        
        // 根据问题类型生成提示
        const qt = questionTypeInfo.type;
        if (qt === 'reverse' && currentRound <= 2) {
          hint = `⚠️ 反向式提问在对话初期可能引起客户防御。建议先建立信任再挑战其思维。`;
        } else if (qt === 'clarification' || qt === 'summary') {
          hint = `✅ ${questionTypeInfo.name}运用得当！这让客户感到被理解。`;
        } else if (qt === 'hypothesis') {
          hint = `💡 假设式提问能有效测试客户购买意愿。`;
        } else {
          hint = null;
        }

        responseType = 'ai'; // 标记为AI生成
        
        // 更新用户消息的问题类型（AI识别结果）
        db.prepare('UPDATE socratic_messages SET question_type = ? WHERE session_id = ? AND round_num = ?')
          .run(qt, sessionId, currentRound);
      } else {
        throw new Error('AI返回空结果');
      }
    } catch (err) {
      console.warn('DeepSeek苏格拉底回复失败，降级到规则引擎:', err.message);
      // ====== 降级到规则引擎 ======
      const fallbackType = detectQuestionType(content);
      const fallbackResponse = generateCustomerResponse(session, currentRound, content, fallbackType);
      
      aiContent = fallbackResponse.content;
      questionTypeInfo = QUESTION_TYPES[fallbackType];
      responseType = fallbackResponse.responseType;
      hint = fallbackResponse.hint;

      // 更新用户消息的问题类型
      db.prepare('UPDATE socratic_messages SET question_type = ? WHERE session_id = ? AND round_num = ?')
        .run(fallbackType, sessionId, currentRound);
    }

    // 保存AI回复
    db.prepare(`
      INSERT INTO socratic_messages (session_id, round_num, role, content, question_type, hint)
      VALUES (?, ?, 'ai', ?, ?, ?)
    `).run(sessionId, currentRound, aiContent, questionTypeInfo.type || 'ai_response', hint);

    return success(res, {
      message: {
        content: aiContent,
        hint: hint,
        response_type: responseType
      },
      round: currentRound,
      detected_type: questionTypeInfo.type,
      type_info: questionTypeInfo,
      can_end: currentRound >= 3,
      ai_powered: responseType === 'ai'  // 告诉前端这次回复是AI生成的
    });
  });
});

/**
 * POST /api/mp/socratic/sessions/:id/end
 * 结束训练会话并获取评分
 */
router.post('/sessions/:id/end', async (req, res) => {
  console.log('[苏格拉底End] ===== 收到结束评分请求 =====');
  const t0 = Date.now();
  
  verifyUser(req, res, async (decoded) => {
    console.log(`[苏格拉底End] step1 用户验证通过, userId=${decoded.id}`);
    ensureTables();
    const db = getDB();
    const sessionId = parseInt(req.params.id);
    console.log(`[苏格拉底End] step2 查询会话, sessionId=${sessionId}`);

    const session = db.prepare("SELECT * FROM socratic_sessions WHERE id = ? AND user_id = ? AND status = 'active'")
      .get(sessionId, decoded.id);
    if (!session) {
      console.warn(`[苏格拉底End] 会话不存在! id=${sessionId} userId=${decoded.id}`);
      return error(res, '会话不存在或已结束', 404);
    }
    console.log(`[苏格拉底End] step3 会话找到, total_rounds=${session.total_rounds}`);

    // AI评分

    // 获取完整对话历史
    const messages = db.prepare(`
      SELECT * FROM socratic_messages WHERE session_id = ? ORDER BY round_num ASC, id ASC
    `).all(sessionId);
    console.log(`[苏格拉底End] step4 对话消息数: ${messages.length}`);

    // 获取场景信息
    const scenarioInfo = await db.prepare('SELECT * FROM socratic_scenarios WHERE id = ?').get(session.scenario_id);

    // ========== AI增强评分 ==========
    let evaluation;
    
    try {
      const now = new Date().toISOString();
      const startTime = new Date(session.created_at).getTime();
      const duration = Math.round((Date.now() - startTime) / 1000);

      console.log(`[苏格拉底End] step5 开始调用AI评分...`);
      
      evaluation = await generateSocraticEvaluation(
        session.personality_type || '',
        session.personality_type === 'red' ? '红色-热情型' :
        session.personality_type === 'yellow' ? '黄色-目标型' :
        session.personality_type === 'blue' ? '蓝色-分析型' : '绿色-温和型',
        messages,
        duration,
        scenarioInfo
      );

      if (!evaluation) throw new Error('AI评估返回空结果');
      
      evaluation.duration = duration;
      console.log(`[苏格拉底End] step6 AI评分完成! grade=${evaluation.grade} overall=${evaluation.scores?.overall}`);
    } catch (err) {
      console.warn('[苏格拉底End] ⚠️ DeepSeek评分失败，降级到规则引擎:', err.message);
      // 降级到规则评分
      evaluation = calculateSessionScore(sessionId);
      if (!evaluation) return error(res, '对话记录不足，无法评分');
    }

    const now = new Date().toISOString();

    db.prepare(`
      UPDATE socratic_sessions SET
        status = 'completed',
        question_score = ?,
        listening_score = ?,
        guiding_score = ?,
        timing_score = ?,
        depth_score = ?,
        overall_score = ?,
        grade = ?,
        feedback = ?,
        highlight_question = ?,
        duration = ?,
        ended_at = ?
      WHERE id = ?
    `).run(
      evaluation.scores.question, evaluation.scores.listening,
      evaluation.scores.guiding, evaluation.scores.timing,
      evaluation.scores.depth, evaluation.scores.overall,
      evaluation.grade, JSON.stringify(evaluation.feedback),
      evaluation.highlight_question, evaluation.duration, now, sessionId
    );

    // 确定成交结果
    const lastAiMsg = [...messages].reverse().find(m => m.role === 'ai');
    const dealResult = lastAiMsg && (
      lastAiMsg.content.includes('推荐') || lastAiMsg.content.includes('买') ||
      lastAiMsg.content.includes('可以') || lastAiMsg.content.includes('好')
    ) ? '成交' :
      lastAiMsg && (lastAiMsg.content.includes('考虑') || lastAiMsg.content.includes('想想'))
        ? '有兴趣但未成交' : '需继续跟进';

    // ========== AI销售学院增强：经验值 + 成就 + 快照 + 每日任务 ==========
    
    // 1. 计算本次获得的经验值（基于分数）
    const baseXp = Math.round(evaluation.scores.overall * 1.5);
    const gradeBonus = evaluation.grade === 'S' ? 50 : evaluation.grade === 'A' ? 30 : evaluation.grade === 'B' ? 15 : 0;
    const totalXpEarned = baseXp + gradeBonus;

    // 2. 添加经验值
    const xpResult = academyService.addXp(decoded.id, totalXpEarned, 'training', sessionId,
      `完成${scenarioInfo.name}训练 - ${evaluation.grade}级`);

    // 3. 创建训练快照（用于历史对比趋势图）
    academyService.createSessionSnapshot(decoded.id, sessionId, {
      date: now,
      scores: {
        questioning_score: evaluation.scores.question,
        listening_score: evaluation.scores.listening,
        guiding_score: evaluation.scores.guiding,
        timing_score: evaluation.scores.timing,
        depth_score: evaluation.scores.depth,
      },
      grade: evaluation.grade,
      overallScore: evaluation.scores.overall,
      category: scenarioInfo.category,
      personality: session.personality_type,
      duration: evaluation.duration,
    });

    // 4. 更新每日任务进度（每日一练）
    academyService.updateDailyTaskProgress(decoded.id, 'daily_train_once');

    // 如果分数>=80，触发"追求卓越"任务
    if (evaluation.scores.overall >= 80) {
      academyService.updateDailyTaskProgress(decoded.id, 'daily_high_score');
    }

    // 5. 统计用户的总数据用于成就检测
    const totalSessionsCount = db.prepare(
      "SELECT COUNT(*) as c FROM socratic_sessions WHERE user_id = ? AND status = 'completed'"
    ).get(decoded.id).c;

    const uniqueCategories = db.prepare(`
      SELECT DISTINCT sc.category FROM socratic_sessions s
      JOIN socratic_scenarios sc ON s.scenario_id = sc.id
      WHERE s.user_id = ? AND s.status = 'completed'
    `).all(decoded.id).map(r => r.category);

    const uniquePersonalities = db.prepare(`
      SELECT DISTINCT personality_type FROM socratic_sessions
      WHERE user_id = ? AND status = 'completed' AND personality_type != ''
    `).all(decoded.id).map(r => r.personality_type);

    const uniqueQuestionTypes = new Set();
    messages.filter(m => m.role === 'user').forEach(m => {
      if (m.question_type && m.question_type !== 'pending') uniqueQuestionTypes.add(m.question_type);
    });

    const streak = academyService.calculateStreak(decoded.id);

    // 6. 检测并解锁成就
    let newlyUnlockedAchievements = [];
    try {
      newlyUnlockedAchievements = await academyService.checkAndUnlockAchievements(decoded.id, {
        total_sessions: totalSessionsCount,
        overall_score: evaluation.scores.overall,
        questioning_score: evaluation.scores.question,
        listening_score: evaluation.scores.listening,
        guiding_score: evaluation.scores.guiding,
        timing_score: evaluation.scores.timing,
        depth_score: evaluation.scores.depth,
        daily_streak: streak,
        unique_categories: uniqueCategories,
        unique_question_types: Array.from(uniqueQuestionTypes),
        unique_personalities: uniquePersonalities,
        session_id: sessionId,
      });
    } catch(e) {
      console.warn('[苏格拉底End] 成就检测异常:', e.message);
    }

    // 7. 更新学习路径进度
    try {
      academyService.updatePathProgress(decoded.id, session.scenario_id, {
        grade: evaluation.grade,
        score: evaluation.scores.overall,
        date: now,
      });
    } catch(e) {
      console.warn('[苏格拉底End] 学习路径进度更新异常:', e.message);
    }

    return success(res, {
      session_id: sessionId,
      result: dealResult,
      grade: evaluation.grade,
      scores: evaluation.scores,
      feedback: evaluation.feedback,
      highlight_question: evaluation.highlight_question,
      stats: evaluation.stats || { total_rounds: messages.filter(m => m.role === 'user').length },
      duration: evaluation.duration,
      ai_rated: true,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
        question_type: m.question_type,
        hint: m.hint
      })),
      completed_at: now,

      // ====== AI学院新增数据 ======
      xp_earned: totalXpEarned,
      xp_info: xpResult,
      level_up: xpResult?.leveledUp || false,
      new_level: xpResult?.leveledUp ? xpResult.newLevel : null,
      new_title: xpResult?.leveledUp ? 
        (academyService.LEVEL_THRESHOLDS.find(l => l.level === xpResult.newLevel)?.title || '') : null,
      achievements_unlocked: newlyUnlockedAchievements.map(a => ({
        id: a.id,
        key: a.key,
        name: a.name,
        icon: a.icon,
        rarity: a.rarity,
        description: a.description,
        badge_color: a.badge_color,
        xp_reward: a.xp_reward,
      })),
    });
    
    console.log(`[苏格拉底End] step7 评分完成! 总耗时=${Date.now()-t0}ms`);
  });
});

/**
 * GET /api/mp/socratic/history
 * 获取训练历史记录
 */
router.get('/history', async (req, res) => {
  verifyUser(req, res, (decoded) => {
    ensureTables();
    const db = getDB();
    const { page = 1, pageSize = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    const total = db.prepare(`
      SELECT COUNT(*) as cnt FROM socratic_sessions WHERE user_id = ? AND status = 'completed'
    `).get(decoded.id).cnt;

    const sessions = db.prepare(`
      SELECT s.*, sc.name as scenario_name, sc.category, sc.difficulty, sc.personality_type as scenario_personality
      FROM socratic_sessions s
      LEFT JOIN socratic_scenarios sc ON s.scenario_id = sc.id
      WHERE s.user_id = ? AND s.status = 'completed'
      ORDER BY s.created_at DESC LIMIT ? OFFSET ?
    `).all(decoded.id, parseInt(pageSize), offset);

    // 统计概览
    const overview = db.prepare(`
      SELECT 
        COUNT(*) as total_sessions,
        COALESCE(AVG(overall_score), 0) as avg_score,
        SUM(CASE WHEN grade = 'S' OR grade = 'A' THEN 1 ELSE 0 END) as excellent_count,
        SUM(CASE WHEN grade IN ('S','A','B') THEN 1 ELSE 0 END) as pass_count
      FROM socratic_sessions WHERE user_id = ? AND status = 'completed'
    `).get(decoded.id);

    return success(res, {
      list: sessions,
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      overview: {
        totalSessions: overview.total_sessions,
        avgScore: Math.round(overview.avg_score || 0),
        excellentCount: overview.excellent_count,
        passCount: overview.pass_count
      }
    });
  });
});

/**
 * GET /api/mp/socratic/history/:id
 * 获取单次训练详情
 */
router.get('/history/:id', async (req, res) => {
  verifyUser(req, res, (decoded) => {
    ensureTables();
    const db = getDB();

    const session = db.prepare(`
      SELECT s.*, sc.name as scenario_name, sc.description, sc.customer_background, 
             sc.initial_situation, sc.goal, sc.tips, sc.category
      FROM socratic_sessions s
      LEFT JOIN socratic_scenarios sc ON s.scenario_id = sc.id
      WHERE s.id = ? AND s.user_id = ?
    `).get(req.params.id, decoded.id);

    if (!session) return error(res, '记录不存在', 404);

    const messages = db.prepare(`
      SELECT * FROM socratic_messages WHERE session_id = ? ORDER BY round_num ASC, id ASC
    `).all(req.params.id);

    return success(res, { session, messages, question_types: QUESTION_TYPES });
  });
});

/**
 * GET /api/mp/socratic/overview
 * 获取训练总览数据（仪表盘）
 */
router.get('/overview', async (req, res) => {
  verifyUser(req, res, (decoded) => {
    ensureTables();
    const db = getDB();

    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_sessions,
        COALESCE(AVG(overall_score), 0) as avg_score,
        MAX(overall_score) as best_score,
        SUM(CASE WHEN grade = 'S' THEN 1 ELSE 0 END) as s_count,
        SUM(CASE WHEN grade = 'A' THEN 1 ELSE 0 END) as a_count,
        SUM(CASE WHEN grade = 'B' THEN 1 ELSE 0 END) as b_count,
        SUM(CASE WHEN created_at >= date('now','-7 days') THEN 1 ELSE 0 END) as week_count,
        COALESCE(SUM(duration), 0) as total_duration
      FROM socratic_sessions 
      WHERE user_id = ? AND status = 'completed'
    `).get(decoded.id);

    // 最近7天趋势
    const weekTrend = db.prepare(`
      SELECT DATE(created_at) as date, AVG(overall_score) as avg_score, COUNT(*) as count
      FROM socratic_sessions
      WHERE user_id = ? AND status = 'completed' AND created_at >= date('now','-7 days')
      GROUP BY DATE(created_at) ORDER BY date ASC
    `).all(decoded.id);

    // 各类别最高分
    const categoryBest = db.prepare(`
      SELECT sc.category, MAX(s.overall_score) as best_score, sc.name as best_scenario_name
      FROM socratic_sessions s
      JOIN socratic_scenarios sc ON s.scenario_id = sc.id
      WHERE s.user_id = ? AND s.status = 'completed'
      GROUP BY sc.category
    `).all(decoded.id);

    // 提问类型使用分布（最近10次）
    const typeDistribution = { clarification: 0, hypothesis: 0, reverse: 0, guiding: 0, summary: 0 };
    const recentSessions = db.prepare(`
      SELECT id FROM socratic_sessions 
      WHERE user_id = ? AND status = 'completed' 
      ORDER BY created_at DESC LIMIT 10
    `).all(decoded.id).map(s => s.id);

    if (recentSessions.length > 0) {
      const placeholders = recentSessions.map(() => '?').join(',');
      const typeCounts = db.prepare(`
        SELECT question_type, COUNT(*) as cnt FROM socratic_messages
        WHERE session_id IN (${placeholders}) AND role = 'user'
        GROUP BY question_type
      `).all(...recentSessions);
      
      typeCounts.forEach(tc => {
        if (typeDistribution[tc.question_type] !== undefined) {
          typeDistribution[tc.question_type] = tc.cnt;
        }
      });
    }

    return success(res, {
      totalSessions: stats.total_sessions || 0,
      avgScore: Math.round(stats.avg_score || 0),
      bestScore: stats.best_score || 0,
      gradeDistribution: {
        S: stats.s_count || 0,
        A: stats.a_count || 0,
        B: stats.b_count || 0
      },
      weekCount: stats.week_count || 0,
      totalDuration: stats.total_duration || 0,
      weekTrend,
      categoryBest,
      typeDistribution
    });
  });
});

// ==========================================
// AI销售学院增强功能（004升级）
// ==========================================

const academyService = require('../services/socraticAcademyService');

/**
 * GET /api/mp/socratic/academy/dashboard
 * 🆕 AI销售学院仪表盘（首页数据）
 */
router.get('/academy/dashboard', async (req, res) => {
  verifyUser(req, res, (decoded) => {
    const overview = academyService.getDashboardOverview(decoded.id);
    return success(res, overview);
  });
});

/**
 * GET /api/mp/socratic/academy/level-info
 * 🆕 获取用户等级和经验值信息
 */
router.get('/academy/level-info', async (req, res) => {
  verifyUser(req, res, (decoded) => {
    const levelInfo = academyService.getUserLevelInfo(decoded.id);
    return success(res, {
      ...levelInfo,
      levelConfig: academyService.LEVEL_THRESHOLDS,
    });
  });
});

/**
 * GET /api/mp/socratic/academy/achievements
 * 🆕 获取成就列表（含解锁状态和进度）
 */
router.get('/academy/achievements', async (req, res) => {
  verifyUser(req, res, (decoded) => {
    const achievements = academyService.getUserAchievements(decoded.id);
    // 按类别分组
    const grouped = {};
    achievements.forEach(a => {
      if (!grouped[a.category]) grouped[a.category] = [];
      grouped[a.category].push(a);
    });
    
    // 统计
    const unlocked = achievements.filter(a => a.unlocked).length;
    
    return success(res, { 
      list: achievements, 
      grouped,
      stats: { total: achievements.length, unlocked, progress: achievements.length > 0 ? Math.round((unlocked / achievements.length) * 100) : 0 }
    });
  });
});

/**
 * GET /api/mp/socratic/academy/paths
 * 🆕 获取学习路径列表及用户进度
 */
router.get('/academy/paths', async (req, res) => {
  verifyUser(req, res, (decoded) => {
    const paths = academyService.getUserPathProgress(decoded.id);
    return success(res, { list: paths });
  });
});

/**
 * POST /api/mp/socratic/academy/paths/:id/start
 * 🆕 开始学习路径
 */
router.post('/academy/paths/:id/start', async (req, res) => {
  verifyUser(req, res, (decoded) => {
    try {
      academyService.startPath(decoded.id, parseInt(req.params.id));
      return success(res, { success: true }, '已加入学习路径');
    } catch(e) {
      return error(res, e.message);
    }
  });
});

/**
 * GET /api/mp/socratic/academy/daily-tasks
 * 🆕 获取今日任务
 */
router.get('/academy/daily-tasks', async (req, res) => {
  verifyUser(req, res, (decoded) => {
    const tasks = academyService.getDailyTasks(decoded.id);
    const completedCount = tasks.filter(t => t.completed).length;
    return success(res, {
      list: tasks,
      allCompleted: completedCount >= tasks.length,
      completedCount,
      totalCount: tasks.length,
    });
  });
});

/**
 * POST /api/mp/socratic/academy/daily-tasks/:key/claim
 * 🆕 领取每日任务奖励
 */
router.post('/academy/daily-tasks/:key/claim', async (req, res) => {
  verifyUser(req, res, (decoded) => {
    try {
      const result = academyService.claimDailyTaskReward(decoded.id, req.params.key);
      return success(res, result);
    } catch(e) {
      return error(res, e.message);
    }
  });
});

/**
 * GET /api/mp/socratic/academy/trend
 * 🆕 获取训练趋势数据（用于历史页趋势图）
 */
router.get('/academy/trend', async (req, res) => {
  verifyUser(req, res, (decoded) => {
    const { days = 30 } = req.query;
    const snapshots = academyService.getSessionSnapshots(decoded.id, parseInt(days));

    // 计算各维度趋势
    const dimensionTrend = {
      dates: [],
      question: [], listening: [], guiding: [], timing: [], depth: [],
    };

    snapshots.reverse().forEach(s => {
      dimensionTrend.dates.push(s.snapshot_date.split('T')[0]);
      if (s.scores && typeof s.scores === 'object') {
        for (const dim of ['question', 'listening', 'guiding', 'timing', 'depth']) {
          dimensionTrend[dim].push(s.scores[dim + '_score'] || s.scores[dim] || 0);
        }
      }
    });

    return success(res, {
      snapshots: snapshots.slice(0, 20),
      trend: dimensionTrend,
    });
  });
});

module.exports = router;
