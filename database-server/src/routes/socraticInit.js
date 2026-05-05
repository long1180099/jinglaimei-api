/**
 * 苏格拉底式提问训练系统 - 数据库初始化与种子数据
 * 
 * 基于苏格拉底教学法，通过5种提问类型训练代理商的销售沟通能力
 * 5种提问：澄清式、假设式、反向式、引导式、总结式
 */
const { getDB } = require('../utils/db');

async function initSocraticDB() {
  const db = getDB();

  // ==================== 表结构创建 ====================

  // 1. 苏格拉底场景表（训练场景）
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
  `);

  // 2. 苏格拉底问题库（标准问题模板）
  await db.exec(`
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (scenario_id) REFERENCES socratic_scenarios(id)
    );
  `);

  // 3. 苏格拉底训练会话表
  await db.exec(`
    CREATE TABLE IF NOT EXISTS socratic_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      scenario_id INTEGER NOT NULL,
      personality_type TEXT DEFAULT '',
      status TEXT DEFAULT 'active',
      total_rounds INTEGER DEFAULT 0,
      
      -- 评分维度（各100分，加权汇总）
      question_score INTEGER DEFAULT 0,     // 提问技巧分
      listening_score INTEGER DEFAULT 0,    // 倾听理解分
      guiding_score INTEGER DEFAULT 0,     // 引导能力分
      timing_score INTEGER DEFAULT 0,      // 时机把握分
      depth_score INTEGER DEFAULT 0,       // 深度挖掘分
      
      overall_score INTEGER DEFAULT 0,
      grade TEXT DEFAULT '',               // S/A/B/C/D等级
      feedback TEXT DEFAULT '',
      highlight_question TEXT DEFAULT '',   -- 最佳提问
      
      duration INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ended_at DATETIME,
      FOREIGN KEY (scenario_id) REFERENCES socratic_scenarios(id)
    );
  `);

  // 4. 苏格拉底对话消息表
  await db.exec(`
    CREATE TABLE IF NOT EXISTS socratic_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      round_num INTEGER DEFAULT 0,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      question_type TEXT DEFAULT '',        -- 用户消息的问题类型（AI识别）
      score INTEGER,                       -- 单条评分
      hint TEXT DEFAULT '',                 -- AI提示
      is_best_question INTEGER DEFAULT 0,   -- 是否为最佳提问
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES socratic_sessions(id)
    );
  `);

  // 5. AI学院 - users表新增字段（ALTER TABLE ADD COLUMN IF NOT EXISTS 在SQLite中需要安全处理）
  try {
    await db.exec(`ALTER TABLE users ADD COLUMN socratic_xp INTEGER DEFAULT 0`);
  } catch(e) { /* 字段已存在，忽略 */ }
  try {
    await db.exec(`ALTER TABLE users ADD COLUMN socratic_level INTEGER DEFAULT 1`);
  } catch(e) {}
  try {
    await db.exec(`ALTER TABLE users ADD COLUMN socratic_title TEXT DEFAULT ''`);
  } catch(e) {}
  try {
    await db.exec(`ALTER TABLE users ADD COLUMN total_training_minutes INTEGER DEFAULT 0`);
  } catch(e) {}

  // 6. 经验值日志表
  await db.exec(`
    CREATE TABLE IF NOT EXISTS socratic_xp_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      xp_amount INTEGER NOT NULL DEFAULT 0,
      source TEXT DEFAULT '',
      source_id INTEGER,
      description TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 7. 成就定义表
  await db.exec(`
    CREATE TABLE IF NOT EXISTS achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      icon TEXT DEFAULT '',
      category TEXT DEFAULT '',
      condition_type TEXT DEFAULT 'count',
      condition_field TEXT DEFAULT '',
      condition_target INTEGER DEFAULT 1,
      xp_reward INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      status INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 8. 用户成就解锁记录
  await db.exec(`
    CREATE TABLE IF NOT EXISTS user_achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      achievement_id INTEGER NOT NULL,
      session_id INTEGER,
      notified INTEGER DEFAULT 0,
      unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, achievement_id)
    );
  `);

  // 9. 学习路径表
  await db.exec(`
    CREATE TABLE IF NOT EXISTS learning_paths (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      scenario_ids TEXT DEFAULT '[]',
      difficulty TEXT DEFAULT 'medium',
      xp_reward INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      status INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 10. 用户学习路径进度
  await db.exec(`
    CREATE TABLE IF NOT EXISTS user_path_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      path_id INTEGER NOT NULL,
      current_step INTEGER DEFAULT 0,
      completed_scenario_ids TEXT DEFAULT '[]',
      status TEXT DEFAULT 'in_progress',
      score_summary TEXT DEFAULT '{}',
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      UNIQUE(user_id, path_id)
    );
  `);

  // 11. 每日任务定义表
  await db.exec(`
    CREATE TABLE IF NOT EXISTS daily_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      target_count INTEGER DEFAULT 1,
      xp_reward INTEGER DEFAULT 10,
      sort_order INTEGER DEFAULT 0,
      status INTEGER DEFAULT 1
    );
  `);

  // 12. 每日任务完成记录
  await db.exec(`
    CREATE TABLE IF NOT EXISTS daily_task_completions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      task_id INTEGER NOT NULL,
      completion_date TEXT NOT NULL,
      current_count INTEGER DEFAULT 0,
      completed INTEGER DEFAULT 0,
      UNIQUE(user_id, task_id, completion_date)
    );
  `);

  // 13. 训练快照表（历史对比趋势）
  await db.exec(`
    CREATE TABLE IF NOT EXISTS session_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      session_id INTEGER NOT NULL UNIQUE,
      snapshot_date TEXT DEFAULT '',
      scores_json TEXT DEFAULT '{}',
      grade TEXT DEFAULT '',
      overall_score INTEGER DEFAULT 0,
      scenario_category TEXT DEFAULT '',
      personality_type TEXT DEFAULT '',
      duration INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 创建索引
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_socratic_sessions_user ON socratic_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_socratic_sessions_scenario ON socratic_sessions(scenario_id);
    CREATE INDEX IF NOT EXISTS idx_socratic_messages_session ON socratic_messages(session_id);
    CREATE INDEX IF NOT EXISTS idx_socratic_questions_scenario ON socratic_questions(scenario_id);
    CREATE INDEX IF NOT EXISTS idx_socratic_scenarios_category ON socratic_scenarios(category);
  `);

  console.log('✅ 苏格拉底式提问训练系统数据库表已创建');

  // 导入种子数据
  seedSocraticScenarios(db);
  seedSocraticQuestions(db);
  seedAcademyData(db);

  console.log('✅ 苏格拉底式提问训练系统种子数据已导入');
}

// ==================== 种子数据：训练场景 ====================

function seedSocraticScenarios(db) {
  const count = await db.prepare('SELECT COUNT(*) as cnt FROM socratic_scenarios').get().cnt;
  if (count > 0) return;

  const scenarios = [
    // ====== 类别1：破冰建立信任 ======
    {
      name: '初次见面破冰',
      category: 'icebreaking',
      personality_type: '',
      difficulty: 'easy',
      description: '客户第一次进店或添加微信，需要通过提问快速建立信任关系，让客户愿意敞开心扉聊天。',
      customer_background: '张姐，35岁左右，经朋友介绍加的微信，对护肤有一定了解但不太专业。之前用过几个品牌，效果一般。',
      initial_situation: '你刚通过好友验证，对方回复了"你好"，你需要用提问的方式自然地开启对话并建立初步信任。',
      goal: '通过3-5个问题让客户感受到你的专业和关怀，愿意继续聊下去。',
      tips: '避免一上来就推销产品！先用开放性问题了解客户，再逐步深入。记住：提问的目的是"了解"，不是"说服"。关键话术："方便问一下...""您之前有没有试过..."',
      sort_order: 1
    },
    {
      name: '老客户回访破冰',
      category: 'icebreaking',
      personality_type: 'red',
      difficulty: 'easy',
      description: '一位老客户（红色性格）2个月没联系了，需要通过提问重新激活关系并发现新的销售机会。',
      customer_background: '李姐，红色性格，之前买过祛斑产品一套，用了之后效果不错，在朋友圈发过好评。后来忙起来就断了联系。',
      initial_situation: '你在朋友圈看到她发了去旅游的照片，决定借此机会回访。发微信过去后她回复得很热情。',
      goal: '通过提问了解她近况、产品使用情况，自然引导到复购或转介绍话题。',
      tips: '红色性格喜欢被关注、爱分享。从她的生活入手（旅游），让她多说，你在适当的时候用澄清式提问聚焦到产品/皮肤话题。避免冷场式的"最近怎么样？"这种无聊开场。',
      sort_order: 2
    },

    // ====== 类别2：需求深度挖掘 ======
    {
      name: '护肤需求深度挖掘',
      category: 'discovery',
      personality_type: 'blue',
      difficulty: 'medium',
      description: '蓝色性格客户非常理性，不会轻易表达真实需求。需要通过层层深入的提问，帮她理清自己的需求优先级。',
      customer_background: '王女士，28岁，IT行业，蓝色性格。脸上有些色斑和暗沉，做过很多功课但一直没下定决心。她会对比成分、看测评、查备案。',
      initial_situation: '她在微信上问你："你们产品的成分是什么？和其他品牌比有什么优势？"这是一个典型的蓝色性格开场——直接进入技术细节。',
      goal: '通过提问了解她做过的功课、尝试过的方法、最在意的点，从而精准定位她的核心需求。',
      tips: '蓝色客户尊重专业性。不要回避她的技术问题，但同时要用引导式提问让她说出自己的感受和担忧。例如："您最想改善的是哪个方面？""之前用过觉得效果不明显的原因您分析过吗？"',
      sort_order: 3
    },
    {
      name: '抗衰老需求激发',
      category: 'discovery',
      personality_type: 'green',
      difficulty: 'hard',
      description: '绿色性格客户决策慢、怕做错决定。她对"抗衰老"这个概念有顾虑（怕太激进、怕副作用）。需要通过提问帮助她自己意识到需求的紧迫性。',
      customer_background: '陈姐，42岁，全职妈妈，绿色性格。皮肤状态其实已经开始有细纹和松弛，但她总说"就这样吧，不想折腾"。",
      initial_situation: '她在一次聚会上随口提了一句"最近照镜子感觉老了"，你抓住了这个信号，约她出来喝茶深聊。',
      goal: '用提问方式让她自己说出对衰老的担忧，而不是你去告诉她"你有皱纹要赶紧处理"。',
      tips: '绿色性格不能硬推！用假设式提问："如果有一种方案很温和，您愿不愿意尝试？"用反向提问："很多人说'老了就这样'，您真的这么想吗？"关键是让她自己说出需求，而不是你替她说。',
      sort_order: 4
    },

    // ====== 类别3：异议处理转化 ======
    {
      name: '"太贵了"价格异议',
      category: 'objection',
      personality_type: 'yellow',
      difficulty: 'medium',
      description: '黄色性格客户直接说"太贵了"。这不是终点而是起点——需要通过提问找到价格异议背后的真正原因。',
      customer_background: '赵总，40岁左右做生意，黄色性格。经济实力没问题，但每一分钱都要花得值。她买东西只看ROI（投入产出比）。',
      initial_situation: '你介绍完方案后总价是3800元。她皱了下眉说："有点贵啊，能不能便宜点？"',
      goal: '通过提问搞清楚她觉得贵的真正原因——是预算有限？是没有认识到价值？还是在试探你的底线？然后针对性回应。',
      tips: '黄色性格要效率！不要绕圈子。用澄清式提问直击痛点："跟什么比觉得贵？""如果效果达到预期，这个价格能接受吗？"用假设式提问测试意愿："如果我们能分期或者有活动呢？"',
      sort_order: 5
    },
    {
      name: '"我再考虑考虑"拖延异议',
      category: 'objection',
      personality_type: 'green',
      difficulty: 'hard',
      description: '绿色性格的经典拖延用语。她不是不想买，是不敢做决定。需要通过提问帮她梳理犹豫的原因。',
      customer_background: '周姐，36岁，公务员，绿色性格。聊了快一个小时，产品也体验了，她也说确实不错。但你让她下单时她说"我再考虑考虑"。',
      initial_situation: '你刚介绍完所有产品优势和保障政策，她看起来挺心动，但最后还是说了那句"再考虑考虑"。',
      goal: '用提问帮她把模糊的"考虑"变成具体的问题点，然后逐个解决。',
      tips: '绿色性格的"考虑考虑"通常意味着还有未解决的顾虑。用温和的开放式提问："能跟我说说主要在考虑哪些方面吗？""是担心效果，还是有其他顾忌？"如果她不说，可以用选择式提问降低压力："是在想预算的事，还是想等时机？"',
      sort_order: 6
    },
    {
      name: '"我朋友说别家更好"竞品异议',
      category: 'objection',
      personality_type: 'blue',
      difficulty: 'hard',
      description: '蓝色性格客户做了大量功课还拿竞品来比较。这其实是好事——说明她认真对待这个决策。',
      customer_background: '吴女士，30岁，医生，蓝色性格。做事极其严谨，做了一个Excel表格对比了5个品牌的成分和价格。',
      initial_situation: '她拿出手机给你看她的对比表："XX品牌的成分和你们差不多，但价格只有你们的一半。而且他们还有XXX认证。"',
      goal: '通过提问了解她对比的具体维度，然后用提问引导她意识到"光比参数不够"，还需要看服务、效果、售后等综合价值。',
      tips: '千万不要贬低竞品！蓝色最反感不专业的竞品攻击。用好奇的态度提问："您对比了哪些方面？""除了这些，使用体验和服务您有关注吗？"用澄清式提问引导："成分相似≠效果相同，您认同吗？"用引导式提问补充维度："如果加上售后服务和使用指导呢？"',
      sort_order: 7
    },

    // ====== 类别4：成交促成 ======
    {
      name: '识别成交信号并促单',
      category: 'closing',
      personality_type: 'red',
      difficulty: 'medium',
      description: '红色性格客户已经发出了多个成交信号，但还没有正式下单。你需要通过提问确认并推动成交。',
      customer_background: '郑姐，33岁，微商宝妈，红色性格。体验产品时一直在夸"好好好""太棒了"，还问了"有没有赠品""套装有没有优惠"。',
      initial_situation: '她已经问了三次价格和优惠，手里拿着产品舍不得放下。但就是没有明确说"我要买"。',
      goal: '用提问方式（而不是命令）推动她做出购买决定，同时让她感觉这是自己做的选择。',
      tips: '红色性格享受购物过程！用二选一提问法帮她做决定："您是要套装A还是套装B？""今天带走还是我帮您快递？"用假设成交法："那我帮您搭配一套？"总结式提问强化价值："刚才我们聊到的这几个好处，您最看重哪个？"',
      sort_order: 8
    },
    {
      name: '高客单价方案促成',
      category: 'closing',
      personality_type: 'yellow',
      difficulty: 'hard',
      description: '黄色性格客户目标明确但精打细算。要推荐一个5000元的全套方案，需要通过提问让她自己算清楚这笔账划算。',
      customer_background: '孙总，45岁，企业高管，黄色性格。经济实力强但每笔花销都要有理由。她想解决色斑+松弛+干燥三个问题。',
      initial_situation: '你推荐了全套方案（洁面+水+精华+面霜+眼霜+面膜），总价5280元。她说："不需要这么多吧，挑一两样就行。"',
      goal: '通过提问让她意识到单买不如套划算，高投入带来高回报。',
      tips: '黄色要数据和逻辑！用澄清式提问确认优先级："三个问题里最想先解决哪个？"用假设式提问算账："如果单买来解决这三个问题，实际花费是多少？"用反向提问制造紧迫感："拖下去的话这些问题会更严重，您同意吗？"用总结式提问锁定："所以综合来看，套装是最优解对吗？"',
      sort_order: 9
    },

    // ====== 类别5：转介绍与裂变 ======
    {
      name: '老客户转介绍引导',
      category: 'referral',
      personality_type: 'red',
      difficulty: 'easy',
      description: '红色性格客户用得很好也说了很多好话，但没有主动介绍朋友。你需要通过提问引导她 naturally 地做转介绍。',
      customer_background: '钱姐，38岁，社群团长，红色性格。用了3个月效果非常好，朋友圈发了5次好评，带图带文那种。',
      initial_situation: '你又收到她的好消息反馈："天哪真的太好了！我同事都问我用了什么！"——这是完美的转介绍信号。',
      goal: '用提问方式让她主动提出介绍朋友，而不是你直接要求。',
      tips: '红色性格爱分享！用引导式提问顺势而为："您同事也感兴趣的话，要不要也帮她们看看？"用假设式提问放大利益："如果您介绍的朋友也有同样好的效果，您在朋友圈是不是更有面子？"用总结式提问确认行动："那您大概有几个朋友想了解？我先给您备几份试用装？"',
      sort_order: 10
    }
  ];

  const insert = db.prepare(`
    INSERT INTO socratic_scenarios 
      (name, category, personality_type, difficulty, description, customer_background, 
       initial_situation, goal, tips, status, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `);

  const insertMany = db.transaction((items) => {
    for (const item of items) {
      insert.run(item.name, item.category, item.personality_type, item.difficulty,
        item.description, item.customer_background, item.initial_situation,
        item.goal, item.tips, item.sort_order);
    }
  });
  insertMany(scenarios);
}

// ==================== 种子数据：标准问题库 ====================

function seedSocraticQuestions(db) {
  const count = await db.prepare('SELECT COUNT(*) as cnt FROM socratic_questions').get().cnt;
  if (count > 0) return;

  // 每个场景对应的标准问题模板
  // question_type: clarification(澄清式) / hypothesis(假设式) / reverse(反向式) / guiding(引导式) / summary(总结式)
  const questionsByScenario = [
    // 场景1：初次见面破冰
    {
      scenario_id: 1,
      questions: [
        { type: 'guiding', text: '您好呀张姐！我是看到咱们有个共同好友才加您的，方便问一下是她推荐您来了解护肤的吗？', purpose: '用轻松的引导式问题自然开启话题，同时确认来源增加信任感', hint: '引导式问题适合开场，给对方一个容易回答的切入点' },
        { type: 'clarification', text: '我特别好奇，您平时护肤最在意的是哪个方面呢？是美白、补水还是抗衰老？', purpose: '澄清式问题快速定位客户的关注焦点', hint: '澄清式问题帮助你快速了解客户的核心需求' },
        { type: 'hypothesis', text: '如果我猜得没错的话，您之前应该也用过一些护肤品吧？效果怎么样？', purpose: '假设式问题让对方感觉你懂她，拉近距离', hint: '假设式提问可以展示你的同理心和观察力' },
        { type: 'reverse', text: '很多人选护肤品都是看别人用什么自己就用，但其实每个人的皮肤都不一样，您认同吗？', purpose: '反向提问挑战固有思维，展现专业度', hint: '反向提问用来引发思考，但要温和不要说教' },
        { type: 'summary', text: '所以我理解下来，您最希望改善的是XX方面，而且之前用的产品感觉效果一般对吗？', purpose: '总结式确认理解是否正确，展示倾听态度', hint: '每次聊完一段后用总结式确认，避免误解' }
      ]
    },
    // 场景2：老客户回访破冰（红色性格）
    {
      scenario_id: 2,
      questions: [
        { type: 'guiding', text: '张姐！看你朋友圈去的那个地方太美了！是什么样的契机想去那里玩的呀？', purpose: '引导式问题从她的生活切入，红色性格最爱分享旅行经历', hint: '红色性格喜欢被关注，从她的分享切入是最好的破冰方式' },
        { type: 'clarification', text: '对了姐，咱们上次买的那套祛斑产品，您后面用完了吗？感觉怎么样？', purpose: '澄清式问题直接但自然地带到产品话题', hint: '红色性格爽快，不用绕弯子，直接问就好' },
        { type: 'hypothesis', text: '我看您朋友圈皮肤状态越来越好诶，是不是咱们的方案起效果啦？', purpose: '假设式提问带赞美，红色听了特别受用', hint: '红色性格需要被认可和赞美，多用"我注意到""我发现"' },
        { type: 'reverse', text: '很多姐妹用了效果好之后就慢慢停了，但其实巩固期特别重要，您知道为什么吗？', purpose: '反向提问引出复购话题，但不要太强势', hint: '用"你知道吗""您知道为什么吗"引发好奇心' },
        { type: 'summary', text: '看来这次旅行玩得很开心，皮肤状态也越来越好了！那我们是不是该准备下一阶段的产品啦？', purpose: '总结式把生活话题和产品话题连接起来', hint: '总结时要自然过渡，不要生硬转折' }
      ]
    },
    // 场景3：护肤需求深度挖掘（蓝色性格）
    {
      scenario_id: 3,
      questions: [
        { type: 'clarification', text: '您做的功课真的很详细！我想请教一下，在您对比的所有指标里面，您最看重的是哪一个呢？', purpose: '澄清式问题从她的专业角度切入，蓝色会被"请教"取悦', hint: '蓝色性格喜欢被当作专业人士对待，用"请教""学习"的姿态' },
        { type: 'guiding', text: '除了成分和技术参数之外，使用感受和售后服务这些方面，您有没有关注过？', purpose: '引导式问题扩展她的考量维度', hint: '蓝色容易陷入参数对比，引导她关注整体体验' },
        { type: 'hypothesis', text: '假如有一款产品，成分和您研究的这些一样优秀，同时还提供一对一的使用指导，您会觉得更有吸引力吗？', purpose: '假设式提问测试附加价值的吸引力', hint: '用"假如"来安全地探索她的想法边界' },
        { type: 'reverse', text: '您研究过那么多产品但一直没有下手，是因为没有一款完全满足您的要求，还是因为其他原因？', purpose: '反向提问找出决策障碍的真实原因', hint: '蓝色不决策通常有深层原因，需要温柔地挖出来' },
        { type: 'summary', text: '所以我理解下来：您最关心成分安全性，其次是用过的产品效果不明显让您有些失望，同时也在意服务的专业性，是这样吗？', purpose: '总结式全面回顾，让蓝色感觉到被完全理解', hint: '蓝色需要感到"这个人完全懂我"才会信任' }
      ]
    },
    // 场景4：抗衰老需求激发（绿色性格）
    {
      scenario_id: 4,
      questions: [
        { type: 'guiding', text: '陈姐，您刚才提到"感觉老了"，能跟我多说说这种感觉吗？是什么时候开始的呢？', purpose: '引导式提问给她安全感，让她慢慢打开话匣子', hint: '绿色性格需要温暖的环境和不催促的态度' },
        { type: 'hypothesis', text: '如果说有一个方法很温和，就像日常保养一样简单，您愿意了解一下吗？', purpose: '假设式提问降低她的心理防线', hint: '绿色怕激进，强调"温和""简单""不折腾"' },
        { type: 'reverse', text: '很多姐妹都说"就这样吧，不想折腾"，但等到真的影响到自信的时候反而更着急。您觉得什么时候才是合适的时机呢？', purpose: '反向提问温和地制造紧迫感', hint: '绿色需要被推动但不能被逼迫，用"什么时候合适"而非"必须现在"' },
        { type: 'clarification', text: '您最在意的是哪种变化呢？是细纹、松弛、还是肤色不均？', purpose: '澄清式问题帮她把模糊的焦虑具象化', hint: '绿色常常说不清自己想要什么，帮她拆解' },
        { type: 'summary', text: '所以其实您并不是真的"不想折腾"，只是之前没有遇到值得信任的产品和方法对吗？', purpose: '总结式帮她承认需求的存在', hint: '绿色需要你帮她把心里话说出来' }
      ]
    },
    // 场景5："太贵了"价格异议（黄色性格）
    {
      scenario_id: 5,
      questions: [
        { type: 'clarification', text: '赵总，我能直接问一下——您觉得贵是跟什么比呢？是超出预算了，还是觉得不值这个价？', purpose: '澄清式问题直击价格异议的核心', hint: '黄色性格欣赏直接，不要绕弯子' },
        { type: 'reverse', text: '市面上确实有更便宜的产品，但如果便宜的产品效果不好或者说用的时间更长，总体成本会不会更高呢？', purpose: '反向提问引入TCO（总拥有成本）思维', hint: '黄色是生意人，用商业逻辑跟她说话' },
        { type: 'hypothesis', text: '如果我们做一个分期方案，或者刚好有一个活动能把价格降到您心理预期内，那我们是不是就可以开始了？', purpose: '假设式提问测试成交意愿', hint: '黄色要做决定时需要明确的选项' },
        { type: 'guiding', text: '除了价格之外，这个方案的哪些部分您是比较认可的？', purpose: '引导式问题找到共同基础', hint: '先确认共识部分，再讨论分歧部分' },
        { type: 'summary', text: '也就是说，如果您认可这个价值和效果的话，价格是唯一需要解决的问题对吗？', purpose: '总结式确认成交条件', hint: '把复杂问题简化成一个可解决的点' }
      ]
    },
    // 场景6："我再考虑考虑"拖延异议（绿色性格）
    {
      scenario_id: 6,
      questions: [
        { type: 'guiding', text: '没关系的姐，买东西肯定要多想想。能告诉我主要是在考虑哪些方面吗？我好帮您梳理一下。', purpose: '引导式提问以帮助的姿态出现，降低防御', hint: '绿色的"考虑"通常是害怕做错决定，你要当她的顾问' },
        { type: 'clarification', text: '是关于效果的担心，还是在想时间/预算上的安排？', purpose: '澄清式二选一帮她归类犹豫原因', hint: '绿色说不清楚时给她选项比开放问题更有效' },
        { type: 'hypothesis', text: '如果您先拿一个小套装回去试试，效果好再来补全，这样压力会不会小一点？', purpose: '假设式提问降低首次决策门槛', hint: '绿色需要"退路"，给她低风险的选项' },
        { type: 'reverse', text: '其实"考虑考虑"有时候反而会让问题越来越严重，到时候处理成本更高。您觉得这个问题会自动消失吗？', purpose: '反向提问温和地指出拖延的代价', hint: '要温和！不要恐吓，只是客观陈述' },
        { type: 'summary', text: '看来您主要是担心效果不确定，如果能有更好的保障的话，您其实是愿意的对吗？', purpose: '总结式确认真正的障碍并提供解决方案方向', hint: '绿色需要反复确认"你是安全的"' }
      ]
    },
    // 场景7："我朋友说别家更好"竞品异议（蓝色性格）
    {
      scenario_id: 7,
      questions: [
        { type: 'clarification', text: '您做得真专业！能跟我说说您主要对比了哪些维度吗？除了成分和价格，还在意什么？', purpose: '以请教的姿态用澄清式问题了解她的评价体系', hint: '蓝色做了功课要尊重她的付出，先肯定再引导' },
        { type: 'guiding', text: '您对比成分做得很好。那使用体验、售后服务、效果跟踪这些方面，您有没有纳入对比呢？', purpose: '引导式提问扩展评价维度', hint: '蓝色容易陷入单一维度的比较，帮她补全' },
        { type: 'reverse', text: '成分相似不等于效果相同——就像同样的菜谱不同厨师做出的味道也不一样。您认同这个道理吗？', purpose: '反向提问用类比打破"成分一样=效果一样"的思维', hint: '用类比和比喻跟蓝色讲道理最有效' },
        { type: 'hypothesis', text: '如果在成分相当的情况下，我们还提供一对一的皮肤管理指导和效果承诺，这样对比的话结果会有变化吗？', purpose: '假设式提问加入差异化因素', hint: '蓝色需要在完整信息基础上做决策' },
        { type: 'summary', text: '所以您的核心诉求是：成分安全的前提下，找一家服务更完善、效果更有保障的长期合作伙伴，是这个意思吗？', purpose: '总结式重新定义选择标准', hint: '帮蓝色把"比价格"升级为"比价值"' }
      ]
    },
    // 场景8：识别成交信号并促单（红色性格）
    {
      scenario_id: 8,
      questions: [
        { type: 'guiding', text: '郑姐您眼光真好！这款确实是我们的明星产品。您是喜欢它哪个方面最多呢？质地？味道还是效果？', purpose: '引导式提问让她说出喜欢的理由，强化购买动机', hint: '红色说出喜欢的东西后会更容易下单' },
        { type: 'hypothesis', text: '如果您今天带走的话，我还能帮您申请一个新品试用装和一个专属礼包，要不要我帮您看看有什么？', purpose: '假设式提问制造"占便宜"的快乐', hint: '红色爱"额外福利""专属待遇"这些词' },
        { type: 'clarification', text: '您是想要全套效果最好，还是先挑两样核心的试试？', purpose: '澄清式二选一推进决策', hint: '红色做选择困难，帮她缩小范围' },
        { type: 'reverse', text: '这款库存确实不多，好多老顾客都在问。您要是喜欢的话要不要我先帮您留一套？', purpose: '反向提问制造稀缺感但不给压力', hint: '用"帮您留"而非"快买"的语气' },
        { type: 'summary', text: '刚才您提到的这几个好处——效果明显、质感好、还有赠品——要不我现在就帮您搭配一套？', purpose: '总结式自然转入成交动作', hint: '总结完好处后立即行动，红色喜欢干脆利落' }
      ]
    },
    // 场景9：高客单价方案促成（黄色性格）
    {
      scenario_id: 9,
      questions: [
        { type: 'clarification', text: '孙总，您说的这三个问题里——色斑、松弛、干燥——如果按紧急程度排个序，您会把哪个放第一位？', purpose: '澄清式问题确定优先级，便于后续推荐', hint: '黄色喜欢优先级清晰的表达' },
        { type: 'reverse', text: '如果分开买单品来解决这三个问题，其实总投入可能比套装还高，而且效果没有协同性。您算过这笔账吗？', purpose: '反向提问用数据说话', hint: '黄色要算账你就帮她算清楚' },
        { type: 'hypothesis', text: '如果把5280元摊到6个月使用期，每天不到30块——比一杯咖啡还便宜。这样来看的话性价比如何？', purpose: '假设式提问重构价格认知', hint: '把总价拆解成日均成本是经典的黄色成交技巧' },
        { type: 'guiding', text: '像您这样的成功人士，时间和效果应该比价格更重要对吧？', purpose: '引导式提问强化价值观认同', hint: '黄色需要感到被尊重和理解' },
        { type: 'summary', text: '所以综合来看——问题要彻底解决、日均成本低、时间效益高——这套方案其实是最优投资，您认同吗？', purpose: '总结式锁定价值判断', hint: '用"投资"而非"消费"的概念' }
      ]
    },
    // 场景10：老客户转介绍引导（红色性格）
    {
      scenario_id: 10,
      questions: [
        { type: 'guiding', text: '天哪姐你也太好了！同事都问你的话说明效果真的很明显呀！她们是怎么说的？', purpose: '引导式提问让她复述别人的赞美，强化她的成就感', hint: '红色喜欢被关注，让她多说说' },
        { type: 'clarification', text: '您身边这样的朋友大概有多少个也有类似困扰的呢？', purpose: '澄清式问题量化转介绍资源', hint: '帮红色数一下她的人脉有多值钱' },
        { type: 'hypothesis', text: '如果她们来找你咨询，你不仅能帮到朋友，我这边还能给你准备一份专属的"推荐礼"，你觉得怎么样？', purpose: '假设式提问给出双向利益激励', hint: '红色爱面子也爱实惠，两个都给' },
        { type: 'reverse', text: '其实好东西自己用好可惜呀，分享出去让大家一起变美不是更有成就感吗？', purpose: '反向提问激发分享欲', hint: '用"成就感""面子"驱动红色' },
        { type: 'summary', text: '所以您大概有2-3个朋友想介绍，而且也希望有一份推荐礼物撑场面对不对？那我先给您准备好！', purpose: '总结式确认并立即行动', hint: '红色要的就是这个节奏——说到做到' }
      ]
    }
  ];

  const insert = db.prepare(`
    INSERT INTO socratic_questions (scenario_id, question_type, question_text, purpose, hint, sort_order, status)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `);

  for (const sq of questionsByScenario) {
    const { scenario_id, questions } = sq;
    questions.forEach((q, idx) => {
      insert.run(scenario_id, q.type, q.text, q.purpose, q.hint, idx + 1);
    });
  }

  console.log(`✅ 已导入 ${questionsByScenario.reduce((sum, sq) => sum + sq.questions.length, 0)} 条苏格拉底标准问题`);
}

// ==================== 种子数据：AI学院（每日任务+成就） ====================

function seedAcademyData(db) {
  // 每日任务
  const taskCount = await db.prepare('SELECT COUNT(*) as cnt FROM daily_tasks').get().cnt;
  if (taskCount === 0) {
    const tasks = [
      { key: 'complete_1_session', name: '完成一次训练', description: '完成任意一次苏格拉底提问训练', target_count: 1, xp_reward: 20, sort_order: 1 },
      { key: 'complete_3_sessions', name: '训练达人', description: '完成3次训练对话', target_count: 3, xp_reward: 50, sort_order: 2 },
      { key: 'get_score_80', name: '高分挑战', description: '获得一次80分以上的训练评分', target_count: 1, xp_reward: 30, sort_order: 3 },
      { key: 'try_all_types', name: '全能提问', description: '使用至少3种不同类型的提问', target_count: 3, xp_reward: 40, sort_order: 4 },
    ];
    const insertTask = db.prepare(`INSERT INTO daily_tasks (key, name, description, target_count, xp_reward, sort_order) VALUES (?, ?, ?, ?, ?, ?)`);
    for (const t of tasks) {
      insertTask.run(t.key, t.name, t.description, t.target_count, t.xp_reward, t.sort_order);
    }
    console.log('✅ 已导入每日任务种子数据');
  }

  // 成就
  const achCount = await db.prepare('SELECT COUNT(*) as cnt FROM achievements').get().cnt;
  if (achCount === 0) {
    const achievements = [
      { name: '初次训练', description: '完成第一次苏格拉底训练', icon: '🎯', category: 'training', condition_type: 'count', condition_field: 'total_sessions', condition_target: 1, xp_reward: 20, sort_order: 1 },
      { name: '训练新手', description: '完成5次训练', icon: '📝', category: 'training', condition_type: 'count', condition_field: 'total_sessions', condition_target: 5, xp_reward: 50, sort_order: 2 },
      { name: '训练达人', description: '完成20次训练', icon: '⭐', category: 'training', condition_type: 'count', condition_field: 'total_sessions', condition_target: 20, xp_reward: 150, sort_order: 3 },
      { name: '训练大师', description: '完成50次训练', icon: '💎', category: 'training', condition_type: 'count', condition_field: 'total_sessions', condition_target: 50, xp_reward: 300, sort_order: 4 },
      { name: '破冰专家', description: '完成5次破冰类场景训练', icon: '🧊', category: 'category', condition_type: 'count', condition_field: 'unique_categories', condition_target: 3, xp_reward: 40, sort_order: 5 },
      { name: '提问多面手', description: '在训练中使用过5种不同的提问类型', icon: '🔄', category: 'skill', condition_type: 'count', condition_field: 'unique_question_types', condition_target: 5, xp_reward: 60, sort_order: 6 },
      { name: 'A级表现', description: '获得一次A级评分', icon: '🅰️', category: 'score', condition_type: 'score', condition_field: 'overall_score', condition_target: 80, xp_reward: 80, sort_order: 7 },
      { name: 'S级大师', description: '获得一次S级评分', icon: '👑', category: 'score', condition_type: 'score', condition_field: 'overall_score', condition_target: 90, xp_reward: 200, sort_order: 8 },
      { name: '连续3天', description: '连续3天完成训练', icon: '🔥', category: 'streak', condition_type: 'streak', condition_field: 'daily_streak', condition_target: 3, xp_reward: 60, sort_order: 9 },
      { name: '连续7天', description: '连续7天完成训练', icon: '💪', category: 'streak', condition_type: 'streak', condition_field: 'daily_streak', condition_target: 7, xp_reward: 200, sort_order: 10 },
    ];
    const insertAch = db.prepare(`INSERT INTO achievements (name, description, icon, category, condition_type, condition_field, condition_target, xp_reward, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const a of achievements) {
      insertAch.run(a.name, a.description, a.icon, a.category, a.condition_type, a.condition_field, a.condition_target, a.xp_reward, a.sort_order);
    }
    console.log('✅ 已导入成就种子数据');
  }
}

module.exports = { initSocraticDB };
