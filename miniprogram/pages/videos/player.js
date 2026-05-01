// 视频播放器页
var api = require('../../utils/api');
var timer = null;

Page({
  data: {
    videoId: '',
    video: null,
    videoUrl: '',

    // 播放状态
    playing: false,
    currentTime: 0,
    duration: 0,
    loaded: false,
    buffered: 0,

    // 购买状态
    needPay: false,
    isPurchased: false,

    // 学习进度
    progressPercent: 0,
    isCompleted: false,

    // 笔记
    notes: '',
    showNoteInput: false,

    // 同系列其他集
    relatedEpisodes: [],

    // 用户信息
    userInfo: null
  },

  onLoad(options) {
    var id = options.id;
    if (!id) {
      wx.showToast({ title: '参数错误', icon: 'none' });
      setTimeout(function() { wx.navigateBack(); }, 1500);
      return;
    }
    
    this.setData({
      videoId: id,
      userInfo: wx.getStorageSync('userInfo') || {}
    });
    
    this.loadVideoDetail();
  },

  onUnload() {
    if (timer) { clearInterval(timer); timer = null; }
    this.saveProgress();
  },

  onHide() {
    if (timer) { clearInterval(timer); timer = null; }
    this.saveProgress();
  },

  // 加载视频详情
  loadVideoDetail() {
    var that = this;
    wx.showLoading({ title: '加载中...' });
    
    api.video.getDetail(that.data.videoId).then(function(res) {
      wx.hideLoading();
      if (!res.data) {
        wx.showToast({ title: '视频不存在或已下架', icon: 'none' });
        return;
      }

      var v = res.data;
      
      // 处理URL和封面
      if (v.coverUrl) v.coverUrl = api.fixImageUrl(v.coverUrl);

      // WXML预处理: 时长格式化 (WXML不支持复杂表达式)
      var duration = Number(v.duration) || 0;
      var durationStr = this.formatDuration(duration);

      // WXML预处理: 难度标签
      var difficultyLabel = '';
      if (v.difficulty && v.difficulty !== 'beginner') {
        if (v.difficulty === 'elementary') difficultyLabel = '初级';
        else if (v.difficulty === 'intermediate') difficultyLabel = '中级';
        else if (v.difficulty === 'advanced') difficultyLabel = '高级';
      }

      // WXML预处理: 讲师头像(首字)
      var instructorAvatar = '👤';
      if (v.instructor && v.instructor.length > 0) {
        instructorAvatar = v.instructor.charAt(0);
      }

      // 构建完整视频URL
      var fullVideoUrl = '';
      if (v.videoUrl) {
        if (v.videoUrl.startsWith('/uploads/')) {
          fullVideoUrl = api.getBaseUrl().replace('/api','') + v.videoUrl;
        } else if (v.videoUrl.startsWith('http')) {
          fullVideoUrl = v.videoUrl;
        } else {
          fullVideoUrl = api.getBaseUrl().replace('/api','') + '/' + v.videoUrl;
        }
      }

      // WXML预处理: 同系列剧集
      var relatedEpisodes = (v.relatedEpisodes || []).map(function(ep, idx) {
        if (ep.coverUrl) ep.coverUrl = api.fixImageUrl(ep.coverUrl);
        ep.epIndex = String(idx + 1);
        ep.isCurrentEp = Number(ep.id) === Number(id);
        ep.durationStr = that.formatDuration(ep.duration);
        return ep;
      });

      that.setData({
        video: v,
        videoUrl: fullVideoUrl,
        isPurchased: !!v.isPurchased,
        progressPercent: v.progressPercent || 0,
        isCompleted: !!v.isCompleted,
        notes: v.notes || '',
        relatedEpisodes: relatedEpisodes,
        
        // WXML安全字段
        durationStr: durationStr,
        difficultyLabel: difficultyLabel,
        instructorAvatar: instructorAvatar,

        // 判断是否需要购买
        needPay: !v.isPurchased && parseFloat(v.price || 0) > 0,
        
        duration: v.duration || 0
      });

      // 设置导航栏标题
      wx.setNavigationBarTitle({ title: v.title.length > 10 ? v.title.substring(0, 10) + '...' : v.title });

    }).catch(function(err) {
      wx.hideLoading();
      wx.showToast({ title: '加载失败', icon: 'none' });
    });
  },

  // 视频播放事件
  onPlay() {
    this.setData({ playing: true });
    // 开始定时保存进度（每15秒）
    var that = this;
    if (timer) clearInterval(timer);
    timer = setInterval(function() {
      that.saveProgress();
    }, 15000);
  },

  onPause() {
    this.setData({ playing: false });
    if (timer) { clearInterval(timer); timer = null; }
    this.saveProgress();
  },

  onEnded() {
    this.setData({ playing: false });
    if (timer) { clearInterval(timer); timer = null; }
    // 标记完成
    this.saveProgress(true);
    wx.showToast({ title: '🎉 观看完成！+5学习积分', icon: 'none' });
  },

  onTimeUpdate(e) {
    var ct = e.detail.currentTime;
    var dur = e.detail.duration;
    this.setData({
      currentTime: ct,
      duration: dur || this.data.duration
    });
    // 实时更新进度百分比
    if (dur > 0) {
      var pct = Math.round((ct / dur) * 100);
      this.setData({ progressPercent: pct });
    }
  },

  onLoadedMetadata(e) {
    this.setData({
      duration: e.detail.duration || this.data.duration,
      loaded: true
    });
  },

  onError(e) {
    console.error('[VIDEO_ERROR]', e.detail);
    wx.showModal({
      title: '播放出错',
      content: '视频加载失败，可能是网络问题或文件不存在',
      showCancel: false,
      confirmText: '返回'
    });
  },

  // 购买视频
  handleBuy() {
    var that = this;
    var price = parseFloat(this.data.video.price || 0);
    
    wx.showModal({
      title: '确认购买',
      content: '确定花费 ¥' + price.toFixed(2) + ' 购买「' + that.data.video.title + '」吗？\n将从代理商余额扣除。',
      confirmText: '立即支付',
      success: function(res) {
        if (res.confirm) {
          wx.showLoading({ title: '处理中...' });
          api.video.buy(that.data.videoId).then(function(result) {
            wx.hideLoading();
            wx.showToast({ title: result.message || '购买成功！', icon: 'success' });
            
            // 更新本地状态
            that.setData({
              isPurchased: true,
              needPay: false
            });
            
            // 更新用户余额
            if (result.data && result.data.newBalance !== undefined) {
              var uInfo = that.data.userInfo || {};
              uInfo.balance = result.data.newBalance;
              that.setData({ userInfo: uInfo });
              wx.setStorageSync('userInfo', uInfo);
            }

          }).catch(function(err) {
            wx.hideLoading();
            var msg = '购买失败';
            if (err && err.data && err.data.message) msg = err.data.message;
            wx.showToast({ title: msg, icon: 'none' });
          });
        }
      }
    });
  },

  // 保存进度
  saveProgress(forceComplete) {
    if (!this.data.videoId || !this.data.loaded) return;
    var that = this;
    
    var data = {
      progress_seconds: Math.floor(this.data.currentTime),
      total_seconds: Math.floor(this.data.duration)
    };
    if (forceComplete) data.progress_percent = 100;

    api.video.saveProgress(this.data.videoId, data).catch(function(err) {
      console.warn('[PROGRESS_SAVE_FAIL]', err);
    });
  },

  // 格式化时间 (用于显示)
  formatTime(sec) {
    if (!sec) return '00:00';
    sec = Math.floor(sec);
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  },

  // 格式化时长秒数为可读字符串 (WXML预处理用)
  formatDuration(seconds) {
    if (!seconds && seconds !== 0) return '00:00';
    seconds = Number(seconds) || 0;
    var h = Math.floor(seconds / 3600);
    var m = Math.floor((seconds % 3600) / 60);
    var s = Math.floor(seconds % 60);
    var ms = m < 10 ? '0' + m : '' + m;
    var ss = s < 10 ? '0' + s : '' + s;
    if (h > 0) {
      return h + ':' + ms + ':' + ss;
    }
    return ms + ':' + ss;
  },

  // 笔记操作
  toggleNoteInput() {
    this.setData({ showNoteInput: !this.data.showNoteInput });
  },
  onNoteInput(e) {
    this.setData({ notes: e.detail.value });
  },
  saveNote() {
    var that = this;
    if (!that.data.notes.trim()) return;
    
    api.video.saveNotes(that.data.videoId, that.data.notes).then(function() {
      wx.showToast({ title: '笔记已保存', icon: 'success' });
      that.setData({ showNoteInput: false });
    });
  },

  // 跳转同系列集
  goToEpisode(e) {
    var id = e.currentTarget.dataset.id;
    if (id == that.data.videoId) return;
    this.saveProgress();
    wx.redirectTo({ url: '/pages/videos/player?id=' + id });
  },

  // 返回列表
  goBackToList() {
    wx.navigateBack();
  }
});
