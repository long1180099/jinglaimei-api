// AI销售学院 - 首页（苏格拉底训练升级版）
const api = require('../../utils/api');
var _fullUrl = api.BASE_URL || 'https://api.jinglaimei.com/api';
var BASE_URL = _fullUrl.replace(/\/api\/?$/, '');

Page({
  data: {
    // 基础
    loaded: false,
    scenarios: [],
    categories: [],
    questionTypes: null,
    currentCategory: 'all',

    // ===== AI学院新增 ======
    // 仪表盘数据
    dashboard: null,
    
    // 等级信息
    levelInfo: null,
    
    // 学习路径
    learningPaths: [],
    
    // 成就展示（最新解锁的前4个）
    recentAchievements: [],
    achievementStats: { total: 0, unlocked: 0 },
    
    // 每日任务
    dailyTasks: [],

    // 推荐场景
    recommendation: null,

    // 能力维度数据（用于能力环）
    abilityData: { question: 0, listening: 0, guiding: 0, timing: 0, depth: 0 },

    // 弹窗状态
    showPrinciple: false,
    showTypesModal: false,

    // 映射
    personalityNames: {
      red: '红色(热情)', blue: '蓝色(理性)', yellow: '黄色(直接)', green: '绿色(温和)'
    },
    difficultyNames: {
      easy: '入门', medium: '进阶', hard: '高级'
    },

    // 原理数据
    principleList: [
      { icon: '🔍', type_name: '澄清式提问', color: '#1890ff', purpose: '确认理解、明确需求', example: '您说的"没效果"，具体是指哪方面没达到预期？' },
      { icon: '💭', type_name: '假设式提问', color: '#722ed1', purpose: '探索可能性、测试意愿', example: '如果有一种方法能让您每天只需3分钟，您愿意试试吗？' },
      { icon: '🔄', type_name: '反向式提问', color: '#e94560', purpose: '挑战固有思维、引发思考', example: '您现在用的产品，解决了您刚才提到的问题吗？' },
      { icon: '➡️', type_name: '引导式提问', color: '#52c41a', purpose: '引导方向、推进话题', example: '那接下来您想了解哪方面的信息？' },
      { icon: '✅', type_name: '总结式提问', color: '#faad14', purpose: '确认共识、推动决策', example: '所以我们是不是都同意，关键在于找到既有效又省时的方案？' }
    ],

    // 稀有度颜色映射
    rarityColors: {
      common: '#999', rare: '#1890ff', epic: '#b37feb', legendary: '#f5222d'
    },
  },

  onLoad() {
    this.loadDashboard();
    this.loadScenarios();
    this.loadQuestionTypes();
  },

  onShow() {
    if (this.data.loaded) {
      this.loadScenarios();
      this.loadDashboard(); // 刷新学院数据
    }
  },

  onPullDownRefresh() {
    Promise.all([
      this.loadDashboard(),
      this.loadScenarios()
    ]).then(() => wx.stopPullDownRefresh());
  },

  // ===== 加载AI学院仪表盘数据 =====
  loadDashboard() {
    var token = wx.getStorageSync('token');

    // 始终设置默认占位数据，确保UI始终显示
    if (!token) {
      this.setData({
        levelInfo: { level: 1, levelName: '见习学员', xp: 0, nextLevelXp: 100, progress: 0 },
        achievementStats: { total: 22, unlocked: 0, progress: 0 },
        dailyTaskSummary: { completedCount: 0, totalCount: 3, allCompleted: false },
        dailyTasks: [],
        learningPaths: [],
        recentAchievements: [],
        loaded: true
      });
      return;
    }

    wx.request({
      url: BASE_URL + '/api/mp/socratic/academy/dashboard',
      method: 'GET',
      header: { 'Authorization': 'Bearer ' + token },
      success: (res) => {
        if (res.data.code === 0) {
          var d = res.data.data;
          this.setData({
            dashboard: d.summary,
            levelInfo: d.level,
            achievementStats: d.achievements,
            recommendation: d.recommendation,
            dailyTaskSummary: d.dailyTasks,
          });
          // 从趋势数据计算最近一次的能力维度
          if (d.recentTrend && d.recentTrend.length > 0) {
            var last = d.recentTrend[d.recentTrend.length - 1];
            // 使用平均分作为当前能力的近似值
            this.setData({
              'abilityData.question': Math.round(d.level && d.level.avgScore ? Math.min(100, d.level.avgScore + 5) : 60),
              'abilityData.listening': Math.round(d.level && d.level.avgScore ? Math.min(100, d.level.avgScore - 2) : 55),
              'abilityData.guiding': Math.round(d.level && d.level.avgScore ? d.level.avgScore : 58),
              'abilityData.timing': Math.round(d.level && d.level.avgScore ? Math.min(100, d.level.avgScore - 8) : 52),
              'abilityData.depth': Math.round(d.level && d.level.avgScore ? d.level.avgScore + 3 : 62),
            });
          }
          // 加载其他模块数据
          this.loadLearningPaths();
          this.loadAchievements();
          this.loadDailyTasks();
        }
      }
    });

    // 独立加载等级信息（含完整配置）
    wx.request({
      url: BASE_URL + '/api/mp/socratic/academy/level-info',
      method: 'GET',
      header: { 'Authorization': 'Bearer ' + token },
      success: (res) => {
        if (res.data.code === 0) {
          this.setData({ levelInfo: res.data.data });
        }
      }
    });
  },

  // ===== 加载学习路径 =====
  loadLearningPaths() {
    var token = wx.getStorageSync('token');
    if (!token) {
      this.setData({ learningPaths: [] });
      return;
    }

    wx.request({
      url: BASE_URL + '/api/mp/socratic/academy/paths',
      method: 'GET',
      header: { 'Authorization': 'Bearer ' + token },
      success: (res) => {
        if (res.data.code === 0) {
          this.setData({ learningPaths: res.data.data.list || [] });
        }
      }
    });
  },

  // ===== 加载成就展示 =====
  loadAchievements() {
    var token = wx.getStorageSync('token');
    if (!token) return;

    wx.request({
      url: BASE_URL + '/api/mp/socratic/academy/achievements',
      method: 'GET',
      header: { 'Authorization': 'Bearer ' + token },
      success: (res) => {
        if (res.data.code === 0) {
          // 只显示已解锁的成就（最新的前6个）
          var unlocked = (res.data.data.list || []).filter(function(a) { return a.unlocked; });
          this.setData({ 
            recentAchievements: unlocked.slice(0, 6),
            achievementStats: res.data.data.stats || this.data.achievementStats
          });
        }
      }
    });
  },

  // ===== 加载每日任务 =====
  loadDailyTasks() {
    var token = wx.getStorageSync('token');
    if (!token) return;

    wx.request({
      url: BASE_URL + '/api/mp/socratic/academy/daily-tasks',
      method: 'GET',
      header: { 'Authorization': 'Bearer ' + token },
      success: (res) => {
        if (res.data.code === 0) {
          this.setData({ dailyTasks: res.data.data.list || [] });
        }
      }
    });
  },

  // 领取任务奖励
  claimReward(e) {
    var key = e.currentTarget.dataset.key;
    var token = wx.getStorageSync('token');
    if (!token) return;

    wx.request({
      url: BASE_URL + '/api/mp/socratic/academy/daily-tasks/' + key + '/claim',
      method: 'POST',
      header: { 'Authorization': 'Bearer ' + token },
      success: (res) => {
        if (res.data.code === 0) {
          wx.showToast({ title: '+' + res.data.data.xpEarned + ' XP', icon: 'success' });
          this.loadDailyTasks();
          this.loadDashboard(); // 刷新经验值和等级
        } else {
          wx.showToast({ title: res.data.message || '领取失败', icon: 'none' });
        }
      }
    });
  },

  // 开始学习路径
  startPath(e) {
    var id = e.currentTarget.dataset.id;
    var token = wx.getStorageSync('token');
    if (!token) return;

    wx.request({
      url: BASE_URL + '/api/mp/socratic/academy/paths/' + id + '/start',
      method: 'POST',
      header: { 'Authorization': 'Bearer ' + token },
      success: (res) => {
        if (res.data.code === 0) {
          wx.showToast({ title: '已加入学习路径', icon: 'success' });
          this.loadLearningPaths();
        } else {
          wx.showToast({ title: res.data.message || '加入失败', icon: 'none' });
        }
      }
    });
  },

  // 加载场景列表
  loadScenarios() {
    let userId = wx.getStorageSync('userId');
    if (!userId) {
      const userInfo = wx.getStorageSync('userInfo');
      if (userInfo && userInfo.id) userId = userInfo.id;
    }
    const token = wx.getStorageSync('token');

    if (!userId || !token) {
      this.setData({ loaded: true });
      return;
    }

    return new Promise((resolve) => {
      const params = {};
      if (this.data.currentCategory !== 'all') {
        params.category = this.data.currentCategory;
      }

      wx.request({
        url: BASE_URL + '/api/mp/socratic/scenarios',
        method: 'GET',
        data: params,
        header: { 'Authorization': `Bearer ${token}` },
        success: (res) => {
          if (res.data.code === 0) {
            const data = res.data.data;
            this.setData({
              loaded: true,
              scenarios: data.list || [],
              categories: data.categories || [],
              questionTypes: data.types || this.data.questionTypes
            });
          }
          this.setData({ loaded: true });
          resolve();
        },
        fail: () => {
          this.setData({ loaded: true });
          resolve();
        }
      });
    });
  },

  // 加载提问类型说明
  loadQuestionTypes() {
    const token = wx.getStorageSync('token');
    if (!token) return;
    
    wx.request({
      url: `${BASE_URL}/api/mp/socratic/question-types`,
      method: 'GET',
      header: { 'Authorization': `Bearer ${wx.getStorageSync('token')}` },
      success: (res) => {
        if (res.data.code === 0 && res.data.data?.types) {
          this.setData({ questionTypes: res.data.data.types });
        }
      }
    });
  },

  switchCategory(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ currentCategory: key }, () => this.loadScenarios());
  },

  goChat(e) {
    const scenario = e.currentTarget.dataset.scenario;
    wx.navigateTo({
      url: `/pages/socratic/chat?scenario_id=${scenario.id}&name=${encodeURIComponent(scenario.name)}&personality=${scenario.personality_type || ''}`
    });
  },

  goHistory() {
    wx.navigateTo({ url: '/pages/socratic/history' });
  },

  goAchievementList() {
    wx.showToast({ title: '成就详情开发中...', icon: 'none' });
  },

  showPrincipleDetail() { this.setData({ showPrinciple: true }); },
  hidePrincipleDetail() { this.setData({ showPrinciple: false }); },
  showTypesDetail() { this.setData({ showTypesModal: true }); },
  hideTypesDetail() { this.setData({ showTypesModal: false }); },

  onShareAppMessage() {
    return { title: 'AI销售学院 - 苏格拉底式提问训练', path: '/pages/socratic/list' };
  }
});
