/**
 * 皮肤分析管理中心
 * 
 * 功能模块：
 * 1. 皮肤问题库管理（CRUD）
 * 2. 成因话术库编辑
 * 3. 养护方案库编辑
 * 4. 产品匹配管理
 * 5. 数据统计面板
 * 6. 诊断报告查看
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Tag,
  Space,
  Tabs,
  Statistic,
  Row,
  Col,
  message,
  Popconfirm,
  Typography,
  Descriptions,
  Image,
  Tooltip,
  Empty,
  Spin,
  Divider,
  Badge,
  Alert
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ExperimentOutlined,
  MedicineBoxOutlined,
  SkinOutlined,
  ShoppingOutlined,
  BarChartOutlined,
  FileTextOutlined,
  LinkOutlined,
  CheckCircleOutlined,
  WarningOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

import {
  skinIssueApi,
  causeApi,
  carePlanApi,
  productMatchApi,
  reportApi,
  statsApi
} from '../api/skinAnalysisApi';
import './SkinAnalysisManagement.css';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

// 问题分类配置
const ISSUE_CATEGORIES = [
  { value: 'spot', label: '斑类', color: '#8B4513', icon: '🟤' },
  { value: 'acne', label: '痘类', color: '#e94560', icon: '🔴' },
  { value: 'skin_state', label: '肤质状态', color: '#00C896', icon: '🟢' },
];

// 养护方案类型
const CARE_PLAN_TYPES = [
  { value: 'cleaning', label: '清洁', icon: '🧹' },
  { value: 'moisturizing', label: '保湿', icon: '💧' },
  { value: 'repair', label: '修护', icon: '✨' },
  { value: 'sunscreen', label: '防晒', icon: '☀️' },
];

// ==================== 主组件 ====================
const SkinAnalysisManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('issues');
  const [loading, setLoading] = useState(false);
  
  // 统计数据
  const [stats, setStats] = useState<any>(null);

  // 加载统计数据
  useEffect(() => {
    statsApi.getOverview()
      .then((res: any) => {
        if (res.success) setStats(res.data);
      })
      .catch(() => {});
  }, []);

  // Tab项定义
  const tabItems = [
    {
      key: 'stats',
      label: (
        <span><BarChartOutlined /> 数据统计</span>
      ),
      children: <StatsPanel stats={stats} />
    },
    {
      key: 'reports',
      label: (
        <span><Badge count={0} size="small"><FileTextOutlined /></Badge> 诊断记录</span>
      ),
      children: <ReportsPanel />
    },
    {
      key: 'issues',
      label: (
        <span><SkinOutlined /> 问题库</span>
      ),
      children: <IssuesPanel />
    },
    {
      key: 'cares',
      label: (
        <span><MedicineBoxOutlined /> 养护方案</span>
      ),
      children: <CarePlansPanel />
    },
    {
      key: 'matches',
      label: (
        <span><LinkOutlined /> 产品匹配</span>
      ),
      children: <ProductMatchesPanel />
    },
  ];

  return (
    <div className="skin-analysis-mgmt">
      <div className="page-header">
        <div className="header-left">
          <div className="header-icon">
            <ExperimentOutlined style={{ fontSize: 28 }} />
          </div>
          <div>
            <Title level={3} style={{ margin: 0 }}>AI皮肤分析管理</Title>
            <Text type="secondary">玫小可 · 智能皮肤诊断系统</Text>
          </div>
        </div>
        <Alert
          type="info"
          showIcon
          banner={false}
          message="合规提示：本系统仅提供护肤层面建议，不涉及医疗诊断、疾病治疗、药品及医疗器械相关内容。"
          style={{ maxWidth: 500 }}
        />
      </div>

      {/* 统计卡片 */}
      {stats && (
        <Row gutter={16} className="stat-cards-row">
          <Col span={6}>
            <Card className="stat-card stat-card-primary">
              <Statistic title="总检测次数" value={stats.totalReports || 0} prefix={<ExperimentOutlined />} />
              <Text type="secondary" className="stat-sub">累计AI分析</Text>
            </Card>
          </Col>
          <Col span={6}>
            <Card className="stat-card stat-card-success">
              <Statistic title="今日检测" value={stats.todayReports || 0} prefix={<CheckCircleOutlined />} />
              <Text type="secondary" className="stat-sub">较昨日 +{stats.todayGrowth || 0}%</Text>
            </Card>
          </Col>
          <Col span={6}>
            <Card className="stat-card stat-card-warning">
              <Statistic title="问题种类" value={stats.issueTypes || 16} prefix={<SkinOutlined />} />
              <Text type="secondary" className="stat-sub">覆盖斑/痘/肤质</Text>
            </Card>
          </Col>
          <Col span={6}>
            <Card className="stat-card stat-card-info">
              <Statistic title="推荐产品" value={stats.productMatches || 0} prefix={<ShoppingOutlined />} />
              <Text type="secondary" className="stat-sub">已绑定商品</Text>
            </Card>
          </Col>
        </Row>
      )}

      <Card className="main-card" bordered={false}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          size="large"
          className="mgmt-tabs"
        />
      </Card>
    </div>
  );
};

// ==================== 1. 数据统计面板 ====================
const StatsPanel: React.FC<{ stats: any }> = ({ stats }) => {
  const [trendData, setTrendData] = useState<any[]>([]);
  const [issueDist, setIssueDist] = useState<any[]>([]);
  const [productRank, setProductRank] = useState<any[]>([]);
  const [trendPeriod, setTrendPeriod] = useState<'daily' | 'monthly' | 'yearly'>('daily');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAll();
  }, [trendPeriod]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [trendRes, issueRes, prodRes] = await Promise.all([
        statsApi.getTrend(trendPeriod),
        statsApi.getIssueDistribution(),
        statsApi.getProductRanking(10),
      ]);
      if ((trendRes as any).success) setTrendData((trendRes as any).data || []);
      if ((issueRes as any).success) setIssueDist((issueRes as any).data || []);
      if ((prodRes as any).success) setProductRank((prodRes as any).data || []);
    } catch (e) {}
    setLoading(false);
  };

  return (
    <Spin spinning={loading}>
      <Row gutter={[16, 16]}>
        {/* 问诊趋势 */}
        <Col span={14}>
          <Card title={
            <Space>
              <BarChartOutlined />
              <span>问诊趋势</span>
              <Select
                size="small"
                value={trendPeriod}
                onChange={(v: 'daily' | 'monthly' | 'yearly') => setTrendPeriod(v)}
                style={{ width: 90 }}
              >
                <Option value="daily">按日</Option>
                <Option value="monthly">按月</Option>
                <Option value="yearly">按年</Option>
              </Select>
            </Space>
          } size="small">
            {trendData.length > 0 ? (
              <div className="trend-list">
                {trendData.map((item: any) => (
                  <div key={item.date || item.period} className="trend-item">
                    <Text strong>{item.date || item.period}</Text>
                    <div style={{ flex: 1, margin: '0 12px' }}>
                      <div
                        className="trend-bar"
                        style={{
                          width: `${(item.count / Math.max(...trendData.map((d: any) => d.count))) * 100}%`
                        }}
                      />
                    </div>
                    <Text>{item.count}次</Text>
                  </div>
                ))}
              </div>
            ) : (
              <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
        </Col>

        {/* 问题分布 */}
        <Col span={10}>
          <Card title={<Space><SkinOutlined /> 问题类型分布</Space>} size="small">
            {issueDist.length > 0 ? (
              <div className="dist-list">
                {issueDist.map((item: any) => (
                  <div key={item.name} className="dist-item">
                    <Space style={{ width: '100%' }}>
                      <Tag color={
                        item.category === 'spot' ? 'orange' :
                        item.category === 'acne' ? 'red' : 'green'
                      }>{item.name}</Tag>
                      <Text type="secondary" style={{ fontSize: 12 }}>{item.category_label}</Text>
                      <Text strong style={{ marginLeft: 'auto' }}>{item.count}次</Text>
                    </Space>
                    <div className="dist-bar-wrap">
                      <div
                        className="dist-bar"
                        style={{ width: `${(item.count / (issueDist[0]?.count || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
        </Col>

        {/* 产品推荐排行 */}
        <Col span={24}>
          <Card title={<Space><ShoppingOutlined /> 产品推荐排行 TOP10</Space>} size="small">
            {productRank.length > 0 ? (
              <Table
                dataSource={productRank}
                rowKey="product_id"
                pagination={false}
                size="small"
                columns={[
                  { title: '排名', width: 60, render: (_, __, i) => (
                    <Tag color={i < 3 ? 'gold' : 'default'}>{i + 1}</Tag>
                  )},
                  { title: '产品名称', dataIndex: 'product_name', ellipsis: true },
                  { title: '推荐次数', dataIndex: 'recommend_count', sorter: (a, b) => a.recommend_count - b.recommend_count, defaultSortOrder: 'descend' },
                  { title: '关联问题数', dataIndex: 'issue_count' },
                ]}
              />
            ) : (
              <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
        </Col>
      </Row>
    </Spin>
  );
};

// ==================== 2. 诊断记录面板 ====================
const ReportsPanel: React.FC = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [detailModal, setDetailModal] = useState<{ visible: boolean; record: any }>({ visible: false, record: null });
  const [searchKeyword, setSearchKeyword] = useState('');

  useEffect(() => {
    loadReports();
  }, [pagination.current]);

  const loadReports = () => {
    setLoading(true);
    reportApi.getReports({
      page: pagination.current,
      pageSize: pagination.pageSize,
      ...(searchKeyword ? { keyword: searchKeyword } : {}),
    })
      .then((res: any) => {
        if (res.success) {
          setReports(res.data?.list || res.data || []);
          setPagination(prev => ({
            ...prev,
            total: res.data?.total || (res.data?.list?.length || 0)
          }));
        }
      })
      .finally(() => setLoading(false));
  };

  const columns: ColumnsType<any> = [
    {
      title: '报告ID',
      dataIndex: 'id',
      width: 70,
    },
    {
      title: '用户',
      dataIndex: 'user_name',
      width: 90,
      ellipsis: true,
    },
    {
      title: '检测结果',
      dataIndex: 'overall_result',
      width: 120,
      render: (text: string) => (
        <Tag color="processing">{text || '-'}</Tag>
      ),
    },
    {
      title: '肤质判定',
      dataIndex: 'skin_type',
      width: 80,
      render: (text: string) => {
        const map: Record<string, string> = {
          dry: '干性', oily: '油性', combination: '混合',
          sensitive: '敏感', neutral: '中性'
        };
        return <Tag color="blue">{map[text] || text || '-'}</Tag>;
      },
    },
    {
      title: '发现问题',
      dataIndex: 'issue_count',
      width: 80,
      align: 'center',
      render: (count: number) => (
        <Badge count={count} overflowCount={99} style={{ backgroundColor: '#e94560' }} />
      ),
    },
    {
      title: '检测时间',
      dataIndex: 'created_at',
      width: 160,
      render: (text: string) => text ? new Date(text).toLocaleString() : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          onClick={() => setDetailModal({ visible: true, record })}
        >
          查看详情
        </Button>
      ),
    },
  ];

  return (
    <>
      <div className="panel-toolbar">
        <Input.Search
          placeholder="搜索用户名/手机号"
          allowClear
          onSearch={(v) => { setSearchKeyword(v); loadReports(); }}
          style={{ width: 220 }}
          size="middle"
        />
      </div>

      <Table
        columns={columns}
        dataSource={reports}
        rowKey="id"
        loading={loading}
        scroll={{ x: 800 }}
        pagination={{
          ...pagination,
          showSizeChanger: false,
          onChange: (page) => setPagination(prev => ({ ...prev, current: page })),
        }}
        size="small"
      />

      {/* 报告详情弹窗 */}
      <Modal
        title={`诊断报告 #${detailModal.record?.id}`}
        open={detailModal.visible}
        onCancel={() => setDetailModal({ visible: false, record: null })}
        footer={null}
        width={600}
      >
        {detailModal.record && (
          <ReportDetailContent record={detailModal.record} />
        )}
      </Modal>
    </>
  );
};

// 报告详情内容
const ReportDetailContent: React.FC<{ record: any }> = ({ record }) => {
  const [detail, setDetail] = useState<any>(null);

  useEffect(() => {
    if (record.id) {
      reportApi.getReportDetail(record.id)
        .then((res: any) => {
          if (res.success) setDetail(res.data);
        });
    }
  }, [record.id]);

  if (!detail) return <Spin />;

  return (
    <div className="report-detail">
      <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
        <Descriptions.Item label="用户">{detail.user_name}</Descriptions.Item>
        <Descriptions.Item label="肤质">{detail.skin_type}</Descriptions.Item>
        <Descriptions.Item label="整体结果" span={2}>
          <Tag color="processing">{detail.overall_result}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="检测时间" span={2}>
          {new Date(detail.created_at).toLocaleString()}
        </Descriptions.Item>
      </Descriptions>

      {detail.image_url && (
        <div style={{ marginBottom: 16 }}>
          <Text strong>检测图片：</Text>
          <Image src={detail.image_url} width={200} style={{ marginTop: 8, borderRadius: 8 }} />
        </div>
      )}

      {/* 发现问题 */}
      {detail.issues && detail.issues.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Title level={5}>发现的问题</Title>
          {detail.issues.map((issue: any, i: number) => (
            <Card key={i} size="small" style={{ marginBottom: 8 }}>
              <Space>
                <Tag color={
                  issue.category === 'spot' ? 'orange' :
                  issue.category === 'acne' ? 'red' : 'green'
                }>
                  {issue.name}
                </Tag>
                <Text>严重程度：<Tag color={issue.severity >= 70 ? 'red' : issue.severity >= 40 ? 'orange' : 'green'}>{issue.severity}%</Tag></Text>
              </Space>
              {issue.cause_analysis && (
                <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0, fontSize: 13 }}>
                  <Text strong>原因：</Text>{issue.cause_analysis}
                </Paragraph>
              )}
              {issue.sales_script && (
                <Paragraph style={{ background: '#fffbe6', padding: 8, borderRadius: 6, marginTop: 8, marginBottom: 0, fontSize: 13 }}>
                  <Text strong>💬 推荐话术：</Text>{issue.sales_script}
                </Paragraph>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* 推荐产品 */}
      {detail.products && detail.products.length > 0 && (
        <div>
          <Title level={5}>推荐产品</Title>
          {detail.products.map((p: any, i: number) => (
            <div key={i} className="rec-product-item">
              <Text strong>{p.product_name}</Text>
              <Text type="secondary" style={{ marginLeft: 8 }}>{p.usage_method}</Text>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ==================== 3. 皮肤问题库面板 ====================
const IssuesPanel: React.FC = () => {
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingIssue, setEditingIssue] = useState<any>(null);
  const [form] = Form.useForm();
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  useEffect(() => {
    loadIssues();
  }, [categoryFilter]);

  const loadIssues = () => {
    setLoading(true);
    skinIssueApi.getIssues(categoryFilter ? { category: categoryFilter } : undefined)
      .then((res: any) => {
        if (res.success) setIssues(res.data || []);
      })
      .finally(() => setLoading(false));
  };

  const handleAdd = () => {
    setEditingIssue(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: any) => {
    setEditingIssue(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await skinIssueApi.deleteIssue(id);
      if ((res as any).success) {
        message.success('删除成功');
        loadIssues();
      }
    } catch (e: any) {
      message.error(e.response?.data?.message || '删除失败');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      let res;
      if (editingIssue) {
        res = await skinIssueApi.updateIssue(editingIssue.id, values);
      } else {
        res = await skinIssueApi.createIssue(values);
      }
      if ((res as any).success) {
        message.success(editingIssue ? '更新成功' : '创建成功');
        setModalVisible(false);
        loadIssues();
      }
    } catch (e) {}
  };

  const columns: ColumnsType<any> = [
    {
      title: '图标',
      dataIndex: 'icon',
      width: 50,
      render: (text: string) => <span style={{ fontSize: 20 }}>{text}</span>,
    },
    { title: '问题名称', dataIndex: 'name', width: 120 },
    {
      title: '分类',
      dataIndex: 'category',
      width: 80,
      render: (cat: string) => {
        const found = ISSUE_CATEGORIES.find(c => c.value === cat);
        return found ? <Tag color={found.color as any}>{found.icon} {found.label}</Tag> : cat;
      },
    },
    { title: '描述', dataIndex: 'description', ellipsis: true },
    { title: '排序', dataIndex: 'sort_order', width: 60, align: 'center' },
    {
      title: '操作',
      key: 'action',
      width: 140,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
          <Popconfirm title="确定删除此问题？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div className="panel-toolbar">
        <Space>
          <Select
            placeholder="筛选分类"
            allowClear
            value={categoryFilter || undefined}
            onChange={setCategoryFilter}
            style={{ width: 130 }}
            size="middle"
          >
            {ISSUE_CATEGORIES.map(c => (
              <Option key={c.value} value={c.value}>{c.icon} {c.label}</Option>
            ))}
          </Select>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增问题</Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={issues}
        rowKey="id"
        loading={loading}
        pagination={false}
        size="small"
      />

      <Modal
        title={editingIssue ? '编辑皮肤问题' : '新增皮肤问题'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        okText={editingIssue ? '更新' : '创建'}
        width={520}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 20 }}>
          <Form.Item name="name" label="问题名称" rules={[{ required: true, message: '请输入问题名称' }]}>
            <Input placeholder="如：雀斑、闭口等" />
          </Form.Item>
          <Form.Item name="category" label="问题分类" rules={[{ required: true }]}>
            <Select placeholder="选择分类">
              {ISSUE_CATEGORIES.map(c => (
                <Option key={c.value} value={c.value}>{c.icon} {c.label}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="description" label="问题描述">
            <TextArea rows={3} placeholder="详细描述该问题的特征和表现" />
          </Form.Item>
          <Form.Item name="icon" label="图标Emoji">
            <Input placeholder="如 🟤 🔴 🟢 等" maxLength={4} />
          </Form.Item>
          <Form.Item name="sort_order" label="排序值" initialValue={0}>
            <Input type="number" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

// ==================== 4. 养护方案面板 ====================
const CarePlansPanel: React.FC = () => {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = () => {
    setLoading(true);
    carePlanApi.getCarePlans()
      .then((res: any) => {
        if (res.success) setPlans(res.data || []);
      })
      .finally(() => setLoading(false));
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const res = editingPlan
        ? await carePlanApi.saveCarePlan({ ...values, id: editingPlan.id })
        : await carePlanApi.saveCarePlan(values);
      if ((res as any).success) {
        message.success(editingPlan ? '更新成功' : '创建成功');
        setModalVisible(false);
        loadPlans();
      }
    } catch (e) {}
  };

  const handleDelete = async (id: number) => {
    await carePlanApi.deleteCarePlan(id);
    message.success('删除成功');
    loadPlans();
  };

  return (
    <>
      <div className="panel-toolbar">
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingPlan(null); form.resetFields(); setModalVisible(true); }}>
          新增方案
        </Button>
      </div>

      <Row gutter={[16, 16]}>
        {plans.map(plan => (
          <Col key={plan.id} xs={24} sm={12} lg={8}>
            <Card
              size="small"
              className="care-plan-card"
              actions={[
                <EditOutlined key="edit" onClick={() => { setEditingPlan(plan); form.setFieldsValue(plan); setModalVisible(true); }} />,
                <Popconfirm title="确定删除？" onConfirm={() => handleDelete(plan.id)}>
                  <DeleteOutlined key="del" style={{ color: '#ff4d4f' }} />
                </Popconfirm>,
              ]}
            >
              <div className="card-header-row">
                <span className="card-type-icon">
                  {CARE_PLAN_TYPES.find(t => t.value === plan.plan_type)?.icon || '💊'}
                </span>
                <Tag color="blue">{CARE_PLAN_TYPES.find(t => t.value === plan.plan_type)?.label || plan.plan_type}</Tag>
              </div>
              <Title level={5} style={{ marginTop: 8 }}>{plan.title}</Title>
              <Paragraph type="secondary" ellipsis={{ rows: 2 }} className="card-desc">
                {plan.content}
              </Paragraph>
              {plan.frequency && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  频率：{plan.frequency} | 周期：{plan.duration || '-'}
                </Text>
              )}
            </Card>
          </Col>
        ))}
        {!loading && plans.length === 0 && (
          <Col span={24}><Empty description="暂无养护方案，点击新增按钮添加" /></Col>
        )}
      </Row>

      <Modal
        title={editingPlan ? '编辑养护方案' : '新增养护方案'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={560}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="title" label="方案标题" rules={[{ required: true }]}>
            <Input placeholder="如：温和清洁护理方案" />
          </Form.Item>
          <Form.Item name="plan_type" label="方案类型" rules={[{ required: true }]}>
            <Select placeholder="选择类型">
              {CARE_PLAN_TYPES.map(t => (
                <Option key={t.value} value={t.value}>{t.icon} {t.label}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="content" label="方案描述">
            <TextArea rows={3} placeholder="详细描述该方案的原理和效果" />
          </Form.Item>
          <Form.Item name="steps" label="具体步骤">
            <TextArea rows={4} placeholder="每行一个步骤，如&#10;1. 使用洁面乳轻柔按摩&#10;2. 温水冲洗30秒" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="frequency" label="使用频率">
                <Input placeholder="如：每日早晚" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="duration" label="建议周期">
                <Input placeholder="如：持续28天" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </>
  );
};

// ==================== 5. 产品匹配面板 ====================
const ProductMatchesPanel: React.FC = () => {
  const [matches, setMatches] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [bindModalOpen, setBindModalOpen] = useState(false);
  const [selectedIssueId, setSelectedIssueId] = useState<number | undefined>();
  const [form] = Form.useForm();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [mRes, pRes, iRes] = await Promise.all([
        productMatchApi.getProductMatches(),
        productMatchApi.getAvailableProducts(),
        skinIssueApi.getIssues(),
      ]);
      if ((mRes as any).success) setMatches(mRes.data || []);
      if ((pRes as any).success) setProducts(pRes.data || []);
      if ((iRes as any).success) setIssues(iRes.data || []);
    } catch (e) {}
    setLoading(false);
  };

  const handleBind = async () => {
    try {
      const values = await form.validateFields();
      const res = await productMatchApi.bindProduct(values);
      if ((res as any).success) {
        message.success('绑定成功');
        setBindModalOpen(false);
        form.resetFields();
        setSelectedIssueId(undefined);
        loadData();
      }
    } catch (e) {}
  };

  const columns: ColumnsType<any> = [
    {
      title: '皮肤问题',
      dataIndex: 'issue_name',
      width: 110,
      render: (name: string, rec: any) => (
        <Tag color={rec.issue_category === 'spot' ? 'orange' : rec.issue_category === 'acne' ? 'red' : 'green'}>
          {name}
        </Tag>
      ),
    },
    { title: '匹配产品', dataIndex: 'product_name', width: 150, ellipsis: true },
    { title: '推荐理由', dataIndex: 'recommend_reason', ellipsis: true },
    { title: '用法', dataIndex: 'usage_method', width: 150, ellipsis: true },
    {
      title: '操作',
      width: 80,
      render: (_, record) => (
        <Popconfirm title="确定解绑？" onConfirm={async () => {
          await productMatchApi.unbindProduct(record.id);
          message.success('已解绑');
          loadData();
        }}>
          <Button type="link" danger size="small">解绑</Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <>
      <div className="panel-toolbar">
        <Button type="primary" icon={<LinkOutlined />} onClick={() => setBindModalOpen(true)}>
          新增匹配
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={matches}
        rowKey="id"
        loading={loading}
        pagination={false}
        size="small"
      />

      <Modal
        title="绑定产品到皮肤问题"
        open={bindModalOpen}
        onOk={handleBind}
        onCancel={() => { setBindModalOpen(false); form.resetFields(); }}
        width={520}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="issue_id" label="选择皮肤问题" rules={[{ required: true }]}>
            <Select
              placeholder="选择要关联的皮肤问题"
              showSearch
              optionFilterProp="children"
              onChange={(v) => setSelectedIssueId(v)}
            >
              {issues.map(issue => (
                <Option key={issue.id} value={issue.id}>
                  {issue.icon} {issue.name} ({ISSUE_CATEGORIES.find(c => c.value === issue.category)?.label})
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="product_id" label="选择商品" rules={[{ required: true }]}>
            <Select
              placeholder="从库存中选择商品"
              showSearch
              optionFilterProp="children"
              notFoundContent="暂无商品"
            >
              {products.map(p => (
                <Option key={p.id} value={p.id}>{p.name} ¥{p.price}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="recommend_reason" label="推荐理由" rules={[{ required: true }]}>
            <TextArea rows={2} placeholder="为什么这个产品适合这个问题？" />
          </Form.Item>
          <Form.Item name="usage_method" label="使用方法">
            <TextArea rows={2} placeholder="建议的使用方法和频率" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default SkinAnalysisManagement;
