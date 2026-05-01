/**
 * 工具函数模块
 */

/**
 * 格式化金额
 */
function formatMoney(amount, decimals = 2) {
  if (amount === null || amount === undefined) return '0.00';
  return parseFloat(amount).toFixed(decimals);
}

/**
 * 格式化日期
 */
function formatDate(dateStr, fmt = 'YYYY-MM-DD HH:mm') {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const o = {
    'M+': d.getMonth() + 1,
    'D+': d.getDate(),
    'H+': d.getHours(),
    'm+': d.getMinutes(),
    's+': d.getSeconds()
  };
  if (/(Y+)/.test(fmt)) {
    fmt = fmt.replace(RegExp.$1, (d.getFullYear() + '').substr(4 - RegExp.$1.length));
  }
  for (const k in o) {
    if (new RegExp('(' + k + ')').test(fmt)) {
      fmt = fmt.replace(RegExp.$1, RegExp.$1.length === 1 ? o[k] : ('00' + o[k]).substr(('' + o[k]).length));
    }
  }
  return fmt;
}

/**
 * 相对时间
 */
function timeAgo(dateStr) {
  if (!dateStr) return '';
  const now = Date.now();
  const d = new Date(dateStr).getTime();
  const diff = now - d;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return '刚刚';
  if (diff < hour) return Math.floor(diff / minute) + '分钟前';
  if (diff < day) return Math.floor(diff / hour) + '小时前';
  if (diff < 30 * day) return Math.floor(diff / day) + '天前';
  return formatDate(dateStr, 'MM-DD');
}

/**
 * 订单状态文字
 */
function orderStatusText(status) {
  const map = {
    0: '待付款',
    1: '待发货',
    2: '待收货',
    3: '已完成',
    4: '已取消'
  };
  return map[status] || '未知';
}

/**
 * 订单状态颜色
 */
function orderStatusColor(status) {
  const map = {
    0: '#ff9900',
    1: '#1890ff',
    2: '#52c41a',
    3: '#999999',
    4: '#cccccc'
  };
  return map[status] || '#999999';
}

/**
 * 代理商等级文字
 */
function agentLevelText(level) {
  const map = {
    1: '会员',
    2: '打版代言人',
    3: '代理商',
    4: '批发商',
    5: '首席分公司',
    6: '集团事业部'
  };
  return map[level] || '会员';
}

/**
 * 代理商等级颜色
 */
function agentLevelColor(level) {
  const map = {
    1: '#8c8c8c',
    2: '#52c41a',
    3: '#1890ff',
    4: '#fa8c16',
    5: '#f5222d',
    6: '#722ed1'
  };
  return map[level] || '#8c8c8c';
}

/**
 * 课程类型文字
 */
function courseTypeText(type) {
  const map = {
    1: '新手入门',
    2: '进阶课程',
    3: '实战案例',
    4: '专题讲座'
  };
  return map[type] || '其他';
}

/**
 * 检查登录状态（仅检查，不强制跳转，满足微信审核要求）
 */
function checkLogin() {
  const token = wx.getStorageSync('token');
  if (!token) {
    // 不再强制跳转登录页，仅返回false让调用方处理
    // 避免审核被拒：不得强制用户进行登录才能体验
    return false;
  }
  return true;
}

/**
 * 静默检查登录状态（不跳转登录页）
 */
function checkLoginSilent() {
  const token = wx.getStorageSync('token');
  return !!token;
}

/**
 * 显示加载
 */
function showLoading(title = '加载中...') {
  wx.showLoading({ title, mask: true });
}

/**
 * 隐藏加载
 */
function hideLoading() {
  wx.hideLoading();
}

/**
 * 复制到剪贴板
 */
function copyText(text) {
  wx.setClipboardData({
    data: text,
    success() {
      wx.showToast({ title: '已复制', icon: 'success' });
    }
  });
}

/**
 * 拨打电话
 */
function makePhoneCall(phone) {
  if (!phone) return;
  wx.makePhoneCall({ phoneNumber: phone });
}

/**
 * 根据代理商等级获取对应价格
 */
function getPriceByLevel(product, level) {
  if (level >= 6 && product.division_price) return product.division_price;
  if (level >= 5 && product.chief_price) return product.chief_price;
  if (level >= 4 && product.wholesale_price) return product.wholesale_price;
  if (level >= 3 && product.agent_price) return product.agent_price;
  if (level >= 2 && product.vip_price) return product.vip_price;
  return product.retail_price;
}

/**
 * 获取价格标签
 */
function getPriceLabel(level) {
  const map = {
    1: '零售价',
    2: '代言人价',
    3: '代理价',
    4: '批发价',
    5: '分公司价',
    6: '事业部价'
  };
  return map[level] || '零售价';
}

module.exports = {
  formatMoney,
  formatDate,
  timeAgo,
  orderStatusText,
  orderStatusColor,
  agentLevelText,
  agentLevelColor,
  courseTypeText,
  checkLogin,
  checkLoginSilent,
  showLoading,
  hideLoading,
  copyText,
  makePhoneCall,
  getPriceByLevel,
  getPriceLabel
};
