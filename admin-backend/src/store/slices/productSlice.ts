// 商品管理 Redux Slice
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { 
  Product, 
  ProductCategory, 
  ProductFilterParams, 
  ProductCreateRequest, 
  ProductUpdateRequest,
  ProductSalesStats,
  InventoryAlert
} from '../../types/product';
import { dbProductApi } from '../../services/dbProductApi';

interface ProductState {
  products: Product[];
  categories: ProductCategory[];
  selectedProduct: Product | null;
  loading: boolean;
  error: string | null;
  pagination: {
    total: number;
    page: number;
    pageSize: number;
  };
  filters: ProductFilterParams;
  salesStats: ProductSalesStats[];
  inventoryAlerts: InventoryAlert[];
  popularTags: string[];
}

const initialState: ProductState = {
  products: [],
  categories: [],
  selectedProduct: null,
  loading: false,
  error: null,
  pagination: {
    total: 0,
    page: 1,
    pageSize: 10
  },
  filters: {
    page: 1,
    pageSize: 10
  },
  salesStats: [],
  inventoryAlerts: [],
  popularTags: []
};

// 异步Thunks
export const fetchProducts = createAsyncThunk(
  'products/fetchProducts',
  async (params: ProductFilterParams, { rejectWithValue }) => {
    try {
      const response = await dbProductApi.getProducts(params);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || '获取商品列表失败');
    }
  }
);

export const fetchProduct = createAsyncThunk(
  'products/fetchProduct',
  async (id: string, { rejectWithValue }) => {
    try {
      const product = await dbProductApi.getProduct(id);
      return product;
    } catch (error: any) {
      return rejectWithValue(error.message || '获取商品详情失败');
    }
  }
);

export const createProduct = createAsyncThunk(
  'products/createProduct',
  async (data: ProductCreateRequest, { rejectWithValue }) => {
    try {
      const product = await dbProductApi.createProduct(data);
      return product;
    } catch (error: any) {
      return rejectWithValue(error.message || '创建商品失败');
    }
  }
);

export const updateProduct = createAsyncThunk(
  'products/updateProduct',
  async (data: ProductUpdateRequest, { rejectWithValue }) => {
    try {
      const product = await dbProductApi.updateProduct(data);
      return product;
    } catch (error: any) {
      return rejectWithValue(error.message || '更新商品失败');
    }
  }
);

export const deleteProduct = createAsyncThunk(
  'products/deleteProduct',
  async (id: string, { rejectWithValue }) => {
    try {
      await dbProductApi.deleteProduct(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message || '删除商品失败');
    }
  }
);

export const batchUpdateStatus = createAsyncThunk(
  'products/batchUpdateStatus',
  async ({ ids, status }: { ids: string[]; status: string }, { rejectWithValue }) => {
    try {
      await dbProductApi.batchUpdateStatus(ids, status);
      return { ids, status };
    } catch (error: any) {
      return rejectWithValue(error.message || '批量更新状态失败');
    }
  }
);

export const fetchCategories = createAsyncThunk(
  'products/fetchCategories',
  async (_, { rejectWithValue }) => {
    try {
      const categories = await dbProductApi.getCategories();
      return categories;
    } catch (error: any) {
      return rejectWithValue(error.message || '获取分类列表失败');
    }
  }
);

export const createCategory = createAsyncThunk(
  'products/createCategory',
  async (data: Omit<ProductCategory, 'id' | 'productCount'>, { rejectWithValue }) => {
    try {
      const category = await dbProductApi.createCategory(data);
      return category;
    } catch (error: any) {
      return rejectWithValue(error.message || '创建分类失败');
    }
  }
);

export const updateCategory = createAsyncThunk(
  'products/updateCategory',
  async (data: ProductCategory, { rejectWithValue }) => {
    try {
      const category = await dbProductApi.updateCategory(data);
      return category;
    } catch (error: any) {
      return rejectWithValue(error.message || '更新分类失败');
    }
  }
);

export const deleteCategory = createAsyncThunk(
  'products/deleteCategory',
  async (id: string, { rejectWithValue }) => {
    try {
      await dbProductApi.deleteCategory(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message || '删除分类失败');
    }
  }
);

export const fetchSalesStats = createAsyncThunk(
  'products/fetchSalesStats',
  async (productId: string = '', { rejectWithValue }) => {
    try {
      const stats = await dbProductApi.getSalesStats(productId);
      return stats;
    } catch (error: any) {
      return rejectWithValue(error.message || '获取销售统计失败');
    }
  }
);

export const fetchInventoryAlerts = createAsyncThunk(
  'products/fetchInventoryAlerts',
  async (_, { rejectWithValue }) => {
    try {
      const alerts = await dbProductApi.getInventoryAlerts();
      return alerts;
    } catch (error: any) {
      return rejectWithValue(error.message || '获取库存预警失败');
    }
  }
);

export const resolveAlert = createAsyncThunk(
  'products/resolveAlert',
  async (alertId: string, { rejectWithValue }) => {
    try {
      await dbProductApi.resolveAlert(alertId);
      return alertId;
    } catch (error: any) {
      return rejectWithValue(error.message || '解决预警失败');
    }
  }
);

export const fetchPopularTags = createAsyncThunk(
  'products/fetchPopularTags',
  async (_, { rejectWithValue }) => {
    try {
      const tags = await dbProductApi.getPopularTags();
      return tags;
    } catch (error: any) {
      return rejectWithValue(error.message || '获取热门标签失败');
    }
  }
);

const productSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<ProductFilterParams>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearSelectedProduct: (state) => {
      state.selectedProduct = null;
    },
    resetFilters: (state) => {
      state.filters = {
        page: 1,
        pageSize: 10
      };
    }
  },
  extraReducers: (builder) => {
    // 获取商品列表
    builder.addCase(fetchProducts.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchProducts.fulfilled, (state, action) => {
      state.loading = false;
      state.products = action.payload.products;
      state.pagination.total = action.payload.total;
      state.pagination.page = state.filters.page;
      state.pagination.pageSize = state.filters.pageSize;
    });
    builder.addCase(fetchProducts.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // 获取商品详情
    builder.addCase(fetchProduct.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchProduct.fulfilled, (state, action) => {
      state.loading = false;
      state.selectedProduct = action.payload;
    });
    builder.addCase(fetchProduct.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // 创建商品
    builder.addCase(createProduct.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(createProduct.fulfilled, (state, action) => {
      state.loading = false;
      state.products.unshift(action.payload);
      state.pagination.total += 1;
    });
    builder.addCase(createProduct.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // 更新商品
    builder.addCase(updateProduct.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(updateProduct.fulfilled, (state, action) => {
      state.loading = false;
      const index = state.products.findIndex(p => p.id === action.payload.id);
      if (index !== -1) {
        state.products[index] = action.payload;
      }
      if (state.selectedProduct?.id === action.payload.id) {
        state.selectedProduct = action.payload;
      }
    });
    builder.addCase(updateProduct.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // 删除商品
    builder.addCase(deleteProduct.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(deleteProduct.fulfilled, (state, action) => {
      state.loading = false;
      state.products = state.products.filter(p => p.id !== action.payload);
      state.pagination.total -= 1;
    });
    builder.addCase(deleteProduct.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // 批量更新状态
    builder.addCase(batchUpdateStatus.fulfilled, (state, action) => {
      const { ids, status } = action.payload;
      state.products = state.products.map(product => {
        if (ids.includes(product.id)) {
          return { ...product, status: status as any };
        }
        return product;
      });
    });

    // 获取分类列表
    builder.addCase(fetchCategories.fulfilled, (state, action) => {
      state.categories = action.payload;
    });

    // 创建分类
    builder.addCase(createCategory.fulfilled, (state, action) => {
      state.categories.push(action.payload);
    });

    // 更新分类
    builder.addCase(updateCategory.fulfilled, (state, action) => {
      const index = state.categories.findIndex(c => c.id === action.payload.id);
      if (index !== -1) {
        state.categories[index] = action.payload;
      }
    });

    // 删除分类
    builder.addCase(deleteCategory.fulfilled, (state, action) => {
      state.categories = state.categories.filter(c => c.id !== action.payload);
    });

    // 获取销售统计
    builder.addCase(fetchSalesStats.fulfilled, (state, action) => {
      state.salesStats = action.payload;
    });

    // 获取库存预警
    builder.addCase(fetchInventoryAlerts.fulfilled, (state, action) => {
      state.inventoryAlerts = action.payload;
    });

    // 解决预警
    builder.addCase(resolveAlert.fulfilled, (state, action) => {
      const index = state.inventoryAlerts.findIndex(a => a.id === action.payload);
      if (index !== -1) {
        state.inventoryAlerts[index].status = 'resolved';
        state.inventoryAlerts[index].resolvedAt = new Date().toISOString();
      }
    });

    // 获取热门标签
    builder.addCase(fetchPopularTags.fulfilled, (state, action) => {
      state.popularTags = action.payload;
    });
  }
});

export const { setFilters, clearSelectedProduct, resetFilters } = productSlice.actions;
export default productSlice.reducer;