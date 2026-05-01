var api = require('../../utils/api');
var _fullUrl = api.BASE_URL || 'https://api.jinglaimei.com/api';
var BASE_URL = _fullUrl.replace(/\/api\/?$/, '');

Page({
  data: {
    session: null,
    messages: [],
    questionTypes: [],
    loading: true
  },

  onLoad: function(options) {
    if (options.id) {
      this.loadDetail(options.id);
    }
  },

  loadDetail: function(id) {
    var that = this;
    var token = wx.getStorageSync('token') || '';

    wx.request({
      url: BASE_URL + '/api/mp/socratic/history/' + id,
      header: {
        'Authorization': 'Bearer ' + token
      },
      success: function(res) {
        if (res.statusCode === 200 && res.data && res.data.data) {
          var data = res.data.data;
          var messages = (data.messages || []).map(function(m) {
            m.question_type_name = that.getTypeName(m.question_type);
            m.question_type_color = that.getTypeColor(m.question_type);
            return m;
          });
          that.setData({
            session: data.session,
            messages: messages,
            questionTypes: data.question_types || []
          });
        } else {
          wx.showToast({ title: '加载失败', icon: 'none' });
        }
      },
      fail: function() {
        wx.showToast({ title: '网络错误', icon: 'none' });
      },
      complete: function() {
        that.setData({ loading: false });
      }
    });
  },

  getTypeName: function(type) {
    var map = {
      'clarification': '澄清式',
      'hypothesis': '假设式',
      'reverse': '反向式',
      'guiding': '引导式',
      'summary': '总结式'
    };
    return map[type] || '';
  },

  getTypeColor: function(type) {
    var map = {
      'clarification': '#1890ff',
      'hypothesis': '#722ed1',
      'reverse': '#e94560',
      'guiding': '#52c41a',
      'summary': '#faad14'
    };
    return map[type] || '#999';
  }
});
