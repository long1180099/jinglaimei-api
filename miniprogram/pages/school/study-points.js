/**
 * 学习积分页面
 */
var api = require('../../utils/api');
var store = require('../../utils/store');

Page({
  data: {
    points: 0,
    level: 1,
    levelName: '新手',
    records: [],
    loading: true
  },

  onLoad: function() {
    this.loadPointsData();
  },

  onShow: function() {
    // 页面显示时刷新
  },

  onPullDownRefresh: function() {
    var that = this;
    this.loadPointsData(function() {
      wx.stopPullDownRefresh();
    });
  },

  loadPointsData: function(callback) {
    var that = this;
    var userInfo = store.getUserInfo();

    // 显示当前积分
    if (userInfo) {
      that.setData({
        points: parseInt(userInfo.study_points || userInfo.points || 0),
        level: parseInt(userInfo.study_level || userInfo.level || 1),
        levelName: that.getLevelName(parseInt(userInfo.study_level || userInfo.level || 1))
      });
    }

    // 加载积分记录
    that.setData({ loading: false });
    if (callback) callback();
  },

  getLevelName: function(level) {
    var names = ['', '新手学员', '初级学员', '中级学员', '高级学员', '金牌讲师', '钻石导师'];
    return names[level] || '新手学员';
  },

  goBack: function() {
    wx.navigateBack();
  }
});
