// 视频列表页
const api = require('../../utils/api');

Page({
  data: {
    categories: [],
    activeCategory: 0,
    mainTabs: ['推荐', '最新', '免费', '系列课'],
    currentMainTab: 0,
    tabMap: ['recommend', 'created_at', 'free', 'series'],
    videos: [],
    loading: false,
    page: 1,
    hasMore: true,
    keyword: '',
    showSearch: false,
    loadError: false,
    errorMsg: '',
    userInfo: null,
    scrollHeight: 600 // 动态计算
  },

  onLoad() {
    this.setData({ userInfo: wx.getStorageSync('userInfo') || {} });
    this.calcScrollHeight();
    this.loadCategories();
    this.loadData(true);
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
    }
  },

  // 动态计算内容区高度（紧凑模式）
  calcScrollHeight() {
    var that = this;
    wx.getSystemInfo({
      success(res) {
        // 头部(~95) + tabs(~52) + cats(~64) ≈ 210
        var h = res.windowHeight - 220;
        that.setData({ scrollHeight: h > 300 ? h : 500 });
      }
    });
  },

  onPullDownRefresh() {
    this.setData({ page: 1, videos: [], loadError: false, errorMsg: '' });
    this.loadData(true).then(() => { wx.stopPullDownRefresh(); });
  },

  onReachBottom() {
    if (!this.data.loading && this.data.hasMore) {
      this.setData({ page: this.data.page + 1 });
      this.loadData(false);
    }
  },

  // 加载分类
  loadCategories() {
    api.video.getCategories().then(function(res) {
      var cats = [{ id: 0, name: '全部', icon: '🏠' }];
      if (res.data && res.data.length > 0) {
        res.data.forEach(function(c) { cats.push(c); });
      }
      this.setData({ categories: cats });
    }.bind(this)).catch(function(e) { console.error('[视频]分类失败:', e); });
  },

  // 加载视频数据
  loadData(isFirst) {
    var that = this;
    if (this.data.loading) return;
    this.setData({ loading: true, loadError: false });

    var params = {
      page: that.data.page,
      pageSize: 10,
      category_id: that.data.activeCategory || undefined,
      sort_by: that.data.tabMap[that.data.currentMainTab] || 'created_at',
      tab: that.data.tabMap[that.data.currentMainTab]
    };
    if (that.data.keyword) params.keyword = that.data.keyword;

    api.video.getList(params).then(function(res) {
      var list = [], total = 0;
      if (res && res.data) {
        list = res.data.list || [];
        total = res.data.total || 0;
        list.forEach(function(item) {
          if (item.coverUrl) item.coverUrl = api.fixImageUrl(item.coverUrl);
          if (item.price === 0 || !item.price) item.isFree = true;
          item.durationStr = that.formatDuration(item.duration);
          item.difficultyLabel = that.getDifficultyLabel(item.difficulty);
        });
      }

      var newList = isFirst ? list : that.data.videos.concat(list);
      that.setData({
        videos: newList,
        hasMore: newList.length < total,
        loading: false,
        loadError: false
      });

      if (list.length === 0 && isFirst) {
        console.log('[视频] 空列表');
      }
    }).catch(function(err) {
      console.error('[视频]加载失败:', err.message || err);
      that.setData({
        loading: false,
        loadError: true,
        errorMsg: err.message || '网络请求失败'
      });
    });
  },

  retryLoad() {
    this.setData({ page: 1, videos: [], loadError: false, errorMsg: '' });
    this.loadData(true);
  },

  getDifficultyLabel(d) {
    return { beginner:'', elementary:'初级', intermediate:'中级', advanced:'高级', expert:'专家' }[d] || '';
  },

  switchMainTab(e) {
    var idx = e.currentTarget.dataset.index;
    this.setData({ currentMainTab: idx, page: 1, videos: [], loadError: false });
    this.loadData(true);
  },

  switchCategory(e) {
    var id = e.currentTarget.dataset.id;
    this.setData({ activeCategory: id, page: 1, videos: [], loadError: false });
    this.loadData(true);
  },

  onSearchInput(e) { this.setData({ keyword: e.detail.value }); },
  onSearchConfirm() { this.setData({ page: 1, videos: [], showSearch: false, loadError: false }); this.loadData(true); },
  toggleSearch() { this.setData({ showSearch: !this.data.showSearch }); },

  goToPlayer(e) { wx.navigateTo({ url: '/pages/videos/player?id=' + e.currentTarget.dataset.id }); },
  goToSeries(e) { wx.navigateTo({ url: '/pages/videos/series-detail?id=' + e.currentTarget.dataset.id }); },
  goToLearningCenter() { wx.navigateTo({ url: '/pages/videos/learning' }); },

  formatDuration(sec) {
    if (!sec && sec !== 0) return '00:00';
    sec = Number(sec) || 0;
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = Math.floor(sec % 60);
    var ms = m < 10 ? '0' + m : '' + m, ss = s < 10 ? '0' + s : '' + s;
    return h > 0 ? h + ':' + ms + ':' + ss : ms + ':' + ss;
  }
});
