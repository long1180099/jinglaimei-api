/**
 * 视频学习管理组件 - Admin后台
 * 5大功能: 视频列表/分类管理/系列课/订单管理/数据统计
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Tag, Space, Input, Select, Form, Row, Col,
  Statistic, Modal, message, Tabs, Typography, Alert, Empty, Image,
  Popconfirm, Tooltip, Badge, Progress, Descriptions, List, Avatar,
  Upload, Divider, Switch, InputNumber, Radio, DatePicker, Spin,
  Pagination,
} from 'antd';
import {
  VideoCameraOutlined, PlusOutlined, EditOutlined, DeleteOutlined,
  SearchOutlined, ReloadOutlined, EyeOutlined, LikeOutlined,
  ShoppingCartOutlined, BarChartOutlined, AppstoreOutlined,
  FolderOpenOutlined, PlayCircleOutlined, TeamOutlined,
  UploadOutlined, DollarOutlined, CheckCircleOutlined,
  CloseCircleOutlined, StarOutlined, FireOutlined, TrophyOutlined,
  ClockCircleOutlined, BookOutlined, CloudUploadOutlined,
  SettingOutlined, LineChartOutlined,
  PieChartOutlined, UnorderedListOutlined, StopOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { videoCourseApi } from '../../api/schoolApi';

const { Text, Title, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { TabPane } = Tabs;

// ==================== 类型定义 ====================
interface VideoCategory {
  id: number; name: string; icon: string; description: string;
  sort_order: number; status: number; video_count?: number;
}

interface Video {
  id: string; title: string; description: string; cover_url: string;
  video_url: string; duration: number; file_size: number;
  category_id: number; category_name: string; category_name_real?: string;
  series_id: number | null; series_title?: string;
  access_level: string; price: number;
  instructor: string; instructor_avatar: string;
  view_count: number; like_count: number; purchase_count: number;
  tags: any[]; difficulty: string;
  status: number; is_recommend: number; is_top: number;
  sort_order: number; created_at: string; updated_at: string;
}

interface Series {
  id: string; title: string; description: string; cover_url: string;
  category_id: number; category_name: string; category_name_real?: string;
  price: number; original_price: number; access_level: string;
  instructor: string; difficulty: string; tags: any[];
  total_episodes: number; total_duration: number;
  view_count: number; purchase_count: number; student_count: number;
  status: number; is_recommend: number; sort_order: number;
  active_episodes?: number; episodes?: Video[];
}

interface VideoOrder {
  id: number; order_no: string; user_id: number; target_type: string;
  target_id: number; target_title: string; amount: number;
  payment_method: string; status: string; paid_at: string;
  buyer_name?: string; avatar_url?: string;
}

// ==================== 格式化工具 ====================
const formatDuration = (seconds: number) => {
  if (!seconds) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0 ? `${h}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}` : `${m}:${s.toString().padStart(2,'0')}`;
};

const formatFileSize = (bytes: number) => {
  if (!bytes || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes, unitIdx = 0;
  while (size >= 1024 && unitIdx < units.length - 1) { size /= 1024; unitIdx++; }
  return `${size.toFixed(1)} ${units[unitIdx]}`;
};

const ACCESS_LEVEL_OPTIONS = [
  { label: '全部可见', value: 'all' },
  { label: '会员及以上', value: '1' },
  { label: '打版代言人+', value: '2' },
  { label: '代理商+', value: '3' },
  { label: '批发商+', value: '4' },
  { label: '首席分公司+', value: '5' },
  { label: '仅管理员', value: '6' },
];

const DIFFICULTY_OPTIONS = [
  { label: '入门', value: 'beginner' },
  { label: '初级', value: 'elementary' },
  { label: '中级', value: 'intermediate' },
  { label: '高级', value: 'advanced' },
  { label: '专家', value: 'expert' },
];

// ==================== 主组件 ====================
const VideoManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('videos');
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<VideoCategory[]>([]);
  const [statsData, setStatsData] = useState<any>(null);

  // 加载分类（多处使用）
  const loadCategories = useCallback(() => {
    videoCourseApi.getCategories().then((res: any) => {
      if (res.data) setCategories(res.data);
    }).catch(console.error);
  }, []);

  // 加载统计数据
  const loadStats = useCallback(() => {
    videoCourseApi.getStats().then((res: any) => {
      if (res.data) setStatsData(res.data);
    }).catch(console.error);
  }, []);

  useEffect(() => { loadCategories(); loadStats(); }, [loadCategories, loadStats]);

  return (
    <div className="video-management">
      {/* 统计概览卡片 */}
      {statsData && statsData.overview && (
        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="视频总数"
                value={statsData.overview.totalVideos}
                prefix={<VideoCameraOutlined />}
                suffix="个"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="系列课"
                value={statsData.overview.totalSeries}
                prefix={<BookOutlined />}
                suffix="套"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="总播放量"
                value={statsData.overview.totalViews}
                prefix={<EyeOutlined />}
                style={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="总收入"
                prefix={<DollarOutlined />}
                value={statsData.overview.totalRevenue}
                precision={2}
                suffix="元"
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Tab切换 */}
      <Card bodyStyle={{ padding: 0 }}>
        <Tabs activeKey={activeTab} onChange={setActiveTab} type="card" size="middle">
          <TabPane tab={<span><VideoCameraOutlined /> 视频管理</span>} key="videos" />
          <TabPane tab={<span><FolderOpenOutlined /> 分类管理</span>} key="categories" />
          <TabPane tab={<span><AppstoreOutlined /> 系列课</span>} key="series" />
          <TabPane tab={<span><ShoppingCartOutlined /> 订单记录</span>} key="orders" />
          <TabPane tab={<span><BarChartOutlined /> 数据统计</span>} key="statistics" />
        </Tabs>

        <div style={{ padding: 16 }}>
          {activeTab === 'videos' && (
            <VideoListPanel categories={categories} onRefresh={() => { loadCategories(); loadStats(); }} />
          )}
          {activeTab === 'categories' && (
            <CategoryPanel categories={categories} onRefresh={loadCategories} />
          )}
          {activeTab === 'series' && (
            <SeriesPanel categories={categories} onRefresh={() => { loadCategories(); loadStats(); }} />
          )}
          {activeTab === 'orders' && <OrdersPanel />}
          {activeTab === 'statistics' && <StatsPanel statsData={statsData} onRefresh={loadStats} />}
        </div>
      </Card>
    </div>
  );
};

// ==================== 1. 视频列表面板 ====================

interface PanelProps {
  categories: VideoCategory[];
  onRefresh?: () => void;
}

const VideoListPanel: React.FC<PanelProps> = ({ categories, onRefresh }) => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();

  // 视频表单Modal
  const [formVisible, setFormVisible] = useState(false);
  const [editVideo, setEditVideo] = useState<Video | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [form] = Form.useForm();

  const loadVideos = useCallback(() => {
    setLoading(true);
    const params: any = { page, pageSize };
    if (keyword) params.keyword = keyword;
    if (categoryId) params.category_id = categoryId;
    if (statusFilter !== undefined) params.status = statusFilter;

    videoCourseApi.getVideos(params).then((res: any) => {
      if (res.data) {
        setVideos(res.data.list || []);
        setTotal(res.data.total || 0);
      }
    }).finally(() => setLoading(false));
  }, [page, pageSize, keyword, categoryId, statusFilter]);

  useEffect(() => { loadVideos(); }, [loadVideos]);

  // 删除视频
  const handleDelete = (id: string) => {
    videoCourseApi.deleteVideo(id).then(() => {
      message.success('删除成功');
      loadVideos();
      onRefresh?.();
    });
  };

  // 切换状态
  const handleToggleStatus = (id: string) => {
    videoCourseApi.toggleVideoStatus(id).then(() => {
      message.success('状态已更新');
      loadVideos();
    });
  };

  // 打开编辑弹窗
  const openEdit = (video?: Video | null) => {
    setEditVideo(video || null);
    if (video) {
      form.setFieldsValue({
        ...video,
        tags: Array.isArray(video.tags) ? video.tags.join(',') : '',
      });
    } else {
      form.resetFields();
    }
    setFormVisible(true);
  };

  // 提交表单（更新，不含文件）
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      values.tags = values.tags ? values.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [];
      setFormLoading(true);

      if (editVideo?.id) {
        await videoCourseApi.updateVideo(editVideo.id, values);
        message.success('更新成功');
      }
      setFormVisible(false);
      loadVideos();
      onRefresh?.();
    } catch (e: any) {
      if (e.errorFields) return;
      message.error(e.message || '操作失败');
    } finally {
      setFormLoading(false);
    }
  };

  // 文件上传+创建视频
  const handleCreateWithFile = async (file: File) => {
    try {
      const values = await form.validateFields();
      values.tags = values.tags ? values.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [];
      setFormLoading(true);

      await videoCourseApi.createVideoWithFile(file, values);
      message.success('视频上传并创建成功');
      setFormVisible(false);
      form.resetFields();
      loadVideos();
      onRefresh?.();
    } catch (e: any) {
      if (e.errorFields) return;
      message.error(e.message || '上传失败');
    } finally {
      setFormLoading(false);
    }
  };

  const columns = [
    {
      title: '封面',
      dataIndex: 'cover_url',
      width: 80,
      render: (url: string) =>
        url ? <Image src={`/api${url}`} width={60} height={40} style={{ borderRadius: 4, objectFit: 'cover' }} fallback="/placeholder.png" /> :
          <div style={{width:60,height:40,background:'#f5f5f5',borderRadius:4,display:'flex',alignItems:'center',justifyContent:'center'}}><PlayCircleOutlined /></div>,
    },
    { title: '标题', dataIndex: 'title', ellipsis: true, width: 180 },
    {
      title: '分类', dataIndex: 'category_name_real', width: 100,
      render: (name: string, r: Video) => name || r.category_name || '-',
    },
    { title: '时长', dataIndex: 'duration', width: 80, render: (s: number) => formatDuration(s) },
    {
      title: '价格', dataIndex: 'price', width: 80,
      render: (p: number) => p > 0 ? `¥${p}` : <Tag color="green">免费</Tag>,
    },
    { title: '讲师', dataIndex: 'instructor', width: 80, ellipsis: true },
    { title: '播放', dataIndex: 'view_count', width: 70, sorter: true },
    { title: '购买', dataIndex: 'purchase_count', width: 70 },
    {
      title: '权限', dataIndex: 'access_level', width: 90,
      render: (lv: string) => {
        const opt = ACCESS_LEVEL_OPTIONS.find(o => o.value === lv);
        return <Tag>{opt?.label || lv}</Tag>;
      },
    },
    {
      title: '状态', dataIndex: 'status', width: 80,
      render: (st: number) =>
        st === 1 ? <Tag color="success">上架</Tag> : <Tag color="default">下架</Tag>,
    },
    {
      title: '操作', width: 200, fixed: 'right' as const,
      render: (_: any, record: Video) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>编辑</Button>
          <Popconfirm title="确定删除此视频？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
          <Switch
            size="small"
            checked={record.status === 1}
            onChange={() => handleToggleStatus(record.id)}
            checkedChildren="上架" unCheckedChildren="下架"
          />
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* 搜索栏 */}
      <Row gutter={12} style={{ marginBottom: 16 }}>
        <Col flex="auto">
          <Input.Search
            placeholder="搜索视频标题、描述、讲师..."
            allowClear
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onSearch={() => setPage(1)}
            enterButton={<><SearchOutlined /> 搜索</>}
            style={{ maxWidth: 400 }}
          />
        </Col>
        <Col>
          <Select placeholder="全部分类" allowClear style={{ width: 140 }} value={categoryId}
            onChange={(v) => { setCategoryId(v); setPage(1); }}>
            {categories.map(c => <Option key={c.id} value={c.id}>{c.icon} {c.name}</Option>)}
          </Select>
        </Col>
        <Col>
          <Select placeholder="全部状态" allowClear style={{ width: 100 }} value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <Option value={1}>上架</Option>
            <Option value={0}>下架</Option>
          </Select>
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openEdit(null)}>
            上传视频
          </Button>
        </Col>
        <Col>
          <Button icon={<ReloadOutlined />} onClick={loadVideos}>刷新</Button>
        </Col>
      </Row>

      {/* 表格 */}
      <Table
        rowKey="id"
        columns={columns}
        dataSource={videos}
        loading={loading}
        pagination={{
          current: page, pageSize, total, showSizeChanger: true, showTotal: (t) => `共${t}条`,
          onChange: (p, ps) => { setPage(p); setPageSize(ps); },
        }}
        scroll={{ x: 1200 }}
        size="middle"
      />

      {/* 创建/编辑弹窗 */}
      <Modal
        title={editVideo?.id ? '编辑视频' : '上传新视频'}
        open={formVisible}
        onCancel={() => setFormVisible(false)}
        footer={null}
        width={700}
        destroyOnClose
      >
        <Spin spinning={formLoading}>
          <Form form={form} layout="vertical">
            {!editVideo?.id && (
              <Alert type="info" showIcon message="请选择视频文件后填写信息，支持 MP4/MOV/AVI/MKV/WebM，最大500MB" style={{ marginBottom: 16 }} />
            )}

            <Row gutter={16}>
              <Col span={16}>
                <Form.Item name="title" label="视频标题" rules={[{ required: true, message: '请输入标题' }]}>
                  <Input placeholder="输入视频标题" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="instructor" label="讲师名称">
                  <Input placeholder="讲师" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="description" label="描述">
              <TextArea rows={2} placeholder="视频简介..." />
            </Form.Item>

            {!editVideo?.id && (
              <Form.Item label="视频文件" required>
                <Upload.Dragger
                  accept=".mp4,.mov,.avi,.mkv,.webm"
                  maxCount={1}
                  beforeUpload={(file) => { handleCreateWithFile(file); return false; }}
                  showUploadList={false}
                >
                  <p className="ant-upload-drag-icon"><CloudUploadOutlined /></p>
                  <p>点击或拖拽视频到此处上传</p>
                  <p style={{ fontSize: 12 }}>最大500MB，MP4格式推荐</p>
                </Upload.Dragger>
              </Form.Item>
            )}

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="category_id" label="分类">
                  <Select placeholder="选择分类">
                    {categories.map(c => <Option key={c.id} value={c.id}>{c.icon} {c.name}</Option>)}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="access_level" label="查看权限">
                  <Select placeholder="默认全部可见">
                    {ACCESS_LEVEL_OPTIONS.map(o => <Option key={o.value} value={o.value}>{o.label}</Option>)}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="price" label="价格(¥)">
                  <InputNumber min={0} step={0.01} placeholder="0=免费" style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="difficulty" label="难度等级">
                  <Select placeholder="入门">
                    {DIFFICULTY_OPTIONS.map(o => <Option key={o.value} value={o.value}>{o.label}</Option>)}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="duration" label="时长(秒)">
                  <InputNumber min={0} style={{ width: '100%' }} placeholder="自动获取" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="cover_url" label="封面URL">
                  <Input placeholder="或手动输入URL" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="is_recommend" label="推荐">
                  <Switch checkedChildren="是" unCheckedChildren="否" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="is_top" label="置顶">
                  <Switch checkedChildren="是" unCheckedChildren="否" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="tags" label="标签">
                  <Input placeholder="逗号分隔，如: 销售,话术,破冰" />
                </Form.Item>
              </Col>
            </Row>

            {editVideo?.id && (
              <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
                <Space>
                  <Button onClick={() => setFormVisible(false)}>取消</Button>
                  <Button type="primary" loading={formLoading} onClick={handleSubmit}>保存修改</Button>
                </Space>
              </Form.Item>
            )}
          </Form>
        </Spin>
      </Modal>
    </div>
  );
};

// ==================== 2. 分类管理面板 ====================

const CategoryPanel: React.FC<{ categories: VideoCategory[]; onRefresh: () => void }> =
({ categories, onRefresh }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [editCat, setEditCat] = useState<VideoCategory | null>(null);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const openModal = (cat?: VideoCategory | null) => {
    setEditCat(cat || null);
    form.setFieldsValue(cat ? { name: cat.name, icon: cat.icon, description: cat.description, sort_order: cat.sort_order } : {});
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      if (editCat?.id) {
        await videoCourseApi.updateCategory(editCat.id, values);
        message.success('分类已更新');
      } else {
        await videoCourseApi.createCategory(values);
        message.success('分类已创建');
      }
      setModalVisible(false);
      onRefresh();
    } catch (e) { /* */ } finally { setLoading(false); }
  };

  const handleDelete = (id: number) => {
    videoCourseApi.deleteCategory(id).then(() => { message.success('已删除'); onRefresh(); })
      .catch((err: any) => message.error(err.response?.data?.message || '删除失败'));
  };

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Title level={5} style={{ margin: 0 }}><FolderOpenOutlined /> 视频分类 ({categories.length})</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>新增分类</Button>
      </Row>

      <List
        grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4, xl: 4 }}
        dataSource={categories}
        renderItem={item => (
          <List.Item>
            <Card
              size="small"
              hoverable
              actions={[
                <EditOutlined key="edit" onClick={() => openModal(item)} />,
                <Popconfirm key="del" title={`确定删除「${item.name}」？`} onConfirm={() => handleDelete(item.id)}>
                  <DeleteOutlined style={{ color: '#ff4d4f' }} />
                </Popconfirm>,
              ]}
            >
              <Card.Meta
                avatar={<Avatar size={48} shape="square" style={{ fontSize: 28 }}>{item.icon || '📁'}</Avatar>}
                title={<Text strong>{item.name}</Text>}
                description={
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>{item.description || '暂无描述'}</Text>
                    <br/>
                    <Tag color="blue">{item.video_count || 0} 个视频</Tag>
                  </div>
                }
              />
            </Card>
          </List.Item>
        )}
      />

      <Modal
        title={editCat?.id ? '编辑分类' : '新增分类'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        confirmLoading={loading}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="分类名称" rules={[{ required: true }]}>
            <Input placeholder="例: 产品培训" />
          </Form.Item>
          <Form.Item name="icon" label="图标Emoji">
            <Input placeholder="例: 📦" maxLength={2} />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input placeholder="简短描述" />
          </Form.Item>
          <Form.Item name="sort_order" label="排序">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

// ==================== 3. 系列课面板 ====================

const SeriesPanel: React.FC<PanelProps> = ({ categories, onRefresh }) => {
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [detailVisible, setDetailVisible] = useState(false);
  const [currentSeries, setCurrentSeries] = useState<Series | null>(null);

  // 新建/编辑系列课Modal
  const [formVisible, setFormVisible] = useState(false);
  const [editSeries, setEditSeries] = useState<Series | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [form] = Form.useForm();

  const loadSeries = useCallback(() => {
    setLoading(true);
    videoCourseApi.getSeriesList({ page, pageSize: 10 }).then((res: any) => {
      if (res.data) { setSeriesList(res.data.list || []); setTotal(res.data.total || 0); }
    }).finally(() => setLoading(false));
  }, [page]);

  useEffect(() => { loadSeries(); }, [loadSeries]);

  const handleViewDetail = (s: Series) => {
    videoCourseApi.getSeriesDetail(s.id).then((res: any) => {
      setCurrentSeries(res.data); setDetailVisible(true);
    });
  };

  const handleDelete = (id: string) => {
    videoCourseApi.deleteSeries(id).then(() => {
      message.success('系列课已删除');
      loadSeries(); onRefresh?.();
    });
  };

  const openFormModal = (s?: Series | null) => {
    setEditSeries(s || null);
    if (s) {
      form.setFieldsValue({
        ...s,
        tags: Array.isArray(s.tags) ? s.tags.join(',') : '',
      });
    } else { form.resetFields(); }
    setFormVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      values.tags = values.tags ? values.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [];
      setFormLoading(true);
      if (editSeries?.id) {
        await videoCourseApi.updateSeries(editSeries.id, values);
        message.success('系列课已更新');
      } else {
        await videoCourseApi.createSeries(values);
        message.success('系列课已创建');
      }
      setFormVisible(false); loadSeries(); onRefresh?.();
    } catch (e: any) {
      if (!e.errorFields) message.error(e.message || '操作失败');
    } finally { setFormLoading(false); }
  };

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Title level={5} style={{ margin: 0 }}><AppstoreOutlined /> 系列课程 ({total})</Title>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openFormModal()}>新建系列课</Button>
          <Button icon={<ReloadOutlined />} onClick={loadSeries} />
        </Space>
      </Row>

      <List
        grid={{ gutter: 16, xs: 1, sm: 2, md: 3 }}
        loading={loading}
        dataSource={seriesList}
        renderItem={item => (
          <List.Item>
            <Card
              hoverable
              cover={item.cover_url ?
                <Image src={`/api${item.cover_url}`} height={140} preview={false}
                  style={{ objectFit: 'cover' }} fallback="/placeholder.png" /> :
                <div style={{height:140,background:'#f5f5f5',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <PlayCircleOutlined style={{fontSize:48,color:'#ccc'}} /></div>
              }
              actions={[
                <a key="view" onClick={() => handleViewDetail(item)}><EyeOutlined /> 查看</a>,
                <a key="edit" onClick={() => openFormModal(item)}><EditOutlined /> 编辑</a>,
                <Popconfirm key="del" title="确定删除？将同时删除所有剧集！" onConfirm={() => handleDelete(item.id)}>
                  <a style={{color:'#ff4d4f'}}><DeleteOutlined /> 删除</a>
                </Popconfirm>,
              ]}
            >
              <Meta
                title={<Text strong ellipsis>{item.title}</Text>}
                description={
                  <>
                    <Tag color={item.price > 0 ? 'orange' : 'green'}>
                      {item.price > 0 ? `¥${item.price}` : '免费'}
                    </Tag>
                    <Tag>{item.total_episodes || 0}集</Tag>
                    <Tag>{formatDuration(item.total_duration)}</Tag>
                    <div style={{ marginTop: 4 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {item.instructor} · {item.student_count || 0}人学习
                      </Text>
                    </div>
                  </>
                }
              />
            </Card>
          </List.Item>
        )}
      />

      {/* 分页 */}
      {total > 10 && (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Pagination current={page} total={100} pageSize={10} onChange={setPage} />
        </div>
      )}

      {/* 详情弹窗 - 剧集列表 */}
      <Modal
        title={currentSeries?.title + ' - 课程详情'}
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        width={800}
        footer={null}
        destroyOnClose
      >
        {currentSeries && (
          <div>
            <Descriptions column={3} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="集数">{currentSeries.episodes?.length || currentSeries.total_episodes}集</Descriptions.Item>
              <Descriptions.Item label="价格">{currentSeries.price > 0 ? `¥${currentSeries.price}` : '免费'}</Descriptions.Item>
              <Descriptions.Item label="讲师">{currentSeries.instructor || '-'}</Descriptions.Item>
              <Descriptions.Item label="购买人数">{currentSeries.purchase_count}</Descriptions.Item>
              <Descriptions.Item label="学员数">{currentSeries.student_count}</Descriptions.Item>
              <Descriptions.Item label="播放量">{currentSeries.view_count}</Descriptions.Item>
            </Descriptions>

            <Title level={5}>剧集列表</Title>
            <Table
              rowKey="id"
              dataSource={currentSeries.episodes || []}
              columns={[
                { title: '#', width: 50, render: (_:any, __:any, i:number) => i+1 },
                { title: '标题', dataIndex: 'title', ellipsis: true },
                { title: '时长', dataIndex: 'duration', render: (s:number) => formatDuration(s), width: 90 },
                { title: '播放', dataIndex: 'view_count', width: 70 },
                { title: '状态', dataIndex: 'status', width: 70, render:(s:number)=><Tag color={s?'success':'default'}>{s?'上架':'下架'}</Tag> },
              ]}
              pagination={false}
              size="small"
            />
          </div>
        )}
      </Modal>

      {/* 新建/编辑系列课 */}
      <Modal title={editSeries?.id ? '编辑系列课' : '新建系列课'} open={formVisible}
        onOk={handleSubmit} onCancel={() => setFormVisible(false)} confirmLoading={formLoading} width={600}>
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="系列课名称" rules={[{ required: true }]}>
            <Input placeholder="例: 新人七天特训营" />
          </Form.Item>
          <Form.Item name="description" label="课程简介"><TextArea rows={3} /></Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="category_id" label="所属分类">
                <Select placeholder="选分类">{categories.map(c=><Option key={c.id} value={c.id}>{c.icon}{c.name}</Option>)}</Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="price" label="价格(¥)"><InputNumber min={0} step={0.01} style={{width:'100%'}} /></Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}><Form.Item name="instructor" label="讲师"><Input /></Form.Item></Col>
            <Col span={8}><Form.Item name="difficulty" label="难度">
              <Select>{DIFFICULTY_OPTIONS.map(o=><Option key={o.value}>{o.label}</Option>)}</Select>
            </Form.Item></Col>
            <Col span={8}><Form.Item name="access_level" label="查看权限">
              <Select>{ACCESS_LEVEL_OPTIONS.map(o=><Option key={o.value}>{o.label}</Option>)}</Select>
            </Form.Item></Col>
          </Row>
          <Form.Item name="tags" label="标签"><Input placeholder="逗号分隔" /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

const Meta = Card.Meta;

// ==================== 4. 订单面板 ====================

const OrdersPanel: React.FC = () => {
  const [orders, setOrders] = useState<VideoOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();

  const load = useCallback(() => {
    setLoading(true);
    videoCourseApi.getOrders({ page, pageSize: 15, status: statusFilter }).then((res: any) => {
      if (res.data) { setOrders(res.data.list || []); setTotal(res.data.total || 0); }
    }).finally(() => setLoading(false));
  }, [page, statusFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Title level={5} style={{ margin: 0 }}><ShoppingCartOutlined /> 购买订单</Title>
        <Space>
          <Select placeholder="全部状态" allowClear style={{ width: 120 }} value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <Option value="paid">已支付</Option>
            <Option value="pending">待支付</Option>
            <Option value="refunded">已退款</Option>
          </Select>
          <Button icon={<ReloadOutlined />} onClick={load} />
        </Space>
      </Row>
      <Table
        rowKey="id"
        dataSource={orders}
        loading={loading}
        pagination={{ current: page, pageSize: 15, total, onChange: setPage }}
        size="middle"
        columns={[
          { title: '订单号', dataIndex: 'order_no', width: 200, ellipsis: true },
          {
            title: '买家', width: 120,
            render: (_, r) => <Space><Avatar size={24} src={r.avatar_url} icon={<UserOutlined />} />{r.buyer_name || `用户#${r.user_id}`}</Space>,
          },
          { title: '内容', dataIndex: 'target_title', ellipsis: true, width: 150 },
          { title: '类型', dataIndex: 'target_type', width: 80, render: (t:string) => t==='video'?<Tag color="blue">视频</Tag>:<Tag color="purple">系列课</Tag> },
          { title: '金额', dataIndex: 'amount', width: 80, render: (a:number)=>`¥${Number(a||0).toFixed(2)}` },
          { title: '状态', dataIndex: 'status', width: 80,
            render: (s:string) => s==='paid'?<Tag color="success">已付</Tag>:s==='pending'?<Tag color="warning">待付</Tag>:<Tag>{s}</Tag>
          },
          { title: '时间', dataIndex: 'paid_at', width: 160,
            render: (t:string) => t?new Date(t).toLocaleString():'-'
          },
        ]}
      />
    </div>
  );
};

// ==================== 5. 数据统计面板 ====================

const StatsPanel: React.FC<{ statsData: any; onRefresh: () => void }> = ({ statsData, onRefresh }) => {
  if (!statsData) return <Empty description="加载中..." />;

  const { overview, topVideos, categoryStats, weeklyTrend } = statsData;

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Title level={5} style={{ margin: 0 }}><BarChartOutlined /> 数据统计</Title>
        <Button icon={<ReloadOutlined />} onClick={onRefresh}>刷新</Button>
      </Row>

      {/* 核心指标 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {[
          { title: '今日播放', value: overview.todayViews || 0, icon: <FireOutlined />, color: '#faad14' },
          { title: '今日订单', value: overview.todayOrders || 0, icon: <ShoppingCartOutlined />, color: '#1890ff' },
          { title: '今日收入', value: `¥${(overview.todayRevenue || 0).toFixed(2)}`, icon: <DollarOutlined />, color: '#52c41a' },
          { title: '学习人数', value: overview.learnerCount || 0, icon: <TeamOutlined />, color: '#722ed1' },
        ].map((item, idx) => (
          <Col key={idx} xs={12} sm={6}>
            <Card size="small">
              <Statistic title={item.title} value={item.value} prefix={item.icon}
                valueStyle={{ color: item.color, fontSize: 22 }} />
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={16}>
        {/* 热门视频 TOP10 */}
        <Col xs={24} lg={14}>
          <Card title={<span><TrophyOutlined /> 热门视频 TOP10</span>} size="small">
            <List
              dataSource={topVideos || []}
              renderItem={(v: any, idx: number) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<Badge count={idx + 1} style={{ backgroundColor: idx < 3 ? '#faad14' : '#999' }} />}
                    title={v.title}
                    description={
                      <Space split="-">
                        <span><EyeOutlined /> {v.view_count || 0}</span>
                        <span><LikeOutlined /> {v.like_count || 0}</span>
                        <span><ShoppingCartOutlined /> {v.purchase_count || 0}</span>
                      </Space>
                    }
                  />
                </List.Item>
              )}
              locale={{ emptyText: '暂无数据' }}
            />
          </Card>
        </Col>

        {/* 分类统计 */}
        <Col xs={24} lg={10}>
          <Card title={<span><PieChartOutlined /> 分类分布</span>} size="small">
            {(categoryStats || []).length > 0 ? (
              categoryStats.map((cs: any) => (
                <div key={cs.category_name} style={{ marginBottom: 12 }}>
                  <Row justify="space-between" align="middle">
                    <Text>{cs.category_name || '未分类'}</Text>
                    <Text type="secondary">{cs.video_count || 0}个视频</Text>
                  </Row>
                  <Progress percent={Math.round((cs.video_count / (overview.totalVideos || 1)) * 100)}
                    strokeColor={['#1890ff','#52c41a','#faad14','#722ed1'][Math.floor(Math.random()*4)]} />
                </div>
              ))
            ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无分类数据" />}
          </Card>
        </Col>
      </Row>

      {/* 7日趋势 */}
      {weeklyTrend && weeklyTrend.length > 0 && (
        <Card title={<span><LineChartOutlined /> 近7天学习趋势</span>} size="small" style={{ marginTop: 16 }}>
          {weeklyTrend.map((day: any) => (
            <div key={day.date} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '6px 0' }}>
              <Text style={{ minWidth: 80 }}>{day.date}</Text>
              <Progress
                percent={Math.min(100, Math.round(day.total_watch_seconds / 600))}
                format={() => `${Math.round(day.total_watch_seconds / 60)}分钟`}
                style={{ flex: 1 }}
                strokeColor="#1890ff"
              />
              <Badge count={`${day.active_users}人`} style={{ backgroundColor: '#52c41a' }} />
            </div>
          ))}
        </Card>
      )}
    </div>
  );
};

export default VideoManagement;
