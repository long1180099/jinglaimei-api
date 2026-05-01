/**
 * 商学院管理模块 - API服务
 */

import axios from 'axios';
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
  SchoolQueryParams,
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
  ActionLogPriority
} from '../types/school';

// API基础URL
const API_BASE = '/api/school';

// 请求配置
const axiosInstance = axios.create({
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 自动带上认证token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('jlm_auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
axiosInstance.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    console.error('API请求错误:', error);
    return Promise.reject(error);
  }
);

/**
 * 学习视频API
 */
export const videoApi = {
  // 获取视频列表
  getVideos: (params?: SchoolQueryParams) => {
    return axiosInstance.get(`${API_BASE}/videos`, { params });
  },

  // 获取单个视频详情
  getVideo: (id: string) => {
    return axiosInstance.get(`${API_BASE}/videos/${id}`);
  },

  // 创建视频
  createVideo: (video: Partial<LearningVideo>) => {
    return axiosInstance.post(`${API_BASE}/videos`, video);
  },

  // 更新视频
  updateVideo: (id: string, video: Partial<LearningVideo>) => {
    return axiosInstance.put(`${API_BASE}/videos/${id}`, video);
  },

  // 删除视频
  deleteVideo: (id: string) => {
    return axiosInstance.delete(`${API_BASE}/videos/${id}`);
  },

  // 批量更新视频状态
  batchUpdateVideoStatus: (ids: string[], status: VideoStatus) => {
    return axiosInstance.post(`${API_BASE}/videos/batch-status`, { ids, status });
  },

  // 获取视频分类统计
  getVideoCategoryStats: () => {
    return axiosInstance.get(`${API_BASE}/videos/stats/categories`);
  },

  // 获取视频难度统计
  getVideoDifficultyStats: () => {
    return axiosInstance.get(`${API_BASE}/videos/stats/difficulties`);
  },

  // 获取视频学习记录
  getVideoLearningRecords: (params?: SchoolQueryParams) => {
    return axiosInstance.get(`${API_BASE}/videos/learning-records`, { params });
  },

  // 获取用户的视频学习进度
  getUserVideoProgress: (userId: string, videoId?: string) => {
    const params = videoId ? { userId, videoId } : { userId };
    return axiosInstance.get(`${API_BASE}/videos/user-progress`, { params });
  },
};

/**
 * 学习书籍API (扩展电子书功能)
 */
export const bookApi = {
  // 获取书籍列表
  getBooks: (params?: SchoolQueryParams) => {
    return axiosInstance.get(`${API_BASE}/books`, { params });
  },

  // 获取单个书籍详情
  getBook: (id: string) => {
    return axiosInstance.get(`${API_BASE}/books/${id}`);
  },

  // 创建书籍
  createBook: (book: Partial<LearningBook>) => {
    return axiosInstance.post(`${API_BASE}/books`, book);
  },

  // 原子操作：上传文件+创建书籍（一步完成，避免两步状态问题）
  createBookWithFile: (file: File, bookData: Partial<LearningBook>) => {
    const formData = new FormData();
    formData.append('file', file);
    // 将书籍信息作为form字段传入（完整字段）
    if (bookData.title) formData.append('title', bookData.title);
    if (bookData.author) formData.append('author', bookData.author || '');
    if (bookData.description) formData.append('description', bookData.description || '');
    if (bookData.category) formData.append('category', bookData.category);
    if (bookData.difficulty) formData.append('difficulty', bookData.difficulty);
    if (bookData.pages) formData.append('pages', String(bookData.pages));
    if (bookData.readingTime) formData.append('reading_time', String(bookData.readingTime));
    if (bookData.tags && Array.isArray(bookData.tags)) formData.append('tags', JSON.stringify(bookData.tags));
    if (bookData.summary) formData.append('summary', bookData.summary);
    if (bookData.keyPoints && Array.isArray(bookData.keyPoints)) formData.append('keyPoints', JSON.stringify(bookData.keyPoints));
    if (bookData.status) formData.append('status', bookData.status);
    if (bookData.coverUrl) formData.append('coverUrl', bookData.coverUrl);
    if ((bookData as any).access_level) formData.append('access_level', (bookData as any).access_level);
    if ((bookData as any).is_top !== undefined) formData.append('is_top', String((bookData as any).is_top ? 1 : 0));

    return axiosInstance.post(`${API_BASE}/books/create-with-file`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000,
    });
  },

  // 更新书籍
  updateBook: (id: string, book: Partial<LearningBook>) => {
    return axiosInstance.put(`${API_BASE}/books/${id}`, book);
  },

  // 删除书籍
  deleteBook: (id: string) => {
    return axiosInstance.delete(`${API_BASE}/books/${id}`);
  },

  // 推荐/取消推荐书籍
  toggleBookRecommendation: (id: string, recommended: boolean) => {
    return axiosInstance.post(`${API_BASE}/books/${id}/recommend`, { recommended });
  },

  // 获取书籍分类统计
  getBookCategoryStats: () => {
    return axiosInstance.get(`${API_BASE}/books/stats/categories`);
  },

  // 获取阅读记录
  getReadingRecords: (params?: SchoolQueryParams) => {
    return axiosInstance.get(`${API_BASE}/books/reading-records`, { params });
  },

  // 获取用户的阅读进度
  getUserReadingProgress: (userId: string, bookId?: string) => {
    const params = bookId ? { userId, bookId } : { userId };
    return axiosInstance.get(`${API_BASE}/books/user-progress`, { params });
  },

  // 电子书上传
  uploadEbook: (formData: FormData) => {
    return axiosInstance.post(`${API_BASE}/books/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // 下载电子书
  downloadEbook: (id: string) => {
    return axiosInstance.get(`${API_BASE}/books/${id}/download`, {
      responseType: 'blob',
    });
  },

  // 预览电子书
  previewEbook: (id: string) => {
    return axiosInstance.get(`${API_BASE}/books/${id}/preview`);
  },

  // 批量操作电子书
  batchEbookOperation: (operation: string, data: any) => {
    return axiosInstance.post(`${API_BASE}/books/batch/${operation}`, data);
  },

  // 获取电子书统计
  getEbookStatistics: () => {
    return axiosInstance.get(`${API_BASE}/books/statistics`);
  },

  // 导入电子书
  importEbooks: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return axiosInstance.post(`${API_BASE}/books/import`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // 导出电子书列表
  exportEbooks: (params?: SchoolQueryParams) => {
    return axiosInstance.get(`${API_BASE}/books/export`, {
      params,
      responseType: 'blob',
    });
  },

  // 搜索电子书
  searchEbooks: (keyword: string, params?: SchoolQueryParams) => {
    const searchParams = { keyword, ...params };
    return axiosInstance.get(`${API_BASE}/books/search`, { params: searchParams });
  },

  // 获取热门电子书
  getPopularEbooks: (limit?: number) => {
    const params = limit ? { limit } : {};
    return axiosInstance.get(`${API_BASE}/books/popular`, { params });
  },

  // 获取特色电子书
  getFeaturedEbooks: (limit?: number) => {
    const params = limit ? { limit } : {};
    return axiosInstance.get(`${API_BASE}/books/featured`, { params });
  },

  // 更新电子书封面
  updateEbookCover: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('cover', file);
    return axiosInstance.post(`${API_BASE}/books/${id}/cover`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // 检查电子书格式
  checkEbookFormat: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return axiosInstance.post(`${API_BASE}/books/check-format`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // ==================== 分类管理 ====================

  // 获取电子书分类列表
  getCategories: () => {
    return axiosInstance.get(`${API_BASE}/books/categories`);
  },

  // 新增分类
  createCategory: (data: { name: string; icon?: string; sort_order?: number }) => {
    return axiosInstance.post(`${API_BASE}/books/categories`, data);
  },

  // 更新分类
  updateCategory: (id: number, data: { name?: string; icon?: string; sort_order?: number; status?: number }) => {
    return axiosInstance.put(`${API_BASE}/books/categories/${id}`, data);
  },

  // 删除分类
  deleteCategory: (id: number) => {
    return axiosInstance.delete(`${API_BASE}/books/categories/${id}`);
  },

  // ==================== 置顶管理 ====================

  // 置顶/取消置顶
  toggleBookTop: (id: string, isTop: boolean) => {
    return axiosInstance.put(`${API_BASE}/books/${id}/top`, { is_top: isTop });
  },

  // ==================== 阅读数据统计 ====================

  // 获取阅读数据统计（总阅读人数、热门TOP10、最近阅读记录）
  getReadingStats: () => {
    return axiosInstance.get(`${API_BASE}/books/reading-stats`);
  },
};

/**
 * 话术管理API
 */
export const scriptApi = {
  // 获取话术列表
  getScripts: (params?: SchoolQueryParams) => {
    return axiosInstance.get(`${API_BASE}/scripts`, { params });
  },

  // 获取单个话术详情
  getScriptById: (id: string) => {
    return axiosInstance.get(`${API_BASE}/scripts/${id}`);
  },

  // 获取单个话术详情（别名，兼容性）
  getScript: (id: string) => {
    return axiosInstance.get(`${API_BASE}/scripts/${id}`);
  },

  // 创建话术
  createScript: (script: Partial<SalesScript>) => {
    return axiosInstance.post(`${API_BASE}/scripts`, script);
  },

  // 更新话术
  updateScript: (id: string, script: Partial<SalesScript>) => {
    return axiosInstance.put(`${API_BASE}/scripts/${id}`, script);
  },

  // 删除话术
  deleteScript: (id: string) => {
    return axiosInstance.delete(`${API_BASE}/scripts/${id}`);
  },

  // 获取话术模板
  getScriptTemplates: () => {
    return axiosInstance.get(`${API_BASE}/scripts/templates`);
  },

  // 创建话术模板
  createScriptTemplate: (template: Partial<SalesScript>) => {
    return axiosInstance.post(`${API_BASE}/scripts/templates`, template);
  },

  // 获取话术场景统计
  getScriptSceneStats: () => {
    return axiosInstance.get(`${API_BASE}/scripts/stats/scenes`);
  },

  // 获取话术性格统计
  getScriptPersonalityStats: () => {
    return axiosInstance.get(`${API_BASE}/scripts/stats/personalities`);
  },

  // 获取练习记录
  getPracticeRecords: (params?: SchoolQueryParams) => {
    return axiosInstance.get(`${API_BASE}/scripts/practice-records`, { params });
  },

  // 开始话术练习
  startPractice: (scriptId: string, userId: string) => {
    return axiosInstance.post(`${API_BASE}/scripts/practice/start`, { scriptId, userId });
  },

  // 提交话术练习
  submitPractice: (record: Partial<ScriptPracticeRecord>) => {
    return axiosInstance.post(`${API_BASE}/scripts/practice/submit`, record);
  },

  // 获取AI评估
  getAIEvaluation: (practiceId: string) => {
    return axiosInstance.get(`${API_BASE}/scripts/practice/${practiceId}/evaluation`);
  },

  // 获取热门话术
  getHotScripts: (limit?: number) => {
    const params = limit ? { limit } : {};
    return axiosInstance.get(`${API_BASE}/scripts/hot`, { params });
  },

  // 获取话术统计
  getScriptStatistics: () => {
    return axiosInstance.get(`${API_BASE}/scripts/statistics`);
  },

  // AI话术训练
  trainAIScript: (question: string) => {
    return axiosInstance.post(`${API_BASE}/scripts/ai-training`, { question });
  },

  // 场景模拟
  simulateScenario: (params: { scenario: string; input: string }) => {
    return axiosInstance.post(`${API_BASE}/scripts/simulate`, params);
  },
};

/**
 * 行动日志API
 */
export const actionLogApi = {
  // 获取行动日志列表
  getActionLogs: (params?: SchoolQueryParams) => {
    return axiosInstance.get(`${API_BASE}/action-logs`, { params });
  },

  // 获取单个行动日志详情
  getActionLog: (id: string) => {
    return axiosInstance.get(`${API_BASE}/action-logs/${id}`);
  },

  // 创建行动日志
  createActionLog: (actionLog: Partial<ActionLog>) => {
    return axiosInstance.post(`${API_BASE}/action-logs`, actionLog);
  },

  // 更新行动日志
  updateActionLog: (id: string, actionLog: Partial<ActionLog>) => {
    return axiosInstance.put(`${API_BASE}/action-logs/${id}`, actionLog);
  },

  // 删除行动日志
  deleteActionLog: (id: string) => {
    return axiosInstance.delete(`${API_BASE}/action-logs/${id}`);
  },

  // 更新行动日志进度
  updateActionLogProgress: (id: string, progress: number, currentValue: number) => {
    return axiosInstance.post(`${API_BASE}/action-logs/${id}/progress`, { progress, currentValue });
  },

  // 完成行动日志
  completeActionLog: (id: string, notes?: string) => {
    return axiosInstance.post(`${API_BASE}/action-logs/${id}/complete`, { notes });
  },

  // 获取行动日志类型统计
  getActionLogTypeStats: () => {
    return axiosInstance.get(`${API_BASE}/action-logs/stats/types`);
  },

  // 获取行动日志状态统计
  getActionLogStatusStats: () => {
    return axiosInstance.get(`${API_BASE}/action-logs/stats/status`);
  },

  // 获取用户的行动日志统计
  getUserActionLogStats: (userId: string) => {
    return axiosInstance.get(`${API_BASE}/action-logs/user/${userId}/stats`);
  },
};

/**
 * 积分管理API
 */
export const pointsApi = {
  // 获取积分记录
  getPointsRecords: (params?: SchoolQueryParams) => {
    return axiosInstance.get(`${API_BASE}/points/records`, { params });
  },

  // 获取用户积分详情
  getUserPoints: (userId: string) => {
    return axiosInstance.get(`${API_BASE}/points/user/${userId}`);
  },

  // 添加积分
  addPoints: (userId: string, points: number, type: string, description: string, sourceId?: string) => {
    return axiosInstance.post(`${API_BASE}/points/add`, { userId, points, type, description, sourceId });
  },

  // 扣除积分
  deductPoints: (userId: string, points: number, type: string, description: string) => {
    return axiosInstance.post(`${API_BASE}/points/deduct`, { userId, points, type, description });
  },

  // 获取积分排行榜
  getPointsLeaderboard: (limit?: number) => {
    const params = limit ? { limit } : {};
    return axiosInstance.get(`${API_BASE}/points/leaderboard`, { params });
  },

  // 获取积分类型统计
  getPointsTypeStats: () => {
    return axiosInstance.get(`${API_BASE}/points/stats/types`);
  },

  // 获取积分趋势
  getPointsTrend: (days: number = 30) => {
    return axiosInstance.get(`${API_BASE}/points/trend`, { params: { days } });
  },
};

/**
 * 学习统计API
 */
export const statisticsApi = {
  // 获取学习统计
  getLearningStatistics: (userId?: string) => {
    const params = userId ? { userId } : {};
    return axiosInstance.get(`${API_BASE}/statistics/learning`, { params });
  },

  // 获取周进度统计
  getWeeklyProgress: (userId: string, weeks: number = 4) => {
    return axiosInstance.get(`${API_BASE}/statistics/weekly-progress`, { params: { userId, weeks } });
  },

  // 获取分类进度统计
  getCategoryProgress: (userId: string) => {
    return axiosInstance.get(`${API_BASE}/statistics/category-progress`, { params: { userId } });
  },

  // 获取用户活跃度统计
  getUserActivity: (days: number = 30) => {
    return axiosInstance.get(`${API_BASE}/statistics/user-activity`, { params: { days } });
  },

  // 获取系统整体统计
  getOverallStats: () => {
    return axiosInstance.get(`${API_BASE}/statistics/overall`);
  },

  // 导出学习报告
  exportLearningReport: (userId: string, startDate: string, endDate: string) => {
    return axiosInstance.get(`${API_BASE}/statistics/export-report`, {
      params: { userId, startDate, endDate },
      responseType: 'blob',
    });
  },
};

/**
 * 视频学习系统API（视频课程模块）
 */
export const videoCourseApi = {
  // ==================== 视频分类 ====================
  getCategories: () => axiosInstance.get(`${API_BASE}/videos/categories`),
  createCategory: (data: { name: string; icon?: string; description?: string; sort_order?: number }) =>
    axiosInstance.post(`${API_BASE}/videos/categories`, data),
  updateCategory: (id: number, data: any) => axiosInstance.put(`${API_BASE}/videos/categories/${id}`, data),
  deleteCategory: (id: number) => axiosInstance.delete(`${API_BASE}/videos/categories/${id}`),

  // ==================== 视频文件上传 ====================
  uploadVideo: (file: File) => {
    const formData = new FormData();
    formData.append('video', file);
    return axiosInstance.post(`${API_BASE}/videos/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
  },
  uploadCover: (file: File) => {
    const formData = new FormData();
    formData.append('cover', file);
    return axiosInstance.post(`${API_BASE}/videos/upload-cover`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // ==================== 视频CRUD ====================
  getVideos: (params?: any) => axiosInstance.get(`${API_BASE}/videos`, { params }),
  getVideo: (id: string | number) => axiosInstance.get(`${API_BASE}/videos/${id}`),
  createVideoWithFile: (file: File, videoData: any) => {
    const formData = new FormData();
    formData.append('video', file);
    if (videoData.title) formData.append('title', videoData.title);
    if (videoData.description) formData.append('description', videoData.description || '');
    if (videoData.category_id !== undefined) formData.append('category_id', String(videoData.category_id));
    if (videoData.access_level) formData.append('access_level', videoData.access_level);
    if (videoData.price !== undefined) formData.append('price', String(videoData.price));
    if (videoData.instructor) formData.append('instructor', videoData.instructor || '');
    if (videoData.duration) formData.append('duration', String(videoData.duration));
    if (videoData.difficulty) formData.append('difficulty', videoData.difficulty);
    if (videoData.tags && Array.isArray(videoData.tags)) formData.append('tags', JSON.stringify(videoData.tags));
    if (videoData.cover_url) formData.append('cover_url', videoData.cover_url);
    if (videoData.is_recommend) formData.append('is_recommend', '1');
    if (videoData.is_top) formData.append('is_top', '1');
    if (videoData.series_id) formData.append('series_id', String(videoData.series_id));
    return axiosInstance.post(`${API_BASE}/videos/create-with-file`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
  },
  updateVideo: (id: string | number, data: any) => axiosInstance.put(`${API_BASE}/videos/${id}`, data),
  deleteVideo: (id: string | number) => axiosInstance.delete(`${API_BASE}/videos/${id}`),
  toggleVideoStatus: (id: string | number) => axiosInstance.put(`${API_BASE}/videos/${id}/toggle-status`),

  // ==================== 系列课管理 ====================
  getSeriesList: (params?: any) => axiosInstance.get(`${API_BASE}/videos/series-list`, { params }),
  getSeriesDetail: (id: string | number) => axiosInstance.get(`${API_BASE}/videos/series-list/${id}`),
  createSeries: (data: any) => axiosInstance.post(`${API_BASE}/videos/series-list`, data),
  updateSeries: (id: string | number, data: any) => axiosInstance.put(`${API_BASE}/videos/series-list/${id}`, data),
  deleteSeries: (id: string | number) => axiosInstance.delete(`${API_BASE}/videos/series-list/${id}`),

  // ==================== 订单管理 ====================
  getOrders: (params?: any) => axiosInstance.get(`${API_BASE}/videos/orders`, { params }),

  // ==================== 数据统计 ====================
  getStats: () => axiosInstance.get(`${API_BASE}/videos/stats`),
};

/**
 * 商学院整体管理API
 */
export const schoolApi = {
  // 获取商学院总览统计
  getOverviewStats: () => {
    return axiosInstance.get(`${API_BASE}/overview/stats`);
  },

  // 获取最新学习活动
  getRecentActivities: (limit: number = 10) => {
    return axiosInstance.get(`${API_BASE}/overview/recent-activities`, { params: { limit } });
  },

  // 获取热门学习内容
  getPopularContent: (type?: 'video' | 'book' | 'script', limit: number = 10) => {
    const params = type ? { type, limit } : { limit };
    return axiosInstance.get(`${API_BASE}/overview/popular-content`, { params });
  },

  // 获取学习提醒
  getLearningReminders: (userId: string) => {
    return axiosInstance.get(`${API_BASE}/overview/reminders`, { params: { userId } });
  },

  // 获取推荐的下一项学习内容
  getNextRecommendation: (userId: string) => {
    return axiosInstance.get(`${API_BASE}/overview/next-recommendation`, { params: { userId } });
  },

  // 批量导入学习内容
  importContent: (type: 'video' | 'book' | 'script', file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    return axiosInstance.post(`${API_BASE}/overview/import`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // ==================== 真实行动日志管理（Admin后台） ====================

  // 行动日志总览（全部代理商汇总）
  getActionLogOverview: () => {
    return axiosInstance.get(`${API_BASE}/admin/action-log/overview`);
  },

  // 获取有行动日志的代理商标记列表
  getActionLogUsers: (params: { page?: number; pageSize?: number; keyword?: string; sortBy?: string }) => {
    return axiosInstance.get(`${API_BASE}/admin/action-log/users`, { params });
  },

  // 获取某个代理商的行动日志完整详情
  getActionLogUserDetail: (userId: string | number) => {
    return axiosInstance.get(`${API_BASE}/admin/action-log/user/${userId}`);
  },

  // 导出行动日志CSV
  exportActionLogCsv: () => {
    return axiosInstance.get(`${API_BASE}/admin/action-log/export`, { responseType: 'blob' });
  },
};

export default {
  videoApi,
  bookApi,
  scriptApi,
  actionLogApi,
  pointsApi,
  statisticsApi,
  schoolApi,
};