// 余额明细页
const app = getApp();
const { request } = require('../../utils/api.js');

Page({
  data: {
    balance: 0,
    logs: [],
    loading: true,
    currentType: '',
    page: 1,
    pageSize: 15,
    hasMore: true,
    total: 0,
    currentTypeName: '记录'
  },

  // 变动类型中文映射
  typeMap: {
    recharge: { label: '余额充值', icon: '💰', isPlus: true },
    payment: { label: '订单消费', icon: '🛒', isPlus: false },
    commission: { label: '佣金入账', icon: '🎯', isPlus: true },
    rebate: { label: '差价返利', icon: '💎', isPlus: true },
    refund: { label: '订单退款', icon: '↩️', isPlus: true },
    withdraw: { label: '提现', icon: '💸', isPlus: false },
    manual: { label: '管理员调整', icon: '⚙️', isPlus: false },
    order_rebate: { label: '订单差价', icon: '📦', isPlus: true }
  },

  // 筛选Tab名称
  typeNameMap: {
    '': '记录',
    recharge: '充值记录',
    payment: '消费记录',
    commission: '佣金记录',
    refund: '退款记录'
  },

  onLoad(options) {
    const userInfo = wx.getStorageSync('userInfo') || {};
    const balance = parseFloat(userInfo.balance) || 0;

    this.setData({
      userId: userInfo.id || options.userId || '',
      balance: balance
    });

    this.fetchBalance();
    this.fetchLogs();
  },

  onShow() {
    // 每次显示时刷新（从其他页面返回时）
    if (this.data.userId && !this._firstLoad) {
      this.fetchBalance();
    }
    this._firstLoad = false;
  },

  onPullDownRefresh() {
    this.setData({ page: 1, hasMore: true });
    Promise.all([this.fetchBalance(), this.fetchLogs(true)]).then(() => {
      wx.stopPullDownRefresh();
    }).catch(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 刷新当前余额
  fetchBalance() {
    if (!this.data.userId) return;
    var url = '/mp/balance';
    request(url).then(res => {
      var data = res && res.data ? res.data : res;
      if (data && data.balance !== undefined) {
        this.setData({ balance: data.balance || 0 });
        // 同步更新本地缓存
        var userInfo = wx.getStorageSync('userInfo') || {};
        userInfo.balance = data.balance;
        wx.setStorageSync('userInfo', userInfo);
      }
    }).catch(() => {});
  },

  // 加载明细列表
  fetchLogs(refresh) {
    if (this.data.loading && !refresh) return;
    if (!this.data.hasMore && !refresh) return;
    if (!this.data.userId) return;

    var page = refresh ? 1 : this.data.page;
    this.setData({ loading: true });

    var url = '/mp/balance-logs?page=' + page + '&pageSize=' + this.data.pageSize;
    if (this.data.currentType) {
      url += '&type=' + this.data.currentType;
    }

    request(url).then(res => {
      // 兼容两种返回格式: { data: { list, total } } 或直接 { list, total }
      var payload = res && res.data ? res.data : res;
      if (!payload) return;

      var list = (payload.list || []).map(function(item) {
        var typeConfig = this.typeMap[item.change_type] ||
          { label: item.change_type, icon: item.isPlus ? '📌' : '📋', isPlus: (item.change_amount > 0) };
        var absAmount = Math.abs(item.change_amount).toFixed(2);
        return Object.assign({}, item, {
          icon: typeConfig.icon,
          typeLabel: typeConfig.label,
          isPlus: typeConfig.isPlus,
          absAmount: absAmount
        });
      }.bind(this));

      if (refresh) {
        this.setData({
          logs: list,
          page: page + 1,
          total: payload.total || 0,
          hasMore: list.length >= this.data.pageSize,
          loading: false
        });
      } else {
        this.setData({
          logs: this.data.logs.concat(list),
          page: page + 1,
          total: payload.total || 0,
          hasMore: list.length >= this.data.pageSize,
          loading: false
        });
      }
    }).catch(function(err) {
      console.error('加载余额明细失败:', err);
      this.setData({ loading: false });
    }.bind(this));
  },

  // 切换筛选类型
  switchType(e) {
    var type = e.currentTarget.dataset.type || '';
    this.setData({
      currentType: type,
      currentTypeName: this.typeNameMap[type] || '记录',
      page: 1,
      logs: [],
      hasMore: true
    });
    this.fetchLogs(true);
  },

  // 触底加载更多
  loadMore() {
    if (this.data.hasMore && !this.data.loading) {
      this.fetchLogs(false);
    }
  },

  // 下拉刷新
  onReachBottom() {
    this.loadMore();
  }
});
