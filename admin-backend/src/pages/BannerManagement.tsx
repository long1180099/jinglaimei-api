import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Button,
  Table,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  Switch,
  Image,
  message,
  Popconfirm,
  Tooltip,
  Empty,
  Alert,
  Badge,
  InputNumber,
  Divider,
  Upload
} from 'antd';
import type { UploadProps } from 'antd';
import {
  PictureOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  DragOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  ReloadOutlined,
  SaveOutlined,
  LinkOutlined,
  HolderOutlined,
  CloudUploadOutlined,
  OrderedListOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { fetchBanners, createBanner, updateBanner, deleteBanner, batchSortBanners, updateBannerStatus } from '../api/bannerApi';
import './BannerManagement.css';

const { Title, Text, Paragraph } = Typography;

const BannerManagement: React.FC = () => {
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBanner, setEditingBanner] = useState<any>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [form] = Form.useForm();

  // 加载列表
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetchBanners();
      const list = res.data?.list || [];
      setBanners(list.map((b: any) => ({
        ...b,
        status: b.status !== undefined ? b.status : 1
      })));
    } catch (e: any) {
      message.error('加载轮播图失败: ' + (e.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // 打开新增/编辑弹窗
  const openEditModal = (record?: any) => {
    setEditingBanner(record || null);
    if (record) {
      form.setFieldsValue({
        image_url: record.image_url,
        title: record.title || '',
        link_url: record.link_url || '',
        description: record.description || '',
        sort_order: record.sort_order,
        status: record.status !== undefined ? record.status : 1
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ status: 1, sort_order: banners.length + 1 });
    }
    setModalVisible(true);
  };

  // 提交保存
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editingBanner) {
        await updateBanner(editingBanner.id, values);
        message.success('轮播图已更新');
      } else {
        await createBanner(values);
        message.success('轮播图已新增');
      }
      setModalVisible(false);
      fetchData();
    } catch (e: any) {
      if (e.message) message.error('保存失败: ' + e.message);
    }
  };

  // 删除
  const handleDelete = async (id: number) => {
    try {
      await deleteBanner(id);
      message.success('已删除');
      fetchData();
    } catch (e: any) {
      message.error('删除失败');
    }
  };

  // 切换状态
  const handleToggleStatus = async (id: number, currentStatus: number) => {
    try {
      await updateBannerStatus(id, currentStatus === 0 ? 1 : 0);
      message.success(currentStatus === 0 ? '已启用' : '已禁用');
      fetchData();
    } catch (e) {
      message.error('状态切换失败');
    }
  };

  // 预览图片
  const handlePreview = (url: string) => {
    setPreviewImage(url);
    setPreviewVisible(true);
  };

  // 上传轮播图
  const handleBannerUpload = async (options: any) => {
    const { file, onSuccess, onError } = options;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const response = await fetch('/api/products/upload/banner', {
        method: 'POST',
        body: formData,
        headers: { Authorization: localStorage.getItem('jlm_auth_token') || '' }
      });
      const result = await response.json();
      if (result.code === 0 && result.data?.url) {
        // 自动填入图片URL
        form.setFieldsValue({ image_url: result.data.url });
        message.success('上传成功，已自动填充URL');
        onSuccess?.(result);
      } else {
        message.error(result.message || '上传失败');
        onError?.(new Error(result.message));
      }
    } catch (e: any) {
      message.error('上传失败: ' + (e.message || '网络错误'));
      onError?.(e);
    } finally {
      setUploading(false);
    }
  };

  const bannerUploadProps: UploadProps = {
    name: 'file',
    accept: 'image/*',
    showUploadList: false,
    customRequest: handleBannerUpload as any,
    disabled: uploading
  };

  // 表格列定义
  const columns: ColumnsType<any> = [
    {
      title: '排序',
      dataIndex: 'sort_order',
      width: 70,
      align: 'center',
      render: (val: number) => <Text strong style={{ fontSize: 16, color: '#1890ff' }}>#{val}</Text>
    },
    {
      title: '预览',
      dataIndex: 'image_url',
      width: 140,
      render: (url: string) =>
        url ? (
          <div className="banner-thumb-wrap" onClick={() => handlePreview(url)}>
            <Image src={url} width={120} height={56} style={{ borderRadius: 8, objectFit: 'cover' }} fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='56'%3E%3Crect fill='%23f0f0f0' width='120' height='56' rx='4'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999' font-size='12'%E6%97%A0%E5%9B%BE%3C/text%3E%3C/svg%3E" />
          </div>
        ) : <Text type="secondary">无图片</Text>
    },
    {
      title: '标题',
      dataIndex: 'title',
      ellipsis: true,
      render: (t: string) => t || <Text type="secondary">—</Text>
    },
    {
      title: '跳转链接',
      dataIndex: 'link_url',
      ellipsis: true,
      width: 160,
      render: (url: string) =>
        url ? (
          <Tooltip title={url}>
            <a href={url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
              <LinkOutlined /> {url.length > 20 ? url.substring(0, 20) + '...' : url}
            </a>
          </Tooltip>
        ) : <Text type="secondary" disabled>无</Text>
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      align: 'center',
      filters: [
        { text: '启用', value: 1 },
        { text: '禁用', value: 0 },
      ],
      onFilter: (value, record) => record.status === value,
      render: (status: number, record) => (
        <Tag color={status === 1 ? 'green' : 'default'} style={{ cursor: 'pointer' }}
             onClick={() => handleToggleStatus(record.id, status)}>
          {status === 1 ? <><EyeOutlined /> 启用</> : <><EyeInvisibleOutlined /> 禁用</>}
        </Tag>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      align: 'center',
      render: (_, record) => (
        <Space>
          <Tooltip title="编辑">
            <Button type="link" icon={<EditOutlined />} onClick={() => openEditModal(record)} />
          </Tooltip>
          <Popconfirm title="确定删除此轮播图？" onConfirm={() => handleDelete(record.id)} okText="删除" cancelText="取消">
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div className="banner-management-page">
      {/* 头部 */}
      <div className="banner-header">
        <div className="banner-header-left">
          <div className="banner-header-icon"><PictureOutlined /></div>
          <div>
            <Title level={4} style={{ margin: 0 }}>轮播图管理</Title>
            <Text type="secondary">管理小程序首页展示的轮播图内容</Text>
          </div>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} loading={loading} onClick={fetchData}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openEditModal()}>添加轮播图</Button>
        </Space>
      </div>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card size="small" className="stat-card stat-card-total">
            <div className="stat-card-inner">
              <OrderedListOutlined className="stat-icon" />
              <div>
                <div className="stat-value">{banners.length}</div>
                <div className="stat-label">总数量</div>
              </div>
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" className="stat-card stat-card-active">
            <div className="stat-card-inner">
              <EyeOutlined className="stat-icon" />
              <div>
                <div className="stat-value">{banners.filter(b => b.status === 1).length}</div>
                <div className="stat-label">已启用</div>
              </div>
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" className="stat-card stat-card-inactive">
            <div className="stat-card-inner">
              <EyeInvisibleOutlined className="stat-icon" />
              <div>
                <div className="stat-value">{banners.filter(b => b.status === 0).length}</div>
                <div className="stat-label">已禁用</div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 提示信息 */}
      <Alert
        type="info"
        showIcon
        message="轮播图将在小程序首页顶部以 Swiper 轮播形式展示。建议尺寸 750×320px，支持 jpg/png/webp 格式。"
        style={{ marginBottom: 16, borderRadius: 10 }}
      />

      {/* 数据表格 */}
      <Card bodyStyle={{ padding: 0 }} className="banner-table-card">
        <Table
          rowKey="id"
          columns={columns}
          dataSource={banners}
          loading={loading}
          pagination={{ pageSize: 8, size: 'small', showTotal: t => `共 ${t} 条` }}
          locale={{ emptyText: <Empty description="暂无轮播图，点击上方按钮添加" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        />
      </Card>

      {/* 编辑弹窗 */}
      <Modal
        title={
          <Space>
            <PictureOutlined style={{ color: '#1890ff' }} />
            {editingBanner ? '编辑轮播图' : '添加轮播图'}
          </Space>
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSave}
        okText="保存"
        cancelText="取消"
        width={560}
        destroyOnClose
      >
        <Divider style={{ margin: '0 0 24px 0' }} />

        <Form form={form} layout="vertical" initialValues={{ status: 1 }}>
          <Form.Item name="image_url" label="图片地址" rules={[{ required: true, message: '请上传图片或输入图片URL' }]}>
            <Space.Compact style={{ width: '100%' }}>
              <Input prefix={<CloudUploadOutlined />} placeholder="https://example.com/banner.jpg 或点击右侧上传" allowClear style={{ flex: 1 }} />
              <Upload {...bannerUploadProps}>
                <Button icon={uploading ? <ReloadOutlined spin /> : <CloudUploadOutlined />} loading={uploading}>
                  {uploading ? '上传中...' : '上传图片'}
                </Button>
              </Upload>
            </Space.Compact>
          </Form.Item>

          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <Form.Item name="title" label="标题（可选）">
                <Input placeholder="如：新品上市、限时特惠等" maxLength={30} allowClear />
              </Form.Item>
            </div>
            <div style={{ width: 130 }}>
              <Form.Item name="status" label="状态" valuePropName="checked">
                <Switch checkedChildren="启用" unCheckedChildren="禁用" />
              </Form.Item>
            </div>
          </div>

          <Form.Item name="link_url" label="跳转链接（可选）">
            <Input prefix={<LinkOutlined />} placeholder="点击轮播图后的跳转地址" allowClear />
          </Form.Item>

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <Form.Item name="description" label="备注说明">
                <Input.TextArea rows={2} placeholder="内部备注，不会在前端显示" maxLength={100} allowClear />
              </Form.Item>
            </div>
            <div style={{ width: 120 }}>
              <Form.Item name="sort_order" label="排序号" initialValue={1}>
                <InputNumber min={1} max={999} style={{ width: '100%' }} />
              </Form.Item>
            </div>
          </div>
        </Form>

        <Alert
          type="warning"
          showIcon
          message="提示：图片建议使用外部 CDN 链接或服务器上的可访问 URL。小程序端会直接加载此地址。"
          style={{ marginTop: 12, borderRadius: 8 }}
        />
      </Modal>

      {/* 图片预览 */}
      <Image
        style={{ display: 'none' }}
        preview={{
          visible: previewVisible,
          src: previewImage,
          onVisibleChange: (vis) => setPreviewVisible(vis),
        }}
      />
    </div>
  );
};

export default BannerManagement;
