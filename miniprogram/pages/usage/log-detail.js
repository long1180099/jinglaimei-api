var api = require('../../utils/api');

Page({
  data: {
    log: null,
    id: 0
  },

  onLoad: function(options) {
    if (options.id) {
      this.setData({ id: options.id });
      this.loadDetail(options.id);
    }
  },

  loadDetail: function(id) {
    var that = this;
    api.usage.getLogDetail(id).then(function(res) {
      if (res.data && res.data.code === 0) {
        that.setData({ log: res.data.data });
      } else {
        wx.showToast({ title: '加载失败', icon: 'none' });
      }
    }).catch(function(err) {
      wx.showToast({ title: '网络错误', icon: 'none' });
    });
  }
});
