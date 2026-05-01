import React, { useState, useEffect } from 'react';
import { 
  Row, 
  Col, 
  Card, 
  Statistic, 
  Table, 
  Tag, 
  Progress,
  Typography,
  Space,
  Button,
  Dropdown,
  Tabs,
  DatePicker,
  Tooltip,
  Spin
} from 'antd';
import { 
  UserOutlined, 
  ShoppingOutlined, 
  DollarOutlined, 
  TeamOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  EyeOutlined,
  DownloadOutlined,
  CalendarOutlined,
  AreaChartOutlined,
  BarChartOutlined,
  PieChartOutlined,
  HistoryOutlined,
  FileTextOutlined,
  SettingOutlined,
  MoreOutlined,
  FireOutlined,
  TrophyOutlined,
  MessageOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  AppstoreOutlined,
  FilterOutlined,
  WarningOutlined,
  ReloadOutlined,
  InboxOutlined
} from '@ant-design/icons';
import { Line, Pie, Column } from '@ant-design/charts';
import type { TabsProps } from 'antd';
import { dashboardApi, ordersApi, usersApi, productsApi, commissionsApi } from '../services/dbApi';
import './Dashboard.css';

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;

// ==================== 类型定义 ====================
interface OverviewData {
  users: { total: number; newToday: number; newThisMonth: number };
  orders: { total: number; pending: number; today: number };
  sales: { total: number; today: number; thisMonth: number };
  commissions: { total: number; pendingWithdrawal: number };
}

interface SalesTrendItem {
  date: string;
  order_count: number;
  sales_amount: number;
  active_users: number;
}

interface TopProduct {
  id: number;
  product_name: string;
  main_image: string | null;
  agent_price: number;
  total_qty: number;
  total_amount: number;
  buyer_count: number;
}

interface AgentRankItem {
  id: number;
  username: string;
  real_name: string | null;
  avatar_url: string | null;
  agent_level: number;
  team_name: string | null;
  order_count: number;
  sales_amount: number;
}

interface UserGrowthItem {
  month: string;
  new_users: number;
  cumulative: number;
}

interface OrderItem {
  id: number;
  order_no: string;
  user_id: number;
  user_name?: string;
  actual_amount: number;
  order_status: number;
  payment_method: string | null;
  order_time: string;
  items_count?: number;
}

// 等级名称映射
const LEVEL_NAMES: Record<number, string> = {
  1: '会员', 2: '打版代言人', 3: '代理商',
  4: '批发商', 5: '首席分公司', 6: '集团事业部'
};

const LEVEL_COLORS: Record<number, string> = {
  1: '#8c8c8c', 2: '#52c41a', 3: '#1890ff',
  4: '#fa8c16', 5: '#f5222d', 6: '#722ed1'
};

// 订单状态映射
const ORDER_STATUS_MAP: Record<number, { color: string; text: string }> = {
  0: { color: 'orange', text: '待支付' },
  1: { color: 'blue', text: '已支付/待发货' },
  2: { color: 'cyan', text: '已发货' },
  3: { color: 'success', text: '已完成' },
  4: { color: 'default', text: '已取消' }
};

const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState<any>([null, null]);

  // 数据状态
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [salesTrend, setSalesTrend] = useState<SalesTrendItem[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [agentRank, setAgentRank] = useState<AgentRankItem[]>([]);
  const [userGrowth, setUserGrowth] = useState<UserGrowthItem[]>([]);
  const [recentOrders, setRecentOrders] = useState<OrderItem[]>([]);
  const [userLevelDist, setUserLevelDist] = useState<{ type: string; value: number; color: string }[]>([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // ==================== 数据加载 ====================
  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [
        overviewRes,
        trendRes,
        topProdRes,
        rankRes,
        growthRes,
        ordersRes,
        productStatsRes,
        withdrawalRes
      ] = await Promise.allSettled([
        dashboardApi.getOverview(),
        dashboardApi.getSalesTrend(30),
        dashboardApi.getTopProducts(),
        dashboardApi.getAgentRank('month'),
        dashboardApi.getUserGrowth(),
        ordersApi.getList({ page: 1, pageSize: 5 }),
        productsApi.getStats(),
        commissionsApi.getWithdrawals({ page: 1, pageSize: 1, status: 0 })
      ]);

      // overview
      if (overviewRes.status === 'fulfilled' && overviewRes.value.data) {
        setOverview(overviewRes.value.data);
      }

      // sales trend
      if (trendRes.status === 'fulfilled' && trendRes.value.data) {
        setSalesTrend(trendRes.value.data);
      }

      // top products
      if (topProdRes.status === 'fulfilled' && topProdRes.value.data) {
        setTopProducts(topProdRes.value.data);
      }

      // agent rank
      if (rankRes.status === 'fulfilled' && rankRes.value.data) {
        setAgentRank(rankRes.value.data);
      }

      // user growth
      if (growthRes.status === 'fulfilled' && growthRes.value.data) {
        setUserGrowth(growthRes.value.data);
      }

      // recent orders
      if (ordersRes.status === 'fulfilled') {
        const resp = ordersRes.value as any;
        const list = resp?.data?.list || [];
        setRecentOrders(list.map((o: any) => ({
          ...o,
          key: String(o.id),
          orderNo: o.order_no,
          user: o.user_name || `用户${o.user_id}`,
          amount: o.actual_amount,
          status: ['pending','paid','shipped','completed','cancelled'][o.order_status] || 'pending',
          time: o.order_time ? o.order_time.substring(11, 16) : '',
          payment: ({ wechat: '微信支付', alipay: '支付宝', balance: '余额支付', card: '银行卡' } as Record<string, string>)[o.payment_method || 'wechat'] || '微信支付'
        })));
      }

      // product stats - low stock count
      if (productStatsRes.status === 'fulfilled') {
        const stats = (productStatsRes.value as any)?.data;
        setLowStockCount(stats?.lowStock || 0);
      }

      // pending withdrawals count
      if (withdrawalRes.status === 'fulfilled') {
        const resp = withdrawalRes.value as any;
        setPendingWithdrawals(resp?.data?.total || 0);
      }

      setLastUpdated(new Date().toLocaleString('zh-CN'));
    } catch (err) {
      console.error('Dashboard data load error:', err);
    } finally {
      setLoading(false);
    }
  };

  // 用户等级分布（从 overview 的用户数据中获取）
  useEffect(() => {
    fetchAllData();
  }, []);

  // 获取等级分布
  useEffect(() => {
    const fetchLevelDist = async () => {
      try {
        const res = await fetch('/api/users/level-distribution', {
          headers: { Authorization: localStorage.getItem('jlm_auth_token') || '' }
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            const dist = json.data.map((d: { level: number; count: number }) => ({
              type: LEVEL_NAMES[d.level] || `Lv${d.level}`,
              value: d.count,
              color: LEVEL_COLORS[d.level] || '#999'
            }));
            if (dist.length > 0) setUserLevelDist(dist);
          }
        }
      } catch {
        // fallback: 如果接口不存在就留空
      }
    };
    fetchLevelDist();
  }, []);

  // ==================== 计算属性 ====================

  // KPI统计卡片 — 从真实数据构建
  const kpiStats = [
    {
      key: 'users',
      title: '总用户数',
      value: overview?.users.total ?? 0,
      prefix: <UserOutlined />,
      color: 'var(--color-primary)',
      change: (overview?.users.newToday ?? 0) > 0 ? `+${overview!.users.newToday}` : '+0',
      trend: 'up' as const,
      description: '今日新增',
      suffix: '人'
    },
    {
      key: 'orders',
      title: '今日订单',
      value: overview?.orders.today ?? 0,
      prefix: <ShoppingOutlined />,
      color: 'var(--color-success)',
      change: `${overview?.orders.pending ?? 0} 笔待处理`,
      trend: 'up' as const,
      description: '待支付订单',
      suffix: '笔'
    },
    {
      key: 'revenue',
      title: '今日收益',
      value: Math.round(overview?.sales.today ?? 0),
      prefix: <DollarOutlined />,
      color: 'var(--color-warning)',
      change: overview?.sales.thisMonth ? `本月¥${(overview.sales.thisMonth / 10000).toFixed(1)}万` : '-',
      trend: 'up' as const,
      description: '本月累计',
      suffix: '元',
      isMoney: true
    },
    {
      key: 'teams',
      title: '总收益',
      value: Math.round(overview?.commissions.total ?? 0),
      prefix: <TeamOutlined />,
      color: 'var(--color-info)',
      change: pendingWithdrawals > 0 ? `${pendingWithdrawals}笔待审` : '无待审核',
      trend: pendingWithdrawals > 0 ? 'down' : 'up' as const,
      description: '待提现审核',
      suffix: '元',
      isMoney: true
    }
  ];

  // 快速指标 — 从真实数据计算
  const quickMetrics = (() => {
    const avgOrderVal = overview?.sales.today && overview?.orders.today > 0
      ? Math.round(overview.sales.today / overview.orders.today)
      : 0;

    return [
      {
        key: 'conversion',
        title: '本月销售',
        value: overview?.sales.thisMonth != null ? `¥${(overview.sales.thisMonth / 10000).toFixed(1)}万` : '¥0',
        icon: <AreaChartOutlined />,
        color: '#00C896',
        trend: overview?.sales.total ? `累计¥${(overview.sales.total / 10000).toFixed(1)}万` : '',
        description: '总销售额'
      },
      {
        key: 'avg_order',
        title: '客单价',
        value: avgOrderVal > 0 ? `¥${avgOrderVal}` : '¥0',
        icon: <BarChartOutlined />,
        color: '#FF8A00',
        trend: overview?.orders.today ? `今日${overview.orders.today}单` : '',
        description: '平均订单金额'
      },
      {
        key: 'new_users',
        title: '新增用户',
        value: `${overview?.users.newThisMonth ?? 0}人`,
        icon: <UserOutlined />,
        color: '#1890FF',
        trend: overview?.users.newToday ? `今日+${overview.users.newToday}` : '',
        description: '本月注册'
      },
      {
        key: 'stock_alert',
        title: '库存预警',
        value: lowStockCount > 0 ? `${lowStockCount}项` : '正常',
        icon: <WarningOutlined />,
        color: lowStockCount > 0 ? '#FF4D4F' : '#00C896',
        trend: lowStockCount > 0 ? '需补货' : '库存充足',
        description: '低库存商品'
      }
    ];
  })();

  // 销售趋势图数据格式转换（双轴图）
  const salesTrendDataFlat = salesTrend.length > 0
    ? [
        ...salesTrend.map(d => ({ date: d.date.substring(5), value: d.sales_amount, type: '销售额', order_count: d.order_count })),
      ]
    : [{ date: '--', value: 0, type: '销售额', order_count: 0 }];

  // 用户等级分布（fallback 如果API没返回）
  const effectiveLevelDist = userLevelDist.length > 0 ? userLevelDist : [
    { type: '暂无数据', value: 1, color: '#d9d9d9' }
  ];

  // 热门商品
  const hotProductsDisplay = topProducts.slice(0, 5).map((p, i) => ({
    id: p.id,
    name: p.product_name,
    sales: p.total_qty,
    revenue: p.total_amount,
    growth: p.buyer_count > 0 ? `${p.buyer_count}人购买` : ''
  }));

  // 待办事项 — 从真实数据构建
  const pendingTasks = [
    {
      id: 1,
      title: '待审核提现申请',
      count: pendingWithdrawals,
      priority: pendingWithdrawals > 0 ? 'high' : 'low' as const,
      icon: <DollarOutlined />,
      color: 'var(--color-warning)',
      description: pendingWithdrawals > 0 ? '需尽快处理' : '暂无申请'
    },
    {
      id: 2,
      title: '待支付订单',
      count: overview?.orders.pending ?? 0,
      priority: (overview?.orders.pending ?? 0) > 5 ? 'high' : 'medium' as const,
      icon: <ShoppingOutlined />,
      color: 'var(--color-info)',
      description: (overview?.orders.pending ?? 0) > 0 ? '需跟进客户' : '暂无'
    },
    {
      id: 3,
      title: '低库存预警',
      count: lowStockCount,
      priority: lowStockCount > 3 ? 'high' : 'low' as const,
      icon: <InboxOutlined />,
      color: 'var(--color-success)',
      description: lowStockCount > 0 ? '建议及时补货' : '库存充足'
    },
    {
      id: 4,
      title: '新注册用户',
      count: overview?.users.newToday ?? 0,
      priority: 'low' as const,
      icon: <UserOutlined />,
      color: 'var(--color-primary)',
      description: '今日新注册'
    },
  ];

  // Tab 配置
  const tabItems: TabsProps['items'] = [
    {
      key: 'overview',
      label: (<span><AppstoreOutlined /> 数据概览</span>),
    },
    {
      key: 'sales',
      label: (<span><BarChartOutlined /> 销售分析</span>),
    },
    {
      key: 'users',
      label: (<span><TeamOutlined /> 用户分析</span>),
    },
    {
      key: 'products',
      label: (<span><ShoppingOutlined /> 商品分析</span>),
    },
  ];

  // 日期选择
  const handleDateChange = (dates: any) => setDateRange(dates);

  // 销售趋势配置
  const salesTrendConfig = {
    data: salesTrendDataFlat,
    xField: 'date',
    yField: 'value',
    smooth: true,
    color: '#00C896',
    yAxis: {
      label: { formatter: (v: number) => `¥${(v / 1000).toFixed(0)}k` },
    },
    height: 300,
    tooltip: { fields: ['date', 'value', 'order_count'] },
  };

  // 用户分布配置
  const userDistributionConfig = {
    data: effectiveLevelDist,
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    innerRadius: 0.6,
    label: {
      text: (d: any) => `${d.type}\n${d.value}`,
      style: { fontSize: 14, textAlign: 'center' as const },
    },
    height: 300,
    color: ['#00C896', '#FF8A00', '#1890FF', '#722ED1', '#FF4D4F', '#8c8c8c'],
    interactions: [{ type: 'element-active' }],
    statistic: {
      title: false,
      content: {
        style: { whiteSpace: 'pre-wrap', overflow: 'hidden', textOverflow: 'ellipsis' },
        content: overview?.users.total != null ? `共${overview.users.total}人` : '加载中...',
      },
    },
  };

  // 更多操作菜单
  const moreActions = [
    { key: 'export', label: '导出数据', icon: <DownloadOutlined /> },
    { key: 'refresh', label: '刷新数据', icon: <ReloadOutlined />, onClick: fetchAllData },
    { key: 'settings', label: '图表设置', icon: <SettingOutlined /> },
    { key: 'print', label: '打印报表', icon: <FileTextOutlined /> },
  ];

  return (
    <div className="dashboard-container">
      {/* 头部区域 */}
      <div className="dashboard-header">
        <div className="header-content">
          <div className="welcome-section">
            <Title level={2} className="welcome-title">欢迎回来，管理员！👋</Title>
            <Paragraph className="welcome-subtitle">
              今天是 {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}，
              以下是您的系统数据概览
            </Paragraph>
          </div>
          <div className="header-actions">
            <Space>
              <RangePicker
                onChange={handleDateChange}
                suffixIcon={<CalendarOutlined />}
                className="date-picker"
                placeholder={['开始日期', '结束日期']}
              />
              <Button type="primary" icon={<DownloadOutlined />}>
                导出报表
              </Button>
              <Dropdown menu={{ items: moreActions }} trigger={['click']}>
                <Button icon={<MoreOutlined />} />
              </Dropdown>
            </Space>
          </div>
        </div>
      </div>

      <Spin spinning={loading} tip="正在加载数据...">
      {/* 标签页 */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        className="dashboard-tabs"
      />

      {/* KPI统计卡片 */}
      <div className="kpi-section">
        <Title level={4} className="section-title"><FireOutlined /> 关键指标</Title>
        <Row gutter={[16, 16]}>
          {kpiStats.map((stat) => (
            <Col key={stat.key} xs={24} sm={12} lg={6}>
              <Card className="kpi-card" hoverable>
                <div className="kpi-card-content">
                  <div className="kpi-icon" style={{ color: stat.color }}>{stat.prefix}</div>
                  <div className="kpi-info">
                    <div className="kpi-title">{stat.title}</div>
                    <div className="kpi-value">
                      <span className="value-number">{stat.isMoney ? '¥' : ''}{stat.value.toLocaleString()}</span>
                      <span className="value-unit">{stat.suffix}</span>
                    </div>
                    <div className="kpi-trend">
                      <span className={`trend-${stat.trend}`}>
                        {stat.change.startsWith('+') ? <ArrowUpOutlined /> : stat.change.includes('待') ? <ClockCircleOutlined /> : <ArrowUpOutlined />}
                        {stat.change}
                      </span>
                      <span className="trend-description">{stat.description}</span>
                    </div>
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      {/* 快速指标 */}
      <div className="metrics-section">
        <Row gutter={[16, 16]}>
          {quickMetrics.map((metric) => (
            <Col key={metric.key} xs={24} sm={12} md={6}>
              <Card className="metric-card" hoverable>
                <div className="metric-header">
                  <div className="metric-icon" style={{ color: metric.color }}>{metric.icon}</div>
                  <div className="metric-title">{metric.title}</div>
                </div>
                <div className="metric-value">{metric.value}</div>
                <div className="metric-footer">
                  <span className="metric-trend" style={{ color: metric.color }}>{metric.trend}</span>
                  <span className="metric-description">{metric.description}</span>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      {/* 图表区域 */}
      <div className="charts-section">
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={16}>
            <Card
              className="chart-card"
              title={<div className="chart-header"><AreaChartOutlined /><span>销售额趋势分析</span></div>}
              extra={
                <Space>
                  <Button size="small" type={activeTab === 'overview' ? 'primary' : 'default'}>近30天</Button>
                  <Button size="small" type={activeTab === 'sales' ? 'primary' : 'default'}>本月</Button>
                  <Button size="small" type={activeTab === 'users' ? 'primary' : 'default'}>本年</Button>
                </Space>
              }
            >
              <Line {...salesTrendConfig} />
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card
              className="chart-card"
              title={<div className="chart-header"><PieChartOutlined /><span>用户等级分布</span></div>}
            >
              <Pie {...userDistributionConfig} />
            </Card>
          </Col>
        </Row>
      </div>

      {/* 数据表格区域 */}
      <div className="tables-section">
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={16}>
            <Card
              className="table-card"
              title={<div className="table-header"><HistoryOutlined /><span>最新订单</span></div>}
              extra={
                <Space>
                  <Tooltip title="筛选"><Button icon={<FilterOutlined />} size="small" /></Tooltip>
                  <Button type="link" size="small">查看全部</Button>
                </Space>
              }
            >
              <Table
                columns={[
                  { title: '订单号', dataIndex: 'orderNo', key: 'orderNo', width: 150 },
                  { title: '用户', dataIndex: 'user', key: 'user', width: 100 },
                  {
                    title: '金额', dataIndex: 'amount', key: 'amount', width: 120,
                    render: (amount: number) => <Text strong className="order-amount">¥{(amount || 0).toFixed(2)}</Text>
                  },
                  {
                    title: '状态', dataIndex: 'status', key: 'status', width: 100,
                    render: (status: string) => {
                      const cfg: Record<string, { color: string; text: string; icon?: React.ReactNode }> = {
                        pending: { color: 'orange', text: '待支付', icon: <ClockCircleOutlined /> },
                        paid: { color: 'blue', text: '待发货', icon: <ClockCircleOutlined /> },
                        shipped: { color: 'green', text: '已发货', icon: <CheckCircleOutlined /> },
                        completed: { color: 'success', text: '已完成', icon: <CheckCircleOutlined /> },
                      };
                      const c = cfg[status] || { color: 'default', text: '未知' };
                      return <Tag icon={c.icon} color={c.color}>{c.text}</Tag>;
                    }
                  },
                  {
                    title: '操作', key: 'action', width: 80,
                    render: () => <Button type="link" size="small" icon={<EyeOutlined />}>查看</Button>
                  }
                ]}
                dataSource={recentOrders}
                pagination={false}
                size="small"
                className="orders-table"
                locale={{ emptyText: loading ? '加载中...' : '暂无订单数据' }}
              />
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card
              className="table-card"
              title={<div className="table-header"><TrophyOutlined /><span>热门商品排行</span></div>}
            >
              {hotProductsDisplay.length > 0 ? (
                <div className="hot-products">
                  {hotProductsDisplay.map((product, index) => (
                    <div key={product.id} className="product-item">
                      <div className="product-rank">
                        <div className={`rank-badge rank-${index + 1}`}>{index + 1}</div>
                      </div>
                      <div className="product-info">
                        <div className="product-name">{product.name}</div>
                        <div className="product-stats">
                          <span className="stat-sales">销量: {product.sales}</span>
                          <span className="stat-growth" style={{ color: 'var(--color-success)' }}>{product.growth}</span>
                        </div>
                      </div>
                      <div className="product-revenue">¥{(product.revenue / 1000).toFixed(1)}k</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                  <InboxOutlined style={{ fontSize: 32, marginBottom: 12 }} />
                  <div>暂无热销商品数据</div>
                </div>
              )}
            </Card>
          </Col>
        </Row>
      </div>

      {/* 底部信息卡片 */}
      <div className="bottom-section">
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Card
              className="info-card"
              title={<div className="info-header"><ExclamationCircleOutlined /><span>待办事项</span></div>}
            >
              <div className="pending-tasks">
                {pendingTasks.map((task) => (
                  <div key={task.id} className="task-item">
                    <div className="task-icon" style={{ color: task.color }}>{task.icon}</div>
                    <div className="task-content">
                      <div className="task-title">{task.title}</div>
                      <div className="task-description">{task.description}</div>
                    </div>
                    <div className="task-count">
                      <span className={`count-badge priority-${task.priority}`}>{task.count}</span>
                    </div>
                    <Button type="link" size="small" className="task-action">处理</Button>
                  </div>
                ))}
              </div>
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card
              className="info-card"
              title={<div className="info-header"><TrophyOutlined /><span>业绩排行 TOP5</span></div>}
            >
              {agentRank.length > 0 ? (
                <div className="agent-rank-list">
                  {agentRank.slice(0, 5).map((agent, index) => (
                    <div key={agent.id} className={`rank-item ${index < 3 ? 'top-item' : ''}`}>
                      <div className={`rank-num rank-${index + 1}`}>{index + 1}</div>
                      <div className="agent-info">
                        <div className="agent-name">
                          {agent.real_name || agent.username}
                          <Tag color={LEVEL_COLORS[agent.agent_level] || '#999'} style={{ marginLeft: 6, fontSize: 10 }}>
                            {LEVEL_NAMES[agent.agent_level] || `Lv${agent.agent_level}`}
                          </Tag>
                        </div>
                        <div className="agent-team">{agent.team_name || '未分组'}</div>
                      </div>
                      <div className="agent-sales">
                        <strong>¥{(agent.sales_amount / 10000).toFixed(1)}万</strong>
                        <span>{agent.order_count}单</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '30px 0', color: '#999' }}>
                  <TrophyOutlined style={{ fontSize: 28 }} /><br/>暂无排行数据
                </div>
              )}
            </Card>
          </Col>
        </Row>
      </div>

      {/* 页脚提示 */}
      <div className="dashboard-footer">
        <Text type="secondary"><ClockCircleOutlined /> 数据更新时间: {lastUpdated || '--'}</Text>
        <Text type="secondary">如需手动刷新请点击右上角刷新按钮</Text>
      </div>
      </Spin>
    </div>
  );
};

export default Dashboard;
