/**
 * 收益管理模块模拟数据
 */

import { 
  CommissionRecord, 
  CommissionStats, 
  CommissionReport,
  CommissionType,
  AgentLevel 
} from '../../types/commission';

// 模拟收益记录数据
export const mockCommissionRecords: CommissionRecord[] = [
  {
    id: 'commission_001',
    userId: 'user_101',
    orderId: 'order_20260325001',
    fromUserId: 'user_001',
    commissionType: CommissionType.LEVEL_DIFF,
    amount: 150.00,
    commissionRate: 15,
    description: '级差利润：代理商 vs 会员，差价¥15 × 10件',
    createdAt: '2026-03-25T10:30:00',
    updatedAt: '2026-03-25T10:30:00',
    userInfo: {
      name: '张三',
      avatar: 'https://randomuser.me/api/portraits/men/1.jpg',
      level: AgentLevel.AGENT
    },
    fromUserInfo: {
      name: '李四',
      level: AgentLevel.MEMBER,
      firstRechargeAmount: 2980
    },
    orderInfo: {
      orderNo: 'ORD20260325001',
      totalAmount: 1000.00,
      productName: '静莱美焕肤精华液',
      quantity: 10
    }
  },
  {
    id: 'commission_002',
    userId: 'user_102',
    orderId: 'order_20260325002',
    fromUserId: 'user_002',
    commissionType: CommissionType.PEER_BONUS,
    amount: 596.00,
    commissionRate: 20,
    description: '平级奖励：打版代言人，首单奖励首次充值金额的20%',
    createdAt: '2026-03-25T11:15:00',
    updatedAt: '2026-03-25T11:15:00',
    userInfo: {
      name: '王五',
      avatar: 'https://randomuser.me/api/portraits/women/2.jpg',
      level: AgentLevel.MODEL_AGENT
    },
    fromUserInfo: {
      name: '赵六',
      level: AgentLevel.MODEL_AGENT,
      firstRechargeAmount: 2980
    },
    orderInfo: {
      orderNo: 'ORD20260325002',
      totalAmount: 1500.00,
      productName: '静莱美补水套装',
      quantity: 5
    }
  },
  {
    id: 'commission_003',
    userId: 'user_103',
    orderId: 'order_20260325003',
    fromUserId: 'user_003',
    commissionType: CommissionType.LEVEL_DIFF,
    amount: 320.00,
    commissionRate: 12,
    description: '级差利润：批发商 vs 代理商，差价¥32 × 10件',
    createdAt: '2026-03-25T14:20:00',
    updatedAt: '2026-03-25T14:20:00',
    userInfo: {
      name: '孙七',
      avatar: 'https://randomuser.me/api/portraits/men/3.jpg',
      level: AgentLevel.WHOLESALER
    },
    fromUserInfo: {
      name: '周八',
      level: AgentLevel.AGENT,
      firstRechargeAmount: 9800
    },
    orderInfo: {
      orderNo: 'ORD20260325003',
      totalAmount: 2500.00,
      productName: '静莱美抗皱系列',
      quantity: 10
    }
  },
  {
    id: 'commission_004',
    userId: 'user_104',
    orderId: 'order_20260325004',
    fromUserId: 'user_004',
    commissionType: CommissionType.LEVEL_DIFF,
    amount: 850.00,
    commissionRate: 18,
    description: '级差利润：首席分公司 vs 批发商，差价¥85 × 10件',
    createdAt: '2026-03-25T15:45:00',
    updatedAt: '2026-03-25T15:45:00',
    userInfo: {
      name: '吴九',
      avatar: 'https://randomuser.me/api/portraits/women/4.jpg',
      level: AgentLevel.CHIEF_COMPANY
    },
    fromUserInfo: {
      name: '郑十',
      level: AgentLevel.WHOLESALER,
      firstRechargeAmount: 39800
    },
    orderInfo: {
      orderNo: 'ORD20260325004',
      totalAmount: 4500.00,
      productName: '静莱美白金尊享礼盒',
      quantity: 10
    }
  },
  {
    id: 'commission_005',
    userId: 'user_101',
    orderId: 'order_20260324001',
    fromUserId: 'user_005',
    commissionType: CommissionType.LEVEL_DIFF,
    amount: 75.00,
    commissionRate: 10,
    description: '级差利润：代理商 vs 打版代言人，差价¥7.5 × 10件',
    createdAt: '2026-03-24T09:30:00',
    updatedAt: '2026-03-24T09:30:00',
    userInfo: {
      name: '张三',
      avatar: 'https://randomuser.me/api/portraits/men/1.jpg',
      level: AgentLevel.AGENT
    },
    fromUserInfo: {
      name: '钱十一',
      level: AgentLevel.MODEL_AGENT,
      firstRechargeAmount: 2980
    },
    orderInfo: {
      orderNo: 'ORD20260324001',
      totalAmount: 750.00,
      productName: '静莱美基础护理套装',
      quantity: 10
    }
  },
  {
    id: 'commission_006',
    userId: 'user_102',
    orderId: 'order_20260323001',
    fromUserId: 'user_006',
    commissionType: CommissionType.UPGRADE_BONUS,
    amount: 500.00,
    commissionRate: 10,
    description: '升级奖励：下级从会员升级为打版代言人',
    createdAt: '2026-03-23T13:20:00',
    updatedAt: '2026-03-23T13:20:00',
    userInfo: {
      name: '王五',
      avatar: 'https://randomuser.me/api/portraits/women/2.jpg',
      level: AgentLevel.MODEL_AGENT
    },
    fromUserInfo: {
      name: '孙十二',
      level: AgentLevel.MEMBER,
      firstRechargeAmount: 2980
    },
    orderInfo: {
      orderNo: 'ORD20260323001',
      totalAmount: 5000.00,
      productName: '静莱美升级大礼包',
      quantity: 20
    }
  },
  {
    id: 'commission_007',
    userId: 'user_103',
    orderId: 'order_20260322001',
    fromUserId: 'user_007',
    commissionType: CommissionType.LEVEL_DIFF,
    amount: 420.00,
    commissionRate: 14,
    description: '级差利润：批发商 vs 代理商，差价¥42 × 10件',
    createdAt: '2026-03-22T16:10:00',
    updatedAt: '2026-03-22T16:10:00',
    userInfo: {
      name: '孙七',
      avatar: 'https://randomuser.me/api/portraits/men/3.jpg',
      level: AgentLevel.WHOLESALER
    },
    fromUserInfo: {
      name: '李十三',
      level: AgentLevel.AGENT,
      firstRechargeAmount: 9800
    },
    orderInfo: {
      orderNo: 'ORD20260322001',
      totalAmount: 3000.00,
      productName: '静莱美专业线产品',
      quantity: 10
    }
  },
  {
    id: 'commission_008',
    userId: 'user_104',
    orderId: 'order_20260321001',
    fromUserId: 'user_008',
    commissionType: CommissionType.LEVEL_DIFF,
    amount: 1200.00,
    commissionRate: 20,
    description: '级差利润：首席分公司 vs 批发商，差价¥120 × 10件',
    createdAt: '2026-03-21T11:30:00',
    updatedAt: '2026-03-21T11:30:00',
    userInfo: {
      name: '吴九',
      avatar: 'https://randomuser.me/api/portraits/women/4.jpg',
      level: AgentLevel.CHIEF_COMPANY
    },
    fromUserInfo: {
      name: '周十四',
      level: AgentLevel.WHOLESALER,
      firstRechargeAmount: 39800
    },
    orderInfo: {
      orderNo: 'ORD20260321001',
      totalAmount: 6000.00,
      productName: '静莱美至尊礼盒',
      quantity: 10
    }
  },
  {
    id: 'commission_009',
    userId: 'user_101',
    orderId: 'order_20260320001',
    fromUserId: 'user_009',
    commissionType: CommissionType.PEER_BONUS,
    amount: 1960.00,
    commissionRate: 20,
    description: '平级奖励：代理商，首单奖励首次充值金额的20%',
    createdAt: '2026-03-20T14:45:00',
    updatedAt: '2026-03-20T14:45:00',
    userInfo: {
      name: '张三',
      avatar: 'https://randomuser.me/api/portraits/men/1.jpg',
      level: AgentLevel.AGENT
    },
    fromUserInfo: {
      name: '吴十五',
      level: AgentLevel.AGENT,
      firstRechargeAmount: 9800
    },
    orderInfo: {
      orderNo: 'ORD20260320001',
      totalAmount: 5000.00,
      productName: '静莱美全套产品',
      quantity: 25
    }
  },
  {
    id: 'commission_010',
    userId: 'user_102',
    orderId: 'order_20260319001',
    fromUserId: 'user_010',
    commissionType: CommissionType.LEVEL_DIFF,
    amount: 180.00,
    commissionRate: 12,
    description: '级差利润：打版代言人 vs 会员，差价¥18 × 10件',
    createdAt: '2026-03-19T10:15:00',
    updatedAt: '2026-03-19T10:15:00',
    userInfo: {
      name: '王五',
      avatar: 'https://randomuser.me/api/portraits/women/2.jpg',
      level: AgentLevel.MODEL_AGENT
    },
    fromUserInfo: {
      name: '郑十六',
      level: AgentLevel.MEMBER,
      firstRechargeAmount: 2980
    },
    orderInfo: {
      orderNo: 'ORD20260319001',
      totalAmount: 1500.00,
      productName: '静莱美面膜系列',
      quantity: 10
    }
  }
];

// 模拟收益统计数据
export const mockCommissionStats: CommissionStats = {
  totalCommission: 5451.00,
  monthCommission: 3986.00,
  todayCommission: 1916.00,
  yearCommission: 15451.00,
  
  byType: {
    levelDiff: 4095.00,
    peerBonus: 2556.00,
    upgradeBonus: 500.00
  },
  
  byLevel: {
    fromLevel2: 895.00,
    fromLevel3: 1560.00,
    fromLevel4: 1540.00,
    fromLevel5: 1456.00,
    fromLevel6: 680.00
  },
  
  trend: [
    { date: '2026-03-01', amount: 450 },
    { date: '2026-03-02', amount: 520 },
    { date: '2026-03-03', amount: 380 },
    { date: '2026-03-04', amount: 610 },
    { date: '2026-03-05', amount: 540 },
    { date: '2026-03-06', amount: 490 },
    { date: '2026-03-07', amount: 570 },
    { date: '2026-03-08', amount: 630 },
    { date: '2026-03-09', amount: 590 },
    { date: '2026-03-10', amount: 520 },
    { date: '2026-03-11', amount: 480 },
    { date: '2026-03-12', amount: 550 },
    { date: '2026-03-13', amount: 610 },
    { date: '2026-03-14', amount: 530 },
    { date: '2026-03-15', amount: 590 },
    { date: '2026-03-16', amount: 640 },
    { date: '2026-03-17', amount: 580 },
    { date: '2026-03-18', amount: 620 },
    { date: '2026-03-19', amount: 680 },
    { date: '2026-03-20', amount: 730 },
    { date: '2026-03-21', amount: 690 },
    { date: '2026-03-22', amount: 750 },
    { date: '2026-03-23', amount: 720 },
    { date: '2026-03-24', amount: 780 },
    { date: '2026-03-25', amount: 820 }
  ],
  
  topContributors: [
    {
      userId: 'user_001',
      name: '李四',
      level: AgentLevel.MEMBER,
      totalContribution: 225.00,
      monthContribution: 150.00,
      orderCount: 3
    },
    {
      userId: 'user_002',
      name: '赵六',
      level: AgentLevel.MODEL_AGENT,
      totalContribution: 596.00,
      monthContribution: 596.00,
      orderCount: 1
    },
    {
      userId: 'user_003',
      name: '周八',
      level: AgentLevel.AGENT,
      totalContribution: 740.00,
      monthContribution: 320.00,
      orderCount: 4
    },
    {
      userId: 'user_004',
      name: '郑十',
      level: AgentLevel.WHOLESALER,
      totalContribution: 2050.00,
      monthContribution: 850.00,
      orderCount: 3
    },
    {
      userId: 'user_005',
      name: '钱十一',
      level: AgentLevel.MODEL_AGENT,
      totalContribution: 75.00,
      monthContribution: 75.00,
      orderCount: 1
    }
  ]
};

// 模拟收益报表数据
export const mockCommissionReports: Record<string, CommissionReport> = {
  'daily_2026-03-25_2026-03-25': {
    period: 'daily',
    startDate: '2026-03-25',
    endDate: '2026-03-25',
    summary: {
      totalOrders: 4,
      totalAmount: 9500.00,
      totalCommission: 1916.00,
      avgCommissionRate: 20.17,
      activeUsers: 4
    },
    records: mockCommissionRecords.slice(0, 4),
    chartData: {
      byDate: [
        { date: '2026-03-25 10:30', amount: 150 },
        { date: '2026-03-25 11:15', amount: 596 },
        { date: '2026-03-25 14:20', amount: 320 },
        { date: '2026-03-25 15:45', amount: 850 }
      ],
      byLevel: [
        { level: '会员', amount: 150 },
        { level: '打版代言人', amount: 596 },
        { level: '代理商', amount: 320 },
        { level: '批发商', amount: 0 },
        { level: '首席分公司', amount: 850 }
      ],
      byType: [
        { type: '级差利润', amount: 1320 },
        { type: '平级奖励', amount: 596 },
        { type: '升级奖励', amount: 0 }
      ]
    }
  },
  
  'weekly_2026-03-18_2026-03-24': {
    period: 'weekly',
    startDate: '2026-03-18',
    endDate: '2026-03-24',
    summary: {
      totalOrders: 15,
      totalAmount: 32500.00,
      totalCommission: 5875.00,
      avgCommissionRate: 18.08,
      activeUsers: 12
    },
    records: mockCommissionRecords.slice(5, 10),
    chartData: {
      byDate: [
        { date: '2026-03-18', amount: 620 },
        { date: '2026-03-19', amount: 680 },
        { date: '2026-03-20', amount: 730 },
        { date: '2026-03-21', amount: 690 },
        { date: '2026-03-22', amount: 750 },
        { date: '2026-03-23', amount: 720 },
        { date: '2026-03-24', amount: 780 }
      ],
      byLevel: [
        { level: '会员', amount: 180 },
        { level: '打版代言人', amount: 1196 },
        { level: '代理商', amount: 1660 },
        { level: '批发商', amount: 1340 },
        { level: '首席分公司', amount: 1499 }
      ],
      byType: [
        { type: '级差利润', amount: 3219 },
        { type: '平级奖励', amount: 2556 },
        { type: '升级奖励', amount: 500 }
      ]
    }
  },
  
  'monthly_2026-03-01_2026-03-31': {
    period: 'monthly',
    startDate: '2026-03-01',
    endDate: '2026-03-31',
    summary: {
      totalOrders: 42,
      totalAmount: 89500.00,
      totalCommission: 15451.00,
      avgCommissionRate: 17.26,
      activeUsers: 28
    },
    records: mockCommissionRecords,
    chartData: {
      byDate: mockCommissionStats.trend,
      byLevel: [
        { level: '会员', amount: 895 },
        { level: '打版代言人', amount: 1560 },
        { level: '代理商', amount: 1540 },
        { level: '批发商', amount: 1456 },
        { level: '首席分公司', amount: 0 }
      ],
      byType: [
        { type: '级差利润', amount: 4095 },
        { type: '平级奖励', amount: 2556 },
        { type: '升级奖励', amount: 500 }
      ]
    }
  }
};

// 等级升级记录数据
export const mockUpgradeRecords = [
  {
    id: 'upgrade_001',
    userId: 'user_001',
    userName: '李四',
    fromLevel: AgentLevel.MEMBER,
    toLevel: AgentLevel.MODEL_AGENT,
    rechargeAmount: 2980,
    cargoValue: 1500,
    upgradeDate: '2026-03-20T10:30:00',
    description: '会员升级为打版代言人，充值¥2980送¥1500货'
  },
  {
    id: 'upgrade_002',
    userId: 'user_003',
    userName: '周八',
    fromLevel: AgentLevel.AGENT,
    toLevel: AgentLevel.WHOLESALER,
    rechargeAmount: 39800,
    cargoValue: 10200,
    upgradeDate: '2026-03-15T14:20:00',
    description: '代理商升级为批发商，充值¥39800送¥10200货'
  },
  {
    id: 'upgrade_003',
    userId: 'user_004',
    userName: '郑十',
    fromLevel: AgentLevel.WHOLESALER,
    toLevel: AgentLevel.CHIEF_COMPANY,
    rechargeAmount: 298000,
    cargoValue: 150000,
    upgradeDate: '2026-03-10T09:15:00',
    description: '批发商升级为首席分公司，充值¥298000送¥150000货'
  }
];