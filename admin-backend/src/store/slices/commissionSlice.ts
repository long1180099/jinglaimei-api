/**
 * 收益管理Redux Slice
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { 
  CommissionRecord, 
  CommissionStats, 
  CommissionQueryParams, 
  CommissionReport,
  CommissionCalculationParams,
  CommissionCalculationResult,
  CommissionType,
  AgentLevel
} from '../../types/commission';
import commissionApi, { LEVEL_CONFIGS } from '../../api/commissionApi';

// 收益状态接口
interface CommissionState {
  records: CommissionRecord[];
  stats: CommissionStats | null;
  reports: Record<string, CommissionReport>;
  currentReport: CommissionReport | null;
  loading: boolean;
  error: string | null;
  levelConfigs: typeof LEVEL_CONFIGS;
  commissionRules: any;
  calculationResult: CommissionCalculationResult | null;
  filters: CommissionQueryParams;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}

// 初始状态
const initialState: CommissionState = {
  records: [],
  stats: null,
  reports: {},
  currentReport: null,
  loading: false,
  error: null,
  levelConfigs: LEVEL_CONFIGS,
  commissionRules: {},
  calculationResult: null,
  filters: {
    page: 1,
    pageSize: 10
  },
  pagination: {
    page: 1,
    pageSize: 10,
    total: 0
  }
};

// 异步Thunks

// 获取收益记录
export const fetchCommissionRecords = createAsyncThunk(
  'commission/fetchRecords',
  async (params: CommissionQueryParams, { rejectWithValue }) => {
    try {
      const response = await commissionApi.getCommissionRecords(params);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || '获取收益记录失败');
    }
  }
);

// 获取收益统计
export const fetchCommissionStats = createAsyncThunk(
  'commission/fetchStats',
  async (userId: string = '', { rejectWithValue }) => {
    try {
      const stats = await commissionApi.getCommissionStats(userId);
      return stats;
    } catch (error: any) {
      return rejectWithValue(error.message || '获取收益统计失败');
    }
  }
);

// 获取收益报表
export const fetchCommissionReport = createAsyncThunk(
  'commission/fetchReport',
  async ({ period, startDate, endDate }: { period: 'daily' | 'weekly' | 'monthly' | 'yearly', startDate: string, endDate: string }, 
    { rejectWithValue }) => {
    try {
      const report = await commissionApi.getCommissionReport(period, startDate, endDate);
      return { period, startDate, endDate, report };
    } catch (error: any) {
      return rejectWithValue(error.message || '获取收益报表失败');
    }
  }
);

// 手动计算分润
export const calculateCommission = createAsyncThunk(
  'commission/calculate',
  async (params: CommissionCalculationParams, { rejectWithValue }) => {
    try {
      const result = await commissionApi.calculateCommissionManually(params);
      return result;
    } catch (error: any) {
      return rejectWithValue(error.message || '分润计算失败');
    }
  }
);

// 导出收益数据
export const exportCommissionData = createAsyncThunk(
  'commission/exportData',
  async (params: CommissionQueryParams, { rejectWithValue }) => {
    try {
      const csvData = await commissionApi.exportCommissionData(params);
      return csvData;
    } catch (error: any) {
      return rejectWithValue(error.message || '导出数据失败');
    }
  }
);

// 获取分润规则
export const fetchCommissionRules = createAsyncThunk(
  'commission/fetchRules',
  async (_, { rejectWithValue }) => {
    try {
      const rules = await commissionApi.getCommissionRules();
      return rules;
    } catch (error: any) {
      return rejectWithValue(error.message || '获取分润规则失败');
    }
  }
);

// 更新分润规则
export const updateCommissionRules = createAsyncThunk(
  'commission/updateRules',
  async (rules: any, { rejectWithValue }) => {
    try {
      const response = await commissionApi.updateCommissionRules(rules);
      return response.rules;
    } catch (error: any) {
      return rejectWithValue(error.message || '更新分润规则失败');
    }
  }
);

// 获取等级配置
export const fetchLevelConfigs = createAsyncThunk(
  'commission/fetchLevelConfigs',
  async (_, { rejectWithValue }) => {
    try {
      const configs = await commissionApi.getLevelConfigs();
      return configs;
    } catch (error: any) {
      return rejectWithValue(error.message || '获取等级配置失败');
    }
  }
);

// 更新等级配置
export const updateLevelConfig = createAsyncThunk(
  'commission/updateLevelConfig',
  async ({ level, config }: { level: AgentLevel, config: any }, { rejectWithValue }) => {
    try {
      const response = await commissionApi.updateLevelConfig(level, config);
      return { level, config, message: response.message };
    } catch (error: any) {
      return rejectWithValue(error.message || '更新等级配置失败');
    }
  }
);

// 创建slice
const commissionSlice = createSlice({
  name: 'commission',
  initialState,
  reducers: {
    // 设置筛选条件
    setFilters: (state, action: PayloadAction<CommissionQueryParams>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    
    // 重置筛选条件
    resetFilters: (state) => {
      state.filters = {
        page: 1,
        pageSize: 10
      };
    },
    
    // 设置分页
    setPagination: (state, action: PayloadAction<{ page: number; pageSize: number }>) => {
      state.pagination.page = action.payload.page;
      state.pagination.pageSize = action.payload.pageSize;
      state.filters.page = action.payload.page;
      state.filters.pageSize = action.payload.pageSize;
    },
    
    // 清除错误
    clearError: (state) => {
      state.error = null;
    },
    
    // 清除计算结果
    clearCalculationResult: (state) => {
      state.calculationResult = null;
    },
    
    // 清除当前报表
    clearCurrentReport: (state) => {
      state.currentReport = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // 获取收益记录
      .addCase(fetchCommissionRecords.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCommissionRecords.fulfilled, (state, action) => {
        state.loading = false;
        state.records = action.payload.records;
        state.pagination = {
          page: action.payload.page,
          pageSize: action.payload.pageSize,
          total: action.payload.total
        };
      })
      .addCase(fetchCommissionRecords.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // 获取收益统计
      .addCase(fetchCommissionStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCommissionStats.fulfilled, (state, action) => {
        state.loading = false;
        state.stats = action.payload;
      })
      .addCase(fetchCommissionStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // 获取收益报表
      .addCase(fetchCommissionReport.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCommissionReport.fulfilled, (state, action) => {
        state.loading = false;
        const { period, startDate, endDate, report } = action.payload;
        const key = `${period}_${startDate}_${endDate}`;
        state.reports[key] = report;
        state.currentReport = report;
      })
      .addCase(fetchCommissionReport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // 手动计算分润
      .addCase(calculateCommission.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(calculateCommission.fulfilled, (state, action) => {
        state.loading = false;
        state.calculationResult = action.payload;
      })
      .addCase(calculateCommission.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // 导出收益数据
      .addCase(exportCommissionData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(exportCommissionData.fulfilled, (state) => {
        state.loading = false;
        // 导出成功，可以添加提示
      })
      .addCase(exportCommissionData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // 获取分润规则
      .addCase(fetchCommissionRules.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCommissionRules.fulfilled, (state, action) => {
        state.loading = false;
        state.commissionRules = action.payload;
      })
      .addCase(fetchCommissionRules.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // 更新分润规则
      .addCase(updateCommissionRules.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCommissionRules.fulfilled, (state, action) => {
        state.loading = false;
        state.commissionRules = action.payload;
      })
      .addCase(updateCommissionRules.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // 获取等级配置
      .addCase(fetchLevelConfigs.fulfilled, (state, action) => {
        state.levelConfigs = action.payload;
      })
      
      // 更新等级配置
      .addCase(updateLevelConfig.fulfilled, (state, action) => {
        const { level, config } = action.payload;
        state.levelConfigs[level] = { ...state.levelConfigs[level], ...config };
      });
  }
});

// 导出actions和reducer
export const { 
  setFilters, 
  resetFilters, 
  setPagination, 
  clearError, 
  clearCalculationResult,
  clearCurrentReport 
} = commissionSlice.actions;

export default commissionSlice.reducer;