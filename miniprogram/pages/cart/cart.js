const store = require('../../utils/store');
const util = require('../../utils/util');

Page({
  data: {
    cart: [],
    allSelected: false,
    editing: false,
    totalPrice: '0.00',
    selectedCount: 0,
    priceLabel: '零售价',
    // 收货地址
    address: null
  },

  onShow() {
    this.refreshCart();
    this.updateCartBadge();
    this.loadAddress();
  },

  updateCartBadge() {
    const count = store.getCartCount();
    if (count > 0) {
      wx.setTabBarBadge({ index: 1, text: count > 99 ? '99+' : String(count) });
    } else {
      wx.removeTabBarBadge({ index: 1 });
    }
  },

  refreshCart() {
    const cart = store.getCart();
    const userInfo = store.getUserInfo();
    var level = userInfo ? (userInfo.agent_level || userInfo.agentLevel) : 1;
    const priceLabel = util.getPriceLabel(level);

    // 更新价格
    cart.forEach(item => {
      item.price = util.getPriceByLevel(item, level) || item.price;
    });
    store.setCart(cart);

    this.calcTotal(cart);
    this.setData({ cart, priceLabel });
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
          this.setData({ cart });
          this.updateCartBadge();
        }
      }
    });
  },

  // 清空购物车
  clearCart() {
    if (this.data.cart.length === 0) return;
    wx.showModal({
      title: '提示',
      content: '确定清空购物车吗？',
      success: (res) => {
        if (res.confirm) {
          store.clearCart();
          this.refreshCart();
          this.updateCartBadge();
          wx.showToast({ title: '已清空', icon: 'success' });
        }
      }
    });
  },

  toggleEdit() {
    this.setData({ editing: !this.data.editing });
  },

  // 加载已保存的收货地址
  loadAddress() {
    const saved = wx.getStorageSync('defaultAddress');
    if (saved) {
      this.setData({ address: saved });
    }
  },

  // 选择/添加收货地址 → 跳转到地址管理页
  chooseAddress() {
    wx.navigateTo({
      url: '/pages/address/address?mode=select'
    });
  },

  goCheckout() {
    if (this.data.selectedCount === 0) {
      wx.showToast({ title: '请选择商品', icon: 'none' });
      return;
    }
    if (!util.checkLogin()) { wx.showToast({ title: '请先登录', icon: 'none' }); return; }
    // 将购物车选中的地址传递到订单确认页（confirm页也会读取storage作为兜底）
    if (this.data.address) {
      wx.setStorageSync('checkoutAddress', this.data.address);
    }
    wx.navigateTo({ url: '/pages/order/confirm' });
  },

  goDetail(e) {
    wx.navigateTo({ url: '/pages/product/detail?id=' + e.currentTarget.dataset.id });
  },

  goShopping() {
    wx.switchTab({ url: '/pages/goods/index' });
  }
});
