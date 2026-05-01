const api = require('../../utils/api');
const store = require('../../utils/store');
const util = require('../../utils/util');

Page({
  data: {
    product: null,
    images: [],
    currentPrice: '0.00',
    priceLabel: '零售价',
    userLevel: 1,
    cartCount: 0,
    quantity: 1,
    isFav: false,
    showActionSheet: false,
    imageIndex: 0,
    myPriceInfo: null,
    myPrice: 0,
    mySaveAmount: 0
  },

  onLoad(options) {
    if (options && options.id) {
      this.productId = options.id;
      this.loadDetail();
    }
    // 检查是否已收藏
    const favs = wx.getStorageSync('favorites') || [];
    this.setData({ isFav: favs.includes(Number(this.productId)) });
  },

  onShow() {
    this.setData({ cartCount: store.getCartCount() });
    this.updateCartBadge();
  },

  onShareAppMessage() {
    const p = this.data.product || {};
    return {
      title: p.product_name || '静莱美好物推荐',
      path: '/pages/product/detail?id=' + this.productId,
      imageUrl: p.main_image || ''
    };
  },

  updateCartBadge() {
    const count = store.getCartCount();
    if (count > 0) {
      wx.setTabBarBadge({ index: 1, text: count > 99 ? '99+' : String(count) });
    } else {
      wx.removeTabBarBadge({ index: 1 });
    }
  },

  async loadDetail() {
    try {
      util.showLoading('加载中...');
      const res = await api.product.getDetail(this.productId);
      const product = res.data || {};

      // 修复图片URL：localhost → 局域网IP
      if (product.main_image) product.main_image = api.fixImageUrl(product.main_image);
      
      const userInfo = store.getUserInfo();
      var level = userInfo ? (userInfo.agent_level || userInfo.agentLevel) : 1;
      const currentPrice = util.getPriceByLevel(product, level);
      const priceLabel = util.getPriceLabel(level);
      
      // 处理图片列表
      let images = [];
      if (product.images) {
        images = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
      } 
      // 修复图片列表中的localhost地址
      for (var idx = 0; idx < images.length; idx++) {
        if (typeof images[idx] === 'string') images[idx] = api.fixImageUrl(images[idx]);
      }
      if (images.length === 0 && product.main_image) {
        images = [product.main_image];
      }
      if (images.length === 0) {
        images = ['/images/default-product.png'];
      }

      // 构建专属价格卡片信息
      var myPriceInfo = this.buildMyPriceInfo(level, product);
      var myPrice = typeof currentPrice === 'number' ? currentPrice : parseFloat(currentPrice);
      var saveAmount = 0;
      if (product.retail_price && product.retail_price > myPrice) {
        saveAmount = parseFloat((product.retail_price - myPrice).toFixed(2));
      }

      this.setData({
        product,
        images,
        currentPrice: myPrice.toFixed(2),
        priceLabel,
        userLevel: level,
        myPriceInfo,
        myPrice: myPrice,
        mySaveAmount: saveAmount
      });
      util.hideLoading();
    } catch (e) {
      util.hideLoading();
      console.error('加载商品详情失败:', e);
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  // 构建用户专属价格信息
  buildMyPriceInfo(level, product) {
    var levelConfig = {
      1: { name: '会员', color: '#8c8c8c' },
      2: { name: '代言人', color: '#52c41a' },
      3: { name: '代理商', color: '#1890ff' },
      4: { name: '批发商', color: '#fa8c16' },
      5: { name: '分公司', color: '#f5222d' },
      6: { name: '事业部', color: '#722ed1' }
    };
    return levelConfig[level] || levelConfig[1];
  },

  // 轮播图切换
  onSwiperChange(e) {
    this.setData({ imageIndex: e.detail.current });
  },

  // 预览大图
  previewImage(e) {
    const url = e.currentTarget.dataset.url || (this.data.images[0]);
    wx.previewImage({ current: url, urls: this.data.images });
  },

  // 数量变更
  minusQty() {
    if (this.data.quantity > 1) {
      this.setData({ quantity: this.data.quantity - 1 });
    }
  },

  plusQty() {
    const max = this.data.product?.available_stock || 999;
    if (this.data.quantity < max) {
      this.setData({ quantity: this.data.quantity + 1 });
    } else {
      wx.showToast({ title: '已达库存上限', icon: 'none' });
    }
  },

  // 收藏/取消收藏
  toggleFav() {
    let favs = wx.getStorageSync('favorites') || [];
    const pid = Number(this.productId);
    if (this.data.isFav) {
      favs = favs.filter(id => id !== pid);
      wx.showToast({ title: '已取消收藏', icon: 'none' });
    } else {
      favs.push(pid);
      wx.showToast({ title: '已收藏', icon: 'success' });
    }
    wx.setStorageSync('favorites', favs);
    this.setData({ isFav: !this.data.isFav });
  },

  // 加入购物车
  addToCart() {
    if (!util.checkLogin()) { wx.showToast({ title: '请先登录', icon: 'none' }); return; }
    const { product, currentPrice, quantity } = this.data;
    store.addToCart({ ...product, price: parseFloat(currentPrice) }, quantity);
    wx.showToast({ title: '已加入购物车', icon: 'success' });
    this.setData({ cartCount: store.getCartCount() });
    this.updateCartBadge();
  },

  // 立即购买
  buyNow() {
    if (!util.checkLogin()) { wx.showToast({ title: '请先登录', icon: 'none' }); return; }
    const { product, currentPrice, quantity } = this.data;
    // 先确保购物车中有且仅选中这个商品
    const cart = store.getCart();
    // 清除之前选中状态
    cart.forEach(item => { item.selected = false; });
    // 添加新商品
    cart.push({
      product_id: product.id,
      product_name: product.product_name,
      main_image: product.main_image,
      price: parseFloat(currentPrice),
      quantity: quantity,
      selected: true
    });
    store.setCart(cart);
    wx.navigateTo({ url: '/pages/order/confirm' });
  },

  // 联系客服
  contactService() {
    wx.showModal({
      title: '联系客服',
      content: '客服工作时间：周一至周五 9:00-18:00\n\n如有问题请通过小程序内反馈功能联系我们',
      showCancel: false,
      confirmText: '知道了'
    });
  },

  goHome() { wx.switchTab({ url: '/pages/index/index' }); },
  goCart() { wx.switchTab({ url: '/pages/goods/index' }); }
});
