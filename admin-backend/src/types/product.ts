// 商品相关类型定义

export interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  retailPrice: number; // 零售价
  vipPrice: number; // 代言人价
  agentPrice: number; // 代理商价
  partnerPrice: number; // 批发价
  wholesalePrice?: number; // 批发商价
  chiefPrice?: number; // 首席分公司价
  divisionPrice?: number; // 集团事业部价
  costPrice: number; // 成本价
  stock: number; // 库存
  soldCount: number; // 已售数量
  unit: string; // 单位
  sku?: string; // 商品编码（可选）
  discountPrice?: number; // 折扣价（可选）
  specifications: string[]; // 规格列表
  images: string[]; // 图片URL列表
  tags: string[]; // 标签
  status: 'active' | 'inactive' | 'out_of_stock' | 'pre_sale'; // 状态
  commissionRate: number; // 佣金比例
  weight: number; // 重量（kg）
  dimensions: { // 尺寸
    length: number;
    width: number;
    height: number;
  };
  shippingType: 'free' | 'flat_rate' | 'calculated'; // 配送方式
  shippingFee: number; // 运费
  minOrderQuantity: number; // 最小起订量
  maxOrderQuantity: number; // 最大可订量
  isFeatured: boolean; // 是否推荐
  isHot: boolean; // 是否热销
  salesTarget: number; // 销售目标
  createdAt: string;
  updatedAt: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  description: string;
  parentId?: string;
  level: number;
  icon?: string;
  sortOrder: number;
  productCount: number;
}

export interface ProductSpecification {
  id: string;
  productId: string;
  name: string;
  values: string[];
  required: boolean;
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  name: string;
  specificationValues: Record<string, string>;
  priceAdjustment: number; // 价格调整（相对于基准价）
  stock: number;
  images: string[];
  barcode?: string;
}

export interface ProductReview {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number; // 1-5星
  title: string;
  content: string;
  images?: string[];
  verifiedPurchase: boolean; // 是否已购买验证
  helpfulCount: number;
  createdAt: string;
}

export interface InventoryLog {
  id: string;
  productId: string;
  variantId?: string;
  type: 'in' | 'out' | 'adjust' | 'transfer'; // 入库/出库/调整/调拨
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  referenceNo?: string; // 关联单据号
  operatorId: string;
  operatorName: string;
  createdAt: string;
}

export interface ProductSalesStats {
  productId: string;
  productName: string;
  dateRange: string;
  totalSales: number;
  totalRevenue: number;
  totalOrders: number;
  avgDailySales: number;
  salesTrend: 'up' | 'down' | 'stable';
  trendPercentage: number;
}

export interface ProductFilterParams {
  category?: string;
  status?: string;
  minPrice?: number;
  maxPrice?: number;
  keyword?: string;
  tags?: string[];
  isFeatured?: boolean;
  isHot?: boolean;
  page: number;
  pageSize: number;
}

export interface ProductCreateRequest {
  name: string;
  category: string;
  description: string;
  retailPrice: number;
  vipPrice: number;
  agentPrice: number;
  partnerPrice: number;
  chiefPrice?: number;
  divisionPrice?: number;
  costPrice: number;
  stock: number;
  unit: string;
  sku?: string;
  specifications: string[];
  images: string[];
  tags: string[];
  status: string;
  commissionRate: number;
  weight: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  shippingType: string;
  shippingFee: number;
  minOrderQuantity: number;
  maxOrderQuantity: number;
}

export interface ProductUpdateRequest extends Partial<ProductCreateRequest> {
  id: string;
}

export interface InventoryAlert {
  id: string;
  productId: string;
  productName: string;
  currentStock: number;
  threshold: number;
  alertType: 'low_stock' | 'out_of_stock' | 'over_stock';
  status: 'active' | 'resolved';
  createdAt: string;
  resolvedAt?: string;
}