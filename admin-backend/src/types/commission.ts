/**
 * 静莱美代理商收益管理类型定义
 * 基于代理商等级和分润规则
 */

// 代理商等级枚举
export enum AgentLevel {
  MEMBER = 1,           // 会员
  MODEL_AGENT = 2,      // 打版代言人
  AGENT = 3,            // 代理商
  WHOLESALER = 4,       // 批发商
  CHIEF_COMPANY = 5,    // 首席分公司
  GROUP_DIVISION = 6,   // 集团事业部
}

// 等级配置接口
export interface LevelConfig {
  level: AgentLevel;
  name: string;
  discount: number;           // 折扣比例 (零售价×折扣)
  rechargeThreshold: number;  // 首次充值门槛
  cargoValue: number;         // 配送货值
  color: string;              // UI显示颜色
}

// 分润类型枚举
export enum CommissionType {
  LEVEL_DIFF = 'level_diff',    // 级差利润
  PEER_BONUS = 'peer_bonus',    // 平级奖励
  UPGRADE_BONUS = 'upgrade_bonus', // 升级奖励
}

// 收益流水记录
export interface CommissionRecord {
  id: string;
  userId: string;            // 收益接收用户ID
  orderId: string;           // 关联订单ID
  fromUserId: string;        // 产生收益的用户ID（下单人）
  commissionType: CommissionType; // 分润类型
  amount: number;            // 收益金额
  commissionRate?: number;   // 分润比例（百分比）
  description: string;       // 收益描述
  createdAt: string;         // 创建时间
  updatedAt: string;         // 更新时间
  
  // 关联信息
  userInfo?: {
    name: string;
    avatar?: string;
    level: AgentLevel;
  };
  fromUserInfo?: {
    name: string;
    level: AgentLevel;
    firstRechargeAmount: number;
  };
  orderInfo?: {
    orderNo: string;
    totalAmount: number;
    productName: string;
    quantity: number;
  };
}

// 收益统计接口
export interface CommissionStats {
  totalCommission: number;           // 累计收益
  monthCommission: number;           // 本月收益
  todayCommission: number;           // 今日收益
  yearCommission: number;            // 本年收益
  
  // 按类型统计
  byType: {
    levelDiff: number;               // 级差利润总额
    peerBonus: number;               // 平级奖励总额
    upgradeBonus: number;            // 升级奖励总额
  };
  
  // 按等级统计
  byLevel: {
    fromLevel2: number;              // 从等级2获得的收益
    fromLevel3: number;              // 从等级3获得的收益
    fromLevel4: number;              // 从等级4获得的收益
    fromLevel5: number;              // 从等级5获得的收益
    fromLevel6: number;              // 从等级6获得的收益
  };
  
  // 趋势数据
  trend: {
    date: string;                    // 日期
    amount: number;                  // 当日收益
  }[];
  
  // 下级收益贡献排行
  topContributors: {
    userId: string;
    name: string;
    level: AgentLevel;
    totalContribution: number;       // 贡献总额
    monthContribution: number;       // 本月贡献
    orderCount: number;              // 订单数量
  }[];
}

// 收益查询参数
export interface CommissionQueryParams {
  page?: number;
  pageSize?: number;
  userId?: string;                   // 指定用户ID
  fromUserId?: string;               // 来自用户ID
  orderId?: string;                  // 订单ID
  commissionType?: CommissionType;   // 分润类型
  startDate?: string;                // 开始日期
  endDate?: string;                  // 结束日期
  minAmount?: number;                // 最小金额
  maxAmount?: number;                // 最大金额
  sortBy?: 'amount' | 'createdAt' | 'commissionType';
  sortOrder?: 'asc' | 'desc';
}

// 收益报表接口
export interface CommissionReport {
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  startDate: string;
  endDate: string;
  
  // 汇总数据
  summary: {
    totalOrders: number;             // 总订单数
    totalAmount: number;             // 总订单金额
    totalCommission: number;         // 总分润金额
    avgCommissionRate: number;       // 平均分润比例
    activeUsers: number;             // 产生收益的用户数
  };
  
  // 详细记录
  records: CommissionRecord[];
  
  // 图表数据
  chartData: {
    byDate: { date: string; amount: number }[];
    byLevel: { level: string; amount: number }[];
    byType: { type: string; amount: number }[];
  };
}

// 分润计算参数
export interface CommissionCalculationParams {
  orderId: string;
  userId: string;                    // 下单用户ID
  parentId: string;                  // 直接上级ID
  userLevel: AgentLevel;             // 下单用户等级
  userPrice: number;                 // 下单用户拿货价
  parentLevel: AgentLevel;           // 直接上级等级
  parentPrice: number;               // 直接上级拿货价
  orderAmount: number;               // 订单金额
  quantity: number;                  // 商品数量
  isFirstOrder: boolean;             // 是否首单
  firstRechargeAmount: number;       // 首次充值金额
}

// 分润计算结果
export interface CommissionCalculationResult {
  success: boolean;
  commissionTo: string;              // 收益归属人ID
  commissionType: CommissionType;    // 分润类型
  commissionAmount: number;          // 分润金额
  commissionRate: number;            // 分润比例
  description: string;               // 计算说明
  profitOwnerLevel: AgentLevel;      // 收益归属人等级
  profitOwnerPrice: number;          // 收益归属人拿货价
  calculationDetails: {
    userLevel: AgentLevel;
    userPrice: number;
    parentLevel: AgentLevel;
    parentPrice: number;
    profitOwnerFound: boolean;
    profitOwnerLevel?: AgentLevel;
    profitOwnerPrice?: number;
    levelDiff?: number;
    firstRechargeAmount?: number;
    peerBonusRate?: number;
  };
}