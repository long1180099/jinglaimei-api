var api = require('../../utils/api');
var store = require('../../utils/store');

Page({
  data: {
    list: [],
    total: 0,
    page: 1,
    pageSize: 20,
    loading: false,
    noMore: false,
    userInfo: null,
    canCreate: false
  },

  onLoad: function() {
    var userInfo = store.getUserInfo();
    this.setData({
      userInfo: userInfo,
      canCreate: (userInfo.agent_level || 1) >= 3
    });
  },

  onShow: function() {
    this.reload();
  },

  onPullDownRefresh: function() {
    this.reload();
    wx.stopPullDownRefresh();
  },

  onReachBottom: function() {
    if (!this.data.noMore && !this.data.loading) {
      this.loadMore();
    }
  },

  reload: function() {
    this.setData({ page: 1, list: [], noMore: false });
    this.loadData();
  },

  loadMore: function() {
    var page = this.data.page + 1;
    this.setData({ page: page });
    this.loadData(true);
  },

  loadData: function(append) {
    var that = this;
    if (that.data.loading) return;
    that.setData({ loading: true });

    api.usage.getLogs({
      page: that.data.page,
      pageSize: that.data.pageSize
    }).then(function(res) {
      if (res.data && res.data.code === 0) {
        var result = res.data.data;
        var newList = append ? that.data.list.concat(result.list || []) : (result.list || []);
        that.setData({
          list: newList,
          total: result.total || 0,
          noMore: newList.length >= (result.total || 0)
        });
      }
    }).catch(function(err) {
      console.error('加载使用记录失败:', err);
    }).finally(function() {
      that.setData({ loading: false });
    });
  },

  goDetail: function(e) {
    var id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/usage/log-detail?id=' + id });
  },

  goCreate: function() {
    wx.navigateTo({ url: '/pages/usage/create-log' });
  }
});
