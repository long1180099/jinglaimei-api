/**
 * 排行榜管理API服务
 * 对接后端 /api/rankings/* 接口
 */
import apiClient from '../utils/apiClient';

export interface RankingConfig {
  id?: number;
  user_id: number;
  username: string;
  real_name: string;
  nickname: string;
  avatar_url: string;
  phone: string;
  agent_level: number;
  total_income: number;
  period_income: number;
  period_orders: number;
  direct_count: number;
  // 配置字段
  rank_position?: number | null;
  display_name?: string | null;
  highlight_color: string;
  badge_text?: string | null;
  is_pinned: number;
  is_hidden: number;
  custom_note?: string | null;
}

export interface RankingSettings {
  title: string;
  show_count: string;
  period: string;
  auto_refresh: string;
  enable_top3: string;
  background_color: string;
}

export interface RankingListResult {
  list: RankingConfig[];
  total: number;
  page: number;
  pageSize: number;
}

class RankingApiService {
  /** 获取排行榜配置列表 */
  async getList(params: {
    page?: number;
    pageSize?: number;
    search?: string;
    period?: 'month' | 'quarter' | 'all';
  } = {}): Promise<RankingListResult> {
    const response = await apiClient.get('/rankings/configs', { params });
    return response as RankingListResult;
  }

  /** 更新单个用户排行配置 */
  async updateConfig(userId: number, data: Partial<RankingConfig>): Promise<void> {
    await apiClient.put(`/rankings/configs/${userId}`, data);
  }

  /** 批量更新排名位置 */
  async batchUpdatePosition(items: { user_id: number; rank_position: number }[]): Promise<void> {
    await apiClient.put('/rankings/configs/batch-position', { items });
  }

  /** 获取展示设置 */
  async getSettings(): Promise<RankingSettings> {
    const response = await apiClient.get('/rankings/settings');
    return response as RankingSettings;
  }

  /** 保存展示设置 */
  async saveSettings(data: Partial<RankingSettings>): Promise<void> {
    await apiClient.put('/rankings/settings', data);
  }

  /** 手动同步数据 */
  async syncData(params: { limit?: number; period?: string }): Promise<{ synced: number }> {
    const response = await apiClient.post('/rankings/sync', params);
    return response as { synced: number };
  }
}

export const rankingApi = new RankingApiService();
