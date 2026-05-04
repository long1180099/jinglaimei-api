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
    canDelegate: false,
    subordinateAgents: [],
    selectedAgentId: '',
    selectedAgentIndex: -1,
    searchKeyword: '',
    showFilter: false
  },

  onLoad: function() {
    var userInfo = store.getUserInfo();
    this.setData({
      userInfo: userInfo,
      canDelegate: (userInfo.agent_level || 1) >= 4
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
    this.setData({ page: this.data.page + 1 });
    this.loadData(true);
  },

  loadData: function(append) {
    var that = this;
    if (that.data.loading) return;
    that.setData({ loading: true });

    var params = {
      page: that.data.page,
      pageSize: that.data.pageSize
    };
    if (that.data.selectedAgentId) {
      params.subordinate_agent_id = that.data.selectedAgentId;
    }
    if (that.data.searchKeyword) {
      params.customer_name = that.data.searchKeyword;
    }

    api.usage.getLogs(params).then(function(res) {
      if (res.data && res.data.code === 0) {
        var result = res.data.data;
        var newList = append ? that.data.list.concat(result.list || []) : (result.list || []);
        var subordinateAgents = result.subordinateAgents || that.data.subordinateAgents;
        that.setData({
          list: newList,
          total: result.total || 0,
          noMore: newList.length >= (result.total || 0),
          subordinateAgents: subordinateAgents
        });
      }
    }).catch(function(err) {
      console.error('加载团队记录失败:', err);
    }).finally(function() {
      that.setData({ loading: false });
    });
  },

  // 筛选下级代理商
  onAgentChange: function(e) {
    var index = parseInt(e.detail.value);
    var agents = this.data.subordinateAgents;
    var agentId = agents[index] ? agents[index].id : '';
    this.setData({ selectedAgentId: agentId, selectedAgentIndex: index });
    this.reload();
  },

  // 搜索
  onSearchInput: function(e) {
    this.setData({ searchKeyword: e.detail.value });
  },

  doSearch: function() {
    this.reload();
  },

  goDetail: function(e) {
    var id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/usage/log-detail?id=' + id });
  },

  goCreateSubordinate: function() {
    wx.navigateTo({ url: '/pages/usage/create-for-subordinate' });
  }
});
