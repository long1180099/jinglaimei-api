import apiClient from '../utils/apiClient';

export interface BannerItem {
  id: number;
  key: string;
  image_url: string;
  title?: string;
  link_url?: string;
  status?: number;
  sort_order: number;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

interface BannerListResponse {
  list: BannerItem[];
  total: number;
}

// 获取轮播图列表
export const fetchBanners = (): Promise<{ data: BannerListResponse }> => {
  return apiClient.get('/banners');
};

// 获取单个轮播图详情
export const fetchBanner = (id: number): Promise<{ data: BannerItem }> => {
  return apiClient.get(`/banners/${id}`);
};

// 新增轮播图
export const createBanner = (data: Partial<BannerItem>): Promise<{ data: BannerItem }> => {
  return apiClient.post('/banners', data);
};

// 更新轮播图
export const updateBanner = (id: number, data: Partial<BannerItem>): Promise<{ data: BannerItem }> => {
  return apiClient.put(`/banners/${id}`, data);
};

// 删除轮播图
export const deleteBanner = (id: number): Promise<{ data: { deleted: boolean; id: number } }> => {
  return apiClient.delete(`/banners/${id}`);
};

// 批量更新排序
export const batchSortBanners = (items: { id: number; sort_order: number }[]): Promise<{ data: { updated: number } }> => {
  return apiClient.put('/banners/batch-sort', { items });
};

// 更新状态
export const updateBannerStatus = (id: number, status: number): Promise<{ data: { id: number; status: number } }> => {
  return apiClient.patch(`/banners/${id}/status`, { status });
};
