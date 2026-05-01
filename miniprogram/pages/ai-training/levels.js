// AI智能训练中心 - 统一入口
const api = require('../../utils/api');
const BASE_URL = api.BASE_URL.replace(/\/api\/?$/, '');

// 获取当前登录用户ID（兼容 userInfo.id 和 userId，规范化防浮点字符串）
function getUserId() {
  var uid = wx.getStorageSync('userId') || (wx.getStorageSync('userInfo') || {}).id;
  return uid ? String(Number(uid)) : '';
}

Page({
  data: {
    // ===== 模块1: 话术通关 =====
    levels: [],
    passedCount: 0,
    progressPercent: 0,
    
    // ===== 模块2: 苏格拉底提问训练 =====
    socraticStats: null, // { totalSessions, avgScore, bestGrade }
    
    // ===== UI状态 =====
    activeSection: 'all'  // 'all' | 'coach' | 'socratic'
  },

  onLoad() {
    this.loadLevels();
    this.loadSocraticStats();
  },

  onShow() {
    this.loadLevels();
    this.loadSocraticStats();
  },

  // ========== 话术通关模块 ==========
  
  loadLevels() {
    const userId = getUserId();
    if (!userId) { wx.showToast({ title: '请先登录', icon: 'none' }); return; }
    wx.request({
      url: `${BASE_URL}/api/mp/ai-levels`,
      data: { user_id: userId },
      success: (res) => {
        if (res.data.code === 0) {
          const levels = res.data.data.map(level => {
            let status_class = 'locked';
            if (level.user_passed) status_class = 'passed';
            else if (level.unlocked) status_class = 'current';
            return { ...level, status_class };
          });
          const passedCount = levels.filter(l => l.user_passed).length;
          const progressPercent = levels.length > 0 ? Math.round((passedCount / levels.length) * 100) : 0;
          this.setData({ levels, passedCount, progressPercent });
        } else {
          wx.showToast({ title: res.data.message || '加载关卡失败', icon: 'none' });
        }
      },
      fail: () => {
        wx.showToast({ title: '网络连接失败', icon: 'none' });
      }
    });
  },

  onLevelTap(e) {
    const level = e.currentTarget.dataset.level;
    if (!level.unlocked) {
      wx.showToast({ title: '请先通过上一关', icon: 'none' });
      return;
    }
    wx.navigateTo({
      url: `/pages/ai-training/level-detail?id=${level.id}&name=${encodeURIComponent(level.name)}`
    });
  },

  goToCoach() {
    wx.navigateTo({ url: '/pages/ai-training/coach' });
  },

  goToRankings() {
    wx.navigateTo({ url: '/pages/ai-training/rankings' });
  },

  goToScripts() {
    wx.navigateTo({ url: '/pages/ai-training/scripts' });
  },

  // ========== 苏格拉底模块 ==========
  
  loadSocraticStats() {
    const token = wx.getStorageSync('token');
    if (!token) return;

    wx.request({
      url: `${BASE_URL}/api/mp/socratic/history`,
      method: 'GET',
      header: { 'Authorization': `Bearer ${token}` },
      success: (res) => {
        if (res.data.code === 0 && res.data.data) {
          const sessions = res.data.data.sessions || res.data.data.list || [];
          if (sessions.length > 0) {
            const totalSessions = sessions.length;
            let totalScore = 0;
            let bestScore = 0;
            sessions.forEach(s => {
              const score = s.overall_score || 0;
              totalScore += score;
              if (score > bestScore) bestScore = score;
            });
            this.setData({
              socraticStats: {
                totalSessions,
                avgScore: Math.round(totalScore / totalSessions),
                bestScore,
                bestGrade: this.scoreToGrade(bestScore)
              }
            });
          } else {
            this.setData({ socraticStats: { totalSessions: 0, avgScore: 0, bestScore: 0, bestGrade: '-' } });
          }
        }
      },
      fail: () => {} // 静默失败，不阻塞主界面
    });
  },

  scoreToGrade(score) {
    if (score >= 90) return 'S';
    if (score >= 80) return 'A';
    if (score >= 65) return 'B';
    if (score >= 50) return 'C';
    return 'D';
  },

  goToSocraticList() {
    wx.navigateTo({ url: '/pages/socratic/list' });
  },

  goToSocraticChat() {
    wx.navigateTo({ url: '/pages/socratic/list?start=1' });
  },

  goToSocraticHistory() {
    wx.navigateTo({ url: '/pages/socratic/history' });
  },

  // ========== 导航切换 ==========
  
  switchSection(e) {
    const section = e.currentTarget.dataset.section;
    this.setData({ activeSection: section });
  }
});
