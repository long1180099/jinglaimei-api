// 现代化的商品管理页面 - 重新设计UI
import React, { useEffect, useState } from 'react';
import { 
  Table, 
  Button, 
  Space, 
  Input, 
  Select, 
  Tag, 
  Modal, 
  Form, 
  Row, 
  Col, 
  Card, 
  Statistic,
  Alert,
  Popconfirm,
  message,
  Badge,
  Upload,
  Image,
  Divider,
  Tooltip,
  Dropdown,
  Avatar,
  Progress
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  SearchOutlined,
  FilterOutlined,
  EyeOutlined,
  ShoppingOutlined,
  StockOutlined,
  TagOutlined,
  UploadOutlined,
  SettingOutlined,
  StarOutlined,
  FireOutlined,
  RocketOutlined,
  DollarOutlined,
  BarChartOutlined,
  AppstoreOutlined,
  ExportOutlined,
  ImportOutlined,
  CloudUploadOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined,
  LineChartOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { 
  fetchProducts, 
  deleteProduct, 
  batchUpdateStatus,
  setFilters,
  clearSelectedProduct,
  fetchCategories,
  fetchPopularTags
} from '../store/slices/productSlice';
import { Product, ProductCategory } from '../types/product';
import ProductModal from '../components/products/ProductModal';
import CategoryModal from '../components/products/CategoryModal';
import PriceChart from '../components/products/PriceChart';
import InventoryAlertPanel from '../components/products/InventoryAlertPanel';
import ProductStatsCard from '../components/products/ProductStatsCard';
import './ProductManagement.css';

const { Search } = Input;
const { Option } = Select;

const ProductManagementNew: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { products, categories, pagination, filters, loading, popularTags } = useSelector(
    (state: RootState) => state.product
  );

  // 状态管理
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [productModalVisible, setProductModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [searchValue, setSearchValue] = useState('');
  const [form] = Form.useForm();
  const [sortConfig, setSortConfig] = useState({ field: 'createdAt', order: 'descend' });
  const [viewMode, setViewMode] = useState<'card' | 'list'>('list');

  // 初始化数据
  useEffect(() => {
    dispatch(fetchProducts(filters));
    dispatch(fetchCategories());
    dispatch(fetchPopularTags());
  }, [dispatch, filters]);

  // 处理分页变化
  const handlePaginationChange = (page: number, pageSize: number) => {
    dispatch(setFilters({ page, pageSize }));
  };

  // 处理搜索
  const handleSearch = (value: string) => {
    dispatch(setFilters({ keyword: value, page: 1 }));
  };

  // 处理状态筛选
  const handleStatusFilter = (status: string) => {
    dispatch(setFilters({ status, page: 1 }));
  };

  // 处理分类筛选
  const handleCategoryFilter = (category: string) => {
    dispatch(setFilters({ category, page: 1 }));
  };

  // 处理标签筛选
  const handleTagFilter = (tag: string) => {
    const currentTags = filters.tags || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag];
    dispatch(setFilters({ tags: newTags, page: 1 }));
  };

  // 排序处理
  const handleSort = (field: string) => {
    const order = sortConfig.field === field && sortConfig.order === 'descend' ? 'ascend' : 'descend';
    setSortConfig({ field, order });
    // 这里可以调用排序API
    message.info(`按${getSortFieldName(field)}${order === 'descend' ? '降序' : '升序'}排序`);
  };

  const getSortFieldName = (field: string) => {
    const fieldNames: Record<string, string> = {
      'price': '价格',
      'stock': '库存',
      'sales': '销量',
      'createdAt': '创建时间',
      'commissionRate': '佣金比例'
    };
    return fieldNames[field] || field;
  };

  // 创建商品
  const handleCreateProduct = () => {
    setEditingProduct(null);
    setProductModalVisible(true);
  };

  // 编辑商品
  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductModalVisible(true);
  };

  // 查看商品详情
  const handleViewProduct = (product: Product) => {
    Modal.info({
      title: product.name,
      width: 800,
      className: 'pm-modal',
      content: (
        <div className="pm-detail-modal">
          <Row gutter={24}>
            <Col span={8}>
              <Image
                width="100%"
                src={product.images[0] || 'https://via.placeholder.com/300'}
                fallback="https://via.placeholder.com/300"
                style={{ borderRadius: 10, marginBottom: 16 }}
              />
            </Col>
            <Col span={16}>
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ margin: '0 0 8px' }}>{product.name}</h2>
                <p style={{ color: '#64748b', margin: '0 0 10px', fontSize: 14 }}>{product.description}</p>
                <Space wrap>
                  <span className="pm-product-cat-tag">{product.category}</span>
                  {product.isFeatured && <span className="pm-feature-tag">★ 推荐</span>}
                  {product.isHot && <span className="pm-hot-tag">🔥 热销</span>}
                </Space>
              </div>

              <Divider />

              {/* 六级价格体系展示 */}
              <Divider orientation="left" style={{ fontWeight: 600 }}>💰 六级价格体系</Divider>
              <Row gutter={12} style={{ marginBottom: 16 }}>
                <Col span={4}>
                  <div className="price-detail-card retail">
                    <div className="price-detail-label">零售价</div>
                    <div className="price-detail-value">¥{product.retailPrice.toFixed(2)}</div>
                    <div className="price-detail-desc">建议零售价</div>
                  </div>
                </Col>
                <Col span={4}>
                  <div className="price-detail-card vip">
                    <div className="price-detail-label">代言人</div>
                    <div className="price-detail-value">¥{product.vipPrice?.toFixed(2) || product.retailPrice.toFixed(2)}</div>
                    <div className="price-detail-desc">打版代言人</div>
                  </div>
                </Col>
                <Col span={4}>
                  <div className="price-detail-card agent">
                    <div className="price-detail-label">代理</div>
                    <div className="price-detail-value">¥{product.agentPrice.toFixed(2)}</div>
                    <div className="price-detail-desc">代理商进货</div>
                  </div>
                </Col>
                <Col span={4}>
                  <div className="price-detail-card partner">
                    <div className="price-detail-label">批发</div>
                    <div className="price-detail-value">¥{product.partnerPrice?.toFixed(2) || product.agentPrice.toFixed(2)}</div>
                    <div className="price-detail-desc">批发商进货</div>
                  </div>
                </Col>
                <Col span={4}>
                  <div className="price-detail-card chief">
                    <div className="price-detail-label">分公司</div>
                    <div className="price-detail-value">¥{(product as any).chiefPrice?.toFixed(2) || product.partnerPrice?.toFixed(2) || product.agentPrice.toFixed(2)}</div>
                    <div className="price-detail-desc">首席分公司</div>
                  </div>
                </Col>
                <Col span={4}>
                  <div className="price-detail-card division">
                    <div className="price-detail-label">事业部</div>
                    <div className="price-detail-value">¥{(product as any).divisionPrice?.toFixed(2) || (product as any).chiefPrice?.toFixed(2) || product.partnerPrice?.toFixed(2) || product.agentPrice.toFixed(2)}</div>
                    <div className="price-detail-desc">集团事业部</div>
                  </div>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <div className="info-card">
                    <div className="info-item">
                      <span>商品ID</span>
                      <span className="info-value">{product.id}</span>
                    </div>
                    <div className="info-item">
                      <span>商品编码</span>
                      <span className="info-value">{product.sku || '-'}</span>
                    </div>
                    <div className="info-item">
                      <span>单位</span>
                      <span className="info-value">{product.unit}</span>
                    </div>
                    <div className="info-item">
                      <span>创建时间</span>
                      <span className="info-value">{new Date(product.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div className="info-card">
                    <div className="info-item">
                      <span>佣金比例</span>
                      <span className="info-value highlight">{`${(product.commissionRate * 100).toFixed(1)}%`}</span>
                    </div>
                    <div className="info-item">
                      <span>累计销量</span>
                      <span className="info-value">{product.soldCount}件</span>
                    </div>
                    <div className="info-item">
                      <span>库存预警</span>
                      <span className={`info-value ${product.stock < 50 ? 'warn' : ''}`}>
                        {product.stock < 50 ? `⚠ 低库存 (${product.stock})` : `✓ 充足 (${product.stock})`}
                      </span>
                    </div>
                    <div className="info-item">
                      <span>成本价</span>
                      <span className="info-value">¥{product.costPrice?.toFixed(2) || '-'}</span>
                    </div>
                  </div>
                </Col>
              </Row>
            </Col>
          </Row>
        </div>
      ),
      okText: '关闭'
    });
  };

  // 删除商品
  const handleDeleteProduct = async (id: string) => {
    try {
      await dispatch(deleteProduct(id)).unwrap();
      message.success('商品删除成功');
      setSelectedRowKeys(selectedRowKeys.filter(key => key !== id));
      // 重新拉取列表确保数据与后端同步
      dispatch(fetchProducts(filters));
    } catch (error) {
      message.error('删除失败：' + (error as Error).message);
    }
  };

  // 批量操作
  const handleBatchAction = (action: string) => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择商品');
      return;
    }

    const actions: Record<string, { title: string, content: string, handler: () => Promise<void> }> = {
      delete: {
        title: '确认批量删除',
        content: `确定要删除选中的 ${selectedRowKeys.length} 个商品吗？`,
        handler: async () => {
          try {
            for (const id of selectedRowKeys) {
              await dispatch(deleteProduct(id.toString())).unwrap();
            }
            message.success(`成功删除 ${selectedRowKeys.length} 个商品`);
            setSelectedRowKeys([]);
            // 重新拉取列表确保数据与后端同步
            dispatch(fetchProducts(filters));
          } catch (error) {
            message.error('批量删除失败');
          }
        }
      },
      activate: {
        title: '批量上架',
        content: `确定要将选中的 ${selectedRowKeys.length} 个商品上架吗？`,
        handler: async () => {
          try {
            await dispatch(batchUpdateStatus({
              ids: selectedRowKeys.map(key => key.toString()),
              status: 'active'
            })).unwrap();
            message.success('批量上架成功');
            setSelectedRowKeys([]);
          } catch (error) {
            message.error('批量上架失败');
          }
        }
      },
      inactivate: {
        title: '批量下架',
        content: `确定要将选中的 ${selectedRowKeys.length} 个商品下架吗？`,
        handler: async () => {
          try {
            await dispatch(batchUpdateStatus({
              ids: selectedRowKeys.map(key => key.toString()),
              status: 'inactive'
            })).unwrap();
            message.success('批量下架成功');
            setSelectedRowKeys([]);
          } catch (error) {
            message.error('批量下架失败');
          }
        }
      }
    };

    const config = actions[action];
    if (config) {
      Modal.confirm({
        title: config.title,
        content: config.content,
        onOk: config.handler
      });
    }
  };

  // 创建分类
  const handleCreateCategory = () => {
    setEditingCategory(null);
    setCategoryModalVisible(true);
  };

  // 编辑分类
  const handleEditCategory = (category: ProductCategory) => {
    setEditingCategory(category);
    setCategoryModalVisible(true);
  };

  // 价格卡片组件 - 六级价格体系
  const PriceCard: React.FC<{ product: Product }> = ({ product }) => {
    return (
      <div className="pm-price-card">
        <div className="pm-price-row">
          <span className="pm-price-label retail">零售</span>
          <span className="pm-price-val retail">¥{product.retailPrice.toFixed(2)}</span>
        </div>
        <div className="pm-price-row">
          <span className="pm-price-label vip">代言</span>
          <span className="pm-price-val vip">¥{product.vipPrice?.toFixed(2) || product.retailPrice.toFixed(2)}</span>
        </div>
        <div className="pm-price-row">
          <span className="pm-price-label agent">代理</span>
          <span className="pm-price-val agent">¥{product.agentPrice.toFixed(2)}</span>
        </div>
        <div className="pm-price-row">
          <span className="pm-price-label partner">批发</span>
          <span className="pm-price-val partner">¥{product.partnerPrice?.toFixed(2) || product.agentPrice.toFixed(2)}</span>
        </div>
        <div className="pm-price-row">
          <span className="pm-price-label chief">分公司</span>
          <span className="pm-price-val chief">¥{product.chiefPrice?.toFixed(2) || '-'}</span>
        </div>
        <div className="pm-price-row">
          <span className="pm-price-label division">事业部</span>
          <span className="pm-price-val division">¥{product.divisionPrice?.toFixed(2) || '-'}</span>
        </div>
      </div>
    );
  };

  // 库存状态组件
  const StockStatus: React.FC<{ stock: number; unit: string }> = ({ stock, unit }) => {
    const getStockLevel = (stock: number) => {
      if (stock === 0) return { level: 'out', label: '缺货' };
      if (stock < 20) return { level: 'low', label: '低库存' };
      if (stock < 100) return { level: 'medium', label: '一般' };
      return { level: 'high', label: '充足' };
    };

    const stockInfo = getStockLevel(stock);

    return (
      <div className="pm-stock-cell">
        <div className="pm-stock-num">{stock}</div>
        <div className={`pm-stock-label ${stockInfo.level}`}>{stockInfo.label}</div>
      </div>
    );
  };

  // 商品状态组件
  const StatusBadge: React.FC<{ status: string; isFeatured?: boolean; isHot?: boolean }> = ({
    status, isFeatured, isHot
  }) => {
    const statusConfig: Record<string, { text: string; icon?: React.ReactNode }> = {
      active: { text: '销售中', icon: <ShoppingOutlined /> },
      inactive: { text: '已下架', icon: <StockOutlined /> },
      out_of_stock: { text: '缺货', icon: <WarningOutlined /> },
      pre_sale: { text: '预售', icon: <RocketOutlined /> }
    };

    const config = statusConfig[status] || { text: status };
    const statusClass = status === 'out_of_stock' ? 'out_of_stock' : status;

    return (
      <div className="pm-status-wrap">
        <div className={`pm-status-badge ${statusClass}`}>
          {config.icon && <span className="pm-status-dot" />}
          <span>{config.text}</span>
        </div>
        <div className="pm-status-tags">
          {isFeatured && <span className="pm-feature-tag">★ 推荐</span>}
          {isHot && <span className="pm-hot-tag">🔥 热销</span>}
        </div>
      </div>
    );
  };

  // 表格列定义
  const columns = [
    {
      title: '商品信息',
      key: 'info',
      width: 300,
      render: (_: any, record: Product) => (
        <div className="pm-product-cell">
          <Image
            width={60}
            height={60}
            src={record.images[0] || 'https://via.placeholder.com/60'}
            fallback="https://via.placeholder.com/60"
            className="pm-product-img"
          />
          <div className="pm-product-info">
            <div className="pm-product-name">{record.name}</div>
            <div className="pm-product-meta">
              <span className="pm-product-id">ID: {record.id}</span>
              <span className="pm-product-cat-tag">{record.category}</span>
            </div>
            <div className="pm-product-desc">{record.description?.substring(0, 50)}...</div>
          </div>
        </div>
      )
    },
    {
      title: (
        <div className="sort-header" onClick={() => handleSort('price')}>
          价格体系
          {sortConfig.field === 'price' && (
            sortConfig.order === 'descend' ? <SortDescendingOutlined /> : <SortAscendingOutlined />
          )}
        </div>
      ),
      key: 'price',
      width: 180,
      render: (_: any, record: Product) => <PriceCard product={record} />
    },
    {
      title: (
        <div className="sort-header" onClick={() => handleSort('stock')}>
          库存状态
          {sortConfig.field === 'stock' && (
            sortConfig.order === 'descend' ? <SortDescendingOutlined /> : <SortAscendingOutlined />
          )}
        </div>
      ),
      key: 'stock',
      width: 140,
      render: (_: any, record: Product) => (
        <StockStatus stock={record.stock} unit={record.unit} />
      )
    },
    {
      title: '销量',
      key: 'sales',
      width: 100,
      render: (_: any, record: Product) => (
        <div className="pm-sales-cell">
          <div className="pm-sales-val">{record.soldCount}</div>
          <div className="pm-sales-trend">↑ 12.5%</div>
        </div>
      )
    },
    {
      title: '商品状态',
      key: 'status',
      width: 180,
      render: (_: any, record: Product) => (
        <StatusBadge 
          status={record.status} 
          isFeatured={record.isFeatured} 
          isHot={record.isHot} 
        />
      )
    },
    {
      title: (
        <div className="sort-header" onClick={() => handleSort('commissionRate')}>
          佣金比例
          {sortConfig.field === 'commissionRate' && (
            sortConfig.order === 'descend' ? <SortDescendingOutlined /> : <SortAscendingOutlined />
          )}
        </div>
      ),
      key: 'commissionRate',
      width: 120,
      render: (_: any, record: Product) => (
        <div className="pm-commission-cell">
          <div className="pm-commission-val">{`${(record.commissionRate * 100).toFixed(1)}%`}</div>
          <div className="pm-commission-sub">约 ¥{(record.agentPrice * record.commissionRate).toFixed(2)}</div>
        </div>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      fixed: 'right' as const,
      render: (_: any, record: Product) => (
        <div className="pm-actions">
          <Tooltip title="查看详情">
            <button className="pm-action-btn" onClick={() => handleViewProduct(record)}>
              <EyeOutlined />
            </button>
          </Tooltip>
          <Tooltip title="编辑商品">
            <button className="pm-action-btn" onClick={() => handleEditProduct(record)}>
              <EditOutlined />
            </button>
          </Tooltip>
          <Popconfirm
            title="确定要删除这个商品吗？"
            onConfirm={() => handleDeleteProduct(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除商品">
              <button className="pm-action-btn danger">
                <DeleteOutlined />
              </button>
            </Tooltip>
          </Popconfirm>
        </div>
      )
    }
  ];

  // 行选择配置
  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
    selections: [
      Table.SELECTION_ALL,
      Table.SELECTION_INVERT,
      Table.SELECTION_NONE,
    ],
  };

  // 统计信息
  const totalProducts = pagination.total;
  const activeProducts = products.filter(p => p.status === 'active').length;
  const lowStockProducts = products.filter(p => p.stock < 20).length;
  const totalRevenue = products.reduce((sum, p) => sum + p.retailPrice * p.soldCount, 0);
  const avgCommissionRate = products.length > 0 
    ? products.reduce((sum, p) => sum + p.commissionRate, 0) / products.length 
    : 0;

  // 商品分类统计
  const categoryStats = categories.map(category => ({
    name: category.name,
    count: products.filter(p => p.category === category.name).length,
    revenue: products.filter(p => p.category === category.name)
      .reduce((sum, p) => sum + p.retailPrice * p.soldCount, 0)
  }));

  return (
    <div className="product-management-page">
      {/* 页面头部 */}
      <div className="pm-header">
        <div className="pm-header-left">
          <h1 className="pm-title">商品管理中心</h1>
          <p className="pm-subtitle">全面管理您的商品信息，实时掌握库存与销售状况</p>
        </div>
        <div className="pm-header-actions">
          <button className="pm-btn-header primary" onClick={() => message.info('批量导入功能开发中')}>
            <CloudUploadOutlined /> 批量导入
          </button>
          <button className="pm-btn-header" onClick={() => message.info('导出功能开发中')}>
            <ExportOutlined /> 导出数据
          </button>
          <Dropdown menu={{
            items: [
              { key: 'template', label: '下载模板' },
              { key: 'history', label: '导入历史' },
              { key: 'settings', label: '导入设置' },
            ]
          }}>
            <button className="pm-btn-header">
              <SettingOutlined /> 更多操作
            </button>
          </Dropdown>
        </div>
      </div>

      {/* KPI统计卡片 */}
      <div className="pm-kpi-section">
        <div className="pm-kpi-card" data-type="total">
          <div className="pm-kpi-top">
            <div className="pm-kpi-icon total"><ShoppingOutlined /></div>
            <span className="pm-kpi-trend up">↑ 5.2% 较上月</span>
          </div>
          <div className="pm-kpi-label">商品总数</div>
          <div className="pm-kpi-value">{totalProducts}<span className="pm-kpi-unit">件</span></div>
        </div>
        <div className="pm-kpi-card" data-type="active">
          <div className="pm-kpi-top">
            <div className="pm-kpi-icon active"><StockOutlined /></div>
            <span className="pm-kpi-trend up">↑ 8.7% 较上周</span>
          </div>
          <div className="pm-kpi-label">在售商品</div>
          <div className="pm-kpi-value">{activeProducts}<span className="pm-kpi-unit">件</span></div>
        </div>
        <div className="pm-kpi-card" data-type="warning">
          <div className="pm-kpi-top">
            <div className="pm-kpi-icon warning"><WarningOutlined /></div>
            <span className="pm-kpi-trend warn">⚠ 需补货</span>
          </div>
          <div className="pm-kpi-label">低库存商品</div>
          <div className="pm-kpi-value">{lowStockProducts}<span className="pm-kpi-unit">件</span></div>
        </div>
        <div className="pm-kpi-card" data-type="revenue">
          <div className="pm-kpi-top">
            <div className="pm-kpi-icon revenue"><DollarOutlined /></div>
            <span className="pm-kpi-trend up">↑ 15.3% 较上月</span>
          </div>
          <div className="pm-kpi-label">总销售额</div>
          <div className="pm-kpi-value">¥{totalRevenue.toFixed(2)}</div>
        </div>
      </div>

      {/* 筛选与分类区域 */}
      <div className="pm-toolbar">
        <div className="pm-toolbar-inner">
          <div className="pm-toolbar-row">
            <div className="pm-search-wrapper">
              <Search
                placeholder="搜索商品名称、描述、标签..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onSearch={handleSearch}
                enterButton={<SearchOutlined />}
                size="middle"
              />
            </div>
            
            <div className="pm-filter-group">
              <Select placeholder="状态筛选" style={{ width: 130 }} onChange={handleStatusFilter} allowClear size="middle">
                <Option value="all">全部状态</Option>
                <Option value="active">销售中</Option>
                <Option value="inactive">已下架</Option>
                <Option value="out_of_stock">缺货</Option>
                <Option value="pre_sale">预售</Option>
              </Select>
              <Select placeholder="分类筛选" style={{ width: 130 }} onChange={handleCategoryFilter} allowClear size="middle">
                <Option value="all">全部分类</Option>
                {categories.map(category => (
                  <Option key={category.id} value={category.name}>{category.name}</Option>
                ))}
              </Select>
              <Select placeholder="价格区间" style={{ width: 150 }} allowClear size="middle">
                <Option value="0-100">0 - 100元</Option>
                <Option value="100-500">100 - 500元</Option>
                <Option value="500-1000">500 - 1000元</Option>
                <Option value="1000+">1000元以上</Option>
              </Select>

              <div className="pm-view-toggle">
                <button
                  className={`pm-view-btn ${viewMode === 'card' ? 'active' : ''}`}
                  onClick={() => setViewMode('card')}
                >
                  <AppstoreOutlined /> 卡片
                </button>
                <button
                  className={`pm-view-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => setViewMode('list')}
                >
                  <BarChartOutlined /> 列表
                </button>
              </div>
            </div>
          </div>

          {/* 热门标签 */}
          {popularTags.length > 0 && (
            <div className="pm-toolbar-row">
              <div className="pm-tag-row">
                <span className="pm-tag-label">热门标签：</span>
                <div className="pm-tag-list">
                  {popularTags.map(tag => {
                    const isSelected = (filters.tags || []).includes(tag);
                    return (
                      <span
                        key={tag}
                        className={`pm-tag-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleTagFilter(tag)}
                      >
                        {tag}
                        {isSelected && <span className="pm-tag-check">✓</span>}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* 分类统计 */}
              <div className="pm-category-stats">
                <div className="pm-stats-title">分类统计</div>
                {categoryStats.map((stat, index) => (
                  <div key={index} className="pm-stat-item">
                    <div className="pm-stat-header">
                      <span className="pm-stat-name">{stat.name}</span>
                      <span className="pm-stat-count">{stat.count}个商品</span>
                    </div>
                    <div className="pm-stat-bar">
                      <div className="pm-stat-fill" style={{ width: `${totalProducts > 0 ? (stat.count / totalProducts) * 100 : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 主要操作区域 */}
      <div className="pm-action-section">
        <div className="pm-action-header">
          <div className="pm-action-title">
            商品列表
            {selectedRowKeys.length > 0 && (
              <span className="pm-selected-badge">已选择 {selectedRowKeys.length} 个商品</span>
            )}
          </div>
          <div className="pm-action-buttons">
            <button className="pm-btn-primary" onClick={handleCreateProduct}>
              <PlusOutlined /> 新增商品
            </button>
            <button className="pm-btn-default" onClick={handleCreateCategory}>
              <AppstoreOutlined /> 分类管理
            </button>
            
            {selectedRowKeys.length > 0 && (
              <>
                <button className="pm-btn-danger" onClick={() => handleBatchAction('delete')}>
                  批量删除
                </button>
                <button className="pm-btn-default" onClick={() => handleBatchAction('activate')}>
                  批量上架
                </button>
                <button className="pm-btn-default" onClick={() => handleBatchAction('inactivate')}>
                  批量下架
                </button>
              </>
            )}
          </div>
        </div>

        {/* 商品表格 */}
        <div className="pm-table-wrap">
          <Table
            rowKey="id"
            columns={columns}
            dataSource={products}
            loading={loading}
            rowSelection={rowSelection}
            pagination={{
              current: pagination.page,
              pageSize: pagination.pageSize,
              total: pagination.total,
              onChange: handlePaginationChange,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => (
                <span className="pm-pagination-info">
                  显示第 {range[0]}-{range[1]} 条，共 {total} 条记录
                </span>
              )
            }}
            scroll={{ x: 1300 }}
            className="pm-table"
          />
        </div>
      </div>

      {/* 侧边统计面板 */}
      <div className="pm-sidebar-section">
        <div className="pm-sidebar-card">
          <div className="pm-sidebar-header">
            <LineChartOutlined /> 价格趋势
          </div>
          <PriceChart products={products} />
        </div>
        <div className="pm-sidebar-card">
          <div className="pm-sidebar-header">
            <WarningOutlined /> 库存预警
          </div>
          <InventoryAlertPanel />
        </div>
        <div className="pm-sidebar-card">
          <div className="pm-sidebar-header">
            <BarChartOutlined /> 佣金统计
          </div>
          <div className="pm-commission-list">
            <div className="pm-commission-item">
              <span className="pm-commission-label">平均佣金比例</span>
              <span className="pm-commission-val">{`${(avgCommissionRate * 100).toFixed(1)}%`}</span>
            </div>
            <div className="pm-commission-item">
              <span className="pm-commission-label">最高佣金商品</span>
              <span className="pm-commission-val">美颜面霜 (12.5%)</span>
            </div>
            <div className="pm-commission-item">
              <span className="pm-commission-label">最低佣金商品</span>
              <span className="pm-commission-val">试用装 (3.5%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 商品编辑/创建模态框 */}
      <ProductModal
        visible={productModalVisible}
        editingProduct={editingProduct}
        categories={categories}
        onCancel={() => {
          setProductModalVisible(false);
          setEditingProduct(null);
          dispatch(clearSelectedProduct());
        }}
        onSuccess={() => {
          setProductModalVisible(false);
          setEditingProduct(null);
          dispatch(fetchProducts(filters));
        }}
      />

      {/* 分类管理模态框 */}
      <CategoryModal
        visible={categoryModalVisible}
        editingCategory={editingCategory}
        categories={categories}
        onCancel={() => {
          setCategoryModalVisible(false);
          setEditingCategory(null);
        }}
        onSuccess={() => {
          setCategoryModalVisible(false);
          setEditingCategory(null);
          dispatch(fetchCategories());
        }}
      />
    </div>
  );
};

export default ProductManagementNew;