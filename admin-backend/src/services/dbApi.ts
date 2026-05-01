/**
 * 真实数据库 API 服务
 * 替代所有 Mock 数据，对接 localhost:4000 (SQLite数据库服务)
 */
import apiClient from '../utils/apiClient';

// ==================== 认证 ====================
export const authApi = {
  login: (username: string, password: string) =>
    apiClient.post('/auth/login', { username, password }),

  logout: () =>
    apiClient.post('/auth/logout'),

  getProfile: () =>
    apiClient.get('/auth/profile'),
};

// ==================== 仪表盘 ====================
export const dashboardApi = {
  getOverview: () =>
    apiClient.get('/dashboard/overview'),

  getSalesTrend: (days: number = 30) =>
    apiClient.get('/dashboard/sales-trend', { params: { days } }),

  getTopProducts: () =>
    apiClient.get('/dashboard/top-products'),

  getAgentRank: (period: 'month' | 'quarter' | 'year' | 'all' = 'month') =>
    apiClient.get('/dashboard/agent-rank', { params: { period } }),

  getTeamPerformance: () =>
    apiClient.get('/dashboard/team-performance'),

  getUserGrowth: () =>
    apiClient.get('/dashboard/user-growth'),
};

// ==================== 用户管理 ====================
export const usersApi = {
  getList: (params?: {
    page?: number; pageSize?: number; keyword?: string;
    status?: number; agentLevel?: number; teamId?: number;
  }) => apiClient.get('/users', { params }),

  getStats: () =>
    apiClient.get('/users/stats'),

  getDetail: (id: number) =>
    apiClient.get(`/users/${id}`),

  getTeamTree: (id: number) =>
    apiClient.get(`/users/${id}/team-tree`),

  create: (data: Record<string, any>) =>
    apiClient.post('/users', data),

  update: (id: number, data: Record<string, any>) =>
    apiClient.put(`/users/${id}`, data),

  delete: (id: number) =>
    apiClient.delete(`/users/${id}`),

  // 余额管理
  adjustBalance: (id: number, data: { amount: number; remark?: string; operator_id?: number; operator_name?: string }) =>
    apiClient.post(`/users/${id}/balance`, data),

  getBalanceLogs: (id: number, params?: { page?: number; pageSize?: number; type?: string }) =>
    apiClient.get(`/users/${id}/balance-logs`, { params }),
};

// ==================== 商品管理 ====================
export const productsApi = {
  getList: (params?: {
    page?: number; pageSize?: number; keyword?: string;
    status?: number; categoryId?: number; isHot?: number;
  }) => apiClient.get('/products', { params }),

  getStats: () =>
    apiClient.get('/products/stats'),

  getCategories: () =>
    apiClient.get('/products/categories'),

  getDetail: (id: number) =>
    apiClient.get(`/products/${id}`),

  create: (data: Record<string, any>) =>
    apiClient.post('/products', data),

  update: (id: number, data: Record<string, any>) =>
    apiClient.put(`/products/${id}`, data),

  updateStock: (id: number, quantity: number, type: 'add' | 'set' = 'add') =>
    apiClient.put(`/products/${id}/stock`, { quantity, type }),
};

// ==================== 订单管理 ====================
export const ordersApi = {
  getList: (params?: {
    page?: number; pageSize?: number; keyword?: string;
    status?: number; userId?: number; startDate?: string; endDate?: string;
  }) => apiClient.get('/orders', { params }),

  getStats: () =>
    apiClient.get('/orders/stats'),

  getDetail: (id: number) =>
    apiClient.get(`/orders/${id}`),

  create: (data: Record<string, any>) =>
    apiClient.post('/orders', data),

  updateStatus: (id: number, status: number, extra?: { remark?: string; shippingNo?: string }) =>
    apiClient.put(`/orders/${id}/status`, { status, ...extra }),
};

// ==================== 收益管理 ====================
export const commissionsApi = {
  getList: (params?: {
    page?: number; pageSize?: number; userId?: number;
    status?: number; type?: number; startDate?: string; endDate?: string;
  }) => apiClient.get('/commissions', { params }),

  getStats: () =>
    apiClient.get('/commissions/stats'),

  getWithdrawals: (params?: { page?: number; pageSize?: number; status?: number; userId?: number }) =>
    apiClient.get('/commissions/withdrawals', { params }),

  auditWithdrawal: (id: number, status: number, remark?: string) =>
    apiClient.put(`/commissions/withdrawals/${id}/audit`, { status, remark }),

  applyWithdrawal: (data: Record<string, any>) =>
    apiClient.post('/commissions/withdrawals', data),
};

// ==================== 团队管理 ====================
export const teamsApi = {
  getList: (params?: { page?: number; pageSize?: number; keyword?: string }) =>
    apiClient.get('/teams', { params }),

  getStats: () =>
    apiClient.get('/teams/stats'),

  getDetail: (id: number) =>
    apiClient.get(`/teams/${id}`),

  getRanking: (id: number) =>
    apiClient.get(`/teams/${id}/ranking`),

  create: (data: Record<string, any>) =>
    apiClient.post('/teams', data),

  update: (id: number, data: Record<string, any>) =>
    apiClient.put(`/teams/${id}`, data),
};

// ==================== 商学院 ====================
export const schoolDbApi = {
  getCourses: (params?: {
    page?: number; pageSize?: number; type?: number; status?: number; keyword?: string;
  }) => apiClient.get('/school/courses', { params }),

  getStats: () =>
    apiClient.get('/school/stats'),

  getCourseDetail: (id: number) =>
    apiClient.get(`/school/courses/${id}`),

  createCourse: (data: Record<string, any>) =>
    apiClient.post('/school/courses', data),

  updateCourse: (id: number, data: Record<string, any>) =>
    apiClient.put(`/school/courses/${id}`, data),

  getProgress: (params?: { userId?: number; courseId?: number }) =>
    apiClient.get('/school/progress', { params }),

  updateProgress: (data: { user_id: number; course_id: number; progress_percent: number; study_duration?: number }) =>
    apiClient.post('/school/progress', data),
};

// ==================== 库存管理 ====================
export const inventoryApi = {
  // 库存列表
  getList: (params?: {
    page?: number; pageSize?: number; keyword?: string;
    category?: string; status?: number | string;
  }) => apiClient.get('/inventory', { params }),

  // 统计概览
  getStats: () =>
    apiClient.get('/inventory/stats'),

  // 分类列表
  getCategories: () =>
    apiClient.get('/inventory/categories'),

  // 数据报表（day/month/year）
  getReport: (type?: 'day' | 'month' | 'year', extra?: { year?: string; month?: string }) =>
    apiClient.get('/inventory/report', { params: { type, ...extra } }),

  // 商品详情（含出入库记录）
  getDetail: (id: number, params?: { page?: number; pageSize?: number; type?: string }) =>
    apiClient.get(`/inventory/${id}`, { params }),

  // 入库
  stockIn: (data: Record<string, any>) =>
    apiClient.post('/inventory', data),

  // 出库
  stockOut: (data: Record<string, any>) =>
    apiClient.post('/inventory/out', data),

  // 编辑商品信息
  update: (id: number, data: Record<string, any>) =>
    apiClient.put(`/inventory/${id}`, data),

  // 删除商品
  delete: (id: number) =>
    apiClient.delete(`/inventory/${id}`),

  // 特供出货：搜索会员
  searchMembers: (keyword: string) =>
    apiClient.get('/inventory/search-members', { params: { keyword } }),

  // 特供出货：执行出库
  specialOut: (data: Record<string, any>) =>
    apiClient.post('/inventory/special-out', data),
};

export default {
  auth: authApi,
  dashboard: dashboardApi,
  users: usersApi,
  products: productsApi,
  orders: ordersApi,
  commissions: commissionsApi,
  teams: teamsApi,
  school: schoolDbApi,
  inventory: inventoryApi,
};
