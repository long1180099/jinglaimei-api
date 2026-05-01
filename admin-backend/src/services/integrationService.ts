/**
 * 前台-后台-中台数据联动服务
 * 实现三端数据同步与集成
 */

import axios from 'axios';

// 中台API基础配置
const MID_PLATFORM_BASE = process.env.REACT_APP_MID_PLATFORM_URL || 'http://localhost:4000';
const ACTION_LOG_BASE = process.env.REACT_APP_ACTION_LOG_URL || 'http://localhost:4001';

// 创建axios实例
const midPlatformClient = axios.create({
  baseURL: MID_PLATFORM_BASE,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
});

const actionLogClient = axios.create({
  baseURL: ACTION_LOG_BASE,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
});

// 请求拦截器 - 添加认证token
[midPlatformClient, actionLogClient].forEach(client => {
  client.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );
});

// ═══════════════════════════════════════════════════
// 用户数据联动
// ═══════════════════════════════════════════════════
export class UserIntegrationService {
  // 同步用户数据到行动日志系统
  static async syncUserToActionLog(userId: string, userData: any) {
    try {
      const response = await actionLogClient.post('/api/action-log/system/sync-user', {
        userId,
        ...userData,
        syncTime: new Date().toISOString()
      });
      return response.data;
    } catch (error) {
      console.error('用户数据同步失败:', error);
      throw error;
    }
  }

  // 获取用户完整画像（聚合三端数据）
  static async getUserProfile(userId: string) {
    try {
      const [basicInfo, actionLogStats, learningProgress] = await Promise.all([
        midPlatformClient.get(`/api/users/${userId}`),
        actionLogClient.get(`/api/action-log/system/user-stats/${userId}`).catch(() => ({ data: null })),
        midPlatformClient.get(`/api/school/user-progress/${userId}`).catch(() => ({ data: null }))
      ]);

      return {
        basic: basicInfo.data,
        actionLog: actionLogStats.data,
        learning: learningProgress.data,
        integrated: true
      };
    } catch (error) {
      console.error('获取用户画像失败:', error);
      throw error;
    }
  }
}

// ═══════════════════════════════════════════════════
// 业绩数据联动
// ═══════════════════════════════════════════════════
export class PerformanceIntegrationService {
  // 同步业绩数据到月度追踪
  static async syncMonthlyPerformance(userId: string, month: string, data: {
    target: number;
    actual: number;
    orders: number;
    newAgents: number;
  }) {
    try {
      const response = await actionLogClient.post('/api/action-log/monthly-tracking/update', {
        userId,
        month,
        ...data,
        completionRate: Math.round((data.actual / data.target) * 100),
        updatedAt: new Date().toISOString()
      });
      return response.data;
    } catch (error) {
      console.error('业绩数据同步失败:', error);
      throw error;
    }
  }

  // 获取业绩仪表盘数据
  static async getPerformanceDashboard(userId: string) {
    try {
      const [monthlyStats, yearlyProgress, teamPerformance] = await Promise.all([
        midPlatformClient.get(`/api/commissions/monthly-stats/${userId}`),
        actionLogClient.get(`/api/action-log/annual-goals/progress?userId=${userId}`),
        midPlatformClient.get(`/api/teams/performance/${userId}`)
      ]);

      return {
        monthly: monthlyStats.data,
        yearly: yearlyProgress.data,
        team: teamPerformance.data,
        integrated: true
      };
    } catch (error) {
      console.error('获取业绩仪表盘失败:', error);
      throw error;
    }
  }
}

// ═══════════════════════════════════════════════════
// 团队数据联动
// ═══════════════════════════════════════════════════
export class TeamIntegrationService {
  // 同步团队数据
  static async syncTeamData(teamId: string, members: any[]) {
    try {
      const response = await actionLogClient.post('/api/action-log/system/sync-team', {
        teamId,
        members,
        syncTime: new Date().toISOString()
      });
      return response.data;
    } catch (error) {
      console.error('团队数据同步失败:', error);
      throw error;
    }
  }

  // 获取团队完整数据
  static async getTeamFullData(teamId: string) {
    try {
      const [basicInfo, members, goals] = await Promise.all([
        midPlatformClient.get(`/api/teams/${teamId}`),
        midPlatformClient.get(`/api/teams/${teamId}/members`),
        actionLogClient.get(`/api/action-log/annual-goals?teamId=${teamId}`).catch(() => ({ data: null }))
      ]);

      return {
        basic: basicInfo.data,
        members: members.data,
        goals: goals.data,
        integrated: true
      };
    } catch (error) {
      console.error('获取团队完整数据失败:', error);
      throw error;
    }
  }
}

// ═══════════════════════════════════════════════════
// 商学院数据联动
// ═══════════════════════════════════════════════════
export class SchoolIntegrationService {
  // 同步学习记录到行动日志
  static async syncLearningToActionLog(userId: string, record: {
    contentType: 'video' | 'book' | 'script';
    contentId: string;
    title: string;
    duration: number;
    completed: boolean;
  }) {
    try {
      const response = await actionLogClient.post('/api/action-log/daily-goals/learning-record', {
        userId,
        date: new Date().toISOString().split('T')[0],
        learning: {
          content: `学习了${record.title}`,
          apply: record.completed ? '已完成学习' : '学习中'
        },
        record,
        syncTime: new Date().toISOString()
      });
      return response.data;
    } catch (error) {
      console.error('学习记录同步失败:', error);
      throw error;
    }
  }

  // 获取学习统计
  static async getLearningStatistics(userId: string) {
    try {
      const [schoolStats, actionLogMindset] = await Promise.all([
        midPlatformClient.get(`/api/school/statistics/${userId}`),
        actionLogClient.get(`/api/action-log/daily-goals/mindset-trend/${userId}?month=${new Date().getMonth() + 1}`)
          .catch(() => ({ data: null }))
      ]);

      return {
        school: schoolStats.data,
        mindset: actionLogMindset.data,
        integrated: true
      };
    } catch (error) {
      console.error('获取学习统计失败:', error);
      throw error;
    }
  }
}

// ═══════════════════════════════════════════════════
// 订单数据联动
// ═══════════════════════════════════════════════════
export class OrderIntegrationService {
  // 订单完成后同步到业绩追踪
  static async syncOrderToPerformance(orderData: {
    orderId: string;
    userId: string;
    amount: number;
    products: any[];
    createdAt: string;
  }) {
    try {
      const month = new Date(orderData.createdAt).getMonth() + 1;
      const response = await actionLogClient.post('/api/action-log/monthly-tracking/order-sync', {
        ...orderData,
        month: `${month}月`,
        syncTime: new Date().toISOString()
      });
      return response.data;
    } catch (error) {
      console.error('订单同步失败:', error);
      throw error;
    }
  }
}

// ═══════════════════════════════════════════════════
// 数据导出服务
// ═══════════════════════════════════════════════════
export class DataExportService {
  // 导出完整数据报告
  static async exportFullReport(userId: string, startDate: string, endDate: string) {
    try {
      const [actionLogData, performanceData, learningData] = await Promise.all([
        actionLogClient.get(`/api/action-log/reports/monthly/${startDate.slice(0, 7)}?userId=${userId}`),
        midPlatformClient.get(`/api/commissions/report/${userId}?start=${startDate}&end=${endDate}`),
        midPlatformClient.get(`/api/school/learning-report/${userId}?start=${startDate}&end=${endDate}`)
      ]);

      return {
        actionLog: actionLogData.data,
        performance: performanceData.data,
        learning: learningData.data,
        exportTime: new Date().toISOString()
      };
    } catch (error) {
      console.error('导出报告失败:', error);
      throw error;
    }
  }
}

// ═══════════════════════════════════════════════════
// 健康检查
// ═══════════════════════════════════════════════════
export class IntegrationHealthService {
  static async checkAllServices() {
    const results = {
      midPlatform: false,
      actionLog: false,
      timestamp: new Date().toISOString()
    };

    try {
      await midPlatformClient.get('/health');
      results.midPlatform = true;
    } catch (e) {
      console.warn('中台服务健康检查失败');
    }

    try {
      await actionLogClient.get('/health');
      results.actionLog = true;
    } catch (e) {
      console.warn('行动日志服务健康检查失败');
    }

    return results;
  }
}

export default {
  UserIntegrationService,
  PerformanceIntegrationService,
  TeamIntegrationService,
  SchoolIntegrationService,
  OrderIntegrationService,
  DataExportService,
  IntegrationHealthService
};
