/**
 * 团队管理 Redux slice
 * 
 * 适配真实后端API，补充前端计算字段以满足UI展示需求
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  TeamMember,
  TeamTreeNode,
  TeamStats,
  TeamQueryParams,
  TeamQueryResult,
  MemberDetail,
  TeamGrowthAnalysis,
  TeamMemberStatus
} from '../../types/team';
import { AgentLevel } from '../../types/commission';
import { TeamApiService } from '../../api/teamApi';

// 扩展的 TeamStats 接口，包含UI所需的衍生字段
export interface ExtendedTeamStats extends TeamStats {
  // KPI卡片所需
  todayNewMembers: number;
  totalRevenue: number;
  averageGrowthRate: number;

  // 活跃度统计
  todayActiveMembers: number;
  weeklyActiveMembers: number;
  monthlyActiveMembers: number;

  // 等级分布（扁平化，方便LevelDistribution组件使用）
  level1Count: number;
  level2Count: number;
  level3Count: number;
  level4Count: number;
  level5Count: number;
  level6Count: number;
}

interface TeamState {
  // 团队树数据
  teamTree: TeamTreeNode | null;
  teamTreeLoading: boolean;
  teamTreeError: string | null;
  
  // 团队成员列表
  members: TeamMember[];
  queryResult: TeamQueryResult | null;
  queryLoading: boolean;
  queryError: string | null;
  queryParams: TeamQueryParams;
  
  // 团队统计（扩展版）
  stats: ExtendedTeamStats | null;
  statsLoading: boolean;
  statsError: string | null;
  
  // 成员详情
  memberDetail: MemberDetail | null;
  detailLoading: boolean;
  detailError: string | null;
  
  // 增长分析
  growthAnalysis: TeamGrowthAnalysis | null;
  growthAnalysisLoading: boolean;
  growthAnalysisError: string | null;
  
  // 成员状态
  memberStatus: TeamMemberStatus | null;
  statusLoading: boolean;
  statusError: string | null;
  
  // 选择状态
  selectedMemberIds: string[];
  expandedNodeIds: string[];
}

const initialState: TeamState = {
  teamTree: null,
  teamTreeLoading: false,
  teamTreeError: null,
  
  members: [],
  queryResult: null,
  queryLoading: false,
  queryError: null,
  queryParams: {
    page: 1,
    pageSize: 10,
    sortBy: 'commission',
    sortOrder: 'desc'
  },
  
  stats: null,
  statsLoading: false,
  statsError: null,
  
  memberDetail: null,
  detailLoading: false,
  detailError: null,
  
  growthAnalysis: null,
  growthAnalysisLoading: false,
  growthAnalysisError: null,
  
  memberStatus: null,
  statusLoading: false,
  statusError: null,
  
  selectedMemberIds: [],
  expandedNodeIds: []
};

// ==================== 异步 Thunks ====================

export const fetchTeamTree = createAsyncThunk(
  'team/fetchTeamTree',
  async (userId: string, { rejectWithValue }) => {
    try {
      return await TeamApiService.getTeamTree(userId);
    } catch (error: any) {
      return rejectWithValue(error.message || '获取团队树失败');
    }
  }
);

export const fetchTeamMembers = createAsyncThunk(
  'team/fetchTeamMembers',
  async (params: TeamQueryParams, { rejectWithValue }) => {
    try {
      return await TeamApiService.getTeamMembers(params);
    } catch (error: any) {
      return rejectWithValue(error.message || '获取团队成员失败');
    }
  }
);

export const fetchTeamStats = createAsyncThunk(
  'team/fetchTeamStats',
  async (_userId: string | undefined, { rejectWithValue }) => {
    try {
      // 并行请求：基础统计 + 成员状态 + 增长分析
      const [baseStats, memberStatus] = await Promise.all([
        TeamApiService.getTeamStats(_userId),
        TeamApiService.getTeamMemberStatus(_userId).catch(() => null),
      ]);

      // 构建扩展版统计对象（补充UI所需衍生字段）
      const extendedStats: ExtendedTeamStats = {
        ...baseStats,

        // KPI卡片 — 今日新增从成员状态获取
        todayNewMembers: memberStatus?.activeToday ?? 0,
        totalRevenue: baseStats.totalCommission || 0,
        averageGrowthRate: Math.round((baseStats.growthRate || 0) * 100),

        // 活跃度统计
        todayActiveMembers: memberStatus?.activeToday ?? 0,
        weeklyActiveMembers: memberStatus?.orderedThisWeek ?? 0,
        monthlyActiveMembers: 0, // 后端暂无此指标

        // 等级分布（扁平化）
        level1Count: baseStats.levelDistribution[AgentLevel.MEMBER] || 0,
        level2Count: baseStats.levelDistribution[AgentLevel.MODEL_AGENT] || 0,
        level3Count: baseStats.levelDistribution[AgentLevel.AGENT] || 0,
        level4Count: baseStats.levelDistribution[AgentLevel.WHOLESALER] || 0,
        level5Count: baseStats.levelDistribution[AgentLevel.CHIEF_COMPANY] || 0,
        level6Count: baseStats.levelDistribution[AgentLevel.GROUP_DIVISION] || 0,
      };

      return extendedStats;
    } catch (error: any) {
      return rejectWithValue(error.message || '获取团队统计失败');
    }
  }
);

export const fetchMemberDetail = createAsyncThunk(
  'team/fetchMemberDetail',
  async (memberId: string, { rejectWithValue }) => {
    try {
      return await TeamApiService.getMemberDetail(memberId);
    } catch (error: any) {
      return rejectWithValue(error.message || '获取成员详情失败');
    }
  }
);

export const fetchTeamGrowthAnalysis = createAsyncThunk(
  'team/fetchTeamGrowthAnalysis',
  async ({ userId, period }: { userId: string; period: 'week' | 'month' | 'quarter' }, { rejectWithValue }) => {
    try {
      return await TeamApiService.getTeamGrowthAnalysis(userId, period);
    } catch (error: any) {
      return rejectWithValue(error.message || '获取团队增长分析失败');
    }
  }
);

export const fetchTeamMemberStatus = createAsyncThunk(
  'team/fetchTeamMemberStatus',
  async (userId: string, { rejectWithValue }) => {
    try {
      return await TeamApiService.getTeamMemberStatus(userId);
    } catch (error: any) {
      return rejectWithValue(error.message || '获取成员状态失败');
    }
  }
);

// ==================== Slice 定义 ====================

const teamSlice = createSlice({
  name: 'team',
  initialState,
  reducers: {
    // 更新查询参数
    updateQueryParams: (state, action) => {
      state.queryParams = { ...state.queryParams, ...action.payload };
    },
    
    // 重置查询参数
    resetQueryParams: (state) => {
      state.queryParams = initialState.queryParams;
    },
    
    // 选择/取消选择成员
    selectMember: (state, action) => {
      if (!state.selectedMemberIds.includes(action.payload)) {
        state.selectedMemberIds.push(action.payload);
      }
    },
    
    unselectMember: (state, action) => {
      state.selectedMemberIds = state.selectedMemberIds.filter(id => id !== action.payload);
    },
    
    selectMembers: (state, action) => {
      const allIds = [...state.selectedMemberIds, ...action.payload];
      state.selectedMemberIds = allIds.filter((id, index) => allIds.indexOf(id) === index);
    },
    
    unselectMembers: (state, action) => {
      state.selectedMemberIds = state.selectedMemberIds.filter(id => !action.payload.includes(id));
    },
    
    clearSelection: (state) => {
      state.selectedMemberIds = [];
    },

    // 树节点展开/折叠
    toggleNodeExpanded: (state, action) => {
      const idx = state.expandedNodeIds.indexOf(action.payload);
      if (idx === -1) {
        state.expandedNodeIds.push(action.payload);
      } else {
        state.expandedNodeIds.splice(idx, 1);
      }
    },
    
    expandNodes: (state, action) => {
      const allIds = [...state.expandedNodeIds, ...action.payload];
      state.expandedNodeIds = allIds.filter((id, index) => allIds.indexOf(id) === index);
    },
    
    collapseNodes: (state, action) => {
      state.expandedNodeIds = state.expandedNodeIds.filter(id => !action.payload.includes(id));
    },
    
    clearMemberDetail: (state) => {
      state.memberDetail = null;
      state.detailLoading = false;
      state.detailError = null;
    },
    
    resetTeamState: () => initialState,
  },

  extraReducers: (builder) => {
    // fetchTeamTree
    builder
      .addCase(fetchTeamTree.pending, (state) => {
        state.teamTreeLoading = true;
        state.teamTreeError = null;
      })
      .addCase(fetchTeamTree.fulfilled, (state, action) => {
        state.teamTreeLoading = false;
        state.teamTree = action.payload;
        // 默认展开根节点
        if (action.payload && action.payload.id) {
          state.expandedNodeIds = [String(action.payload.id)];
        }
      })
      .addCase(fetchTeamTree.rejected, (state, action) => {
        state.teamTreeLoading = false;
        state.teamTreeError = action.payload as string;
      });
    
    // fetchTeamMembers
    builder
      .addCase(fetchTeamMembers.pending, (state) => {
        state.queryLoading = true;
        state.queryError = null;
      })
      .addCase(fetchTeamMembers.fulfilled, (state, action) => {
        state.queryLoading = false;
        state.queryResult = action.payload;
        state.members = action.payload.members;
      })
      .addCase(fetchTeamMembers.rejected, (state, action) => {
        state.queryLoading = false;
        state.queryError = action.payload as string;
      });
    
    // fetchTeamStats（返回 ExtendedTeamStats）
    builder
      .addCase(fetchTeamStats.pending, (state) => {
        state.statsLoading = true;
        state.statsError = null;
      })
      .addCase(fetchTeamStats.fulfilled, (state, action) => {
        state.statsLoading = false;
        // 直接存储扩展版统计
        state.stats = action.payload as ExtendedTeamStats;
      })
      .addCase(fetchTeamStats.rejected, (state, action) => {
        state.statsLoading = false;
        state.statsError = action.payload as string;
      });
    
    // fetchMemberDetail
    builder
      .addCase(fetchMemberDetail.pending, (state) => {
        state.detailLoading = true;
        state.detailError = null;
      })
      .addCase(fetchMemberDetail.fulfilled, (state, action) => {
        state.detailLoading = false;
        state.memberDetail = action.payload;
      })
      .addCase(fetchMemberDetail.rejected, (state, action) => {
        state.detailLoading = false;
        state.detailError = action.payload as string;
      });

    // fetchTeamGrowthAnalysis
    builder
      .addCase(fetchTeamGrowthAnalysis.pending, (state) => {
        state.growthAnalysisLoading = true;
        state.growthAnalysisError = null;
      })
      .addCase(fetchTeamGrowthAnalysis.fulfilled, (state, action) => {
        state.growthAnalysisLoading = false;
        state.growthAnalysis = action.payload;
      })
      .addCase(fetchTeamGrowthAnalysis.rejected, (state, action) => {
        state.growthAnalysisLoading = false;
        state.growthAnalysisError = action.payload as string;
      });

    // fetchTeamMemberStatus
    builder
      .addCase(fetchTeamMemberStatus.pending, (state) => {
        state.statusLoading = true;
        state.statusError = null;
      })
      .addCase(fetchTeamMemberStatus.fulfilled, (state, action) => {
        state.statusLoading = false;
        state.memberStatus = action.payload;
      })
      .addCase(fetchTeamMemberStatus.rejected, (state, action) => {
        state.statusLoading = false;
        state.statusError = action.payload as string;
      });
  }
});

export const {
  updateQueryParams,
  resetQueryParams,
  selectMember,
  unselectMember,
  selectMembers,
  unselectMembers,
  clearSelection,
  toggleNodeExpanded,
  expandNodes,
  collapseNodes,
  clearMemberDetail,
  resetTeamState
} = teamSlice.actions;

export default teamSlice.reducer;
