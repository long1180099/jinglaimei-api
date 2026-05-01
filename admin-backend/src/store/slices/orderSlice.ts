/**
 * 订单管理 Redux Slice
 * 对接真实后端 API
 */
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { ordersApi } from '../../services/dbApi';

// 订单查询参数
interface OrderQueryParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: number;
  userId?: number;
  startDate?: string;
  endDate?: string;
}

// 订单统计
interface OrderStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  todayAmount: number;
  monthAmount: number;
  trend: any[];
}

interface OrderState {
  orders: any[];
  currentOrder: any | null;
  loading: boolean;
  error: string | null;
  queryParams: OrderQueryParams;
  total: number;
  page: number;
  pageSize: number;
  stats: OrderStats | null;
  statsLoading: boolean;
}

const initialState: OrderState = {
  orders: [],
  currentOrder: null,
  loading: false,
  error: null,
  queryParams: { page: 1, pageSize: 10 },
  total: 0,
  page: 1,
  pageSize: 10,
  stats: null,
  statsLoading: false,
};

// 异步 Thunks
export const fetchOrders = createAsyncThunk(
  'orders/fetchOrders',
  async (params: OrderQueryParams = {}, { rejectWithValue }) => {
    try {
      const data: any = await ordersApi.getList(params);
      return data; // { list, total, page, pageSize }
    } catch (error: any) {
      return rejectWithValue(error?.message || '获取订单列表失败');
    }
  }
);

export const fetchOrderDetail = createAsyncThunk(
  'orders/fetchOrderDetail',
  async (orderId: number, { rejectWithValue }) => {
    try {
      return await ordersApi.getDetail(orderId);
    } catch (error: any) {
      return rejectWithValue(error?.message || '获取订单详情失败');
    }
  }
);

export const fetchOrderStats = createAsyncThunk(
  'orders/fetchOrderStats',
  async (_, { rejectWithValue }) => {
    try {
      return await ordersApi.getStats();
    } catch (error: any) {
      return rejectWithValue(error?.message || '获取订单统计失败');
    }
  }
);

export const updateOrderStatus = createAsyncThunk(
  'orders/updateOrderStatus',
  async (params: { orderId: number; status: number; remark?: string; shippingNo?: string }, { rejectWithValue }) => {
    try {
      await ordersApi.updateStatus(params.orderId, params.status, {
        remark: params.remark,
        shippingNo: params.shippingNo,
      });
      return params;
    } catch (error: any) {
      return rejectWithValue(error?.message || '更新订单状态失败');
    }
  }
);

const orderSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    setOrderQueryParams: (state, action: PayloadAction<Partial<OrderQueryParams>>) => {
      state.queryParams = { ...state.queryParams, ...action.payload };
    },
    resetOrderQueryParams: (state) => {
      state.queryParams = initialState.queryParams;
    },
    clearCurrentOrder: (state) => {
      state.currentOrder = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOrders.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.loading = false;
        const data = action.payload;
        state.orders = data?.list || [];
        state.total = data?.total || 0;
        state.page = data?.page || 1;
        state.pageSize = data?.pageSize || 10;
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchOrderDetail.pending, (state) => { state.loading = true; })
      .addCase(fetchOrderDetail.fulfilled, (state, action) => {
        state.loading = false;
        state.currentOrder = action.payload;
      })
      .addCase(fetchOrderDetail.rejected, (state) => { state.loading = false; })
      .addCase(fetchOrderStats.pending, (state) => { state.statsLoading = true; })
      .addCase(fetchOrderStats.fulfilled, (state, action) => {
        state.statsLoading = false;
        state.stats = action.payload as any;
      })
      .addCase(fetchOrderStats.rejected, (state) => { state.statsLoading = false; })
      .addCase(updateOrderStatus.fulfilled, (state, action) => {
        const { orderId, status } = action.payload;
        const index = state.orders.findIndex(o => o.id === orderId);
        if (index !== -1) {
          state.orders[index].order_status = status;
        }
        if (state.currentOrder?.id === orderId) {
          state.currentOrder.order_status = status;
        }
      });
  },
});

export const { setOrderQueryParams, resetOrderQueryParams, clearCurrentOrder } = orderSlice.actions;
export default orderSlice.reducer;

// Selectors
export const selectOrders = (state: { orders: OrderState }) => state.orders.orders;
export const selectOrderLoading = (state: { orders: OrderState }) => state.orders.loading;
export const selectOrderPagination = (state: { orders: OrderState }) => ({
  total: state.orders.total,
  page: state.orders.page,
  pageSize: state.orders.pageSize,
});
export const selectOrderQueryParams = (state: { orders: OrderState }) => state.orders.queryParams;
export const selectOrderStats = (state: { orders: OrderState }) => state.orders.stats;
export const selectCurrentOrder = (state: { orders: OrderState }) => state.orders.currentOrder;
