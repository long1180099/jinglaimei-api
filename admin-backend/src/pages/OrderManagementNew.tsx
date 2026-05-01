// 订单管理页面 - 品牌红色设计系统 v2.0
import React, { useEffect, useState, useRef } from 'react';
import {
  Table,
  Input,
  DatePicker,
  Select,
  Form,
  Statistic,
  Modal,
  message,
  Dropdown,
  Descriptions,
  Divider,
  Timeline,
  Tooltip,
  Typography
} from 'antd';
import {
  ShoppingCartOutlined,
  SearchOutlined,
  FilterOutlined,
  DownloadOutlined,
  EyeOutlined,
  PrinterOutlined,
  SendOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  MoreOutlined
} from '@ant-design/icons';
import { PrintModal, usePrintModal } from '../components/print';
import './OrderManagement.css';

const { Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

// 订单状态映射（数据库: 0待付款 1待发货 2已发货 3已完成 4已取消）
interface StatusConfig { text: string; className: string; nextActions: string[]; }

const ORDER_STATUS_MAP: Record<number, StatusConfig> = {
  0: { text: '待付款', className: 'pending', nextActions: ['confirm_pay', 'cancel'] },
  1: { text: '待发货', className: 'processing', nextActions: ['ship', 'cancel'] },
  2: { text: '已发货', className: 'shipped', nextActions: ['complete'] },
  3: { text: '已完成', className: 'completed', nextActions: [] },
  4: { text: '已取消', className: 'cancelled', nextActions: [] },
};

const getStatusConfig = (status: number): StatusConfig => ORDER_STATUS_MAP[status] || { text: '未知', className: 'cancelled', nextActions: [] };

// 等级文本
function getLevelText(level: number) {
  const map: Record<number, string> = {
    1: '会员', 2: '打版代言人', 3: '代理商',
    4: '批发商', 5: '首席分公司', 6: '集团事业部',
  };
  return map[level] || '未知';
}

const OrderManagementNew: React.FC = () => {
  const [form] = Form.useForm();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [showOrderDetail, setShowOrderDetail] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<number | null>(null);
  const [shipModalVisible, setShipModalVisible] = useState(false);
  const [shipForm] = Form.useForm();

  // 三联针式打印弹窗
  const { triggerOpen: openPrintModal, render: renderPrintModal } = usePrintModal();

  // 状态
  const [orders, setOrders] = useState<any[]>([]);
  const [orderTotal, setOrderTotal] = useState(0);
  const [orderPage, setOrderPage] = useState(1);
  const [orderPageSize, setOrderPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);

  // 详情
  const [detailData, setDetailData] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // 加载订单列表
  const loadOrders = async (params?: any) => {
    setLoading(true);
    try {
      const { ordersApi } = await import('../services/dbApi');
      const queryParams = {
        page: params?.page || orderPage,
        pageSize: params?.pageSize || orderPageSize,
        keyword: params?.keyword,
        status: params?.status,
        startDate: params?.startDate,
        endDate: params?.endDate,
      };
      const data: any = await ordersApi.getList(queryParams);
      setOrders(data?.list || []);
      setOrderTotal(data?.total || 0);
      setOrderPage(data?.page || 1);
      setOrderPageSize(data?.pageSize || 10);
    } catch (error: any) {
      message.error(error?.message || '获取订单列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载统计
  const loadStats = async () => {
    try {
      const { ordersApi } = await import('../services/dbApi');
      const data = await ordersApi.getStats();
      setStats(data);
    } catch (error) {
      // 静默失败
    }
  };

  useEffect(() => {
    loadOrders();
    loadStats();
  }, []);

  // 加载订单详情
  const loadOrderDetail = async (orderId: number) => {
    try {
      const { ordersApi } = await import('../services/dbApi');
      return await ordersApi.getDetail(orderId);
    } catch (error: any) {
      message.error(error?.message || '获取订单详情失败');
      return null;
    }
  };

  // 更新订单状态
  const updateStatus = async (orderId: number, status: number, extra?: { remark?: string; shippingNo?: string }) => {
    try {
      const { ordersApi } = await import('../services/dbApi');
      await ordersApi.updateStatus(orderId, status, extra);
      message.success('操作成功');
      loadOrders();
      return true;
    } catch (error: any) {
      message.error(error?.message || '操作失败');
      return false;
    }
  };

  const handleViewOrder = (orderId: number) => {
    setCurrentOrderId(orderId);
    setShowOrderDetail(true);
  };

  const handleOpenShipModal = (orderId: number) => {
    setCurrentOrderId(orderId);
    shipForm.resetFields();
    setShipModalVisible(true);
  };

  const handleShipSubmit = async () => {
    try {
      const values = await shipForm.validateFields();
      if (currentOrderId) {
        const ok = await updateStatus(currentOrderId, 2, { shippingNo: values.shipping_no, remark: values.remark });
        if (ok) { setShipModalVisible(false); setShowOrderDetail(false); }
      }
    } catch (error) {}
  };

  const handleCompleteOrder = (orderId: number) => {
    Modal.confirm({
      title: '确认完成',
      content: '确认后将触发差价返利结算，确定要完成此订单吗？',
      okText: '确认完成',
      onOk: async () => { const ok = await updateStatus(orderId, 3); if (ok) setShowOrderDetail(false); },
    });
  };

  const handleCancelOrder = (orderId: number) => {
    Modal.confirm({
      title: '确认取消',
      content: '确定要取消此订单吗？',
      okType: 'danger',
      onOk: async () => { const ok = await updateStatus(orderId, 4); if (ok) setShowOrderDetail(false); },
    });
  };

  const handleConfirmPay = (orderId: number) => {
    Modal.confirm({
      title: '确认付款',
      content: '确定将此订单标记为已付款吗？',
      onOk: async () => { const ok = await updateStatus(orderId, 1); if (ok) setShowOrderDetail(false); },
    });
  };

  // ========== 三联针式打印（新）==========
  const handlePrintOrder = (orderId: number) => {
    openPrintModal(orderId);
  };

  // ========== 批量打印 ==========
  const handleBatchPrint = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要打印的订单');
      return;
    }
    openPrintModal(selectedRowKeys as number[]);
  };

  // 搜索
  const handleSearch = (values: any) => {
    const params: any = {};
    if (values.orderId) params.keyword = values.orderId;
    if (values.customer) params.keyword = values.customer;
    if (values.status !== undefined && values.status !== null && values.status !== '') params.status = values.status;
    if (values.orderTime && values.orderTime.length === 2) {
      params.startDate = values.orderTime[0].format('YYYY-MM-DD');
      params.endDate = values.orderTime[1].format('YYYY-MM-DD');
    }
    params.page = 1;
    loadOrders(params);
  };

  const handleReset = () => { form.resetFields(); loadOrders({ page: 1 }); };

  // 操作菜单
  const orderActionMenu = (record: any) => {
    const statusCfg = getStatusConfig(record.order_status);
    const items: any[] = [
      { key: 'view', label: '查看详情', icon: <EyeOutlined />, onClick: () => handleViewOrder(record.id) },
      { key: 'print', label: '打印出库单', icon: <PrinterOutlined />, onClick: () => handlePrintOrder(record.id) },
    ];
    if (statusCfg.nextActions.includes('confirm_pay')) items.push({ type: 'divider' }, { key: 'pay', label: '确认付款', icon: <CheckCircleOutlined />, onClick: () => handleConfirmPay(record.id) });
    if (statusCfg.nextActions.includes('ship')) items.push({ type: 'divider' }, { key: 'ship', label: '发货处理', icon: <SendOutlined />, onClick: () => handleOpenShipModal(record.id) });
    if (statusCfg.nextActions.includes('complete')) items.push({ key: 'complete', label: '标记完成', icon: <CheckCircleOutlined />, onClick: () => handleCompleteOrder(record.id) });
    if (statusCfg.nextActions.includes('cancel')) items.push({ type: 'divider' }, { key: 'cancel', label: '取消订单', icon: <CloseCircleOutlined />, danger: true, onClick: () => handleCancelOrder(record.id) });
    return items;
  };

  // 表格列定义
  const columns = [
    {
      title: '订单编号',
      dataIndex: 'order_no',
      key: 'order_no',
      width: 160,
      render: (text: string, record: any) => (
        <span className="om-order-no" onClick={() => handleViewOrder(record.id)}>{text}</span>
      ),
    },
    {
      title: '客户信息',
      key: 'customer',
      width: 160,
      render: (_: any, record: any) => (
        <div className="om-customer-cell">
          <span className="om-customer-name">{record.real_name || record.username}</span>
          <span className="om-customer-phone">{record.phone}</span>
        </div>
      ),
    },
    {
      title: '订单金额',
      key: 'amount',
      width: 120,
      render: (_: any, record: any) => (
        <span className="om-amount-cell">¥{(record.actual_amount || 0).toFixed(2)}</span>
      ),
    },
    {
      title: '商品数量',
      key: 'item_count',
      width: 90,
      align: 'center' as const,
      render: () => '-',
    },
    {
      title: '下单时间',
      dataIndex: 'order_time',
      key: 'order_time',
      width: 150,
      sorter: (a: any, b: any) => (a.order_time || '').localeCompare(b.order_time || ''),
      render: (time: string) => (
        <div className="om-time-cell">
          <span className="om-time-date">{dayjs(time).format('YYYY-MM-DD')}</span>
          <span className="om-time-hm">{dayjs(time).format('HH:mm')}</span>
        </div>
      ),
    },
    {
      title: '订单状态',
      dataIndex: 'order_status',
      key: 'order_status',
      width: 120,
      filters: [
        { text: '待付款', value: 0 }, { text: '待发货', value: 1 },
        { text: '已发货', value: 2 }, { text: '已完成', value: 3 }, { text: '已取消', value: 4 },
      ],
      render: (status: number, _r: any) => {
        const cfg = getStatusConfig(status);
        // 已打印（状态2）显示特殊标记
        const isPrinted = status === 2;
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span className={`om-status-badge ${cfg.className}`}>
              <span className="om-status-dot"></span>{cfg.text}
            </span>
            {isPrinted && <PrinterOutlined style={{ color: '#e94560', fontSize: 13 }} title="已打印出库单" />}
          </span>
        );
      },
    },
    {
      title: '物流信息',
      key: 'shipping',
      width: 150,
      render: (_: any, record: any) => (
        <div className="om-shipping-cell">
          {record.shipping_no ? (
            <>
              <span className="om-shipping-no">单号: {record.shipping_no}</span>
              {record.shipping_time && <span className="om-shipping-time">{dayjs(record.shipping_time).format('MM-DD HH:mm')}</span>}
            </>
          ) : <span className="om-no-shipping">未发货</span>}
        </div>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 90,
      fixed: 'right' as const,
      render: (record: any) => (
        <div className="om-actions">
          <Tooltip title="查看详情">
            <button className="om-action-btn" onClick={() => handleViewOrder(record.id)}>
              <EyeOutlined />
            </button>
          </Tooltip>
          <Dropdown menu={{ items: orderActionMenu(record) }} trigger={['click']}>
            <button className="om-action-btn"><MoreOutlined /></button>
          </Dropdown>
        </div>
      ),
    },
  ];

  // 详情懒加载
  useEffect(() => {
    if (showOrderDetail && currentOrderId) {
      setDetailLoading(true);
      loadOrderDetail(currentOrderId).then(data => { setDetailData(data); setDetailLoading(false); });
    }
  }, [showOrderDetail, currentOrderId]);

  return (
    <div className="om-page">
      {/* ===== 页面头部 ===== */}
      <div className="om-header">
        <div className="om-header-left">
          <ShoppingCartOutlined className="om-header-icon" />
          <div>
            <h2 className="om-header-title">订单管理</h2>
            <div className="om-header-sub">订单全流程管理与跟踪 · 打印出库单</div>
          </div>
        </div>
        <div className="om-header-actions">
          <button className="om-btn-header" onClick={() => { loadOrders(); loadStats(); }}>
            <ReloadOutlined /> 刷新
          </button>
          <button className="om-btn-header primary" onClick={() => message.info('导出功能开发中')}>
            <DownloadOutlined /> 导出
          </button>
        </div>
      </div>

      {/* ===== KPI 统计 ===== */}
      <div className="om-kpi-section">
        <div className="om-kpi-card" data-type="total">
          <div className="om-kpi-label"><ShoppingCartOutlined /> 总订单数</div>
          <div className="om-kpi-value">{stats?.total || 0}</div>
          <div className="om-kpi-footer">累计全部订单</div>
        </div>
        <div className="om-kpi-card" data-type="pending">
          <div className="om-kpi-label"><ClockCircleOutlined /> 待处理</div>
          <div className="om-kpi-value">{(stats?.pending || 0) + (stats?.processing || 0)}</div>
          <div className="om-kpi-footer">待付款 + 待发货</div>
        </div>
        <div className="om-kpi-card" data-type="today">
          <div className="om-kpi-label">💰 今日收入</div>
          <div className="om-kpi-value">¥{(stats?.todayAmount || 0).toLocaleString()}</div>
          <div className="om-kpi-footer">截止今日 23:59:59</div>
        </div>
        <div className="om-kpi-card" data-type="month">
          <div className="om-kpi-label">📈 本月收入</div>
          <div className="om-kpi-value">¥{(stats?.monthAmount || 0).toLocaleString()}</div>
          <div className="om-kpi-footer">本月累计营收</div>
        </div>
      </div>

      {/* ===== 工具栏/筛选区 ===== */}
      <div className="om-toolbar">
        <Form form={form} layout="inline" onFinish={handleSearch} className="om-toolbar-form">
          <div className="om-toolbar-inner">
            <div className="om-filter-item">
              <label className="om-filter-label">搜索</label>
              <Form.Item name="orderId" style={{ marginBottom: 0 }}>
                <Input placeholder="订单号/客户名/手机" prefix={<SearchOutlined />} allowClear />
              </Form.Item>
            </div>
            <div className="om-filter-item">
              <label className="om-filter-label">状态</label>
              <Form.Item name="status" style={{ marginBottom: 0 }}>
                <Select placeholder="全部状态" allowClear style={{ width: 130 }}>
                  <Option value={0}>待付款</Option>
                  <Option value={1}>待发货</Option>
                  <Option value={2}>已发货</Option>
                  <Option value={3}>已完成</Option>
                  <Option value={4}>已取消</Option>
                </Select>
              </Form.Item>
            </div>
            <div className="om-filter-item" style={{ flex: '1 1 200px', minWidth: 200 }}>
              <label className="om-filter-label">时间范围</label>
              <Form.Item name="orderTime" style={{ marginBottom: 0, width: '100%' }}>
                <RangePicker placeholder={['开始日期', '结束日期']} style={{ width: '100%' }} />
              </Form.Item>
            </div>
            <div className="om-filter-actions">
              <button type="submit" className="om-btn-search" onClick={(e) => { e.preventDefault(); form.submit(); }}>
                <SearchOutlined /> 搜索
              </button>
              <button type="button" className="om-btn-reset" onClick={handleReset}>
                <FilterOutlined /> 重置
              </button>
            </div>
          </div>
        </Form>
      </div>

      {/* ===== 批量操作栏 ===== */}
      {selectedRowKeys.length > 0 && (
        <div className="om-batch-bar">
          <span>已选择 {selectedRowKeys.length} 个订单</span>
          <button onClick={() => setSelectedRowKeys([])}>取消选择</button>
          <button onClick={() => handleBatchPrint()}>🖨️ 批量打印</button>
        </div>
      )}

      {/* ===== 订单列表表格 ===== */}
      <div className="om-table-section">
        <div className="om-table-head">
          <h4 className="om-table-title">📋 订单列表</h4>
          <span className="om-table-count">共 {orderTotal} 条记录</span>
        </div>
        <div className="om-table-wrap">
          <Table
            columns={columns}
            dataSource={orders}
            rowKey="id"
            rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
            loading={loading}
            pagination={{
              current: orderPage,
              pageSize: orderPageSize,
              total: orderTotal,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条`,
              onChange: (page, pageSize) => loadOrders({ page, pageSize }),
            }}
            scroll={{ x: 1100 }}
            size="middle"
          />
        </div>
      </div>

      {/* ========== 订单详情弹窗 ========== */}
      <Modal
        title={<><ShoppingCartOutlined /> 订单详情</>}
        open={showOrderDetail}
        onCancel={() => { setShowOrderDetail(false); setDetailData(null); }}
        width={760}
        className="om-modal"
        footer={[
          <button key="print" className="om-action-btn-lg" onClick={() => currentOrderId && handlePrintOrder(currentOrderId)}>
            <PrinterOutlined /> 打印出库单
          </button>,
          <button key="close" className="om-action-btn-lg" onClick={() => { setShowOrderDetail(false); setDetailData(null); }}>关闭</button>,
        ]}
      >
        {detailLoading ? (
          <div style={{ textAlign: 'center', padding: 50 }}>
            <SyncOutlined spin style={{ fontSize: 28, color: 'var(--om-primary)' }} />
            <p style={{ marginTop: 12, color: '#999' }}>加载中...</p>
          </div>
        ) : detailData ? (
          <div className="om-detail-scroll">
            {/* 基本信息 */}
            <div className="om-detail-section">
              <div className="om-detail-section-head"><ShoppingCartOutlined /> 基本信息</div>
              <div className="om-detail-body">
                <Descriptions column={2} size="small">
                  <Descriptions.Item label="订单编号">{detailData.order_no}</Descriptions.Item>
                  <Descriptions.Item label="订单状态">
                    <span className={`om-status-badge ${getStatusConfig(detailData.order_status).className}`}>
                      <span className="om-status-dot"></span>{getStatusConfig(detailData.order_status).text}
                    </span>
                  </Descriptions.Item>
                  <Descriptions.Item label="下单时间">{dayjs(detailData.order_time).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
                  <Descriptions.Item label="支付方式">{detailData.payment_method === 'balance' ? '余额支付' : '在线支付'}</Descriptions.Item>
                  <Descriptions.Item label="支付状态">{detailData.payment_status === 1 ? '✅ 已支付' : '⏳ 未支付'}</Descriptions.Item>
                  {detailData.payment_time && (
                    <Descriptions.Item label="支付时间">{dayjs(detailData.payment_time).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
                  )}
                </Descriptions>
              </div>
            </div>

            {/* 收货信息 */}
            <div className="om-detail-section">
              <div className="om-detail-section-head">📍 收货信息</div>
              <div className="om-detail-body">
                <Descriptions column={2} size="small">
                  <Descriptions.Item label="收货人">{detailData.receiver_name || '-'}</Descriptions.Item>
                  <Descriptions.Item label="联系电话">{detailData.receiver_phone || '-'}</Descriptions.Item>
                  <Descriptions.Item label="收货地址" span={2}>{detailData.receiver_address || '-'}</Descriptions.Item>
                  <Descriptions.Item label="买家">{detailData.username}</Descriptions.Item>
                  <Descriptions.Item label="买家等级">{getLevelText(detailData.agent_level)}</Descriptions.Item>
                </Descriptions>
              </div>
            </div>

            {/* 物流信息 */}
            <div className="om-detail-section">
              <div className="om-detail-section-head">🚚 物流信息</div>
              <div className="om-detail-body">
                <Descriptions column={2} size="small">
                  <Descriptions.Item label="物流单号">{detailData.shipping_no || '未填写'}</Descriptions.Item>
                  <Descriptions.Item label="发货时间">
                    {detailData.shipping_time ? dayjs(detailData.shipping_time).format('YYYY-MM-DD HH:mm') : '未发货'}
                  </Descriptions.Item>
                </Descriptions>
              </div>
            </div>

            {/* 商品清单 */}
            <div className="om-detail-section">
              <div className="om-detail-section-head">🛒 商品清单</div>
              <div className="om-detail-body">
                <table className="om-items-grid">
                  <thead>
                    <tr><th>商品名称</th><th className="text-right" style={{ width: 90 }}>单价</th><th style={{ width: 70, textAlign: 'center' }}>数量</th><th className="text-right" style={{ width: 100 }}>小计</th></tr>
                  </thead>
                  <tbody>
                    {(detailData.items || []).map((item: any, i: number) => (
                      <tr key={i}>
                        <td>{item.product_name || '-'}</td>
                        <td className="text-right">¥{(item.unit_price || 0).toFixed(2)}</td>
                        <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                        <td className="text-right">¥{(item.subtotal || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="om-summary-box">
                  <div className="om-summary-row"><span>商品总额</span><span>¥{(detailData.total_amount || 0).toFixed(2)}</span></div>
                  <div className="om-summary-row"><span>优惠金额</span><span>-¥{(detailData.discount_amount || 0).toFixed(2)}</span></div>
                  <div className="om-summary-row"><span>运费</span><span>+¥{(detailData.shipping_fee || 0).toFixed(2)}</span></div>
                  <div className="om-summary-total"><span>实付金额</span><span>¥{(detailData.actual_amount || 0).toFixed(2)}</span></div>
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            {getStatusConfig(detailData.order_status).nextActions.length > 0 && (
              <div className="om-detail-section">
                <div className="om-detail-actions">
                  {getStatusConfig(detailData.order_status).nextActions.includes('confirm_pay') && (
                    <button className="om-action-btn-lg primary" onClick={() => handleConfirmPay(detailData.id)}>💳 确认付款</button>
                  )}
                  {getStatusConfig(detailData.order_status).nextActions.includes('ship') && (
                    <button className="om-action-btn-lg primary" onClick={() => handleOpenShipModal(detailData.id)}><SendOutlined /> 发货处理</button>
                  )}
                  {getStatusConfig(detailData.order_status).nextActions.includes('complete') && (
                    <button className="om-action-btn-lg primary" onClick={() => handleCompleteOrder(detailData.id)}>✅ 标记完成</button>
                  )}
                  {getStatusConfig(detailData.order_status).nextActions.includes('cancel') && (
                    <button className="om-action-btn-lg danger" onClick={() => handleCancelOrder(detailData.id)}>❌ 取消订单</button>
                  )}
                  <button className="om-action-btn-lg" onClick={() => handlePrintOrder(detailData.id)}><PrinterOutlined /> 打印出库单</button>
                </div>
              </div>
            )}

            {/* 时间线 */}
            <div className="om-detail-section">
              <div className="om-detail-section-head">🕐 订单流程</div>
              <Timeline className="om-timeline">
                <Timeline.Item color="#e94560">📦 订单创建: {dayjs(detailData.order_time).format('YYYY-MM-DD HH:mm:ss')}</Timeline.Item>
                {detailData.payment_time && (
                  <Timeline.Item color="#10b981">💰 支付完成: {dayjs(detailData.payment_time).format('YYYY-MM-DD HH:mm')}</Timeline.Item>
                )}
                {detailData.shipping_time && (
                  <Timeline.Item color="#3b82f6">🚚 订单发货: {dayjs(detailData.shipping_time).format('YYYY-MM-DD HH:mm')}</Timeline.Item>
                )}
                {detailData.confirm_time && (
                  <Timeline.Item color="#10b981">✅ 订单完成: {dayjs(detailData.confirm_time).format('YYYY-MM-DD HH:mm')}</Timeline.Item>
                )}
                {detailData.cancel_time && (
                  <Timeline.Item color="#ef4444">❌ 订单取消: {dayjs(detailData.cancel_time).format('YYYY-MM-DD HH:mm')}</Timeline.Item>
                )}
              </Timeline>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* ========== 发货弹窗 ========== */}
      <Modal
        title="📦 发货处理"
        open={shipModalVisible}
        onCancel={() => setShipModalVisible(false)}
        onOk={handleShipSubmit}
        okText="确认发货"
        cancelText="取消"
      >
        <Form form={shipForm} layout="vertical">
          <Form.Item name="shipping_no" label="物流单号" rules={[{ required: true, message: '请输入物流单号' }]}>
            <Input placeholder="请输入快递单号" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} placeholder="发货备注（可选）" />
          </Form.Item>
        </Form>
      </Modal>

      {/* ========== 三联针式打印弹窗 ========== */}
      {renderPrintModal(loadOrderDetail)}
    </div>
  );
};

import dayjs from 'dayjs';
export default OrderManagementNew;
