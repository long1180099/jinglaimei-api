const api = require('../../utils/api');
const store = require('../../utils/store');
const util = require('../../utils/util');

Page({
  data: {
    selectedItems: [],
    address: null,
    hasAddress: false,
    remark: '',
    goodsTotal: '0.00',
    goodsTotalNum: 0,
    shippingFeeNum: 0,
    shippingFee: '0.00',
    totalAmount: '0.00',
    priceLabel: '零售价',
    submitting: false,
    // 配送方式: express=快递, pickup=自提
    deliveryType: 'express',
    // 支付方式
    paymentMethod: 'balance',
    // 用户余额
    userBalance: '0.00',
    userBalanceNum: 0,
    // 余额是否不足
    insufficientBalance: false
  },

  onLoad() {
    this.loadUserInfo();
    this.loadCartItems();
    this.loadDefaultAddress();
  },

  onShow() {
    // 每次显示时重新加载地址（从地址管理页选择后返回会触发）
    if (this.data.deliveryType === 'express') {
      this.loadDefaultAddress();
    }
  },

  // 加载用户余额
  loadUserInfo() {
    const userInfo = store.getUserInfo();
    if (userInfo && userInfo.balance !== undefined) {
      const balance = parseFloat(userInfo.balance) || 0;
      this.setData({
        userBalance: balance.toFixed(2),
        userBalanceNum: balance
      });
    }
  },

  loadCartItems() {
    var cart = store.getCart().filter(item => item.selected);
    if (cart.length === 0) {
      wx.showToast({ title: '没有选中商品', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }

    // 确保每个商品图片是完整的HTTPS URL（修复购物车中可能存在的旧格式）
    const API_BASE = 'https://api.jinglaimei.com';
    cart.forEach(function(item) {
      if (!item.main_image) { return; }
      var img = String(item.main_image).trim();
      // 如果不是以http开头，补全为完整URL
      if (img.indexOf('http') !== 0 && img.indexOf('https') !== 0 && img.length > 0) {
        if (img.charAt(0) === '/') {
          item.main_image = API_BASE + img;
        } else {
          item.main_image = API_BASE + '/' + img;
        }
      }
      // http转https
      if (img.indexOf('http://') === 0) {
        item.main_image = img.replace('http://', 'https://');
      }
    });

    const userInfo = store.getUserInfo();
    var level = userInfo ? (userInfo.agent_level || userInfo.agentLevel) : 1;
    // 重新根据当前等级计算价格（防止购物车中缓存了旧价格）
    cart.forEach(function(item) {
      var newPrice = util.getPriceByLevel(item, level);
      if (newPrice) {
        item.price = newPrice;
      }
    });
    store.setCart(cart);
    const goodsTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shippingFee = goodsTotal >= 99 ? 0 : 10; // 满99免运费
    const totalAmount = goodsTotal + shippingFee;

    this.setData({
      selectedItems: cart,
      goodsTotalNum: goodsTotal,
      goodsTotal: util.formatMoney(goodsTotal),
      shippingFeeNum: shippingFee,
      shippingFee: util.formatMoney(shippingFee),
      totalAmount: util.formatMoney(totalAmount),
      priceLabel: util.getPriceLabel(level)
    });

    this.checkBalance(totalAmount);
  },

  // 检查余额是否充足
  checkBalance(amount) {
    const insufficient = this.data.userBalanceNum < amount;
    this.setData({ insufficientBalance: insufficient });
  },

  // 切换配送方式
  switchDelivery(e) {
    const type = e.currentTarget.dataset.type;
    if (type === this.data.deliveryType) return;

    this.setData({ deliveryType: type });

    // 重新计算金额（自提免运费）
    const goodsTotal = this.data.goodsTotalNum;
    const shippingFee = type === 'pickup' ? 0 : (goodsTotal >= 99 ? 0 : 10);
    const totalAmount = goodsTotal + shippingFee;

    this.setData({
      shippingFeeNum: shippingFee,
      shippingFee: util.formatMoney(shippingFee),
      totalAmount: util.formatMoney(totalAmount)
    });

    this.checkBalance(totalAmount);
  },

  loadDefaultAddress() {
    // 优先读取购物车传递过来的地址，再读默认地址
    const checkoutAddr = wx.getStorageSync('checkoutAddress');
    const saved = wx.getStorageSync('defaultAddress');
    const addr = checkoutAddr || saved;
    if (addr) {
      this.setData({ address: addr, hasAddress: true });
    }
    // 清理临时存储
    wx.removeStorageSync('checkoutAddress');
  },

  // 选择/添加收货地址 → 跳转到地址管理页
  chooseAddress() {
    if (this.data.deliveryType === 'pickup') return;
    wx.navigateTo({
      url: '/pages/address/address?mode=select'
    });
  },

  onRemarkInput(e) { this.setData({ remark: e.detail.value }); },

  async submitOrder() {
    if (this.data.submitting) return;
    if (this.data.insufficientBalance) {
      wx.showToast({ title: '余额不足，请联系客服充值', icon: 'none' });
      return;
    }
    if (this.data.selectedItems.length === 0) {
      wx.showToast({ title: '没有选中商品', icon: 'none' });
      return;
    }

    // 快递配送时校验地址
    if (this.data.deliveryType === 'express' && !this.data.hasAddress) {
      wx.showToast({ title: '请填写收货地址', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    wx.showLoading({ title: '提交中...', mask: true });
    
    try {
      const orderItems = this.data.selectedItems.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price
      }));

      const addr = this.data.address || {};
      const isPickup = this.data.deliveryType === 'pickup';

      const res = await api.order.create({
        items: orderItems,
        // 修复：字段名与后端一致 (receiver_name/receiver_phone/receiver_address)
        receiver_name: isPickup ? (addr.name || '') : addr.name,
        receiver_phone: isPickup ? (addr.phone || '') : addr.phone,
        receiver_address: isPickup ? '到店自提' : ((addr.province || '') + (addr.city || '') + (addr.district || '') + (addr.detail || '')),
        delivery_type: this.data.deliveryType,
        payment_method: 'balance',
        shipping_fee: this.data.shippingFeeNum,
        remark: this.data.remark
      });

      // 清除已选购物车商品
      const cart = store.getCart();
      const selectedIds = this.data.selectedItems.map(i => i.product_id);
      const remainCart = cart.filter(item => !selectedIds.includes(item.product_id));
      store.setCart(remainCart);

      // 更新购物车badge
      const count = store.getCartCount();
      if (count > 0) {
        wx.setTabBarBadge({ index: 1, text: count > 99 ? '99+' : String(count) });
      } else {
        wx.removeTabBarBadge({ index: 1 });
      }

      wx.hideLoading();
      // 后端返回 { data: { orderId, orderNo, actualAmount, paid } }
      const orderData = res.data || res;
      const orderId = orderData.orderId || orderData.id || orderData.order_id;
      wx.showToast({ title: '下单成功', icon: 'success' });
      setTimeout(() => {
        if (orderId) {
          wx.redirectTo({ url: '/pages/order/detail?id=' + orderId });
        } else {
          wx.redirectTo({ url: '/pages/order/list' });
        }
      }, 1000);
    } catch (e) {
      wx.hideLoading();
      console.error('创建订单失败:', e);
      this.setData({ submitting: false });
    }
  }
});
