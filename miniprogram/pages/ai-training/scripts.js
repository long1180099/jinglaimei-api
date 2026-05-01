// pages/ai-training/scripts.js
const api = require('../../utils/api');
const BASE_URL = api.BASE_URL.replace('/api', '');

Page({
  data: {
    categories: [
      { name: '全部', icon: '📋' },
      { name: '开场白', icon: '👋' },
      { name: '需求挖掘', icon: '🔍' },
      { name: '异议处理', icon: '🛡️' },
      { name: '成交促成', icon: '💰' },
      { name: '复购引导', icon: '🔄' },
      { name: '推广话术', icon: '🚀' }
    ],
    activeCategory: '全部',
    activePersonality: '',
    scripts: [],
    filteredScripts: [],
    expandedId: null
  },

  onLoad() {
    this.loadScripts();
  },

  loadScripts() {
    wx.request({
      url: `${BASE_URL}/api/ai-training/scripts`,
      success: (res) => {
        if (res.data.code === 0) {
          this.setData({ scripts: res.data.data, filteredScripts: res.data.data });
        }
      }
    });
  },

  switchCategory(e) {
    const name = e.currentTarget.dataset.name;
    this.setData({ activeCategory: name });
    this.filterScripts();
  },

  filterPersonality(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ activePersonality: type });
    this.filterScripts();
  },

  filterScripts() {
    const { scripts, activeCategory, activePersonality } = this.data;
    let filtered = scripts;

    if (activeCategory !== '全部') {
      filtered = filtered.filter(s => s.category === activeCategory);
    }
    if (activePersonality) {
      filtered = filtered.filter(s => s.personality_type === activePersonality);
    }
    this.setData({ filteredScripts: filtered, expandedId: null });
  },

  toggleScript(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ expandedId: this.data.expandedId === id ? null : id });
  }
});
