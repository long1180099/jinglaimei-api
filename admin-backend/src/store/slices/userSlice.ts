/**
 * 用户管理 Redux Slice
 * 管理用户相关状态和数据
 * 对接真实后端 API
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { userApi, UserStats, BalanceLog, BalanceAdjustResult } from '../../api/userApi';

// 用户查询参数
interface UserQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  agent_level?: number;
  status?: number;
  startDate?: string;
  endDate?: string;
  sort_by?: string;
  order?: string;
}

// 用户统计状态（6级等级体系）
interface StatsState {
  total: number;
  active: number;
  level1: number;   // 会员
  level2: number;   // 打版代言人
  level3: number;   // 代理商
  level4: number;   // 批发商
  level5: number;   // 首席分公司
  level6: number;   // 集团事业部
  newThisMonth: number;
  loading: boolean;
}

// 异步thunk
export const fetchUsers = createAsyncThunk(
  'user/fetchUsers',
  async (params: UserQueryParams = {}, { rejectWithValue }) => {
    try {
      const response = await userApi.getUsers(params);
      return response;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || '获取用户列表失败');
    }
  }
);

export const fetchUserDetail = createAsyncThunk(
  'user/fetchUserDetail',
  async (userId: string | number, { rejectWithValue }) => {
    try {
      const response = await userApi.getUserDetail(userId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || '获取用户详情失败');
    }
  }
);

export const updateUser = createAsyncThunk(
  'user/updateUser',
  async ({ userId, data }: { userId: string | number; data: Record<string, any> }, { rejectWithValue }) => {
    try {
      const response = await userApi.updateUser(userId, data);
      return response;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || '更新用户信息失败');
    }
  }
);

export const deleteUser = createAsyncThunk(
  'user/deleteUser',
  async (userId: string | number, { rejectWithValue }) => {
    try {
      await userApi.deleteUser(userId);
      return userId;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || '删除用户失败');
    }
  }
);

// 获取用户统计
export const fetchUserStats = createAsyncThunk(
  'user/fetchUserStats',
  async (_, { rejectWithValue }) => {
    try {
      const stats = await userApi.getUserStats();
      return stats;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || '获取用户统计失败');
    }
  }
);

// 修改用户状态
export const changeUserStatus = createAsyncThunk(
  'user/changeUserStatus',
  async ({ userId, status }: { userId: string | number; status: boolean }, { rejectWithValue }) => {
    try {
      await userApi.updateUser(userId, { status: status ? 1 : 0 });
      return { userId, status };
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || '修改用户状态失败');
    }
  }
);

// 修改用户等级
export const changeUserLevel = createAsyncThunk(
  'user/changeUserLevel',
  async ({ userId, agentLevel }: { userId: string | number; agentLevel: number }, { rejectWithValue }) => {
    try {
      await userApi.updateUser(userId, { agent_level: agentLevel });
      return { userId, agentLevel };
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || '修改用户等级失败');
    }
  }
);

// 余额调整
export const adjustBalance = createAsyncThunk(
  'user/adjustBalance',
  async (params: { userId: string | number; amount: number; remark?: string }, { rejectWithValue }) => {
    try {
      const result = await userApi.adjustBalance(params.userId, {
        amount: params.amount,
        remark: params.remark,
      });
      return result;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || '余额调整失败');
    }
  }
);

// 获取余额日志
export const fetchBalanceLogs = createAsyncThunk(
  'user/fetchBalanceLogs',
  async (params: { userId: string | number; page?: number; pageSize?: number }, { rejectWithValue }) => {
    try {
      const result = await userApi.getBalanceLogs(params.userId, {
        page: params.page,
        pageSize: params.pageSize,
      });
      return result;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || '获取余额日志失败');
    }
  }
);

// 初始状态
interface UserState {
  users: any[];
  currentUser: any | null;
  loading: boolean;
  error: string | null;
  queryParams: UserQueryParams;
  total: number;
  page: number;
  pageSize: number;
  stats: StatsState;
  balanceLogs: {
    list: BalanceLog[];
    total: number;
    page: number;
    pageSize: number;
    loading: boolean;
  };
}

const initialState: UserState = {
  users: [],
  currentUser: null,
  loading: false,
  error: null,
  queryParams: {
    page: 1,
    pageSize: 10,
  },
  total: 0,
  page: 1,
  pageSize: 10,
  stats: {
    total: 0,
    active: 0,
    level1: 0,
    level2: 0,
    level3: 0,
    level4: 0,
    level5: 0,
    level6: 0,
    newThisMonth: 0,
    loading: false,
  },
  balanceLogs: {
    list: [],
    total: 0,
    page: 1,
    pageSize: 20,
    loading: false,
  },
};

// 创建slice
const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setQueryParams: (state, action: PayloadAction<Partial<UserQueryParams>>) => {
      state.queryParams = { ...state.queryParams, ...action.payload };
    },
    resetQueryParams: (state) => {
      state.queryParams = initialState.queryParams;
    },
    setCurrentUser: (state, action: PayloadAction<any>) => {
      state.currentUser = action.payload;
    },
    clearCurrentUser: (state) => {
      state.currentUser = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchUsers
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload.users;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.pageSize = action.payload.pageSize;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || '获取用户列表失败';
      })
      // fetchUserDetail
      .addCase(fetchUserDetail.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserDetail.fulfilled, (state, action) => {
        state.loading = false;
        state.currentUser = action.payload;
      })
      .addCase(fetchUserDetail.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || '获取用户详情失败';
      })
      // updateUser
      .addCase(updateUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        state.loading = false;
        const updatedUser = action.payload;
        const index = state.users.findIndex(user => String(user.id) === String(updatedUser.id));
        if (index !== -1) {
          state.users[index] = { ...state.users[index], ...updatedUser };
        }
        if (state.currentUser && String(state.currentUser.id) === String(updatedUser.id)) {
          state.currentUser = { ...state.currentUser, ...updatedUser };
        }
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || '更新用户信息失败';
      })
      // deleteUser
      .addCase(deleteUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.loading = false;
        state.users = state.users.filter(user => String(user.id) !== String(action.payload));
        state.total -= 1;
      })
      .addCase(deleteUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || '删除用户失败';
      })
      // fetchUserStats
      .addCase(fetchUserStats.pending, (state) => {
        state.stats.loading = true;
      })
      .addCase(fetchUserStats.fulfilled, (state, action) => {
        state.stats.loading = false;
        state.stats = { ...action.payload, loading: false };
      })
      .addCase(fetchUserStats.rejected, (state) => {
        state.stats.loading = false;
      })
      // changeUserStatus
      .addCase(changeUserStatus.fulfilled, (state, action) => {
        const { userId, status } = action.payload;
        const index = state.users.findIndex(user => String(user.id) === String(userId));
        if (index !== -1) {
          state.users[index].status = status ? 1 : 0;
        }
      })
      // changeUserLevel
      .addCase(changeUserLevel.fulfilled, (state, action) => {
        const { userId, agentLevel } = action.payload;
        const index = state.users.findIndex(user => String(user.id) === String(userId));
        if (index !== -1) {
          state.users[index].agent_level = agentLevel;
        }
      })
      // adjustBalance
      .addCase(adjustBalance.fulfilled, (state, action) => {
        const { userId, balanceAfter } = action.payload;
        const index = state.users.findIndex(user => String(user.id) === String(userId));
        if (index !== -1) {
          state.users[index].balance = balanceAfter;
        }
        if (state.currentUser && String(state.currentUser.id) === String(userId)) {
          state.currentUser.balance = balanceAfter;
        }
      })
      // fetchBalanceLogs
      .addCase(fetchBalanceLogs.pending, (state) => {
        state.balanceLogs.loading = true;
      })
      .addCase(fetchBalanceLogs.fulfilled, (state, action) => {
        state.balanceLogs.loading = false;
        state.balanceLogs = { ...action.payload, loading: false };
      })
      .addCase(fetchBalanceLogs.rejected, (state) => {
        state.balanceLogs.loading = false;
      });
  },
});

// 导出actions
export const {
  setQueryParams,
  resetQueryParams,
  setCurrentUser,
  clearCurrentUser,
  clearError,
} = userSlice.actions;

// 导出reducer
export default userSlice.reducer;

// 导出选择器
export const selectUsers = (state: { user: UserState }) => state.user.users;
export const selectUserStats = (state: { user: UserState }) => state.user.stats;
export const selectUserLoading = (state: { user: UserState }) => state.user.loading;
export const selectUserPagination = (state: { user: UserState }) => ({
  total: state.user.total,
  page: state.user.page,
  pageSize: state.user.pageSize,
});
export const selectUserFilters = (state: { user: UserState }) => state.user.queryParams;
export const selectCurrentUser = (state: { user: UserState }) => state.user.currentUser;
export const selectBalanceLogs = (state: { user: UserState }) => state.user.balanceLogs;

// 别名兼容
export const setFilters = setQueryParams;
export const clearFilters = resetQueryParams;
