var api = require('../../utils/api');

Page({
  data: {
    activeTab: 'all',
    list: [],
    page: 1,
    pageSize: 10,
    total: 0,
    hasMore: true,
    loading: false
  },

  onLoad: function() {
    this.loadList(true);
  },

  onPullDownRefresh: function() {
    var that = this;
    that.setData({ page: 1, hasMore: true });
    that.loadList(true, function() {
      wx.stopPullDownRefresh();
    });
  },

  onReachBottom: function() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMore();
    }
  },

  switchTab: function(e) {
    var tab = e.currentTarget.dataset.tab;
    if (tab === this.data.activeTab) return;
    this.setData({ activeTab: tab, page: 1, hasMore: true, list: [] });
    this.loadList(true);
  },

  loadList: function(reset, callback) {
    if (this.data.loading) return;
    var that = this;
    that.setData({ loading: true });

    var params = { page: that.data.page, pageSize: that.data.pageSize };
    if (that.data.activeTab !== 'all') params.category = that.data.activeTab;

    api.announcement.getList(params).then(function(res) {
      var data = res.data || {};
      var newList = data.list || [];

      that.setData({
        list: reset ? newList : that.data.list.concat(newList),
        total: data.total || 0,
        hasMore: newList.length >= that.data.pageSize,
        loading: false
      });

      if (callback) callback();
    }).catch(function(e) {
      console.error('加载公告列表失败:', e);
      that.setData({ loading: false });
      if (callback) callback();
    });
  },

  loadMore: function() {
    this.setData({ page: this.data.page + 1 });
    this.loadList(false);
  },

  goDetail: function(e) {
    var id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/news/detail?id=' + id });
  }
});
