const api = require('../../utils/api');
const util = require('../../utils/util');

Page({
  data: {
    activeTab: 'overview',
    tabs: [
      { key: 'overview', label: '性格速查', icon: '🎨' },
      { key: 'scripts', label: '话术库', icon: '💬' },
      { key: 'favorites', label: '我的收藏', icon: '⭐' }
    ],
    personalities: [],
    scripts: [],
    favorites: [],
    activeType: '',
    activeScene: '',
    scenes: ['破冰', '产品推荐', '逼单', '异议处理'],
    searchKeyword: '',
    showQuickScan: true,
    showScriptDetail: false,
    currentScript: null,
    loading: false,

    // ===== AI功能 =====
    aiInsights: {},          // 性格AI深度解读 { red: {...}, blue: {...} }
    aiInsightLoading: false,  // AI解读加载状态
    aiGenerating: false,     // AI话术生成中
    showAiInsight: false,    // 是否展示AI深度解读面板
    currentAiInsight: null,  // 当前查看的AI解读
  },

  onLoad() {
    this.loadOverview();
  },

  switchTab(e) {
    var key = e.currentTarget.dataset.key;
    this.setData({ activeTab: key });
    switch (key) {
      case 'overview': this.loadOverview(); break;
      case 'scripts': this.loadScripts(); break;
      case 'favorites': this.loadFavorites(); break;
    }
  },

  toggleQuickScan() {
    this.setData({ showQuickScan: !this.data.showQuickScan });
  },

  // ===== 性格速查（含AI解读） =====

  async loadOverview() {
    this.setData({ loading: true });
    try {
      const res = await api.personality.getOverview();
      var personalities = res.data || [];
      var aiInsights = res.ai_insights || {};
      this.setData({
        personalities: personalities,
        aiInsights: aiInsights,
        loading: false
      });
    } catch (e) {
      this.setData({ loading: false });
    }
  },

  // 触发AI深度解读（按需）
  async fetchAiInsight() {
    if (this.data.aiInsightLoading) return;
    if (Object.keys(this.data.aiInsights).length > 0) {
      // 已有AI数据，直接展开
      this.setData({ showAiInsight: true });
      return;
    }
    this.setData({ aiInsightLoading: true, showAiInsight: true });
    try {
      const res = await api.personality.getOverview({ ai_insight: 'true' });
      this.setData({
        aiInsights: res.ai_insights || {},
        aiInsightLoading: false
      });
    } catch (e) {
      this.setData({ aiInsightLoading: false });
      wx.showToast({ title: 'AI解读加载失败', icon: 'none' });
    }
  },

  // 查看某个性格的AI解读
  viewAiDetail(e) {
    var type = e.currentTarget.dataset.type;
    var insight = this.data.aiInsights[type];
    if (insight) {
      this.setData({ currentAiInsight: { type: type, ...insight } });
    } else {
      wx.showToast({ title: '该性格暂无AI解读，请点击"AI深度分析"生成', icon: 'none' });
    }
  },

  closeAiDetail() {
    this.setData({ currentAiInsight: null });
  },

  // ===== 话术库（含AI生成） =====

  async loadScripts() {
    this.setData({ loading: true });
    try {
      const params = {};
      if (this.data.activeType) params.type = this.data.activeType;
      if (this.data.activeScene) params.scene = this.data.activeScene;
      const res = await api.personality.getScripts(params);
      this.setData({ scripts: res.data || [], loading: false });
    } catch (e) {
      this.setData({ loading: false });
    }
  },

  // AI生成话术
  async generateAiScript() {
    if (!this.data.activeType) {
      wx.showToast({ title: '请先选择性格类型', icon: 'none' });
      return;
    }
    if (!this.data.activeScene) {
      wx.showToast({ title: '请先选择场景', icon: 'none' });
      return;
    }
    if (this.data.aiGenerating) return;

    this.setData({ aiGenerating: true });
    wx.showLoading({ title: 'AI正在创作话术...' });

    try {
      const res = await api.personality.generateScript({
        personality_type: this.data.activeType,
        scene: this.data.activeScene,
        keyword: this.data.searchKeyword || undefined
      });

      wx.hideLoading();

      if (res.data) {
        const newScript = {
          ...res.data,
          id: Date.now(),
          is_ai_generated: true,
          isFavorited: false
        };
        // 插到列表头部
        this.setData({
          scripts: [newScript, ...this.data.scripts],
          aiGenerating: false
        });
        wx.showToast({ title: '✨ AI话术已生成', icon: 'success' });
      } else {
        this.setData({ aiGenerating: false });
      }
    } catch (e) {
      wx.hideLoading();
      this.setData({ aiGenerating: false });
      wx.showToast({ title: 'AI生成失败，稍后重试', icon: 'none' });
    }
  },

  async loadFavorites() {
    this.setData({ loading: true });
    try {
      const res = await api.personality.getScripts({});
      const allScripts = res.data || [];
      const favRes = await api.personality.getMyFavorites();
      const favIds = (favRes.data || []).map(f => f.script_id);
      const favorites = allScripts.filter(s => favIds.includes(s.id));
      this.setData({ favorites, loading: false });
    } catch (e) {
      this.setData({ loading: false });
    }
  },

  filterByType(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ activeType: type === this.data.activeType ? '' : type });
    this.loadScripts();
  },

  filterByScene(e) {
    const scene = e.currentTarget.dataset.scene;
    this.setData({ activeScene: scene === this.data.activeScene ? '' : scene });
    this.loadScripts();
  },

  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value });
  },

  openScriptDetail(e) {
    const script = e.currentTarget.dataset.script;
    this.setData({ currentScript: script, showScriptDetail: true });
  },

  closeScriptDetail() {
    this.setData({ showScriptDetail: false, currentScript: null });
  },

  async toggleFavorite(e) {
    const id = e.currentTarget.dataset.id;
    try {
      const res = await api.personality.toggleFavorite(id);
      const favorited = res.data?.favorited;
      wx.showToast({
        title: favorited ? '已收藏' : '已取消收藏',
        icon: 'none'
      });
      // 刷新当前列表
      if (this.data.activeTab === 'scripts') {
        this.loadScripts();
      } else if (this.data.activeTab === 'favorites') {
        this.loadFavorites();
      }
    } catch (e) {
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  },

  copyScript(e) {
    const content = e.currentTarget.dataset.content || '';
    wx.setClipboardData({
      data: content,
      success: () => {
        wx.showToast({ title: '话术已复制', icon: 'success' });
      }
    });
  },

  goFromOverview(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ activeTab: 'scripts', activeType: type, activeScene: '' });
    this.loadScripts();
  },

  onShareAppMessage() {
    return { title: '性格色彩成交话术 - 静莱美商学院', path: '/pages/personality/index' };
  }
});
