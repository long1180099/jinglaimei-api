/**
 * 全局数据存储
 */
const util = require('./util');

const globalData = {
  userInfo: null,
  token: '',
  cart: [] // 购物车数据（本地存储）
};

function getUserInfo() {
  return wx.getStorageSync('userInfo') || globalData.userInfo;
}

function setUserInfo(info) {
  // 字段名归一化：后端可能返回驼峰(agentLevel)或下划线(agent_level)，统一补齐
  if (info) {
    if (info.agentLevel !== undefined && info.agent_level === undefined) {
      info.agent_level = info.agentLevel;
    }
    if (info.agentLevel === undefined && info.agent_level !== undefined) {
      info.agentLevel = info.agent_level;
    }
    // 同理处理其他字段（防止未来遗漏）
    if (info.realName !== undefined && info.real_name === undefined) {
      info.real_name = info.realName;
    }
    if (info.inviteCode !== undefined && info.invite_code === undefined) {
      info.invite_code = info.inviteCode;
    }
    if (info.totalIncome !== undefined && info.total_income === undefined) {
      info.total_income = info.totalIncome;
    }
    if (info.parentId !== undefined && info.parent_id === undefined) {
      info.parent_id = info.parentId;
    }
    if (info.teamId !== undefined && info.team_id === undefined) {
      info.team_id = info.teamId;
    }
  }
  globalData.userInfo = info;
  wx.setStorageSync('userInfo', info);
}

function getToken() {
  return wx.getStorageSync('token') || globalData.token;
}

function setToken(token) {
  globalData.token = token;
  wx.setStorageSync('token', token);
}

function isLoggedIn() {
  return !!getToken();
}

function logout() {
  globalData.userInfo = null;
  globalData.token = '';
  wx.removeStorageSync('token');
  wx.removeStorageSync('userInfo');
}

// 购物车操作
function getCart() {
  return wx.getStorageSync('cart') || [];
}

function setCart(cart) {
  wx.setStorageSync('cart', cart);
}

function addToCart(product, quantity = 1) {
  const cart = getCart();
  const exist = cart.find(item => item.product_id === product.id);
  if (exist) {
    exist.quantity += quantity;
    // 已存在的商品也更新价格（防止等级变更后价格不刷新）
    if (product.price !== undefined) {
      exist.price = product.price;
    }
  } else {
    // 根据用户等级计算正确的价格，而非硬编码 agent_price
    var price = product.price;
    if (price === undefined) {
      const userInfo = getUserInfo();
      var level = userInfo ? (userInfo.agent_level || userInfo.agentLevel) : 1;
      price = util.getPriceByLevel(product, level);
    }
    cart.push({
      product_id: product.id,
      product_name: product.product_name,
      main_image: product.main_image,
      price: price,
      // 保留原始价格字段，以便购物车刷新时重新计算
      retail_price: product.retail_price,
      vip_price: product.vip_price,
      agent_price: product.agent_price,
      wholesale_price: product.wholesale_price,
      chief_price: product.chief_price,
      division_price: product.division_price,
      quantity: quantity,
      selected: true
    });
  }
  setCart(cart);
  return cart;
}

function removeFromCart(productId) {
  let cart = getCart();
  cart = cart.filter(item => item.product_id !== productId);
  setCart(cart);
  return cart;
}

function updateCartQuantity(productId, quantity) {
  const cart = getCart();
  const item = cart.find(item => item.product_id === productId);
  if (item) {
    item.quantity = Math.max(1, quantity);
  }
  setCart(cart);
  return cart;
}

function clearCart() {
  setCart([]);
}

function getCartTotal() {
  const cart = getCart();
  const selected = cart.filter(item => item.selected);
  return selected.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function getCartCount() {
  const cart = getCart();
  return cart.reduce((sum, item) => sum + item.quantity, 0);
}

module.exports = {
  getUserInfo,
  setUserInfo,
  getToken,
  setToken,
  isLoggedIn,
  logout,
  getCart,
  setCart,
  addToCart,
  removeFromCart,
  updateCartQuantity,
  clearCart,
  getCartTotal,
  getCartCount
};
