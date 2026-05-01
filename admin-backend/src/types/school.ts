/**
 * 商学院管理模块 - TypeScript类型定义
 */

// 学习视频分类枚举
export enum VideoCategory {
  PRODUCT_KNOWLEDGE = 'product_knowledge',   // 产品知识
  SALES_SKILLS = 'sales_skills',             // 销售技巧
  TEAM_MANAGEMENT = 'team_management',       // 团队管理
  CUSTOMER_SERVICE = 'customer_service',     // 客户服务
  BRAND_CULTURE = 'brand_culture',           // 品牌文化
  MARKETING = 'marketing'                    // 营销推广
}

// 学习视频难度枚举
export enum VideoDifficulty {
  BEGINNER = 'beginner',      // 初级
  INTERMEDIATE = 'intermediate', // 中级
  ADVANCED = 'advanced'       // 高级
}

// 学习视频状态枚举
export enum VideoStatus {
  DRAFT = 'draft',           // 草稿
  PUBLISHED = 'published',   // 已发布
  DISABLED = 'disabled'      // 已禁用
}

// 学习视频接口
export interface LearningVideo {
  id: string;                        // 视频ID
  title: string;                     // 视频标题
  description: string;               // 视频描述
  coverUrl: string;                  // 封面图片URL
  videoUrl: string;                  // 视频文件URL
  duration: number;                  // 视频时长（秒）
  category: VideoCategory;          // 视频分类
  difficulty: VideoDifficulty;      // 视频难度
  status: VideoStatus;              // 视频状态
  order: number;                    // 显示顺序
  tags: string[];                   // 标签数组
  requiredLevel: number;            // 需要等级（0表示所有）
  views: number;                    // 观看次数
  likes: number;                    // 点赞数
  comments: number;                 // 评论数
  createdAt: string;                // 创建时间
  updatedAt: string;                // 更新时间
  createdBy: string;                // 创建人ID
  instructorName?: string;          // 讲师姓名
  instructorTitle?: string;         // 讲师头衔
  attachments?: VideoAttachment[];  // 附件列表
}

// 视频附件接口
export interface VideoAttachment {
  id: string;     // 附件ID
  name: string;   // 附件名称
  url: string;    // 附件URL
  type: string;   // 附件类型（pdf, doc, ppt等）
  size: number;   // 附件大小（字节）
}

// 视频学习记录接口
export interface VideoLearningRecord {
  id: string;                      // 记录ID
  userId: string;                  // 用户ID
  videoId: string;                 // 视频ID
  progress: number;                // 学习进度（0-100）
  lastPosition: number;            // 上次观看位置（秒）
  isCompleted: boolean;            // 是否完成学习
  completedAt?: string;            // 完成时间
  totalTime: number;               // 总学习时长（秒）
  notes?: string;                  // 学习笔记
  createdAt: string;               // 创建时间
  updatedAt: string;               // 更新时间
}

// 学习书籍分类枚举
export enum BookCategory {
  SALES_PSYCHOLOGY = 'sales_psychology',    // 销售心理学
  LEADERSHIP = 'leadership',               // 领导力
  COMMUNICATION = 'communication',         // 沟通技巧
  PERSONAL_DEVELOPMENT = 'personal_development', // 个人发展
  FINANCIAL_MANAGEMENT = 'financial_management', // 财务管理
  BUSINESS_MANAGEMENT = 'business_management'   // 企业管理
}

// 学习书籍状态枚举
export enum BookStatus {
  AVAILABLE = 'available',    // 可用
  READING = 'reading',        // 正在阅读
  COMPLETED = 'completed',    // 已完成
  RECOMMENDED = 'recommended' // 推荐阅读
}

// 电子书格式枚举
export enum EbookFormat {
  PDF = 'pdf',
  EPUB = 'epub',
  MOBI = 'mobi'
}

// 电子书质量等级枚举
export enum EbookQuality {
  STANDARD = 'standard',    // 标准质量
  HIGH = 'high',           // 高质量
  PREMIUM = 'premium'      // 优质资源
}

// 学习书籍接口（扩展为电子书接口）
export interface LearningBook {
  id: string;                        // 书籍ID
  title: string;                     // 书籍标题
  author: string;                    // 作者
  description: string;               // 书籍描述
  coverUrl: string;                  // 封面图片URL
  category: BookCategory;           // 书籍分类
  status: BookStatus;               // 书籍状态
  pages: number;                    // 页数
  readingTime?: number;             // 建议阅读时间（分钟）
  difficulty: VideoDifficulty;      // 阅读难度
  tags: string[];                   // 标签数组
  views: number;                    // 浏览次数
  downloads: number;                // 下载次数
  rating: number;                   // 评分（0-5）
  fileSize: number;                 // 文件大小（MB）
  fileFormat: EbookFormat;          // 文件格式
  fileUrl: string;                  // 文件下载URL
  isbn?: string;                    // ISBN号
  publisher?: string;               // 出版社
  publishedYear?: number;           // 出版年份
  uploadedAt: string;               // 上传时间
  isRecommended: boolean;           // 是否推荐
  createdAt: string;                // 创建时间
  updatedAt: string;                // 更新时间
  summary?: string;                 // 书籍摘要
  keyPoints?: string[];             // 关键要点
  quality?: EbookQuality;           // 资源质量
  previewUrl?: string;              // 预览URL
  thumbnailCount?: number;          // 缩略图数量
  lastDownloaded?: string;          // 最后下载时间
  downloadLimit?: number;           // 下载限制次数（-1表示无限制）
  featured: boolean;                // 是否特色资源
  access_level?: string;            // 查看权限等级
  is_top?: number;                  // 是否置顶
}

// 阅读记录接口
export interface ReadingRecord {
  id: string;                      // 记录ID
  userId: string;                  // 用户ID
  bookId: string;                  // 书籍ID
  progress: number;                // 阅读进度（0-100）
  currentPage: number;             // 当前页数
  isCompleted: boolean;            // 是否完成阅读
  completedAt?: string;            // 完成时间
  totalTime: number;               // 总阅读时长（分钟）
  notes?: string;                  // 阅读笔记
  createdAt: string;               // 创建时间
  updatedAt: string;               // 更新时间
}

// 话术场景枚举
export enum ScriptScene {
  INTRODUCTION = 'introduction',          // 自我介绍
  PRODUCT_PROMOTION = 'product_promotion', // 产品推广
  PRICE_NEGOTIATION = 'price_negotiation', // 价格谈判
  OBJECTION_HANDLING = 'objection_handling', // 异议处理
  FOLLOW_UP = 'follow_up',               // 跟进话术
  UPSELLING = 'upselling',               // 追加销售
  TEAM_RECRUITMENT = 'team_recruitment',  // 团队招募
  CUSTOMER_RELATIONSHIP = 'customer_relationship' // 客户关系维护
}

// 话术性格色彩枚举
export enum ScriptPersonality {
  RED = 'red',        // 红色性格（活泼型/孔雀型）
  YELLOW = 'yellow',  // 黄色性格（力量型/老虎型）
  BLUE = 'blue',      // 蓝色性格（完美型）
  GREEN = 'green'     // 绿色性格（和平型）
}

// 话术难度枚举
export enum ScriptDifficulty {
  EASY = 'easy',      // 简单
  MEDIUM = 'medium',  // 中等
  HARD = 'hard'       // 困难
}

// 话术接口
export interface SalesScript {
  id: string;                        // 话术ID
  title: string;                     // 话术标题
  scene: ScriptScene;               // 适用场景
  description: string;               // 话术描述
  content: string;                   // 话术内容
  personality: ScriptPersonality[]; // 适用性格
  difficulty: ScriptDifficulty;     // 话术难度
  tags: string[];                   // 标签数组
  usageCount: number;               // 使用次数
  successRate: number;              // 成功率（百分比）
  likes: number;                    // 点赞数
  shares: number;                   // 分享次数
  createdAt: string;                // 创建时间
  updatedAt: string;                // 更新时间
  createdBy: string;                // 创建人ID
  isTemplate: boolean;              // 是否为模板
  templateName?: string;            // 模板名称
  variables?: ScriptVariable[];     // 变量列表
  examples?: ScriptExample[];       // 使用示例
}

// 话术变量接口
export interface ScriptVariable {
  name: string;       // 变量名称
  type: string;       // 变量类型（text, number, select等）
  label: string;      // 变量标签
  defaultValue?: any; // 默认值
  options?: string[]; // 选项列表（用于select类型）
  required: boolean;  // 是否必填
}

// 话术示例接口
export interface ScriptExample {
  situation: string;  // 情境描述
  customerType: string; // 客户类型
  conversation: string[]; // 对话内容（数组，交替为客服和客户对话）
  result: string;    // 对话结果
  tips: string[];    // 技巧提示
}

// 话术练习记录接口
export interface ScriptPracticeRecord {
  id: string;                      // 记录ID
  userId: string;                  // 用户ID
  scriptId: string;                // 话术ID
  score: number;                   // 练习得分（0-100）
  duration: number;                // 练习时长（秒）
  attempts: number;                // 尝试次数
  feedback: string;               // 反馈建议
  aiEvaluation?: AIEvaluation;     // AI评估结果
  createdAt: string;               // 创建时间
  updatedAt: string;               // 更新时间
}

// AI评估接口
export interface AIEvaluation {
  score: number;                   // 综合评分
  pros: string[];                  // 优点
  cons: string[];                  // 改进点
  suggestions: string[];           // 建议
  keywords: string[];              // 关键词使用
  toneScore: number;               // 语调评分
  contentScore: number;            // 内容评分
  responseScore: number;           // 应变评分
}

// 行动日志类型枚举
export enum ActionLogType {
  SALES_GOAL = 'sales_goal',      // 销售目标
  TEAM_GOAL = 'team_goal',        // 团队目标
  LEARNING_GOAL = 'learning_goal', // 学习目标
  PERSONAL_GOAL = 'personal_goal', // 个人目标
  DAILY_TASK = 'daily_task',      // 日常任务
  WEEKLY_PLAN = 'weekly_plan',    // 周计划
  MONTHLY_PLAN = 'monthly_plan'   // 月计划
}

// 行动日志状态枚举
export enum ActionLogStatus {
  NOT_STARTED = 'not_started',   // 未开始
  IN_PROGRESS = 'in_progress',   // 进行中
  COMPLETED = 'completed',       // 已完成
  CANCELLED = 'cancelled',       // 已取消
  DELAYED = 'delayed'            // 已延期
}

// 行动日志优先级枚举
export enum ActionLogPriority {
  LOW = 'low',       // 低
  MEDIUM = 'medium', // 中
  HIGH = 'high',     // 高
  URGENT = 'urgent'  // 紧急
}

// 行动日志接口
export interface ActionLog {
  id: string;                        // 日志ID
  userId: string;                    // 用户ID
  type: ActionLogType;              // 日志类型
  title: string;                    // 日志标题
  description: string;               // 日志描述
  targetValue: number;               // 目标值
  currentValue: number;              // 当前值
  unit: string;                     // 单位（如：元、人、次等）
  startDate: string;                // 开始日期
  endDate: string;                  // 结束日期
  status: ActionLogStatus;          // 状态
  priority: ActionLogPriority;      // 优先级
  progress: number;                 // 进度百分比（0-100）
  notes?: string;                   // 备注
  milestones?: Milestone[];         // 里程碑列表
  rewards?: Reward[];               // 奖励列表
  challenges?: string[];            // 挑战列表
  solutions?: string[];             // 解决方案
  overdue?: boolean;                 // 是否逾期
  pointsReward?: number;             // 积分奖励
  tags?: string[];                   // 标签列表
  createdAt: string;                // 创建时间
  updatedAt: string;                // 更新时间
  completedAt?: string;             // 完成时间
}

// 里程碑接口
export interface Milestone {
  name: string;      // 里程碑名称
  value: number;     // 里程碑值
  completed: boolean; // 是否完成
  completedAt?: string; // 完成时间
  reward?: Reward;   // 奖励
}

// 奖励接口
export interface Reward {
  name: string;       // 奖励名称
  points: number;     // 积分奖励
  description: string; // 奖励描述
  unlocked: boolean;  // 是否已解锁
  unlockedAt?: string; // 解锁时间
}

// 积分记录接口
export interface PointsRecord {
  id: string;                      // 记录ID
  userId: string;                  // 用户ID
  points: number;                  // 积分变化（正数为增加，负数为减少）
  type: string;                    // 积分类型（learning, action, bonus等）
  description: string;             // 积分描述
  sourceId?: string;               // 来源ID（如视频ID、书籍ID等）
  sourceType?: string;             // 来源类型（video, book, script等）
  balance: number;                 // 余额（变化后的总积分）
  createdAt: string;               // 创建时间
}

// 学习统计接口
export interface LearningStatistics {
  totalVideos: number;                    // 总视频数
  completedVideos: number;                // 已完成视频数
  totalVideoTime: number;                 // 总视频学习时长（秒）
  totalBooks: number;                     // 总书籍数
  completedBooks: number;                 // 已完成书籍数
  totalReadingTime: number;               // 总阅读时长（分钟）
  totalScripts: number;                   // 总话术数
  practicedScripts: number;               // 已练习话术数
  averageScriptScore: number;             // 平均话术得分
  totalActionLogs: number;                // 总行动日志数
  completedActionLogs: number;            // 已完成行动日志数
  totalPoints: number;                    // 总积分
  availablePoints: number;                // 可用积分
  spentPoints: number;                    // 已使用积分
  learningStreak: number;                 // 连续学习天数
  lastLearningDate?: string;              // 最后学习日期
  weeklyProgress: WeeklyProgress[];       // 周进度统计
  categoryProgress: CategoryProgress[];   // 分类进度统计
}

// 周进度统计接口
export interface WeeklyProgress {
  week: string;          // 周标识（如：2026-W10）
  videos: number;        // 视频学习时长（秒）
  books: number;         // 书籍阅读时长（分钟）
  scripts: number;       // 话术练习次数
  actions: number;       // 行动日志完成数
  points: number;        // 积分获得数
}

// 分类进度统计接口
export interface CategoryProgress {
  category: string;      // 分类名称
  videos: number;        // 视频数量
  completed: number;     // 已完成数量
  progress: number;      // 进度百分比
  totalTime: number;     // 总学习时长
  averageScore?: number; // 平均得分（话术相关）
}

// 商学院查询参数接口
export interface SchoolQueryParams {
  page?: number;              // 页码
  pageSize?: number;          // 每页大小
  keyword?: string;           // 关键词搜索
  category?: string;          // 分类筛选
  difficulty?: string;        // 难度筛选
  status?: string;           // 状态筛选
  userId?: string;           // 用户ID筛选
  startDate?: string;        // 开始日期
  endDate?: string;          // 结束日期
  sortBy?: string;           // 排序字段
  sortOrder?: 'asc' | 'desc'; // 排序顺序
}

// 行动日志查询参数接口
export interface ActionLogQueryParams extends SchoolQueryParams {
  title?: string;            // 日志标题
  type?: ActionLogType;      // 日志类型
  priority?: ActionLogPriority; // 优先级
  overdue?: boolean;         // 是否逾期
}

// 商学院统计响应接口
export interface SchoolStatsResponse {
  videoStats: {
    total: number;            // 总视频数
    published: number;        // 已发布视频数
    draft: number;            // 草稿视频数
    disabled: number;         // 禁用视频数
    byCategory: Record<string, number>; // 按分类统计
    byDifficulty: Record<string, number>; // 按难度统计
  };
  bookStats: {
    total: number;            // 总书籍数
    available: number;        // 可用书籍数
    recommended: number;      // 推荐书籍数
    byCategory: Record<string, number>; // 按分类统计
  };
  scriptStats: {
    total: number;            // 总话术数
    templates: number;        // 模板数
    byScene: Record<string, number>; // 按场景统计
    byPersonality: Record<string, number>; // 按性格统计
  };
  userStats: {
    totalUsers: number;       // 总用户数
    activeUsers: number;      // 活跃用户数
    learningUsers: number;    // 学习用户数
    practiceUsers: number;    // 练习用户数
  };
  overallStats: {
    totalLearningTime: number;    // 总学习时长（小时）
    totalPracticeCount: number;   // 总练习次数
    averageCompletionRate: number; // 平均完成率
    totalPointsAwarded: number;   // 总积分奖励
    averageUserPoints: number;    // 平均用户积分
  };
}

// 话术查询参数接口
export interface ScriptQueryParams extends SchoolQueryParams {
  title?: string;
  category?: string;
  scenario?: string;
  personality?: string;
  status?: string;
  hot?: boolean;
}

// 话术统计接口
export interface ScriptStatistics {
  totalScripts: number;
  aiTrainingScripts: number;
  scenarioScripts: number;
  personalityScripts: number;
  commonQuestionScripts: number;
  salesPitchScripts: number;
  hotScripts: number;
  averageLikes: number;
  averageFavorites: number;
}

// 话术场景类型
export type ScriptScenario = 
  | 'welcome_call'
  | 'product_intro'
  | 'objection_handling'
  | 'closing_sale'
  | 'follow_up'
  | 'customer_service';

// AI训练结果接口
export interface ScriptTrainingResult {
  id: string;
  question: string;
  response: string;
  category: string;
  tags: string[];
  confidence: number;
  generatedAt: string;
  model: string;
}

// 话术练习记录接口
export interface ScriptPracticeRecord {
  id: string;
  userId: string;
  scriptId: string;
  startTime: string;
  endTime?: string;
  duration: number; // 练习时长（秒）
  score: number; // 练习得分（0-100）
  evaluation: string; // AI评估结果
  feedback: string; // 用户反馈
  recordings: string[]; // 录音文件URL
  createdAt: string;
  updatedAt: string;
}

// 电子书上传参数接口
export interface EbookUploadParams {
  title: string;
  author: string;
  description?: string;
  category: BookCategory;
  difficulty: VideoDifficulty;
  pages: number;
  file: File;
  isbn?: string;
  publisher?: string;
  publishedYear?: number;
  tags?: string[];
  summary?: string;
  keyPoints?: string[];
  quality?: EbookQuality;
}

// 电子书批量操作接口
export interface EbookBatchOperation {
  ids: string[];
  operation: 'publish' | 'unpublish' | 'delete' | 'recommend' | 'unrecommend';
  data?: any;
}

// 电子书查询参数接口（扩展自SchoolQueryParams）
export interface EbookQueryParams extends SchoolQueryParams {
  format?: EbookFormat;
  minSize?: number; // 最小文件大小（MB）
  maxSize?: number; // 最大文件大小（MB）
  minRating?: number; // 最低评分（0-5）
  featured?: boolean; // 是否特色资源
  recommended?: boolean; // 是否推荐
  downloaded?: boolean; // 是否已下载
}

// 电子书上传响应接口
export interface EbookUploadResponse {
  success: boolean;
  bookId: string;
  title: string;
  fileSize: number;
  fileFormat: EbookFormat;
  downloadUrl: string;
  previewUrl?: string;
  message?: string;
  errors?: string[];
}

// 电子书统计接口
export interface EbookStatistics {
  totalBooks: number;
  totalDownloads: number;
  totalFileSize: number; // 总文件大小（MB）
  byFormat: Record<EbookFormat, number>;
  byCategory: Record<BookCategory, number>;
  byQuality: Record<EbookQuality, number>;
  topDownloaded: LearningBook[];
  averageRating: number;
  lastUpload: string;
  uploadCount: number;
}

// 电子书管理响应接口
export interface EbookManagementResponse<T = any> {
  code: number;
  message: string;
  data: T;
  timestamp: number;
}

// 分页响应接口
export interface PaginatedResponse<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// 统一API响应接口
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
  timestamp: number;
}

// 导入/导出配置接口
export interface ImportExportConfig {
  format: 'csv' | 'json' | 'excel';
  fields: string[];
  includeMetadata?: boolean;
  includeFiles?: boolean;
}