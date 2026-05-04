/**
 * 产品使用日志管理页面
 *
 * 功能：全平台使用记录查看、筛选、导出 Excel、删除（仅超管）
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Input,
  Select,
  Tag,
  Space,
  Row,
  Col,
  message,
  Popconfirm,
  Typography,
  Descriptions,
  DatePicker,
  Tooltip
} from 'antd';
import {
  SearchOutlined,
  ExportOutlined,
  DeleteOutlined,
  EyeOutlined,
  FileTextOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { usageApi } from '../api/usageApi';
import { useAuthContext } from '../contexts/AuthContext';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const LEVEL_MAP: Record<number, { text: string; color: string }> = {
  1: { text: '会员', color: 'default' },
  2: { text: '代言人', color: 'green' },
  3: { text: '代理商', color: 'blue' },
  4: { text: '批发商', color: 'orange' },
  5: { text: '分公司', color: 'red' },
  6: { text: '事业部', color: 'purple' }
};

const SOURCE_MAP: Record<string, { text: string; color: string }> = {
  self: { text: '自己录入', color: 'green' },
  superior: { text: '上级代填', color: 'blue' }
};

interface UsageLog {
  id: number;
  customer_name: string;
  customer_phone: string;
  product_name: string;
  product_code: string;
  trace_code: string;
  start_date: string;
  usage_instructions: string;
  agent_name: string;
  agent_phone: string;
  agent_level: number;
  created_by_name: string;
  source_type: string;
  created_at: string;
}

const ProductUsageManagement: React.FC = () => {
  const { user, hasRole } = useAuthContext();
  const isSuperAdmin = user?.role === 'super_admin' || user?.role === 'admin';

  const [data, setData] = useState<UsageLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // 筛选条件
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [customerPhone, setCustomerPhone] = useState('');
  const [traceCode, setTraceCode] = useState('');
  const [sourceType, setSourceType] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<any>(null);

  // 详情弹窗
  const [detailVisible, setDetailVisible] = useState(false);
  const [currentDetail, setCurrentDetail] = useState<UsageLog | null>(null);

  const fetchData = useCallback(async (p?: number, ps?: number) => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page: p || page,
        pageSize: ps || pageSize,
        ...filters
      };
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.date_from = dateRange[0].format('YYYY-MM-DD');
        params.date_to = dateRange[1].format('YYYY-MM-DD');
      }
      const res = await usageApi.getList(params);
      setData(res?.list || []);
      setTotal(res?.total || 0);
    } catch (err: any) {
      message.error(err?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters, dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = () => {
    const newFilters: Record<string, any> = {};
    if (customerPhone) newFilters.customer_phone = customerPhone;
    if (traceCode) newFilters.trace_code = traceCode;
    if (sourceType) newFilters.source_type = sourceType;
    setFilters(newFilters);
    setPage(1);
  };

  const handleReset = () => {
    setCustomerPhone('');
    setTraceCode('');
    setSourceType(undefined);
    setDateRange(null);
    setFilters({});
    setPage(1);
  };

  const handleExport = () => {
    try {
      const params: Record<string, any> = { ...filters };
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.date_from = dateRange[0].format('YYYY-MM-DD');
        params.date_to = dateRange[1].format('YYYY-MM-DD');
      }
      const token = localStorage.getItem('admin_token');
      const queryString = new URLSearchParams(params as any).toString();
      const url = `/api/usage-logs/export${queryString ? '?' + queryString : ''}`;

      // 用 fetch 下载文件（带 token）
      fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => {
          if (!res.ok) throw new Error('导出失败');
          return res.blob();
        })
        .then(blob => {
          const now = new Date();
          const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = `产品使用记录_${dateStr}.xlsx`;
          link.click();
          URL.revokeObjectURL(link.href);
          message.success('导出成功');
        })
        .catch(() => message.error('导出失败'));
    } catch (err) {
      message.error('导出失败');
    }
  };

  const handleViewDetail = async (record: UsageLog) => {
    try {
      const res = await usageApi.getDetail(record.id);
      setCurrentDetail(res);
      setDetailVisible(true);
    } catch (err: any) {
      message.error(err?.message || '加载详情失败');
    }
  };

  const handleDelete = async (id: number) => {
    if (!isSuperAdmin) {
      message.error('仅超级管理员可删除');
      return;
    }
    try {
      await usageApi.delete(id);
      message.success('删除成功');
      fetchData();
    } catch (err: any) {
      message.error(err?.message || '删除失败');
    }
  };

  const columns: ColumnsType<UsageLog> = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 60,
      sorter: (a, b) => a.id - b.id
    },
    {
      title: '顾客姓名',
      dataIndex: 'customer_name',
      width: 100,
      render: (text) => text || '-'
    },
    {
      title: '顾客手机号',
      dataIndex: 'customer_phone',
      width: 120,
      render: (text) => text || '-'
    },
    {
      title: '产品名称',
      dataIndex: 'product_name',
      width: 150,
      ellipsis: true
    },
    {
      title: '溯源码',
      dataIndex: 'trace_code',
      width: 160,
      render: (text) => text ? (
        <Tooltip title={text}>
          <Text code style={{ fontSize: 12 }}>{text}</Text>
        </Tooltip>
      ) : '-'
    },
    {
      title: '开始使用日期',
      dataIndex: 'start_date',
      width: 120
    },
    {
      title: '负责代理商',
      dataIndex: 'agent_name',
      width: 100,
      render: (text, record) => (
        <div>
          <div>{text || '-'}</div>
          {record.agent_level && (
            <Tag color={LEVEL_MAP[record.agent_level]?.color} style={{ fontSize: 11, marginTop: 2 }}>
              {LEVEL_MAP[record.agent_level]?.text}
            </Tag>
          )}
        </div>
      )
    },
    {
      title: '录入人',
      dataIndex: 'created_by_name',
      width: 100,
      render: (text) => text || '-'
    },
    {
      title: '来源',
      dataIndex: 'source_type',
      width: 90,
      render: (text) => {
        const info = SOURCE_MAP[text];
        return info ? <Tag color={info.color}>{info.text}</Tag> : text;
      }
    },
    {
      title: '录入时间',
      dataIndex: 'created_at',
      width: 160
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Tooltip title="查看详情">
            <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)} />
          </Tooltip>
          {isSuperAdmin && (
            <Popconfirm
              title="确定要删除这条记录吗？"
              onConfirm={() => handleDelete(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Tooltip title="删除">
                <Button type="link" size="small" danger icon={<DeleteOutlined />} />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: 0 }}>
      <Card
        title={
          <Space>
            <FileTextOutlined />
            <span>产品使用日志</span>
            <Tag color="blue">{total} 条记录</Tag>
          </Space>
        }
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => fetchData()}>
              刷新
            </Button>
            <Button type="primary" icon={<ExportOutlined />} onClick={handleExport}>
              导出 Excel
            </Button>
          </Space>
        }
      >
        {/* 筛选栏 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={5}>
            <Input
              placeholder="顾客手机号"
              value={customerPhone}
              onChange={e => setCustomerPhone(e.target.value)}
              prefix={<SearchOutlined />}
              allowClear
            />
          </Col>
          <Col span={5}>
            <Input
              placeholder="溯源码"
              value={traceCode}
              onChange={e => setTraceCode(e.target.value)}
              allowClear
            />
          </Col>
          <Col span={4}>
            <Select
              placeholder="录入来源"
              value={sourceType}
              onChange={setSourceType}
              allowClear
              style={{ width: '100%' }}
              options={[
                { label: '自己录入', value: 'self' },
                { label: '上级代填', value: 'superior' }
              ]}
            />
          </Col>
          <Col span={6}>
            <RangePicker
              value={dateRange}
              onChange={setDateRange}
              style={{ width: '100%' }}
            />
          </Col>
          <Col span={4}>
            <Space>
              <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                搜索
              </Button>
              <Button onClick={handleReset}>重置</Button>
            </Space>
          </Col>
        </Row>

        {/* 数据表格 */}
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1400 }}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (t) => `共 ${t} 条`,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps || 20);
            }
          }}
          size="middle"
        />
      </Card>

      {/* 详情弹窗 */}
      <Modal
        title="使用日志详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={600}
      >
        {currentDetail && (
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="顾客姓名">{currentDetail.customer_name || '-'}</Descriptions.Item>
            <Descriptions.Item label="顾客手机号">{currentDetail.customer_phone || '-'}</Descriptions.Item>
            <Descriptions.Item label="产品名称">{currentDetail.product_name || '-'}</Descriptions.Item>
            <Descriptions.Item label="产品编码">{currentDetail.product_code || '-'}</Descriptions.Item>
            <Descriptions.Item label="溯源码">
              {currentDetail.trace_code ? (
                <Text code>{currentDetail.trace_code}</Text>
              ) : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="开始使用日期">{currentDetail.start_date || '-'}</Descriptions.Item>
            <Descriptions.Item label="使用说明">{currentDetail.usage_instructions || '-'}</Descriptions.Item>
            <Descriptions.Item label="负责代理商">
              {currentDetail.agent_name || '-'}
              {currentDetail.agent_level && (
                <Tag color={LEVEL_MAP[currentDetail.agent_level]?.color} style={{ marginLeft: 8 }}>
                  {LEVEL_MAP[currentDetail.agent_level]?.text}
                </Tag>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="代理商手机号">{currentDetail.agent_phone || '-'}</Descriptions.Item>
            <Descriptions.Item label="录入人">{currentDetail.created_by_name || '-'}</Descriptions.Item>
            <Descriptions.Item label="录入来源">
              {(() => {
                const info = SOURCE_MAP[currentDetail.source_type];
                return info ? <Tag color={info.color}>{info.text}</Tag> : currentDetail.source_type;
              })()}
            </Descriptions.Item>
            <Descriptions.Item label="录入时间">{currentDetail.created_at || '-'}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default ProductUsageManagement;
