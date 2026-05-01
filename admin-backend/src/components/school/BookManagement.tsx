// 学习书籍管理组件 v20260411-debug

import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Input,
  Select,
  Modal,
  Form,
  Upload,
  message,
  Popconfirm,
  Tooltip,
  Row,
  Col,
  Statistic,
  Progress,
  Typography,
  Divider,
  List,
  Avatar,
  Rate,
  Spin,
} from 'antd';
import {
  BookOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  DownloadOutlined,
  UploadOutlined,
  SearchOutlined,
  FilterOutlined,
  SortAscendingOutlined,
  CloudUploadOutlined,
  ReadOutlined,
  StarOutlined,
  FilePdfOutlined,
  UserOutlined,
  TagOutlined,
  VerticalAlignTopOutlined,
  FolderOutlined,
  BarChartOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchBooks,
  fetchBookById,
  createBook,
  updateBook,
  deleteBook,
  toggleBookRecommendation,
  setQueryParams,
  selectBook,
  setSelectedBook,
} from '../../store/slices/schoolSlice';
import type { ColumnsType } from 'antd/es/table';
import type { UploadProps } from 'antd';
import EbookReader from './EbookReader';
import { LearningBook, BookCategory, BookStatus, VideoDifficulty } from '../../types/school';
import { bookApi } from '../../api/schoolApi';

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;
const { Option } = Select;
const { TextArea } = Input;

// 工具函数
const getCategoryColor = (category: BookCategory): string => {
  const colors: Record<BookCategory, string> = {
    [BookCategory.SALES_PSYCHOLOGY]: 'volcano',
    [BookCategory.LEADERSHIP]: 'orange',
    [BookCategory.COMMUNICATION]: 'green',
    [BookCategory.PERSONAL_DEVELOPMENT]: 'blue',
    [BookCategory.FINANCIAL_MANAGEMENT]: 'purple',
    [BookCategory.BUSINESS_MANAGEMENT]: 'cyan',
  };
  return colors[category] || 'default';
};

const getCategoryLabel = (category: BookCategory): string => {
  const labels: Record<BookCategory, string> = {
    [BookCategory.SALES_PSYCHOLOGY]: '销售心理学',
    [BookCategory.LEADERSHIP]: '领导力',
    [BookCategory.COMMUNICATION]: '沟通技巧',
    [BookCategory.PERSONAL_DEVELOPMENT]: '个人发展',
    [BookCategory.FINANCIAL_MANAGEMENT]: '财务管理',
    [BookCategory.BUSINESS_MANAGEMENT]: '企业管理',
  };
  return labels[category] || category;
};

const getDifficultyColor = (difficulty: VideoDifficulty): string => {
  const colors: Record<VideoDifficulty, string> = {
    [VideoDifficulty.BEGINNER]: 'green',
    [VideoDifficulty.INTERMEDIATE]: 'orange',
    [VideoDifficulty.ADVANCED]: 'red',
  };
  return colors[difficulty] || 'default';
};

const getDifficultyLabel = (difficulty: VideoDifficulty): string => {
  const labels: Record<VideoDifficulty, string> = {
    [VideoDifficulty.BEGINNER]: '初级',
    [VideoDifficulty.INTERMEDIATE]: '中级',
    [VideoDifficulty.ADVANCED]: '高级',
  };
  return labels[difficulty] || difficulty;
};

const getStatusColor = (status: BookStatus): string => {
  const colors: Record<BookStatus, string> = {
    [BookStatus.AVAILABLE]: 'success',
    [BookStatus.READING]: 'processing',
    [BookStatus.COMPLETED]: 'default',
    [BookStatus.RECOMMENDED]: 'error',
  };
  return colors[status] || 'default';
};

const getStatusLabel = (status: BookStatus): string => {
  const labels: Record<BookStatus, string> = {
    [BookStatus.AVAILABLE]: '可用',
    [BookStatus.READING]: '阅读中',
    [BookStatus.COMPLETED]: '已完成',
    [BookStatus.RECOMMENDED]: '推荐',
  };
  return labels[status] || status;
};

// 书籍编辑表单
interface BookFormValues {
  title: string;
  author: string;
  description: string;
  category: BookCategory;
  difficulty: VideoDifficulty;
  pages: number;
  readingTime?: number;
  tags: string[];
  summary?: string;
  keyPoints?: string[];
  status: BookStatus;
  access_level?: string;
}

const BookManagement: React.FC = () => {
  const dispatch = useAppDispatch();
  const {
    books,
    booksLoading,
    selectedBook,
    queryParams,
    pagination,
    selectedBookIds,
  } = useAppSelector((state) => state.school);
  
  // 状态
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentBook, setCurrentBook] = useState<LearningBook | null>(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState('');
  const [uploadedFileFormat, setUploadedFileFormat] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadedFileSize, setUploadedFileSize] = useState(0);
  const [uploadedCoverUrl, setUploadedCoverUrl] = useState('');
  // 保存上传的原始文件引用，用于原子操作
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isReaderVisible, setIsReaderVisible] = useState(false);
  const [readingBook, setReadingBook] = useState<LearningBook | null>(null);
  
  // 表单
  const [form] = Form.useForm<BookFormValues>();
  
  // 分类管理
  const [categories, setCategories] = useState<any[]>([]);
  const [catModalVisible, setCatModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [catForm] = Form.useForm();

  // 数据统计面板
  const [statsPanelVisible, setStatsPanelVisible] = useState(false);
  const [readingStats, setReadingStats] = useState<any>({ readerCount: 0, topBooks: [], recentReads: [] });
  const [statsLoading, setStatsLoading] = useState(false);

  // 权限级别选项
  const accessLevelOptions = [
    { label: '全部可见', value: 'all' },
    { label: '会员(1级)及以上', value: '1' },
    { label: '打版代言人(2级)及以上', value: '2' },
    { label: '代理商(3级)及以上', value: '3' },
    { label: '批发商(4级)及以上', value: '4' },
    { label: '首席分公司(5级)及以上', value: '5' },
    { label: '仅管理员(6级)', value: '6' },
  ];

  const getAccessLevelLabel = (level: string) => {
    const opt = accessLevelOptions.find(o => o.value === level || o.value === String(level));
    return opt ? opt.label : level;
  };
  
  // 初始化加载
  useEffect(() => {
    dispatch(fetchBooks(queryParams));
    loadCategories();
  }, [dispatch, queryParams]);

  // 加载分类列表
  const loadCategories = async () => {
    try {
      const res: any = await bookApi.getCategories();
      if (res.code === 0) {
        setCategories(res.data || []);
      }
    } catch (e) {
      console.error('加载分类失败', e);
    }
  };

  // 加载阅读统计
  const loadReadingStats = async () => {
    setStatsLoading(true);
    try {
      const res: any = await bookApi.getReadingStats();
      if (res.code === 0) {
        setReadingStats(res.data || {});
      }
    } catch (e) {
      console.error('加载阅读统计失败', e);
    } finally {
      setStatsLoading(false);
    }
  };

  // 分类管理操作
  const handleAddCategory = () => {
    setEditingCategory(null);
    catForm.resetFields();
    catForm.setFieldsValue({ icon: '📁', sort_order: (categories.length + 1) * 10 });
    setCatModalVisible(true);
  };

  const handleEditCategory = (cat: any) => {
    setEditingCategory(cat);
    catForm.setFieldsValue(cat);
    setCatModalVisible(true);
  };

  const handleSaveCategory = async () => {
    try {
      const values = await catForm.validateFields();
      if (editingCategory) {
        await bookApi.updateCategory(editingCategory.id, values);
        message.success('分类更新成功');
      } else {
        await bookApi.createCategory(values);
        message.success('分类创建成功');
      }
      setCatModalVisible(false);
      loadCategories();
    } catch (e) {
      message.error('保存分类失败');
    }
  };

  const handleDeleteCategory = async (id: number) => {
    try {
      await bookApi.deleteCategory(id);
      message.success('分类删除成功');
      loadCategories();
    } catch (e) {
      message.error('删除分类失败');
    }
  };

  // 置顶操作
  const handleToggleTop = async (book: any) => {
    try {
      const isTop = !(book.is_top || (book as any).is_top);
      await bookApi.toggleBookTop(book.id, isTop);
      message.success(isTop ? '已置顶' : '已取消置顶');
      dispatch(fetchBooks(queryParams));
    } catch (e) {
      message.error('操作失败');
    }
  };
  
  // 处理搜索
  const handleSearch = () => {
    dispatch(setQueryParams({
      keyword: searchKeyword,
      category: selectedCategory !== 'all' ? selectedCategory : undefined,
      status: selectedStatus !== 'all' ? selectedStatus : undefined,
      difficulty: selectedDifficulty !== 'all' ? selectedDifficulty : undefined,
      sortBy,
      sortOrder,
      page: 1,
    }));
  };
  
  // 重置搜索
  const handleReset = () => {
    setSearchKeyword('');
    setSelectedCategory('all');
    setSelectedStatus('all');
    setSelectedDifficulty('all');
    setSortBy('createdAt');
    setSortOrder('desc');
    dispatch(setQueryParams({
      keyword: '',
      category: undefined,
      status: undefined,
      difficulty: undefined,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      page: 1,
    }));
  };
  
  // 处理分页
  const handlePaginationChange = (page: number, pageSize?: number) => {
    dispatch(setQueryParams({
      page,
      pageSize: pageSize || queryParams.pageSize,
    }));
  };
  
  // 预览书籍（打开在线阅读器）
  const handlePreview = (book: LearningBook) => {
    const bookFileUrl = (book as any).fileUrl || (book as any).file_url || '';
    if (!bookFileUrl) {
      message.warning('该书籍尚未上传文件，无法在线阅读');
      return;
    }
    setReadingBook(book);
    setIsReaderVisible(true);
  };
  
  // 编辑书籍
  const handleEdit = (book: LearningBook) => {
    setCurrentBook(book);
    setIsEditMode(true);
    setUploadedFileUrl((book as any).fileUrl || (book as any).file_url || '');
    setUploadedFileFormat((book as any).fileFormat || (book as any).file_format || '');
    setUploadedFileName((book as any).fileName || (book as any).file_name || '');
    setUploadedFileSize((book as any).fileSize || (book as any).file_size || 0);
    setUploadedCoverUrl((book as any).coverUrl || (book as any).cover_url || '');
    form.setFieldsValue({
      title: book.title,
      author: book.author,
      description: book.description,
      category: book.category,
      difficulty: book.difficulty,
      pages: book.pages,
      readingTime: book.readingTime,
      tags: book.tags || [],
      summary: book.summary || '',
      keyPoints: book.keyPoints || [],
      status: book.status,
      access_level: (book as any).access_level || 'all',
    });
    setIsModalVisible(true);
  };
  
  // 删除书籍
  const handleDelete = async (bookId: string) => {
    try {
      await dispatch(deleteBook(bookId)).unwrap();
      message.success('删除书籍成功');
    } catch (error) {
      message.error('删除书籍失败');
    }
  };
  
  // 切换推荐状态
  const handleToggleRecommendation = async (book: LearningBook) => {
    try {
      const recommended = book.status !== BookStatus.RECOMMENDED;
      await dispatch(toggleBookRecommendation({
        id: book.id,
        recommended,
      })).unwrap();
      message.success(recommended ? '已设为推荐书籍' : '已取消推荐');
      dispatch(fetchBooks(queryParams)); // 刷新列表
    } catch (error) {
      message.error('操作失败');
    }
  };

  // 书籍表格列定义（在组件内定义以访问 handler 函数）
  const bookColumns: ColumnsType<LearningBook> = [
    {
      title: '封面',
      dataIndex: 'coverUrl',
      key: 'cover',
      width: 60,
      render: (url, record) => (
        <div style={{ width: 40, height: 56, backgroundColor: '#f0f0f0', borderRadius: 4, overflow: 'hidden' }}>
          {url || (record as any).cover_url ? (
            <img src={url || (record as any).cover_url} alt="封面" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookOutlined style={{ fontSize: 20, color: '#999' }} />
            </div>
          )}
        </div>
      ),
    },
    {
      title: '书籍信息',
      dataIndex: 'title',
      key: 'title',
      render: (text, record) => (
        <Space direction="vertical" size={2}>
          <Text strong>{text}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.author}</Text>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <Tag color={getCategoryColor(record.category)} style={{ fontSize: 10, padding: '0 4px' }}>
              {getCategoryLabel(record.category)}
            </Tag>
            <Tag color={getDifficultyColor(record.difficulty)} style={{ fontSize: 10, padding: '0 4px' }}>
              {getDifficultyLabel(record.difficulty)}
            </Tag>
            {record.status === BookStatus.RECOMMENDED && (
              <Tag color="red" style={{ fontSize: 10, padding: '0 4px' }}>推荐</Tag>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      width: 200,
      render: (text) => (
        <Tooltip title={text}>
          <Paragraph ellipsis={{ rows: 2 }} style={{ margin: 0, fontSize: 12 }}>
            {text}
          </Paragraph>
        </Tooltip>
      ),
    },
    {
      title: '页数/时长',
      key: 'info',
      width: 100,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Text style={{ fontSize: 12 }}>{record.pages}页</Text>
          {record.readingTime && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              {Math.floor(record.readingTime / 60)}小时{record.readingTime % 60}分钟
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: '数据',
      key: 'stats',
      width: 120,
      render: (_, record) => (
        <Space direction="vertical" size={2} style={{ fontSize: 12 }}>
          <Space>
            <EyeOutlined style={{ color: '#666' }} />
            <span>{record.views?.toLocaleString() || 0}</span>
          </Space>
          <Space>
            <DownloadOutlined style={{ color: '#666' }} />
            <span>{record.downloads?.toLocaleString() || 0}</span>
          </Space>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status) => (
        <Tag color={getStatusColor(status)} style={{ margin: 0 }}>
          {getStatusLabel(status)}
        </Tag>
      ),
    },
    {
      title: '文件格式',
      dataIndex: 'fileFormat',
      key: 'fileFormat',
      width: 90,
      render: (format, record) => (
        <Tag color={(format || (record as any).file_format) === 'pdf' ? 'red' : 'blue'}>
          {(format || (record as any).file_format)?.toUpperCase() || '-'}
        </Tag>
      ),
    },
    {
      title: '权限',
      key: 'access_level',
      width: 130,
      render: (_, record) => {
        const level = (record as any).access_level;
        return level && level !== 'all' ? (
          <Tag color="purple" icon={<TeamOutlined />}>{getAccessLevelLabel(level)}</Tag>
        ) : (
          <Tag color="green">全部可见</Tag>
        );
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 100,
      render: (date) => new Date(date).toLocaleDateString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right' as const,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="预览">
            <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handlePreview(record)} />
          </Tooltip>
          <Tooltip title={(record as any).is_top ? '取消置顶' : '置顶'}>
            <Button 
              type="link" 
              size="small" 
              icon={<VerticalAlignTopOutlined />} 
              style={{ color: (record as any).is_top ? '#722ed1' : undefined }}
              onClick={() => handleToggleTop(record)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          </Tooltip>
          <Tooltip title="删除">
            <Popconfirm
              title="确定要删除这本书吗？"
              description="删除后无法恢复，请谨慎操作！"
              onConfirm={() => handleDelete(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];
  
  // 批量删除
  const handleBatchDelete = () => {
    if (selectedBookIds.length === 0) {
      message.warning('请先选择要删除的书籍');
      return;
    }
    
    Modal.confirm({
      title: '批量删除确认',
      content: `确定要删除选中的 ${selectedBookIds.length} 本书吗？删除后无法恢复！`,
      okText: '确定删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          for (const bookId of selectedBookIds) {
            await dispatch(deleteBook(bookId)).unwrap();
          }
          message.success(`成功删除 ${selectedBookIds.length} 本书籍`);
          dispatch(fetchBooks(queryParams));
        } catch (error) {
          message.error('批量删除失败');
        }
      },
    });
  };
  
  // 批量推荐
  const handleBatchRecommend = () => {
    if (selectedBookIds.length === 0) {
      message.warning('请先选择要推荐的书籍');
      return;
    }
    
    Modal.confirm({
      title: '批量推荐确认',
      content: `确定要推荐选中的 ${selectedBookIds.length} 本书吗？`,
      okText: '确定推荐',
      cancelText: '取消',
      onOk: async () => {
        try {
          for (const bookId of selectedBookIds) {
            await dispatch(toggleBookRecommendation({
              id: bookId,
              recommended: true,
            })).unwrap();
          }
          message.success(`成功推荐 ${selectedBookIds.length} 本书籍`);
          dispatch(fetchBooks(queryParams));
        } catch (error) {
          message.error('批量推荐失败');
        }
      },
    });
  };
  
  // 打开新建书籍模态框
  const handleCreate = () => {
    setCurrentBook(null);
    setIsEditMode(false);
    setUploadedFileUrl('');
    setUploadedFileFormat('');
    setUploadedFileName('');
    setUploadedFileSize(0);
    setUploadedCoverUrl('');
    setPendingFile(null);  // 重置待上传文件引用
    form.resetFields();
    form.setFieldsValue({
      title: '',
      author: '',
      description: '',
      category: BookCategory.SALES_PSYCHOLOGY,
      difficulty: VideoDifficulty.BEGINNER,
      pages: 200,
      readingTime: 300,
      tags: [],
      status: BookStatus.AVAILABLE,
      access_level: 'all',
    });
    setIsModalVisible(true);
  };
  
  // 保存书籍（新建时使用原子接口，一步上传+创建）
  const handleSave = async () => {
    console.log('[BOOK] ===== handleSave 开始 =====');
    console.log('[BOOK] isEditMode:', isEditMode, 'currentBook:', !!currentBook);
    
    try {
      const values = await form.validateFields();
      console.log('[BOOK] 表单验证通过:', Object.keys(values));
      
      if (isEditMode && currentBook) {
        // 编辑模式：用原有逻辑（更新）
        console.log('[BOOK] 进入编辑模式');
        const bookData: Partial<LearningBook> = {
          ...values,
          ...(uploadedFileUrl ? { fileUrl: uploadedFileUrl, fileFormat: uploadedFileFormat as any, fileName: uploadedFileName, fileSize: uploadedFileSize } : {}),
          ...(uploadedCoverUrl ? { coverUrl: uploadedCoverUrl } : {}),
          access_level: values.access_level || 'all',
        } as any;
        await dispatch(updateBook({ id: currentBook.id, bookData: bookData })).unwrap();
        message.success('更新书籍成功');
      } else {
        // 新建模式
        console.log('[BOOK] 进入新建模式');
        console.log('[BOOK] pendingFile:', pendingFile ? `${pendingFile.name} (${pendingFile.size}B)` : 'NULL');
        console.log('[BOOK] uploadedFileName:', uploadedFileName || '(空)');
        console.log('[BOOK] uploadedFileUrl:', uploadedFileUrl || '(空)');
        
        if (pendingFile && uploadedFileName) {
          // 有文件 → 使用原子接口一步完成上传+创建（传完整字段）
          const bookData: Partial<LearningBook> = {
            title: values.title,
            author: values.author || '',
            description: values.description || '',
            category: values.category || 'sales_psychology',
            difficulty: values.difficulty || 'beginner',
            pages: values.pages || 0,
            readingTime: values.readingTime,
            tags: values.tags,
            summary: values.summary,
            keyPoints: values.keyPoints,
            status: values.status,
            coverUrl: uploadedCoverUrl || undefined,
            access_level: values.access_level || 'all',
          } as any;
          console.log('[BOOK] 准备调用原子接口 createBookWithFile, 数据:', JSON.stringify(bookData));
          
          try {
            console.log('[BOOK] >>> 正在调用 bookApi.createBookWithFile...');
            const response = await bookApi.createBookWithFile(pendingFile, bookData);
            console.log('[BOOK] <<< 原子接口返回:', JSON.stringify(response).substring(0, 200));
            
            const resData = (response as any);
            if (resData && resData.code === 0) {
              console.log('[BOOK] 原子接口成功! code=0, 关闭弹窗 + 刷新列表');
              message.success('电子书创建成功');
              setIsModalVisible(false);
              dispatch(fetchBooks(queryParams));
              return;
            } else {
              console.warn('[BOOK] ⚠️ 原子接口返回异常，走fallback:', resData);
            }
          } catch (atomErr: any) {
            console.warn('[BOOK] ⚠️ 原子接口抛出异常:', atomErr?.message || atomErr);
          }
        } else {
          console.log('[BOOK] 无pendingFile或uploadedFileName为空, 直接走两步模式');
        }
        
        // Fallback: 两步模式
        console.log('[BOOK] >>> 准备走 fallback 两步模式 (dispatch createBook)');
        const finalData: Partial<LearningBook> = {
          title: values.title,
          author: values.author || '',
          description: values.description || '',
          category: values.category || 'sales_psychology',
          difficulty: values.difficulty || 'beginner',
          pages: values.pages || 0,
          readingTime: values.readingTime,
          tags: values.tags,
          summary: values.summary,
          keyPoints: values.keyPoints,
          status: values.status,
          ...(uploadedFileUrl ? { fileUrl: uploadedFileUrl, fileFormat: uploadedFileFormat as any, fileName: uploadedFileName, fileSize: uploadedFileSize } : {}),
          ...(uploadedCoverUrl ? { coverUrl: uploadedCoverUrl } : {}),
          access_level: values.access_level || 'all',
        } as any;
        
        try {
          console.log('[BOOK] >>> 正在调用 dispatch(createBook)...');
          await dispatch(createBook(finalData)).unwrap();
          console.log('[BOOK] <<< createBook 成功!');
          message.success('创建书籍成功');
        } catch (dispatchErr: any) {
          console.error('[BOOK] ❌ createBook dispatch 失败:', dispatchErr?.message || dispatchErr);
          throw dispatchErr;
        }
      }
      
      console.log('[BOOK] 操作全部完成, 关闭弹窗 + 刷新列表');
      setIsModalVisible(false);
      dispatch(fetchBooks(queryParams)); // 刷新列表
    } catch (error: any) {
      console.error('[BOOK] ❌ handleSave 总体catch:', error?.message || error);
      message.error('保存书籍失败，请检查表单数据');
    }
    console.log('[BOOK] ===== handleSave 结束 =====');
  };
  
  // 上传电子书文件属性配置
  const ebookUploadProps: UploadProps = {
    name: 'file',
    action: '/api/school/books/upload',
    accept: '.pdf,.epub,.doc,.docx,.txt,.mobi',
    showUploadList: true,
    beforeUpload(file) {
      console.log('选择文件:', file.name, file.type, file.size);
      return true; // 允许上传
    },
    customRequest(options) {
      const { file, onSuccess, onError, onProgress } = options;
      const uploadFile = file instanceof File ? file : file as unknown as File;
      
      // 保存文件引用供后续原子操作使用
      setPendingFile(uploadFile);
      
      const formData = new FormData();
      formData.append('file', uploadFile);
      
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/school/books/upload');
      
      // 携带认证令牌
      const token = localStorage.getItem('jlm_auth_token');
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress?.({ percent: Math.round((e.loaded / e.total) * 100) }, file);
        }
      };
      
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const res = JSON.parse(xhr.responseText);
            if (res.code === 0) {
              onSuccess?.(res, xhr);
              setUploadedFileUrl(res.data.url);
              setUploadedFileFormat(res.data.format);
              setUploadedFileName(res.data.filename);
              setUploadedFileSize(res.data.size);
              message.success(`${res.data.filename || uploadFile.name} 上传成功`);
            } else {
              onError?.(new Error(res.message || '上传失败'));
              message.error(res.message || '上传失败');
            }
          } catch (e) {
            onError?.(new Error('响应解析失败'));
            message.error('上传响应解析失败');
          }
        } else {
          onError?.(new Error(`上传失败: HTTP ${xhr.status}`));
          message.error(`上传失败: HTTP ${xhr.status}`);
        }
      };
      
      xhr.onerror = () => {
        onError?.(new Error('网络错误'));
        message.error('网络错误，上传失败');
      };
      
      xhr.send(formData);
      
      return { abort: () => xhr.abort() };
    },
    onChange(info) {
      if (info.file.status === 'removed') {
        setUploadedFileUrl('');
        setUploadedFileFormat('');
        setUploadedFileName('');
        setUploadedFileSize(0);
      }
    },
  };

  // 封面上传属性配置
  const coverUploadProps: UploadProps = {
    name: 'cover',
    action: '/api/school/books/cover',
    accept: '.jpg,.jpeg,.png,.webp',
    listType: 'picture',
    showUploadList: true,
    customRequest(options) {
      const { file, onSuccess, onError } = options;
      const uploadFile = file instanceof File ? file : file as unknown as File;
      const formData = new FormData();
      formData.append('cover', uploadFile);
      
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/school/books/cover');
      
      // 携带认证令牌
      const token = localStorage.getItem('jlm_auth_token');
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const res = JSON.parse(xhr.responseText);
            if (res.code === 0) {
              onSuccess?.(res, xhr);
              setUploadedCoverUrl(res.data.url);
              message.success('封面上传成功');
            } else {
              onError?.(new Error(res.message || '上传失败'));
              message.error(res.message || '上传失败');
            }
          } catch (e) {
            onError?.(new Error('响应解析失败'));
          }
        } else {
          onError?.(new Error(`HTTP ${xhr.status}`));
          message.error(`封面上传失败: HTTP ${xhr.status}`);
        }
      };
      
      xhr.onerror = () => {
        onError?.(new Error('网络错误'));
        message.error('网络错误');
      };
      
      xhr.send(formData);
      return { abort: () => xhr.abort() };
    },
    onChange(info) {
      if (info.file.status === 'removed') {
        setUploadedCoverUrl('');
      }
    },
  };

  // 批量导入属性配置
  const importUploadProps: UploadProps = {
    name: 'file',
    action: '/api/school/books/import',
    accept: '.json',
    showUploadList: false,
    customRequest(options) {
      const { file, onSuccess, onError } = options;
      const uploadFile = file instanceof File ? file : file as unknown as File;
      const formData = new FormData();
      formData.append('file', uploadFile);
      
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/school/books/import');
      
      // 携带认证令牌
      const token = localStorage.getItem('jlm_auth_token');
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const res = JSON.parse(xhr.responseText);
            if (res.code === 0) {
              onSuccess?.(res, xhr);
              message.success(res.message || '导入成功');
              dispatch(fetchBooks(queryParams));
            } else {
              onError?.(new Error(res.message || '导入失败'));
              message.error(res.message || '导入失败');
            }
          } catch (e) {
            onError?.(new Error('响应解析失败'));
          }
        } else {
          onError?.(new Error(`HTTP ${xhr.status}`));
          message.error(`导入失败: HTTP ${xhr.status}`);
        }
      };
      
      xhr.onerror = () => {
        onError?.(new Error('网络错误'));
        message.error('网络错误');
      };
      
      xhr.send(formData);
      return { abort: () => xhr.abort() };
    },
  };
  
  // 计算统计信息
  const stats = {
    total: books.length,
    available: books.filter(b => b.status === BookStatus.AVAILABLE).length,
    recommended: books.filter(b => b.status === BookStatus.RECOMMENDED).length,
    reading: books.filter(b => b.status === BookStatus.READING).length,
    completed: books.filter(b => b.status === BookStatus.COMPLETED).length,
    totalViews: books.reduce((sum, b) => sum + (b.views || 0), 0),
    totalDownloads: books.reduce((sum, b) => sum + (b.downloads || 0), 0),
    totalPages: books.reduce((sum, b) => sum + (b.pages || 0), 0),
  };
  
  // 推荐书籍数据
  const recommendedBooks = books.filter(b => b.status === BookStatus.RECOMMENDED).slice(0, 5);
  
  return (
    <div>
      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="书籍总数"
              value={stats.total}
              prefix={<BookOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="推荐书籍"
              value={stats.recommended}
              suffix={`/${stats.total}`}
              prefix={<StarOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="总阅读量"
              value={stats.totalViews}
              prefix={<EyeOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="总下载量"
              value={stats.totalDownloads}
              prefix={<DownloadOutlined />}
              valueStyle={{ color: '#eb2f96' }}
            />
          </Card>
        </Col>
      </Row>
      
      {/* 搜索和操作栏 */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={8}>
            <Search
              placeholder="搜索书籍标题、作者、描述..."
              allowClear
              enterButton={<SearchOutlined />}
              size="middle"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onSearch={handleSearch}
            />
          </Col>
          <Col xs={24} md={8}>
            <Space wrap>
              <Select
                value={selectedCategory}
                onChange={setSelectedCategory}
                style={{ width: 120 }}
                placeholder="全部分类"
              >
                <Option value="all">全部分类</Option>
                {Object.values(BookCategory).map((category) => (
                  <Option key={category} value={category}>
                    {getCategoryLabel(category)}
                  </Option>
                ))}
              </Select>
              
              <Select
                value={selectedStatus}
                onChange={setSelectedStatus}
                style={{ width: 100 }}
                placeholder="全部状态"
              >
                <Option value="all">全部状态</Option>
                {Object.values(BookStatus).map((status) => (
                  <Option key={status} value={status}>
                    {getStatusLabel(status)}
                  </Option>
                ))}
              </Select>
              
              <Select
                value={selectedDifficulty}
                onChange={setSelectedDifficulty}
                style={{ width: 100 }}
                placeholder="全部难度"
              >
                <Option value="all">全部难度</Option>
                {Object.values(VideoDifficulty).map((difficulty) => (
                  <Option key={difficulty} value={difficulty}>
                    {getDifficultyLabel(difficulty)}
                  </Option>
                ))}
              </Select>
              
              <Button icon={<FilterOutlined />} onClick={handleSearch}>
                筛选
              </Button>
              <Button onClick={handleReset}>重置</Button>
            </Space>
          </Col>
          <Col xs={24} md={8} style={{ textAlign: 'right' }}>
            <Space wrap>
              <Button.Group>
                <Button 
                  type={viewMode === 'list' ? 'primary' : 'default'}
                  icon={<ReadOutlined />}
                  onClick={() => setViewMode('list')}
                >
                  列表
                </Button>
                <Button 
                  type={viewMode === 'grid' ? 'primary' : 'default'}
                  icon={<BookOutlined />}
                  onClick={() => setViewMode('grid')}
                >
                  网格
                </Button>
              </Button.Group>
              <Button icon={<FolderOutlined />} onClick={handleAddCategory}>
                分类管理
              </Button>
              <Button icon={<BarChartOutlined />} onClick={() => { setStatsPanelVisible(true); loadReadingStats(); }}>
                阅读统计
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleCreate}
              >
                新建书籍
              </Button>
              <Upload {...importUploadProps}>
                <Button icon={<CloudUploadOutlined />}>
                  批量导入
                </Button>
              </Upload>
            </Space>
          </Col>
        </Row>
      </Card>
      
      {/* 批量操作栏 */}
      {selectedBookIds.length > 0 && (
        <Card style={{ marginBottom: 16, backgroundColor: '#f6ffed', borderColor: '#b7eb8f' }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Text strong>已选择 {selectedBookIds.length} 本书籍</Text>
            </Col>
            <Col>
              <Space>
                <Button size="small" type="primary" onClick={handleBatchRecommend}>
                  批量推荐
                </Button>
                <Button size="small" danger onClick={handleBatchDelete}>
                  批量删除
                </Button>
                <Button size="small" onClick={() => dispatch(fetchBooks(queryParams))}>
                  取消选择
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>
      )}
      
      {/* 推荐书籍 */}
      {recommendedBooks.length > 0 && (
        <Card 
          title="推荐书籍" 
          style={{ marginBottom: 24 }}
          extra={<Button type="link" size="small">查看更多</Button>}
        >
          <List
            grid={{ gutter: 16, column: 5 }}
            dataSource={recommendedBooks}
            renderItem={(book) => (
              <List.Item>
                <Card
                  hoverable
                  cover={
                    <div style={{ height: 140, overflow: 'hidden', backgroundColor: '#f0f0f0' }}>
                      {book.coverUrl ? (
                        <img 
                          alt={book.title} 
                          src={book.coverUrl}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <BookOutlined style={{ fontSize: 48, color: '#999' }} />
                        </div>
                      )}
                    </div>
                  }
                  size="small"
                  actions={[
                    <Tooltip title="阅读">
                      <EyeOutlined onClick={() => handlePreview(book)} />
                    </Tooltip>,
                    <Tooltip title="下载">
                      <DownloadOutlined onClick={() => message.info(`下载：${book.title}`)} />
                    </Tooltip>,
                  ]}
                >
                  <Card.Meta
                    title={<Text strong ellipsis style={{ fontSize: 14 }}>{book.title}</Text>}
                    description={
                      <Space direction="vertical" size={2} style={{ width: '100%' }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>{book.author}</Text>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                          <span>{book.pages}页</span>
                          <span>{book.views?.toLocaleString()}阅读</span>
                        </div>
                      </Space>
                    }
                  />
                </Card>
              </List.Item>
            )}
          />
        </Card>
      )}
      
      {/* 书籍表格 */}
      {viewMode === 'list' ? (
        <Card>
          <Table
            columns={bookColumns}
            dataSource={books.map(b => ({ ...b, key: b.id }))}
            loading={booksLoading}
            rowSelection={{
              selectedRowKeys: selectedBookIds,
              onChange: (selectedRowKeys) => {
                const selectedIds = selectedRowKeys as string[];
                const currentIds = new Set(selectedBookIds);
                selectedIds.forEach(id => {
                  if (!currentIds.has(id)) {
                    dispatch(selectBook(id));
                  }
                });
                selectedBookIds.forEach(id => {
                  if (!selectedIds.includes(id)) {
                    dispatch(selectBook(id));
                  }
                });
              },
            }}
            pagination={{
              current: pagination.page,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} 共 ${total} 条`,
              onChange: handlePaginationChange,
            }}
            scroll={{ x: 1200 }}
          />
        </Card>
      ) : (
        // 网格视图
        <Card>
          <Row gutter={[16, 16]}>
            {books.map((book) => (
              <Col xs={24} sm={12} md={8} lg={6} key={book.id}>
                <Card
                  hoverable
                  cover={
                    <div style={{ height: 180, overflow: 'hidden', backgroundColor: '#f0f0f0', position: 'relative' }}>
                      {book.coverUrl ? (
                        <img 
                          alt={book.title} 
                          src={book.coverUrl}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <BookOutlined style={{ fontSize: 48, color: '#999' }} />
                        </div>
                      )}
                      {book.status === BookStatus.RECOMMENDED && (
                        <div style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          background: '#ff4d4f',
                          color: 'white',
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 12,
                        }}>
                          推荐
                        </div>
                      )}
                    </div>
                  }
                  actions={[
                    <Tooltip title="预览">
                      <EyeOutlined onClick={() => handlePreview(book)} />
                    </Tooltip>,
                    <Tooltip title={book.status === BookStatus.RECOMMENDED ? '取消推荐' : '设为推荐'}>
                      <StarOutlined 
                        style={{ color: book.status === BookStatus.RECOMMENDED ? '#faad14' : undefined }}
                        onClick={() => handleToggleRecommendation(book)}
                      />
                    </Tooltip>,
                    <Tooltip title="编辑">
                      <EditOutlined onClick={() => handleEdit(book)} />
                    </Tooltip>,
                    <Tooltip title="删除">
                      <Popconfirm
                        title="确定要删除这本书吗？"
                        onConfirm={() => handleDelete(book.id)}
                      >
                        <DeleteOutlined style={{ color: '#ff4d4f' }} />
                      </Popconfirm>
                    </Tooltip>,
                  ]}
                >
                  <Card.Meta
                    title={<Text strong ellipsis>{book.title}</Text>}
                    description={
                      <Space direction="vertical" size={2} style={{ width: '100%' }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>{book.author}</Text>
                        <div>
                          <Tag color={getCategoryColor(book.category)}>
                            {getCategoryLabel(book.category)}
                          </Tag>
                          <Tag color={getDifficultyColor(book.difficulty)}>
                            {getDifficultyLabel(book.difficulty)}
                          </Tag>
                        </div>
                        <Paragraph ellipsis={{ rows: 2 }} style={{ fontSize: 12, margin: 0 }}>
                          {book.description}
                        </Paragraph>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 8 }}>
                          <span>{book.pages}页</span>
                          <span>{book.views?.toLocaleString()}阅读</span>
                          <span>{book.downloads?.toLocaleString()}下载</span>
                        </div>
                      </Space>
                    }
                  />
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      )}
      
      {/* 书籍编辑/创建模态框 */}
      <Modal
        title={isEditMode ? '编辑书籍' : '新建书籍'}
        open={isModalVisible}
        onOk={handleSave}
        onCancel={() => setIsModalVisible(false)}
        width={700}
        okText="保存"
        cancelText="取消"
        confirmLoading={false}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            category: BookCategory.SALES_PSYCHOLOGY,
            difficulty: VideoDifficulty.BEGINNER,
            status: BookStatus.AVAILABLE,
            pages: 200,
            readingTime: 300,
            tags: [],
            keyPoints: [],
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="书籍标题"
                name="title"
                rules={[{ required: true, message: '请输入书籍标题' }]}
              >
                <Input placeholder="请输入书籍标题" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="作者"
                name="author"
                rules={[{ required: true, message: '请输入作者' }]}
              >
                <Input placeholder="请输入作者" />
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item
            label="书籍描述"
            name="description"
            rules={[{ required: true, message: '请输入书籍描述' }]}
          >
            <TextArea rows={3} placeholder="请输入书籍描述" />
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="分类"
                name="category"
                rules={[{ required: true, message: '请选择分类' }]}
              >
                <Select placeholder="请选择分类">
                  {Object.values(BookCategory).map((category) => (
                    <Option key={category} value={category}>
                      {getCategoryLabel(category)}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="难度等级"
                name="difficulty"
                rules={[{ required: true, message: '请选择难度等级' }]}
              >
                <Select placeholder="请选择难度等级">
                  {Object.values(VideoDifficulty).map((difficulty) => (
                    <Option key={difficulty} value={difficulty}>
                      {getDifficultyLabel(difficulty)}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="状态"
                name="status"
                rules={[{ required: true, message: '请选择状态' }]}
              >
                <Select placeholder="请选择状态">
                  {Object.values(BookStatus).map((status) => (
                    <Option key={status} value={status}>
                      {getStatusLabel(status)}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="页数"
                name="pages"
                rules={[{ required: true, message: '请输入页数' }]}
              >
                <Input type="number" min={1} placeholder="请输入页数" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="建议阅读时间（分钟）"
                name="readingTime"
              >
                <Input type="number" min={1} placeholder="请输入建议阅读时间" />
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item
            label="书籍摘要"
            name="summary"
          >
            <TextArea rows={2} placeholder="请输入书籍摘要" />
          </Form.Item>
          
          <Form.Item
            label="关键要点"
            name="keyPoints"
          >
            <Select
              mode="tags"
              placeholder="请输入关键要点，按回车添加"
              style={{ width: '100%' }}
            />
          </Form.Item>
          
          <Form.Item
            label="标签"
            name="tags"
          >
            <Select
              mode="tags"
              placeholder="请输入标签，按回车添加"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            label="查看权限"
            name="access_level"
            tooltip="设置哪些等级的用户可以查看此电子书"
          >
            <Select placeholder="请选择查看权限">
              {accessLevelOptions.map((opt) => (
                <Option key={opt.value} value={opt.value}>{opt.label}</Option>
              ))}
            </Select>
          </Form.Item>
          
          <Divider>文件上传</Divider>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="封面图片">
                <Upload {...coverUploadProps} listType="picture">
                  <Button icon={<UploadOutlined />}>上传封面</Button>
                </Upload>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
                  建议尺寸：200x300px，支持 JPG、PNG、WEBP 格式
                </Text>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="书籍文件">
                <Upload {...ebookUploadProps} listType="text">
                  <Button icon={<UploadOutlined />}>上传书籍</Button>
                </Upload>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
                  支持 PDF、EPUB、DOC、TXT 格式，最大 100MB
                </Text>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* 分类管理模态框 */}
      <Modal
        title="电子书分类管理"
        open={catModalVisible}
        onCancel={() => setCatModalVisible(false)}
        footer={null}
        width={500}
      >
        <div style={{ marginBottom: 16 }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddCategory} size="small">
            新增分类
          </Button>
        </div>
        <List
          dataSource={categories}
          renderItem={(cat: any) => (
            <List.Item
              actions={[
                <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEditCategory(cat)} />,
                <Popconfirm title="确定删除此分类？" onConfirm={() => handleDeleteCategory(cat.id)} okText="确定" cancelText="取消">
                  <Button type="link" size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>,
              ]}
            >
              <List.Item.Meta
                avatar={<span style={{ fontSize: 24 }}>{cat.icon || '📁'}</span>}
                title={cat.name}
                description={`排序: ${cat.sort_order} | 状态: ${cat.status === 1 ? '启用' : '停用'}`}
              />
            </List.Item>
          )}
        />
        {editingCategory && (
          <Modal
            title={editingCategory.id ? '编辑分类' : '新增分类'}
            open={true}
            onOk={handleSaveCategory}
            onCancel={() => setEditingCategory(null)}
            width={400}
            okText="保存"
            cancelText="取消"
          >
            <Form form={catForm} layout="vertical">
              <Form.Item label="分类名称" name="name" rules={[{ required: true, message: '请输入分类名称' }]}>
                <Input placeholder="如：代理商培训、产品教程" />
              </Form.Item>
              <Form.Item label="图标Emoji" name="icon">
                <Input placeholder="如：🎓、📦、🧴" />
              </Form.Item>
              <Form.Item label="排序号" name="sort_order">
                <Input type="number" placeholder="数字越小越靠前" />
              </Form.Item>
            </Form>
          </Modal>
        )}
      </Modal>

      {/* 阅读统计面板 */}
      <Modal
        title="电子书阅读数据统计"
        open={statsPanelVisible}
        onCancel={() => setStatsPanelVisible(false)}
        footer={null}
        width={800}
      >
        <Spin spinning={statsLoading}>
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col span={12}>
              <Card size="small">
                <Statistic
                  title="总阅读人数"
                  value={readingStats.readerCount || 0}
                  prefix={<TeamOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small">
                <Statistic
                  title="热门书籍 TOP10"
                  value={readingStats.topBooks?.length || 0}
                  prefix={<StarOutlined />}
                  valueStyle={{ color: '#faad14' }}
                />
              </Card>
            </Col>
          </Row>

          <Title level={5}>热门书籍 TOP10</Title>
          <Table
            dataSource={(readingStats.topBooks || []).map((b: any, i: number) => ({ ...b, key: b.id, rank: i + 1 }))}
            columns={[
              { title: '#', dataIndex: 'rank', width: 40 },
              { title: '书名', dataIndex: 'title', ellipsis: true },
              { title: '分类', dataIndex: 'category', width: 100 },
              { title: '阅读人数', dataIndex: 'reader_count', width: 90 },
              { title: '浏览量', dataIndex: 'views', width: 90 },
            ]}
            size="small"
            pagination={false}
            scroll={{ y: 240 }}
          />

          <Title level={5} style={{ marginTop: 24 }}>最近阅读记录</Title>
          <Table
            dataSource={(readingStats.recentReads || []).map((r: any, i: number) => ({ ...r, key: i }))}
            columns={[
              { title: '读者', dataIndex: 'real_name', width: 100, render: (t, r: any) => t || r.username },
              { title: '书名', dataIndex: 'book_title', ellipsis: true },
              { title: '进度', dataIndex: 'progress', width: 80, render: (v: number) => <Progress percent={v} size="small" /> },
              { title: '时间', dataIndex: 'last_read_time', width: 140 },
            ]}
            size="small"
            pagination={false}
            scroll={{ y: 240 }}
          />
        </Spin>
      </Modal>

      {/* 电子书在线阅读器 */}
      <EbookReader
        visible={isReaderVisible}
        bookId={readingBook?.id || ''}
        bookTitle={readingBook?.title || ''}
        bookFormat={readingBook?.fileFormat || ''}
        fileUrl={(readingBook as any)?.fileUrl || (readingBook as any)?.file_url || ''}
        onClose={() => {
          setIsReaderVisible(false);
          setReadingBook(null);
        }}
      />
    </div>
  );
};

export default BookManagement;