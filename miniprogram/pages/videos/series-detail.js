// 系列课详情页
var api = require('../../utils/api');

Page({
  data: {
    seriesId: '',
    series: null,
    episodes: [],
    isPurchased: false,
    loading: true
  },

  onLoad(options) {
    var id = options.id;
    if (!id) {
      wx.showToast({ title: '参数错误', icon: 'none' });
      setTimeout(function() { wx.navigateBack(); }, 1500);
      return;
    }
    
    this.setData({ seriesId: id });
    this.loadDetail();
  },

  onPullDownRefresh() {
    this.loadDetail().then(() => { wx.stopPullDownRefresh(); });
  },

  // 加载系列课详情
  loadDetail() {
    var that = this;
    that.setData({ loading: true });

    return api.video.getSeriesDetail(that.data.seriesId).then(function(res) {
      var s = res.data;
      if (!s) { that.setData({ loading: false }); return; }

      // 处理封面URL
      if (s.coverUrl) s.coverUrl = api.fixImageUrl(s.coverUrl);

      // WXML预处理: 系列课时长
      var totalSec = Number(s.totalDuration) || 0;
      s.durationStr = String(Math.floor(totalSec / 60));

      // WXML预处理: 难度标签
      if (s.difficulty) {
        var map = { 'beginner': '入门', 'elementary': '初级', 'intermediate': '中级', 'advanced': '高级' };
        s.difficultyLabel = map[s.difficulty] || '入门';
      } else {
        s.difficultyLabel = '入门';
      }

      // 处理剧集封面和价格 + WXML预处理
      var eps = s.episodes || [];
      eps.forEach(function(ep, idx) {
        if (ep.coverUrl) ep.coverUrl = api.fixImageUrl(ep.coverUrl);
        ep.isFree = !ep.price || parseFloat(ep.price) === 0;
        // WXML预处理
        ep.epIndex = String(idx + 1);
        var dur = Number(ep.duration) || 0;
        if (dur > 0) ep.durationStr = Math.floor(dur / 60) + '分';
        else ep.durationStr = '';
      });

      that.setData({
        series: s,
        episodes: eps,
        isPurchased: !!s.isPurchased,
        loading: false
      });

      wx.setNavigationBarTitle({
        title: (s.title.length > 8 ? s.title.substring(0, 8) + '...' : s.title)
      });

    }).catch(function() {
      that.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    });
  },

  // 购买系列课
  handleBuySeries() {
    var that = this;
    var price = parseFloat(that.data.series.price || 0);

    wx.showModal({
      title: '确认购买',
      content: '确定花费 ¥' + price.toFixed(2) + ' 购买「' + that.data.series.title + '」全套课程？\n包含 ' + that.data.episodes.length + ' 集内容。',
      confirmText: '立即支付',
      success(res) {
        if (res.confirm) {
          wx.showLoading({ title: '处理中...' });
          api.video.buySeries(that.data.seriesId).then(function(result) {
            wx.hideLoading();
            wx.showToast({ title: result.message || '购买成功！', icon: 'success' });
            
            that.setData({
              isPurchased: true,
              'series.studentCount': (that.data.series.studentCount || 0) + 1,
              'series.purchaseCount': (that.data.series.purchaseCount || 0) + 1
            });

            // 更新余额显示（如果有返回）
            if (result.data && result.data.newBalance !== undefined) {
              var uInfo = wx.getStorageSync('userInfo') || {};
              uInfo.balance = result.data.newBalance;
              wx.setStorageSync('userInfo', uInfo);
            }

          }).catch(err => {
            wx.hideLoading();
            var msg = '购买失败';
            if (err && err.data && err.data.message) msg = err.data.message;
            wx.showToast({ title: msg, icon: 'none' });
          });
        }
      }
    });
  },

  // 播放某一集
  playEpisode(e) {
    var id = e.currentTarget.dataset.id;
    var idx = e.currentTarget.dataset.index;
    
    // 如果未购买且该集需要付费，先提示购买
    if (!this.data.isPurchased) {
      var price = this.data.series.price;
      if (parseFloat(price || 0) > 0) {
        wx.showModal({
          title: '需要购买',
          content: '购买全套课程后即可观看所有内容，共' + this.data.episodes.length + '集',
          confirmText: '去购买'
        }).then(res => {
          if (res.confirm) this.handleBuySeries();
        });
        return;
      }
    }

    wx.navigateTo({
      url: '/pages/videos/player?id=' + id
    });
  }
});
