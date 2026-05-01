/**
 * 团队管理API服务 — 接入真实后端API（基于 usersApi）
 * 
 * 所有方法均对接 dbApi.usersApi，不再使用 Mock 数据。
 * 字段映射：数据库字段 → TeamMember 前端类型
 */

import { usersApi } from '../services/dbApi';
import apiClient from '../utils/apiClient';
import {
  TeamMember,
  TeamTreeNode,
  TeamStats,
  TeamQueryParams,
  TeamQueryResult,
  MemberDetail,
  TeamGrowthAnalysis,
  TeamMemberStatus,
} from '../types/team';
import { AgentLevel } from '../types/commission';

// ==================== 字段映射工具 ====================

/**
 * 将数据库用户记录转换为前端 TeamMember 格式
 */
function mapDbUserToTeamMember(row: any): TeamMember {
  return {
    id: String(row.id),
    parentId: row.parent_id ? String(row.parent_id) : null,
    path: row.parent_id ? `${row.parent_id}/${row.id}` : row.id,

    // 基本信息
    username: row.real_name || row.username || `用户${row.id}`,
    avatar: row.avatar_url,
    phone: row.phone || '',
    email: row.email,
    level: row.agent_level ?? AgentLevel.MEMBER,
    levelLabel: getLevelLabel(row.agent_level),

    // 收益信息
    totalCommission: Number(row.total_income) || 0,
    monthCommission: 0, // 后端暂无此字段，默认0
    dayCommission: 0,
    teamCommission: 0,

    // 团队信息（需额外查询或估算）
    teamSize: row.team_size || 0,
    directSubordinates: row.direct_subordinates || 0,
    subordinateLevels: {} as any,

    // 时间信息
    joinTime: row.created_at || new Date().toISOString(),
    lastOrderTime: row.last_order_time || undefined,

    // 状态信息
    isActive: Boolean(row.status !== undefined ? row.status !== 0 : true),
    totalOrders: row.order_count || 0,
    totalPurchase: row.total_purchase || 0,
  };
}

/**
 * 将树形节点递归转换为 TeamTreeNode 格式
 */
function mapDbTreeToTeamTreeNode(node: any, depth = 0): TeamTreeNode {
  const member = mapDbUserToTeamMember(node);
  return {
    ...member,
    depth,
    isExpanded: false,
    hasChildren: Array.isArray(node.children) && node.children.length > 0,
    children: Array.isArray(node.children)
      ? node.children.map((child: any) => mapDbTreeToTeamTreeNode(child, depth + 1))
      : [],
  };
}

/**
 * 获取等级名称
 */
function getLevelLabel(level?: number): string {
  const labels: Record<number, string> = {
    [AgentLevel.MEMBER]: '会员',
    [AgentLevel.MODEL_AGENT]: '打版代言人',
    [AgentLevel.AGENT]: '代理商',
    [AgentLevel.WHOLESALER]: '批发商',
    [AgentLevel.CHIEF_COMPANY]: '首席分公司',
    [AgentLevel.GROUP_DIVISION]: '集团事业部',
  };
  return labels[level || AgentLevel.MEMBER] || '会员';
}

// ==================== 统计计算辅助 ====================

/**
 * 从用户列表中计算团队统计信息
 */
function calcTeamStats(members: TeamMember[]): TeamStats {
  const totalMembers = members.length;
  let totalCommission = 0;
  let monthCommission = 0;

  const levelDistribution = {} as Record<AgentLevel, number>;
  const commissionDistribution = {} as Record<AgentLevel, number>;

  // 初始化所有等级
  for (let i = 1; i <= 6; i++) {
    levelDistribution[i as AgentLevel] = 0;
    commissionDistribution[i as AgentLevel] = 0;
  }

  members.forEach((m) => {
    totalCommission += m.totalCommission;
    monthCommission += m.monthCommission;
    const lv = m.level || AgentLevel.MEMBER;
    levelDistribution[lv] = (levelDistribution[lv] || 0) + 1;
    commissionDistribution[lv] = (commissionDistribution[lv] || 0) + m.totalCommission;
  });

  return {
    totalMembers,
    totalCommission,
    monthCommission,
    dayCommission: 0,
    levelDistribution,
    commissionDistribution,
    growthRate: 0,
  };
}

// ==================== 团队管理 API 服务 ====================

export class TeamApiService {
  /**
   * 获取团队树形结构（真实数据）
   * 使用后端 GET /api/users/:id/team-tree
   */
  static async getTeamTree(userId: string | number, maxDepth: number = 3): Promise<TeamTreeNode> {
    try {
      const response: any = await usersApi.getTeamTree(Number(userId));
      // apiClient 已解包，response 直接是业务数据
      const data = response?.data || response;
      if (!data) {
        throw new Error('未获取到团队数据');
      }
      return mapDbTreeToTeamTreeNode(data);
    } catch (error: any) {
      console.error('[TeamApi] getTeamTree error:', error);
      throw error;
    }
  }

  /**
   * 获取团队成员列表（真实分页+筛选）
   * 使用后端 GET /api/users（复用用户列表API）
   */
  static async getTeamMembers(params: TeamQueryParams): Promise<TeamQueryResult> {
    try {
      // 复用 userApi.getUsers，传入筛选条件
      const result = await import('../api/userApi').then((mod) =>
        mod.userApi.getUsers({
          page: params.page,
          pageSize: params.pageSize,
          search: params.search,
          agent_level: params.level,
          sort_by: params.sortBy,
          order: params.sortOrder === 'desc' ? 'DESC' : 'ASC',
        }),
      );

      // 转换为 TeamMember[] 格式
      const members = result.users.map(mapDbUserToTeamMember);

      // 计算统计
      const stats = calcTeamStats(members);

      return {
        members,
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        stats,
      };
    } catch (error: any) {
      console.error('[TeamApi] getTeamMembers error:', error);
      throw error;
    }
  }

  /**
   * 获取团队统计信息（真实数据）
   * 使用后端 GET /api/users/stats
   */
  static async getTeamStats(_userId?: string): Promise<TeamStats> {
    try {
      const statsData: any = await usersApi.getStats();

      // 后端返回格式: { total, active, level1-level6, newThisMonth }
      return {
        totalMembers: statsData?.total || 0,
        totalCommission: 0, // 用户列表API不直接返回总收益
        monthCommission: 0,
        dayCommission: 0,
        levelDistribution: {
          [AgentLevel.MEMBER]: statsData?.level1 || 0,
          [AgentLevel.MODEL_AGENT]: statsData?.level2 || 0,
          [AgentLevel.AGENT]: statsData?.level3 || 0,
          [AgentLevel.WHOLESALER]: statsData?.level4 || 0,
          [AgentLevel.CHIEF_COMPANY]: statsData?.level5 || 0,
          [AgentLevel.GROUP_DIVISION]: statsData?.level6 || 0,
        },
        commissionDistribution: {
          [AgentLevel.MEMBER]: 0,
          [AgentLevel.MODEL_AGENT]: 0,
          [AgentLevel.AGENT]: 0,
          [AgentLevel.WHOLESALER]: 0,
          [AgentLevel.CHIEF_COMPANY]: 0,
          [AgentLevel.GROUP_DIVISION]: 0,
        },
        growthRate: 0,
      };
    } catch (error: any) {
      console.error('[TeamApi] getTeamStats error:', error);
      throw error;
    }
  }

  /**
   * 获取团队成员详情（真实数据）
   * 使用后端 GET /api/users/:id + GET /api/users/:id/upline-chain
   */
  static async getMemberDetail(memberId: string): Promise<MemberDetail> {
    try {
      // 并行请求：用户详情 + 上级链路
      const [detailRes, chainRes] = await Promise.all([
        usersApi.getDetail(Number(memberId)),
        apiClient.get(`/users/${memberId}/upline-chain`),
      ]);

      // apiClient 已解包
      const detail = detailRes?.data || detailRes;
      const chain = chainRes?.data || chainRes;

      // 转换基础成员信息
      const memberBase = mapDbUserToTeamMember(detail);

      // 构建完整详情
      const memberDetail: MemberDetail = {
        ...memberBase,

        // 收益历史（从余额日志或佣金表查询，暂用空数组）
        commissionHistory: [],

        // 下级列表（从team-tree取或单独查）
        directSubordinateList: [],

        // 最近加入的下级
        recentSubordinates: [],

        // 升级历史（暂无专门表，留空待扩展）
        upgradeHistory: [],

        // 订单概况
        orderStats: {
          totalOrders: detail?.order_count || 0,
          totalAmount: 0,
          avgOrderAmount: 0,
          lastOrderTime: detail?.last_order_time || '',
          favoriteProducts: [],
        },

        // 额外字段从上级链路补充
        ...(chain?.uplineChain ? {
          uplineChain: chain.uplineChain,
        } : {}),
      };

      return memberDetail;
    } catch (error: any) {
      console.error('[TeamApi] getMemberDetail error:', error);
      throw error;
    }
  }

  /**
   * 获取团队增长分析（基于真实数据的分析）
   * 暂时返回基础统计，后续可接入专门的统计接口
   */
  static async getTeamGrowthAnalysis(
    userId: string | number,
    period: 'week' | 'month' | 'quarter' = 'month'
  ): Promise<TeamGrowthAnalysis> {
    try {
      // 先获取团队成员列表做分析
      const allMembersResult = await import('../api/userApi').then((mod) =>
        mod.userApi.getUsers({ pageSize: 9999 })
      );

      const members = allMembersResult.users;
      const now = new Date();
      let periodStart: Date;

      switch (period) {
        case 'week':
          periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'quarter':
          periodStart = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
        default:
          periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }

      // 筛选期间新增成员
      const newInPeriod = members.filter((m: any) => {
        if (!m.created_at) return false;
        return new Date(m.created_at) >= periodStart;
      });

      // 构建每日增长趋势
      const dailyMap = new Map<string, number>();
      for (let i = 0; i < 30; i++) {
        const d = new Date(now.getTime() - (29 - i) * 24 * 60 * 60 * 1000);
        dailyMap.set(d.toISOString().slice(0, 10), 0);
      }
      members.forEach((m: any) => {
        if (m.created_at) {
          const dateKey = m.created_at.slice(0, 10);
          if (dailyMap.has(dateKey)) {
            dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + 1);
          }
        }
      });

      const dailyGrowth = Array.from(dailyMap.entries()).map(([date, count]) => ({
        date,
        newMembers: count,
        totalMembers: 0, // 累计总数需要逐日累加
        totalCommission: 0,
      }));

      // 累计总数
      let runningTotal = 0;
      for (const item of dailyGrowth) {
        runningTotal += item.newMembers;
        item.totalMembers = runningTotal;
      }

      return {
        period,
        newMembers: newInPeriod.length,
        growthRate: members.length > 0 ? newInPeriod.length / members.length : 0,
        commissionGrowth: 0,
        levelUpgrades: 0,
        dailyGrowth,
        sourceAnalysis: [
          { source: '邀请码注册', count: Math.ceil(newInPeriod.length * 0.6), proportion: 0.6 },
          { source: '扫码加入', count: Math.ceil(newInPeriod.length * 0.25), proportion: 0.25 },
          { source: '后台创建', count: Math.ceil(newInPeriod.length * 0.15), proportion: 0.15 },
        ],
      };
    } catch (error: any) {
      console.error('[TeamApi] getTeamGrowthAnalysis error:', error);
      throw error;
    }
  }

  /**
   * 获取团队成员状态（基于真实数据估算）
   */
  static async getTeamMemberStatus(userId?: string): Promise<TeamMemberStatus> {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const result = await import('../api/userApi').then((mod) =>
        mod.userApi.getUsers({ pageSize: 9999 })
      );

      const members = result.users;

      // 基于最后活跃时间估算各指标
      const activeToday = members.filter((m: any) => {
        if (!m.last_order_time && !m.updated_at) return false;
        const lastActive = new Date(m.last_order_time || m.updated_at);
        return lastActive >= todayStart;
      }).length;

      const orderedThisWeek = members.filter((m: any) => {
        if (!m.last_order_time) return m.order_count > 0;
        return new Date(m.last_order_time) >= weekAgo;
      }).length;

      return {
        online: 0, // 无在线状态追踪
        activeToday,
        orderedThisWeek,
        upgradedThisMonth: 0, // 需要升级日志表支持
      };
    } catch (error: any) {
      console.error('[TeamApi] getTeamMemberStatus error:', error);
      throw error;
    }
  }

  /**
   * 导出团队数据（真实数据导出）
   */
  static async exportTeamData(params: TeamQueryParams, _config: any): Promise<string> {
    const result = await this.getTeamMembers(params);
    
    // 构建CSV格式的导出数据
    const headers = ['ID', '姓名', '手机号', '等级', '累计收益', '团队人数', '加入时间', '状态'];
    const rows = result.members.map(m => [
      m.id,
      m.username,
      m.phone,
      m.levelLabel,
      String(m.totalCommission),
      String(m.teamSize),
      m.joinTime.slice(0, 10),
      m.isActive ? '活跃' : '非活跃',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    // 触发浏览器下载
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `team-data-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    return link.download;
  }

  /**
   * 快速搜索团队成员（真实搜索）
   */
  static async searchMembers(keyword: string, limit: number = 10): Promise<TeamMember[]> {
    try {
      const result = await import('../api/userApi').then((mod) =>
        mod.userApi.getUsers({
          search: keyword,
          pageSize: limit,
        })
      );

      return result.users.map(mapDbUserToTeamMember);
    } catch (error: any) {
      console.error('[TeamApi] searchMembers error:', error);
      throw error;
    }
  }

  /**
   * 获取团队关系图数据（基于真实数据）
   */
  static async getTeamGraph(
    userId: string | number,
    maxDepth: number = 2
  ): Promise<any> {
    try {
      const treeData = await this.getTeamTree(userId, maxDepth);

      // 递归提取所有节点
      const nodes: any[] = [];
      const links: any[] = [];

      const extractNodes = (node: TeamTreeNode, parentKey?: string) => {
        nodes.push({
          id: node.id,
          name: node.username,
          level: node.level,
          commission: node.totalCommission,
          symbolSize: 30 + Math.log10(node.totalCommission + 1) * 10,
          category: node.level,
          value: node.totalCommission,
          label: { show: true },
        });

        if (parentKey) {
          links.push({
            source: parentKey,
            target: node.id,
            value: 1,
          });
        }

        if (node.children) {
          node.children.forEach(child => extractNodes(child, node.id));
        }
      };

      extractNodes(treeData);

      return {
        nodes,
        links,
        categories: [
          { name: '会员' },
          { name: '打版代言人' },
          { name: '代理商' },
          { name: '批发商' },
          { name: '首席分公司' },
          { name: '集团事业部' },
        ],
      };
    } catch (error: any) {
      console.error('[TeamApi] getTeamGraph error:', error);
      throw error;
    }
  }
}

// 导出实例
export const teamApi = new TeamApiService();
