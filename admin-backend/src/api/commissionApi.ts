/**
 * 静莱美代理商收益管理API服务
 * 包含分润计算核心逻辑
 */

import { 
  CommissionRecord, 
  CommissionStats, 
  CommissionQueryParams, 
  CommissionReport,
  CommissionCalculationParams,
  CommissionCalculationResult,
  CommissionType,
  AgentLevel
} from '../types/commission';
import { mockCommissionRecords, mockCommissionStats, mockCommissionReports } from './mockData/commissionMockData';

// 等级配置
export const LEVEL_CONFIGS = {
  [AgentLevel.MEMBER]: {
    level: AgentLevel.MEMBER,
    name: '会员',
    discount: 1.0,           // 零售价×100%
    rechargeThreshold: 0,
    cargoValue: 0,
    color: '#8c8c8c'
  },
  [AgentLevel.MODEL_AGENT]: {
    level: AgentLevel.MODEL_AGENT,
    name: '打版代言人',
    discount: 0.5,           // 零售价×50%
    rechargeThreshold: 2980,
    cargoValue: 1500,
    color: '#52c41a'
  },
  [AgentLevel.AGENT]: {
    level: AgentLevel.AGENT,
    name: '代理商',
    discount: 0.5,           // 零售价×50%
    rechargeThreshold: 9800,
    cargoValue: 0,
    color: '#1890ff'
  },
  [AgentLevel.WHOLESALER]: {
    level: AgentLevel.WHOLESALER,
    name: '批发商',
    discount: 0.32,          // 零售价×32%
    rechargeThreshold: 39800,
    cargoValue: 10200,
    color: '#fa8c16'
  },
  [AgentLevel.CHIEF_COMPANY]: {
    level: AgentLevel.CHIEF_COMPANY,
    name: '首席分公司',
    discount: 0.23,          // 零售价×23%
    rechargeThreshold: 298000,
    cargoValue: 150000,
    color: '#f5222d'
  },
  [AgentLevel.GROUP_DIVISION]: {
    level: AgentLevel.GROUP_DIVISION,
    name: '集团事业部',
    discount: 0.18,          // 零售价×18%
    rechargeThreshold: 980000,
    cargoValue: 500000,
    color: '#722ed1'
  }
};

// 分润计算核心算法
export class CommissionCalculator {
  /**
   * 计算单笔订单的分润
   * 基于代理商等级和分润规则：
   * 1. 级差利润：上级等级 > 下级等级
   * 2. 平级奖励：上级等级 = 下级等级，且为首单
   * 3. 无分润：上级等级 <= 下级等级，且非首单
   */
  static calculateCommission(params: CommissionCalculationParams): CommissionCalculationResult {
    const {
      userId,
      parentId,
      userLevel,
      userPrice,
      parentLevel,
      parentPrice,
      orderAmount,
      quantity,
      isFirstOrder,
      firstRechargeAmount
    } = params;

    let commissionTo = '';
    let commissionType: CommissionType = CommissionType.LEVEL_DIFF;
    let commissionAmount = 0;
    let description = '';
    let profitOwnerLevel = parentLevel;
    let profitOwnerPrice = parentPrice;

    // 1. 检查直接上级等级是否高于下单用户
    if (parentLevel > userLevel) {
      // 级差利润：上级拿货价与下级拿货价的差额
      const priceDiff = parentPrice - userPrice;
      commissionAmount = priceDiff * quantity;
      commissionTo = parentId;
      commissionType = CommissionType.LEVEL_DIFF;
      description = `级差利润：${parentLevel}级上级 vs ${userLevel}级下级，差价¥${priceDiff.toFixed(2)} × ${quantity}件`;
    }
    // 2. 直接上级等级等于下单用户等级
    else if (parentLevel === userLevel) {
      // 平级情况
      if (isFirstOrder && firstRechargeAmount > 0) {
        // 平级奖励：首单可获得首次充值金额的20%
        commissionAmount = firstRechargeAmount * 0.2;
        commissionTo = parentId;
        commissionType = CommissionType.PEER_BONUS;
        description = `平级奖励：${parentLevel}级上级，首单奖励首次充值金额的20%（¥${firstRechargeAmount} × 20%）`;
      } else {
        // 非首单或首次充值金额为0，无分润
        commissionAmount = 0;
        description = `平级无分润：${parentLevel}级上级 vs ${userLevel}级下级${
          isFirstOrder ? '，但首次充值金额为0' : '，且非首单'
        }`;
      }
    }
    // 3. 直接上级等级低于下单用户等级
    else {
      // 需要向上查找更高级别的上级
      commissionAmount = 0;
      description = `上级等级(${parentLevel})低于下级等级(${userLevel})，无分润`;
    }

    return {
      success: commissionAmount > 0,
      commissionTo,
      commissionType,
      commissionAmount,
      commissionRate: commissionAmount > 0 ? (commissionAmount / orderAmount) * 100 : 0,
      description,
      profitOwnerLevel,
      profitOwnerPrice,
      calculationDetails: {
        userLevel,
        userPrice,
        parentLevel,
        parentPrice,
        profitOwnerFound: commissionAmount > 0,
        profitOwnerLevel: parentLevel,
        profitOwnerPrice: parentPrice,
        levelDiff: parentLevel > userLevel ? parentPrice - userPrice : undefined,
        firstRechargeAmount,
        peerBonusRate: isFirstOrder && parentLevel === userLevel ? 0.2 : undefined
      }
    };
  }

  /**
   * 模拟向上查找更高级别上级（真实环境中需要查询数据库）
   */
  static findHigherLevelParent(currentUserId: string, currentLevel: AgentLevel): string | null {
    // 模拟查找逻辑
    const higherLevelParents = {
      'user_001': 'user_101',  // 会员 → 打版代言人
      'user_002': 'user_102',  // 打版代言人 → 代理商
      'user_003': 'user_103',  // 代理商 → 批发商
      'user_004': 'user_104',  // 批发商 → 首席
    };
    
    return (higherLevelParents as Record<string, string>)[currentUserId] || null;
  }
}

// API服务函数
export const commissionApi = {
  /**
   * 获取收益记录列表
   */
  getCommissionRecords: async (params: CommissionQueryParams = {}): Promise<{
    records: CommissionRecord[];
    total: number;
    page: number;
    pageSize: number;
  }> => {
    // 模拟API延迟
    await new Promise(resolve => setTimeout(resolve, 300));
    
    let filteredRecords = [...mockCommissionRecords];
    
    // 应用筛选条件
    if (params.userId) {
      filteredRecords = filteredRecords.filter(record => record.userId === params.userId);
    }
    
    if (params.commissionType) {
      filteredRecords = filteredRecords.filter(record => record.commissionType === params.commissionType);
    }
    
    if (params.startDate) {
      filteredRecords = filteredRecords.filter(record => record.createdAt >= params.startDate!);
    }
    
    if (params.endDate) {
      filteredRecords = filteredRecords.filter(record => record.createdAt <= params.endDate!);
    }
    
    // 排序
    if (params.sortBy) {
      filteredRecords.sort((a, b) => {
        const order = params.sortOrder === 'desc' ? -1 : 1;
        if (params.sortBy === 'amount') {
          return (a.amount - b.amount) * order;
        } else if (params.sortBy === 'createdAt') {
          return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * order;
        }
        return 0;
      });
    }
    
    // 分页
    const page = params.page || 1;
    const pageSize = params.pageSize || 10;
    const startIndex = (page - 1) * pageSize;
    const paginatedRecords = filteredRecords.slice(startIndex, startIndex + pageSize);
    
    return {
      records: paginatedRecords,
      total: filteredRecords.length,
      page,
      pageSize
    };
  },

  /**
   * 获取收益统计
   */
  getCommissionStats: async (userId?: string): Promise<CommissionStats> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const stats = mockCommissionStats;
    
    // 如果指定了用户ID，过滤该用户的数据
    if (userId) {
      const userRecords = mockCommissionRecords.filter(record => record.userId === userId);
      
      return {
        totalCommission: userRecords.reduce((sum, record) => sum + record.amount, 0),
        monthCommission: userRecords
          .filter(record => {
            const recordDate = new Date(record.createdAt);
            const now = new Date();
            return recordDate.getMonth() === now.getMonth() && 
                   recordDate.getFullYear() === now.getFullYear();
          })
          .reduce((sum, record) => sum + record.amount, 0),
        todayCommission: userRecords
          .filter(record => {
            const recordDate = new Date(record.createdAt);
            const today = new Date();
            return recordDate.getDate() === today.getDate() &&
                   recordDate.getMonth() === today.getMonth() &&
                   recordDate.getFullYear() === today.getFullYear();
          })
          .reduce((sum, record) => sum + record.amount, 0),
        yearCommission: userRecords
          .filter(record => {
            const recordDate = new Date(record.createdAt);
            const now = new Date();
            return recordDate.getFullYear() === now.getFullYear();
          })
          .reduce((sum, record) => sum + record.amount, 0),
        byType: {
          levelDiff: userRecords
            .filter(record => record.commissionType === CommissionType.LEVEL_DIFF)
            .reduce((sum, record) => sum + record.amount, 0),
          peerBonus: userRecords
            .filter(record => record.commissionType === CommissionType.PEER_BONUS)
            .reduce((sum, record) => sum + record.amount, 0),
          upgradeBonus: userRecords
            .filter(record => record.commissionType === CommissionType.UPGRADE_BONUS)
            .reduce((sum, record) => sum + record.amount, 0),
        },
        byLevel: {
          fromLevel2: userRecords
            .filter(record => record.fromUserInfo?.level === AgentLevel.MODEL_AGENT)
            .reduce((sum, record) => sum + record.amount, 0),
          fromLevel3: userRecords
            .filter(record => record.fromUserInfo?.level === AgentLevel.AGENT)
            .reduce((sum, record) => sum + record.amount, 0),
          fromLevel4: userRecords
            .filter(record => record.fromUserInfo?.level === AgentLevel.WHOLESALER)
            .reduce((sum, record) => sum + record.amount, 0),
          fromLevel5: userRecords
            .filter(record => record.fromUserInfo?.level === AgentLevel.CHIEF_COMPANY)
            .reduce((sum, record) => sum + record.amount, 0),
          fromLevel6: userRecords
            .filter(record => record.fromUserInfo?.level === AgentLevel.GROUP_DIVISION)
            .reduce((sum, record) => sum + record.amount, 0),
        },
        trend: stats.trend, // 使用模拟的趋势数据
        topContributors: stats.topContributors.filter(contributor => 
          userRecords.some(record => record.fromUserId === contributor.userId)
        )
      };
    }
    
    return stats;
  },

  /**
   * 获取收益报表
   */
  getCommissionReport: async (period: 'daily' | 'weekly' | 'monthly' | 'yearly', startDate: string, endDate: string): Promise<CommissionReport> => {
    await new Promise(resolve => setTimeout(resolve, 400));
    
    // 根据时间段选择模拟数据
    const reportKey = `${period}_${startDate}_${endDate}`;
    const mockReport = mockCommissionReports[reportKey] || mockCommissionReports['monthly_2026-03-01_2026-03-31'];
    
    return mockReport;
  },

  /**
   * 手动计算分润（测试用）
   */
  calculateCommissionManually: async (params: CommissionCalculationParams): Promise<CommissionCalculationResult> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return CommissionCalculator.calculateCommission(params);
  },

  /**
   * 导出收益数据
   */
  exportCommissionData: async (params: CommissionQueryParams): Promise<string> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const { records } = await commissionApi.getCommissionRecords(params);
    
    // 生成CSV格式数据
    const headers = ['ID', '收益接收人', '来源用户', '分润类型', '金额', '描述', '时间'];
    const csvRows = records.map(record => [
      record.id,
      record.userInfo?.name || record.userId,
      record.fromUserInfo?.name || record.fromUserId,
      record.commissionType,
      record.amount.toFixed(2),
      record.description,
      new Date(record.createdAt).toLocaleString()
    ]);
    
    const csvContent = [
      headers.join(','),
      ...csvRows.map(row => row.join(','))
    ].join('\n');
    
    return csvContent;
  },

  /**
   * 获取等级配置
   */
  getLevelConfigs: async () => {
    return LEVEL_CONFIGS;
  },

  /**
   * 更新等级配置
   */
  updateLevelConfig: async (level: AgentLevel, config: Partial<typeof LEVEL_CONFIGS[AgentLevel]>) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // 模拟更新操作
    console.log(`更新等级${level}配置:`, config);
    
    return {
      success: true,
      message: '等级配置更新成功'
    };
  },

  /**
   * 获取分润规则配置
   */
  getCommissionRules: async () => {
    return {
      peerBonusRate: 0.2,           // 平级奖励比例
      autoUpgradeEnabled: true,     // 自动升级是否开启
      commissionSettlementDelay: 7, // 分润结算延迟天数
      minWithdrawalAmount: 100,     // 最小提现金额
      maxDailyWithdrawal: 50000,    // 单日最大提现金额
      taxRate: 0.06                 // 税率（6%）
    };
  },

  /**
   * 更新分润规则
   */
  updateCommissionRules: async (rules: any) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return {
      success: true,
      message: '分润规则更新成功',
      rules
    };
  }
};

export default commissionApi;