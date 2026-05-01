/**
 * 皮肤分析管理模块 - API服务
 */

import axios from 'axios';

const API_BASE = '/api/mp/skin-analysis';

// 创建axios实例（带token认证）
const axiosInstance = axios.create({
  timeout: 30000,
});

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('jlm_auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response.data,
  (error) => Promise.reject(error)
);

// ==================== 皮肤问题库 ====================
export const skinIssueApi = {
  // 获取问题列表
  getIssues: (params?: { category?: string; keyword?: string }) => {
    return axiosInstance.get(`${API_BASE}/issues`, { params });
  },

  // 新增问题
  createIssue: (data: { name: string; category: string; description: string; icon: string }) => {
    return axiosInstance.post(`${API_BASE}/admin/issues`, data);
  },

  // 更新问题
  updateIssue: (id: number, data: Partial<{ name: string; category: string; description: string; icon: string; sort_order: number }>) => {
    return axiosInstance.put(`${API_BASE}/admin/issues/${id}`, data);
  },

  // 删除问题
  deleteIssue: (id: number) => {
    return axiosInstance.delete(`${API_BASE}/admin/issues/${id}`);
  },
};

// ==================== 成因话术库 ====================
export const causeApi = {
  // 获取成因列表
  getCauses: (issueId?: number) => {
    const params = issueId ? { issue_id: issueId } : {};
    return axiosInstance.get(`${API_BASE}/admin/causes`, { params });
  },

  // 新增/编辑成因
  saveCause: (data: { id?: number; issue_id: number; cause_title: string; cause_content: string; care_advice: string }) => {
    if (data.id) {
      return axiosInstance.put(`${API_BASE}/admin/causes/${data.id}`, data);
    }
    return axiosInstance.post(`${API_BASE}/admin/causes`, data);
  },

  // 删除成因
  deleteCause: (id: number) => {
    return axiosInstance.delete(`${API_BASE}/admin/causes/${id}`);
  },
};

// ==================== 养护方案库 ====================
export const carePlanApi = {
  // 获取养护方案列表
  getCarePlans: () => {
    return axiosInstance.get(`${API_BASE}/admin/care-plans`);
  },

  // 新增/编辑方案
  saveCarePlan: (data: { id?: number; plan_type: string; title: string; content: string; steps: string; frequency: string; duration: string }) => {
    if (data.id) {
      return axiosInstance.put(`${API_BASE}/admin/care-plans/${data.id}`, data);
    }
    return axiosInstance.post(`${API_BASE}/admin/care-plans`, data);
  },

  // 删除方案
  deleteCarePlan: (id: number) => {
    return axiosInstance.delete(`${API_BASE}/admin/care-plans/${id}`);
  },
};

// ==================== 产品匹配库 ====================
export const productMatchApi = {
  // 获取产品匹配列表
  getProductMatches: (issueId?: number) => {
    const params = issueId ? { issue_id: issueId } : {};
    return axiosInstance.get(`${API_BASE}/admin/product-matches`, { params });
  },

  // 绑定产品到问题
  bindProduct: (data: { issue_id: number; product_id: number; recommend_reason: string; usage_method: string }) => {
    return axiosInstance.post(`${API_BASE}/admin/product-matches`, data);
  },

  // 解绑产品
  unbindProduct: (id: number) => {
    return axiosInstance.delete(`${API_BASE}/admin/product-matches/${id}`);
  },

  // 获取可选商品列表
  getAvailableProducts: () => {
    return axiosInstance.get(`${API_BASE}/admin/products`);
  },
};

// ==================== 诊断报告 ====================
export const reportApi = {
  // 报告列表
  getReports: (params?: { page?: number; pageSize?: number; userId?: number; startDate?: string; endDate?: string }) => {
    return axiosInstance.get(`${API_BASE}/admin/reports`, { params });
  },

  // 报告详情
  getReportDetail: (id: number) => {
    return axiosInstance.get(`${API_BASE}/report/${id}`);
  },
};

// ==================== 数据统计 ====================
export const statsApi = {
  // 总览统计
  getOverview: () => {
    return axiosInstance.get(`${API_BASE}/admin/stats/overview`);
  },

  // 问题类型分布
  getIssueDistribution: (period?: string) => {
    const params = period ? { period } : {};
    return axiosInstance.get(`${API_BASE}/admin/stats/issues`, { params });
  },

  // 日/月/年问诊量趋势
  getTrend: (period: 'daily' | 'monthly' | 'yearly') => {
    return axiosInstance.get(`${API_BASE}/admin/stats/trend`, { params: { period } });
  },

  // 产品推荐排行
  getProductRanking: (limit?: number) => {
    const params = limit ? { limit } : {};
    return axiosInstance.get(`${API_BASE}/admin/stats/products`, { params });
  },

  // 代理商客户报告
  getAgentClientReports: (agentId: number) => {
    return axiosInstance.get(`${API_BASE}/admin/reports/agent/${agentId}`);
  },
};
