/**
 * 静莱美代理商系统 - 小程序入口
 */

var api = null;
try {
  api = require('./utils/api');
} catch(e) {
  // API模块加载失败时的降级处理
  api = {
    BASE_URL: '',
    request: function() { return Promise.reject(new Error('API模块加载失败')); }
  };
}

var store = null;
try {
  store = require('./utils/store');
} catch(e) {
  console.error('[Store加载失败]', e.message);
}

App({
  globalData: {
    userInfo: null,
    cartCount: 0
  },

  onLaunch() {

    // 清除过期的token，避免后续401跳转
    var token = wx.getStorageSync('token');
    if (token) {
      // 发一个轻量请求验证token是否有效
      wx.request({
        url: api.BASE_URL.replace('/api', '') + '/api/mp/home',
        method: 'GET',
        header: { 'Authorization': 'Bearer ' + token, 'X-Client': 'miniprogram' },
        success: function(res) {
          if (res.statusCode === 401) {
            wx.removeStorageSync('token');
            wx.removeStorageSync('userInfo');
            // token失效，清除登录态
          }
        },
        fail: function() { /* 网络不通时不清除，保留token */ }
      });
    }

    // 检查登录状态
    if (store.isLoggedIn()) {
      this.globalData.userInfo = store.getUserInfo();
      this.updateCartCount();
    }

    // 获取系统信息
    var sysInfo = wx.getSystemInfoSync();
    this.globalData.statusBarHeight = sysInfo.statusBarHeight;
    this.globalData.navBarHeight = sysInfo.statusBarHeight + 44;
    this.globalData.screenWidth = sysInfo.screenWidth;
    this.globalData.screenHeight = sysInfo.screenHeight;
  },

  // 更新购物车角标
  updateCartCount() {
    const cart = store.getCart();
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    this.globalData.cartCount = count;
    if (count > 0) {
      wx.setTabBarBadge({ index: 1, text: count > 99 ? '99+' : String(count) });
    } else {
      wx.removeTabBarBadge({ index: 1 });
    }
  },

  // 微信登录
  wxLogin() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: (loginRes) => {
          if (loginRes.code) {
            resolve(loginRes.code);
          } else {
            reject(new Error('微信登录失败'));
          }
        },
        fail: reject
      });
    });
  },

  // 获取用户信息（新版需要按钮触发）
  getUserProfile() {
    return new Promise((resolve, reject) => {
      // 新版微信使用 getUserInfo 回调方式
      resolve({ nickName: '微信用户', avatarUrl: '', gender: 0 });
    });
  },

  // 获取手机号
  getPhoneNumber(e) {
    return new Promise((resolve, reject) => {
      if (e.detail.errMsg !== 'getPhoneNumber:ok') {
        reject(new Error('用户拒绝授权手机号'));
        return;
      }
      // e.detail.code 可以发给后端解密
      resolve(e.detail.code);
    });
  },

  // 检查并自动登录
  async checkAndLogin() {
    if (store.isLoggedIn()) {
      return true;
    }
    return false;
  }
});
