const api = require('../../utils/api');
const store = require('../../utils/store');
const util = require('../../utils/util');

Page({
  data: {
    categories: [],
    activeCategory: -1,
    keyword: '',
    sort: 'default',
    products: [],
    page: 1,
    pageSize: 10,
    hasMore: true,
    loading: false,
    refreshing: false,
    viewMode: 'grid'
  },

  onLoad(options) {
    // 支持从首页跳转带categoryId
    if (options && options.categoryId) {
      this.setData({ activeCategory: parseInt(options.categoryId) });
    }
    // 支持搜索模式
    if (options && options.search === '1') {
      this.setData({ isSearchMode: true });
    }
    this.loadCategories();
    this.loadProducts();
  },

  onShow() {
    this.updateCartBadge();
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMore();
    }
  },

  updateCartBadge() {
    const count = store.getCartCount();
    if (count > 0) {
      wx.setTabBarBadge({ index: 1, text: count > 99 ? '99+' : String(count) });
    } else {
      wx.removeTabBarBadge({ index: 1 });
    }
  },

  async loadCategories() {
    try {
      const res = await api.product.getCategories();
      const list = res.data || [];
      // 标准化分类名: 后端返回 category_name，统一映射为 name
      const categories = list.map(c => ({
        ...c,
        name: c.category_name || c.name || '',
        // 只显示一级分类
        isTopLevel: c.parent_id === 0 || !c.parent_id
      }));
      this.setData({ categories: categories.filter(c => c.isTopLevel) });
    } catch (e) {
      console.error('加载分类失败:', e);
    }
  },

  async loadProducts(reset = true) {
    if (this.data.loading) return;
    const page = reset ? 1 : this.data.page;
    this.setData({ loading: true });

    try {
      const params = { page, pageSize: this.data.pageSize };
      if (this.data.activeCategory > 0) params.category_id = this.data.activeCategory;
      if (this.data.keyword) params.keyword = this.data.keyword;
      if (this.data.sort !== 'default') params.sort = this.data.sort;

      const res = await api.product.getList(params);
      const raw = res.data;
      // 兼容 { list: [...] } 和 [...] 两种格式
      const list = raw?.list || (Array.isArray(raw) ? raw : []);
      const products = reset ? list : [...this.data.products, ...list];

      this.setData({
        products,
        page: page + 1,
        hasMore: list.length >= this.data.pageSize,
        loading: false,
        refreshing: false
      });
    } catch (e) {
      console.error('加载商品失败:', e);
      this.setData({ loading: false, refreshing: false });
    }
  },

  switchCategory(e) {
    const id = parseInt(e.currentTarget.dataset.id);
    this.setData({ activeCategory: id, page: 1 });
    this.loadProducts();
  },

  onSearchInput(e) {
    this.setData({ keyword: e.detail.value });
  },

  doSearch() {
    this.setData({ page: 1 });
    this.loadProducts();
  },

  setSort(e) {
    const sort = e.currentTarget.dataset.sort;
    this.setData({ sort, page: 1 });
    this.loadProducts();
  },

  togglePriceSort() {
    const current = this.data.sort;
    const next = current === 'price_asc' ? 'price_desc' : 'price_asc';
    this.setData({ sort: next, page: 1 });
    this.loadProducts();
  },

  toggleView() {
    this.setData({
      viewMode: this.data.viewMode === 'grid' ? 'list' : 'grid'
    });
  },

  clearSearch() {
    this.setData({ keyword: '', page: 1 });
    this.loadProducts();
  },

  loadMore() {
    this.loadProducts(false);
  },

  onRefresh() {
    this.setData({ refreshing: true });
    this.loadProducts();
  },

  goDetail(e) {
    wx.navigateTo({ url: '/pages/product/detail?id=' + e.currentTarget.dataset.id });
  },

  addToCart(e) {
    if (!util.checkLogin()) { wx.showToast({ title: '请先登录', icon: 'none' }); return; }
    const item = e.currentTarget.dataset.item;
    const userInfo = store.getUserInfo();
    var level = userInfo ? (userInfo.agent_level || userInfo.agentLevel) : 1;
    const price = util.getPriceByLevel(item, level);
    store.addToCart({ ...item, price });
    wx.showToast({ title: '已加入购物车', icon: 'success' });
    this.updateCartBadge();
  }
});
