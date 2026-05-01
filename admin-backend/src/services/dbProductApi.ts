// 商品API服务 - 对接真实数据库
import { Product, ProductCategory, ProductFilterParams, ProductCreateRequest, ProductUpdateRequest, ProductSalesStats, InventoryAlert } from '../types/product';
import apiClient from '../utils/apiClient';

// 数据库商品类型（与后端API对应）
export interface DBProduct {
  id: number;
  product_code: string;
  product_name: string;
  category_id: number;
  category_name?: string;
  brand?: string;
  retail_price: number;
  agent_price: number;
  vip_price?: number;
  partner_price?: number;
  wholesale_price?: number; // 批发商价
  chief_price?: number;     // 首席分公司价
  division_price?: number;  // 集团事业部价
  cost_price?: number;
  stock_quantity: number;
  sold_quantity: number;
  min_stock_alert: number;
  available_stock?: number;
  description?: string;
  specifications?: string;
  main_image?: string;
  image_gallery?: string;
  status: number; // 0-下架, 1-上架
  is_hot: number;
  is_recommend: number;
  sort_order: number;
  commission_rate?: number; // 商品佣金比例（小数，如0.15=15%）
  created_at: string;
  updated_at: string;
  salesTrend?: any[];
}

// 转换数据库商品为前端Product类型
const convertDBProductToProduct = (dbProduct: DBProduct): Product => {
  return {
    id: String(dbProduct.id),
    name: dbProduct.product_name,
    category: dbProduct.category_name || String(dbProduct.category_id),
    description: dbProduct.description || '',
    retailPrice: dbProduct.retail_price,
    agentPrice: dbProduct.agent_price,
    vipPrice: dbProduct.vip_price || dbProduct.agent_price * 0.9,
    partnerPrice: dbProduct.partner_price || dbProduct.agent_price * 0.85,
    wholesalePrice: dbProduct.wholesale_price || undefined,
    chiefPrice: dbProduct.chief_price || undefined,
    divisionPrice: dbProduct.division_price || undefined,
    costPrice: dbProduct.cost_price || dbProduct.agent_price * 0.5,
    stock: dbProduct.available_stock ?? (dbProduct.stock_quantity - dbProduct.sold_quantity),
    soldCount: dbProduct.sold_quantity,
    unit: '件',
    sku: dbProduct.product_code,
    specifications: dbProduct.specifications ? JSON.parse(dbProduct.specifications) : [],
    images: (function() {
      // 优先从image_gallery解析完整列表，否则回退到main_image
      if (dbProduct.image_gallery) {
        try { return JSON.parse(dbProduct.image_gallery).map(toFullImageUrl); } catch(e) { /* fallthrough */ }
      }
      return dbProduct.main_image ? [toFullImageUrl(dbProduct.main_image)] : [];
    })(),
    tags: [],
    status: dbProduct.status === 1 ? 'active' : dbProduct.stock_quantity === 0 ? 'out_of_stock' : 'inactive',
    commissionRate: dbProduct.commission_rate ?? 0, // 从数据库读取，默认0
    weight: 0.1,
    dimensions: { length: 10, width: 10, height: 10 },
    shippingType: 'free',
    shippingFee: 0,
    minOrderQuantity: 1,
    maxOrderQuantity: 100,
    isFeatured: dbProduct.is_recommend === 1,
    isHot: dbProduct.is_hot === 1,
    salesTarget: 100,
    createdAt: dbProduct.created_at,
    updatedAt: dbProduct.updated_at
  };
};

// 图片URL基础地址（与后端API_BASE保持一致）
// 本地开发用 localhost:4000，生产环境改回 http://118.195.185.6
const IMAGE_BASE_URL = 'http://localhost:4000';

// 确保图片URL是完整路径
export const toFullImageUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${IMAGE_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

// 转换前端Product为数据库商品类型
const convertProductToDBProduct = (product: Partial<ProductCreateRequest>): any => {
  // 将图片数组中的相对路径转为完整URL后再存储
  const images = Array.isArray(product.images) ? product.images : [];
  const fullImages = images.map(toFullImageUrl).filter(Boolean);
  
  return {
    product_code: product.sku || `SKU-${Date.now()}`,
    product_name: product.name,
    category_id: parseInt(product.category as string) || 1,
    brand: '静莱美',
    retail_price: product.retailPrice,
    agent_price: product.agentPrice,
    vip_price: product.vipPrice,
    partner_price: product.partnerPrice,
    wholesale_price: (product as any).wholesalePrice || null,
    chief_price: (product as any).chiefPrice || null,
    division_price: (product as any).divisionPrice || null,
    cost_price: product.costPrice,
    stock_quantity: product.stock,
    min_stock_alert: 10,
    description: product.description,
    specifications: JSON.stringify(product.specifications || []),
    main_image: fullImages.length > 0 ? fullImages[0] : null,
    image_gallery: JSON.stringify(fullImages),
    status: product.status === 'active' ? 1 : 0,
    is_hot: (product as any).isHot ? 1 : 0,
    is_recommend: (product as any).isFeatured ? 1 : 0,
    sort_order: 0,
    commission_rate: product.commissionRate ?? 0
  };
};

export const dbProductApi = {
  // 获取商品列表
  getProducts: async (params: ProductFilterParams): Promise<{ products: Product[]; total: number }> => {
    console.log('DB API: 获取商品列表', params);
    
    const response = await apiClient.get('/products', {
      params: {
        page: params.page,
        pageSize: params.pageSize,
        keyword: params.keyword,
        status: params.status === 'active' ? 1 : params.status === 'inactive' ? 0 : undefined,
        categoryId: params.category
      }
    });
    
    // apiClient拦截器已解包，response就是data.data的内容
    const { list, total } = response;
    return {
      products: list.map(convertDBProductToProduct),
      total
    };
  },

  // 获取单个商品
  getProduct: async (id: string): Promise<Product> => {
    console.log('DB API: 获取商品详情', id);
    const response = await apiClient.get(`/products/${id}`);
    return convertDBProductToProduct(response);
  },

  // 创建商品
  createProduct: async (data: ProductCreateRequest): Promise<Product> => {
    console.log('DB API: 创建商品 - 原始数据', JSON.stringify(data));
    const dbData = convertProductToDBProduct(data);
    console.log('DB API: 创建商品 - 转换后数据', JSON.stringify(dbData));
    
    // 安全检查：确保转换后的数据是后端期望的下划线格式
    if (!dbData.product_code && !dbData.product_name) {
      console.error('DB API: ⚠️ 字段转换异常！尝试强制修复');
      // 强制 fallback：如果转换失败，手动构建
      const fbImages = Array.isArray(data.images) ? data.images.map(toFullImageUrl).filter(Boolean) : [];
      const fallback: any = {
        product_code: data.sku || `SKU-${Date.now()}`,
        product_name: data.name,
        category_id: parseInt(String(data.category || '1')) || 1,
        brand: '静莱美',
        retail_price: Number(data.retailPrice) || 0,
        agent_price: Number(data.agentPrice) || 0,
        vip_price: Number(data.vipPrice) || null,
        partner_price: Number(data.partnerPrice) || null,
        wholesale_price: Number((data as any).wholesalePrice) || null,
        chief_price: Number((data as any).chiefPrice) || null,
        division_price: Number((data as any).divisionPrice) || null,
        cost_price: Number(data.costPrice) || 0,
        stock_quantity: Number(data.stock) || 0,
        min_stock_alert: 10,
        description: data.description || '',
        specifications: JSON.stringify(data.specifications || []),
        main_image: fbImages.length > 0 ? fbImages[0] : null,
        image_gallery: JSON.stringify(fbImages),
        status: data.status === 'active' ? 1 : 0,
        is_hot: (data as any).isHot ? 1 : 0,
        is_recommend: (data as any).isFeatured ? 1 : 0,
        sort_order: 0,
        commission_rate: data.commissionRate ?? 0
      };
      console.log('DB API: 使用fallback数据', JSON.stringify(fallback));
      var response = await apiClient.post('/products', fallback);
    } else {
      var response = await apiClient.post('/products', dbData);
    }
    
    // apiClient拦截器已解包，response就是data.data（{ id: N }）
    return {
      id: String(response.id),
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
      sku: data.sku,
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
  },

  // 更新商品
  updateProduct: async (data: ProductUpdateRequest): Promise<Product> => {
    console.log('DB API: 更新商品', data);
    const { id, ...updateData } = data;
    
    const dbUpdateData: any = {};
    if (updateData.name) dbUpdateData.product_name = updateData.name;
    if (updateData.retailPrice !== undefined) dbUpdateData.retail_price = updateData.retailPrice;
    if (updateData.agentPrice !== undefined) dbUpdateData.agent_price = updateData.agentPrice;
    if (updateData.vipPrice !== undefined) dbUpdateData.vip_price = updateData.vipPrice;
    if (updateData.partnerPrice !== undefined) dbUpdateData.partner_price = updateData.partnerPrice;
    // 六级价格（批发商/首席/事业部/成本）
    if ((updateData as any).wholesalePrice !== undefined) dbUpdateData.wholesale_price = (updateData as any).wholesalePrice;
    if ((updateData as any).chiefPrice !== undefined) dbUpdateData.chief_price = (updateData as any).chiefPrice;
    if ((updateData as any).divisionPrice !== undefined) dbUpdateData.division_price = (updateData as any).divisionPrice;
    if (updateData.costPrice !== undefined) dbUpdateData.cost_price = updateData.costPrice;
    if (updateData.stock !== undefined) dbUpdateData.stock_quantity = updateData.stock;
    if (updateData.status) dbUpdateData.status = updateData.status === 'active' ? 1 : 0;
    if (updateData.description) dbUpdateData.description = updateData.description;
    // 佣金比例（前端传来的是小数，如0.15）
    if (updateData.commissionRate !== undefined) dbUpdateData.commission_rate = updateData.commissionRate;
    // 图片字段：主图 + 画廊全部同步
    if (updateData.images?.length) {
      dbUpdateData.main_image = updateData.images[0];
      dbUpdateData.image_gallery = JSON.stringify(updateData.images);
    }
    
    await apiClient.put(`/products/${id}`, dbUpdateData);
    
    // 获取更新后的商品
    return dbProductApi.getProduct(id);
  },

  // 删除商品
  deleteProduct: async (id: string): Promise<void> => {
    console.log('DB API: 删除商品', id);
    await apiClient.delete(`/products/${id}`);
  },

  // 批量更新商品状态
  batchUpdateStatus: async (ids: string[], status: string): Promise<void> => {
    console.log('DB API: 批量更新状态', { ids, status });
    // 逐个更新
    for (const id of ids) {
      await apiClient.put(`/products/${id}`, { status: status === 'active' ? 1 : 0 });
    }
  },

  // 获取商品分类
  getCategories: async (): Promise<ProductCategory[]> => {
    console.log('DB API: 获取分类列表');
    const response = await apiClient.get('/products/categories');
    
    // apiClient拦截器已解包
    return response.map((cat: any) => ({
      id: String(cat.id),
      name: cat.category_name,
      description: '',
      parentId: cat.parent_id ? String(cat.parent_id) : undefined,
      level: cat.parent_id ? 2 : 1,
      sortOrder: cat.sort_order,
      productCount: 0
    }));
  },

  // 创建分类
  createCategory: async (data: Omit<ProductCategory, 'id' | 'productCount'>): Promise<ProductCategory> => {
    console.log('DB API: 创建分类', data);
    // 暂时返回模拟数据，数据库需要扩展分类API
    return {
      id: `cat_${Date.now()}`,
      ...data,
      productCount: 0
    };
  },

  // 更新分类
  updateCategory: async (data: ProductCategory): Promise<ProductCategory> => {
    console.log('DB API: 更新分类', data);
    return data;
  },

  // 删除分类
  deleteCategory: async (id: string): Promise<void> => {
    console.log('DB API: 删除分类', id);
  },

  // 获取商品销售统计
  getSalesStats: async (productId?: string): Promise<ProductSalesStats[]> => {
    console.log('DB API: 获取销售统计', productId);
    // 返回模拟数据
    return [];
  },

  // 获取库存预警列表
  getInventoryAlerts: async (): Promise<InventoryAlert[]> => {
    console.log('DB API: 获取库存预警');
    return [];
  },

  // 标记预警为已解决
  resolveAlert: async (alertId: string): Promise<void> => {
    console.log('DB API: 解决预警', alertId);
  },

  // 获取热门标签
  getPopularTags: async (): Promise<string[]> => {
    console.log('DB API: 获取热门标签');
    return ['热销', '推荐', '新品', '限时特惠'];
  },

  // 获取商品统计
  getProductStats: async (): Promise<{ total: number; active: number; lowStock: number; totalSales: number }> => {
    console.log('DB API: 获取商品统计');
    const response = await apiClient.get('/products/stats');
    // apiClient拦截器已解包
    return response;
  },

  // ==================== 商品图片库 ====================
  
  // 上传单张商品图片
  uploadProductImage: async (file: File): Promise<{ url: string; filename: string; size: number; format: string }> => {
    console.log('DB API: 上传商品图片');
    const formData = new FormData();
    formData.append('image', file);
    
    const response = await apiClient.post('/products/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000,
    });
    return response;
  },

  // 批量上传多张商品图片
  uploadProductImages: async (files: File[]): Promise<{ images: Array<{ url: string; filename: string; size: number }> }> => {
    console.log(`DB API: 批量上传${files.length}张图片`);
    const formData = new FormData();
    files.forEach(file => formData.append('images', file));
    
    return apiClient.post('/products/upload-images', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    });
  },

  // 删除已上传的物理图片
  deleteProductImage: async (imageUrl: string): Promise<void> => {
    console.log('DB API: 删除图片', imageUrl);
    await apiClient.delete('/products/delete-image', { data: { imageUrl } });
  },

  // 获取商品图片库（浏览所有已上传的图片）
  getProductImages: async (params?: { page?: number; pageSize?: number }): Promise<{ list: any[]; total: number; page: number; pageSize: number }> => {
    console.log('DB API: 获取图片库列表');
    return apiClient.get('/products/product-images', { params });
  }
};

export default dbProductApi;
