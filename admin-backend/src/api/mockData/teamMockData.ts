/**
 * 团队管理模拟数据
 */

import { AgentLevel } from '../../types/commission';
import { TeamMember, TeamTreeNode, TeamStats, TeamGrowthAnalysis, TeamMemberStatus } from '../../types/team';

// 生成团队成员数据
const generateMockMembers = (count: number): TeamMember[] => {
  const members: TeamMember[] = [];
  const firstNames = ['张', '王', '李', '赵', '刘', '陈', '杨', '黄', '周', '吴'];
  const lastNames = ['明', '强', '伟', '芳', '秀英', '娜', '静', '霞', '刚', '军'];
  const cities = ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '南京', '西安', '重庆'];
  const levels: AgentLevel[] = [AgentLevel.MEMBER, AgentLevel.MODEL_AGENT, AgentLevel.AGENT, AgentLevel.WHOLESALER, AgentLevel.CHIEF_COMPANY];
  const levelLabels = ['会员', '打版代言人', '代理商', '批发商', '首席分公司'];

  for (let i = 0; i < count; i++) {
    const level = levels[i % 5];
    const levelLabel = levelLabels[level - 1];
    const joinDate = new Date(2026, 2, Math.floor(Math.random() * 25) + 1); // 3月1-25日
    
    members.push({
      id: `member${i + 1001}`,
      parentId: i === 0 ? null : `member${Math.floor(Math.random() * 10) + 1001}`,
      path: `root/${i === 0 ? 'root' : `member${Math.floor(Math.random() * 10) + 1001}`}/member${i + 1001}`,
      
      username: `${firstNames[i % 10]}${lastNames[i % 10]}${i % 3 === 0 ? '（总代）' : ''}`,
      avatar: `https://randomuser.me/api/portraits/${i % 2 === 0 ? 'men' : 'women'}/${(i % 100) + 1}.jpg`,
      phone: `138${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
      email: `user${i + 1001}@example.com`,
      level,
      levelLabel,
      
      totalCommission: Math.random() * 50000 + 1000,
      monthCommission: Math.random() * 5000 + 100,
      dayCommission: Math.random() * 500 + 10,
      teamCommission: Math.random() * 200000 + 50000,
      
      teamSize: Math.floor(Math.random() * 100) + 1,
      directSubordinates: Math.floor(Math.random() * 20) + 1,
      subordinateLevels: {
        [AgentLevel.MEMBER]: Math.floor(Math.random() * 10),
        [AgentLevel.MODEL_AGENT]: Math.floor(Math.random() * 8),
        [AgentLevel.AGENT]: Math.floor(Math.random() * 6),
        [AgentLevel.WHOLESALER]: Math.floor(Math.random() * 4),
        [AgentLevel.CHIEF_COMPANY]: Math.floor(Math.random() * 2),
        [AgentLevel.GROUP_DIVISION]: Math.floor(Math.random() * 1),
      },
      
      joinTime: joinDate.toISOString(),
      lastOrderTime: new Date(2026, 2, Math.floor(Math.random() * 25) + 1).toISOString(),
      
      isActive: Math.random() > 0.2,
      totalOrders: Math.floor(Math.random() * 50) + 5,
      totalPurchase: Math.random() * 100000 + 5000,
    });
  }
  
  return members;
};

// 生成团队树数据
const generateTeamTree = (): TeamTreeNode => {
  const rootMember: TeamTreeNode = {
    id: 'member1001',
    parentId: null,
    path: 'root/member1001',
    
    username: '张三（当前用户）',
    avatar: 'https://randomuser.me/api/portraits/men/1.jpg',
    phone: '13800138000',
    email: 'admin@example.com',
    level: AgentLevel.CHIEF_COMPANY,
    levelLabel: '首席分公司',
    
    totalCommission: 125000,
    monthCommission: 15000,
    dayCommission: 1200,
    teamCommission: 450000,
    
    teamSize: 156,
    directSubordinates: 8,
    subordinateLevels: {
      [AgentLevel.MEMBER]: 40,
      [AgentLevel.MODEL_AGENT]: 35,
      [AgentLevel.AGENT]: 25,
      [AgentLevel.WHOLESALER]: 15,
      [AgentLevel.CHIEF_COMPANY]: 1,
      [AgentLevel.GROUP_DIVISION]: 0,
    },

    joinTime: '2025-08-15T10:30:00.000Z',
    lastOrderTime: '2026-03-24T16:30:00.000Z',
    
    isActive: true,
    totalOrders: 89,
    totalPurchase: 320000,
    
    children: [],
    depth: 0,
    isExpanded: true,
    hasChildren: true
  };
  
  // 第一层下级（8个直接下级）
  const directSubordinates = generateMockMembers(8).map((member, index) => {
    const treeNode: TeamTreeNode = {
      ...member,
      parentId: 'member1001',
      path: `root/member1001/${member.id}`,
      
      children: [],
      depth: 1,
      isExpanded: index < 4, // 前4个展开
      hasChildren: member.directSubordinates > 0
    };
    
    // 第二层下级（每个直接下级有2-4个下级）
    const secondLevelCount = Math.floor(Math.random() * 3) + 2;
    const secondLevelMembers = generateMockMembers(secondLevelCount).map((secondMember, secondIndex) => {
      const secondTreeNode: TeamTreeNode = {
        ...secondMember,
        parentId: member.id,
        path: `root/member1001/${member.id}/${secondMember.id}`,
        
        children: [],
        depth: 2,
        isExpanded: false,
        hasChildren: secondMember.directSubordinates > 0
      };
      
      // 第三层下级（部分有下级）
      if (secondIndex < 2 && secondMember.directSubordinates > 0) {
        const thirdLevelCount = Math.min(secondMember.directSubordinates, 3);
        const thirdLevelMembers = generateMockMembers(thirdLevelCount).map(thirdMember => ({
          ...thirdMember,
          parentId: secondMember.id,
          path: `root/member1001/${member.id}/${secondMember.id}/${thirdMember.id}`,
          
          children: [],
          depth: 3,
          isExpanded: false,
          hasChildren: false
        }));
        
        secondTreeNode.children = thirdLevelMembers;
      }
      
      return secondTreeNode;
    });
    
    treeNode.children = secondLevelMembers;
    return treeNode;
  });
  
  rootMember.children = directSubordinates;
  return rootMember;
};

// 团队统计模拟数据
export const mockTeamStats: TeamStats = {
  totalMembers: 156,
  totalCommission: 450000,
  monthCommission: 68000,
  dayCommission: 4500,
  
  levelDistribution: {
    [AgentLevel.MEMBER]: 40,
    [AgentLevel.MODEL_AGENT]: 35,
    [AgentLevel.AGENT]: 25,
    [AgentLevel.WHOLESALER]: 15,
    [AgentLevel.CHIEF_COMPANY]: 1,
    [AgentLevel.GROUP_DIVISION]: 0,
  },

  commissionDistribution: {
    [AgentLevel.MEMBER]: 25000,
    [AgentLevel.MODEL_AGENT]: 85000,
    [AgentLevel.AGENT]: 120000,
    [AgentLevel.WHOLESALER]: 180000,
    [AgentLevel.CHIEF_COMPANY]: 40000,
    [AgentLevel.GROUP_DIVISION]: 15000,
  },
  
  growthRate: 0.18
};

// 团队增长分析模拟数据
export const mockGrowthAnalysis: TeamGrowthAnalysis = {
  period: '本月',
  newMembers: 28,
  growthRate: 0.22,
  commissionGrowth: 0.35,
  levelUpgrades: 12,
  
  dailyGrowth: [
    { date: '2026-03-01', newMembers: 2, totalMembers: 132, totalCommission: 415000 },
    { date: '2026-03-05', newMembers: 4, totalMembers: 136, totalCommission: 420000 },
    { date: '2026-03-10', newMembers: 6, totalMembers: 142, totalCommission: 430000 },
    { date: '2026-03-15', newMembers: 8, totalMembers: 150, totalCommission: 440000 },
    { date: '2026-03-20', newMembers: 5, totalMembers: 155, totalCommission: 448000 },
    { date: '2026-03-25', newMembers: 1, totalMembers: 156, totalCommission: 450000 },
  ],
  
  sourceAnalysis: [
    { source: '推荐注册', count: 18, proportion: 0.64 },
    { source: '扫码加入', count: 6, proportion: 0.21 },
    { source: '自主搜索', count: 3, proportion: 0.11 },
    { source: '活动引流', count: 1, proportion: 0.04 },
  ]
};

// 团队成员状态模拟数据
export const mockMemberStatus: TeamMemberStatus = {
  online: 42,
  activeToday: 68,
  orderedThisWeek: 89,
  upgradedThisMonth: 12
};

// 导出模拟数据
export const mockTeamData = generateMockMembers(50);
export const mockTeamTreeData = generateTeamTree();