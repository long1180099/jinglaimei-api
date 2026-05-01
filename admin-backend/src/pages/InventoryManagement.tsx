/**
 * 库存管理页面
 * 功能: 入库/出库/商品列表/数据报表/详情
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Space, Input, Select, message, Modal,
  Form, InputNumber, Tag, Statistic, Row, Col, Tabs, Badge,
  Tooltip, Popconfirm, Typography, Empty, Spin, Divider
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined, MinusCircleOutlined, SearchOutlined, BarChartOutlined,
  InboxOutlined, ExportOutlined, AlertOutlined, ReloadOutlined,
  StockOutlined, LineChartOutlined, PieChartOutlined, GiftOutlined, TeamOutlined
} from '@ant-design/icons';
import { inventoryApi } from '../services/dbApi';
import { dbProductApi } from '../services/dbProductApi';
import type { Product } from '../types/product';
import type {
  InventoryStock, InventoryRecord, InventoryStats,
  ReportItem, TopProduct, StockInForm, StockOutForm,
  SpecialOutForm, MemberOption
} from '../types/inventory';

const { Text } = Typography;
const { Option } = Select;

// ==================== 统计卡片 ====================
const StatCards: React.FC<{ stats: Partial<InventoryStats>; loading: boolean }> = ({ stats, loading }) => (
  <Row gutter={[16, 16]}>
    <Col xs={24} sm={12} lg={6}>
      <Card size="small" className="stat-card-inv" style={{ borderTop: '3px solid #1890ff' }}>
        <Statistic title="商品种类" value={stats.totalProducts || 0} suffix="种"
          prefix={<InboxOutlined />} valueStyle={{ color: '#1890ff', fontSize: 22 }} />
      </Card>
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <Card size="small" className="stat-card-inv" style={{ borderTop: '3px solid #52c41a' }}>
        <Statistic title="总库存量" value={stats.totalQuantity || 0}
          prefix={<StockOutlined />} valueStyle={{ color: '#52c41a', fontSize: 22 }} />
      </Card>
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <Card size="small" className="stat-card-inv" style={{ borderTop: '3px solid #faad14' }}>
        <Statistic title="总成本金额" value={(stats.totalCost || 0).toFixed(2)} prefix="¥"
          valueStyle={{ color: '#faad14', fontSize: 20 }} />
      </Card>
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <Card size="small" className="stat-card-inv" style={{ borderTop: '3px solid #e94560' }}>
        <Statistic title="库存预警" value={stats.lowStockCount || 0}
          prefix={<AlertOutlined />} valueStyle={{ color: '#e94560', fontSize: 22 }}
          suffix={
            <>
              项
              {(stats.lowStockCount || 0) > 0 && (
                <Tag color="red" style={{ marginLeft: 8 }}>需关注</Tag>
              )}
            </>
          }
        />
      </Card>
    </Col>
  </Row>
);

// ==================== 今日/本月快捷统计 ====================
const QuickStats: React.FC<{ stats: Partial<InventoryStats> }> = ({ stats }) => (
  <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
    <Col span={8}>
      <Card size="small" style={{ background: 'linear-gradient(135deg,#e6f7ff 0%,#bae7ff 100%)' }}>
        <Text type="secondary">今日入库</Text><br/>
        <Text strong style={{ fontSize: 18 }}>{stats.todayInQty || 0}</Text>
        <Text type="secondary" style={{ marginLeft: 10 }}>件</Text>
        <br/><Text type="secondary">¥{(stats.todayInCost || 0).toFixed(2)}</Text>
      </Card>
    </Col>
    <Col span={8}>
      <Card size="small" style={{ background: 'linear-gradient(135deg,#f6ffed 0%,#d9f7be 100%)' }}>
        <Text type="secondary">本月入库</Text><br/>
        <Text strong style={{ fontSize: 18 }}>{stats.monthInQty || 0}</Text>
        <Text type="secondary" style={{ marginLeft: 10 }}>件</Text>
        <br/><Text type="secondary">¥{(stats.monthInCost || 0).toFixed(2)}</Text>
      </Card>
    </Col>
    <Col span={8}>
      <Card size="small" style={{ background: 'linear-gradient(135deg,#fff1f0 0%,#ffccc7 100%)' }}>
        <Text type="secondary">本月出库</Text><br/>
        <Text strong style={{ fontSize: 18 }}>{stats.monthOutQty || 0}</Text>
        <Text type="secondary" style={{ marginLeft: 10 }}>件</Text>
      </Card>
    </Col>
  </Row>
);

// ==================== 主页面 ====================
const InventoryManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('list');
  const [loading, setLoading] = useState(false);
  const [stockList, setStockList] = useState<InventoryStock[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<Partial<InventoryStats>>({});
  const [reportData, setReportData] = useState<{ data: ReportItem[]; top5: TopProduct[]; type: string }>({ data: [], top5: [], type: 'month' });

  // 筛选状态
  const [filters, setFilters] = useState({ keyword: '', category: '', status: '' });
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [categories, setCategories] = useState<string[]>([]);

  // 弹窗状态
  const [stockInModalOpen, setStockInModalOpen] = useState(false);
  const [stockOutModalOpen, setStockOutModalOpen] = useState(false);
  // 特供出货状态
  const [memberOptions, setMemberOptions] = useState<MemberOption[]>([]);
  const [memberSearching, setMemberSearching] = useState(false);

  // 详情弹窗
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailStock, setDetailStock] = useState<InventoryStock | null>(null);
  const [detailRecords, setDetailRecords] = useState<InventoryRecord[]>([]);
  const [detailTotal, setDetailTotal] = useState(0);
  // 商品管理列表（用于入库下拉选择）
  const [productOptions, setProductOptions] = useState<{id: string; name: string; code: string}[]>([]);

  // 表单实例
  const [stockInForm] = Form.useForm();
  const [stockOutForm] = Form.useForm();
  const [specialOutForm] = Form.useForm();

  // ========== 数据加载 ==========

  // 加载统计数据
  const loadStats = useCallback(async () => {
    try {
      const s = await inventoryApi.getStats();
      setStats(s || {});
    } catch (e) { /* ignore */ }
  }, []);

  // 加载商品列表
  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await inventoryApi.getList({
        page: pagination.current,
        pageSize: pagination.pageSize,
        ...filters,
      });
      setStockList(res.list || []);
      setTotal(res.total || 0);
      if (res.overview) {
        setStats(prev => ({ ...prev, ...res.overview }));
      }
    } catch (e: any) {
      message.error('加载库存列表失败');
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize, filters]);

  // 加载分类
  const loadCategories = useCallback(async () => {
    try {
      const cats: any = await inventoryApi.getCategories();
      setCategories((cats || []).map((c: any) => c.category));
    } catch (e) { /* ignore */ }
  }, []);

  // 加载报表数据
  const loadReport = async (type: string = 'month') => {
    try {
      const data = await inventoryApi.getReport(type as any);
      setReportData(data || { data: [], top5: [], type });
    } catch (e: any) {
      message.error('加载报表失败');
    }
  };

  // 加载详情
  const loadDetail = async (id: number) => {
    try {
      const detail: any = await inventoryApi.getDetail(id);
      setDetailStock(detail as InventoryStock);
      setDetailRecords(detail.records || []);
      setDetailTotal(detail.total || 0);
      setDetailVisible(true);
    } catch (e: any) {
      message.error('加载详情失败');
    }
  };

  // 加载商品管理列表（入库下拉用）
  const loadProductOptions = useCallback(async () => {
    try {
      const res = await dbProductApi.getProducts({ page: 1, pageSize: 1000 });
      if (res && res.products) {
        setProductOptions(res.products.map((p: Product) => ({
          id: p.id,
          name: p.name,
          code: p.sku || ''
        })));
      }
    } catch (e) { /* 静默 */ }
  }, []);

  useEffect(() => {
    loadCategories();
    loadStats();
    loadProductOptions();
  }, [loadCategories, loadStats, loadProductOptions]);

  useEffect(() => {
    if (activeTab === 'list') loadList();
    else if (activeTab === 'report') loadReport('month');
  }, [activeTab, loadList]);

  // ========== 入库操作 ==========
  const handleStockIn = async (values: StockInForm) => {
    try {
      await inventoryApi.stockIn(values);
      message.success('✅ 入库成功！');
      stockInForm.resetFields();
      setStockInModalOpen(false);
      loadList();
      loadStats();
    } catch (e: any) {
      message.error(e.message || '入库失败');
    }
  };

  // ========== 出库操作 ==========
  const handleStockOut = async (values: StockOutForm) => {
    if (!values.stock_id) return message.error('请选择商品');
    try {
      await inventoryApi.stockOut(values);
      message.success('✅ 出库成功！');
      stockOutForm.resetFields();
      setStockOutModalOpen(false);
      loadList();
      loadStats();
    } catch (e: any) {
      message.error(e.message || '出库失败');
    }
  };

  // ========== 特供出货操作 ==========
  const handleSearchMembers = async (keyword: string) => {
    if (!keyword || keyword.trim().length < 1) {
      setMemberOptions([]);
      return;
    }
    setMemberSearching(true);
    try {
      const res: any = await inventoryApi.searchMembers(keyword);
      setMemberOptions(res || []);
    } catch (e) {
      setMemberOptions([]);
    } finally {
      setMemberSearching(false);
    }
  };

  const handleSpecialOut = async (values: SpecialOutForm) => {
    if (!values.stock_id) return message.error('请选择出库商品');
    if (!values.member_id) return message.error('请搜索并选择领取会员');
    try {
      await inventoryApi.specialOut(values);
      message.success('✅ 特供出货成功！');
      specialOutForm.resetFields();
      setMemberOptions([]);
      loadList();
      loadStats();
    } catch (e: any) {
      message.error(e.message || '特供出货失败');
    }
  };

  // ========== 删除操作 ==========
  const handleDelete = async (id: number) => {
    try {
      await inventoryApi.delete(id);
      message.success('删除成功');
      loadList();
      loadStats();
    } catch (e: any) {
      message.error(e.message || '删除失败');
    }
  };

  // ========== 表格列定义 ==========
  const columns: ColumnsType<InventoryStock> = [
    {
      title: '商品名称', dataIndex: 'product_name', width: 180,
      render: (name: string, record) => (
        <a onClick={() => loadDetail(record.id)}>
          <strong>{name}</strong>
          {record.quantity <= record.min_alert && (
            <Tag color="red" style={{ marginLeft: 6 }} icon={<AlertOutlined />}>低库存</Tag>
          )}
        </a>
      ),
    },
    { title: '编码', dataIndex: 'product_code', width: 120, ellipsis: true },
    {
      title: '分类', dataIndex: 'category', width: 90,
      render: (cat: string) => <Tag color="blue">{cat}</Tag>,
    },
    {
      title: '当前库存', dataIndex: 'quantity', width: 100, sorter: (a, b) => a.quantity - b.quantity,
      render: (qty: number, record) => (
        <Text strong style={{
          color: qty <= record.min_alert ? '#e94560' : qty > 50 ? '#52c41a' : '#1890ff',
          fontSize: 15
        }}>
          {qty} <Text type="secondary">{record.unit}</Text>
        </Text>
      ),
    },
    { title: '累计入库', dataIndex: 'total_in', width: 80 },
    { title: '累计出库', dataIndex: 'total_out', width: 80 },
    {
      title: '平均成本', dataIndex: 'avg_cost', width: 90,
      render: (v: number) => v ? `¥${v.toFixed(2)}` : '-',
    },
    { title: '总成本', dataIndex: 'total_cost', width: 110,
      render: (v: number) => `¥${(v || 0).toFixed(2)}` },
    { title: '总运费', dataIndex: 'total_freight', width: 110,
      render: (v: number) => `¥${(v || 0).toFixed(2)}` },
    {
      title: '状态', dataIndex: 'status', width: 70,
      render: (s: number) => s === 1
        ? <Tag color="success">正常</Tag>
        : <Tag color="default">停用</Tag>,
    },
    {
      title: '操作', width: 140, fixed: 'right' as const,
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => loadDetail(record.id)}>明细</Button>
          <Popconfirm title="确认删除该商品及所有出入库记录？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 详情记录列
  const recordColumns: ColumnsType<InventoryRecord> = [
    {
      title: '类型', dataIndex: 'record_type', width: 70,
      render: (type: string) => type === 'in'
        ? <Tag color="green" icon={<PlusOutlined />}>入库</Tag>
        : type === 'out'
          ? <Tag color="red" icon={<MinusCircleOutlined />}>出库</Tag>
          : <Tag color="orange">调整</Tag>,
    },
    { title: '数量', dataIndex: 'quantity', width: 80,
      render: (q: number, r) => (
        <Text strong style={{ color: r.record_type === 'in' ? '#52c41a' : '#e94560' }}>
          {r.record_type === 'out' ? '-' : '+'}{q}
        </Text>
      )
    },
    { title: '单价成本', dataIndex: 'unit_cost', width: 90,
      render: (v: number) => v ? `¥${v.toFixed(2)}` : '-' },
    { title: '本次成本', dataIndex: 'cost_total', width: 100,
      render: (v: number) => `¥${(v || 0).toFixed(2)}` },
    { title: '运费', dataIndex: 'freight', width: 80,
      render: (v: number) => `¥${(v || 0).toFixed(2)}` },
    { title: '变动前', dataIndex: 'stock_before', width: 70 },
    { title: '变动后', dataIndex: 'stock_after', width: 70 },
    { title: '操作人', dataIndex: 'operator', width: 80 },
    { title: '供应商', dataIndex: 'supplier', width: 90, ellipsis: true },
    { title: '备注', dataIndex: 'remark', ellipsis: true },
    { title: '时间', dataIndex: 'created_at', width: 160,
      render: (t: string) => t?.replace('T', ' ') },
  ];

  // 报表渲染辅助
  const renderBarChart = (data: ReportItem[]) => {
    const maxVal = Math.max(...data.map(d => Math.max(d.inQty, d.outQty || 0)), 1);
    return (
      <div style={{ padding: 16 }}>
        {data.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ width: 60, textAlign: 'right', marginRight: 8, fontSize: 13, flexShrink: 0 }}>
              {item.label}
            </span>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4, height: 28 }}>
              {/* 入库条 */}
              <div style={{
                height: item.inQty > 0 ? 22 : 0,
                width: `${(item.inQty / maxVal) * 100}%`,
                background: 'linear-gradient(90deg, #52c41a, #73d13d)',
                borderRadius: 3, minWidth: item.inQty > 0 ? 30 : 0,
                display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                paddingRight: 4, color: '#fff', fontSize: 11, transition: 'width 0.5s'
              }}>
                {item.inQty > maxVal * 0.08 && item.inQty}
              </div>
              {/* 出库条 */}
              {item.outQty > 0 && (
                <div style={{
                  height: 22, width: `${(item.outQty / maxVal) * 100}%`,
                  background: 'linear-gradient(90deg, #e94560, #ff7875)',
                  borderRadius: 3, minWidth: 25,
                  display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                  paddingRight: 4, color: '#fff', fontSize: 11
                }}>
                  {item.outQty > maxVal * 0.05 && item.outQty}
                </div>
              )}
            </div>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 20, marginTop: 12, justifyContent: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 14, height: 14, borderRadius: 2, background: '#52c41a' }} /> 入库
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 14, height: 14, borderRadius: 2, background: '#e94560' }} /> 出库
          </span>
        </div>
      </div>
    );
  };

  // ==================== 渲染 ====================
  return (
    <div className="inventory-management">
      {/* 头部 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>
            <InboxOutlined style={{ marginRight: 8, color: '#1890ff' }} />
            库存管理
          </h2>
          <Text type="secondary" style={{ marginLeft: 32, fontSize: 13 }}>
            入库 / 出库 / 库存监控 / 数据报表
          </Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => { loadList(); loadStats(); }}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />}
            onClick={() => setStockInModalOpen(true)}
            style={{ background: '#1890ff' }}
          >
            入库登记
          </Button>
          <Button icon={<MinusCircleOutlined />}
            onClick={() => setStockOutModalOpen(true)}
            style={{ borderColor: '#e94560', color: '#e94560' }}
          >
            出库登记
          </Button>
        </Space>
      </div>

      {/* 统计卡片 + 快捷统计 */}
      <StatCards stats={stats} loading={loading} />
      {(stats.todayInQty !== undefined) && <QuickStats stats={stats} />}

      <Divider style={{ margin: '16px 0' }} />

      {/* Tab切换 */}
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key)}
        items={[
          {
            key: 'list',
            label: <span><StockOutlined /> 商品库存 ({total})</span>,
            children: (
              <>
                {/* 搜索栏 */}
                <Card size="small" style={{ marginBottom: 16, padding: '8px 16px' }}>
                  <Space wrap>
                    <Input
                      placeholder="搜索商品名/编码..."
                      prefix={<SearchOutlined />}
                      allowClear
                      style={{ width: 220 }}
                      value={filters.keyword}
                      onChange={e => setFilters(f => ({ ...f, keyword: e.target.value }))}
                      onPressEnter={() => { setPagination(p => ({ ...p, current: 1 })); loadList(); }}
                    />
                    <Select
                      placeholder="全部分类"
                      allowClear
                      style={{ width: 130 }}
                      value={filters.category || undefined}
                      onChange={v => { setFilters(f => ({ ...f, category: v || '' })); setPagination(p => ({ ...p, current: 1 })); loadList(); }}
                    >
                      {categories.map(c => <Option key={c} value={c}>{c}</Option>)}
                    </Select>
                    <Select
                      placeholder="全部状态"
                      allowClear
                      style={{ width: 100 }}
                      value={filters.status !== '' ? filters.status : undefined}
                      onChange={v => { setFilters(f => ({ ...f, status: v ?? '' })); setPagination(p => ({ ...p, current: 1 })); loadList(); }}
                    >
                      <Option value={1}>正常</Option>
                      <Option value={0}>停用</Option>
                    </Select>
                    <Button type="primary" icon={<SearchOutlined />} onClick={() => { setPagination(p => ({ ...p, current: 1 })); loadList(); }}>
                      搜索
                    </Button>
                    <Button onClick={() => { setFilters({ keyword: '', category: '', status: '' }); setPagination(p => ({ ...p, current: 1 })); setTimeout(loadList, 0); }}>
                      重置
                    </Button>
                  </Space>
                </Card>

                {/* 商品表格 */}
                <Table
                  rowKey="id"
                  columns={columns}
                  dataSource={stockList}
                  loading={loading}
                  scroll={{ x: 1300 }}
                  pagination={{
                    total,
                    current: pagination.current,
                    pageSize: pagination.pageSize,
                    showSizeChanger: true,
                    showTotal: t => `共 ${t} 种商品`,
                    onChange: (page, size) => {
                      setPagination({ current: page, pageSize: size });
                    },
                    pageSizeOptions: ['10', '20', '50'],
                  }}
                  size="middle"
                />
              </>
            ),
          },
          {
            key: 'report',
            label: <span><BarChartOutlined /> 数据报表</span>,
            children: (
              <div>
                <Space style={{ marginBottom: 16 }}>
                  <Text strong>时间维度：</Text>
                  <Select
                    defaultValue="month"
                    style={{ width: 100 }}
                    onChange={loadReport}
                  >
                    <Option value="day">按日</Option>
                    <Option value="month">按月</Option>
                    <Option value="year">按年</Option>
                  </Select>
                  <Text type="secondary">（{reportData.type === 'day' ? '每日' : reportData.type === 'year' ? '每年' : '每月'}汇总）</Text>
                </Space>

                <Row gutter={20}>
                  {/* 柱状图区域 */}
                  <Col xs={24} lg={16}>
                    <Card
                      title={<span><LineChartOutlined style={{ marginRight: 6 }}/>出入库趋势</span>}
                      extra={<Tag color="processing">{reportData.data.length} 条数据</Tag>}
                    >
                      {reportData.data.length > 0
                        ? renderBarChart(reportData.data)
                        : <Empty description="暂无数据，请先进行入库操作" />
                      }
                    </Card>
                  </Col>

                  {/* TOP5排行 */}
                  <Col xs={24} lg={8}>
                    <Card
                      title={<span><PieChartOutlined style={{ marginRight: 6 }}/>TOP5 商品</span>}
                      size="small"
                    >
                      {reportData.top5.length > 0
                        ? reportData.top5.map((item, i) => (
                            <div key={i} style={{
                              display: 'flex', justifyContent: 'space-between',
                              padding: '8px 0', borderBottom: i < reportData.top5.length - 1 ? '1px solid #f0f0f0' : 'none'
                            }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Badge count={i + 1}
                                  style={{
                                    backgroundColor: ['#ffd700', '#c0c0c0', '#cd7f32', '#108ee9', '#87d068'][i],
                                    fontSize: 11, lineHeight: '16px'
                                  }}
                                />
                                <Text ellipsis style={{ maxWidth: 130 }}>{item.product_name}</Text>
                              </span>
                              <span>
                                <Text strong style={{ color: '#52c41a' }}>{item.totalIn}</Text>
                                <Text type="secondary">入</Text>
                                <Text type="danger" style={{ marginLeft: 6 }}>{item.totalOut}</Text>
                                <Text type="secondary">出</Text>
                              </span>
                            </div>
                          ))
                        : <Empty description="暂无排行数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                      }

                      {/* 汇总信息 */}
                      <Divider style={{ margin: '12px 0' }} />
                      <Row gutter={12}>
                        <Col span={12}>
                          <Statistic title="总入库" value={reportData.top5.reduce((s, t) => s + t.totalIn, 0)}
                            valueStyle={{ fontSize: 16, color: '#52c41a' }} />
                        </Col>
                        <Col span={12}>
                          <Statistic title="总成本" value={reportData.top5.reduce((s, t) => s + t.totalCost, 0)}
                            precision={2} prefix="¥" valueStyle={{ fontSize: 16, color: '#faad14' }} />
                        </Col>
                      </Row>
                    </Card>
                  </Col>
                </Row>

                {/* 明细表 */}
                <Card
                  title="详细数据"
                  style={{ marginTop: 16 }}
                  size="small"
                >
                  <Table
                    rowKey="label"
                    dataSource={reportData.data.map((d, i) => ({
                      ...d,
                      key: d.label,
                      inCostDisplay: `¥${d.inCost.toFixed(2)}`,
                      freightDisplay: `¥${d.inFreight.toFixed(2)}`,
                    }))}
                    size="small"
                    pagination={false}
                    scroll={{ x: 600 }}
                    columns={[
                      { title: '时间', dataIndex: 'label', width: 100 },
                      { title: '入库数量', dataIndex: 'inQty', align: 'right' as const,
                        render: (v: number) => <Text strong style={{ color: '#52c41a' }}>{v}</Text> },
                      { title: '出库数量', dataIndex: 'outQty', align: 'right' as const,
                        render: (v: number) => v ? <Text type="danger">{v}</Text> : '-' },
                      { title: '入库成本', dataIndex: 'inCostDisplay', align: 'right' as const },
                      { title: '运费', dataIndex: 'freightDisplay', align: 'right' as const },
                      { title: '记录数', dataIndex: 'recordCount', align: 'right' as const, width: 70 },
                    ]}
                  />
                </Card>
              </div>
            ),
          },
          {
            key: 'special-out',
            label: <span><GiftOutlined style={{ color: '#eb2f96' }} /> 特供出货</span>,
            children: (
              <Card
                title={
                  <span>
                    <GiftOutlined style={{ color: '#eb2f96', marginRight: 8 }} />
                    特供产品出货
                  </span>
                }
                extra={
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    搜索会员 → 选择商品 → 确认出货（不扣余额，仅减库存）
                  </Text>
                }
              >
                <Form form={specialOutForm} layout="vertical" onFinish={handleSpecialOut} style={{ maxWidth: 680 }}>
                  {/* 第一步：搜索并选择会员 */}
                  <Card size="small" style={{
                    background: 'linear-gradient(135deg, #fff0f6 0%, #ffeff6 100%)',
                    borderColor: '#ffadd2',
                    marginBottom: 20
                  }} title={<span><TeamOutlined /> ① 领取会员</span>}>
                    <Form.Item name="member_id" label="搜索会员（姓名/用户名/手机号）"
                      rules={[{ required: true, message: '请搜索并选择一个会员' }]}
                    >
                      <Select
                        showSearch
                        showArrow
                        allowClear
                        placeholder="输入会员姓名或手机号进行搜索..."
                        filterOption={false}
                        onSearch={(val) => handleSearchMembers(val)}
                        notFoundContent={memberSearching ? <Spin size="small" /> : "输入关键词搜索会员"}
                        loading={memberSearching}
                        onChange={() => {}}
                        options={memberOptions.map(m => ({
                          value: m.id,
                          label: `${m.display_name}${m.phone ? ` (${m.phone})` : ''} [Lv.${m.agent_level || 1}]`
                        }))}
                      />
                    </Form.Item>
                    {specialOutForm.getFieldValue('member_id') && (() => {
                      const sel = memberOptions.find(m => m.id === specialOutForm.getFieldValue('member_id'));
                      return sel ? (
                        <div style={{ padding: '6px 12px', background: '#fff', borderRadius: 4, border: '1px solid #ffb3d9', fontSize: 13 }}>
                          ✅ 已选择：<strong>{sel.display_name}</strong>
                          {sel.phone && <span style={{ marginLeft: 12 }}>📱 {sel.phone}</span>}
                          <Tag color="magenta" style={{ marginLeft: 12 }}>Lv.{sel.agent_level || 1}</Tag>
                        </div>
                      ) : null;
                    })()}
                  </Card>

                  {/* 第二步：选择商品和数量 */}
                  <Card size="small" style={{
                    background: 'linear-gradient(135deg, #f6ffed 0%, #eaffea 100%)',
                    borderColor: '#b7eb8f',
                    marginBottom: 20
                  }} title={<span><StockOutlined /> ② 出库商品</span>}>
                    <Row gutter={20}>
                      <Col span={14}>
                        <Form.Item name="stock_id" label="选择商品" rules={[{ required: true, message: '必选' }]}>
                          <Select
                            showSearch
                            placeholder="搜索库存商品..."
                            filterOption={(input, option) =>
                              String(option?.label || '').toLowerCase().includes(input.toLowerCase())
                            }
                            notFoundContent={stockList.length === 0 ? "暂无库存" : "无匹配"}
                          >
                            {stockList.filter(s => s.status === 1 && s.quantity > 0).map(s => (
                              <Option key={s.id} value={s.id}
                                label={`${s.product_name} (库存:${s.quantity}${s.unit})`}
                              >
                                {s.product_name}
                                <Text type="secondary" style={{ float: 'right' }}>
                                  库存:{s.quantity}{s.unit} | 成本:¥{s.avg_cost.toFixed(2)}
                                </Text>
                              </Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col span={10}>
                        <Row gutter={12}>
                          <Col span={12}>
                            <Form.Item name="quantity" label="出货数量" rules={[{ required: true, message: '必填' }]}>
                              <InputNumber min={1} style={{ width: '100%' }} placeholder="数量" />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item noStyle shouldUpdate={(prev, cur) => prev.stock_id !== cur.stock_id || cur.quantity}>
                              {({ getFieldValue }) => {
                                const sid = getFieldValue('stock_id');
                                const qty = getFieldValue('quantity');
                                const selStock = stockList.find(s => s.id === sid);
                                if (!selStock) return null;
                                return (
                                  <Form.Item label="当前库存">
                                    <span style={{
                                      display: 'inline-block',
                                      padding: '4px 12px',
                                      background: qty && qty > selStock.quantity ? '#fff1f0' : '#f6ffed',
                                      border: `1px solid ${qty && qty > selStock.quantity ? '#ffa39e' : '#b7eb8f'}`,
                                      borderRadius: 4,
                                      fontWeight: 500,
                                      fontSize: 15,
                                      color: qty && qty > selStock.quantity ? '#cf1322' : '#389e0d'
                                    }}>
                                      {selStock.quantity} {selStock.unit}
                                    </span>
                                  </Form.Item>
                                );
                              }}
                            </Form.Item>
                          </Col>
                        </Row>
                      </Col>
                    </Row>

                    {/* 库存不足提示 */}
                    <Form.Item noStyle shouldUpdate={(prev, cur) => prev.stock_id !== cur.stock_id || prev.quantity !== cur.quantity}>
                      {({ getFieldValue }) => {
                        const sid = getFieldValue('stock_id');
                        const qty = getFieldValue('quantity');
                        if (!sid || !qty) return null;
                        const selStock = stockList.find(s => s.id === sid);
                        if (!selStock) return null;
                        if (qty > selStock.quantity) {
                          return (
                            <div style={{ padding: '8px 12px', background: '#fff1f0', borderRadius: 4, border: '1px solid #ffa39e', color: '#cf1322', marginBottom: 12 }}>
                              ⚠️ 出货数量({qty}) 超过当前库存({selStock.quantity})，无法提交
                            </div>
                          );
                        }
                        // 计算出库价值
                        const value = (qty * selStock.avg_cost).toFixed(2);
                        return (
                          <div style={{ padding: '8px 12px', background: '#f6ffed', borderRadius: 4, border: '1px solid #b7eb8f', color: '#389e0d', marginBottom: 12 }}>
                            ✓ 出库价值约 ¥{value}（{qty} × ¥{selStock.avg_cost.toFixed(2)}）
                          </div>
                        );
                      }}
                    </Form.Item>
                  </Card>

                  {/* 第三步：备注和提交 */}
                  <Card size="small" title="③ 备注确认">
                    <Form.Item name="remark" label="备注（可选）">
                      <Input.TextArea rows={2} placeholder="如：会议赠品、活动奖品、VIP专享等" />
                    </Form.Item>
                    <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                      <Space>
                        <Button onClick={() => { specialOutForm.resetFields(); setMemberOptions([]); }}>
                          重置表单
                        </Button>
                        <Button type="primary" htmlType="submit" icon={<GiftOutlined />}
                          style={{ background: '#eb2f96', borderColor: '#eb2f96' }}
                        >
                          确认特供出货
                        </Button>
                      </Space>
                    </Form.Item>
                  </Card>
                </Form>
              </Card>
            ),
          },
        ]}
      />

      {/* ========== 入库弹窗 ========== */}
      <Modal
        title={<span><PlusOutlined style={{ color: '#52c41a' }} /> 入库登记</span>}
        open={stockInModalOpen}
        onCancel={() => { setStockInModalOpen(false); stockInForm.resetFields(); }}
        footer={null}
        destroyOnClose
        width={520}
      >
        <Form form={stockInForm} layout="vertical" onFinish={handleStockIn}>
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item name="product_name" label="商品名称" rules={[{ required: true, message: '必填' }]}>
                <Select
                  showSearch
                  optionFilterProp="label"
                  placeholder="输入或选择销售产品名称"
                  autoFocus
                  options={productOptions.map(p => ({
                    value: p.name,
                    label: `${p.name}${p.code ? ` (${p.code})` : ''}`
                  }))}
                  onChange={(val) => {
                    const sel = productOptions.find(p => p.name === val);
                    if (sel) {
                      stockInForm.setFieldsValue({ product_code: sel.code || '' });
                    }
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="unit" label="单位" initialValue="件">
                <Input placeholder="件/个/箱" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="product_code" label="商品编码">
                <Input placeholder="可选" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="category" label="分类" initialValue="未分类">
                <Select showSearch optionFilterProp="children" mode="tags">
                  {categories.map(c => <Option key={c} value={c}>{c}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="quantity" label="来货数量" rules={[{ required: true, message: '必填' }]}>
                <InputNumber min={1} style={{ width: '100%' }} placeholder="数量" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="unit_cost" label="商品成本(元)" initialValue={0}>
                <InputNumber min={0} precision={2} step={0.01} style={{ width: '100%' }} placeholder="0.00" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="freight" label="运费(元)" initialValue={0}>
                <InputNumber min={0} precision={2} step={0.01} style={{ width: '100%' }} placeholder="0.00" />
              </Form.Item>
            </Col>
          </Row>
          {/* 实时计算总价提示 */}
          <Form.Item noStyle shouldUpdate>
            {({ getFieldValue }) => {
              const qty = getFieldValue('quantity') || 0;
              const cost = getFieldValue('unit_cost') || 0;
              const freight = getFieldValue('freight') || 0;
              const total = qty * cost + freight;
              return (
                <div style={{
                  padding: '8px 12px', background: '#f6ffed', borderRadius: 6,
                  border: '1px solid #b7eb8f', marginBottom: 16, textAlign: 'center'
                }}>
                  <Text>
                    本次小计: <Text strong style={{ fontSize: 16, color: '#52c41a' }}>¥{total.toFixed(2)}</Text>
                    &nbsp;&nbsp;（数量×成本+运费 = {qty} × {cost.toFixed(2)} + {freight.toFixed(2)}）
                  </Text>
                </div>
              );
            }}
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="supplier" label="供应商">
                <Input placeholder="可选" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="batch_no" label="批次号">
                <Input placeholder="可选" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} placeholder="可选填写来源说明等" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => { setStockInModalOpen(false); stockInForm.resetFields(); }}>取消</Button>
              <Button type="primary" htmlType="submit" style={{ background: '#52c41a', borderColor: '#52c41a' }}
                icon={<PlusOutlined />}
              >
                确认入库
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* ========== 出库弹窗 ========== */}
      <Modal
        title={<span><MinusCircleOutlined style={{ color: '#e94560' }} /> 出库登记</span>}
        open={stockOutModalOpen}
        onCancel={() => { setStockOutModalOpen(false); stockOutForm.resetFields(); }}
        footer={null}
        destroyOnClose
        width={480}
      >
        <Form form={stockOutForm} layout="vertical" onFinish={handleStockOut}>
          <Form.Item name="stock_id" label="选择商品" rules={[{ required: true, message: '必选' }]}>
            <Select
              showSearch
              placeholder="搜索并选择要出库的商品..."
              filterOption={(input, option) =>
                String(option?.label || '').toLowerCase().includes(input.toLowerCase())
              }
              notFoundContent={stockList.length === 0 ? "暂无商品，请先入库" : "无匹配"}
            >
              {stockList.filter(s => s.status === 1 && s.quantity > 0)
                .map(s => (
                  <Option key={s.id} value={s.id}
                    label={`${s.product_name} (库存:${s.quantity}${s.unit})`}
                  >
                    {s.product_name}
                    <Text type="secondary" style={{ float: 'right' }}>
                      库存:{s.quantity}{s.unit}
                    </Text>
                  </Option>
                ))
              }
            </Select>
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="quantity" label="出库数量" rules={[{ required: true, message: '必填' }]}>
                <InputNumber min={1} style={{ width: '100%' }} placeholder="数量" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="operator" label="操作人" initialValue="管理员">
                <Input placeholder="默认管理员" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="remark" label="出库原因/备注">
            <Input.TextArea rows={2} placeholder="如：发货给代理商、损耗、领用等" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => { setStockOutModalOpen(false); stockOutForm.resetFields(); }}>取消</Button>
              <Button danger htmlType="submit" icon={<MinusCircleOutlined />}>确认出库</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* ========== 详情弹窗 ========== */}
      <Modal
        title={<span>
          <InboxOutlined style={{ color: '#1890ff', marginRight: 6 }} />
          【{detailStock?.product_name}】库存明细
        </span>}
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={900}
        destroyOnClose
      >
        {detailStock && (
          <div>
            {/* 商品信息摘要 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={4}><Text type="secondary">当前库存</Text><br/><Text strong style={{ fontSize: 20, color: detailStock.quantity <= detailStock.min_alert ? '#e94560' : '#1890ff' }}>{detailStock.quantity} {detailStock.unit}</Text></Col>
              <Col span={4}><Text type="secondary">累计入库</Text><br/><Text strong style={{ color: '#52c41a' }}>{detailStock.total_in}</Text></Col>
              <Col span={4}><Text type="secondary">累计出库</Text><br/><Text strong style={{ color: '#e94560' }}>{detailStock.total_out}</Text></Col>
              <Col span={4}><Text type="secondary">平均成本</Text><br/><Text strong>¥{detailStock.avg_cost.toFixed(2)}</Text></Col>
              <Col span={4}><Text type="secondary">总成本</Text><br/><Text strong>¥{detailStock.total_cost.toFixed(2)}</Text></Col>
              <Col span={4}><Text type="secondary">总运费</Text><br/><Text strong>¥{detailStock.total_freight.toFixed(2)}</Text></Col>
            </Row>
            <Divider style={{ margin: '8px 0' }} />

            <Table
              rowKey="id"
              columns={recordColumns}
              dataSource={detailRecords}
              size="small"
              pagination={{ total: detailTotal, pageSize: 20, size: 'small', showTotal: t => `共 ${t} 条记录` }}
              scroll={{ x: 900 }}
            />
          </div>
        )}
      </Modal>

      {/* 全局样式 */}
      <style>{`
        .inventory-management .ant-statistic-content-value {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
        }
        .stat-card-inv .ant-statistic-title {
          font-size: 12px !important; color: #999 !important;
        }
        .stat-card-inv:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,.08);
          transform: translateY(-1px);
          transition: all .2s ease;
        }
      `}</style>
    </div>
  );
};

export default InventoryManagement;
