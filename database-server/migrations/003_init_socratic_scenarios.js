/**
 * 苏格拉底式提问训练 - 初始化场景数据
 * 
 * 运行方式: node migrations/003_init_socratic_scenarios.js
 */
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../data/jinglaimei.db');
const db = new Database(dbPath, { readonly: false });

console.log('🎯 开始初始化苏格拉底式提问训练场景...\n');

// 创建表
db.exec(`
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
    ended_at DATETIME
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// 清空旧数据
db.prepare('DELETE FROM socratic_questions').run();
db.prepare('DELETE FROM socratic_scenarios').run();

// ===== 场景数据 =====
const scenarios = [
  // ==================== 1. 自媒体后台私信 ====================
  {
    name: '抖音私信咨询"这个真的能去痘吗？"',
    category: 'icebreaking',
    personality_type: 'red',
    difficulty: 'easy',
    description: '客户通过抖音私信发来第一条消息，询问产品效果。目标是从"随便问问"转化为"留微信/到店体验"。',
    customer_background: '28岁女性，被痘印困扰2年，用过各种网红产品但反复发作，对新产品持怀疑态度但又想尝试。',
    initial_situation: '"你这个真的能去痘印吗？我看别人发的效果好像挺好的，但是不知道真假..."',
    goal: '让客户主动加微信或留下联系方式，获取进一步沟通的机会。',
    tips: '红色性格客户热情但也容易跑题，多用澄清式提问聚焦她的核心需求，用假设式提问描绘美好愿景。',
    sort_order: 1
  },
  {
    name: '小红书私信"多少钱？"',
    category: 'icebreaking',
    personality_type: 'yellow',
    difficulty: 'medium',
    description: '客户直接问价格，说明有一定兴趣。但不能直接报价，需要先了解需求再引导价值。',
    customer_background: '35岁宝妈，注重性价比，时间紧张，不喜欢绕弯子，之前在别家买过类似产品感觉一般。',
    initial_situation: '"你好，我想问一下你们这个套装多少钱？我看朋友圈有人发过，不知道效果怎么样。"',
    goal: '了解客户真实痛点 → 建立信任 → 报价成交或邀约体验。',
    tips: '黄色性格客户直奔主题，不要说太多铺垫。用反向式提问让她自己意识到"便宜没好货"，再用总结式确认需求。',
    sort_order: 2
  },
  {
    name: '快手私信"你们是不是骗人的"',
    category: 'objection',
    personality_type: 'blue',
    difficulty: 'hard',
    description: '客户带着明显的防御和质疑来咨询，这是最好的转化机会——质疑代表有需求。',
    customer_background: '30岁男性帮妻子咨询（或理性女性），做过大量功课，看过很多负面评价，需要数据和证据说服。',
    initial_situation: '"我在网上看到好多人说你们是微商骗人的，成分跟大牌一样价格却贵好几倍，能不能解释一下？"',
    goal: '化解质疑 → 展示专业度 → 建立信任 → 引导试用。',
    tips: '蓝色性格客户需要证据和数据。不要辩解！用澄清式提问了解她具体看到了什么信息，用反向式提问让她思考"为什么同样成分效果不同"。',
    sort_order: 3
  },

  // ==================== 2. 微信聊天 ====================
  {
    name: '微信老客户"我脸上长痘很久了，用过很多都没用"',
    category: 'discovery',
    personality_type: 'green',
    difficulty: 'easy',
    description: '已有微信但从未成交的老潜在客户，主动找你聊天。这是深度挖掘需求的最佳时机。',
    customer_background: '26岁敏感肌女生，性格温和不善拒绝，之前因为不好意思一直没买，现在痘痘越来越严重终于下定决心想解决。',
    initial_situation: '"其实我脸上长痘很久了...用过很多产品都没什么效果，我也不知道该怎么办了😔"',
    goal: '挖掘深层原因 → 建立情感连接 → 推荐方案 → 成交或邀约。',
    tips: '绿色性格客户决策慢、怕冲突、需要安全感。多倾听、多共情，用引导式提问帮她自己做决定。切忌施压催单！',
    sort_order: 10
  },
  {
    name: '微信沉默客户突然冒泡"在吗"',
    category: 'icebreaking',
    personality_type: 'red',
    difficulty: 'medium',
    description: '沉寂了很久的客户突然发来"在吗"，可能是看到别人用了效果好，也可能是想比价。',
    customer_background: '29岁爱美的年轻妈妈，之前加了你但一直观望，最近看朋友皮肤变好了有点心动。',
    initial_situation: '"在吗？"',
    goal: '快速破冰 → 了解动机 → 判断意向 → 推进下一步。',
    tips: '不要回"在的，怎么了？"这种被动回复！用开放式提问引发她多说，判断她是真有兴趣还是随口一问。',
    sort_order: 11
  },
  {
    name: '微信客户"你家有效果吗？我考虑考虑"',
    category: 'objection',
    personality_type: 'yellow',
    difficulty: 'medium',
    description: '典型的"考虑考虑"型客户——不是不需要，而是不确定值不值。需要用提问让她自己说出"值得"。 ',
    customer_background: '32岁职场女性，理性消费，买任何东西都要对比三家，之前被其他品牌坑过所以格外谨慎。',
    initial_situation: '"你们家的产品有效果吗？我看看吧...我再考虑考虑，不着急。" ',
    goal: '找到犹豫根因 → 消除顾虑 → 制造紧迫感 → 推动决策。',
    tips: '黄色性格客户的"考虑考虑"往往意味着"还没被说服性价比"。用假设式提问让她想象"如果继续这样下去"的后果，用反向提问挑战"考虑多久才算够"。',
    sort_order: 12
  },

  // ==================== 3. 陌生顾客第一次接触 ====================
  {
    name: '门店进店"我就是随便看看"',
    category: 'discovery',
    personality_type: 'green',
    difficulty: 'medium',
    description: '顾客进店后说"随便看看"，这是标准的防御性回答。目标是打破防御建立初步信任。',
    customer_background: '40岁左右女性，可能被导购推销烦了，进店时已经竖起了心理防线，不想被纠缠但又确实有护肤需求。',
    initial_situation: '(顾客进门四处张望了一下) "哦，我就是随便看看，不用管我。" ',
    goal: '降低防备 → 发现需求 → 留下联系方式或邀请体验。',
    tips: '绿色性格客户最怕被推销。先用轻松的澄清式提问了解她在关注什么，千万不要一上来就介绍产品！让她感到"这里不一样"。',
    sort_order: 20
  },
  {
    name: '地推/展会上"不需要，谢谢"',
    category: 'icebreaking',
    personality_type: 'blue',
    difficulty: 'hard',
    description: '地推或展会上的标准拒绝。大多数销售就此放弃，但苏格拉底式提问可以把"不需要"变成"让我听听"。 ',
    customer_background: '忙碌的路人，每天被各种推销打扰，已经形成了条件反射式的拒绝模式，但其实内心可能正好有相关需求。',
    initial_situation: '(脚步不停) "不需要，谢谢。" (准备走开)',
    goal: '一句话留住 → 引起好奇 → 获取30秒沟通机会。',
    tips: '蓝色性格客户不会因为热情被打动，但会被有趣的问题吸引。用反向式提问打破她的"不需要"惯性思维——关键是要出其不意。',
    sort_order: 21
  },
  {
    name: '电话陌拜"你怎么知道我电话号的"',
    category: 'icebreaking',
    personality_type: 'red',
    difficulty: 'hard',
    description: '电话陌拜第一句话就被质问来源。处理得好可以转化为一次有效沟通，处理不好直接挂断。 ',
    customer_background: '接到推销电话时正在忙别的，对陌生号码本来就有戒备，加上最近诈骗电话多更加警惕。',
    initial_situation: '"喂？...你是谁啊？你怎么知道我电话号的？"(语气警惕)',
    goal: '化解抵触 → 建立合法身份 → 引起兴趣 → 争取1分钟时间。',
    tips: '红色性格客户情绪主导，先化解情绪问题再谈业务。用澄清式提问把焦点从"你怎么知道的"转移到"您的皮肤问题"上。',
    sort_order: 22
  },

  // ==================== 4. 各行各业陌生拜访 ====================
  {
    name: '美容店老板娘"我现在做9.9元次卡，累死了"',
    category: 'closing',
    personality_type: 'yellow',
    difficulty: 'hard',
    description: '美容店老板娘是完美的潜在代理商/合作对象。她有客源、懂行业、但被低利润模式困住。关键是让她自己意识到"有更好的方式"。 ',
    customer_background: '经营小型美容工作室3年，技术不错但不懂营销，靠低价引流维持生意，每天累死累活但赚不到钱，想过改变但不知道怎么改。',
    initial_situation: '"哎呀我现在做这个9.9元次卡，客人是多但都不赚钱，每天从早忙到晚腰都直不起来...唉，你说怎么办？"(一边按摩一边叹气)',
    goal: '让她意识到当前模式的不可持续性 → 展示更好方案的价值 → 激发合作意愿。',
    tips: '黄色性格客户看重效率和收益。用假设式提问让她自己算账——"如果有一种模式不需要您动手服务也能赚钱呢？"用反向式提问挑战"9.9元模式真的可持续吗"。',
    sort_order: 30
  },
  {
    name: '服装店主"我现在挺忙的"',
    category: 'discovery',
    personality_type: 'blue',
    difficulty: 'hard',
    description: '服装店主通常有稳定的客流和社群基础，是最好的跨界合作对象。但她很忙，需要用高效的方式证明价值。',
    customer_background: '经营女装店5年，有自己的VIP微信群约300人，一直在寻找增加收入的方式但没有太多时间去考察新项目。',
    initial_situation: '(正在整理衣服，头也不抬) "我现在挺忙的，你有事快说吧，我一会儿还要进货。" ',
    goal: '30秒内引起兴趣 → 1分钟内展示价值 → 留下联系方式 + 下一步约定。',
    tips: '蓝色性格客户尊重专业和效率。不要废话！直接用一个有力的问题开场："王姐，您有没有算过您的300个VIP一年在护肤品上花了多少钱？"然后用数据说话。',
    sort_order: 31
  },
  {
    name: '微商团队长"我有自己的团队和产品了"',
    category: 'objection',
    personality_type: 'red',
    difficulty: 'hard',
    description: '已经有团队的微商是最难开发的——她觉得自己什么都懂。但实际上她可能正因为业绩下滑而焦虑。 ',
    customer_background: '带50人团队做某品牌2年，曾经月入过5万但现在只有1万不到，团队成员流失严重，自己在考虑转型但又舍不得放弃已有的投入。',
    initial_situation: '"哈哈谢谢你的好意啦~不过我自己也有团队和产品的，做得还不错呢！(笑容里透着一丝疲惫)" ',
    goal: '了解真实困境 → 展示差异化价值 → 建立"第二增长曲线"概念 → 激发合作兴趣。',
    tips: '红色性格客户爱面子，不能直接说她现在的产品不行。用澄清式提问了解她团队的真实状况，用假设式提问探索"如果有互补产品会不会更好"的可能性。让她自己发现问题。',
    sort_order: 32
  }
];

// 插入场景
const insertScenario = db.prepare(`
  INSERT INTO socratic_scenarios 
  (name, category, personality_type, difficulty, description, customer_background, initial_situation, goal, tips, sort_order)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

let scenarioIdMap = {};
for (const s of scenarios) {
  const result = insertScenario.run(s.name, s.category, s.personality_type || '', s.difficulty || 'medium', 
    s.description || '', s.customer_background || '', s.initial_situation || '', 
    s.goal || '', s.tips || '', s.sort_order || 0);
  scenarioIdMap[s.name] = result.lastInsertRowid;
  console.log(`✅ 场景: ${s.name} [ID:${result.lastInsertRowid}]`);
}

// 为每个场景添加标准示例问题
const questionsByScenario = {
  '抖音私信咨询"这个真的能去痘吗？"': [
    { type: 'clarification', text: '您说的"去痘印"是指新长的痘痘还是以前留下的印子呢？', purpose: '明确客户的具体问题' },
    { type: 'hypothesis', text: '如果有一个方法不是单纯祛痘而是调理肤质让它不再反复长，您愿意花几分钟了解一下吗？', purpose: '测试购买意愿+描绘愿景' },
    { type: 'guiding', text: '除了痘印这个问题，您平时护肤最头疼的是什么？', purpose: '扩展需求范围' },
    { type: 'summary', text: '所以我理解下来，您主要关心的是痘印能否真正去掉而且不反弹，对吗？', purpose: '确认理解+建立专业感' },
  ],
  '小红书私信"多少钱？"': [
    { type: 'clarification', text: '方便问一下您主要是想解决哪方面的肌肤问题吗？不同情况方案会有区别', purpose: '从价格转向需求' },
    { type: 'reverse', text: '您之前用过的产品里效果最好的一款大概是什么价位？', purpose: '了解预算+建立参照' },
    { type: 'hypothesis', text: '假如有一款产品虽然单价看起来不便宜，但一瓶能用三个月而且效果明显，您觉得划算吗？', purpose: '重塑性价比认知' },
  ],
  '快手私信"你们是不是骗人的"': [
    { type: 'clarification', text: '您看到的那些负面评价具体是说哪些方面的问题呢？成分？效果还是售后？', purpose: '了解具体疑虑点' },
    { type: 'reverse', text: '您有没有想过为什么同样的评价有人说是骗局有人说改变了她们的皮肤？', purpose: '引发独立思考' },
    { type: 'guiding', text: '您选择护肤品最看重的是哪三个因素？我可以针对性地给您分析一下我们的产品', purpose: '回归理性决策' },
  ],
  '微信老客户"我脸上长痘很久了，用过很多都没用"': [
    { type: 'clarification', text: '您用过的那些产品大概都是什么类型的呀？药膏还是护肤品？', purpose: '了解过往经历' },
    { type: 'hypothesis', text: '如果现在有一种方案是从根源调理而不是表面压制，您愿意试试吗？', purpose: '提供新思路' },
    { type: 'guiding', text: '那您停用那些产品之后，痘痘的情况是好转了还是又复发了？', purpose: '深入挖掘' },
    { type: 'summary', text: '听起来您试了很多方法但总是反复，核心诉求是找到一个能从根本上改善的对吗？', purpose: '共情+确认' },
  ],
  '微信沉默客户突然冒泡"在吗"': [
    { type: 'clarification', text: '在的呢~是有什么想了解的还是看到什么感兴趣的了？', purpose: '开放性探询动机' },
    { type: 'guiding', text: '最近朋友圈发的那个XX活动你有关注到吗？', purpose: '试探兴趣方向' },
    { type: 'hypothesis', text: '是不是最近皮肤有什么新的想法想聊聊？', purpose: '给台阶下' },
  ],
  '微信客户"你家有效果吗？我考虑考虑"': [
    { type: 'clarification', text: '我理解您的谨慎。您主要是在担心哪个方面呢？效果、安全性还是价格？', purpose: '定位犹豫根因' },
    { type: 'reverse', text: '您说"考虑考虑"，一般您做这类决定会考虑多久呢？', purpose: '推动时间线' },
    { type: 'hypothesis', text: '如果您继续使用目前的产品，三个月后您觉得皮肤状态会比现在好还是会更焦虑？', purpose: '制造紧迫感' },
  ],
  '门店进店"我就是随便看看"': [
    { type: 'clarification', text: '没关系慢慢看~您平时比较关注护肤品的哪些方面呢？保湿还是抗老？', purpose: '无压力探需' },
    { type: 'guiding', text: '那边是我们新到的几个系列，您可以先感受一下质地，有任何问题随时叫我', purpose: '提供空间+保持联系' },
    { type: 'hypothesis', text: '如果有一款产品能让您在家就能享受院线级护理的效果，您会感兴趣了解吗？', purpose: '激发兴趣' },
  ],
  '地推/展会上"不需要，谢谢"': [
    { type: 'reverse', text: '完全理解！不过我很好奇，您平时用什么方式保养皮肤的？', purpose: '打破惯性' },
    { type: 'clarification', text: '打扰您3秒钟就好——您对目前的皮肤状态满意吗？就一个字回答我就走', purpose: '极简切入' },
    { type: 'hypothesis', text: '假如我能告诉您一个90%的人都忽略的护肤误区，您愿意听这30秒吗？', purpose: '好奇心驱动' },
  ],
  '美容店老板娘"我现在做9.9元次卡，累死了"': [
    { type: 'clarification', text: '您做这个9.9元的次卡，平均一个客户要花多少时间服务？', purpose: '量化痛点' },
    { type: 'guiding', text: '那一个月下来扣除房租人工这些，您到手的大概有多少？', purpose: '引导算账' },
    { type: 'hypothesis', text: '如果有一种模式客户自己在家就能解决问题，您只需要推荐产品一单赚几百而且不用动手服务，您觉得怎么样？', purpose: '展示替代方案' },
    { type: 'summary', text: '所以我听到的是您辛苦但不赚钱，核心问题是需要在服务和收入之间找到一个更好的平衡，是这个意思吗？', purpose: '共情总结' },
  ],
  '服装店主"我现在挺忙的"': [
    { type: 'reverse', text: '王姐，您知不知道您的300个VIP每年在护肤品上大概花了多少钱？', purpose: '数据冲击' },
    { type: 'hypothesis', text: '如果这部分钱其中一部分能变成您的收入而不是流向别人的口袋，您感兴趣吗？', purpose: '利益驱动' },
    { type: 'clarification', text: '我只占您两分钟。您现在的服装生意里有没有叠加过护肤品之类的配套产品？效果怎么样？', purpose: '快速了解现状' },
  ],
  '微商团队长"我有自己的团队和产品了"': [
    { type: 'clarification', text: '太厉害了带团队！那您现在团队大概多少人？大家最近的士气怎么样？', purpose: '肯定+探虚实' },
    { type: 'guiding', text: '您觉得现在团队最大的挑战是什么呢？招人还是留存？', purpose: '发现痛点' },
    { type: 'hypothesis', text: '如果有一款产品可以完美补充您现有的品类，让您团队的人均收入提升30%而且不影响现有业务，您愿意了解吗？', purpose: '双赢提案' },
    { type: 'reverse', text: '您说做得还不错——那和两年前刚起步的时候比，现在是更好了还是在维持？', purpose: '温和揭示问题' },
  ]
};

// 插入问题
const insertQuestion = db.prepare(`
  INSERT INTO socratic_questions (scenario_id, question_type, question_text, purpose, hint)
  VALUES (?, ?, ?, ?, ?)
`);

let totalQuestions = 0;
for (const [scenarioName, questions] of Object.entries(questionsByScenario)) {
  const sid = scenarioIdMap[scenarioName];
  if (!sid) continue;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    insertQuestion.run(sid, q.type, q.text, q.purpose, '');
    totalQuestions++;
  }
  console.log(`   └─ ${questions.length} 个示例问题`);
}

// 统计
const finalCount = db.prepare('SELECT COUNT(*) as cnt FROM socratic_scenarios').get();
console.log(`\n✅ 完成！共初始化 ${finalCount.cnt} 个训练场景，${totalQuestions} 个示例问题\n`);
console.log(`分类统计:`);
const catStats = db.prepare(`
  SELECT category, COUNT(*) as cnt FROM socratic_scenarios GROUP BY category
`).all();
catStats.forEach(c => console.log(`   ${c.category}: ${c.cnt} 个`));

db.close();
