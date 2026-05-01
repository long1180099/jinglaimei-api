// 商品API服务
import { Product, ProductCategory, ProductFilterParams, ProductCreateRequest, ProductUpdateRequest, ProductSalesStats, InventoryAlert } from '../types/product';
import { mockProductData, mockCategories, mockInventoryAlerts, mockSalesStats } from './mockData/productMockData';

export const productApi = {
  // 获取商品列表
  getProducts: async (params: ProductFilterParams): Promise<{ products: Product[]; total: number }> => {
    console.log('API: 获取商品列表', params);
    // 模拟API延迟
    await new Promise(resolve => setTimeout(resolve, 300));
    
    let filtered = [...mockProductData];
    
    // 分类筛选
    if (params.category && params.category !== 'all') {
      filtered = filtered.filter(p => p.category === params.category);
    }
    
    // 状态筛选
    if (params.status && params.status !== 'all') {
      filtered = filtered.filter(p => p.status === params.status);
    }
    
    // 价格范围筛选
    if (params.minPrice !== undefined) {
      filtered = filtered.filter(p => p.retailPrice >= params.minPrice!);
    }
    if (params.maxPrice !== undefined) {
      filtered = filtered.filter(p => p.retailPrice <= params.maxPrice!);
    }
    
    // 关键词搜索
    if (params.keyword) {
      const keyword = params.keyword.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(keyword) || 
        p.description.toLowerCase().includes(keyword) ||
        p.tags.some(tag => tag.toLowerCase().includes(keyword))
      );
    }
    
    // 标签筛选
    if (params.tags && params.tags.length > 0) {
      filtered = filtered.filter(p => 
        params.tags!.every(tag => p.tags.includes(tag))
      );
    }
    
    // 推荐筛选
    if (params.isFeatured !== undefined) {
      filtered = filtered.filter(p => p.isFeatured === params.isFeatured);
    }
    
    // 热销筛选
    if (params.isHot !== undefined) {
      filtered = filtered.filter(p => p.isHot === params.isHot);
    }
    
    // 分页
    const start = (params.page - 1) * params.pageSize;
    const end = start + params.pageSize;
    const paginated = filtered.slice(start, end);
    
    return {
      products: paginated,
      total: filtered.length
    };
  },

  // 获取单个商品
  getProduct: async (id: string): Promise<Product> => {
    console.log('API: 获取商品详情', id);
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const product = mockProductData.find(p => p.id === id);
    if (!product) {
      throw new Error('商品不存在');
    }
    return product;
  },

  // 创建商品
  createProduct: async (data: ProductCreateRequest): Promise<Product> => {
    console.log('API: 创建商品', data);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const newProduct: Product = {
      id: `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: data.name,
      category: data.category,
      description: data.description,
      retailPrice: data.retailPrice,
      agentPrice: data.agentPrice,
      vipPrice: data.vipPrice,
      partnerPrice: data.partnerPrice,
      costPrice: data.costPrice,
      stock: data.stock,
      soldCount: 0,
      unit: data.unit,
      specifications: data.specifications,
      images: data.images,
      tags: data.tags,
      status: data.status as any,
      commissionRate: data.commissionRate,
      weight: data.weight,
      dimensions: data.dimensions,
      shippingType: data.shippingType as any,
      shippingFee: data.shippingFee,
      minOrderQuantity: data.minOrderQuantity,
      maxOrderQuantity: data.maxOrderQuantity,
      isFeatured: false,
      isHot: false,
      salesTarget: 100,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // 模拟添加到列表（实际API会返回创建的对象）
    return newProduct;
  },

  // 更新商品
  updateProduct: async (data: ProductUpdateRequest): Promise<Product> => {
    console.log('API: 更新商品', data);
    await new Promise(resolve => setTimeout(resolve, 400));
    
    // 模拟更新逻辑
    const updatedProduct: Product = {
      ...mockProductData.find(p => p.id === data.id)!,
      ...data,
      updatedAt: new Date().toISOString(),
      status: data.status as 'active' | 'inactive' | 'out_of_stock' | 'pre_sale',
      shippingType: data.shippingType as 'free' | 'flat_rate' | 'calculated'
    };
    
    return updatedProduct;
  },

  // 删除商品
  deleteProduct: async (id: string): Promise<void> => {
    console.log('API: 删除商品', id);
    await new Promise(resolve => setTimeout(resolve, 300));
    // 模拟删除
    return;
  },

  // 批量更新商品状态
  batchUpdateStatus: async (ids: string[], status: string): Promise<void> => {
    console.log('API: 批量更新状态', { ids, status });
    await new Promise(resolve => setTimeout(resolve, 400));
    return;
  },

  // 获取商品分类
  getCategories: async (): Promise<ProductCategory[]> => {
    console.log('API: 获取分类列表');
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockCategories;
  },

  // 创建分类
  createCategory: async (data: Omit<ProductCategory, 'id' | 'productCount'>): Promise<ProductCategory> => {
    console.log('API: 创建分类', data);
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const newCategory: ProductCategory = {
      id: `cat_${Date.now()}`,
      ...data,
      productCount: 0
    };
    
    return newCategory;
  },

  // 更新分类
  updateCategory: async (data: ProductCategory): Promise<ProductCategory> => {
    console.log('API: 更新分类', data);
    await new Promise(resolve => setTimeout(resolve, 300));
    return data;
  },

  // 删除分类
  deleteCategory: async (id: string): Promise<void> => {
    console.log('API: 删除分类', id);
    await new Promise(resolve => setTimeout(resolve, 200));
    return;
  },

  // 获取商品销售统计
  getSalesStats: async (productId?: string): Promise<ProductSalesStats[]> => {
    console.log('API: 获取销售统计', productId);
    await new Promise(resolve => setTimeout(resolve, 300));
    
    if (productId) {
      return mockSalesStats.filter(stat => stat.productId === productId);
    }
    return mockSalesStats;
  },

  // 获取库存预警列表
  getInventoryAlerts: async (): Promise<InventoryAlert[]> => {
    console.log('API: 获取库存预警');
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockInventoryAlerts;
  },

  // 标记预警为已解决
  resolveAlert: async (alertId: string): Promise<void> => {
    console.log('API: 解决预警', alertId);
    await new Promise(resolve => setTimeout(resolve, 200));
    return;
  },

  // 获取热门标签
  getPopularTags: async (): Promise<string[]> => {
    console.log('API: 获取热门标签');
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // 从所有商品中提取热门标签
    const allTags = mockProductData.flatMap(p => p.tags);
    const tagCounts: Record<string, number> = {};
    
    allTags.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
    
    return Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag]) => tag);
  }
};