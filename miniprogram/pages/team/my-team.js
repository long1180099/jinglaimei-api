const api = require('../../utils/api');
const store = require('../../utils/store');
const util = require('../../utils/util');

Page({
  data: {
    team: { total: 0, direct: 0, indirect: 0 },
    inviteCode: '',
    inviteLink: '',
    activeTab: 'direct',
    members: [],
    ranking: [],
    loading: false,
    loaded: false,
    // 收益相关
    overview: {},
    recentRecords: [],
    showAmount: true,
    levelText: '会员',
    levelColor: '#999',
    nextLevelNeed: '0.00',
    incomeLoaded: false,
    // 全局排行榜模式（从首页"完整榜单"进入时激活）
    showGlobalRanking: false,
    globalRanking: []
  },

  onLoad() {
    this.checkAndLoad();
  },

  onShow() {
    // 检查是否从首页"完整榜单"跳转过来
    var showGR = wx.getStorageSync('showGlobalRanking');
    if (showGR === '1') {
      wx.removeStorageSync('showGlobalRanking');
      this.setData({ showGlobalRanking: true });
      this.loadGlobalRanking();
      return;
    }
    this.setData({ showGlobalRanking: false });
    this.checkAndLoad();
    this.loadIncomeData();
  },

  onPullDownRefresh() {
    var that = this;
    Promise.all([that.loadData(), that.loadIncomeData()]).then(function() {
      wx.stopPullDownRefresh();
    });
  },

  onShareAppMessage() {
    return {
      title: '加入静莱美，一起代理好物',
      path: '/pages/index/index?inviteCode=' + (this.data.inviteCode || '')
    };
  },

  // 检查登录状态后加载数据
  checkAndLoad() {
    if (!util.checkLogin()) {
      wx.showModal({
        title: '提示',
        content: '请先登录后查看团队管理',
        confirmText: '去登录',
        cancelText: '返回',
        success: function(res) {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/login/login' });
          } else {
            wx.switchTab({ url: '/pages/index/index' });
          }
        }
      });
      this.setData({ loaded: true, loading: false });
      return;
    }
    this.loadData();
  },

  async loadData() {
    if (this.data.loading) return;
    var that = this;
    try {
      that.setData({ loading: true });
      var results = await Promise.all([
        api.team.getMyTeam(),
        api.team.getRanking()
      ]);
      var teamRes = results[0];
      var rankRes = results[1];
      var team = teamRes.data || {};
      var userInfo = store.getUserInfo();
      var inviteCode = team.invite_code || (userInfo ? String(userInfo.id) : '');
      var inviteLink = 'https://jinglaimei.com/invite/' + inviteCode;

      var members = (team.members || []).map(function(m) {
        return {
          id: m.id,
          avatar_url: m.avatar_url,
          nickname: m.nickname,
          created_at: m.created_at,
          agent_level: m.agent_level,
          sub_count: m.sub_count,
          levelText: util.agentLevelText(m.agent_level),
          levelColor: util.agentLevelColor(m.agent_level),
          timeText: util.timeAgo(m.created_at)
        };
      });

      var ranking = (rankRes.data || []).map(function(r, i) {
        return {
          id: r.id,
          avatar_url: r.avatar_url,
          nickname: r.nickname,
          team_count: r.team_count,
          total_income: r.total_income,
          rank: i + 1,
          levelText: util.agentLevelText(r.agent_level),
          levelColor: util.agentLevelColor(r.agent_level)
        };
      });

      that.setData({
        team: team,
        inviteCode: inviteCode,
        inviteLink: inviteLink,
        members: members,
        ranking: ranking,
        loading: false,
        loaded: true
      });
    } catch (e) {
      console.error('加载团队数据失败:', e);
      var errMsg = (e && e.message) ? e.message : '网络异常，请重试';
      if (errMsg.indexOf('500') > -1 || errMsg.indexOf('内部') > -1) {
        errMsg = '服务器繁忙，请稍后重试';
      }
      wx.showToast({ title: errMsg, icon: 'none' });
      that.setData({ loading: false, loaded: true });
    }
  },

  async loadIncomeData() {
    var that = this;
    try {
      var results = await Promise.all([
        api.income.getOverview(),
        api.income.getRecords({ page: 1, pageSize: 5 })
      ]);
      var overview = results[0].data || {};
      var recentRecords = (results[1].data && results[1].data.list ? results[1].data.list : (results[1].data || [])).map(function(r) {
        var isDirect = (r.type == 1);
        return {
          id: r.id,
          type: r.type,
          amount: r.amount,
          created_at: r.created_at,
          // 预计算样式字段，避免WXML中使用三元表达式
          _typeClass: isDirect ? 'type-direct' : 'type-indirect',
          _typeIcon: isDirect ? '●' : '○',
          _typeName: isDirect ? '直接收益' : '团队收益',
          _amountClass: isDirect ? 'amt-direct' : 'amt-indirect'
        };
      });

      var userInfo = store.getUserInfo();
      var level = userInfo ? (userInfo.agent_level || userInfo.agentLevel) : 1;
      var levelText = util.agentLevelText(level);
      var levelColor = util.agentLevelColor(level);
      var thresholds = [0, 0, 5000, 50000, 200000];
      var progress = level >= 5 ? 100 : Math.min(100, ((overview.totalIncome || 0) / (thresholds[level] || 1)) * 100);
      var nextNeed = level >= 5 ? '已满级' : util.formatMoney(Math.max(0, (thresholds[level] || 0) - (overview.totalIncome || 0)));

      that.setData({
        overview: overview,
        recentRecords: recentRecords,
        levelText: levelText,
        levelColor: levelColor,
        nextLevelNeed: nextNeed,
        incomeLoaded: true
      });
    } catch (e) {
      // 软认证401(SOFT_AUTH_401)时静默忽略——收益是辅助信息，不应因token过期影响团队主数据展示
      if (e && e.message === 'SOFT_AUTH_401') return;
      console.error('加载收益数据失败:', e);
    }
  },

  switchTab(e) {
    var tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
    if (tab === 'income' && !this.data.incomeLoaded) {
      this.loadIncomeData();
    }
  },

  copyCode() {
    util.copyText(this.data.inviteCode);
  },

  copyLink() {
    util.copyText(this.data.inviteLink);
  },

  sharePoster() {
    wx.showModal({
      title: '分享邀请',
      content: '邀请码: ' + this.data.inviteCode + '\n邀请链接已复制到剪贴板，可发送给好友！',
      showCancel: false,
      confirmText: '好的',
      success: function() {
        util.copyText(this.inviteLink);
      }.bind(this)
    });
  },

  goTree() {
    wx.navigateTo({ url: '/pages/team/tree' });
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

  // 加载系统全局排行榜（从首页"完整榜单"进入时调用）
  loadGlobalRanking() {
    var that = this;
    that.setData({ loading: true });
    api.team.getPublicRanking(50).then(function(res) {
      var rankData = res.data || [];
      if (!Array.isArray(rankData)) { rankData = []; }
      var list = rankData.map(function(r, idx) {
        return {
          id: r.id,
          avatar_url: r.avatar_url,
          nickname: r.nickname || r.username || r.real_name || '匿名用户',
          team_count: r.team_count || 0,
          total_income: parseFloat(r.total_income || 0).toFixed(2),
          rank: idx + 1,
          levelText: util.agentLevelText(r.agent_level),
          levelColor: util.agentLevelColor(r.agent_level)
        };
      });
      that.setData({ globalRanking: list, loading: false, loaded: true });
    }).catch(function(e) {
      console.error('加载全局排行失败:', e);
      that.setData({ loading: false, loaded: true });
    });
  },

  // 返回个人团队视图
  backToMyTeam() {
    this.setData({ showGlobalRanking: false, globalRanking: [] });
    this.checkAndLoad();
    this.loadIncomeData();
  }
});
