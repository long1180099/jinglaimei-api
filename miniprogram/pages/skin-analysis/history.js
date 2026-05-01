/**
 * 皮肤分析 - 历史记录
 */
const api = require('../../utils/api');
const store = require('../../utils/store');

Page({
  data: {
    reports: [],
    page: 1,
    hasMore: true,
    loading: false,
    empty: false,
    skinTypeName: {
      dry: '干性', oily: '油性', combo: '混合',
      sensitive: '敏感', neutral: '中性'
    }
  },

  onLoad() { this.loadReports(); },
  onShow() { this.loadReports(true); },
  onReachBottom() { if (this.data.hasMore && !this.data.loading) this.loadReports(false); },

  async loadReports(reset = true) {
    if (this.data.loading) return;
    
    const userInfo = store.getUserInfo();
    if (!userInfo) return;

    const page = reset ? 1 : this.data.page;
    this.setData({ loading: true, empty: false, page });

    try {
      const res = await api.request('/mp/skin-analysis/reports?user_id=' + userInfo.id + '&page=' + page + '&pageSize=10', 'GET', {}, true, true);
      const d = res.data || res;
      const list = Array.isArray(d.list) ? d.list : [];

      if (reset) {
        this.setData({ reports: list });
      } else {
        this.setData({ reports: [...this.data.reports, ...list] });
      }

      this.setData({
        hasMore: list.length >= 10,
        empty: reset && list.length === 0,
        loading: false,
        page: page + 1,
      });
    } catch (e) {
      console.error('加载历史失败:', e);
      this.setData({ loading: false, hasMore: false });
    }
  },

  // 查看详情
  viewDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/skin-analysis/analysis?reportId=' + id });
  },

  // 跳转电子书
  goEbooks() {
    wx.navigateTo({ url: '/pages/school/ebooks' });
  },

  // 跳转到分析页
  goAnalyze() {
    wx.navigateTo({ url: '/pages/skin-analysis/analysis' });
  }
});
