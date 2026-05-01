/**
 * 团队管理相关类型定义
 */

import { AgentLevel } from './commission';

/**
 * 团队成员信息
 */
export interface TeamMember {
  id: string;
  parentId: string | null;
  path: string; // 祖先路径，格式: "rootId/parentId/userId"
  
  // 基本信息
  username: string;
  avatar?: string;
  phone: string;
  email?: string;
  level: AgentLevel;
  levelLabel: string; // 等级名称
  
  // 收益信息
  totalCommission: number; // 累计收益
  monthCommission: number; // 本月收益
  dayCommission: number; // 今日收益
  teamCommission: number; // 团队总收益
  
  // 团队信息
  teamSize: number; // 团队总人数
  directSubordinates: number; // 直接下级人数
  subordinateLevels: Record<AgentLevel, number>; // 各等级下级数量
  
  // 时间信息
  joinTime: string; // 加入时间
  lastOrderTime?: string; // 最后下单时间
  
  // 状态信息
  isActive: boolean; // 是否活跃
  totalOrders: number; // 订单总数
  totalPurchase: number; // 累计进货额
}

/**
 * 团队节点（用于树形结构）
 */
export interface TeamTreeNode extends TeamMember {
  children: TeamTreeNode[];
  depth: number; // 节点深度（0为当前用户）
  isExpanded?: boolean; // 是否展开
  hasChildren?: boolean; // 是否有子节点
}

/**
 * 团队统计信息
 */
export interface TeamStats {
  totalMembers: number; // 团队总人数
  totalCommission: number; // 团队总收益
  monthCommission: number; // 团队本月收益
  dayCommission: number; // 团队今日收益
  
  levelDistribution: Record<AgentLevel, number>; // 等级分布
  commissionDistribution: Record<AgentLevel, number>; // 各等级收益分布
  growthRate: number; // 团队增长率
}

/**
 * 团队查询参数
 */
export interface TeamQueryParams {
  page?: number;
  pageSize?: number;
  search?: string; // 搜索关键词（姓名/电话）
  level?: AgentLevel; // 等级筛选
  minCommission?: number; // 最小收益
  maxCommission?: number; // 最大收益
  minJoinTime?: string; // 最早加入时间
  maxJoinTime?: string; // 最晚加入时间
  isActive?: boolean; // 是否活跃
  sortBy?: 'commission' | 'teamSize' | 'joinTime' | 'level'; // 排序字段
  sortOrder?: 'asc' | 'desc'; // 排序方向
}

/**
 * 团队查询结果
 */
export interface TeamQueryResult {
  members: TeamMember[];
  total: number;
  page: number;
  pageSize: number;
  stats: TeamStats;
}

/**
 * 树形结构配置
 */
export interface TreeConfig {
  maxDepth: number; // 最大展开深度
  showIcons: boolean; // 是否显示图标
  showStats: boolean; // 是否显示统计信息
  collapsible: boolean; // 是否可折叠
  virtualScroll: boolean; // 是否使用虚拟滚动（大数据量时）
}

/**
 * 团队成员详情
 */
export interface MemberDetail extends TeamMember {
  // 详细收益信息
  commissionHistory: Array<{
    id: string;
    orderId: string;
    commissionType: string;
    amount: number;
    orderAmount: number;
    createTime: string;
    remark?: string;
  }>;
  
  // 下级团队概要
  directSubordinateList: TeamMember[];
  recentSubordinates: TeamMember[]; // 最近加入的下级
  
  // 升级历史
  upgradeHistory: Array<{
    fromLevel: AgentLevel;
    toLevel: AgentLevel;
    upgradeTime: string;
    triggerAmount: number; // 触发升级的金额
    remark?: string;
  }>;
  
  // 订单概况
  orderStats: {
    totalOrders: number;
    totalAmount: number;
    avgOrderAmount: number;
    lastOrderTime: string;
    favoriteProducts: string[]; // 常用商品
  };
}

/**
 * 团队导出配置
 */
export interface TeamExportConfig {
  includeColumns: string[];
  includeStats: boolean;
  format: 'csv' | 'excel' | 'pdf';
  timeRange?: {
    start: string;
    end: string;
  };
}

/**
 * 团队增长分析
 */
export interface TeamGrowthAnalysis {
  period: string; // 分析周期
  newMembers: number; // 新增成员数
  growthRate: number; // 增长率
  commissionGrowth: number; // 收益增长率
  levelUpgrades: number; // 升级人数
  
  // 趋势数据
  dailyGrowth: Array<{
    date: string;
    newMembers: number;
    totalMembers: number;
    totalCommission: number;
  }>;
  
  // 来源分析
  sourceAnalysis: Array<{
    source: string; // 来源类型（推荐、扫码、搜索等）
    count: number;
    proportion: number; // 比例
  }>;
}

/**
 * 团队成员状态
 */
export interface TeamMemberStatus {
  online: number; // 在线人数
  activeToday: number; // 今日活跃人数
  orderedThisWeek: number; // 本周有订单人数
  upgradedThisMonth: number; // 本月升级人数
}