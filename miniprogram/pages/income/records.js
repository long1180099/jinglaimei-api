const api = require('../../utils/api');
const util = require('../../utils/util');

Page({
  data: {
    activeTab: 'income',
    records: [],
    withdrawals: [],
    hasMore: true,
    page: 1,
    loading: false,
    refreshing: false
  },

  onLoad(options) {
    if (options && options.type === 'withdrawals') {
      this.setData({ activeTab: 'withdrawals' });
    }
    this.loadData();
  },

  onShow() {
    // 非TabBar页面，清除tabBar选中态
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.setData({ refreshing: true, page: 1 });
    this.loadData().then(() => wx.stopPullDownRefresh());
  },

  // 上拉加载更多
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMore();
    }
  },

  switchTab(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab, page: 1, hasMore: true });
    this.loadData();
  },

  async loadData() {
    if (this.data.loading) return;
    this.setData({ loading: true });
    try {
      if (this.data.activeTab === 'income') {
        const res = await api.income.getRecords({ page: 1, pageSize: 20 });
        const list = res.data?.list || res.data || [];
        this.setData({
          records: list.map(r => ({ ...r, timeText: util.timeAgo(r.created_at) })),
          hasMore: list.length >= 20,
          loading: false,
          refreshing: false
        });
      } else {
        const res = await api.income.getWithdrawals({ page: 1, pageSize: 20 });
        const list = res.data?.list || res.data || [];
        this.setData({
          withdrawals: list.map(item => ({
            ...item,
            statusText: { 0: '处理中', 1: '已通过', 2: '已拒绝' }[item.status] || '未知',
            statusColor: { 0: '#ff9900', 1: '#52c41a', 2: '#ff4d4f' }[item.status] || '#999',
            timeText: util.timeAgo(item.created_at)
          })),
          hasMore: list.length >= 20,
          loading: false,
          refreshing: false
        });
      }
    } catch (e) {
      console.error('加载记录失败:', e);
      this.setData({ loading: false, refreshing: false });
    }
  },

  async loadMore() {
    const nextPage = this.data.page + 1;
    this.setData({ loading: true });
    try {
      if (this.data.activeTab === 'income') {
        const res = await api.income.getRecords({ page: nextPage, pageSize: 20 });
        const list = res.data?.list || res.data || [];
        this.setData({
          records: [...this.data.records, ...list.map(r => ({ ...r, timeText: util.timeAgo(r.created_at) }))],
          page: nextPage,
          hasMore: list.length >= 20,
          loading: false
        });
      } else {
        const res = await api.income.getWithdrawals({ page: nextPage, pageSize: 20 });
        const list = res.data?.list || res.data || [];
        this.setData({
          withdrawals: [...this.data.withdrawals, ...list.map(item => ({
            ...item,
            statusText: { 0: '处理中', 1: '已通过', 2: '已拒绝' }[item.status] || '未知',
            statusColor: { 0: '#ff9900', 1: '#52c41a', 2: '#ff4d4f' }[item.status] || '#999',
            timeText: util.timeAgo(item.created_at)
          }))],
          page: nextPage,
          hasMore: list.length >= 20,
          loading: false
        });
      }
    } catch (e) {
      this.setData({ loading: false });
    }
  }
});
