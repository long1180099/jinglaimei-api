const util = require('../../utils/util');
const store = require('../../utils/store');

Page({
  data: {
    studyPoints: 0,
    studyDays: 0,
    // 五大功能板块
    modules: [
      {
        key: 'courses',
        icon: '🎬',
        title: '视频学习',
        desc: '新手入门 · 进阶课程 · 实战案例 · 系列课',
        color: '#e94560',
        bgColor: 'rgba(233, 69, 96, 0.08)',
        url: '/pages/videos/list'
      },
      {
        key: 'ebooks',
        icon: '📕',
        title: '电子书',
        desc: '在线阅读 · 精选资料',
        color: '#1a1a2e',
        bgColor: 'rgba(26, 26, 46, 0.08)',
        url: '/pages/school/ebooks'
      },
      {
        key: 'actionlog',
        icon: '📋',
        title: '行动日志',
        desc: '年度目标 · 每日记录 · 承诺打卡',
        color: '#52c41a',
        bgColor: 'rgba(82, 196, 26, 0.08)',
        url: '/pages/action-log/index'
      },
      {
        key: 'personality',
        icon: '🎨',
        title: '成交话术',
        desc: '性格色彩 · 场景话术 · 精准成交',
        color: '#722ed1',
        bgColor: 'rgba(114, 46, 209, 0.08)',
        url: '/pages/personality/index'
      },
      {
        key: 'points',
        icon: '🏆',
        title: '学习积分',
        desc: '积分累计 · 学习排行 · 兑换奖励',
        color: '#fa8c16',
        bgColor: 'rgba(250, 140, 22, 0.08)',
        url: '/pages/school/study-points'
      },
      {
        key: 'aitraining',
        icon: '🔥',
        title: 'AI话术通关',
        desc: '闯关考核 · 6大关卡 · 话术达人',
        color: '#e94560',
        bgColor: 'rgba(233, 69, 96, 0.12)',
        url: '/pages/ai-training/levels'
      },
      {
        key: 'aicoach',
        icon: '🤖',
        title: 'AI话术教练',
        desc: '模拟实战 · AI评分 · 实时反馈',
        color: '#722ed1',
        bgColor: 'rgba(114, 46, 209, 0.12)',
        url: '/pages/ai-training/coach'
      },
      {
        key: 'socratic',
        icon: '🎯',
        title: '苏格拉底提问',
        desc: 'AI学院 · 等级成就 · 每日训练',
        color: '#13c2c2',
        bgColor: 'rgba(19, 194, 194, 0.10)',
        url: '/pages/socratic/list'
      },
      {
        key: 'poster',
        icon: '✨',
        title: 'AI营销海报',
        desc: '玫小可金句 · 一键出图 · 朋友圈素材',
        color: '#FF6B9D',
        bgColor: 'rgba(255, 107, 157, 0.12)',
        url: '/pages/poster/poster'
      }
    ]
  },

  onLoad() {},

  onShow() {
    this.loadStudyStats();
  },

  onPullDownRefresh() {
    this.loadStudyStats().then(() => wx.stopPullDownRefresh());
  },

  // 加载学习统计数据（静默加载，失败不弹提示）
  async loadStudyStats() {
    try {
      const api = require('../../utils/api');
      // 传入 true 启用静默模式，即使接口返回错误也不弹出"请求失败"
      var pointsRes = await api.actionLog.getStudyPoints(true).catch(function() { return null; });
      if (!pointsRes) return;
      // 兼容 res.data 或直接数据格式
      var d = pointsRes.data || pointsRes;
      if (d.total_points !== undefined || d.study_days !== undefined) {
        this.setData({
          studyPoints: d.total_points || 0,
          studyDays: d.study_days || 0
        });
      }
    } catch (e) {
      // 积分可选数据，静默处理
    }
  },

  // 点击板块入口
  goModule(e) {
    const module = e.currentTarget.dataset.module;
    if (!module) return;

    // 需要登录的功能
    const needLogin = ['actionlog', 'points'];
    if (needLogin.includes(module.key) && !util.checkLogin()) { wx.showToast({ title: '请先登录', icon: 'none' }); return; }

    wx.navigateTo({ url: module.url });
  },

  // 快速进入视频课程（沿用原有逻辑）
  goMyCourses() {
    wx.navigateTo({ url: '/pages/school/my-courses' });
  },

  goEbooks() {
    wx.navigateTo({ url: '/pages/school/ebooks' });
  },

  onShareAppMessage() {
    return {
      title: '静莱美商学院 - 学习成长，成就更好的自己',
      path: '/pages/school/list'
    };
  }
});
