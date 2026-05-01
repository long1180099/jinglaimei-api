/**
 * 商学院管理模块 - Redux切片
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  LearningVideo,
  LearningBook,
  SalesScript,
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
  SchoolQueryParams
} from '../../types/school';
import {
  videoApi,
  bookApi,
  scriptApi,
  actionLogApi,
  pointsApi,
  statisticsApi,
  schoolApi
} from '../../api/schoolApi';

// 初始状态接口
interface SchoolState {
  // 视频相关
  videos: LearningVideo[];
  videosLoading: boolean;
  videosError: string | null;
  selectedVideo: LearningVideo | null;
  
  // 书籍相关
  books: LearningBook[];
  booksLoading: boolean;
  booksError: string | null;
  selectedBook: LearningBook | null;
  
  // 话术相关
  scripts: SalesScript[];
  scriptsLoading: boolean;
  scriptsError: string | null;
  selectedScript: SalesScript | null;
  scriptTemplates: SalesScript[];
  hotScripts: SalesScript[];
  scriptStatistics: any;
  trainingLoading: boolean;
  simulationLoading: boolean;
  
  // 行动日志相关
  actionLogs: ActionLog[];
  actionLogsLoading: boolean;
  actionLogsError: string | null;
  selectedActionLog: ActionLog | null;
  actionLogStatistics: any;
  userActionLogStats: any;
  
  // 积分相关
  pointsRecords: PointsRecord[];
  pointsLoading: boolean;
  pointsError: string | null;
  userPoints: number;
  
  // 统计相关
  statistics: LearningStatistics | null;
  statisticsLoading: boolean;
  statisticsError: string | null;
  schoolStats: SchoolStatsResponse | null;
  schoolStatsLoading: boolean;
  schoolStatsError: string | null;
  
  // 查询参数
  queryParams: SchoolQueryParams;
  
  // 分页信息
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  
  // 选择状态
  selectedVideoIds: string[];
  selectedBookIds: string[];
  selectedScriptIds: string[];
  selectedActionLogIds: string[];
  
  // 操作状态
  operationLoading: boolean;
  operationError: string | null;
  operationSuccess: boolean;
}

// 初始状态
const initialState: SchoolState = {
  videos: [],
  videosLoading: false,
  videosError: null,
  selectedVideo: null,
  
  books: [],
  booksLoading: false,
  booksError: null,
  selectedBook: null,
  
  scripts: [],
  scriptsLoading: false,
  scriptsError: null,
  selectedScript: null,
  scriptTemplates: [],
  hotScripts: [],
  scriptStatistics: null,
  trainingLoading: false,
  simulationLoading: false,
  
  actionLogs: [],
  actionLogsLoading: false,
  actionLogsError: null,
  selectedActionLog: null,
  actionLogStatistics: null,
  userActionLogStats: null,
  
  pointsRecords: [],
  pointsLoading: false,
  pointsError: null,
  userPoints: 0,
  
  statistics: null,
  statisticsLoading: false,
  statisticsError: null,
  schoolStats: null,
  schoolStatsLoading: false,
  schoolStatsError: null,
  
  queryParams: {
    page: 1,
    pageSize: 10,
    keyword: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  },
  
  pagination: {
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
  },
  
  selectedVideoIds: [],
  selectedBookIds: [],
  selectedScriptIds: [],
  selectedActionLogIds: [],
  
  operationLoading: false,
  operationError: null,
  operationSuccess: false,
};

// 异步Thunks

// 获取视频列表
export const fetchVideos = createAsyncThunk(
  'school/fetchVideos',
  async (params: SchoolQueryParams = {}, { rejectWithValue }) => {
    try {
      const response = await videoApi.getVideos(params);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || '获取视频列表失败');
    }
  }
);

// 获取视频详情
export const fetchVideoById = createAsyncThunk(
  'school/fetchVideoById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await videoApi.getVideo(id);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || '获取视频详情失败');
    }
  }
);

// 创建视频
export const createVideo = createAsyncThunk(
  'school/createVideo',
  async (video: Partial<LearningVideo>, { rejectWithValue }) => {
    try {
      const response = await videoApi.createVideo(video);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || '创建视频失败');
    }
  }
);

// 更新视频
export const updateVideo = createAsyncThunk(
  'school/updateVideo',
  async ({ id, video }: { id: string; video: Partial<LearningVideo> }, { rejectWithValue }) => {
    try {
      const response = await videoApi.updateVideo(id, video);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || '更新视频失败');
    }
  }
);

// 删除视频
export const deleteVideo = createAsyncThunk(
  'school/deleteVideo',
  async (id: string, { rejectWithValue }) => {
    try {
      await videoApi.deleteVideo(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message || '删除视频失败');
    }
  }
);

// 批量更新视频状态
export const batchUpdateVideoStatus = createAsyncThunk(
  'school/batchUpdateVideoStatus',
  async ({ ids, status }: { ids: string[]; status: VideoStatus }, { rejectWithValue }) => {
    try {
      const response = await videoApi.batchUpdateVideoStatus(ids, status);
      return { ids, status, response };
    } catch (error: any) {
      return rejectWithValue(error.message || '批量更新视频状态失败');
    }
  }
);

// 获取书籍列表
export const fetchBooks = createAsyncThunk(
  'school/fetchBooks',
  async (params: SchoolQueryParams = {}, { rejectWithValue }) => {
    try {
      const response = await bookApi.getBooks(params);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || '获取书籍列表失败');
    }
  }
);

// 获取单本书籍详情
export const fetchBookById = createAsyncThunk(
  'school/fetchBookById',
  async (bookId: string, { rejectWithValue }) => {
    try {
      const response = await bookApi.getBook(bookId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || '获取书籍详情失败');
    }
  }
);

// 创建书籍
export const createBook = createAsyncThunk(
  'school/createBook',
  async (bookData: Partial<LearningBook>, { rejectWithValue }) => {
    try {
      const response = await bookApi.createBook(bookData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || '创建书籍失败');
    }
  }
);

// 更新书籍
export const updateBook = createAsyncThunk(
  'school/updateBook',
  async ({ id, bookData }: { id: string; bookData: Partial<LearningBook> }, { rejectWithValue }) => {
    try {
      const response = await bookApi.updateBook(id, bookData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || '更新书籍失败');
    }
  }
);

// 删除书籍
export const deleteBook = createAsyncThunk(
  'school/deleteBook',
  async (bookId: string, { rejectWithValue }) => {
    try {
      await bookApi.deleteBook(bookId);
      return bookId;
    } catch (error: any) {
      return rejectWithValue(error.message || '删除书籍失败');
    }
  }
);

// 切换书籍推荐状态
export const toggleBookRecommendation = createAsyncThunk(
  'school/toggleBookRecommendation',
  async ({ id, recommended }: { id: string; recommended: boolean }, { rejectWithValue }) => {
    try {
      const response = await bookApi.toggleBookRecommendation(id, recommended);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || '切换推荐状态失败');
    }
  }
);

// 获取话术列表
export const fetchScripts = createAsyncThunk(
  'school/fetchScripts',
  async (params: SchoolQueryParams = {}, { rejectWithValue }) => {
    try {
      const response = await scriptApi.getScripts(params);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || '获取话术列表失败');
    }
  }
);

// 获取话术模板
export const fetchScriptTemplates = createAsyncThunk(
  'school/fetchScriptTemplates',
  async (_, { rejectWithValue }) => {
    try {
      const response = await scriptApi.getScriptTemplates();
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || '获取话术模板失败');
    }
  }
);

// 获取行动日志列表
export const fetchActionLogs = createAsyncThunk(
  'school/fetchActionLogs',
  async (params: SchoolQueryParams = {}, { rejectWithValue }) => {
    try {
      const response = await actionLogApi.getActionLogs(params);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || '获取行动日志列表失败');
    }
  }
);

// 获取积分记录
export const fetchPointsRecords = createAsyncThunk(
  'school/fetchPointsRecords',
  async (params: SchoolQueryParams = {}, { rejectWithValue }) => {
    try {
      const response = await pointsApi.getPointsRecords(params);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || '获取积分记录失败');
    }
  }
);

// 获取学习统计
export const fetchLearningStatistics = createAsyncThunk(
  'school/fetchLearningStatistics',
  async (userId: string = '', { rejectWithValue }) => {
    try {
      const response = await statisticsApi.getLearningStatistics(userId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || '获取学习统计失败');
    }
  }
);

// 获取商学院统计
export const fetchSchoolStats = createAsyncThunk(
  'school/fetchSchoolStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await schoolApi.getOverviewStats();
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || '获取商学院统计失败');
    }
  }
);

// 获取行动日志类型统计
export const getActionLogTypeStats = createAsyncThunk(
  'school/getActionLogTypeStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await actionLogApi.getActionLogTypeStats();
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || '获取行动日志类型统计失败');
    }
  }
);

// 获取用户行动日志统计
export const getUserActionLogStats = createAsyncThunk(
  'school/getUserActionLogStats',
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await actionLogApi.getUserActionLogStats(userId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || '获取用户行动日志统计失败');
    }
  }
);

// 获取单个行动日志详情
export const fetchActionLogById = createAsyncThunk(
  'school/fetchActionLogById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await actionLogApi.getActionLog(id);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || '获取行动日志详情失败');
    }
  }
);

// 创建行动日志
export const createActionLog = createAsyncThunk(
  'school/createActionLog',
  async (data: Partial<ActionLog>, { rejectWithValue }) => {
    try {
      const response = await actionLogApi.createActionLog(data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || '创建行动日志失败');
    }
  }
);

// 更新行动日志
export const updateActionLog = createAsyncThunk(
  'school/updateActionLog',
  async ({ id, data }: { id: string; data: Partial<ActionLog> }, { rejectWithValue }) => {
    try {
      const response = await actionLogApi.updateActionLog(id, data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || '更新行动日志失败');
    }
  }
);

// 删除行动日志
export const deleteActionLog = createAsyncThunk(
  'school/deleteActionLog',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await actionLogApi.deleteActionLog(id);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || '删除行动日志失败');
    }
  }
);

// 更新行动日志进度
export const updateActionLogProgress = createAsyncThunk(
  'school/updateActionLogProgress',
  async ({ id, progress, currentValue }: { id: string; progress: number; currentValue: number }, { rejectWithValue }) => {
    try {
      const response = await actionLogApi.updateActionLogProgress(id, progress, currentValue);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || '更新行动日志进度失败');
    }
  }
);

// 完成行动日志
export const completeActionLog = createAsyncThunk(
  'school/completeActionLog',
  async ({ id, notes }: { id: string; notes?: string }, { rejectWithValue }) => {
    try {
      const response = await actionLogApi.completeActionLog(id, notes);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || '完成行动日志失败');
    }
  }
);

// 获取热门话术
export const getHotScripts = createAsyncThunk(
  'school/getHotScripts',
  async (_, { rejectWithValue }) => {
    try {
      const response = await scriptApi.getHotScripts();
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || '获取热门话术失败');
    }
  }
);

// 获取话术统计
export const getScriptStatistics = createAsyncThunk(
  'school/getScriptStatistics',
  async (_, { rejectWithValue }) => {
    try {
      const response = await scriptApi.getScriptStatistics();
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || '获取话术统计失败');
    }
  }
);

// AI话术训练
export const trainAIScript = createAsyncThunk(
  'school/trainAIScript',
  async (question: string, { rejectWithValue }) => {
    try {
      const response = await scriptApi.trainAIScript(question);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'AI话术训练失败');
    }
  }
);

// 场景模拟
export const simulateScenario = createAsyncThunk(
  'school/simulateScenario',
  async (params: { scenario: string; input: string }, { rejectWithValue }) => {
    try {
      const response = await scriptApi.simulateScenario(params);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || '场景模拟失败');
    }
  }
);

// 获取单个话术详情
export const fetchScriptById = createAsyncThunk(
  'school/fetchScriptById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await scriptApi.getScriptById(id);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || '获取话术详情失败');
    }
  }
);

// 创建话术
export const createScript = createAsyncThunk(
  'school/createScript',
  async (data: Partial<SalesScript>, { rejectWithValue }) => {
    try {
      const response = await scriptApi.createScript(data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || '创建话术失败');
    }
  }
);

// 更新话术
export const updateScript = createAsyncThunk(
  'school/updateScript',
  async ({ id, data }: { id: string; data: Partial<SalesScript> }, { rejectWithValue }) => {
    try {
      const response = await scriptApi.updateScript(id, data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || '更新话术失败');
    }
  }
);

// 删除话术
export const deleteScript = createAsyncThunk(
  'school/deleteScript',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await scriptApi.deleteScript(id);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || '删除话术失败');
    }
  }
);

// 创建切片
const schoolSlice = createSlice({
  name: 'school',
  initialState,
  reducers: {
    // 重置操作状态
    resetOperationState: (state) => {
      state.operationLoading = false;
      state.operationError = null;
      state.operationSuccess = false;
    },
    
    // 设置查询参数
    setQueryParams: (state, action: PayloadAction<Partial<SchoolQueryParams>>) => {
      state.queryParams = {
        ...state.queryParams,
        ...action.payload,
      };
    },
    
    // 重置查询参数
    resetQueryParams: (state) => {
      state.queryParams = {
        page: 1,
        pageSize: 10,
        keyword: '',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };
    },
    
    // 选择视频
    selectVideo: (state, action: PayloadAction<string>) => {
      const videoId = action.payload;
      if (state.selectedVideoIds.includes(videoId)) {
        state.selectedVideoIds = state.selectedVideoIds.filter(id => id !== videoId);
      } else {
        state.selectedVideoIds.push(videoId);
      }
    },
    
    // 选择所有视频
    selectAllVideos: (state, action: PayloadAction<boolean>) => {
      if (action.payload) {
        state.selectedVideoIds = state.videos.map(video => video.id);
      } else {
        state.selectedVideoIds = [];
      }
    },
    
    // 选择书籍
    selectBook: (state, action: PayloadAction<string>) => {
      const bookId = action.payload;
      if (state.selectedBookIds.includes(bookId)) {
        state.selectedBookIds = state.selectedBookIds.filter(id => id !== bookId);
      } else {
        state.selectedBookIds.push(bookId);
      }
    },
    
    // 选择话术
    selectScript: (state, action: PayloadAction<string>) => {
      const scriptId = action.payload;
      if (state.selectedScriptIds.includes(scriptId)) {
        state.selectedScriptIds = state.selectedScriptIds.filter(id => id !== scriptId);
      } else {
        state.selectedScriptIds.push(scriptId);
      }
    },
    
    // 选择行动日志
    selectActionLog: (state, action: PayloadAction<string>) => {
      const logId = action.payload;
      if (state.selectedActionLogIds.includes(logId)) {
        state.selectedActionLogIds = state.selectedActionLogIds.filter(id => id !== logId);
      } else {
        state.selectedActionLogIds.push(logId);
      }
    },
    
    // 设置选中的视频
    setSelectedVideo: (state, action: PayloadAction<LearningVideo | null>) => {
      state.selectedVideo = action.payload;
    },
    
    // 设置选中的书籍
    setSelectedBook: (state, action: PayloadAction<LearningBook | null>) => {
      state.selectedBook = action.payload;
    },
    
    // 设置选中的话术
    setSelectedScript: (state, action: PayloadAction<SalesScript | null>) => {
      state.selectedScript = action.payload;
    },
    
    // 设置选中的行动日志
    setSelectedActionLog: (state, action: PayloadAction<ActionLog | null>) => {
      state.selectedActionLog = action.payload;
    },
    
    // 清除所有选择
    clearAllSelections: (state) => {
      state.selectedVideoIds = [];
      state.selectedBookIds = [];
      state.selectedScriptIds = [];
      state.selectedActionLogIds = [];
    },
    
    // 更新视频学习进度（模拟）
    updateVideoProgress: (state, action: PayloadAction<{ videoId: string; progress: number; userId: string }>) => {
      // 这里可以添加视频学习进度更新的逻辑
      // 实际应用中应该调用API更新学习记录
      console.log('更新视频学习进度:', action.payload);
    },
    
    // 更新书籍阅读进度（模拟）
    updateBookProgress: (state, action: PayloadAction<{ bookId: string; progress: number; userId: string }>) => {
      // 这里可以添加书籍阅读进度更新的逻辑
      console.log('更新书籍阅读进度:', action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      // 获取视频列表
      .addCase(fetchVideos.pending, (state) => {
        state.videosLoading = true;
        state.videosError = null;
      })
      .addCase(fetchVideos.fulfilled, (state, action) => {
        state.videosLoading = false;
        state.videos = action.payload.items || [];
        state.pagination = {
          page: action.payload.page || 1,
          pageSize: action.payload.pageSize || 10,
          total: action.payload.total || 0,
          totalPages: action.payload.totalPages || 0,
        };
      })
      .addCase(fetchVideos.rejected, (state, action) => {
        state.videosLoading = false;
        state.videosError = action.payload as string;
      })
      
      // 获取视频详情
      .addCase(fetchVideoById.pending, (state) => {
        state.videosLoading = true;
        state.videosError = null;
      })
      .addCase(fetchVideoById.fulfilled, (state, action) => {
        state.videosLoading = false;
        state.selectedVideo = action.payload;
      })
      .addCase(fetchVideoById.rejected, (state, action) => {
        state.videosLoading = false;
        state.videosError = action.payload as string;
      })
      
      // 创建视频
      .addCase(createVideo.pending, (state) => {
        state.operationLoading = true;
        state.operationError = null;
        state.operationSuccess = false;
      })
      .addCase(createVideo.fulfilled, (state, action) => {
        state.operationLoading = false;
        state.operationSuccess = true;
        state.videos.unshift(action.payload);
      })
      .addCase(createVideo.rejected, (state, action) => {
        state.operationLoading = false;
        state.operationError = action.payload as string;
      })
      
      // 更新视频
      .addCase(updateVideo.pending, (state) => {
        state.operationLoading = true;
        state.operationError = null;
        state.operationSuccess = false;
      })
      .addCase(updateVideo.fulfilled, (state, action) => {
        state.operationLoading = false;
        state.operationSuccess = true;
        const index = state.videos.findIndex(video => video.id === action.payload.id);
        if (index !== -1) {
          state.videos[index] = action.payload;
        }
        if (state.selectedVideo?.id === action.payload.id) {
          state.selectedVideo = action.payload;
        }
      })
      .addCase(updateVideo.rejected, (state, action) => {
        state.operationLoading = false;
        state.operationError = action.payload as string;
      })
      
      // 删除视频
      .addCase(deleteVideo.pending, (state) => {
        state.operationLoading = true;
        state.operationError = null;
        state.operationSuccess = false;
      })
      .addCase(deleteVideo.fulfilled, (state, action) => {
        state.operationLoading = false;
        state.operationSuccess = true;
        state.videos = state.videos.filter(video => video.id !== action.payload);
        state.selectedVideoIds = state.selectedVideoIds.filter(id => id !== action.payload);
        if (state.selectedVideo?.id === action.payload) {
          state.selectedVideo = null;
        }
      })
      .addCase(deleteVideo.rejected, (state, action) => {
        state.operationLoading = false;
        state.operationError = action.payload as string;
      })
      
      // 获取书籍列表
      .addCase(fetchBooks.pending, (state) => {
        state.booksLoading = true;
        state.booksError = null;
      })
      .addCase(fetchBooks.fulfilled, (state, action) => {
        state.booksLoading = false;
        // 兼容后端返回的数据结构：{ list: [] } 或 { items: [] }
        const data = action.payload as any;
        state.books = data.items || data.list || [];
        state.pagination = {
          page: data.page || 1,
          pageSize: data.pageSize || 10,
          total: data.total || 0,
          totalPages: data.totalPages || Math.ceil((data.total || 0) / (data.pageSize || 10)),
        };
      })
      .addCase(fetchBooks.rejected, (state, action) => {
        state.booksLoading = false;
        state.booksError = action.payload as string;
      })
      
      // 获取单本书籍详情
      .addCase(fetchBookById.pending, (state) => {
        state.booksLoading = true;
        state.booksError = null;
      })
      .addCase(fetchBookById.fulfilled, (state, action) => {
        state.booksLoading = false;
        state.selectedBook = action.payload;
      })
      .addCase(fetchBookById.rejected, (state, action) => {
        state.booksLoading = false;
        state.booksError = action.payload as string;
      })
      
      // 创建书籍
      .addCase(createBook.pending, (state) => {
        state.operationLoading = true;
        state.operationError = null;
        state.operationSuccess = false;
      })
      .addCase(createBook.fulfilled, (state, action) => {
        state.operationLoading = false;
        state.operationSuccess = true;
        state.books.unshift(action.payload);
      })
      .addCase(createBook.rejected, (state, action) => {
        state.operationLoading = false;
        state.operationError = action.payload as string;
      })
      
      // 更新书籍
      .addCase(updateBook.pending, (state) => {
        state.operationLoading = true;
        state.operationError = null;
        state.operationSuccess = false;
      })
      .addCase(updateBook.fulfilled, (state, action) => {
        state.operationLoading = false;
        state.operationSuccess = true;
        const index = state.books.findIndex(book => book.id === action.payload.id);
        if (index !== -1) {
          state.books[index] = { ...state.books[index], ...action.payload };
        }
      })
      .addCase(updateBook.rejected, (state, action) => {
        state.operationLoading = false;
        state.operationError = action.payload as string;
      })
      
      // 删除书籍
      .addCase(deleteBook.pending, (state) => {
        state.operationLoading = true;
        state.operationError = null;
        state.operationSuccess = false;
      })
      .addCase(deleteBook.fulfilled, (state, action) => {
        state.operationLoading = false;
        state.operationSuccess = true;
        state.books = state.books.filter(book => book.id !== action.payload);
        state.selectedBookIds = state.selectedBookIds.filter(id => id !== action.payload);
      })
      .addCase(deleteBook.rejected, (state, action) => {
        state.operationLoading = false;
        state.operationError = action.payload as string;
      })
      
      // 切换书籍推荐状态
      .addCase(toggleBookRecommendation.pending, (state) => {
        state.operationLoading = true;
        state.operationError = null;
        state.operationSuccess = false;
      })
      .addCase(toggleBookRecommendation.fulfilled, (state, action) => {
        state.operationLoading = false;
        state.operationSuccess = true;
        const index = state.books.findIndex(book => book.id === action.payload.id);
        if (index !== -1) {
          state.books[index] = { ...state.books[index], ...action.payload };
        }
      })
      .addCase(toggleBookRecommendation.rejected, (state, action) => {
        state.operationLoading = false;
        state.operationError = action.payload as string;
      })
      
      // 获取话术列表
      .addCase(fetchScripts.pending, (state) => {
        state.scriptsLoading = true;
        state.scriptsError = null;
      })
      .addCase(fetchScripts.fulfilled, (state, action) => {
        state.scriptsLoading = false;
        state.scripts = action.payload.items || [];
        state.pagination = {
          page: action.payload.page || 1,
          pageSize: action.payload.pageSize || 10,
          total: action.payload.total || 0,
          totalPages: action.payload.totalPages || 0,
        };
      })
      .addCase(fetchScripts.rejected, (state, action) => {
        state.scriptsLoading = false;
        state.scriptsError = action.payload as string;
      })
      
      // 获取话术模板
      .addCase(fetchScriptTemplates.pending, (state) => {
        state.scriptsLoading = true;
        state.scriptsError = null;
      })
      .addCase(fetchScriptTemplates.fulfilled, (state, action) => {
        state.scriptsLoading = false;
        state.scriptTemplates = action.payload || [];
      })
      .addCase(fetchScriptTemplates.rejected, (state, action) => {
        state.scriptsLoading = false;
        state.scriptsError = action.payload as string;
      })
      
      // 获取热门话术
      .addCase(getHotScripts.pending, (state) => {
        state.scriptsLoading = true;
        state.scriptsError = null;
      })
      .addCase(getHotScripts.fulfilled, (state, action) => {
        state.scriptsLoading = false;
        state.hotScripts = action.payload || [];
      })
      .addCase(getHotScripts.rejected, (state, action) => {
        state.scriptsLoading = false;
        state.scriptsError = action.payload as string;
      })
      
      // 获取话术统计
      .addCase(getScriptStatistics.pending, (state) => {
        state.scriptsLoading = true;
        state.scriptsError = null;
      })
      .addCase(getScriptStatistics.fulfilled, (state, action) => {
        state.scriptsLoading = false;
        state.scriptStatistics = action.payload;
      })
      .addCase(getScriptStatistics.rejected, (state, action) => {
        state.scriptsLoading = false;
        state.scriptsError = action.payload as string;
      })
      
      // AI话术训练
      .addCase(trainAIScript.pending, (state) => {
        state.trainingLoading = true;
        state.operationError = null;
      })
      .addCase(trainAIScript.fulfilled, (state, action) => {
        state.trainingLoading = false;
        state.operationSuccess = true;
      })
      .addCase(trainAIScript.rejected, (state, action) => {
        state.trainingLoading = false;
        state.operationError = action.payload as string;
      })
      
      // 场景模拟
      .addCase(simulateScenario.pending, (state) => {
        state.simulationLoading = true;
        state.operationError = null;
      })
      .addCase(simulateScenario.fulfilled, (state, action) => {
        state.simulationLoading = false;
        state.operationSuccess = true;
      })
      .addCase(simulateScenario.rejected, (state, action) => {
        state.simulationLoading = false;
        state.operationError = action.payload as string;
      })
      
      // 获取单个话术详情
      .addCase(fetchScriptById.pending, (state) => {
        state.scriptsLoading = true;
        state.scriptsError = null;
      })
      .addCase(fetchScriptById.fulfilled, (state, action) => {
        state.scriptsLoading = false;
        state.selectedScript = action.payload;
      })
      .addCase(fetchScriptById.rejected, (state, action) => {
        state.scriptsLoading = false;
        state.scriptsError = action.payload as string;
      })
      
      // 创建话术
      .addCase(createScript.pending, (state) => {
        state.operationLoading = true;
        state.operationError = null;
        state.operationSuccess = false;
      })
      .addCase(createScript.fulfilled, (state, action) => {
        state.operationLoading = false;
        state.operationSuccess = true;
        state.scripts.unshift(action.payload);
      })
      .addCase(createScript.rejected, (state, action) => {
        state.operationLoading = false;
        state.operationError = action.payload as string;
      })
      
      // 更新话术
      .addCase(updateScript.pending, (state) => {
        state.operationLoading = true;
        state.operationError = null;
        state.operationSuccess = false;
      })
      .addCase(updateScript.fulfilled, (state, action) => {
        state.operationLoading = false;
        state.operationSuccess = true;
        const index = state.scripts.findIndex(script => script.id === action.payload.id);
        if (index !== -1) {
          state.scripts[index] = action.payload;
        }
        if (state.selectedScript?.id === action.payload.id) {
          state.selectedScript = action.payload;
        }
      })
      .addCase(updateScript.rejected, (state, action) => {
        state.operationLoading = false;
        state.operationError = action.payload as string;
      })
      
      // 删除话术
      .addCase(deleteScript.pending, (state) => {
        state.operationLoading = true;
        state.operationError = null;
        state.operationSuccess = false;
      })
      .addCase(deleteScript.fulfilled, (state, action) => {
        state.operationLoading = false;
        state.operationSuccess = true;
        state.scripts = state.scripts.filter(script => script.id !== action.payload);
        state.selectedScriptIds = state.selectedScriptIds.filter(id => id !== action.payload);
        if (state.selectedScript?.id === action.payload) {
          state.selectedScript = null;
        }
      })
      .addCase(deleteScript.rejected, (state, action) => {
        state.operationLoading = false;
        state.operationError = action.payload as string;
      })
      
      // 获取行动日志列表
      .addCase(fetchActionLogs.pending, (state) => {
        state.actionLogsLoading = true;
        state.actionLogsError = null;
      })
      .addCase(fetchActionLogs.fulfilled, (state, action) => {
        state.actionLogsLoading = false;
        state.actionLogs = action.payload.items || [];
        state.pagination = {
          page: action.payload.page || 1,
          pageSize: action.payload.pageSize || 10,
          total: action.payload.total || 0,
          totalPages: action.payload.totalPages || 0,
        };
      })
      .addCase(fetchActionLogs.rejected, (state, action) => {
        state.actionLogsLoading = false;
        state.actionLogsError = action.payload as string;
      })
      
      // 获取行动日志类型统计
      .addCase(getActionLogTypeStats.pending, (state) => {
        state.actionLogsLoading = true;
        state.actionLogsError = null;
      })
      .addCase(getActionLogTypeStats.fulfilled, (state, action) => {
        state.actionLogsLoading = false;
        state.actionLogStatistics = action.payload;
      })
      .addCase(getActionLogTypeStats.rejected, (state, action) => {
        state.actionLogsLoading = false;
        state.actionLogsError = action.payload as string;
      })
      
      // 获取用户行动日志统计
      .addCase(getUserActionLogStats.pending, (state) => {
        state.actionLogsLoading = true;
        state.actionLogsError = null;
      })
      .addCase(getUserActionLogStats.fulfilled, (state, action) => {
        state.actionLogsLoading = false;
        state.userActionLogStats = action.payload;
      })
      .addCase(getUserActionLogStats.rejected, (state, action) => {
        state.actionLogsLoading = false;
        state.actionLogsError = action.payload as string;
      })
      
      // 获取单个行动日志详情
      .addCase(fetchActionLogById.pending, (state) => {
        state.actionLogsLoading = true;
        state.actionLogsError = null;
      })
      .addCase(fetchActionLogById.fulfilled, (state, action) => {
        state.actionLogsLoading = false;
        state.selectedActionLog = action.payload;
      })
      .addCase(fetchActionLogById.rejected, (state, action) => {
        state.actionLogsLoading = false;
        state.actionLogsError = action.payload as string;
      })
      
      // 创建行动日志
      .addCase(createActionLog.pending, (state) => {
        state.operationLoading = true;
        state.operationError = null;
        state.operationSuccess = false;
      })
      .addCase(createActionLog.fulfilled, (state, action) => {
        state.operationLoading = false;
        state.operationSuccess = true;
        state.actionLogs.unshift(action.payload);
      })
      .addCase(createActionLog.rejected, (state, action) => {
        state.operationLoading = false;
        state.operationError = action.payload as string;
      })
      
      // 更新行动日志
      .addCase(updateActionLog.pending, (state) => {
        state.operationLoading = true;
        state.operationError = null;
        state.operationSuccess = false;
      })
      .addCase(updateActionLog.fulfilled, (state, action) => {
        state.operationLoading = false;
        state.operationSuccess = true;
        const index = state.actionLogs.findIndex(log => log.id === action.payload.id);
        if (index !== -1) {
          state.actionLogs[index] = action.payload;
        }
        if (state.selectedActionLog?.id === action.payload.id) {
          state.selectedActionLog = action.payload;
        }
      })
      .addCase(updateActionLog.rejected, (state, action) => {
        state.operationLoading = false;
        state.operationError = action.payload as string;
      })
      
      // 删除行动日志
      .addCase(deleteActionLog.pending, (state) => {
        state.operationLoading = true;
        state.operationError = null;
        state.operationSuccess = false;
      })
      .addCase(deleteActionLog.fulfilled, (state, action) => {
        state.operationLoading = false;
        state.operationSuccess = true;
        state.actionLogs = state.actionLogs.filter(log => log.id !== action.payload);
        state.selectedActionLogIds = state.selectedActionLogIds.filter(id => id !== action.payload);
        if (state.selectedActionLog?.id === action.payload) {
          state.selectedActionLog = null;
        }
      })
      .addCase(deleteActionLog.rejected, (state, action) => {
        state.operationLoading = false;
        state.operationError = action.payload as string;
      })
      
      // 更新行动日志进度
      .addCase(updateActionLogProgress.pending, (state) => {
        state.operationLoading = true;
        state.operationError = null;
        state.operationSuccess = false;
      })
      .addCase(updateActionLogProgress.fulfilled, (state, action) => {
        state.operationLoading = false;
        state.operationSuccess = true;
        const index = state.actionLogs.findIndex(log => log.id === action.payload.id);
        if (index !== -1) {
          state.actionLogs[index] = action.payload;
        }
        if (state.selectedActionLog?.id === action.payload.id) {
          state.selectedActionLog = action.payload;
        }
      })
      .addCase(updateActionLogProgress.rejected, (state, action) => {
        state.operationLoading = false;
        state.operationError = action.payload as string;
      })
      
      // 完成行动日志
      .addCase(completeActionLog.pending, (state) => {
        state.operationLoading = true;
        state.operationError = null;
        state.operationSuccess = false;
      })
      .addCase(completeActionLog.fulfilled, (state, action) => {
        state.operationLoading = false;
        state.operationSuccess = true;
        const index = state.actionLogs.findIndex(log => log.id === action.payload.id);
        if (index !== -1) {
          state.actionLogs[index] = action.payload;
        }
        if (state.selectedActionLog?.id === action.payload.id) {
          state.selectedActionLog = action.payload;
        }
      })
      .addCase(completeActionLog.rejected, (state, action) => {
        state.operationLoading = false;
        state.operationError = action.payload as string;
      })
      
      // 获取积分记录
      .addCase(fetchPointsRecords.pending, (state) => {
        state.pointsLoading = true;
        state.pointsError = null;
      })
      .addCase(fetchPointsRecords.fulfilled, (state, action) => {
        state.pointsLoading = false;
        state.pointsRecords = action.payload || [];
        if (action.payload && action.payload.length > 0) {
          // 假设第一个记录包含当前用户的积分余额
          const latestRecord = action.payload[0];
          state.userPoints = (latestRecord as any).balance || 0;
        }
      })
      .addCase(fetchPointsRecords.rejected, (state, action) => {
        state.pointsLoading = false;
        state.pointsError = action.payload as string;
      })
      
      // 获取学习统计
      .addCase(fetchLearningStatistics.pending, (state) => {
        state.statisticsLoading = true;
        state.statisticsError = null;
      })
      .addCase(fetchLearningStatistics.fulfilled, (state, action) => {
        state.statisticsLoading = false;
        state.statistics = action.payload;
      })
      .addCase(fetchLearningStatistics.rejected, (state, action) => {
        state.statisticsLoading = false;
        state.statisticsError = action.payload as string;
      })
      
      // 获取商学院统计
      .addCase(fetchSchoolStats.pending, (state) => {
        state.schoolStatsLoading = true;
        state.schoolStatsError = null;
      })
      .addCase(fetchSchoolStats.fulfilled, (state, action) => {
        state.schoolStatsLoading = false;
        state.schoolStats = action.payload;
      })
      .addCase(fetchSchoolStats.rejected, (state, action) => {
        state.schoolStatsLoading = false;
        state.schoolStatsError = action.payload as string;
      });
  },
});

// 导出actions
export const {
  resetOperationState,
  setQueryParams,
  resetQueryParams,
  selectVideo,
  selectAllVideos,
  selectBook,
  selectScript,
  selectActionLog,
  setSelectedVideo,
  setSelectedBook,
  setSelectedScript,
  setSelectedActionLog,
  clearAllSelections,
  updateVideoProgress,
  updateBookProgress,
} = schoolSlice.actions;

// 导出reducer
export default schoolSlice.reducer;