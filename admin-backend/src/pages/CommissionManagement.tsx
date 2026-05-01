/**
 * 收益管理页面
 * 包含收益统计、分润记录、分润规则配置等功能
 */

import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Tabs, Table, Button, Space, DatePicker, Select, Input, Form, Tag, message, Typography } from 'antd';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  DollarOutlined, RiseOutlined, TeamOutlined, FileTextOutlined, ExportOutlined, SettingOutlined,
  BarChartOutlined, PieChartOutlined, CalculatorOutlined 
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { 
  fetchCommissionRecords, 
  fetchCommissionStats, 
  fetchCommissionReport, 
  calculateCommission,
  exportCommissionData,
  fetchCommissionRules,
  updateCommissionRules,
  setFilters,
  clearCalculationResult
} from '../store/slices/commissionSlice';
import { CommissionRecord, CommissionType, AgentLevel } from '../types/commission';
import CommissionStatsCard from '../components/commission/CommissionStatsCard';
import CommissionCalculatorModal from '../components/commission/CommissionCalculatorModal';
import CommissionRulesModal from '../components/commission/CommissionRulesModal';
import LevelConfigModal from '../components/commission/LevelConfigModal';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;
const { Option } = Select;

const CommissionManagement: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { 
    records, 
    stats, 
    currentReport, 
    loading, 
    commissionRules,
    levelConfigs,
    pagination,
    filters
  } = useSelector((state: RootState) => state.commission);
  
  const [activeTab, setActiveTab] = useState('stats');
  const [calculatorVisible, setCalculatorVisible] = useState(false);
  const [rulesVisible, setRulesVisible] = useState(false);
  const [levelConfigVisible, setLevelConfigVisible] = useState(false);
  const [searchForm] = Form.useForm();
  
  // 初始化加载数据
  useEffect(() => {
    dispatch(fetchCommissionStats(""));
    dispatch(fetchCommissionRules(undefined as any));
    dispatch(fetchCommissionRecords(filters));
  }, [dispatch, filters]);
  
  // 处理分页变化
  const handleTableChange = (pagination: any) => {
    dispatch(setFilters({
      ...filters,
      page: pagination.current,
      pageSize: pagination.pageSize
    }));
  };
  
  // 处理搜索
  const handleSearch = (values: any) => {
    const newFilters = {
      ...filters,
      ...values,
      page: 1
    };
    dispatch(setFilters(newFilters));
  };
  
  // 重置搜索
  const handleReset = () => {
    searchForm.resetFields();
    dispatch(setFilters({
      page: 1,
      pageSize: 10
    }));
  };
  
  // 导出数据
  const handleExport = () => {
    dispatch(exportCommissionData(filters))
      .then(() => {
        message.success('导出成功，请查看下载文件');
      })
      .catch(() => {
        message.error('导出失败');
      });
  };
  
  // 计算分润
  const handleCalculate = () => {
    setCalculatorVisible(true);
  };
  
  // 配置分润规则
  const handleConfigureRules = () => {
    setRulesVisible(true);
  };
  
  // 配置等级
  const handleConfigureLevels = () => {
    setLevelConfigVisible(true);
  };
  
  // 获取分润类型标签颜色
  const getCommissionTypeColor = (type: CommissionType) => {
    switch (type) {
      case CommissionType.LEVEL_DIFF:
        return 'blue';
      case CommissionType.PEER_BONUS:
        return 'green';
      case CommissionType.UPGRADE_BONUS:
        return 'orange';
      default:
        return 'default';
    }
  };
  
  // 获取等级标签颜色
  const getLevelColor = (level: AgentLevel) => {
    const config = levelConfigs[level];
    return config?.color || '#8c8c8c';
  };
  
  // 获取等级名称
  const getLevelName = (level: AgentLevel) => {
    const config = levelConfigs[level];
    return config?.name || `等级${level}`;
  };
  
  // 表格列定义
  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 120,
      render: (id: string) => <Text code>{id.substring(0, 8)}...</Text>
    },
    {
      title: '收益接收人',
      dataIndex: 'userInfo',
      key: 'userInfo',
      render: (userInfo: any) => (
        <div>
          <div>{userInfo?.name}</div>
          <Tag color={getLevelColor(userInfo?.level)}>
            {getLevelName(userInfo?.level)}
          </Tag>
        </div>
      )
    },
    {
      title: '来源用户',
      dataIndex: 'fromUserInfo',
      key: 'fromUserInfo',
      render: (fromUserInfo: any) => (
        <div>
          <div>{fromUserInfo?.name}</div>
          <Tag color={getLevelColor(fromUserInfo?.level)}>
            {getLevelName(fromUserInfo?.level)}
          </Tag>
        </div>
      )
    },
    {
      title: '分润类型',
      dataIndex: 'commissionType',
      key: 'commissionType',
      render: (type: CommissionType) => {
        const typeNames = {
          [CommissionType.LEVEL_DIFF]: '级差利润',
          [CommissionType.PEER_BONUS]: '平级奖励',
          [CommissionType.UPGRADE_BONUS]: '升级奖励'
        };
        return (
          <Tag color={getCommissionTypeColor(type)}>
            {typeNames[type] || type}
          </Tag>
        );
      }
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => (
        <Text strong type="success">¥{amount.toFixed(2)}</Text>
      ),
      sorter: true
    },
    {
      title: '分润比例',
      dataIndex: 'commissionRate',
      key: 'commissionRate',
      render: (rate: number) => `${rate.toFixed(1)}%`
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true
    },
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleString()
    },
    {
      title: '订单信息',
      dataIndex: 'orderInfo',
      key: 'orderInfo',
      render: (orderInfo: any) => (
        orderInfo ? (
          <div>
            <div>订单号: {orderInfo.orderNo}</div>
            <div>商品: {orderInfo.productName}</div>
            <div>数量: {orderInfo.quantity}件</div>
          </div>
        ) : '-'
      )
    }
  ];
  
  // 准备图表数据
  const chartData = stats?.trend?.map(item => ({
    date: item.date.split('-').slice(1).join('-'), // 显示月-日
    amount: item.amount
  })) || [];
  
  const typeChartData = stats ? [
    { name: '级差利润', value: stats.byType.levelDiff, color: '#1890ff' },
    { name: '平级奖励', value: stats.byType.peerBonus, color: '#52c41a' },
    { name: '升级奖励', value: stats.byType.upgradeBonus, color: '#fa8c16' }
  ] : [];
  
  const levelChartData = stats ? [
    { name: '打版代言人', value: stats.byLevel.fromLevel2, color: '#52c41a' },
    { name: '代理商', value: stats.byLevel.fromLevel3, color: '#1890ff' },
    { name: '批发商', value: stats.byLevel.fromLevel4, color: '#fa8c16' },
    { name: '首席分公司', value: stats.byLevel.fromLevel5, color: '#f5222d' },
    { name: '集团事业部', value: stats.byLevel.fromLevel6, color: '#722ed1' }
  ] : [];
  
  return (
    <div style={{ padding: 24 }}>
      {/* 页面标题和操作按钮 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2}>收益管理</Title>
        <Space>
          <Button icon={<CalculatorOutlined />} onClick={handleCalculate}>
            分润计算器
          </Button>
          <Button icon={<SettingOutlined />} onClick={handleConfigureRules}>
            分润规则配置
          </Button>
          <Button icon={<SettingOutlined />} onClick={handleConfigureLevels}>
            等级配置
          </Button>
          <Button icon={<ExportOutlined />} onClick={handleExport} type="primary">
            导出数据
          </Button>
        </Space>
      </div>
      
      {/* 统计卡片 */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <CommissionStatsCard
              title="累计收益"
              value={stats.totalCommission}
              prefix="¥"
              icon={<DollarOutlined />}
              color="#1890ff"
              description="自系统启用以来"
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <CommissionStatsCard
              title="本月收益"
              value={stats.monthCommission}
              prefix="¥"
              icon={<RiseOutlined />}
              color="#52c41a"
              description="本月累计收益"
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <CommissionStatsCard
              title="今日收益"
              value={stats.todayCommission}
              prefix="¥"
              icon={<BarChartOutlined />}
              color="#fa8c16"
              description="今日累计收益"
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <CommissionStatsCard
              title="本年收益"
              value={stats.yearCommission}
              prefix="¥"
              icon={<PieChartOutlined />}
              color="#f5222d"
              description="本年度累计收益"
            />
          </Col>
        </Row>
      )}
      
      {/* 主标签页 */}
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          {/* 收益统计标签页 */}
          <TabPane tab="收益统计" key="stats">
            {stats && (
              <Row gutter={[24, 24]}>
                {/* 收益趋势图 */}
                <Col xs={24} lg={16}>
                  <Card title="收益趋势分析" size="small">
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`¥${value}`, '收益']} />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="amount" 
                          name="收益金额" 
                          stroke="#1890ff" 
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Card>
                </Col>
                
                {/* 分润类型分布 */}
                <Col xs={24} lg={8}>
                  <Card title="分润类型分布" size="small">
                    <ResponsiveContainer width="100%" height={300}>
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
                        <Tooltip formatter={(value) => [`¥${value}`, '金额']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </Card>
                </Col>
                
                {/* 等级贡献分布 */}
                <Col xs={24} lg={12}>
                  <Card title="等级贡献分布" size="small">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={levelChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`¥${value}`, '贡献金额']} />
                        <Bar dataKey="value" name="贡献金额">
                          {levelChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                </Col>
                
                {/* 顶级贡献者 */}
                <Col xs={24} lg={12}>
                  <Card title="顶级贡献者" size="small">
                    <Table
                      size="small"
                      dataSource={stats.topContributors}
                      pagination={false}
                      columns={[
                        {
                          title: '用户',
                          dataIndex: 'name',
                          key: 'name',
                          render: (name, record) => (
                            <div>
                              <div>{name}</div>
                              <Tag color={getLevelColor(record.level)}>
                                {getLevelName(record.level)}
                              </Tag>
                            </div>
                          )
                        },
                        {
                          title: '贡献总额',
                          dataIndex: 'totalContribution',
                          key: 'totalContribution',
                          render: (value) => <Text strong>¥{value.toFixed(2)}</Text>
                        },
                        {
                          title: '本月贡献',
                          dataIndex: 'monthContribution',
                          key: 'monthContribution',
                          render: (value) => <Text type="success">¥{value.toFixed(2)}</Text>
                        },
                        {
                          title: '订单数',
                          dataIndex: 'orderCount',
                          key: 'orderCount'
                        }
                      ]}
                    />
                  </Card>
                </Col>
              </Row>
            )}
          </TabPane>
          
          {/* 分润记录标签页 */}
          <TabPane tab="分润记录" key="records">
            {/* 搜索表单 */}
            <Card size="small" style={{ marginBottom: 16 }}>
              <Form
                form={searchForm}
                layout="inline"
                onFinish={handleSearch}
                initialValues={filters}
              >
                <Form.Item name="commissionType" label="分润类型">
                  <Select style={{ width: 120 }} allowClear>
                    <Option value="level_diff">级差利润</Option>
                    <Option value="peer_bonus">平级奖励</Option>
                    <Option value="upgrade_bonus">升级奖励</Option>
                  </Select>
                </Form.Item>
                
                <Form.Item name="userId" label="收益接收人">
                  <Input placeholder="用户ID" style={{ width: 150 }} />
                </Form.Item>
                
                <Form.Item name="fromUserId" label="来源用户">
                  <Input placeholder="用户ID" style={{ width: 150 }} />
                </Form.Item>
                
                <Form.Item name="dateRange" label="时间范围">
                  <RangePicker />
                </Form.Item>
                
                <Form.Item>
                  <Space>
                    <Button type="primary" htmlType="submit" loading={loading}>
                      搜索
                    </Button>
                    <Button onClick={handleReset}>
                      重置
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </Card>
            
            {/* 分润记录表格 */}
            <Table
              columns={columns}
              dataSource={records}
              rowKey="id"
              loading={loading}
              pagination={{
                current: pagination.page,
                pageSize: pagination.pageSize,
                total: pagination.total,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条记录`
              }}
              onChange={handleTableChange}
            />
          </TabPane>
          
          {/* 分润规则标签页 */}
          <TabPane tab="分润规则" key="rules">
            <Card title="当前分润规则配置" size="small">
              {commissionRules && (
                <Row gutter={[16, 16]}>
                  <Col span={8}>
                    <Statistic 
                      title="平级奖励比例" 
                      value={commissionRules.peerBonusRate * 100} 
                      suffix="%" 
                      valueStyle={{ color: '#52c41a' }}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic 
                      title="最小提现金额" 
                      value={commissionRules.minWithdrawalAmount} 
                      prefix="¥" 
                      valueStyle={{ color: '#1890ff' }}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic 
                      title="单日最大提现" 
                      value={commissionRules.maxDailyWithdrawal} 
                      prefix="¥" 
                      valueStyle={{ color: '#fa8c16' }}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic 
                      title="分润结算延迟" 
                      value={commissionRules.commissionSettlementDelay} 
                      suffix="天" 
                      valueStyle={{ color: '#722ed1' }}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic 
                      title="税率" 
                      value={commissionRules.taxRate * 100} 
                      suffix="%" 
                      valueStyle={{ color: '#f5222d' }}
                    />
                  </Col>
                  <Col span={8}>
                    <div style={{ textAlign: 'center', paddingTop: 32 }}>
                      <Tag color={commissionRules.autoUpgradeEnabled ? 'green' : 'red'}>
                        {commissionRules.autoUpgradeEnabled ? '自动升级已开启' : '自动升级已关闭'}
                      </Tag>
                    </div>
                  </Col>
                </Row>
              )}
              
              <div style={{ marginTop: 24, textAlign: 'center' }}>
                <Button type="primary" icon={<SettingOutlined />} onClick={handleConfigureRules}>
                  配置分润规则
                </Button>
              </div>
            </Card>
            
            {/* 等级配置表格 */}
            <Card title="代理商等级配置" size="small" style={{ marginTop: 16 }}>
              <Table
                dataSource={Object.values(levelConfigs)}
                rowKey="level"
                pagination={false}
                columns={[
                  {
                    title: '等级',
                    dataIndex: 'name',
                    key: 'name',
                    render: (name, record) => (
                      <Tag color={record.color} style={{ fontSize: '14px', padding: '4px 8px' }}>
                        {name}
                      </Tag>
                    )
                  },
                  {
                    title: '折扣',
                    dataIndex: 'discount',
                    key: 'discount',
                    render: (discount) => `${(discount * 100).toFixed(0)}%`
                  },
                  {
                    title: '首次充值门槛',
                    dataIndex: 'rechargeThreshold',
                    key: 'rechargeThreshold',
                    render: (value) => value > 0 ? `¥${value.toLocaleString()}` : '无门槛'
                  },
                  {
                    title: '配送货值',
                    dataIndex: 'cargoValue',
                    key: 'cargoValue',
                    render: (value) => value > 0 ? `¥${value.toLocaleString()}` : '-'
                  },
                  {
                    title: '操作',
                    key: 'action',
                    render: (_, record) => (
                      <Button type="link" size="small" onClick={handleConfigureLevels}>
                        编辑
                      </Button>
                    )
                  }
                ]}
              />
            </Card>
          </TabPane>
        </Tabs>
      </Card>
      
      {/* 分润计算器模态框 */}
      <CommissionCalculatorModal
        visible={calculatorVisible}
        onCancel={() => setCalculatorVisible(false)}
      />
      
      {/* 分润规则配置模态框 */}
      <CommissionRulesModal
        visible={rulesVisible}
        onCancel={() => setRulesVisible(false)}
        initialRules={commissionRules}
      />
      
      {/* 等级配置模态框 */}
      <LevelConfigModal
        visible={levelConfigVisible}
        onCancel={() => setLevelConfigVisible(false)}
        levelConfigs={levelConfigs}
      />
    </div>
  );
};

export default CommissionManagement;