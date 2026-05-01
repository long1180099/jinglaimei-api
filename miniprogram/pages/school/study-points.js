const api = require('../../utils/api');

Page({
  data: {
    loading: true,
    // 积分概览
    totalPoints: 0,
    studyDays: 0,
    level: '初学者',
    levelIcon: '🌱',
    nextLevelPoints: 50,
    progressPercent: 0,
    // 积分明细
    details: [],
    // 最近活动
    recentActivity: [],
    // 排行榜
    activeTab: 'overview',
    ranking: [],
    rankingLoading: false
  },

  onLoad() {
    this.loadData();
  },

  onShow() {
    this.loadData();
  },

  onPullDownRefresh() {
    this.loadData().then(() => wx.stopPullDownRefresh());
  },

  async loadData() {
    this.setData({ loading: true });
    try {
      // 并行加载概览和排行榜
      const [overviewRes, rankingRes] = await Promise.all([
        api.actionLog.getStudyPoints(true),
        api.actionLog.getStudyRanking().catch(() => ({ data: [] }))
      ]);

      const d = overviewRes?.data || overviewRes || {};
      const rankList = rankingRes?.data || rankingRes || [];

      const totalPoints = d.total_points || 0;
      const nextLevel = d.next_level_points || 50;
      let progressPercent = 0;
      if (nextLevel && nextLevel > 0) {
        // 计算当前等级区间的进度
        const levels = [0, 50, 150, 300, 500];
        let currentLevelMin = 0;
        for (let i = levels.length - 1; i >= 0; i--) {
          if (totalPoints >= levels[i]) { currentLevelMin = levels[i]; break; }
        }
        progressPercent = nextLevel > currentLevelMin
          ? Math.min(100, Math.round((totalPoints - currentLevelMin) / (nextLevel - currentLevelMin) * 100))
          : 100;
      }

      this.setData({
        totalPoints: totalPoints,
        studyDays: d.study_days || 0,
        level: d.level || '初学者',
        levelIcon: d.level_icon || '🌱',
        nextLevelPoints: nextLevel,
        progressPercent: progressPercent,
        details: d.details || [],
        recentActivity: (d.recent_activity || []).map(item => ({
          ...item,
          dateStr: this.formatDate(item.date),
          typeLabel: item.type === 'course' ? '视频学习' : item.type === 'log' ? '行动日志' : item.type
        })),
        ranking: (rankList || []).map(r => ({
          ...r,
          nickname: r.nickname || '匿名用户',
          avatar_url: r.avatar_url || ''
        })),
        loading: false
      });
    } catch (e) {
      console.error('加载学习积分失败:', e);
      this.setData({ loading: false });
    }
  },

  formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return m + '月' + day + '日 ' + weekDays[d.getDay()];
  },

  // 切换Tab
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    if (tab === this.data.activeTab) return;
    this.setData({ activeTab: tab });
    if (tab === 'ranking' && this.data.ranking.length === 0) {
      this.loadRanking();
    }
  },

  async loadRanking() {
    this.setData({ rankingLoading: true });
    try {
      const res = await api.actionLog.getStudyRanking();
      const rankList = res?.data || res || [];
      this.setData({
        ranking: (rankList || []).map(r => ({
          ...r,
          nickname: r.nickname || '匿名用户',
          avatar_url: r.avatar_url || ''
        })),
        rankingLoading: false
      });
    } catch (e) {
      this.setData({ rankingLoading: false });
    }
  },

  // 查看用户详情（预留）
  viewUser(e) {
    // 未来可跳转到用户主页
  },

  onShareAppMessage() {
    return {
      title: '静莱美学习积分 - 学习成长，成就更好的自己',
      path: '/pages/school/study-points'
    };
  }
});
