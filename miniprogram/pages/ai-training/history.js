// pages/ai-training/history.js
const api = require('../../utils/api');
const BASE_URL = api.BASE_URL.replace('/api', '');

function getUserId() {
  return wx.getStorageSync('userId') || (wx.getStorageSync('userInfo') || {}).id;
}

Page({
  data: {
    sessions: []
  },

  onLoad() {
    this.loadHistory();
  },

  onShow() {
    this.loadHistory();
  },

  loadHistory() {
    const userId = getUserId();
    if (!userId) { wx.showToast({ title: '请先登录', icon: 'none' }); return; }
    wx.request({
      url: `${BASE_URL}/api/mp/ai-coach/history`,
      data: { user_id: userId },
      success: (res) => {
        if (res.data.code === 0) {
          this.setData({ sessions: res.data.data.items || [] });
        }
      }
    });
  },

  viewDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/ai-training/session-detail?id=${id}` });
  }
});
