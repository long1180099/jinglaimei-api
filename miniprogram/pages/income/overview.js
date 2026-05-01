const api = require('../../utils/api');
const store = require('../../utils/store');
const util = require('../../utils/util');

Page({
  data: {
    overview: {},
    recentRecords: [],
    showAmount: true,
    levelText: '会员',
    levelColor: '#999',
    levelProgress: 0,
    nextLevelNeed: '0.00',
    loading: true,
    loadError: false,
    teamTotal: 0
  },

  onLoad() {
    this.loadData();
  },

  onShow() {
    this.loadData();
    this.updateCartBadge();
  },

  onPullDownRefresh() {
    this.loadData().then(() => wx.stopPullDownRefresh());
  },

  updateCartBadge() {
    const count = store.getCartCount();
    if (count > 0) {
      wx.setTabBarBadge({ index: 1, text: count > 99 ? '99+' : String(count) });
    } else {
      wx.removeTabBarBadge({ index: 1 });
    }
  },

  async loadData() {
    try {
      this.setData({ loading: true, loadError: false });
      const [overviewRes, recordsRes] = await Promise.all([
        api.income.getOverview(),
        api.income.getRecords({ page: 1, pageSize: 5 })
      ]);
      const overview = overviewRes.data || {};
      const recentRecords = (recordsRes.data?.list || recordsRes.data || []).map(r => ({
        ...r,
        timeText: util.timeAgo(r.created_at)
      }));
      this.setData({ overview, recentRecords, loading: false });
      this.updateLevelInfo(overview);
      this.loadTeamTotal();
    } catch (e) {
      console.error('加载收益数据失败:', e);
      this.setData({ loading: false, loadError: true });
    }
  },

  updateLevelInfo(overview) {
    const userInfo = store.getUserInfo();
    const level = userInfo ? (userInfo.agent_level || userInfo.agentLevel) : 1;
    const levelText = util.agentLevelText(level);
    const levelColor = util.agentLevelColor(level);
    const thresholds = [0, 0, 5000, 50000, 200000];
    const progress = level >= 5 ? 100 : Math.min(100, ((overview.totalIncome || 0) / (thresholds[level] || 1)) * 100);
    const nextNeed = level >= 5 ? '已满级' : util.formatMoney(Math.max(0, (thresholds[level] || 0) - (overview.totalIncome || 0)));
    this.setData({ levelText, levelColor, levelProgress: progress, nextLevelNeed: nextNeed });
  },

  // 重新加载
  retryLoad() {
    this.loadData();
  },

  toggleAmount() {
    this.setData({ showAmount: !this.data.showAmount });
  },

  goWithdraw() {
    if (!util.checkLogin()) { wx.showToast({ title: '请先登录', icon: 'none' }); return; }
    wx.navigateTo({ url: '/pages/income/withdraw' });
  },

  goRecords() {
    wx.navigateTo({ url: '/pages/income/records' });
  },

  goWithdrawals() {
    wx.navigateTo({ url: '/pages/income/records?type=withdrawals' });
  },

  // 加载团队总人数
  async loadTeamTotal() {
    try {
      const res = await api.team.getMyTeam();
      const team = res.data || {};
      this.setData({ teamTotal: team.total || 0 });
    } catch (e) {
      // 静默处理
    }
  },

  goTeam() {
    if (!util.checkLogin()) return;
    wx.navigateTo({ url: '/pages/team/tree' });
  },

  onShareAppMessage() {
    return {
      title: '静莱美 - 代理创业好平台',
      path: '/pages/index/index'
    };
  }
});
