import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Space, Modal, Form, Input, Select, Tag, Switch,
  message, Popconfirm, Tooltip, DatePicker, Typography, Badge
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, PushpinOutlined,
  SearchOutlined, ReloadOutlined, EyeOutlined
} from '@ant-design/icons';
import apiClient from '../utils/apiClient';
import './AnnouncementManagement.css';

const { TextArea } = Input;
const { Title, Text } = Typography;

const CATEGORIES = [
  { value: 'notice', label: '公告', color: '#e94560' },
  { value: 'activity', label: '活动', color: '#faad14' },
  { value: 'update', label: '更新', color: '#52c41a' },
  { value: 'policy', label: '政策', color: '#1890ff' },
  { value: 'news', label: '资讯', color: '#722ed1' }
];

const AnnouncementManagement: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [previewItem, setPreviewItem] = useState<any>(null);
  const [form] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, pageSize };
      if (searchKeyword) params.keyword = searchKeyword;
      if (filterCategory) params.category = filterCategory;
      if (filterStatus !== '') params.status = filterStatus;
      const res: any = await apiClient.get('/announcements', { params });
      setData(res?.list || []);
      setTotal(res?.total || 0);
    } catch (err) {
      console.error('获取公告列表失败:', err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchKeyword, filterCategory, filterStatus]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdd = () => {
    setEditingItem(null);
    form.resetFields();
    form.setFieldsValue({ category: 'notice', status: 1, is_top: 0, sort_order: 0 });
    setModalVisible(true);
  };

  const handleEdit = (record: any) => {
    setEditingItem(record);
    form.setFieldsValue({
      title: record.title,
      content: record.content,
      summary: record.summary,
      category: record.category,
      cover_url: record.cover_url,
      author: record.author,
      is_top: record.is_top,
      status: record.status,
      sort_order: record.sort_order,
      published_at: record.published_at
    });
    setModalVisible(true);
  };

  const handlePreview = (record: any) => {
    setPreviewItem(record);
    setPreviewVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await apiClient.delete(`/announcements/${id}`);
      message.success('删除成功');
      fetchData();
    } catch (err) {
      message.error('删除失败');
    }
  };

  const handleToggleTop = async (record: any) => {
    try {
      await apiClient.put(`/announcements/${record.id}/top`, { is_top: record.is_top ? 0 : 1 });
      message.success(record.is_top ? '已取消置顶' : '已置顶');
      fetchData();
    } catch (err) {
      message.error('操作失败');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingItem) {
        await apiClient.put(`/announcements/${editingItem.id}`, values);
        message.success('更新成功');
      } else {
        await apiClient.post('/announcements', values);
        message.success('创建成功');
      }
      setModalVisible(false);
      fetchData();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error('操作失败');
    }
  };

  const getCategoryInfo = (cat: string) => CATEGORIES.find(c => c.value === cat) || CATEGORIES[0];

  const columns = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      width: 260,
      ellipsis: true,
      render: (text: string, record: any) => (
        <Space>
          {record.is_top ? <Tag color="red" style={{ margin: 0 }}>置顶</Tag> : null}
          <Text strong style={{ color: '#1a1a2e' }}>{text}</Text>
        </Space>
      )
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 90,
      render: (cat: string) => {
        const info = getCategoryInfo(cat);
        return <Tag color={info.color}>{info.label}</Tag>;
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status: number) => (
        status === 1
          ? <Badge status="success" text="已发布" />
          : <Badge status="default" text="草稿" />
      )
    },
    {
      title: '阅读量',
      dataIndex: 'view_count',
      key: 'view_count',
      width: 90,
      sorter: (a: any, b: any) => (a.view_count || 0) - (b.view_count || 0),
      render: (count: number) => <Text type="secondary">{count || 0}</Text>
    },
    {
      title: '发布日期',
      dataIndex: 'published_at',
      key: 'published_at',
      width: 120,
      render: (date: string) => <Text type="secondary">{date || '-'}</Text>
    },
    {
      title: '排序',
      dataIndex: 'sort_order',
      key: 'sort_order',
      width: 70,
      render: (order: number) => <Text type="secondary">{order || 0}</Text>
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      render: (_: any, record: any) => (
        <Space size="small">
          <Tooltip title="预览"><Button type="text" size="small" icon={<EyeOutlined />} onClick={() => handlePreview(record)} /></Tooltip>
          <Tooltip title={record.is_top ? '取消置顶' : '置顶'}>
            <Button type="text" size="small" icon={<PushpinOutlined style={{ color: record.is_top ? '#e94560' : undefined }} />} onClick={() => handleToggleTop(record)} />
          </Tooltip>
          <Tooltip title="编辑"><Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} /></Tooltip>
          <Popconfirm title="确定删除此公告？" onConfirm={() => handleDelete(record.id)} okText="删除" cancelText="取消">
            <Tooltip title="删除"><Button type="text" size="small" danger icon={<DeleteOutlined />} /></Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div className="announcement-management">
      <Card bordered={false} className="table-card">
        <div className="page-header">
          <div className="header-left">
            <Title level={4} style={{ margin: 0 }}>公告管理</Title>
            <Text type="secondary" style={{ marginLeft: 12 }}>管理企业公告、活动通知和政策资讯</Text>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            发布公告
          </Button>
        </div>

        {/* 筛选栏 */}
        <div className="filter-bar">
          <Space wrap>
            <Input
              placeholder="搜索标题/内容"
              prefix={<SearchOutlined />}
              value={searchKeyword}
              onChange={e => setSearchKeyword(e.target.value)}
              onPressEnter={() => setPage(1)}
              style={{ width: 220 }}
              allowClear
            />
            <Select placeholder="分类筛选" value={filterCategory || undefined} onChange={v => { setFilterCategory(v || ''); setPage(1); }}
              style={{ width: 120 }} allowClear>
              {CATEGORIES.map(c => <Select.Option key={c.value} value={c.value}>{c.label}</Select.Option>)}
            </Select>
            <Select placeholder="状态筛选" value={filterStatus !== '' ? filterStatus : undefined} onChange={v => { setFilterStatus(v !== undefined ? String(v) : ''); setPage(1); }}
              style={{ width: 120 }} allowClear>
              <Select.Option value="1">已发布</Select.Option>
              <Select.Option value="0">草稿</Select.Option>
            </Select>
            <Button icon={<ReloadOutlined />} onClick={() => { setSearchKeyword(''); setFilterCategory(''); setFilterStatus(''); setPage(1); }}>
              重置
            </Button>
          </Space>
        </div>

        {/* 数据表格 */}
        <Table
          dataSource={data}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize,
            total,
            showTotal: t => `共 ${t} 条`,
            showSizeChanger: true,
            onChange: (p, ps) => { setPage(p); setPageSize(ps); }
          }}
        />
      </Card>

      {/* 编辑/新增弹窗 */}
      <Modal
        title={editingItem ? '编辑公告' : '发布公告'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={720}
        okText={editingItem ? '保存' : '发布'}
        cancelText="取消"
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="title" label="公告标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="请输入公告标题" maxLength={100} showCount />
          </Form.Item>
          <Form.Item name="category" label="分类" rules={[{ required: true, message: '请选择分类' }]}>
            <Select>
              {CATEGORIES.map(c => <Select.Option key={c.value} value={c.value}>{c.label}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="content" label="公告内容" rules={[{ required: true, message: '请输入内容' }]}>
            <TextArea placeholder="请输入公告内容" rows={8} maxLength={10000} showCount />
          </Form.Item>
          <Form.Item name="summary" label="摘要（可选）">
            <TextArea placeholder="不填则自动截取内容前100字" rows={2} maxLength={200} showCount />
          </Form.Item>
          <Form.Item name="author" label="作者">
            <Input placeholder="默认：管理员" maxLength={50} />
          </Form.Item>
          <Form.Item name="published_at" label="发布日期">
            <Input placeholder="如 2026-03-31，不填则默认今天" />
          </Form.Item>
          <Form.Item name="is_top" label="置顶" valuePropName="checked">
            <Switch checkedChildren="是" unCheckedChildren="否" />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select>
              <Select.Option value={1}>立即发布</Select.Option>
              <Select.Option value={0}>存为草稿</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 预览弹窗 */}
      <Modal
        title="公告预览"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={<Button onClick={() => setPreviewVisible(false)}>关闭</Button>}
        width={600}
      >
        {previewItem && (
          <div className="preview-content">
            <div className="preview-header">
              <Tag color={getCategoryInfo(previewItem.category).color}>{getCategoryInfo(previewItem.category).label}</Tag>
              {previewItem.is_top && <Tag color="red">置顶</Tag>}
              <Text type="secondary" style={{ marginLeft: 8 }}>{previewItem.published_at}</Text>
              <Text type="secondary" style={{ marginLeft: 8 }}>{previewItem.view_count || 0}次阅读</Text>
            </div>
            <Title level={4} style={{ marginTop: 16 }}>{previewItem.title}</Title>
            <Text type="secondary">作者：{previewItem.author || '管理员'}</Text>
            <div className="preview-body" style={{ marginTop: 20, whiteSpace: 'pre-wrap', lineHeight: 1.8, color: '#333' }}>
              {previewItem.content}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AnnouncementManagement;
