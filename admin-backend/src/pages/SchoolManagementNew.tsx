// 商学院管理页面 - 现代化重新设计 (API集成版)
import React, { useState, useEffect, useRef } from 'react';
import BookManagement from '../components/school/BookManagement';
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
  Empty,
  List,
  Rate,
  Switch,
  Upload,
  Image,
  Spin,
  Skeleton
} from 'antd';
import {
  BookOutlined,
  VideoCameraOutlined,
  FileTextOutlined,
  TrophyOutlined,
  EyeOutlined,
  LikeOutlined,
  CommentOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  CrownOutlined,
  StarOutlined,
  CloudUploadOutlined,
  DownloadOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  SearchOutlined,
  FilterOutlined,
  SortAscendingOutlined,
  ReloadOutlined,
  PlusOutlined,
  MoreOutlined,
  SettingOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FileImageOutlined,
  FileZipOutlined,
  CheckOutlined,
  CloseOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  RetweetOutlined,
  InfoCircleOutlined,
  QuestionCircleOutlined,
  UserOutlined,
  HomeOutlined,
  ShoppingOutlined,
  BarChartOutlined,
  LineChartOutlined,
  PieChartOutlined,
  DashboardOutlined,
  AppstoreOutlined,
  GlobalOutlined,
  LockOutlined,
  UnlockOutlined,
  EyeInvisibleOutlined,
  CalendarOutlined,
  NotificationOutlined,
  MailOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  IdcardOutlined,
  SolutionOutlined,
  AuditOutlined,
  SafetyOutlined,
  RocketOutlined,
  FireOutlined,
  HeartOutlined,
  SmileOutlined,
  MehOutlined,
  FrownOutlined,
  ThunderboltOutlined,
  BulbOutlined,
  ExperimentOutlined,
  GiftOutlined,
  TrophyFilled,
  StarFilled,
  HeartFilled,
  FireFilled
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import type { MenuProps } from 'antd';
import dayjs from 'dayjs';
import './SchoolManagement.css';
import PersonalityScriptSection from '../components/PersonalityScriptSection';
import VideoManagement from '../components/school/VideoManagement';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchBooks,
  fetchBookById,
  createBook,
  updateBook,
  deleteBook,
  toggleBookRecommendation,
  fetchScripts,
  fetchLearningStatistics,
  fetchActionLogs,
  fetchPointsRecords,
  fetchSchoolStats,
  fetchVideos
} from '../store/slices/schoolSlice';
import { fetchUsers } from '../store/slices/userSlice';
import { success, error, loading, destroyAllMessages } from '../utils/feedbackUtils';
import LoadingOverlay from '../components/LoadingOverlay';
import { bookApi } from '../api/schoolApi';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { Search } = Input;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;
const { Step } = Steps;

// 格式化文件大小
const formatFileSize = (size: number | string | undefined): string => {
  if (!size || isNaN(Number(size))) return '-';
  const bytes = Number(size);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// 电子书类型定义
interface EBook {
  id: string;
  title: string;
  author: string;
  description: string;
  category: string;
  fileSize: string;
  fileFormat: string;
  downloadCount: number;
  rating: number;
  status: 'active' | 'inactive' | 'archived';
  isRecommended: boolean;
  coverUrl: string;
  uploadDate: string;
  lastUpdated: string;
}

// 视频教程类型定义
interface VideoTutorial {
  id: string;
  title: string;
  category: string;
  duration: string;
  views: number;
  likes: number;
  status: 'published' | 'draft' | 'scheduled';
  thumbnailUrl: string;
  uploadDate: string;
}

// 话术脚本类型定义
interface ScriptTemplate {
  id: string;
  title: string;
  scenario: string;
  content: string;
  useCount: number;
  successRate: number;
  tags: string[];
  createdBy: string;
  createDate: string;
}

const SchoolManagementNew: React.FC = () => {
  // 状态管理
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isUploadModalVisible, setIsUploadModalVisible] = useState(false);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [selectedEBook, setSelectedEBook] = useState<EBook | null>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const pendingFileRef = useRef<File | null>(null); // 保存选中的原始File对象, 不受Upload状态影响
  const [uploadForm] = Form.useForm();
  const [isLoading, setIsLoading] = useState(false);
  const [sortField, setSortField] = useState<string>('uploadDate');
  const [sortOrder, setSortOrder] = useState<'ascend' | 'descend'>('descend');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  
  // Redux状态
  const dispatch = useAppDispatch();
  const {
    books,
    videos,
    scripts,
    actionLogs,
    pointsRecords,
    operationLoading
  } = useAppSelector((state) => state.school);
  const { users } = useAppSelector((state) => state.user);

  // 使用Redux真实数据替代假数据
  const { books: rawBooks, booksLoading } = useAppSelector((state) => state.school);
  const ebooks = (rawBooks || []) as any[]; // 兼容EBook类型接口

  const [videoTutorials, setVideoTutorials] = useState<VideoTutorial[]>([
    {
      id: '1',
      title: '产品展示技巧',
      category: '销售技巧',
      duration: '15:30',
      views: 2345,
      likes: 156,
      status: 'published',
      thumbnailUrl: '/images/video1.jpg',
      uploadDate: '2024-03-10'
    },
    {
      id: '2',
      title: '客户沟通艺术',
      category: '沟通技巧',
      duration: '22:15',
      views: 1890,
      likes: 123,
      status: 'published',
      thumbnailUrl: '/images/video2.jpg',
      uploadDate: '2024-03-05'
    },
    {
      id: '3',
      title: '团队激励方法',
      category: '团队管理',
      duration: '18:45',
      views: 1456,
      likes: 98,
      status: 'draft',
      thumbnailUrl: '/images/video3.jpg',
      uploadDate: '2024-03-12'
    }
  ]);

  const [scriptTemplates, setScriptTemplates] = useState<ScriptTemplate[]>([
    {
      id: '1',
      title: '首次接触客户话术',
      scenario: '初次接触',
      content: '您好，我是静莱美的代理商，很高兴认识您...',
      useCount: 345,
      successRate: 85,
      tags: ['首次接触', '破冰'],
      createdBy: '张经理',
      createDate: '2024-02-20'
    },
    {
      id: '2',
      title: '产品介绍标准话术',
      scenario: '产品介绍',
      content: '我们的产品采用天然原料，具有以下特点...',
      useCount: 567,
      successRate: 92,
      tags: ['产品介绍', '特点'],
      createdBy: '李主管',
      createDate: '2024-02-25'
    },
    {
      id: '3',
      title: '处理客户异议话术',
      scenario: '异议处理',
      content: '我理解您的顾虑，很多客户最初也有同样的疑问...',
      useCount: 234,
      successRate: 78,
      tags: ['异议处理', '客户疑虑'],
      createdBy: '王顾问',
      createDate: '2024-03-05'
    }
  ]);

  // 初始化数据
  useEffect(() => {
    loadData();
  }, []);

  // 加载数据函数
  const loadData = async () => {
    try {
      setIsLoading(true);
      // 加载所有相关数据
      await Promise.all([
        dispatch(fetchBooks({})),
        dispatch(fetchVideos({})),
        dispatch(fetchScripts({})),
        dispatch(fetchLearningStatistics('')),
        dispatch(fetchSchoolStats()),
        dispatch(fetchUsers({}))
      ]);
    } catch (err) {
      console.error('加载数据失败:', err);
      error('加载数据失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 电子书表格列定义
  const ebookColumns: ColumnsType<EBook> = [
    {
      title: '封面',
      dataIndex: 'coverUrl',
      key: 'cover',
      width: 80,
      render: (url: string) => (
        <div style={{ width: 50, height: 70 }}>
          {url ? (
            <img 
              src={url} 
              alt="封面" 
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4 }}
            />
          ) : (
            <div style={{ 
              width: '100%', 
              height: '100%', 
              backgroundColor: '#f0f0f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 4
            }}>
              <BookOutlined style={{ fontSize: 20, color: '#999' }} />
            </div>
          )}
        </div>
      )
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      sorter: true,
      render: (text: string, record: EBook) => (
        <div>
          <div style={{ fontWeight: 500 }}>{text}</div>
          <div style={{ fontSize: 12, color: '#999' }}>
            {record.author} · {record.category}
          </div>
        </div>
      )
    },
    {
      title: '格式/大小',
      dataIndex: 'fileFormat',
      key: 'format',
      width: 120,
      render: (format: string, record: EBook) => (
        <div>
          <Tag color={format === 'PDF' ? '#f50' : format === 'EPUB' ? '#2db7f5' : '#87d068'}>
            {format}
          </Tag>
          <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
            {formatFileSize(record.fileSize)}
          </div>
        </div>
      )
    },
    {
      title: '下载量',
      dataIndex: 'downloads',
      key: 'downloads',
      width: 100,
      sorter: true,
      render: (count: number) => (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 500 }}>{(count || 0).toLocaleString()}</div>
          <div style={{ fontSize: 12, color: '#999' }}>次</div>
        </div>
      )
    },
    {
      title: '评分',
      dataIndex: 'rating',
      key: 'rating',
      width: 100,
      sorter: true,
      render: (rating: number) => {
        const safeRating = typeof rating === 'number' ? rating : 0;
        return (
          <div>
            <Rate
              disabled
              value={safeRating}
              style={{ fontSize: 14 }}
              allowHalf
            />
            <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
              {safeRating.toFixed(1)}
            </div>
          </div>
        );
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      filters: [
        { text: '活跃', value: 'active' },
        { text: '停用', value: 'inactive' },
        { text: '归档', value: 'archived' }
      ],
      render: (status: string, record: EBook) => {
        const statusConfig: Record<string, { color: string; text: string; icon: React.ReactNode }> = {
          active: { color: '#52c41a', text: '活跃', icon: <CheckCircleOutlined /> },
          inactive: { color: '#faad14', text: '停用', icon: <ExclamationCircleOutlined /> },
          archived: { color: '#d9d9d9', text: '归档', icon: <ClockCircleOutlined /> }
        };
        const config = statusConfig[status] || statusConfig.active;
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        );
      }
    },
    {
      title: '推荐',
      dataIndex: 'isRecommended',
      key: 'recommended',
      width: 80,
      render: (isRecommended: boolean) => (
        !!isRecommended ? (
          <Tag color="gold" icon={<StarOutlined />}>
            推荐
          </Tag>
        ) : (
          <span style={{ color: '#d9d9d9' }}>-</span>
        )
      )
    },
    {
      title: '上传时间',
      dataIndex: 'createdAt',
      key: 'uploadDate',
      width: 120,
      sorter: true,
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-'
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_, record: EBook) => (
        <Space>
          <Button 
            type="link" 
           
            icon={<EyeOutlined />}
            onClick={() => handleViewDetails(record)}
          >
            查看
          </Button>
          <Button 
            type="link" 
           
            icon={<DownloadOutlined />}
            onClick={() => handleDownloadEBook(record)}
          >
            下载
          </Button>
          <Button 
            type="link" 
           
            icon={<EditOutlined />}
            onClick={() => handleEditEBook(record)}
          >
            编辑
          </Button>
          <Dropdown
            menu={{
              items: [
                {
                  key: 'toggleRecommendation',
                  label: record.isRecommended ? '取消推荐' : '设为推荐',
                  icon: <StarOutlined />
                },
                {
                  key: 'delete',
                  label: '删除',
                  icon: <DeleteOutlined />,
                  danger: true
                }
              ],
              onClick: ({ key }) => handleEBookMenuClick(key, record)
            }}
          >
            <Button type="link" icon={<MoreOutlined />} />
          </Dropdown>
        </Space>
      )
    }
  ];

  // 处理电子书详情查看
  const handleViewDetails = (ebook: EBook) => {
    setSelectedEBook(ebook);
    setIsDetailModalVisible(true);
  };

  // 处理电子书下载
  const handleDownloadEBook = async (ebook: EBook) => {
    try {
      loading('正在下载电子书...');
      // 模拟下载过程
      await new Promise(resolve => setTimeout(resolve, 1000));
      success(`已开始下载: ${ebook.title}`);
      // 在实际应用中，这里应该触发文件下载
      console.log(`下载电子书: ${ebook.title}`);
    } catch (err) {
      error('下载失败，请稍后重试');
    } finally {
      destroyAllMessages();
    }
  };

  // 处理电子书编辑
  const handleEditEBook = (ebook: EBook) => {
    Modal.confirm({
      title: '编辑电子书',
      content: '此功能正在开发中...',
      okText: '确认',
      cancelText: '取消'
    });
  };

  // 处理电子书菜单点击
  const handleEBookMenuClick = async (key: string, ebook: EBook) => {
    console.log('[BOOK] 菜单点击:', { key, ebookId: ebook.id, title: ebook.title });
    switch (key) {
      case 'toggleRecommendation':
        try {
          await dispatch(toggleBookRecommendation({ id: ebook.id, recommended: !ebook.isRecommended })).unwrap();
          success(`已${ebook.isRecommended ? '取消推荐' : '设为推荐'}: ${ebook.title}`);
          // Redux dispatch已自动更新state.books，无需手动更新本地状态
        } catch (err) {
          error('操作失败，请稍后重试');
        }
        break;
      case 'delete':
        Modal.confirm({
          title: '确认删除',
          content: `确定要删除电子书《${ebook.title}》吗？`,
          okText: '删除',
          okType: 'danger',
          cancelText: '取消',
          onOk: async () => {
            console.log('[BOOK] 确认删除, ID:', ebook.id);
            try {
              const result = await dispatch(deleteBook(ebook.id)).unwrap();
              console.log('[BOOK] 删除成功:', result);
              success(`已删除电子书: ${ebook.title}`);
            } catch (err: any) {
              console.error('[BOOK] 删除失败:', err);
              error('删除失败，请稍后重试');
            }
          }
        });
        break;
    }
  };

  // 处理表格选择
  const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  // 处理搜索
  const handleSearch = (value: string) => {
    setSearchText(value);
  };

  // 处理筛选
  const handleFilter = () => {
    console.log('应用筛选:', {
      searchText,
      selectedCategory,
      dateRange,
      statusFilter
    });
  };

  // 处理排序
  const handleTableChange = (pagination: any, filters: any, sorter: any) => {
    console.log('表格变化:', { pagination, filters, sorter });
    if (sorter.field) {
      setSortField(sorter.field);
      setSortOrder(sorter.order || 'descend');
    }
  };

  // 上传电子书（真实API调用）
  const handleUploadEBook = async (values: any) => {
    try {
      setIsLoading(true);

      // 优先用 ref 保存的原始File对象(beforeUpload已捕获), 其次用 fileList
      const uploadFile = pendingFileRef.current || (fileList.length > 0 ? fileList[0] : null);
      
      if (!uploadFile) {
        error('请选择要上传的文件');
        return;
      }

      // 提取原生 File 对象
      const file: File = (uploadFile as any).originFileObj || (uploadFile instanceof File ? uploadFile : uploadFile as any);

      console.log('[EBOOK] 开始上传电子书:', values.title, '文件:', file.name);

      // 使用原子接口一步完成文件上传+创建记录
      const bookData: any = {
        title: values.title,
        author: values.author || '',
        description: values.description || '',
        category: values.category || 'sales_psychology',
        difficulty: 'beginner',
        pages: 100,
        readingTime: 120,
        tags: [],
        status: 'available' as any,
      };

      const response = await bookApi.createBookWithFile(file, bookData);
      console.log('[EBOOK] 原子接口返回:', response);

      if ((response as any).code === 0) {
        success(`已成功上传电子书: ${values.title}`);
        
        // 重置表单和状态
        uploadForm.resetFields();
        setFileList([]);
        pendingFileRef.current = null; // 清空文件引用
        setIsUploadModalVisible(false);
        
        // 刷新电子书列表（从后端获取真实数据）
        dispatch(fetchBooks({ page: 1, pageSize: 20 }));
      } else {
        error((response as any).message || '上传失败');
      }
    } catch (err: any) {
      console.error('[EBOOK] 上传失败:', err);
      error(err?.message || '上传失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 上传文件属性
  const uploadProps: UploadProps = {
    onRemove: (file) => {
      setFileList((prevList) => {
        const index = prevList.indexOf(file);
        const newFileList = prevList.slice();
        newFileList.splice(index, 1);
        return newFileList;
      });
    },
    beforeUpload: (file) => {
      // 检查文件类型
      const allowedTypes = ['application/pdf', 'application/epub+zip'];
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      const isAllowedExtension = ['pdf', 'epub', 'mobi'].includes(fileExtension || '');
      
      if (!isAllowedExtension) {
        error('只支持PDF、EPUB和MOBI格式的文件');
        return false;
      }

      // 检查文件大小（最大50MB）
      const isLt50M = file.size / 1024 / 1024 < 50;
      if (!isLt50M) {
        error('文件大小不能超过50MB');
        return false;
      }

      setFileList([file]);
      pendingFileRef.current = file; // 保存原始File引用, 不受Upload组件状态影响
      return false; // 不自动上传
    },
    fileList
  };

  // 渲染详情模态框
  const renderDetailModal = () => {
    if (!selectedEBook) return null;

    return (
      <Modal
        title="电子书详情"
        open={isDetailModalVisible}
        onCancel={() => setIsDetailModalVisible(false)}
        width={800}
        footer={[
          <Button key="download" type="primary" icon={<DownloadOutlined />} onClick={() => handleDownloadEBook(selectedEBook)}>
            下载电子书
          </Button>,
          <Button key="close" onClick={() => setIsDetailModalVisible(false)}>
            关闭
          </Button>
        ]}
      >
        <Row gutter={24}>
          <Col span={8}>
            <div style={{ width: '100%', textAlign: 'center' }}>
              <div style={{ 
                width: 160, 
                height: 220, 
                margin: '0 auto 20px',
                borderRadius: 8,
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                {selectedEBook.coverUrl ? (
                  <img 
                    src={selectedEBook.coverUrl} 
                    alt={selectedEBook.title} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ 
                    width: '100%', 
                    height: '100%', 
                    backgroundColor: '#f0f0f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <BookOutlined style={{ fontSize: 48, color: '#999' }} />
                  </div>
                )}
              </div>
              
              <Statistic 
                title="下载量" 
                value={selectedEBook.downloadCount} 
                suffix="次"
              />
              <Statistic 
                title="评分" 
                value={selectedEBook.rating} 
                precision={1}
                style={{ marginTop: 16 }}
              />
            </div>
          </Col>
          <Col span={16}>
            <Descriptions title={selectedEBook.title} column={1} bordered>
              <Descriptions.Item label="作者">{selectedEBook.author}</Descriptions.Item>
              <Descriptions.Item label="分类">{selectedEBook.category}</Descriptions.Item>
              <Descriptions.Item label="文件格式">
                <Tag color={selectedEBook.fileFormat === 'PDF' ? '#f50' : '#2db7f5'}>
                  {selectedEBook.fileFormat}
                </Tag>
                {' '}{formatFileSize(selectedEBook.fileSize)}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={selectedEBook.status === 'active' ? '#52c41a' : '#faad14'}>
                  {selectedEBook.status === 'active' ? '活跃' : '停用'}
                </Tag>
                {selectedEBook.isRecommended && (
                  <Tag color="gold" style={{ marginLeft: 8 }}>推荐</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="上传时间">{dayjs(selectedEBook.uploadDate).format('YYYY年MM月DD日')}</Descriptions.Item>
              <Descriptions.Item label="最后更新">{dayjs(selectedEBook.lastUpdated).format('YYYY年MM月DD日')}</Descriptions.Item>
              <Descriptions.Item label="描述">
                <Paragraph>{selectedEBook.description}</Paragraph>
              </Descriptions.Item>
            </Descriptions>
          </Col>
        </Row>
      </Modal>
    );
  };

  // 渲染上传模态框
  const renderUploadModal = () => (
    <Modal
      title="上传电子书"
      open={isUploadModalVisible}
      onCancel={() => setIsUploadModalVisible(false)}
      width={600}
      footer={null}
    >
      <Form
        form={uploadForm}
        layout="vertical"
        onFinish={handleUploadEBook}
      >
        <Form.Item
          name="title"
          label="电子书标题"
          rules={[{ required: true, message: '请输入电子书标题' }]}
        >
          <Input placeholder="请输入电子书标题" />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="author"
              label="作者"
              rules={[{ required: true, message: '请输入作者' }]}
            >
              <Input placeholder="请输入作者" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="category"
              label="分类"
              rules={[{ required: true, message: '请选择分类' }]}
            >
              <Select placeholder="请选择分类">
                <Option value="销售技巧">销售技巧</Option>
                <Option value="团队管理">团队管理</Option>
                <Option value="客户服务">客户服务</Option>
                <Option value="运营管理">运营管理</Option>
                <Option value="产品知识">产品知识</Option>
                <Option value="其他">其他</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="description"
          label="描述"
          rules={[{ required: true, message: '请输入描述' }]}
        >
          <Input.TextArea 
            placeholder="请输入电子书描述"
            rows={3}
          />
        </Form.Item>

        <Form.Item
          name="coverUrl"
          label="封面图片URL (可选)"
        >
          <Input placeholder="请输入封面图片URL" />
        </Form.Item>

        <Form.Item
          label="电子书文件"
          required
        >
          <Upload.Dragger {...uploadProps}>
            <p className="ant-upload-drag-icon">
              <CloudUploadOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
            <p className="ant-upload-hint">
              支持PDF、EPUB、MOBI格式，文件大小不超过50MB
            </p>
          </Upload.Dragger>
          {fileList.length > 0 && (
            <Alert
              message={`已选择文件: ${fileList[0].name} (${((fileList[0].size || 0) / 1024 / 1024).toFixed(2)}MB)`}
              type="info"
              showIcon
              style={{ marginTop: 16 }}
            />
          )}
        </Form.Item>

        <Form.Item>
          <Space>
            <Button 
              type="primary" 
              htmlType="submit"
              loading={isLoading}
              icon={<CloudUploadOutlined />}
            >
              上传电子书
            </Button>
            <Button onClick={() => setIsUploadModalVisible(false)}>
              取消
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );

  // 计算统计数据
  const getStatisticsData = () => {
    const bookList = Array.isArray(ebooks) ? ebooks : [];
    const totalBooks = bookList.length;
    const activeBooks = bookList.filter((b: any) => b.status === 'active').length;
    const totalDownloads = bookList.reduce((sum, book: any) => sum + (book.downloadCount || 0), 0);
    const recommendedBooks = bookList.filter(b => b.isRecommended).length;
    
    return { totalBooks, activeBooks, totalDownloads, recommendedBooks };
  };

  const stats = getStatisticsData();

  return (
    <div className="school-management-page">
      <LoadingOverlay loading={isLoading} />
      
      {/* 页面头部 */}
      <div className="page-header">
        <div className="header-left">
          <BookOutlined className="header-icon" />
          <Title level={2} className="page-title">静莱美商学院</Title>
          <Text type="secondary" className="page-subtitle">
            代理商学习和培训平台，提升销售能力和业务水平
          </Text>
        </div>
        <div className="header-actions">
          <Space>
            <Button 
              type="primary" 
              icon={<CloudUploadOutlined />}
              onClick={() => setIsUploadModalVisible(true)}
            >
              上传电子书
            </Button>
            <Button 
              icon={<ReloadOutlined />}
              onClick={loadData}
            >
              刷新
            </Button>
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'export',
                    label: '导出数据',
                    icon: <FileExcelOutlined />
                  },
                  {
                    key: 'settings',
                    label: '设置',
                    icon: <SettingOutlined />
                  }
                ]
              }}
            >
              <Button icon={<SettingOutlined />} />
            </Dropdown>
          </Space>
        </div>
      </div>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="电子书总数"
              value={stats.totalBooks}
              prefix={<BookOutlined />}
              suffix="本"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="活跃电子书"
              value={stats.activeBooks}
              prefix={<CheckCircleOutlined />}
              suffix="本"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="总下载量"
              value={stats.totalDownloads}
              prefix={<DownloadOutlined />}
              suffix="次"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="推荐电子书"
              value={stats.recommendedBooks}
              prefix={<StarOutlined />}
              suffix="本"
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 主标签页 */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'overview',
            label: (
              <span>
                <DashboardOutlined />
                概览
              </span>
            ),
            children: (
              <Card title="商学院概览">
                <Alert
                  message="商学院数据统计"
                  description="以下展示商学院的核心数据指标和学习情况"
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
                
                <Row gutter={16}>
                  <Col span={12}>
                    <Card title="热门电子书">
                      <List
                        dataSource={(Array.isArray(ebooks) ? ebooks : []).slice(0, 5)}
                        renderItem={(item) => (
                          <List.Item>
                            <List.Item.Meta
                              avatar={<BookOutlined />}
                              title={<a onClick={() => handleViewDetails(item)}>{item.title}</a>}
                              description={`${item.author} · ${(item.downloads || 0).toLocaleString()}次下载`}
                            />
                            <div>
                              <Rate value={item.rating || 0} disabled />
                            </div>
                          </List.Item>
                        )}
                      />
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card title="最近活动">
                      <Timeline>
                        <Timeline.Item color="green">新增电子书《销售心理学实战指南》</Timeline.Item>
                        <Timeline.Item color="blue">更新了客户关系维护技巧课程</Timeline.Item>
                        <Timeline.Item color="red">发布了新产品介绍视频教程</Timeline.Item>
                        <Timeline.Item color="gray">优化了话术模板分类系统</Timeline.Item>
                      </Timeline>
                    </Card>
                  </Col>
                </Row>
              </Card>
            )
          },
          {
            key: 'ebooks',
            label: (
              <span>
                <BookOutlined />
                电子书 ({(Array.isArray(ebooks) ? ebooks : []).length})
              </span>
            ),
            children: (
              <BookManagement />
            )
          },
          {
            key: 'videos',
            label: (
              <span>
                <VideoCameraOutlined />
                视频教程
              </span>
            ),
            children: <VideoManagement />
          },
          {
            key: 'scripts',
            label: (
              <span>
                <FileTextOutlined />
                性格色彩话术
              </span>
            ),
            children: <PersonalityScriptSection />
          },
          {
            key: 'learning',
            label: (
              <span>
                <TeamOutlined />
                学习统计
              </span>
            ),
            children: (
              <Card title="学习统计">
                <Alert
                  message="学习统计功能正在开发中"
                  description="此处将展示代理商的学习进度、活跃度等统计数据"
                  type="info"
                  showIcon
                />
              </Card>
            )
          }
        ]}
      />

      {/* 渲染模态框 */}
      {renderUploadModal()}
      {renderDetailModal()}

      {/* 页面底部信息 */}
      <div style={{ marginTop: 24, textAlign: 'center', color: '#999' }}>
        <Paragraph type="secondary">
          静莱美商学院 © 2024 版权所有 · 打造专业的代理商学习平台
        </Paragraph>
      </div>
    </div>
  );
};

export default SchoolManagementNew;