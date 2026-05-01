// 收益管理页面 - 现代化重新设计
import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Input,
  DatePicker,
  Select,
  Form,
  Row,
  Col,
  Statistic,
  Progress,
  Badge,
  Modal,
  message,
  Dropdown,
  Menu,
  Avatar,
  Descriptions,
  Divider,
  Timeline,
  Steps,
  Tooltip,
  Tabs,
  Typography,
  Alert,
  Empty
} from 'antd';
import {
  DollarOutlined,
  RiseOutlined,
  TeamOutlined,
  FileTextOutlined,
  ExportOutlined,
  SettingOutlined,
  BarChartOutlined,
  PieChartOutlined,
  CalculatorOutlined,
  SearchOutlined,
  FilterOutlined,
  DownloadOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  PrinterOutlined,
  SendOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  CarOutlined,
  UserOutlined,
  CalendarOutlined,
  SortAscendingOutlined,
  PlusOutlined,
  MoreOutlined,
  MoneyCollectOutlined,
  PercentageOutlined,
  CrownOutlined,
  TrophyOutlined,
  WalletOutlined,
  TransactionOutlined
} from '@ant-design/icons';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer
} from 'recharts';
import './CommissionManagement.css';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;
const { Option } = Select;

// 代理商等级枚举
enum AgentLevel {
  MEMBER = 1,
  MODEL_AGENT = 2,
  AGENT = 3,
  WHOLESALER = 4,
  CHIEF_COMPANY = 5,
  GROUP_DIVISION = 6,
}

// 分润类型枚举
enum CommissionType {
  LEVEL_DIFF = 'level_diff',
  PEER_BONUS = 'peer_bonus',
  UPGRADE_BONUS = 'upgrade_bonus',
}

// 等级配置
const levelConfigs = {
  [AgentLevel.MEMBER]: { name: '会员', color: '#8c8c8c', discount: 1.0 },
  [AgentLevel.MODEL_AGENT]: { name: '打版代言人', color: '#52c41a', discount: 0.95 },
  [AgentLevel.AGENT]: { name: '代理商', color: '#1890ff', discount: 0.90 },
  [AgentLevel.WHOLESALER]: { name: '批发商', color: '#fa8c16', discount: 0.85 },
  [AgentLevel.CHIEF_COMPANY]: { name: '首席分公司', color: '#f5222d', discount: 0.80 },
  [AgentLevel.GROUP_DIVISION]: { name: '集团事业部', color: '#722ed1', discount: 0.75 },
};

// 分润类型配置
const commissionTypeConfig = {
  [CommissionType.LEVEL_DIFF]: { name: '级差利润', color: '#1890ff', icon: <RiseOutlined /> },
  [CommissionType.PEER_BONUS]: { name: '平级奖励', color: '#52c41a', icon: <TeamOutlined /> },
  [CommissionType.UPGRADE_BONUS]: { name: '升级奖励', color: '#fa8c16', icon: <CrownOutlined /> },
};

// 模拟收益统计数据
const mockCommissionStats = {
  totalCommission: 1256800,
  monthCommission: 286400,
  todayCommission: 14800,
  yearCommission: 892500,
  pendingWithdrawal: 85400,
  lastMonthCommission: 234600,
  monthGrowth: 22.3,
  yearGrowth: 38.7,
  trend: [
    { date: '2026-03-18', amount: 12500 },
    { date: '2026-03-19', amount: 14300 },
    { date: '2026-03-20', amount: 16800 },
    { date: '2026-03-21', amount: 15200 },
    { date: '2026-03-22', amount: 18900 },
    { date: '2026-03-23', amount: 20100 },
    { date: '2026-03-24', amount: 18700 },
    { date: '2026-03-25', amount: 14800 },
  ],
  byType: {
    levelDiff: 852400,
    peerBonus: 286300,
    upgradeBonus: 118100,
  },
  byLevel: {
    fromLevel1: 124800,
    fromLevel2: 356200,
    fromLevel3: 452100,
    fromLevel4: 268400,
    fromLevel5: 55500,
    fromLevel6: 28900,
  },
  topContributors: [
    { id: '001', name: '张三', level: AgentLevel.CHIEF_COMPANY, totalContribution: 128400, monthContribution: 28600, orderCount: 45 },
    { id: '002', name: '李四', level: AgentLevel.WHOLESALER, totalContribution: 98500, monthContribution: 21400, orderCount: 32 },
    { id: '003', name: '王五', level: AgentLevel.AGENT, totalContribution: 75200, monthContribution: 16800, orderCount: 28 },
    { id: '004', name: '赵六', level: AgentLevel.MODEL_AGENT, totalContribution: 48500, monthContribution: 12500, orderCount: 21 },
    { id: '005', name: '钱七', level: AgentLevel.AGENT, totalContribution: 41800, monthContribution: 9800, orderCount: 18 },
  ],
};

// 模拟收益记录数据
const mockCommissionRecords = [
  {
    id: 'CM20260325001',
    userId: 'USER001',
    orderId: 'ORD20260325001',
    fromUserId: 'USER002',
    commissionType: CommissionType.LEVEL_DIFF,
    amount: 299.50,
    commissionRate: 15.0,
    description: '级差利润 - 订单结算',
    createdAt: '2026-03-25 09:45:00',
    userInfo: { name: '张三', avatar: '张', level: AgentLevel.CHIEF_COMPANY },
    fromUserInfo: { name: '李四', avatar: '李', level: AgentLevel.WHOLESALER },
    orderInfo: { orderNo: 'ORD20260325001', productName: '静莱美胶原蛋白', quantity: 2, totalAmount: 1999 }
  },
  {
    id: 'CM20260325002',
    userId: 'USER003',
    orderId: 'ORD20260325002',
    fromUserId: 'USER004',
    commissionType: CommissionType.PEER_BONUS,
    amount: 89.95,
    commissionRate: 4.5,
    description: '平级奖励 - 团队业绩',
    createdAt: '2026-03-25 11:20:00',
    userInfo: { name: '王五', avatar: '王', level: AgentLevel.AGENT },
    fromUserInfo: { name: '赵六', avatar: '赵', level: AgentLevel.AGENT },
    orderInfo: { orderNo: 'ORD20260325002', productName: '静莱美面膜', quantity: 10, totalAmount: 1999 }
  },
  {
    id: 'CM20260325003',
    userId: 'USER005',
    orderId: 'ORD20260325003',
    fromUserId: 'USER006',
    commissionType: CommissionType.UPGRADE_BONUS,
    amount: 499.99,
    commissionRate: 25.0,
    description: '升级奖励 - 代理商升级',
    createdAt: '2026-03-25 14:35:00',
    userInfo: { name: '钱七', avatar: '钱', level: AgentLevel.WHOLESALER },
    fromUserInfo: { name: '孙八', avatar: '孙', level: AgentLevel.AGENT },
    orderInfo: { orderNo: 'ORD20260325003', productName: '静莱美旗舰套装', quantity: 1, totalAmount: 1999 }
  },
  {
    id: 'CM20260325004',
    userId: 'USER002',
    orderId: 'ORD20260325004',
    fromUserId: 'USER007',
    commissionType: CommissionType.LEVEL_DIFF,
    amount: 149.75,
    commissionRate: 7.5,
    description: '级差利润 - 团队销售',
    createdAt: '2026-03-25 16:10:00',
    userInfo: { name: '李四', avatar: '李', level: AgentLevel.WHOLESALER },
    fromUserInfo: { name: '周九', avatar: '周', level: AgentLevel.MODEL_AGENT },
    orderInfo: { orderNo: 'ORD20260325004', productName: '静莱美洁面乳', quantity: 1, totalAmount: 999 }
  },
  {
    id: 'CM20260325005',
    userId: 'USER001',
    orderId: 'ORD20260325005',
    fromUserId: 'USER008',
    commissionType: CommissionType.LEVEL_DIFF,
    amount: 399.80,
    commissionRate: 20.0,
    description: '级差利润 - 大额订单',
    createdAt: '2026-03-25 18:45:00',
    userInfo: { name: '张三', avatar: '张', level: AgentLevel.CHIEF_COMPANY },
    fromUserInfo: { name: '吴十', avatar: '吴', level: AgentLevel.MEMBER },
    orderInfo: { orderNo: 'ORD20260325005', productName: '静莱美护肤套装', quantity: 2, totalAmount: 1998 }
  },
];

// 分润规则配置
const mockCommissionRules = {
  peerBonusRate: 0.045,
  minWithdrawalAmount: 100,
  maxDailyWithdrawal: 5000,
  commissionSettlementDelay: 7,
  taxRate: 0.15,
  autoUpgradeEnabled: true,
};

const CommissionManagementNew: React.FC = () => {
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('stats');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [showDetail, setShowDetail] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showLevelConfig, setShowLevelConfig] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<any>(null);
  const [searchParams, setSearchParams] = useState<any>({});
  const [commissionList, setCommissionList] = useState(mockCommissionRecords);
  const [stats, setStats] = useState(mockCommissionStats);

  // 计算增长率
  const calculateGrowth = (current: number, previous: number): number => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  // 获取等级标签
  const getLevelTag = (level: AgentLevel) => {
    const config = (levelConfigs as any)[level];
    return (
      <Tag color={config.color} style={{ borderRadius: '4px', border: 'none' }}>
        {config.name}
      </Tag>
    );
  };

  // 获取分润类型标签
  const getCommissionTypeTag = (type: CommissionType) => {
    const config = commissionTypeConfig[type];
    return (
      <Tag color={config.color} icon={config.icon} style={{ borderRadius: '4px', border: 'none' }}>
        {config.name}
      </Tag>
    );
  };

  // 收益操作菜单
  const commissionActionMenu = (record: any) => (
    <Menu
      items={[
        {
          key: 'view',
          label: '查看详情',
          icon: <EyeOutlined />,
          onClick: () => handleViewDetail(record)
        },
        {
          key: 'export',
          label: '导出记录',
          icon: <ExportOutlined />,
          onClick: () => handleExportRecord(record)
        },
        {
          key: 'calculate',
          label: '重新计算',
          icon: <CalculatorOutlined />,
          onClick: () => handleRecalculate(record)
        },
        {
          type: 'divider'
        },
        {
          key: 'delete',
          label: '删除记录',
          icon: <DeleteOutlined />,
          danger: true,
          onClick: () => handleDeleteRecord(record)
        }
      ]}
    />
  );

  // 处理查看详情
  const handleViewDetail = (record: any) => {
    setCurrentRecord(record);
    setShowDetail(true);
  };

  // 处理导出记录
  const handleExportRecord = (record: any) => {
    message.info(`导出收益记录 ${record.id}`);
  };

  // 处理重新计算
  const handleRecalculate = (record: any) => {
    Modal.confirm({
      title: '重新计算收益',
      content: `确定要重新计算收益记录 ${record.id} 吗？`,
      onOk: () => {
        message.success(`收益记录 ${record.id} 已重新计算`);
      }
    });
  };

  // 处理删除记录
  const handleDeleteRecord = (record: any) => {
    Modal.confirm({
      title: '删除收益记录',
      content: `确定要删除收益记录 ${record.id} 吗？此操作不可恢复。`,
      okType: 'danger',
      onOk: () => {
        message.success(`收益记录 ${record.id} 已删除`);
      }
    });
  };

  // 处理批量操作
  const handleBatchAction = (action: string) => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要操作的记录');
      return;
    }

    switch (action) {
      case 'export':
        message.success(`已批量导出 ${selectedRowKeys.length} 条收益记录`);
        setSelectedRowKeys([]);
        break;
      case 'calculate':
        Modal.confirm({
          title: '批量重新计算',
          content: `确定要批量重新计算 ${selectedRowKeys.length} 条收益记录吗？`,
          onOk: () => {
            message.success(`已批量重新计算 ${selectedRowKeys.length} 条收益记录`);
            setSelectedRowKeys([]);
          }
        });
        break;
      case 'delete':
        Modal.confirm({
          title: '批量删除',
          content: `确定要批量删除 ${selectedRowKeys.length} 条收益记录吗？此操作不可恢复。`,
          okType: 'danger',
          onOk: () => {
            message.success(`已批量删除 ${selectedRowKeys.length} 条收益记录`);
            setSelectedRowKeys([]);
          }
        });
        break;
    }
  };

  // 处理搜索
  const handleSearch = (values: any) => {
    setSearchParams(values);
    message.info('正在搜索收益记录...');
  };

  // 处理重置搜索
  const handleReset = () => {
    form.resetFields();
    setSearchParams({});
    setCommissionList(mockCommissionRecords);
  };

  // 处理导出数据
  const handleExportData = () => {
    message.info('正在导出收益数据...');
  };

  // 处理打开计算器
  const handleOpenCalculator = () => {
    setShowCalculator(true);
  };

  // 处理配置分润规则
  const handleConfigureRules = () => {
    setShowRules(true);
  };

  // 处理配置等级
  const handleConfigureLevels = () => {
    setShowLevelConfig(true);
  };

  // 收益记录表格列定义
  const commissionColumns = [
    {
      title: '收益编号',
      dataIndex: 'id',
      key: 'id',
      width: 140,
      render: (text: string) => (
        <Text strong style={{ color: 'var(--primary-color)' }}>{text}</Text>
      )
    },
    {
      title: '收益接收人',
      key: 'userInfo',
      width: 160,
      render: (record: any) => (
        <div className="user-info-cell">
          <Avatar size="small" style={{ backgroundColor: (levelConfigs as any)[record.userInfo.level].color, marginRight: 8 }}>
            {record.userInfo.avatar}
          </Avatar>
          <div>
            <div style={{ fontWeight: 500 }}>{record.userInfo.name}</div>
            {getLevelTag(record.userInfo.level)}
          </div>
        </div>
      )
    },
    {
      title: '来源用户',
      key: 'fromUserInfo',
      width: 160,
      render: (record: any) => (
        <div className="user-info-cell">
          <Avatar size="small" style={{ backgroundColor: (levelConfigs as any)[record.fromUserInfo.level].color, marginRight: 8 }}>
            {record.fromUserInfo.avatar}
          </Avatar>
          <div>
            <div style={{ fontWeight: 500 }}>{record.fromUserInfo.name}</div>
            {getLevelTag(record.fromUserInfo.level)}
          </div>
        </div>
      )
    },
    {
      title: '分润类型',
      dataIndex: 'commissionType',
      key: 'commissionType',
      width: 120,
      render: (type: CommissionType) => getCommissionTypeTag(type)
    },
    {
      title: '收益金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      sorter: (a: any, b: any) => a.amount - b.amount,
      render: (amount: number) => (
        <div className="amount-cell">
          <Text strong style={{ color: 'var(--success-color)', fontSize: 16 }}>
            ¥{amount.toFixed(2)}
          </Text>
        </div>
      )
    },
    {
      title: '分润比例',
      dataIndex: 'commissionRate',
      key: 'commissionRate',
      width: 100,
      render: (rate: number) => (
        <Tag color="geekblue" style={{ borderRadius: '12px' }}>
          {rate}%
        </Tag>
      )
    },
    {
      title: '订单信息',
      key: 'orderInfo',
      width: 180,
      render: (record: any) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.orderInfo.productName}</div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
            订单号: {record.orderInfo.orderNo}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
            金额: ¥{record.orderInfo.totalAmount}
          </div>
        </div>
      )
    },
    {
      title: '收益时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      sorter: (a: any, b: any) => a.createdAt.localeCompare(b.createdAt),
      render: (time: string) => (
        <div>
          <div>{time.split(' ')[0]}</div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
            {time.split(' ')[1]}
          </div>
        </div>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      fixed: 'right' as const,
      render: (record: any) => (
        <Space>
          <Tooltip title="查看详情">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetail(record)}
              style={{ color: 'var(--primary-color)' }}
            />
          </Tooltip>
          <Dropdown overlay={commissionActionMenu(record)} trigger={['click']}>
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>
        </Space>
      )
    }
  ];

  // 行选择配置
  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => {
      setSelectedRowKeys(keys);
    }
  };

  // 准备图表数据
  const chartData = stats.trend.map(item => ({
    date: item.date.split('-').slice(1, 3).join('-'),
    amount: item.amount
  }));

  const typeChartData = [
    { name: '级差利润', value: stats.byType.levelDiff, color: '#1890ff' },
    { name: '平级奖励', value: stats.byType.peerBonus, color: '#52c41a' },
    { name: '升级奖励', value: stats.byType.upgradeBonus, color: '#fa8c16' }
  ];

  const levelChartData = [
    { name: '会员', value: stats.byLevel.fromLevel1, color: '#8c8c8c' },
    { name: '打版代言人', value: stats.byLevel.fromLevel2, color: '#52c41a' },
    { name: '代理商', value: stats.byLevel.fromLevel3, color: '#1890ff' },
    { name: '批发商', value: stats.byLevel.fromLevel4, color: '#fa8c16' },
    { name: '首席分公司', value: stats.byLevel.fromLevel5, color: '#f5222d' },
    { name: '集团事业部', value: stats.byLevel.fromLevel6, color: '#722ed1' }
  ];

  // 收益详情模态框
  const renderCommissionDetail = () => {
    if (!currentRecord) return null;

    return (
      <Modal
        title={
          <Space>
            <MoneyCollectOutlined />
            <span>收益详情 - {currentRecord.id}</span>
          </Space>
        }
        open={showDetail}
        onCancel={() => setShowDetail(false)}
        width={700}
        footer={[
          <Button key="close" onClick={() => setShowDetail(false)}>
            关闭
          </Button>,
          <Button key="export" type="primary" icon={<ExportOutlined />} onClick={() => handleExportRecord(currentRecord)}>
            导出记录
          </Button>
        ]}
      >
        <div className="commission-detail-container">
          {/* 基本信息 */}
          <Card title="基本信息" size="small">
            <Row gutter={16}>
              <Col span={8}>
                <Descriptions.Item label="收益编号">{currentRecord.id}</Descriptions.Item>
              </Col>
              <Col span={8}>
                <Descriptions.Item label="分润类型">
                  {getCommissionTypeTag(currentRecord.commissionType)}
                </Descriptions.Item>
              </Col>
              <Col span={8}>
                <Descriptions.Item label="收益时间">{currentRecord.createdAt}</Descriptions.Item>
              </Col>
            </Row>
          </Card>

          {/* 用户信息 */}
          <Row gutter={16} style={{ marginTop: 16 }}>
            <Col span={12}>
              <Card title="收益接收人" size="small">
                <div className="user-detail">
                  <Avatar size="large" style={{ backgroundColor: (levelConfigs as any)[currentRecord.userInfo.level].color }}>
                    {currentRecord.userInfo.avatar}
                  </Avatar>
                  <div style={{ marginLeft: 16 }}>
                    <div style={{ fontWeight: 600, fontSize: 16 }}>{currentRecord.userInfo.name}</div>
                    {getLevelTag(currentRecord.userInfo.level)}
                  </div>
                </div>
              </Card>
            </Col>
            <Col span={12}>
              <Card title="来源用户" size="small">
                <div className="user-detail">
                  <Avatar size="large" style={{ backgroundColor: (levelConfigs as any)[currentRecord.fromUserInfo.level].color }}>
                    {currentRecord.fromUserInfo.avatar}
                  </Avatar>
                  <div style={{ marginLeft: 16 }}>
                    <div style={{ fontWeight: 600, fontSize: 16 }}>{currentRecord.fromUserInfo.name}</div>
                    {getLevelTag(currentRecord.fromUserInfo.level)}
                  </div>
                </div>
              </Card>
            </Col>
          </Row>

          {/* 收益详情 */}
          <Card title="收益详情" size="small" style={{ marginTop: 16 }}>
            <Row gutter={16}>
              <Col span={12}>
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="收益金额">
                    <Text strong style={{ fontSize: 20, color: 'var(--success-color)' }}>
                      ¥{currentRecord.amount.toFixed(2)}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="分润比例">
                    <Text strong>{currentRecord.commissionRate}%</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="收益描述">
                    {currentRecord.description}
                  </Descriptions.Item>
                </Descriptions>
              </Col>
              <Col span={12}>
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="关联订单">
                    <div>
                      <div>{currentRecord.orderInfo.orderNo}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                        商品: {currentRecord.orderInfo.productName}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                        数量: {currentRecord.orderInfo.quantity}件
                      </div>
                    </div>
                  </Descriptions.Item>
                  <Descriptions.Item label="订单总额">
                    <Text strong>¥{currentRecord.orderInfo.totalAmount}</Text>
                  </Descriptions.Item>
                </Descriptions>
              </Col>
            </Row>
          </Card>
        </div>
      </Modal>
    );
  };

  return (
    <div className="cm-page">
      {/* 页面头部 */}
      <div className="cm-header">
        <div className="cm-header-left">
          <MoneyCollectOutlined className="cm-header-icon" />
          <div>
            <Title level={2} className="cm-header-title">收益管理</Title>
            <Text type="secondary" className="cm-header-sub">
              管理代理商收益 · 查看分润统计和记录
            </Text>
          </div>
        </div>
        <div className="cm-header-actions">
          <button
            type="button"
            onClick={handleOpenCalculator}
            className="cm-btn-header primary"
          >
            <CalculatorOutlined /> 分润计算器
          </button>
          <button className="cm-btn-header" onClick={handleExportData}>
            <ExportOutlined /> 导出数据
          </button>
        </div>
      </div>

      {/* KPI统计卡片 */}
      <div className="cm-kpi-section">
        <div className="cm-kpi-card" data-type="total">
          <div className="cm-kpi-label">💰 累计收益</div>
          <div className="cm-kpi-value">¥{stats.totalCommission.toLocaleString()}</div>
          <div className="cm-kpi-footer">自系统启用以来</div>
        </div>
        <div className="cm-kpi-card" data-type="completed">
          <div className="cm-kpi-label">📊 本月收益</div>
          <div className="cm-kpi-value">¥{stats.monthCommission.toLocaleString()}</div>
          <div className="cm-kpi-footer">↑ {stats.monthGrowth}% 较上月</div>
        </div>
        <div className="cm-kpi-card" data-type="pending">
          <div className="cm-kpi-label">📅 今日收益</div>
          <div className="cm-kpi-value">¥{stats.todayCommission.toLocaleString()}</div>
          <div className="cm-kpi-footer">实时更新</div>
        </div>
        <div className="cm-kpi-card" data-type="rate">
          <div className="cm-kpi-label">💳 待提现收益</div>
          <div className="cm-kpi-value">¥{stats.pendingWithdrawal.toLocaleString()}</div>
          <div className="cm-kpi-footer"><a onClick={() => message.info('跳转到提现管理')}>处理提现 →</a></div>
        </div>
      </div>
      <Card className="cm-table-section">
        <Tabs activeKey={activeTab} onChange={setActiveTab} className="cm-tabs">
          {/* 收益统计标签页 */}
          <TabPane tab="收益统计" key="stats">
            <div className="stats-content">
              {/* 收益趋势图 */}
              <div className="cm-chart-section">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis dataKey="date" stroke="var(--text-secondary)" />
                    <YAxis stroke="var(--text-secondary)" />
                    <RechartsTooltip
                      formatter={(value) => [`¥${value}`, '收益金额']}
                      labelStyle={{ color: 'var(--text-primary)' }}
                      contentStyle={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="amount"
                      name="收益金额"
                      stroke="var(--primary-color)"
                      strokeWidth={3}
                      dot={{ r: 5, fill: 'var(--primary-color)' }}
                      activeDot={{ r: 8, fill: 'var(--primary-color)' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <Row gutter={16} style={{ marginTop: 16 }}>
                {/* 分润类型分布 */}
                <Col xs={24} md={12}>
                  <Card className="cm-chart-card" title="分润类型分布">
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={typeChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {typeChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip formatter={(value) => [`¥${value}`, '金额']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </Card>
                </Col>

                {/* 等级贡献分布 */}
                <Col xs={24} md={12}>
                  <Card className="cm-chart-card" title="等级贡献分布">
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={levelChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                        <XAxis dataKey="name" stroke="var(--text-secondary)" />
                        <YAxis stroke="var(--text-secondary)" />
                        <RechartsTooltip formatter={(value) => [`¥${value}`, '贡献金额']} />
                        <Bar dataKey="value" name="贡献金额" fill="var(--primary-color)">
                          {levelChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                </Col>
              </Row>

              {/* 顶级贡献者 */}
              <Card className="cm-chart-card" title="顶级贡献者" style={{ marginTop: 16 }}>
                <Table
                  dataSource={stats.topContributors}
                  columns={[
                    {
                      title: '排名',
                      key: 'rank',
                      width: 60,
                      render: (_, __, index) => (
                        <Badge
                          count={index + 1}
                          style={{ 
                            backgroundColor: index < 3 ? 'var(--primary-color)' : 'var(--text-tertiary)',
                            fontSize: '12px'
                          }}
                        />
                      )
                    },
                    {
                      title: '用户',
                      key: 'user',
                      render: (record) => (
                        <div className="contributor-info">
                          <Avatar size="small" style={{ backgroundColor: (levelConfigs as any)[record.level].color }}>
                            {record.name.charAt(0)}
                          </Avatar>
                          <div style={{ marginLeft: 8 }}>
                            <div style={{ fontWeight: 500 }}>{record.name}</div>
                            {getLevelTag(record.level)}
                          </div>
                        </div>
                      )
                    },
                    {
                      title: '总贡献',
                      dataIndex: 'totalContribution',
                      key: 'totalContribution',
                      render: (value) => (
                        <Text strong style={{ color: 'var(--primary-color)' }}>
                          ¥{value.toLocaleString()}
                        </Text>
                      )
                    },
                    {
                      title: '本月贡献',
                      dataIndex: 'monthContribution',
                      key: 'monthContribution',
                      render: (value) => (
                        <Text type="success">¥{value.toLocaleString()}</Text>
                      )
                    },
                    {
                      title: '订单数',
                      dataIndex: 'orderCount',
                      key: 'orderCount',
                      render: (count) => (
                        <Tag color="blue">{count}单</Tag>
                      )
                    }
                  ]}
                  pagination={false}
                  size="small"
                />
              </Card>
            </div>
          </TabPane>

          {/* 分润记录标签页 */}
          <TabPane tab="分润记录" key="records">
            <div className="records-content">
              {/* 筛选和搜索区域 */}
              <Card className="cm-toolbar">
                <Form form={form} layout="inline" onFinish={handleSearch}>
                  <Row gutter={16} style={{ width: '100%' }}>
                    <Col xs={24} sm={12} md={6}>
                      <Form.Item label="分润类型" name="commissionType">
                        <Select placeholder="选择分润类型" allowClear>
                          {Object.values(CommissionType).map(type => (
                            <Option key={type} value={type}>
                              {commissionTypeConfig[type].name}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                      <Form.Item label="收益接收人" name="userId">
                        <Input placeholder="用户ID/姓名" prefix={<UserOutlined />} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                      <Form.Item label="时间范围" name="dateRange">
                        <RangePicker
                          placeholder={['开始时间', '结束时间']}
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                      <Form.Item label="最小金额" name="minAmount">
                        <Input placeholder="最小收益金额" prefix="¥" />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={16} style={{ width: '100%', marginTop: 16 }}>
                    <Col>
                      <Button type="primary" icon={<SearchOutlined />} htmlType="submit">
                        搜索
                      </Button>
                    </Col>
                    <Col>
                      <Button icon={<FilterOutlined />} onClick={handleReset}>
                        重置
                      </Button>
                    </Col>
                    <Col>
                      <Button icon={<SortAscendingOutlined />}>
                        高级筛选
                      </Button>
                    </Col>
                  </Row>
                </Form>
              </Card>

              {/* 批量操作栏 */}
              {selectedRowKeys.length > 0 && (
                <div className="batch-action-bar">
                  <Space>
                    <Text>已选择 {selectedRowKeys.length} 条记录</Text>
                    <Button size="small" onClick={() => setSelectedRowKeys([])}>
                      取消选择
                    </Button>
                    <Button
                      size="small"
                      icon={<ExportOutlined />}
                      onClick={() => handleBatchAction('export')}
                    >
                      批量导出
                    </Button>
                    <Button
                      size="small"
                      icon={<CalculatorOutlined />}
                      onClick={() => handleBatchAction('calculate')}
                    >
                      批量重新计算
                    </Button>
                    <Button
                      size="small"
                      icon={<DeleteOutlined />}
                      danger
                      onClick={() => handleBatchAction('delete')}
                    >
                      批量删除
                    </Button>
                  </Space>
                </div>
              )}

              {/* 收益记录表格 */}
              <Card className="records-table-card">
                <div className="table-header">
                  <Title level={4}>收益记录列表</Title>
                  <Space>
                    <Text type="secondary">共 {commissionList.length} 条记录</Text>
                    <Button icon={<SyncOutlined />} onClick={() => setCommissionList([...mockCommissionRecords])}>
                      刷新
                    </Button>
                  </Space>
                </div>
                <Table
                  columns={commissionColumns}
                  dataSource={commissionList}
                  rowKey="id"
                  rowSelection={rowSelection}
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total) => `共 ${total} 条记录`
                  }}
                  scroll={{ x: 1300 }}
                  size="middle"
                />
              </Card>
            </div>
          </TabPane>

          {/* 分润规则标签页 */}
          <TabPane tab="分润规则" key="rules">
            <div className="rules-content">
              <Row gutter={16}>
                <Col xs={24} lg={16}>
                  <Card className="rules-card" title="分润规则配置">
                    <Row gutter={16}>
                      <Col xs={24} sm={12}>
                        <Statistic
                          title="平级奖励比例"
                          value={mockCommissionRules.peerBonusRate * 100}
                          suffix="%"
                          prefix={<PercentageOutlined />}
                          valueStyle={{ color: 'var(--success-color)' }}
                        />
                      </Col>
                      <Col xs={24} sm={12}>
                        <Statistic
                          title="最小提现金额"
                          value={mockCommissionRules.minWithdrawalAmount}
                          prefix={<WalletOutlined />}
                          valueStyle={{ color: 'var(--primary-color)' }}
                        />
                      </Col>
                      <Col xs={24} sm={12}>
                        <Statistic
                          title="单日最大提现"
                          value={mockCommissionRules.maxDailyWithdrawal}
                          prefix={<MoneyCollectOutlined />}
                          valueStyle={{ color: 'var(--warning-color)' }}
                        />
                      </Col>
                      <Col xs={24} sm={12}>
                        <Statistic
                          title="分润结算延迟"
                          value={mockCommissionRules.commissionSettlementDelay}
                          suffix="天"
                          prefix={<CalendarOutlined />}
                          valueStyle={{ color: 'var(--processing-color)' }}
                        />
                      </Col>
                      <Col xs={24} sm={12}>
                        <Statistic
                          title="税率"
                          value={mockCommissionRules.taxRate * 100}
                          suffix="%"
                          prefix={<FileTextOutlined />}
                          valueStyle={{ color: 'var(--error-color)' }}
                        />
                      </Col>
                      <Col xs={24} sm={12}>
                        <div style={{ textAlign: 'center', paddingTop: 32 }}>
                          <Tag color={mockCommissionRules.autoUpgradeEnabled ? 'green' : 'red'}>
                            {mockCommissionRules.autoUpgradeEnabled ? '自动升级已开启' : '自动升级已关闭'}
                          </Tag>
                        </div>
                      </Col>
                    </Row>
                    <div style={{ marginTop: 24, textAlign: 'center' }}>
                      <Button type="primary" icon={<SettingOutlined />} onClick={handleConfigureRules}>
                        配置分润规则
                      </Button>
                    </div>
                  </Card>
                </Col>
                <Col xs={24} lg={8}>
                  <Card className="rules-card" title="代理商等级配置">
                    <div className="level-config-list">
                      {Object.values(AgentLevel)
                        .filter((v): v is AgentLevel => typeof v === 'number')
                        .map(level => {
                        const config = (levelConfigs as any)[level];
                        if (!config) return null;
                        return (
                          <div key={level} className="level-config-item">
                            <Tag color={config.color} style={{ fontSize: '14px', padding: '6px 12px' }}>
                              {config.name}
                            </Tag>
                            <div className="level-config-details">
                              <div>折扣: {(config.discount * 100).toFixed(0)}%</div>
                              <div>代理价: 零售价 × {config.discount.toFixed(2)}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ marginTop: 24, textAlign: 'center' }}>
                      <Button icon={<SettingOutlined />} onClick={handleConfigureLevels}>
                        等级配置管理
                      </Button>
                    </div>
                  </Card>
                </Col>
              </Row>
            </div>
          </TabPane>
        </Tabs>
      </Card>

      {/* 收益详情模态框 */}
      {renderCommissionDetail()}

      {/* 分润计算器模态框 */}
      <Modal
        title={
          <Space>
            <CalculatorOutlined />
            <span>分润计算器</span>
          </Space>
        }
        open={showCalculator}
        onCancel={() => setShowCalculator(false)}
        width={600}
        footer={null}
      >
        <Alert
          message="分润计算功能正在开发中"
          description="分润计算器将支持根据订单金额、代理商等级、分润规则等参数自动计算分润金额。"
          type="info"
          showIcon
        />
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Button type="primary" disabled>
            敬请期待
          </Button>
        </div>
      </Modal>

      {/* 分润规则配置模态框 */}
      <Modal
        title={
          <Space>
            <SettingOutlined />
            <span>配置分润规则</span>
          </Space>
        }
        open={showRules}
        onCancel={() => setShowRules(false)}
        width={500}
        footer={null}
      >
        <Alert
          message="分润规则配置功能正在开发中"
          description="配置分润规则需要系统管理员权限，修改规则后会自动应用到所有分润计算中。"
          type="warning"
          showIcon
        />
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Button type="primary" disabled>
            敬请期待
          </Button>
        </div>
      </Modal>

      {/* 等级配置模态框 */}
      <Modal
        title={
          <Space>
            <CrownOutlined />
            <span>代理商等级配置</span>
          </Space>
        }
        open={showLevelConfig}
        onCancel={() => setShowLevelConfig(false)}
        width={700}
        footer={null}
      >
        <Alert
          message="等级配置功能正在开发中"
          description="等级配置包括代理商等级设置、折扣比例、升级门槛、分润比例等参数。"
          type="info"
          showIcon
        />
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Button type="primary" disabled>
            敬请期待
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default CommissionManagementNew;