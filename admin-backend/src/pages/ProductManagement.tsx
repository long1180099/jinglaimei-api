// 商品管理页面
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
  Image
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

const { Search } = Input;
const { Option } = Select;

const ProductManagement: React.FC = () => {
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
    // 跳转到商品详情页（待实现）
    message.info(`查看商品：${product.name}`);
  };

  // 删除商品
  const handleDeleteProduct = async (id: string) => {
    try {
      await dispatch(deleteProduct(id)).unwrap();
      message.success('商品删除成功');
      setSelectedRowKeys(selectedRowKeys.filter(key => key !== id));
      // 重新拉取列表确保数据同步
      dispatch(fetchProducts(filters));
    } catch (error) {
      message.error('删除失败：' + (error as Error).message);
    }
  };

  // 批量删除
  const handleBatchDelete = () => {
    Modal.confirm({
      title: '确认批量删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 个商品吗？`,
      onOk: async () => {
        try {
          for (const id of selectedRowKeys) {
            await dispatch(deleteProduct(id.toString())).unwrap();
          }
          message.success(`成功删除 ${selectedRowKeys.length} 个商品`);
          setSelectedRowKeys([]);
          // 重新拉取列表确保数据同步
          dispatch(fetchProducts(filters));
        } catch (error) {
          message.error('批量删除失败');
        }
      }
    });
  };

  // 批量上架
  const handleBatchActivate = () => {
    Modal.confirm({
      title: '批量上架',
      content: `确定要将选中的 ${selectedRowKeys.length} 个商品上架吗？`,
      onOk: async () => {
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
    });
  };

  // 批量下架
  const handleBatchInactivate = () => {
    Modal.confirm({
      title: '批量下架',
      content: `确定要将选中的 ${selectedRowKeys.length} 个商品下架吗？`,
      onOk: async () => {
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
    });
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

  // 表格列定义
  const columns = [
    {
      title: '商品信息',
      key: 'info',
      render: (_: any, record: Product) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Image
            width={60}
            height={60}
            src={record.images[0] || 'https://via.placeholder.com/60'}
            fallback="https://via.placeholder.com/60"
            style={{ borderRadius: 4, marginRight: 12 }}
          />
          <div>
            <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{record.name}</div>
            <div style={{ color: '#666', fontSize: 12 }}>ID: {record.id}</div>
            <div style={{ color: '#666', fontSize: 12 }}>分类: {record.category}</div>
          </div>
        </div>
      )
    },
    {
      title: '价格',
      key: 'price',
      render: (_: any, record: Product) => (
        <div style={{ fontSize: 11, lineHeight: 1.7 }}>
          <div>零售 <b>¥{record.retailPrice.toFixed(2)}</b></div>
          <div style={{ color: '#52c41a' }}>代言 ¥{record.vipPrice?.toFixed(2) || '-'}</div>
          <div style={{ color: '#1677ff' }}>代理 <b>¥{record.agentPrice.toFixed(2)}</b></div>
          <div style={{ color: '#fa8c16' }}>批发 ¥{record.partnerPrice?.toFixed(2) || '-'}</div>
          <div style={{ color: '#f5222d' }}>分公司 ¥{(record as any).chiefPrice?.toFixed(2) || '-'}</div>
          <div style={{ color: '#722ed1' }}>事业部 ¥{(record as any).divisionPrice?.toFixed(2) || '-'}</div>
        </div>
      )
    },
    {
      title: '库存',
      dataIndex: 'stock',
      key: 'stock',
      sorter: (a: Product, b: Product) => a.stock - b.stock,
      render: (stock: number, record: Product) => (
        <div>
          <div>{stock} {record.unit}</div>
          <div style={{ color: '#666', fontSize: 12 }}>
            已售: {record.soldCount}
          </div>
        </div>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      filters: [
        { text: '销售中', value: 'active' },
        { text: '已下架', value: 'inactive' },
        { text: '缺货', value: 'out_of_stock' },
        { text: '预售', value: 'pre_sale' }
      ],
      onFilter: (value: any, record: Product) => record.status === value,
      render: (status: string, record: Product) => {
        const statusConfig: Record<string, { color: string; text: string }> = {
          active: { color: 'success', text: '销售中' },
          inactive: { color: 'default', text: '已下架' },
          out_of_stock: { color: 'error', text: '缺货' },
          pre_sale: { color: 'processing', text: '预售' }
        };
        const config = statusConfig[status] || { color: 'default', text: status };
        
        return (
          <div>
            <Tag color={config.color}>{config.text}</Tag>
            {record.isFeatured && <Tag color="gold" style={{ marginLeft: 4 }}>推荐</Tag>}
            {record.isHot && <Tag color="red" style={{ marginLeft: 4 }}>热销</Tag>}
          </div>
        );
      }
    },
    {
      title: '佣金比例',
      dataIndex: 'commissionRate',
      key: 'commissionRate',
      sorter: (a: Product, b: Product) => a.commissionRate - b.commissionRate,
      render: (rate: number) => `${(rate * 100).toFixed(1)}%`
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags: string[]) => (
        <div style={{ maxWidth: 200 }}>
          {tags.slice(0, 3).map(tag => (
            <Tag key={tag} color="blue" style={{ marginBottom: 2 }}>{tag}</Tag>
          ))}
          {tags.length > 3 && <Tag>+{tags.length - 3}</Tag>}
        </div>
      )
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      sorter: (a: Product, b: Product) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      render: (date: string) => new Date(date).toLocaleDateString()
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_: any, record: Product) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewProduct(record)}
          >
            查看
          </Button>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditProduct(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个商品吗？"
            onConfirm={() => handleDeleteProduct(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  // 行选择配置
  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys)
  };

  // 统计信息
  const totalProducts = pagination.total;
  const activeProducts = products.filter(p => p.status === 'active').length;
  const lowStockProducts = products.filter(p => p.stock < 20).length;
  const totalRevenue = products.reduce((sum, p) => sum + p.retailPrice * p.soldCount, 0);

  return (
    <div style={{ padding: 24 }}>
      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <ProductStatsCard
            title="商品总数"
            value={totalProducts}
            icon={<ShoppingOutlined />}
            color="#1890ff"
          />
        </Col>
        <Col span={6}>
          <ProductStatsCard
            title="在售商品"
            value={activeProducts}
            icon={<StockOutlined />}
            color="#52c41a"
          />
        </Col>
        <Col span={6}>
          <ProductStatsCard
            title="低库存商品"
            value={lowStockProducts}
            icon={<WarningOutlined />}
            color="#faad14"
          />
        </Col>
        <Col span={6}>
          <ProductStatsCard
            title="总销售额"
            value={`¥${totalRevenue.toFixed(2)}`}
            icon={<TagOutlined />}
            color="#722ed1"
          />
        </Col>
      </Row>

      {/* 价格趋势图表 */}
      <Card title="商品价格趋势" style={{ marginBottom: 24 }}>
        <PriceChart products={products} />
      </Card>

      {/* 库存预警面板 */}
      <InventoryAlertPanel style={{ marginBottom: 24 }} />

      {/* 主要操作区域 */}
      <Card>
        {/* 工具栏 */}
        <div style={{ marginBottom: 16 }}>
          <Row gutter={[16, 16]} align="middle">
            <Col flex="auto">
              <Space>
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />} 
                  onClick={handleCreateProduct}
                >
                  新增商品
                </Button>
                <Button 
                  icon={<PlusOutlined />} 
                  onClick={handleCreateCategory}
                >
                  分类管理
                </Button>
                {selectedRowKeys.length > 0 && (
                  <>
                    <Button danger onClick={handleBatchDelete}>
                      批量删除 ({selectedRowKeys.length})
                    </Button>
                    <Button onClick={handleBatchActivate}>
                      批量上架 ({selectedRowKeys.length})
                    </Button>
                    <Button onClick={handleBatchInactivate}>
                      批量下架 ({selectedRowKeys.length})
                    </Button>
                  </>
                )}
              </Space>
            </Col>
            <Col>
              <Space>
                {/* 搜索框 */}
                <Search
                  placeholder="搜索商品名称、描述、标签"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onSearch={handleSearch}
                  style={{ width: 300 }}
                  enterButton={<SearchOutlined />}
                />
                
                {/* 状态筛选 */}
                <Select
                  placeholder="状态筛选"
                  style={{ width: 120 }}
                  onChange={handleStatusFilter}
                  allowClear
                >
                  <Option value="all">全部状态</Option>
                  <Option value="active">销售中</Option>
                  <Option value="inactive">已下架</Option>
                  <Option value="out_of_stock">缺货</Option>
                  <Option value="pre_sale">预售</Option>
                </Select>
                
                {/* 分类筛选 */}
                <Select
                  placeholder="分类筛选"
                  style={{ width: 120 }}
                  onChange={handleCategoryFilter}
                  allowClear
                >
                  <Option value="all">全部分类</Option>
                  {categories.map(category => (
                    <Option key={category.id} value={category.name}>
                      {category.name}
                    </Option>
                  ))}
                </Select>
              </Space>
            </Col>
          </Row>
        </div>

        {/* 热门标签筛选 */}
        {popularTags.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 8, color: '#666' }}>热门标签：</div>
            <Space wrap>
              {popularTags.map(tag => {
                const isSelected = (filters.tags || []).includes(tag);
                return (
                  <Tag
                    key={tag}
                    color={isSelected ? 'blue' : 'default'}
                    onClick={() => handleTagFilter(tag)}
                    style={{ cursor: 'pointer' }}
                  >
                    {tag} {isSelected && '✓'}
                  </Tag>
                );
              })}
            </Space>
          </div>
        )}

        {/* 商品表格 */}
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
            showTotal: (total) => `共 ${total} 条记录`
          }}
        />
      </Card>

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

export default ProductManagement;