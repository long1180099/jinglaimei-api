/**
 * 用户管理 API 接口
 * 对接真实后端 API（dbApi）
 * 
 * 注意：apiClient 的响应拦截器在 code===0 时已解包为 data.data
 * 所以 dbApi 返回值直接就是业务数据，不需要再 .data.data
 */

import { usersApi } from '../services/dbApi';
import apiClient from '../utils/apiClient';

// 用户查询参数
export interface UserQueryParams {
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

// 用户查询结果
export interface UserQueryResult {
  users: any[];
  total: number;
  page: number;
  pageSize: number;
}

// 用户统计信息（6级等级体系）
export interface UserStats {
  total: number;
  active: number;
  level1: number;   // 会员
  level2: number;   // 打版代言人
  level3: number;   // 代理商
  level4: number;   // 批发商
  level5: number;   // 首席分公司
  level6: number;   // 集团事业部
  newThisMonth: number;
}

// 余额日志
export interface BalanceLog {
  id: number;
  user_id: number;
  change_type: string;
  change_amount: number;
  balance_before: number;
  balance_after: number;
  operator_id: number | null;
  operator_name: string;
  remark: string;
  created_at: string;
}

// 余额调整结果
export interface BalanceAdjustResult {
  userId: number;
  balanceBefore: number;
  balanceAfter: number;
  changeAmount: number;
}

// API 接口
export const userApi = {
  // 获取用户列表
  async getUsers(params: UserQueryParams = {}): Promise<UserQueryResult> {
    const data: any = await usersApi.getList({
      page: params.page || 1,
      pageSize: params.pageSize || 10,
      keyword: params.search,
      status: params.status,
      agentLevel: params.agent_level,
    });
    // apiClient 已解包，data 直接是 { list, total, page, pageSize }
    return {
      users: data?.list || [],
      total: data?.total || 0,
      page: data?.page || 1,
      pageSize: data?.pageSize || 10,
    };
  },

  // 获取用户详情
  async getUserDetail(userId: string | number): Promise<any> {
    return await usersApi.getDetail(Number(userId));
  },

  // 更新用户信息
  async updateUser(userId: string | number, data: Record<string, any>): Promise<any> {
    return await usersApi.update(Number(userId), data);
  },

  // 删除用户
  async deleteUser(userId: string | number): Promise<void> {
    await usersApi.delete(Number(userId));
  },

  // 获取用户统计信息
  async getUserStats(): Promise<UserStats> {
    return await usersApi.getStats() as any;
  },

  // 调整用户余额
  async adjustBalance(userId: string | number, data: {
    amount: number;
    remark?: string;
    operator_id?: number;
    operator_name?: string;
  }): Promise<BalanceAdjustResult> {
    return await usersApi.adjustBalance(Number(userId), data) as any;
  },

  // 获取余额变动日志
  async getBalanceLogs(userId: string | number, params?: {
    page?: number;
    pageSize?: number;
    type?: string;
  }): Promise<{ list: BalanceLog[]; total: number; page: number; pageSize: number }> {
    return await usersApi.getBalanceLogs(Number(userId), params) as any;
  },

  // 批量操作
  async batchUpdateUsers(userIds: (string | number)[], data: Record<string, any>): Promise<void> {
    await Promise.all(userIds.map(id => usersApi.update(Number(id), data)));
  },

  // 导出用户数据
  async exportUsers(params: UserQueryParams = {}): Promise<string> {
    const result = await this.getUsers(params);
    return JSON.stringify(result.users, null, 2);
  },

  // 获取用户团队树（含上下级关系）
  async getTeamTree(userId: string | number): Promise<any> {
    const response: any = await apiClient.get(`/users/${userId}/team-tree`);
    return response.data || response;
  },

  // 获取向上链路
  async getUplineChain(userId: string | number): Promise<{ uplineChain: any[]; downlines: any[] }> {
    const response: any = await apiClient.get(`/users/${userId}/upline-chain`);
    return response.data || response;
  },
};
