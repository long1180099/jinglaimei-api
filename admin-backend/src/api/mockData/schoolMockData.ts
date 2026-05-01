/**
 * 商学院管理模块 - 模拟数据
 */

import {
  LearningVideo,
  VideoLearningRecord,
  LearningBook,
  ReadingRecord,
  SalesScript,
  ScriptPracticeRecord,
  ActionLog,
  PointsRecord,
  LearningStatistics,
  SchoolStatsResponse,
  VideoCategory,
  VideoDifficulty,
  VideoStatus,
  BookCategory,
  BookStatus,
  ScriptScene,
  ScriptPersonality,
  ScriptDifficulty,
  ActionLogType,
  ActionLogStatus,
  ActionLogPriority,
  EbookFormat,
  EbookQuality
} from '../../types/school';

// 当前时间
const now = new Date().toISOString();
const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

// 生成随机ID
const generateId = () => Math.random().toString(36).substring(2, 15);

// 生成随机数字
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// 生成随机日期（过去一段时间内）
const randomDate = (start: Date, end: Date) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString();
};

// 学习视频模拟数据
export const mockVideos: LearningVideo[] = [
  {
    id: 'video-1',
    title: '静莱美产品深度解析',
    description: '详细介绍静莱美全系列产品特点、功效及使用方法',
    coverUrl: 'https://via.placeholder.com/300x200?text=产品解析',
    videoUrl: 'https://example.com/videos/product-intro.mp4',
    duration: 1200, // 20分钟
    category: VideoCategory.PRODUCT_KNOWLEDGE,
    difficulty: VideoDifficulty.BEGINNER,
    status: VideoStatus.PUBLISHED,
    order: 1,
    tags: ['产品知识', '基础培训'],
    requiredLevel: 1,
    views: 1234,
    likes: 56,
    comments: 12,
    createdAt: oneMonthAgo,
    updatedAt: oneWeekAgo,
    createdBy: 'admin-001',
    instructorName: '张老师',
    instructorTitle: '产品培训总监',
    attachments: [
      { id: 'attach-1', name: '产品手册.pdf', url: 'https://example.com/docs/product-guide.pdf', type: 'pdf', size: 512000 },
      { id: 'attach-2', name: '产品PPT.pptx', url: 'https://example.com/docs/product-ppt.pptx', type: 'ppt', size: 1024000 },
    ],
  },
  {
    id: 'video-2',
    title: '高效销售沟通技巧',
    description: '学习如何与客户建立信任关系，提高销售成功率',
    coverUrl: 'https://via.placeholder.com/300x200?text=销售技巧',
    videoUrl: 'https://example.com/videos/sales-skills.mp4',
    duration: 1800, // 30分钟
    category: VideoCategory.SALES_SKILLS,
    difficulty: VideoDifficulty.INTERMEDIATE,
    status: VideoStatus.PUBLISHED,
    order: 2,
    tags: ['销售技巧', '沟通技巧'],
    requiredLevel: 2,
    views: 890,
    likes: 42,
    comments: 8,
    createdAt: oneMonthAgo,
    updatedAt: oneWeekAgo,
    createdBy: 'admin-001',
    instructorName: '李老师',
    instructorTitle: '销售培训专家',
    attachments: [
      { id: 'attach-3', name: '沟通技巧手册.pdf', url: 'https://example.com/docs/communication-guide.pdf', type: 'pdf', size: 256000 },
    ],
  },
  {
    id: 'video-3',
    title: '团队管理与激励',
    description: '学习如何有效管理团队，提升团队凝聚力和执行力',
    coverUrl: 'https://via.placeholder.com/300x200?text=团队管理',
    videoUrl: 'https://example.com/videos/team-management.mp4',
    duration: 2400, // 40分钟
    category: VideoCategory.TEAM_MANAGEMENT,
    difficulty: VideoDifficulty.ADVANCED,
    status: VideoStatus.PUBLISHED,
    order: 3,
    tags: ['团队管理', '领导力'],
    requiredLevel: 3,
    views: 567,
    likes: 34,
    comments: 6,
    createdAt: oneMonthAgo,
    updatedAt: oneWeekAgo,
    createdBy: 'admin-001',
    instructorName: '王老师',
    instructorTitle: '团队管理专家',
  },
  {
    id: 'video-4',
    title: '客户服务与投诉处理',
    description: '学习如何提供优质客户服务，有效处理客户投诉',
    coverUrl: 'https://via.placeholder.com/300x200?text=客户服务',
    videoUrl: 'https://example.com/videos/customer-service.mp4',
    duration: 1500, // 25分钟
    category: VideoCategory.CUSTOMER_SERVICE,
    difficulty: VideoDifficulty.INTERMEDIATE,
    status: VideoStatus.PUBLISHED,
    order: 4,
    tags: ['客户服务', '投诉处理'],
    requiredLevel: 2,
    views: 432,
    likes: 28,
    comments: 4,
    createdAt: oneMonthAgo,
    updatedAt: oneWeekAgo,
    createdBy: 'admin-001',
    instructorName: '陈老师',
    instructorTitle: '客服培训经理',
  },
  {
    id: 'video-5',
    title: '静莱美品牌文化',
    description: '了解静莱美品牌发展历程、使命愿景和企业文化',
    coverUrl: 'https://via.placeholder.com/300x200?text=品牌文化',
    videoUrl: 'https://example.com/videos/brand-culture.mp4',
    duration: 900, // 15分钟
    category: VideoCategory.BRAND_CULTURE,
    difficulty: VideoDifficulty.BEGINNER,
    status: VideoStatus.PUBLISHED,
    order: 5,
    tags: ['品牌文化', '企业文化'],
    requiredLevel: 1,
    views: 765,
    likes: 39,
    comments: 7,
    createdAt: oneMonthAgo,
    updatedAt: oneWeekAgo,
    createdBy: 'admin-001',
    instructorName: '赵老师',
    instructorTitle: '品牌文化总监',
  },
  {
    id: 'video-6',
    title: '新媒体营销策略',
    description: '学习如何利用社交媒体和新媒体平台进行产品推广',
    coverUrl: 'https://via.placeholder.com/300x200?text=营销推广',
    videoUrl: 'https://example.com/videos/marketing-strategy.mp4',
    duration: 2100, // 35分钟
    category: VideoCategory.MARKETING,
    difficulty: VideoDifficulty.ADVANCED,
    status: VideoStatus.DRAFT,
    order: 6,
    tags: ['营销推广', '新媒体'],
    requiredLevel: 3,
    views: 0,
    likes: 0,
    comments: 0,
    createdAt: oneWeekAgo,
    updatedAt: oneDayAgo,
    createdBy: 'admin-001',
    instructorName: '孙老师',
    instructorTitle: '营销策划专家',
  },
];

// 学习书籍模拟数据
export const mockBooks: LearningBook[] = [
  {
    id: 'book-1',
    title: '销售心理学',
    author: '李明',
    description: '从心理学角度分析销售过程中的客户心理和行为',
    coverUrl: 'https://via.placeholder.com/200x300?text=销售心理学',
    category: BookCategory.SALES_PSYCHOLOGY,
    status: BookStatus.RECOMMENDED,
    pages: 256,
    readingTime: 300,
    difficulty: VideoDifficulty.INTERMEDIATE,
    tags: ['销售心理学', '客户心理'],
    views: 890,
    downloads: 234,
    createdAt: oneMonthAgo,
    updatedAt: oneWeekAgo,
    summary: '本书深入探讨销售过程中的心理机制，帮助销售人员更好地理解客户需求和行为模式',
    keyPoints: ['客户决策心理', '信任建立技巧', '异议处理方法', '成交心理策略'],
    fileUrl: 'https://example.com/books/sales-psychology.pdf',
    fileFormat: EbookFormat.PDF,
    rating: 4.5,
    fileSize: 3.2,
    uploadedAt: oneMonthAgo,
    isRecommended: true,
    featured: false,
    quality: EbookQuality.HIGH,
  },
  {
    id: 'book-2',
    title: '领导力的艺术',
    author: '王芳',
    description: '如何成为一名优秀的领导者，带领团队取得成功',
    coverUrl: 'https://via.placeholder.com/200x300?text=领导力的艺术',
    category: BookCategory.LEADERSHIP,
    status: BookStatus.RECOMMENDED,
    pages: 320,
    readingTime: 400,
    difficulty: VideoDifficulty.ADVANCED,
    tags: ['领导力', '团队管理'],
    views: 654,
    downloads: 178,
    createdAt: oneMonthAgo,
    updatedAt: oneWeekAgo,
    summary: '本书系统介绍领导力的核心要素和实践方法，帮助管理者提升领导能力',
    keyPoints: ['愿景设定', '决策制定', '团队激励', '冲突解决'],
    fileUrl: 'https://example.com/books/leadership-art.pdf',
    fileFormat: EbookFormat.PDF,
    rating: 4.2,
    fileSize: 4.1,
    uploadedAt: oneMonthAgo,
    isRecommended: true,
    featured: true,
    quality: EbookQuality.HIGH,
  },
  {
    id: 'book-3',
    title: '高效沟通技巧',
    author: '张伟',
    description: '提升职场沟通能力，建立良好人际关系',
    coverUrl: 'https://via.placeholder.com/200x300?text=高效沟通技巧',
    category: BookCategory.COMMUNICATION,
    status: BookStatus.AVAILABLE,
    pages: 192,
    readingTime: 240,
    difficulty: VideoDifficulty.BEGINNER,
    tags: ['沟通技巧', '人际关系'],
    views: 432,
    downloads: 123,
    createdAt: oneMonthAgo,
    updatedAt: oneWeekAgo,
    summary: '本书介绍职场沟通的基本原则和技巧，帮助读者提升沟通效率',
    keyPoints: ['倾听技巧', '表达方法', '反馈机制', '非语言沟通'],
    fileUrl: 'https://example.com/books/communication-skills.pdf',
    fileFormat: EbookFormat.PDF,
    rating: 3.9,
    fileSize: 2.8,
    uploadedAt: oneMonthAgo,
    isRecommended: false,
    featured: false,
    quality: EbookQuality.STANDARD,
  },
  {
    id: 'book-4',
    title: '个人发展计划',
    author: '刘洋',
    description: '制定个人发展目标，实现职业生涯规划',
    coverUrl: 'https://via.placeholder.com/200x300?text=个人发展计划',
    category: BookCategory.PERSONAL_DEVELOPMENT,
    status: BookStatus.AVAILABLE,
    pages: 224,
    readingTime: 280,
    difficulty: VideoDifficulty.BEGINNER,
    tags: ['个人发展', '职业规划'],
    views: 321,
    downloads: 89,
    createdAt: oneMonthAgo,
    updatedAt: oneWeekAgo,
    summary: '本书指导读者制定有效的个人发展计划，实现职业目标',
    keyPoints: ['目标设定', '能力评估', '学习计划', '进度跟踪'],
    fileUrl: 'https://example.com/books/personal-development.pdf',
    fileFormat: EbookFormat.PDF,
    rating: 4.0,
    fileSize: 3.0,
    uploadedAt: oneMonthAgo,
    isRecommended: false,
    featured: false,
    quality: EbookQuality.STANDARD,
  },
  {
    id: 'book-5',
    title: '财务管理基础',
    author: '陈强',
    description: '基础财务管理知识，帮助代理商合理规划财务',
    coverUrl: 'https://via.placeholder.com/200x300?text=财务管理基础',
    category: BookCategory.FINANCIAL_MANAGEMENT,
    status: BookStatus.AVAILABLE,
    pages: 288,
    readingTime: 360,
    difficulty: VideoDifficulty.INTERMEDIATE,
    tags: ['财务管理', '财务规划'],
    views: 210,
    downloads: 67,
    createdAt: oneMonthAgo,
    updatedAt: oneWeekAgo,
    summary: '本书介绍基础的财务管理知识，帮助代理商建立良好的财务习惯',
    keyPoints: ['预算编制', '成本控制', '利润分析', '税务规划'],
    fileUrl: 'https://example.com/books/financial-management.pdf',
    fileFormat: EbookFormat.PDF,
    rating: 4.1,
    fileSize: 3.5,
    uploadedAt: oneMonthAgo,
    isRecommended: false,
    featured: false,
    quality: EbookQuality.STANDARD,
  },
];

// 话术模拟数据
export const mockScripts: SalesScript[] = [
  {
    id: 'script-1',
    title: '产品介绍开场白',
    scene: ScriptScene.INTRODUCTION,
    description: '向新客户介绍静莱美产品的标准开场白',
    content: `您好，我是静莱美的代理商[姓名]。很高兴认识您！

静莱美是一家专注于高品质美妆护肤产品的公司，我们的产品采用纯天然植物精华，不含任何化学添加剂，为您提供安全有效的护肤体验。

您之前了解过我们的产品吗？`,
    personality: [ScriptPersonality.GREEN, ScriptPersonality.BLUE],
    difficulty: ScriptDifficulty.EASY,
    tags: ['开场白', '产品介绍'],
    usageCount: 245,
    successRate: 78,
    likes: 34,
    shares: 12,
    createdAt: oneMonthAgo,
    updatedAt: oneWeekAgo,
    createdBy: 'admin-001',
    isTemplate: true,
    templateName: '标准开场白模板',
    variables: [
      { name: 'name', type: 'text', label: '您的姓名', required: true },
      { name: 'product', type: 'text', label: '主要产品', required: true },
    ],
    examples: [
      {
        situation: '初次接触潜在客户',
        customerType: '注重产品安全的消费者',
        conversation: [
          '您好，我是静莱美的代理商张明。很高兴认识您！',
          '您好，请问有什么事吗？',
          '静莱美是一家专注于高品质美妆护肤产品的公司，我们的产品采用纯天然植物精华，不含任何化学添加剂，为您提供安全有效的护肤体验。',
          '听起来不错，你们有什么特色产品？',
          '我们最受欢迎的是XX精华，它含有XX植物提取物，可以有效改善皮肤问题。您之前了解过我们的产品吗？'
        ],
        result: '客户表现出兴趣，愿意进一步了解产品详情',
        tips: ['语气要亲切自然', '强调产品安全性', '适当提问了解客户需求'],
      },
    ],
  },
  {
    id: 'script-2',
    title: '价格异议处理话术',
    scene: ScriptScene.OBJECTION_HANDLING,
    description: '处理客户对价格敏感问题的标准话术',
    content: `我理解您对价格的关注。我们的产品价格虽然比一些普通品牌稍高，但这是因为它使用了纯天然原料和先进的生产工艺。

让我为您算一笔账：一瓶XX产品可以使用2-3个月，平均每天的成本不到2元，但却能为您带来显著的护肤效果。相比去美容院动辄上千元的费用，我们的产品性价比非常高。

而且，我们还有会员优惠和推荐奖励机制，长期使用其实更划算。`,
    personality: [ScriptPersonality.YELLOW, ScriptPersonality.RED],
    difficulty: ScriptDifficulty.MEDIUM,
    tags: ['价格异议', '价值塑造'],
    usageCount: 189,
    successRate: 65,
    likes: 28,
    shares: 9,
    createdAt: oneMonthAgo,
    updatedAt: oneWeekAgo,
    createdBy: 'admin-001',
    isTemplate: false,
    examples: [
      {
        situation: '客户认为产品价格过高',
        customerType: '注重性价比的消费者',
        conversation: [
          '你们的产品价格有点贵啊，有没有便宜点的？',
          '我理解您对价格的关注。我们的产品价格虽然比一些普通品牌稍高，但这是因为它使用了纯天然原料和先进的生产工艺。',
          '那和其他高端品牌相比呢？',
          '相比其他高端品牌，我们的产品性价比更高。让我为您算一笔账...',
        ],
        result: '客户认同产品价值，愿意考虑购买',
        tips: ['认同客户感受', '强调产品价值', '提供成本对比', '介绍优惠政策'],
      },
    ],
  },
  {
    id: 'script-3',
    title: '团队招募邀约话术',
    scene: ScriptScene.TEAM_RECRUITMENT,
    description: '邀请优秀人才加入代理商团队的话术',
    content: `我发现您在销售方面很有天赋，而且您对美妆护肤产品也很感兴趣。这正是我们团队需要的优秀人才！

加入我们的团队，您不仅可以获得优质的产品资源，还能获得：
1. 系统的培训支持
2. 清晰的晋升路径
3. 丰厚的收益回报
4. 强大的团队支持

如果您对发展副业或者创业感兴趣，我很乐意和您详细聊聊我们的商业模式和团队文化。`,
    personality: [ScriptPersonality.RED, ScriptPersonality.YELLOW],
    difficulty: ScriptDifficulty.HARD,
    tags: ['团队招募', '发展机会'],
    usageCount: 123,
    successRate: 45,
    likes: 19,
    shares: 6,
    createdAt: oneMonthAgo,
    updatedAt: oneWeekAgo,
    createdBy: 'admin-001',
    isTemplate: false,
    examples: [
      {
        situation: '发现具有潜力的客户或销售人才',
        customerType: '有创业意向的年轻人',
        conversation: [
          '我发现您在销售方面很有天赋，而且您对美妆护肤产品也很感兴趣。',
          '谢谢夸奖，我对这块确实挺有兴趣的。',
          '这正是我们团队需要的优秀人才！加入我们的团队，您可以获得系统的培训和支持...',
          '听起来不错，具体需要做些什么呢？',
          '我们提供完整的培训和指导。如果您有时间，我可以详细给您介绍我们的商业模式和团队文化。',
        ],
        result: '客户表示有兴趣深入了解，愿意参加后续面谈',
        tips: ['发现对方优势', '强调发展机会', '展示团队优势', '邀请深入交流'],
      },
    ],
  },
];

// 行动日志模拟数据
export const mockActionLogs: ActionLog[] = [
  {
    id: 'action-1',
    userId: 'user-001',
    type: ActionLogType.SALES_GOAL,
    title: '本月销售目标',
    description: '完成本月产品销售目标，提升个人销售业绩',
    targetValue: 50000,
    currentValue: 32000,
    unit: '元',
    startDate: '2026-03-01',
    endDate: '2026-03-31',
    status: ActionLogStatus.IN_PROGRESS,
    priority: ActionLogPriority.HIGH,
    progress: 64,
    notes: '已完成目标的64%，剩余18天时间',
    milestones: [
      { name: '完成30%', value: 15000, completed: true, completedAt: '2026-03-10' },
      { name: '完成60%', value: 30000, completed: true, completedAt: '2026-03-18' },
      { name: '完成80%', value: 40000, completed: false },
      { name: '完成100%', value: 50000, completed: false },
    ],
    rewards: [
      { name: '完成目标奖', points: 1000, description: '完成月度销售目标的奖励', unlocked: false },
      { name: '超额完成奖', points: 500, description: '超额完成10%以上的奖励', unlocked: false },
    ],
    challenges: ['市场竞争激烈', '客户预算有限', '时间紧迫'],
    solutions: ['加强客户关系维护', '突出产品优势', '增加沟通频率'],
    createdAt: '2026-02-28',
    updatedAt: now,
  },
  {
    id: 'action-2',
    userId: 'user-001',
    type: ActionLogType.TEAM_GOAL,
    title: '团队发展目标',
    description: '本月新增2名团队成员，扩大团队规模',
    targetValue: 2,
    currentValue: 1,
    unit: '人',
    startDate: '2026-03-01',
    endDate: '2026-03-31',
    status: ActionLogStatus.IN_PROGRESS,
    priority: ActionLogPriority.MEDIUM,
    progress: 50,
    notes: '已招募1名团队成员，还有1名在洽谈中',
    rewards: [
      { name: '团队发展奖', points: 500, description: '成功招募团队成员的奖励', unlocked: true, unlockedAt: '2026-03-15' },
      { name: '团队建设奖', points: 300, description: '完成团队建设任务的奖励', unlocked: false },
    ],
    createdAt: '2026-02-28',
    updatedAt: now,
  },
  {
    id: 'action-3',
    userId: 'user-001',
    type: ActionLogType.LEARNING_GOAL,
    title: '完成产品知识学习',
    description: '观看所有产品知识视频，掌握产品特点',
    targetValue: 3,
    currentValue: 2,
    unit: '个',
    startDate: '2026-03-01',
    endDate: '2026-03-20',
    status: ActionLogStatus.IN_PROGRESS,
    priority: ActionLogPriority.MEDIUM,
    progress: 67,
    notes: '已观看2个视频，还有1个视频待学习',
    milestones: [
      { name: '观看第一个视频', value: 1, completed: true, completedAt: '2026-03-05' },
      { name: '观看第二个视频', value: 2, completed: true, completedAt: '2026-03-12' },
      { name: '观看第三个视频', value: 3, completed: false },
    ],
    rewards: [
      { name: '学习达人奖', points: 200, description: '完成产品知识学习的奖励', unlocked: false },
    ],
    createdAt: '2026-03-01',
    updatedAt: now,
  },
  {
    id: 'action-4',
    userId: 'user-002',
    type: ActionLogType.DAILY_TASK,
    title: '每日客户跟进',
    description: '每天跟进3名潜在客户，提高转化率',
    targetValue: 3,
    currentValue: 3,
    unit: '人',
    startDate: '2026-03-25',
    endDate: '2026-03-25',
    status: ActionLogStatus.COMPLETED,
    priority: ActionLogPriority.URGENT,
    progress: 100,
    notes: '今日已完成3名客户跟进，其中1名已预约面谈',
    completedAt: now,
    createdAt: '2026-03-25T08:00:00',
    updatedAt: now,
  },
];

// 积分记录模拟数据
export const mockPointsRecords: PointsRecord[] = [
  {
    id: 'points-1',
    userId: 'user-001',
    points: 100,
    type: 'learning',
    description: '完成"静莱美产品深度解析"视频学习',
    sourceId: 'video-1',
    sourceType: 'video',
    balance: 100,
    createdAt: '2026-03-05T14:30:00',
  },
  {
    id: 'points-2',
    userId: 'user-001',
    points: 50,
    type: 'practice',
    description: '完成"产品介绍开场白"话术练习',
    sourceId: 'script-1',
    sourceType: 'script',
    balance: 150,
    createdAt: '2026-03-07T10:15:00',
  },
  {
    id: 'points-3',
    userId: 'user-001',
    points: 500,
    type: 'action',
    description: '成功招募1名团队成员',
    sourceId: 'action-2',
    sourceType: 'action',
    balance: 650,
    createdAt: '2026-03-15T16:45:00',
  },
  {
    id: 'points-4',
    userId: 'user-001',
    points: 200,
    type: 'reading',
    description: '完成"销售心理学"书籍阅读',
    sourceId: 'book-1',
    sourceType: 'book',
    balance: 850,
    createdAt: '2026-03-18T20:20:00',
  },
  {
    id: 'points-5',
    userId: 'user-002',
    points: 150,
    type: 'learning',
    description: '完成"高效销售沟通技巧"视频学习',
    sourceId: 'video-2',
    sourceType: 'video',
    balance: 150,
    createdAt: '2026-03-20T09:30:00',
  },
];

// 学习统计模拟数据
export const mockLearningStatistics: LearningStatistics = {
  totalVideos: 6,
  completedVideos: 2,
  totalVideoTime: 5400,
  totalBooks: 5,
  completedBooks: 1,
  totalReadingTime: 280,
  totalScripts: 3,
  practicedScripts: 1,
  averageScriptScore: 85,
  totalActionLogs: 4,
  completedActionLogs: 1,
  totalPoints: 850,
  availablePoints: 650,
  spentPoints: 200,
  learningStreak: 7,
  lastLearningDate: now,
  weeklyProgress: [
    { week: '2026-W11', videos: 1200, books: 60, scripts: 2, actions: 2, points: 200 },
    { week: '2026-W12', videos: 1800, books: 80, scripts: 3, actions: 3, points: 300 },
    { week: '2026-W13', videos: 1500, books: 70, scripts: 2, actions: 2, points: 250 },
    { week: '2026-W14', videos: 900, books: 70, scripts: 1, actions: 1, points: 100 },
  ],
  categoryProgress: [
    { category: '产品知识', videos: 1, completed: 1, progress: 100, totalTime: 1200, averageScore: 90 },
    { category: '销售技巧', videos: 1, completed: 0, progress: 0, totalTime: 0, averageScore: 0 },
    { category: '团队管理', videos: 1, completed: 0, progress: 0, totalTime: 0, averageScore: 0 },
    { category: '销售心理学', videos: 1, completed: 1, progress: 100, totalTime: 280, averageScore: 0 },
    { category: '领导力', videos: 1, completed: 0, progress: 0, totalTime: 0, averageScore: 0 },
  ],
};

// 商学院统计响应模拟数据
export const mockSchoolStats: SchoolStatsResponse = {
  videoStats: {
    total: 6,
    published: 5,
    draft: 1,
    disabled: 0,
    byCategory: {
      '产品知识': 1,
      '销售技巧': 1,
      '团队管理': 1,
      '客户服务': 1,
      '品牌文化': 1,
      '营销推广': 1,
    },
    byDifficulty: {
      '初级': 2,
      '中级': 2,
      '高级': 2,
    },
  },
  bookStats: {
    total: 5,
    available: 3,
    recommended: 2,
    byCategory: {
      '销售心理学': 1,
      '领导力': 1,
      '沟通技巧': 1,
      '个人发展': 1,
      '财务管理': 1,
    },
  },
  scriptStats: {
    total: 3,
    templates: 1,
    byScene: {
      '自我介绍': 1,
      '异议处理': 1,
      '团队招募': 1,
    },
    byPersonality: {
      '红色': 2,
      '黄色': 2,
      '蓝色': 1,
      '绿色': 1,
    },
  },
  userStats: {
    totalUsers: 156,
    activeUsers: 89,
    learningUsers: 67,
    practiceUsers: 45,
  },
  overallStats: {
    totalLearningTime: 2560,
    totalPracticeCount: 567,
    averageCompletionRate: 68.5,
    totalPointsAwarded: 25680,
    averageUserPoints: 164.6,
  },
};

// 生成模拟API响应
export const generateMockResponse = <T>(data: T, success: boolean = true, message: string = 'success') => {
  return {
    success,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
};

// API响应模拟函数
export const mockApiResponses = {
  // 视频相关
  getVideos: (params?: any) => {
    let filteredVideos = [...mockVideos];
    
    if (params?.keyword) {
      const keyword = params.keyword.toLowerCase();
      filteredVideos = filteredVideos.filter(video => 
        video.title.toLowerCase().includes(keyword) || 
        video.description.toLowerCase().includes(keyword) ||
        video.tags.some(tag => tag.toLowerCase().includes(keyword))
      );
    }
    
    if (params?.category) {
      filteredVideos = filteredVideos.filter(video => video.category === params.category);
    }
    
    if (params?.status) {
      filteredVideos = filteredVideos.filter(video => video.status === params.status);
    }
    
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 10;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    
    return generateMockResponse({
      items: filteredVideos.slice(start, end),
      total: filteredVideos.length,
      page,
      pageSize,
      totalPages: Math.ceil(filteredVideos.length / pageSize),
    });
  },
  
  getVideo: (id: string) => {
    const video = mockVideos.find(v => v.id === id);
    return generateMockResponse(video);
  },
  
  // 书籍相关
  getBooks: (params?: any) => {
    let filteredBooks = [...mockBooks];
    
    if (params?.keyword) {
      const keyword = params.keyword.toLowerCase();
      filteredBooks = filteredBooks.filter(book => 
        book.title.toLowerCase().includes(keyword) || 
        book.author.toLowerCase().includes(keyword) ||
        book.description.toLowerCase().includes(keyword)
      );
    }
    
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 10;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    
    return generateMockResponse({
      items: filteredBooks.slice(start, end),
      total: filteredBooks.length,
      page,
      pageSize,
      totalPages: Math.ceil(filteredBooks.length / pageSize),
    });
  },
  
  // 话术相关
  getScripts: (params?: any) => {
    let filteredScripts = [...mockScripts];
    
    if (params?.scene) {
      filteredScripts = filteredScripts.filter(script => script.scene === params.scene);
    }
    
    if (params?.difficulty) {
      filteredScripts = filteredScripts.filter(script => script.difficulty === params.difficulty);
    }
    
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 10;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    
    return generateMockResponse({
      items: filteredScripts.slice(start, end),
      total: filteredScripts.length,
      page,
      pageSize,
      totalPages: Math.ceil(filteredScripts.length / pageSize),
    });
  },
  
  // 行动日志相关
  getActionLogs: (params?: any) => {
    let filteredLogs = [...mockActionLogs];
    
    if (params?.userId) {
      filteredLogs = filteredLogs.filter(log => log.userId === params.userId);
    }
    
    if (params?.type) {
      filteredLogs = filteredLogs.filter(log => log.type === params.type);
    }
    
    if (params?.status) {
      filteredLogs = filteredLogs.filter(log => log.status === params.status);
    }
    
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 10;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    
    return generateMockResponse({
      items: filteredLogs.slice(start, end),
      total: filteredLogs.length,
      page,
      pageSize,
      totalPages: Math.ceil(filteredLogs.length / pageSize),
    });
  },
  
  // 统计相关
  getSchoolStats: () => {
    return generateMockResponse(mockSchoolStats);
  },
  
  getLearningStatistics: (params?: any) => {
    let stats = { ...mockLearningStatistics };
    
    if (params?.userId === 'user-001') {
      return generateMockResponse(stats);
    }
    
    // 返回通用统计（去掉用户特定数据）
    const genericStats = {
      ...stats,
      completedVideos: Math.floor(stats.totalVideos * 0.6),
      completedBooks: Math.floor(stats.totalBooks * 0.5),
      practicedScripts: Math.floor(stats.totalScripts * 0.7),
      averageScriptScore: 75,
      totalPoints: 5000,
      availablePoints: 3000,
      spentPoints: 2000,
      learningStreak: 3,
    };
    
    return generateMockResponse(genericStats);
  },
};

export default mockApiResponses;