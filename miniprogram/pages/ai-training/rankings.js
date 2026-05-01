// pages/ai-training/rankings.js
const api = require('../../utils/api');
const BASE_URL = api.BASE_URL.replace('/api', '');

Page({
  data: {
    type: 'level',
    rankList: []
  },

  onLoad() {
    this.loadRankings();
  },

  switchType(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ type });
    this.loadRankings();
  },

  loadRankings() {
    wx.request({
      url: `${BASE_URL}/api/mp/ai-coach/rankings`,
      data: { type: this.data.type },
      success: (res) => {
        if (res.data.code === 0) {
          this.setData({ rankList: res.data.data });
        }
      }
    });
  }
});
