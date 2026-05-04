/**
 * 产品使用日志 API
 */
import apiClient from '../utils/apiClient';

const BASE = '/usage-logs';

export const usageApi = {
  // 获取使用日志列表
  getList: (params?: Record<string, any>) =>
    apiClient.get(BASE, { params }),

  // 获取详情
  getDetail: (id: number) =>
    apiClient.get(`${BASE}/${id}`),

  // 删除（软删除，仅超管）
  delete: (id: number) =>
    apiClient.delete(`${BASE}/${id}`),

  // 导出 Excel（通过 URL 直接下载）
  getExportUrl: (params?: Record<string, any>) => {
    const queryString = new URLSearchParams(params as any).toString();
    return `/api${BASE}/export${queryString ? '?' + queryString : ''}`;
  }
};

export default usageApi;
