/**
 * 用户管理相关类型定义
 */

import { AgentLevel } from './commission';

/**
 * 用户基本信息
 */
export interface UserInfo {
  id: string;
  username: string;
  name: string;
  phone: string;
  email?: string;
  
  // 等级信息
  level: AgentLevel;
  levelLabel: string;
  
  // 收益信息
  totalCommission: number;      // 累计收益
  monthCommission: number;      // 本月收益
  dayCommission: number;        // 今日收益
  teamCommission: number;       // 团队总收益
  
  // 团队信息
  teamSize: number;             // 团队总人数
  directSubordinates: number;   // 直接下级人数
  subordinateLevels: Record<AgentLevel, number>; // 各等级下级数量
  
  // 状态信息
  isActive: boolean;            // 是否活跃
  totalOrders: number;          // 订单总数
  totalPurchase: number;        // 累计进货额
  
  // 时间信息
  joinTime: string;             // 加入时间
  lastOrderTime?: string;       // 最后下单时间
  
  // 头像
  avatar?: string;
}

/**
 * 用户详情（扩展信息）
 */
export interface UserDetail extends UserInfo {
  // 联系方式
  wechat?: string;
  address?: string;
  region?: string;              // 地区
  referralCode?: string;        // 推荐码
  
  // 账户信息
  balance: number;              // 账户余额
  freezeBalance: number;        // 冻结金额
  rechargeTotal: number;        // 累计充值金额
  withdrawalTotal: number;      // 累计提现金额
  
  // 安全信息
  lastLoginIp?: string;         // 最后登录IP
  lastLoginTime?: string;       // 最后登录时间
  loginCount: number;           // 登录次数
  
  // 认证信息
  isRealNameVerified: boolean;  // 是否实名认证
  realName?: string;            // 真实姓名
  idCard?: string;              // 身份证号
  bankCard?: string;            // 银行卡号
  bankName?: string;            // 开户银行
  
  // 备注信息
  remark?: string;              // 备注
  tags: string[];               // 用户标签
  followUpStatus: 'new' | 'active' | 'inactive' | 'vip'; // 跟进状态
}

/**
 * 用户操作日志
 */
export interface UserLog {
  id: string;
  userId: string;
  action: string;              // 操作类型
  description: string;         // 操作描述
  ip?: string;                 // IP地址
  userAgent?: string;          // 用户代理
  createTime: string;          // 创建时间
  operator?: string;           // 操作人
  extraData?: Record<string, any>; // 额外数据
}

/**
 * 用户认证记录
 */
export interface UserAuthRecord {
  id: string;
  userId: string;
  authType: 'realname' | 'bankcard' | 'wechat'; // 认证类型
  status: 'pending' | 'approved' | 'rejected';  // 认证状态
  submitTime: string;          // 提交时间
  auditTime?: string;          // 审核时间
  auditor?: string;            // 审核人
  remark?: string;             // 审核备注
  images: string[];            // 认证图片
}

/**
 * 用户等级变更记录
 */
export interface UserLevelChangeRecord {
  id: string;
  userId: string;
  fromLevel: AgentLevel;       // 原等级
  toLevel: AgentLevel;         // 新等级
  changeTime: string;          // 变更时间
  changeType: 'upgrade' | 'downgrade' | 'manual'; // 变更类型
  triggerAmount?: number;      // 触发金额
  operator?: string;           // 操作人
  remark?: string;             // 备注
}

/**
 * 用户充值记录
 */
export interface UserRechargeRecord {
  id: string;
  userId: string;
  orderNo: string;            // 充值订单号
  amount: number;             // 充值金额
  rechargeMethod: 'alipay' | 'wechat' | 'bank' | 'balance'; // 充值方式
  status: 'pending' | 'success' | 'failed'; // 状态
  createTime: string;         // 创建时间
  finishTime?: string;        // 完成时间
  remark?: string;            // 备注
  channel?: string;           // 支付通道
  paymentNo?: string;         // 支付单号
}

/**
 * 用户提现记录
 */
export interface UserWithdrawalRecord {
  id: string;
  userId: string;
  orderNo: string;            // 提现订单号
  amount: number;             // 提现金额
  fee: number;                // 手续费
  actualAmount: number;       // 实际到账金额
  bankCard?: string;          // 银行卡号
  bankName?: string;          // 开户银行
  status: 'pending' | 'processing' | 'success' | 'failed'; // 状态
  createTime: string;         // 创建时间
  auditTime?: string;         // 审核时间
  finishTime?: string;        // 完成时间
  auditor?: string;           // 审核人
  remark?: string;            // 备注
  failureReason?: string;     // 失败原因
}

/**
 * 用户统计信息
 */
export interface UserStats {
  // 数量统计
  totalUsers: number;          // 总用户数
  newUsersToday: number;       // 今日新增
  newUsersThisWeek: number;    // 本周新增
  newUsersThisMonth: number;   // 本月新增
  activeUsers: number;         // 活跃用户数
  
  // 等级分布
  levelDistribution: {
    level: AgentLevel;
    levelLabel: string;
    count: number;
    proportion: number;        // 占比
  }[];
  
  // 收益统计
  totalCommission: number;     // 总收益
  averageCommission: number;   // 平均收益
  
  // 订单统计
  totalOrders: number;         // 总订单数
  avgOrdersPerUser: number;    // 人均订单数
  
  // 趋势数据
  trend: {
    date: string;
    newUsers: number;
    activeUsers: number;
    totalCommission: number;
  }[];
}

/**
 * 用户查询参数
 */
export interface UserQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;             // 搜索关键词（姓名/电话/用户名）
  level?: AgentLevel;          // 等级筛选
  minCommission?: number;      // 最小收益
  maxCommission?: number;      // 最大收益
  minTeamSize?: number;        // 最小团队人数
  maxTeamSize?: number;        // 最大团队人数
  startJoinTime?: string;      // 开始加入时间
  endJoinTime?: string;        // 结束加入时间
  isActive?: boolean;          // 是否活跃
  region?: string;             // 地区
  tags?: string[];             // 标签
  sortBy?: 'joinTime' | 'totalCommission' | 'teamSize' | 'totalOrders' | 'totalPurchase';
  sortOrder?: 'asc' | 'desc';
}

/**
 * 用户批量操作参数
 */
export interface UserBatchOperationParams {
  userIds: string[];
  operation: 'activate' | 'deactivate' | 'delete' | 'assignLevel' | 'addTag' | 'removeTag';
  data?: {
    level?: AgentLevel;
    tags?: string[];
    remark?: string;
  };
}

/**
 * 用户导入/导出配置
 */
export interface UserImportExportConfig {
  // 导入配置
  import?: {
    fileType: 'excel' | 'csv';
    mapping: Record<string, string>; // 字段映射
    skipDuplicates: boolean;         // 跳过重复
    validatePhone: boolean;          // 验证手机号
    generatePassword: boolean;       // 生成密码
  };
  
  // 导出配置
  export?: {
    fileType: 'excel' | 'csv' | 'pdf';
    includeColumns: string[];        // 包含的列
    includeStats: boolean;           // 包含统计信息
    format: 'detailed' | 'simple';   // 格式
  };
}