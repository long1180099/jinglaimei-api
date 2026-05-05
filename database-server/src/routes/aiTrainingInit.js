/**
 * AI话术通关系统 - 数据库初始化与种子数据
 */
const { getDB } = require('../utils/db');

async function initAITrainingDB() {
  const db = getDB();

  // 1. 关卡表
  await db.exec(`
    CREATE TABLE IF NOT EXISTS ai_levels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      sort_order INTEGER DEFAULT 0,
      pass_score INTEGER DEFAULT 80,
      study_material TEXT,
      study_material_type TEXT DEFAULT 'text',
      status INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. 考核题目表
  await db.exec(`
    CREATE TABLE IF NOT EXISTS ai_level_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level_id INTEGER NOT NULL,
      question_type TEXT DEFAULT 'scenario',
      scenario TEXT NOT NULL,
      options TEXT,
      correct_answer TEXT,
      answer_analysis TEXT,
      score INTEGER DEFAULT 20,
      sort_order INTEGER DEFAULT 0,
      difficulty TEXT DEFAULT 'medium',
      personality_type TEXT,
      status INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (level_id) REFERENCES ai_levels(id)
    );
  `);

  // 3. 代理商通关记录表
  await db.exec(`
    CREATE TABLE IF NOT EXISTS ai_level_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      level_id INTEGER NOT NULL,
      best_score INTEGER DEFAULT 0,
      attempts INTEGER DEFAULT 0,
      passed INTEGER DEFAULT 0,
      passed_at DATETIME,
      best_duration INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (level_id) REFERENCES ai_levels(id),
      UNIQUE(user_id, level_id)
    );
  `);

  // 4. 单次挑战详情表
  await db.exec(`
    CREATE TABLE IF NOT EXISTS ai_level_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      level_id INTEGER NOT NULL,
      score INTEGER DEFAULT 0,
      duration INTEGER DEFAULT 0,
      answers TEXT,
      passed INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (level_id) REFERENCES ai_levels(id)
    );
  `);

  // 5. AI教练场景表
  await db.exec(`
    CREATE TABLE IF NOT EXISTS ai_coach_scenarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      personality_type TEXT NOT NULL,
      personality_name TEXT,
      description TEXT,
      initial_intent TEXT,
      difficulty TEXT DEFAULT 'medium',
      opening_line TEXT,
      personality_traits TEXT,
      tips TEXT,
      status INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 6. AI教练对话记录表
  await db.exec(`
    CREATE TABLE IF NOT EXISTS ai_coach_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      scenario_id INTEGER NOT NULL,
      status TEXT DEFAULT 'active',
      total_rounds INTEGER DEFAULT 0,
      result TEXT,
      overall_score INTEGER DEFAULT 0,
      personality_score INTEGER DEFAULT 0,
      need_discovery_score INTEGER DEFAULT 0,
      empathy_score INTEGER DEFAULT 0,
      professional_score INTEGER DEFAULT 0,
      objection_score INTEGER DEFAULT 0,
      closing_score INTEGER DEFAULT 0,
      naturalness_score INTEGER DEFAULT 0,
      feedback TEXT,
      duration INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ended_at DATETIME,
      FOREIGN KEY (scenario_id) REFERENCES ai_coach_scenarios(id)
    );
  `);

  // 7. AI教练对话消息表
  await db.exec(`
    CREATE TABLE IF NOT EXISTS ai_coach_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      score INTEGER,
      hint TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES ai_coach_sessions(id)
    );
  `);

  // 8. 话术库表
  await db.exec(`
    CREATE TABLE IF NOT EXISTS ai_scripts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      personality_type TEXT,
      scenario TEXT NOT NULL,
      script_content TEXT NOT NULL,
      tips TEXT,
      sort_order INTEGER DEFAULT 0,
      status INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 9. 话术排行榜表（预计算缓存）
  await db.exec(`
    CREATE TABLE IF NOT EXISTS ai_rankings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      nickname TEXT,
      avatar TEXT,
      total_score INTEGER DEFAULT 0,
      levels_passed INTEGER DEFAULT 0,
      coach_avg_score INTEGER DEFAULT 0,
      coach_sessions INTEGER DEFAULT 0,
      period TEXT DEFAULT 'all',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, period)
    );
  `);

  // 创建索引
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_level_progress_user ON ai_level_progress(user_id);
    CREATE INDEX IF NOT EXISTS idx_level_progress_level ON ai_level_progress(level_id);
    CREATE INDEX IF NOT EXISTS idx_level_attempts_user ON ai_level_attempts(user_id);
    CREATE INDEX IF NOT EXISTS idx_coach_sessions_user ON ai_coach_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_coach_sessions_scenario ON ai_coach_sessions(scenario_id);
    CREATE INDEX IF NOT EXISTS idx_coach_messages_session ON ai_coach_messages(session_id);
    CREATE INDEX IF NOT EXISTS idx_scripts_category ON ai_scripts(category);
    CREATE INDEX IF NOT EXISTS idx_rankings_period ON ai_rankings(period);
  `);

  console.log('✅ AI话术系统数据库表已创建');

  // ==================== 种子数据 ====================
  seedLevels(db);
  seedQuestions(db);
  seedScenarios(db);
  seedScripts(db);

  console.log('✅ AI话术系统种子数据已导入');
}

function seedLevels(db) {
  const count = await db.prepare('SELECT COUNT(*) as cnt FROM ai_levels').get().cnt;
  if (count > 0) return;

  const levels = [
    {
      name: '性格色彩识人',
      description: '学习红黄蓝绿四种性格特征、识别口诀和沟通禁忌，掌握快速识人的核心技巧。',
      sort_order: 1,
      pass_score: 80,
      study_material: `【四种性格色彩速记口诀】

🔴 红色（孔雀型）- 热情开朗爱表现
• 特征：热情洋溢、喜欢社交、表达欲强、爱新鲜事物
• 口诀："红孔雀，爱说话，追新鲜，怕无聊"
• 沟通要点：多赞美、给惊喜、强调独特、快速决策
• 禁忌：啰嗦、冷漠、不给关注

🟡 黄色（老虎型）- 目标导向求效率
• 特征：果断直接、目标明确、追求效率、不喜拖沓
• 口诀："黄老虎，要结果，讲效率，不废话"
• 沟通要点：直接给方案、用数据说话、强调效果、限时优惠
• 禁忌：拐弯抹角、含糊其辞、浪费对方时间

🔵 蓝色（猫头鹰型）- 严谨理性重细节
• 特征：注重细节、理性分析、安全意识强、需要证据
• 口诀："蓝猫头鹰，问到底，要证据，怕风险"
• 沟通要点：给成分表、展示检测报告、引用案例数据、允许比较
• 禁忌：夸大效果、回避问题、催促决策

🟢 绿色（考拉型）- 温和稳重重感受
• 特征：温和友善、害怕冲突、需要被关怀、决策缓慢
• 口诀："绿考拉，慢慢来，怕冲突，要安心"
• 沟通要点：温暖关怀、耐心引导、给安全感、帮ta做决定
• 禁忌：施压、太激进、忽视感受`,
      study_material_type: 'text',
      status: 1
    },
    {
      name: '问题肌诊断话术',
      description: '针对不同皮肤问题（色斑、痘印、敏感、衰老等），学习问诊式开场和诊断流程。',
      sort_order: 2,
      pass_score: 80,
      study_material: `【问题肌诊断标准流程】

第一步：观察开场（非直球式）
❌ 错误："你的皮肤问题挺严重的"
✅ 正确："姐，你皮肤底子真好，就是这里有点小困扰，是不是之前用过什么不太适合的？"

第二步：问诊五问法
1. 时问："这个问题大概多久了？"
2. 因问："之前有没有用过什么方法或产品？"
3. 果问："用了之后感觉怎么样？"
4. 期问："你最想改善的是哪个方面？"
5. 预问："你对效果有什么期望？多快想看到变化？"

第三步：共情确认
"我完全理解你的困扰，很多顾客都有类似的情况..."

第四步：方案过渡
"根据你刚才说的，我建议我们用一个系统方案，分三步来解决..."

【常见问题肌分类与话术】
• 色斑类：强调"源头抑黑+表层层层淡化"
• 痘痘类：强调"消炎+修护+预防"三步走
• 敏感类：强调"安全第一、先修复屏障"
• 衰老类：强调"抗老不等于猛药，要温和有效"`,
      study_material_type: 'text',
      status: 1
    },
    {
      name: '方案推荐话术',
      description: '根据客户性格+皮肤问题组合，学习精准推荐产品方案的话术技巧。',
      sort_order: 3,
      pass_score: 80,
      study_material: `【方案推荐核心公式】

需求确认 + 专业分析 + 方案展示 + 价值塑造 + 行动召唤

1️⃣ 需求确认："姐，刚才聊下来你最在意的是XX问题对吗？"

2️⃣ 专业分析："这个问题的根本原因是XX，所以光表面处理是不够的，需要从源头解决。"

3️⃣ 方案展示（FAB法则）：
• Feature（特点）：这款产品含有XX成分
• Advantage（优势）：它能XX
• Benefit（利益）：意味着你的皮肤会XX

4️⃣ 价值塑造：
• 方案总价 vs 单品拆解
• 日均成本换算："一天才X块钱，比一杯奶茶还便宜"
• 对比竞品："市面上同类产品要XX元，而且没有我们的XX技术"

5️⃣ 行动召唤：
• 红色："这款是限量版/新品，很多老顾客都在抢"
• 黄色："现在下单，X天就能看到效果"
• 蓝色："我给你看下成分对比表和使用数据"
• 绿色："没关系，我帮你搭配好了，直接用就行"

【组合推荐策略】
主品（解决问题）+ 辅品（加速效果）+ 保养品（巩固）= 完整方案`,
      study_material_type: 'text',
      status: 1
    },
    {
      name: '异议处理话术',
      description: '掌握价格异议、效果担忧、竞品比较、伴侣反对等常见反对意见的应对技巧。',
      sort_order: 4,
      pass_score: 80,
      study_material: `【异议处理四步法】

第一步：倾听认可（不要反驳！）
"我非常理解您的顾虑..."
"这个问题问得好..."
"很多顾客一开始也有同样的想法..."

第二步：探究原因
"方便问一下，主要是担心哪个方面呢？"
"是价格方面的考虑，还是效果方面的？"

第三步：回应化解
用FAB法则、数据、案例来回应
"您说的对，不过..."
"其实..."

第四步：确认推进
"这样说您觉得怎么样？"
"那我们今天先试试XX？"

【六大经典异议应对】

❓"太贵了"
→ 拆解日均成本 / 对比其他消费 / 强调价值
→ "姐，这个能用X个月，一天才X块钱。而且皮肤好了，省下来的化妆品钱远不止这些。"

❓"效果真的有用吗？"
→ 引用案例 / 出示对比图 / 提供试用
→ "我特别理解你的担心。您看这是王姐用了前后的对比，用了28天。要不我先给您试用装？"

❓"我再考虑考虑"
→ 找出犹豫原因 / 制造紧迫感 / 降低决策门槛
→ "当然可以。不过我建议您早用早好，皮肤问题拖得越久越难处理。要不先拿个小套装试试？"

❓"我朋友说XX牌子也不错"
→ 不贬低竞品 / 强调差异化优势
→ "XX确实不错，不过我们的优势在于XX。要不我给您对比一下成分？"

❓"我老公/家人不同意"
→ 帮助说服话术 / 让决策者参与
→ "说明您家人很关心您呀。要不下次带上ta一起来？我给ta也分析一下？"

❓"我皮肤太敏感，不敢用"
→ 安全承诺 / 成分解读 / 小面积试用
→ "完全可以理解。我们产品都是经过敏感肌测试的，这是检测报告。要不您先在手背试试？"`,
      study_material_type: 'text',
      status: 1
    },
    {
      name: '成交促成话术',
      description: '学习识别成交信号、把握成交时机、自然逼单和促单技巧。',
      sort_order: 5,
      pass_score: 80,
      study_material: `【成交信号识别】

语言信号：
• "这个真的有效果吗？" → 从质疑转为确认
• "怎么用？用多久见效？" → 开始想象使用场景
• "有什么优惠？" → 已经决定买，在谈价格
• "能帮我搭配一套吗？" → 接受推荐，准备购买
• "你们有售后保障吗？" → 最后一道心理防线

肢体信号：
• 身体前倾、认真看产品
• 反复触摸产品包装
• 开始计算总价
• 拿手机准备付款

【五大成交技巧】

1️⃣ 假定成交法
"那我就帮您搭配一套了，用XX这套方案效果最好。"

2️⃣ 二选一成交法
"您是拿套装还是单品？套装更划算。"
"您是现在带走还是我帮您发快递？"

3️⃣ 限时成交法
"这个活动今天最后一天了..."
"这个赠品只剩最后3份了..."

4️⃣ 退路成交法
"没关系，用着不满意随时可以退换。"
"我们先从小套装开始，效果好再升级。"

5️⃣ 稀缺成交法
"这款是限量版，全国只有XX套..."
"我们老顾客都是回购的，新客名额有限..."

【成交后的关键动作】
✅ 感谢购买："谢谢姐的信任！"
✅ 使用指导："这个早晚各用一次，先XX再XX"
✅ 加微信跟进："我加您微信，有什么问题随时找我"
✅ 预约回访："我大概3天后跟进您使用感受"`,
      study_material_type: 'text',
      status: 1
    },
    {
      name: '老客户复购/裂变话术',
      description: '掌握老客户回访、复购引导和转介绍（裂变）的话术体系。',
      sort_order: 6,
      pass_score: 80,
      study_material: `【老客户复购五步法】

第一步：关怀回访（使用后3-7天）
"姐，产品用了几天了？感觉怎么样？有没有什么不舒服的地方？"
目的：收集反馈、建立信任、及时解决问题

第二步：效果确认（使用后2-4周）
"姐，最近皮肤有没有感觉XX改善了？"
目的：强化效果认知、让客户自己说出变化

第三步：复购提醒（产品快用完时）
"姐，您的XX差不多要用完了，趁现在有活动我帮您备上？"
目的：抓住补货时机、搭配新方案

第四步：升级推荐
"姐，您第一阶段效果很好，接下来可以加一个XX来巩固效果。"
目的：客单价提升、方案深化

第五步：长期关系维护
定期护肤知识分享、节日关怀、专属优惠
目的：客户终身价值最大化

【转介绍（裂变）话术】

时机把握：客户表达满意时（"效果真的很好！"）
→ 不要等，立即跟进！

标准话术：
"太好了姐！您身边有没有朋友也有类似困扰的？可以介绍给我，我给ta也好好分析分析。您朋友来我给您额外送XX。"

利益驱动：
• 给介绍人：赠品、折扣、专属服务
• 给被介绍人：新人优惠、免费体验
• 双方都有好处，推荐更自然

裂变活动设计：
"老带新"活动：介绍1位朋友下单→双方各得XX
拼团活动：3人成团享受XX折
分享有礼：朋友圈打卡+使用感受→领取试用装`,
      study_material_type: 'text',
      status: 1
    }
  ];

  const insert = db.prepare(`
    INSERT INTO ai_levels (name, description, sort_order, pass_score, study_material, study_material_type, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((items) => {
    for (const item of items) {
      insert.run(item.name, item.description, item.sort_order, item.pass_score,
        item.study_material, item.study_material_type, item.status);
    }
  });
  insertMany(levels);
}

function seedQuestions(db) {
  const count = await db.prepare('SELECT COUNT(*) as cnt FROM ai_level_questions').get().cnt;
  if (count > 0) return;

  const questions = [
    // ===== 关卡1：性格色彩识人 =====
    {
      level_id: 1, question_type: 'scenario', personality_type: 'red',
      scenario: '一位女士走进店里，眼睛亮亮的，一直夸店内装修好看，还主动跟你聊她最近去的美容院。说话很快，肢体语言丰富。你觉得她最可能是哪种性格？',
      options: JSON.stringify([
        { key: 'A', text: '红色（孔雀型）', score: 20 },
        { key: 'B', text: '黄色（老虎型）', score: 5 },
        { key: 'C', text: '蓝色（猫头鹰型）', score: 5 },
        { key: 'D', text: '绿色（考拉型）', score: 5 }
      ]),
      correct_answer: 'A',
      answer_analysis: '热情、爱聊天、表达欲强、肢体语言丰富，这些都是典型的红色（孔雀型）特征。',
      score: 20, sort_order: 1, difficulty: 'easy'
    },
    {
      level_id: 1, question_type: 'scenario', personality_type: 'yellow',
      scenario: '一位顾客进来直接问："你们店里祛斑效果最好的产品是哪个？多长时间见效？多少钱？我要最快的方案。"你觉得她最可能是哪种性格？',
      options: JSON.stringify([
        { key: 'A', text: '红色（孔雀型）', score: 5 },
        { key: 'B', text: '黄色（老虎型）', score: 20 },
        { key: 'C', text: '蓝色（猫头鹰型）', score: 10 },
        { key: 'D', text: '绿色（考拉型）', score: 5 }
      ]),
      correct_answer: 'B',
      answer_analysis: '目标明确、直奔主题、要效率、不废话，这是典型的黄色（老虎型）特征。蓝色也可能问成分，但不会这么直接。',
      score: 20, sort_order: 2, difficulty: 'easy'
    },
    {
      level_id: 1, question_type: 'scenario', personality_type: 'blue',
      scenario: '一位顾客拿出手机，给你看她查的资料："我看了这个成分表，你们这个产品有XX成分，会不会过敏？有没有做过临床测试？有没有国家备案？"你应该怎么回应？',
      options: JSON.stringify([
        { key: 'A', text: '"姐你想太多了，我们的产品绝对安全，很多人用了都没问题！"', score: 5 },
        { key: 'B', text: '"问得好！这是我们的检测报告和备案信息，成分都是经过敏感肌测试的。您看这个数据..."', score: 20 },
        { key: 'C', text: '"放心吧，我们是大品牌，不可能有问题的。"', score: 5 },
        { key: 'D', text: '"要不你先别买了，回去再查查。"', score: 2 }
      ]),
      correct_answer: 'B',
      answer_analysis: '蓝色性格需要数据和证据支撑。认可对方的严谨态度，提供专业数据（检测报告、备案信息），用事实说话。千万不能敷衍或贬低对方的担心。',
      score: 20, sort_order: 3, difficulty: 'medium'
    },
    {
      level_id: 1, question_type: 'scenario', personality_type: 'green',
      scenario: '一位顾客在店里转了很久，你问她需要什么，她说"我就是随便看看"。但你能看到她对着某款产品看了好几次。你应该怎么做？',
      options: JSON.stringify([
        { key: 'A', text: '"随便看看也行，有需要叫我就好。"', score: 5 },
        { key: 'B', text: '"姐，我看您好像对这款挺感兴趣的？来我帮您介绍一下，不买也没关系~"', score: 20 },
        { key: 'C', text: '"这款现在打8折，今天不买就没了！"', score: 5 },
        { key: 'D', text: '直接走过去把产品塞到她手里', score: 2 }
      ]),
      correct_answer: 'B',
      answer_analysis: '绿色性格害羞、怕冲突、决策慢。"不买也没关系"降低压力，"帮您介绍"提供帮助而非推销。先建立信任，再引导决策。',
      score: 20, sort_order: 4, difficulty: 'medium'
    },

    // ===== 关卡2：问题肌诊断话术 =====
    {
      level_id: 2, question_type: 'scenario', personality_type: 'red',
      scenario: '一位红色性格的顾客兴奋地说："朋友推荐来的！听说你们有个新品超好用，快给我看看！"}你最合适的开场话术是？',
      options: JSON.stringify([
        { key: 'A', text: '"好的姐，我给您拿。这个是新品XX，含量XX，效果XX...（直接介绍参数）"', score: 5 },
        { key: 'B', text: '"哇姐您消息真灵通！这个新品确实太火了，好几个老顾客都在抢。来我给您讲讲为什么这么受欢迎~"', score: 20 },
        { key: 'C', text: '"您先坐下，我给您做个皮肤检测再推荐。"', score: 5 },
        { key: 'D', text: '"哪个朋友推荐的？我先看看您朋友用了什么。"', score: 10 }
      ]),
      correct_answer: 'B',
      answer_analysis: '红色性格要的是热情回应和社交认同。"消息灵通"满足被赞美感，"好几个老顾客都在抢"制造稀缺感，然后用讲故事的方式介绍（而非枯燥参数）。',
      score: 20, sort_order: 1, difficulty: 'medium'
    },
    {
      level_id: 2, question_type: 'scenario', personality_type: 'blue',
      scenario: '一位蓝色性格的顾客说："我脸上有色斑，大概三年了，之前用过XXX品牌的淡斑精华，用了半年没什么效果。"你的最佳回应是？',
      options: JSON.stringify([
        { key: 'A', text: '"那可能不适合你。我们的产品更好，肯定有效。"', score: 5 },
        { key: 'B', text: '"用了半年没效果，确实很让人着急。我理解您的感受。方便问一下，那个产品主要是针对什么原理淡斑的？这样我帮您分析一下为什么没效果，然后针对性地给您推荐。"', score: 20 },
        { key: 'C', text: '"色斑三年了要用我们的全套方案才行，差不多需要XXX元。"', score: 5 },
        { key: 'D', text: '"那您要不要试试我们的产品？反正也不贵。"', score: 3 }
      ]),
      correct_answer: 'B',
      answer_analysis: '蓝色性格需要：1.共情（理解用了半年没效果的心情）2.专业分析（探究之前产品为什么没效果）3.针对性方案。用提问引导而非直接推销。',
      score: 20, sort_order: 2, difficulty: 'medium'
    },
    {
      level_id: 2, question_type: 'scenario', personality_type: 'green',
      scenario: '一位绿色性格的顾客犹豫地说："我皮肤好像有点敏感，不太敢乱用东西，之前用过一次XXX就过敏了..."你的最佳回应是？',
      options: JSON.stringify([
        { key: 'A', text: '"没事的，我们的产品很温和，不会过敏的。"', score: 5 },
        { key: 'B', text: '"我特别理解！过敏真的很让人害怕。姐您放心，我们有一整套专门针对敏感肌的方案，而且每个产品都经过敏感肌测试的。要不我先帮您在手背上试一下？一点都不用有压力。"', score: 20 },
        { key: 'C', text: '"过敏的话建议您先去看皮肤科医生。"', score: 10 },
        { key: 'D', text: '"那您就用我们最基础的水乳就行了。"', score: 5 }
      ]),
      correct_answer: 'B',
      answer_analysis: '绿色性格需要安全感。先共情过敏的恐惧，提供安全承诺（敏感肌测试），降低试错成本（手背试用），消除决策压力（"不用有压力"）。',
      score: 20, sort_order: 3, difficulty: 'hard'
    },

    // ===== 关卡3：方案推荐话术 =====
    {
      level_id: 3, question_type: 'scenario', personality_type: 'yellow',
      scenario: '黄色性格顾客问："直接告诉我，用你们的产品多久能祛斑？要多少钱？"你应该怎么回答？',
      options: JSON.stringify([
        { key: 'A', text: '"这个不好说，因人而异。"', score: 3 },
        { key: 'B', text: '"通常28天可以看到明显改善，一个疗程是3个月。方案总价XXX元，算下来一天不到XX元。我给您看下其他顾客的效果对比。"', score: 20 },
        { key: 'C', text: '"很快的，一个月就有效果！价格好商量。"', score: 8 },
        { key: 'D', text: '"你先买一个试试看嘛。"', score: 3 }
      ]),
      correct_answer: 'B',
      answer_analysis: '黄色性格要确定性和数据支撑。给出明确时间节点（28天、3个月），拆解成本降低心理门槛，用真实案例增加可信度。',
      score: 20, sort_order: 1, difficulty: 'medium'
    },
    {
      level_id: 3, question_type: 'scenario', personality_type: 'red',
      scenario: '红色性格顾客在听完产品介绍后说："感觉还不错！还有什么搭配的吗？我想弄一套完整的。"}你应该怎么推荐？',
      options: JSON.stringify([
        { key: 'A', text: '"好的，全套加起来一共XXX元。"', score: 5 },
        { key: 'B', text: '"太好了姐！既然您要做就做全套的，效果翻倍！我帮您搭配一个豪华套餐：主品XX+辅品XX+保养XX，这一套用下来皮肤绝对亮翻天！而且套装比单买省了XX元，还额外送您XX小样！"', score: 20 },
        { key: 'C', text: '"不用买全套，买一个主品就够了。"', score: 5 },
        { key: 'D', text: '"等一下，我帮你算一下。"', score: 8 }
      ]),
      correct_answer: 'B',
      answer_analysis: '红色性格热爱"全套""豪华"这样的词，追求完整和超值。强调效果翻倍、节省金额、额外赠品，满足红色追求新奇和占便宜的心理。',
      score: 20, sort_order: 2, difficulty: 'medium'
    },

    // ===== 关卡4：异议处理话术 =====
    {
      level_id: 4, question_type: 'scenario', personality_type: 'yellow',
      scenario: '黄色性格顾客说："XX品牌也是做祛斑的，而且比你家便宜一半，成分看着也差不多。"你怎么回应？',
      options: JSON.stringify([
        { key: 'A', text: '"他们家便宜是便宜，但效果肯定没有我们好。"', score: 5 },
        { key: 'B', text: '"确实，表面看成分有点像。不过姐，效果好不只是看成分表，关键是XX技术。我们这个XX成分的提取工艺是专利的，吸收率是普通工艺的3倍。您看这个对比数据... 而且我们还有XX保障。便宜的买着省心吗？"', score: 20 },
        { key: 'C', text: '"那您去买XX品牌的吧。"', score: 2 },
        { key: 'D', text: '"我们家也可以给您打五折。"', score: 5 }
      ]),
      correct_answer: 'B',
      answer_analysis: '不贬低竞品（说他们差），而是强调差异化优势（技术专利、吸收率数据、售后保障）。用专业数据说话，最后反问"便宜的买着省心吗"触动黄色对价值的判断。',
      score: 20, sort_order: 1, difficulty: 'hard'
    },
    {
      level_id: 4, question_type: 'scenario', personality_type: 'green',
      scenario: '绿色性格顾客说："我再考虑考虑吧，回去跟老公商量一下。"你怎么回应？',
      options: JSON.stringify([
        { key: 'A', text: '"好的，考虑好了再来。"', score: 3 },
        { key: 'B', text: '"不用商量了，女人要对自己好一点！"', score: 5 },
        { key: 'C', text: '"当然可以姐！说明您老公很在乎您。不过这个活动确实很划算，要不这样：您先把产品带回去，我跟您一起跟您老公讲。或者我先帮您留着这个优惠名额，明天之前有效？"', score: 20 },
        { key: 'D', text: '"那您现在先交个定金吧。"', score: 8 }
      ]),
      correct_answer: 'C',
      answer_analysis: '绿色性格的"考虑考虑"通常是决策犹豫而非拒绝。先认可（老公在乎你），给退路（一起跟老公讲），制造紧迫感但不过度施压（保留优惠名额）。关键是给绿色安全感。',
      score: 20, sort_order: 2, difficulty: 'hard'
    },
    {
      level_id: 4, question_type: 'scenario', personality_type: 'red',
      scenario: '红色性格顾客说："好贵啊！能不能便宜点？"你怎么回应？',
      options: JSON.stringify([
        { key: 'A', text: '"不能便宜，这是公司定价。"', score: 3 },
        { key: 'B', text: '"姐我太理解了！不过这款真的是物超所值。我跟您说，很多明星都在用的同款配方。而且今天我给您申请一个专属福利——额外送您XX和XX，相当于省了XXX元！这可是只有我VIP客户才有的待遇哦~"', score: 20 },
        { key: 'C', text: '"行吧，给你打7折。"', score: 8 },
        { key: 'D', text: '"那您先买便宜的这款。"', score: 5 }
      ]),
      correct_answer: 'B',
      answer_analysis: '红色性格"要便宜"很多时候不是真的在乎价格，而是想要被重视、有特权感。用赠品代替降价（保护价格体系），强调"专属""VIP"满足红色的虚荣心。',
      score: 20, sort_order: 3, difficulty: 'hard'
    },

    // ===== 关卡5：成交促成话术 =====
    {
      level_id: 5, question_type: 'scenario', personality_type: 'blue',
      scenario: '蓝色性格顾客已经听了半小时介绍，看了所有检测报告和对比图，但一直没有表态。你应该怎么做？',
      options: JSON.stringify([
        { key: 'A', text: '继续介绍更多产品细节', score: 5 },
        { key: 'B', text: '"姐，您看了这么多资料，还有什么顾虑吗？是哪个方面还有疑问？我帮您一一解答。"', score: 20 },
        { key: 'C', text: '"您再不买活动就结束了！"', score: 3 },
        { key: 'D', text: '"要不您回家再想想？"', score: 5 }
      ]),
      correct_answer: 'B',
      answer_analysis: '蓝色性格不表态通常是因为还有未解决的疑问。直接但温和地询问顾虑，逐个击破。蓝色需要"所有问题都解答了"才会行动。',
      score: 20, sort_order: 1, difficulty: 'medium'
    },
    {
      level_id: 5, question_type: 'scenario', personality_type: 'red',
      scenario: '红色性格顾客说："好！就要这套！对了你们有没有赠品啊？有没有更划算的套餐？"这说明什么？你应该怎么做？',
      options: JSON.stringify([
        { key: 'A', text: '她还没决定，继续介绍', score: 2 },
        { key: 'B', text: '这是典型的成交信号！立即确认："太好了姐！我帮您搭配一个最划算的套餐，还额外送您XX。您是微信还是支付宝？"', score: 20 },
        { key: 'C', text: '"没有赠品，原价。"', score: 3 },
        { key: 'D', text: '"套餐要贵一些，您确定要吗？"', score: 5 }
      ]),
      correct_answer: 'B',
      answer_analysis: '红色性格说"好"还要赠品，说明已经决定买了，只是在享受购物的乐趣（讨价还价的快感）。立即响应、快速成交、用赠品满足她的"赢"的感觉。',
      score: 20, sort_order: 2, difficulty: 'easy'
    },

    // ===== 关卡6：老客户复购/裂变话术 =====
    {
      level_id: 6, question_type: 'scenario',
      scenario: '一位老客户使用产品一个月后来店里，主动跟你说："哇，真的有效果！我朋友都说我皮肤变好了！"你应该怎么做？',
      options: JSON.stringify([
        { key: 'A', text: '"那当然！我们的产品就是好。"', score: 5 },
        { key: 'B', text: '"太好了姐！您皮肤本来底子就好，现在是越来越好看了！对了，您身边有没有朋友也想改善皮肤的？介绍过来我给ta也好好分析分析，而且给您送一份专属礼物~"', score: 20 },
        { key: 'C', text: '"那您再买一套巩固一下？"', score: 8 },
        { key: 'D', text: '"效果好了就行，记得按时用。"', score: 5 }
      ]),
      correct_answer: 'B',
      answer_analysis: '客户主动表达满意是最佳的裂变时机！先赞美确认（您底子好+越来越好），然后趁热打铁引导转介绍，提供双方都有好处的激励。',
      score: 20, sort_order: 1, difficulty: 'medium'
    },
    {
      level_id: 6, question_type: 'scenario',
      scenario: '一位老客户产品快用完了，你发微信提醒她复购，她回复："最近手头有点紧，过段时间再说吧。"你怎么回复？',
      options: JSON.stringify([
        { key: 'A', text: '"好的，那到时候再说。"', score: 3 },
        { key: 'B', text: '"理解理解姐！那这样，我先帮您申请一个小体验装寄过去，免费的不用花钱。您先接着用别断档，等手头宽裕了再说正装的事。皮肤效果可不能断哦~"', score: 20 },
        { key: 'C', text: '"我们还有分期付款，要不要试试？"', score: 8 },
        { key: 'D', text: '"现在有优惠很划算，错过就没有了。"', score: 5 }
      ]),
      correct_answer: 'B',
      answer_analysis: '维护老客户关系比一单生意更重要。理解经济困难（共情），提供免费体验装（降低门槛），强调不要断档（专业关怀）。这样客户会感激你，等手头宽裕一定回来找你。',
      score: 20, sort_order: 2, difficulty: 'hard'
    },
    {
      level_id: 6, question_type: 'scenario',
      scenario: '你想在朋友圈做一次老带新裂变活动，以下哪种方案设计最有效？',
      options: JSON.stringify([
        { key: 'A', text: '"转发朋友圈，集满50个赞送试用装"', score: 8 },
        { key: 'B', text: '"老客户带新客户到店，双方各送价值XX元的护肤套装，老客户再额外享受下单8折"', score: 20 },
        { key: 'C', text: '"新客首单5折"', score: 5 },
        { key: 'D', text: '"充值1000元送500元"', score: 5 }
      ]),
      correct_answer: 'B',
      answer_analysis: '有效裂变三要素：双方都有好处（老客+新客都送）、降低推荐门槛（到店而非线上购买）、增加推荐动力（额外折扣）。单方面优惠效果远不如双方共赢。',
      score: 20, sort_order: 3, difficulty: 'medium'
    }
  ];

  const insert = db.prepare(`
    INSERT INTO ai_level_questions (level_id, question_type, scenario, options, correct_answer, answer_analysis, score, sort_order, difficulty, personality_type, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);

  const insertMany = db.transaction((items) => {
    for (const item of items) {
      insert.run(item.level_id, item.question_type, item.scenario,
        item.options, item.correct_answer, item.answer_analysis,
        item.score, item.sort_order, item.difficulty, item.personality_type);
    }
  });
  insertMany(questions);
}

function seedScenarios(db) {
  const count = await db.prepare('SELECT COUNT(*) as cnt FROM ai_coach_scenarios').get().cnt;
  if (count > 0) return;

  const scenarios = [
    {
      name: '进店犹豫型',
      personality_type: 'green',
      personality_name: '绿色（考拉型）',
      description: '顾客进店后表现犹豫，表示"随便看看"。性格温和但决策缓慢，需要引导和帮助做决定。',
      initial_intent: '随便看看，不着急，内心其实有需求但不敢主动表达',
      difficulty: 'easy',
      opening_line: '嗯...我就是在旁边看到了就进来了，你们这个...祛斑的是哪个啊？我脸上有点斑，不过我也不着急，就随便看看...',
      personality_traits: JSON.stringify({
        communication_style: '说话慢、声音小、常用"嗯""可能""随便"等词',
        decision_speed: '很慢，需要反复确认',
        core_fear: '怕做错决定、怕被推销',
        trust_building: '需要温暖关怀、耐心、安全感',
        buying_trigger: '被真诚打动、感受到关心、有人帮忙做决定'
      }),
      tips: '关键技巧：不要催促、多用"不买也没关系"降低压力、用温暖的话语拉近距离、帮她分析利弊并建议最佳选择、最后用二选一法帮她做决定。'
    },
    {
      name: '效果至上型',
      personality_type: 'yellow',
      personality_name: '黄色（老虎型）',
      description: '顾客目标明确，直接询问效果、价格和时间。不喜欢废话，要数据和结果。',
      initial_intent: '直接问最快多久见效、多少钱，要确定性的承诺',
      difficulty: 'medium',
      opening_line: '你好，你们店里祛斑效果怎么样？最快多久能看到效果？多少钱？我要最快见效的方案，别跟我绕弯子。',
      personality_traits: JSON.stringify({
        communication_style: '直接、语速快、说话有力、不啰嗦',
        decision_speed: '很快，一旦认可立即行动',
        core_fear: '浪费时间、被忽悠',
        trust_building: '用数据说话、给确定性承诺、专业高效',
        buying_trigger: '数据证明有效、性价比高、比自己预想的好'
      }),
      tips: '关键技巧：直接回答问题给数据、不绕弯、用对比图和案例说话、强调性价比、给出明确时间节点。不要讲太多废话。'
    },
    {
      name: '敏感多疑型',
      personality_type: 'blue',
      personality_name: '蓝色（猫头鹰型）',
      description: '顾客非常谨慎，反复询问安全性、成分、副作用等问题。需要专业背书和详细解释。',
      initial_intent: '反复确认安全性和效果，需要大量证据才会信任',
      difficulty: 'hard',
      opening_line: '你好，我想问一下，你们这个祛斑产品...成分是什么？有没有做过临床测试？会不会有副作用？我之前用过一次别家的产品过敏了，所以比较谨慎。你们有没有国家的备案资质？我可以看一下吗？',
      personality_traits: JSON.stringify({
        communication_style: '有条理、提问具体、会做功课、逻辑性强',
        decision_speed: '最慢，需要所有疑问都解答',
        core_fear: '被欺骗、产品不安全、做错误决策',
        trust_building: '专业数据、检测报告、真实案例、允许质疑',
        buying_trigger: '所有疑问被专业解答、感到被尊重和理解'
      }),
      tips: '关键技巧：认真对待每一个问题、提供检测报告和数据、引用权威认证、允许对方质疑、不要催促、用"问得好"认可对方的严谨。'
    },
    {
      name: '爱新鲜型',
      personality_type: 'red',
      personality_name: '红色（孔雀型）',
      description: '顾客对新事物充满好奇，容易被吸引，但注意力容易分散。喜欢被关注和赞美。',
      initial_intent: '对新项目好奇，容易被种草，但容易跑题或被其他产品吸引',
      difficulty: 'medium',
      opening_line: '哇！你们店好漂亮啊！这个是不是新品？我在小红书上看到过！你们最近有什么新出的项目吗？我特别喜欢尝试新东西！对了你们这个包装也太好看了吧！',
      personality_traits: JSON.stringify({
        communication_style: '热情、话多、跳跃性强、爱分享',
        decision_speed: '冲动型快，但也容易改变主意',
        core_fear: '无聊、被忽视、错过新鲜事物',
        trust_building: '赞美、新鲜感、社交认同、专属感',
        buying_trigger: '限量、新品、被赞美、有面子、有趣'
      }),
      tips: '关键技巧：先满足好奇心和社交需求、用赞美拉近距离、强调"新品""限量""独家"等词、用有趣的方式介绍产品、制造紧迫感（限量/快抢没了）、给她"内行人"的感觉。'
    }
  ];

  const insert = db.prepare(`
    INSERT INTO ai_coach_scenarios (name, personality_type, personality_name, description, initial_intent, difficulty, opening_line, personality_traits, tips, status, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `);

  const insertMany = db.transaction((items) => {
    items.forEach((item, idx) => {
      insert.run(item.name, item.personality_type, item.personality_name,
        item.description, item.initial_intent, item.difficulty, item.opening_line,
        item.personality_traits, item.tips, idx + 1);
    });
  });
  insertMany(scenarios);
}

function seedScripts(db) {
  const count = await db.prepare('SELECT COUNT(*) as cnt FROM ai_scripts').get().cnt;
  if (count > 0) return;

  const scripts = [
    {
      category: '开场白', personality_type: 'red', scenario: '进店/初次接触',
      script_content: '"哇姐，欢迎！您气质真好！今天怎么过来的？来，先坐下来喝杯茶~"',
      tips: '红色性格先给关注和赞美，不要急于推销。'
    },
    {
      category: '开场白', personality_type: 'yellow', scenario: '进店/初次接触',
      script_content: '"姐您好！想了解哪方面的产品？我直接给您介绍最适合的方案。"',
      tips: '黄色性格不废话，直接问需求给方案。'
    },
    {
      category: '开场白', personality_type: 'blue', scenario: '进店/初次接触',
      script_content: '"您好，欢迎。我们店主要提供XX服务，产品都是经过XX认证的。请问您目前主要想解决什么皮肤问题呢？"',
      tips: '蓝色性格先建立专业形象，用事实和认证说话。'
    },
    {
      category: '开场白', personality_type: 'green', scenario: '进店/初次接触',
      script_content: '"姐您好，欢迎~今天不着急慢慢看，有什么想了解的随时叫我就好。我给您倒杯水~"',
      tips: '绿色性格需要温馨的环境和不被打扰的安全感。'
    },
    {
      category: '需求挖掘', personality_type: '', scenario: '通用问诊',
      script_content: '"方便问一下，您这个问题大概多久了？之前有没有用过什么方法或者产品？"',
      tips: '用"时问"和"因问"了解问题历史，建立专业形象。'
    },
    {
      category: '异议处理', personality_type: '', scenario: '价格异议',
      script_content: '"我太理解了，谁都想买到性价比高的产品。姐，我帮您算一下，这个能用X个月，一天才X块钱。而且效果好才是真正省钱，不然买了便宜的没效果，钱也花了问题还在。"',
      tips: '先认可，再拆解日均成本，最后强调"效果好=省钱"的逻辑。'
    },
    {
      category: '异议处理', personality_type: '', scenario: '效果疑虑',
      script_content: '"这个担心太正常了，我特别理解。您看这是XX姐用了前后的对比图，28天就有明显变化。要不我先把试用装给您带回去试试？"',
      tips: '共情+案例+降低试错成本。'
    },
    {
      category: '成交促成', personality_type: '', scenario: '通用成交',
      script_content: '"姐，那我就帮您搭配这一套了。这套方案针对您XX问题是最合适的。您是微信支付还是支付宝？"',
      tips: '假定成交法+二选一法组合使用。'
    },
    {
      category: '复购引导', personality_type: '', scenario: '老客回访',
      script_content: '"姐好久不见！最近皮肤状态怎么样？上次用的那个产品感觉还好吗？现在正好有老客户专享活动，我帮您备上？"',
      tips: '关怀+效果确认+活动福利，三步走。'
    },
    {
      category: '裂变话术', personality_type: '', scenario: '转介绍',
      script_content: '"姐，您用得好就是我最大的动力！身边有没有朋友也有类似困扰的？介绍过来我给ta好好分析，同时给您送一份专属礼物~"',
      tips: '客户满意时是最佳裂变时机，给双方好处。'
    }
  ];

  const insert = db.prepare(`
    INSERT INTO ai_scripts (category, personality_type, scenario, script_content, tips, status, sort_order)
    VALUES (?, ?, ?, ?, ?, 1, ?)
  `);

  const insertMany = db.transaction((items) => {
    items.forEach((item, idx) => {
      insert.run(item.category, item.personality_type, item.scenario,
        item.script_content, item.tips, idx + 1);
    });
  });
  insertMany(scripts);
}

module.exports = { initAITrainingDB };
