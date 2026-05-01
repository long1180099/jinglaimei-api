const api = require('../../utils/api');
const util = require('../../utils/util');

Page({
  data: {
    treeData: [],
    expandedIds: {},
    totalMembers: 0,
    loading: false,
    loaded: false
  },

  onLoad() {
    this.loadTree();
  },

  onPullDownRefresh() {
    this.loadTree().then(() => wx.stopPullDownRefresh());
  },

  async loadTree() {
    try {
      this.setData({ loading: true });
      const res = await api.team.getTree();
      // API可能返回对象(根节点)或数组，兼容处理
      var rawData = res.data;
      if (!rawData) { rawData = []; }
      if (!Array.isArray(rawData)) { rawData = [rawData]; }
      var treeData = rawData.map(item => this.formatNode(item));
      var totalMembers = this.countMembers(treeData);
      this.setData({ treeData: treeData, totalMembers: totalMembers, loading: false, loaded: true });
    } catch (e) {
      console.error('加载团队树失败:', e);
      this.setData({ loading: false, loaded: true, treeData: [] });
    }
  },

  formatNode(node) {
    return {
      ...node,
      levelText: util.agentLevelText(node.agent_level),
      levelColor: util.agentLevelColor(node.agent_level),
      hasChildren: node.children && node.children.length > 0,
      children: (node.children || []).map(child => this.formatNode(child))
    };
  },

  countMembers(nodes) {
    let count = 0;
    nodes.forEach(n => {
      count += 1;
      if (n.children) count += this.countMembers(n.children);
    });
    return count;
  },

  toggleNode(e) {
    const id = e.currentTarget.dataset.id;
    const expandedIds = { ...this.data.expandedIds };
    expandedIds[id] = !expandedIds[id];
    this.setData({ expandedIds });
  },

  // 全部展开/收起
  toggleAll() {
    const allExpanded = Object.values(this.data.expandedIds).every(v => v);
    const expandedIds = {};
    if (!allExpanded) {
      this.setAllExpanded(this.data.treeData, expandedIds);
    }
    this.setData({ expandedIds });
  },

  setAllExpanded(nodes, expandedIds) {
    nodes.forEach(n => {
      if (n.hasChildren) {
        expandedIds[n.id] = true;
        if (n.children) this.setAllExpanded(n.children, expandedIds);
      }
    });
  },

  // 返回我的团队
  goBack() {
    wx.navigateBack();
  },

  // 递归渲染树节点
  isExpanded(id) {
    return !!this.data.expandedIds[id];
  }
});
