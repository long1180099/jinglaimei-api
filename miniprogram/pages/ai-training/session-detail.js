// pages/ai-training/session-detail.js
const api = require('../../utils/api');
const BASE_URL = api.BASE_URL.replace('/api', '');

Page({
  data: {
    messages: [],
    feedback: null,
    overallScore: 0
  },

  onLoad(options) {
    this.loadSession(options.id);
  },

  loadSession(id) {
    wx.request({
      url: `${BASE_URL}/api/mp/ai-coach/sessions/${id}`,
      success: (res) => {
        if (res.data.code === 0) {
          const data = res.data.data;
          this.setData({
            messages: data.messages || [],
            feedback: data.feedback,
            overallScore: data.overall_score || 0
          });
        }
      }
    });
  }
});
