// 苏格拉底式提问训练 - 历史记录（AI学院增强版）
const api = require('../../utils/api');
var _fullUrl = api.BASE_URL || 'https://api.jinglaimei.com/api';
var BASE_URL = _fullUrl.replace(/\/api\/?$/, '');

Page({
  data: {
    loaded: false,
    list: [],
    overview: null,
    page: 1,
    pageSize: 10,
    hasMore: true,

    // ====== AI学院新增 ======
    trendData: null,
    
    // 筛选状态
    filterGrade: '',
    filterCategory: '',
    
    gradeOptions: [
      { value: '', label: '全部' },
      { value: 'S', label: 'S级' },
      { value: 'A', label: 'A级' },
      { value: 'B', label: 'B级' },
      { value: 'C', label: 'C级' },
    ],

    recentTrendPoints: [],

    weekCalendar: [0, 0, 0, 0, 0, 0, 0],
    weekDayNames: ['', '', '', '', '', '', ''],
  },

  onLoad() {
    this._initWeekDays();
    this.loadData();
    this.loadTrend();
  },

  onShow() {
    if (this.data.loaded) this.loadData();
  },

  onPullDownRefresh() {
    this.setData({ page: 1 });
    Promise.all([
      this.loadData(true),
      this.loadTrend()
    ]).then(() => wx.stopPullDownRefresh());
  },

  _initWeekDays() {
    var names = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    var today = new Date().getDay(); // 0=Sunday
    var result = [];
    for (var i = 6; i >= 0; i--) {
      var idx = (today - i + 7) % 7;
      result.push(names[idx]);
    }
    this.setData({ weekDayNames: result });
  },

  loadTrend() {
    var token = wx.getStorageSync('token');
    if (!token) return;

    wx.request({
      url: BASE_URL + '/api/mp/socratic/academy/trend',
      method: 'GET',
      header: { 'Authorization': 'Bearer ' + token },
      data: { days: 30 },
      success: (res) => {
        if (res.data.code === 0) {
          var d = res.data.data;
          var points = [];
          if (d.snapshots && d.snapshots.length > 0) {
            for (var i = 0; i < d.snapshots.length && i < 15; i++) {
              var s = d.snapshots[i];
              points.push({
                date: s.snapshot_date.split('T')[0] || s.snapshot_date,
                score: s.overall_score || 0,
                grade: s.grade || '-'
              });
            }
          }

          var weekCal = [0, 0, 0, 0, 0, 0, 0];
          var today = new Date();
          for (var w = 6; w >= 0; w--) {
            var checkDate = new Date(today);
            checkDate.setDate(today.getDate() - w);
            var dateStr = checkDate.toISOString().split('T')[0];
            if (d.snapshots) {
              for (var j = 0; j < d.snapshots.length; j++) {
                if ((d.snapshots[j].snapshot_date || '').indexOf(dateStr) >= 0) {
                  weekCal[6 - w] = d.snapshots[j].overall_score;
                  break;
                }
              }
            }
          }

          this.setData({
            trendData: d.trend || null,
            recentTrendPoints: points,
            weekCalendar: weekCal,
          });
        }
      }
    });
  },

  loadData(refresh = false) {
    const userId = wx.getStorageSync('userId') || (wx.getStorageSync('userInfo') || {}).id;
    if (!userId) { this.setData({ loaded: true }); return Promise.resolve(); }

    return new Promise((resolve) => {
      wx.request({
        url: `${BASE_URL}/api/mp/socratic/history`,
        method: 'GET',
        header: { 'Authorization': `Bearer ${wx.getStorageSync('token')}` },
        data: {
          page: refresh ? 1 : this.data.page,
          pageSize: this.data.pageSize
        },
        success: (res) => {
          if (res.data.code === 0) {
            const d = res.data.data;
            var listData = refresh ? (d.list || []) : [...this.data.list, ...(d.list || [])];
            
            // 保存原始列表用于筛选
            if (refresh) {
              this.data._originalList = listData;
            } else if (!this.data._originalList) {
              this.data._originalList = listData;
            } else {
              this.data._originalList = [...this.data._originalList, ...(d.list || [])];
            }

            // 应用本地筛选
            var filtered = this._applyFilter(listData);

            this.setData({
              loaded: true,
              list: filtered,
              overview: d.overview || null,
              hasMore: (d.list || []).length >= this.data.pageSize
            });
          }
          this.setData({ loaded: true });
          resolve();
        },
        fail: () => { this.setData({ loaded: true }); resolve(); }
      });
    });
  },

  _applyFilter(listData) {
    var fg = this.data.filterGrade;
    var fc = this.data.filterCategory;
    if (!fg && !fc) return listData;

    return listData.filter(function(item) {
      if (fg && item.grade !== fg) return false;
      if (fc && item.category !== fc) return false;
      return true;
    });
  },

  switchFilter(e) {
    var type = e.currentTarget.dataset.type;
    var val = e.currentTarget.dataset.val;

    if (type === 'grade') {
      this.setData({
        filterGrade: this.data.filterGrade === val ? '' : val
      }, () => {
        this.setData({ list: this._applyFilter(this.data._originalList || this.data.list) });
      });
    } else if (type === 'category') {
      this.setData({
        filterCategory: this.data.filterCategory === val ? '' : val
      }, () => {
        this.setData({ list: this._applyFilter(this.data._originalList || this.data.list) });
      });
    }
  },

  clearFilters() {
    this.setData({ filterGrade: '', filterCategory: '' });
    this.setData({ 
      list: this.data._originalList || this.data.list, 
      page: 1 
    });
    this.loadData(true);
  },

  loadMore() {
    if (!this.data.hasMore) return;
    this.setData({ page: this.data.page + 1 }, () => this.loadData());
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/socratic/detail?id=${id}` });
  },

  goTrain() {
    wx.navigateTo({ url: '/pages/socratic/list' });
  },

  _formatTime(timeStr) {
    if (!timeStr) return '';
    const d = new Date(timeStr);
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return m + '月' + day + '日 ' + h + ':' + min;
  },

  _formatDuration(seconds) {
    if (!seconds) return '0秒';
    if (seconds >= 60) return Math.floor(seconds / 60) + '分' + (seconds % 60) + '秒';
    return seconds + '秒';
  },

  _getGradeStyle(grade) {
    const styles = {
      S: 'background: linear-gradient(135deg, #ffd700, #ffaa00); color: #333',
      A: 'background: linear-gradient(135deg, #667eea, #764ba2); color: #fff',
      B: 'background: rgba(82,196,26,0.15); color: #52c41a',
      C: 'background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.45)',
      D: 'background: rgba(244,67,54,0.12); color: #e57373'
    };
    return styles[grade] || styles.C;
  },

  _getScoreColor(score) {
    if (score >= 90) return '#ffd700';
    if (score >= 80) return '#667eea';
    if (score >= 65) return '#52c41a';
    if (score >= 50) return '#faad14';
    return '#e57373';
  }
});
