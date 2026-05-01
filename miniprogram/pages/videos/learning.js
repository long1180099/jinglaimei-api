// 学习中心页
var api = require('../../utils/api');

Page({
  data: {
    // 正在学习
    learning: [],
    
    // 已完成
    completed: [],

    // 统计数据
    stats: {
      totalWatched: 0,
      completedCount: 0,
      avgProgress: 0,
      totalMinutes: 0,
      streakDays: 0,
      totalStudyDates: 0
    },

    // 推荐继续
    recommendContinue: [],

    // 用户信息
    userInfo: null,

    loading: true
  },

  onLoad() {
    this.setData({ userInfo: wx.getStorageSync('userInfo') || {} });
    this.loadLearningCenter();
  },

  onPullDownRefresh() {
    this.loadLearningCenter().then(function() { wx.stopPullDownRefresh(); });
  },

  // 加载学习中心数据
  loadLearningCenter() {
    var that = this;
    that.setData({ loading: true });

    return api.video.getLearningCenter().then(function(res) {
      if (res.data) {
        var d = res.data;

        // 处理封面URL + 时长格式化(WXML不支持除法表达式)
        if (d.learning) {
          d.learning.forEach(function(item) {
            if (item.coverUrl) item.coverUrl = api.fixImageUrl(item.coverUrl);
            item.durationStr = that.formatDuration(item.duration);
          });
        }
        if (d.completed) {
          d.completed.forEach(function(item) {
            if (item.coverUrl) item.coverUrl = api.fixImageUrl(item.coverUrl);
            if (item.completedAt) item.completedDateStr = String(item.completedAt).substring(0, 10);
            item.durationStr = that.formatDuration(item.duration);
          });
        }
        if (d.recommendContinue) {
          d.recommendContinue.forEach(function(item) {
            if (item.coverUrl) item.coverUrl = api.fixImageUrl(item.coverUrl);
            item.durationStr = that.formatDuration(item.duration);
          });
        }

        that.setData({
          learning: d.learning || [],
          completed: d.completed || [],
          stats: d.stats || {},
          recommendContinue: d.recommendContinue || [],
          loading: false
        });
      } else {
        that.setData({ loading: false });
      }
    }).catch(function() {
      that.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    });
  },

  // 跳转播放
  goToPlayer(e) {
    var id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/videos/player?id=' + id });
  },

  // 返回视频列表
  goToList() {
    wx.navigateBack();
  },

  // 格式化时长 (WXML预处理用)
  formatDuration(seconds) {
    if (!seconds && seconds !== 0) return '';
    seconds = Number(seconds) || 0;
    var m = Math.floor(seconds / 60);
    var s = Math.floor(seconds % 60);
    if (m > 0) return m + '分' + (s > 0 ? s + '秒' : '');
    return s + '秒';
  }
});
