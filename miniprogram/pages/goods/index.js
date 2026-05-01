const api = require('../../utils/api');
const store = require('../../utils/store');
const util = require('../../utils/util');

Page({
  data: {
    // Tab切换
    activeTab: 'products', // products | cart
    cartCount: 0,

    // === 商品列表 ===
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
    viewMode: 'grid',

    // === 购物车 ===
    cart: [],
    allSelected: false,
    editing: false,
    totalPrice: '0.00',
    selectedCount: 0,
    priceLabel: '零售价'
  },

  onLoad() {
    this.loadCategories();
    this.loadProducts();
    this.refreshCart();
  },

  onShow() {
    if (this.data.activeTab === 'cart') {
      this.refreshCart();
    }
  },

  onReachBottom() {
    if (this.data.activeTab === 'products' && this.data.hasMore && !this.data.loading) {
      this.loadProducts(false);
    }
  },

  onPullDownRefresh() {
    if (this.data.activeTab === 'products') {
      this.setData({ refreshing: true });
      this.loadProducts();
    }
    wx.stopPullDownRefresh();
  },

  // scroll-view 自定义下拉刷新
  onRefresh() {
    if (this.data.activeTab === 'products') {
      this.setData({ refreshing: true });
      this.loadProducts();
    }
  },

  // ==================== Tab切换 ====================
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
    if (tab === 'cart') {
      this.refreshCart();
    }
  },

  // ==================== 商品列表 ====================
  async loadCategories() {
    try {
      const res = await api.product.getCategories();
      const list = res.data || [];
      const categories = list.map(c => ({
        ...c,
        name: c.category_name || c.name || '',
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
      const list = raw?.list || (Array.isArray(raw) ? raw : []);

      // 修复图片URL：localhost → 局域网IP
      for (var i = 0; i < list.length; i++) {
        if (list[i].main_image) list[i].main_image = api.fixImageUrl(list[i].main_image);
        if (list[i].image) list[i].image = api.fixImageUrl(list[i].image);
        if (list[i].images) list[i].images = api.fixImageUrl(list[i].images);
      }

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

  onSearchInput(e) { this.setData({ keyword: e.detail.value }); },
  doSearch() { this.setData({ page: 1 }); this.loadProducts(); },
  clearSearch() { this.setData({ keyword: '', page: 1 }); this.loadProducts(); },

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
    this.setData({ viewMode: this.data.viewMode === 'grid' ? 'list' : 'grid' });
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
    this.setData({ cartCount: store.getCartCount() });
  },

  // ==================== 购物车 ====================
  refreshCart() {
    const cart = store.getCart();
    const userInfo = store.getUserInfo();
    var level = userInfo ? (userInfo.agent_level || userInfo.agentLevel) : 1;
    const priceLabel = util.getPriceLabel(level);

    cart.forEach(item => {
      item.price = util.getPriceByLevel(item, level) || item.price;
    });
    store.setCart(cart);

    this.calcTotal(cart);
    this.setData({ cart, priceLabel, cartCount: store.getCartCount() });
  },

  calcTotal(cart) {
    const selected = cart.filter(item => item.selected);
    const totalPrice = selected.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const allSelected = cart.length > 0 && selected.length === cart.length;
    this.setData({
      totalPrice: util.formatMoney(totalPrice),
      selectedCount: selected.reduce((sum, item) => sum + item.quantity, 0),
      allSelected
    });
  },

  toggleSelectAll() {
    const cart = this.data.cart;
    const allSelected = !this.data.allSelected;
    cart.forEach(item => { item.selected = allSelected; });
    store.setCart(cart);
    this.calcTotal(cart);
    this.setData({ cart });
  },

  toggleItem(e) {
    const index = e.currentTarget.dataset.index;
    const cart = this.data.cart;
    cart[index].selected = !cart[index].selected;
    store.setCart(cart);
    this.calcTotal(cart);
    this.setData({ cart });
  },

  changeQty(e) {
    const { index, delta } = e.currentTarget.dataset;
    const cart = this.data.cart;
    const newQty = Math.max(1, cart[index].quantity + delta);
    cart[index].quantity = newQty;
    store.setCart(cart);
    this.calcTotal(cart);
    this.setData({ cart });
  },

  removeItem(e) {
    const index = e.currentTarget.dataset.index;
    const cart = this.data.cart;
    const item = cart[index];
    wx.showModal({
      title: '提示',
      content: '确定删除 ' + (item.product_name || '该商品') + ' 吗？',
      success: (res) => {
        if (res.confirm) {
          cart.splice(index, 1);
          store.setCart(cart);
          this.calcTotal(cart);
          this.setData({ cart, cartCount: store.getCartCount() });
        }
      }
    });
  },

  clearCart() {
    if (this.data.cart.length === 0) return;
    wx.showModal({
      title: '提示',
      content: '确定清空购物车吗？',
      success: (res) => {
        if (res.confirm) {
          store.clearCart();
          this.refreshCart();
          wx.showToast({ title: '已清空', icon: 'success' });
        }
      }
    });
  },

  toggleEdit() {
    this.setData({ editing: !this.data.editing });
  },

  goCheckout() {
    if (this.data.selectedCount === 0) {
      wx.showToast({ title: '请选择商品', icon: 'none' });
      return;
    }
    if (!util.checkLogin()) { wx.showToast({ title: '请先登录', icon: 'none' }); return; }
    wx.navigateTo({ url: '/pages/order/confirm' });
  }
});
