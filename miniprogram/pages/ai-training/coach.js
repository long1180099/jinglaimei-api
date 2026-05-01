// pages/ai-training/coach.js
const api = require('../../utils/api');
const BASE_URL = api.BASE_URL.replace(/\/api\/?$/, '');

function getUserId() {
  const uid = wx.getStorageSync('userId') || (wx.getStorageSync('userInfo') || {}).id;
  // 规范化：防止浮点字符串 "1.0" 导致后端匹配失败
  return uid ? String(Number(uid)) : '';
}

Page({
  data: {
    scenarios: [],
    sessionId: null,
    scenarioInfo: {},
    messages: [],
    chatRound: 0,
    inputText: '',
    scrollToId: '',
    showHints: false,
    isLoading: false,
    isRecording: false
  },

  onLoad() {
    this.loadScenarios();
  },

  onShow() {
    if (!this.data.sessionId) {
      this.loadScenarios();
    }
  },

  loadScenarios() {
    const userId = getUserId();
    if (!userId) { wx.showToast({ title: '请先登录', icon: 'none' }); return; }
    wx.request({
      url: `${BASE_URL}/api/mp/ai-coach/scenarios`,
      data: { user_id: userId },
      header: { 'Authorization': `Bearer ${wx.getStorageSync('token')}` },
      success: (res) => {
        if (res.data.code === 0) {
          this.setData({ scenarios: res.data.data });
        } else {
          console.warn('[教练] 场景加载失败:', res.data.message);
          wx.showToast({ title: res.data.message || '加载场景失败', icon: 'none' });
        }
      },
      fail: (err) => {
        console.error('[教练] 网络错误:', err);
        wx.showToast({ title: '网络连接失败', icon: 'none' });
      }
    });
  },

  startSession(e) {
    const userId = getUserId();
    if (!userId) { wx.showToast({ title: '请先登录', icon: 'none' }); return; }
    const scenario = e.currentTarget.dataset.scenario;

    wx.showLoading({ title: '连接AI教练...' });
    wx.request({
      url: `${BASE_URL}/api/mp/ai-coach/sessions`,
      method: 'POST',
      header: { 'Authorization': `Bearer ${wx.getStorageSync('token')}` },
      data: { user_id: userId, scenario_id: scenario.id },
      success: (res) => {
        wx.hideLoading();
        if (res.data.code === 0) {
          const data = res.data.data;
          this.setData({
            sessionId: data.session_id,
            scenarioInfo: data.scenario,
            messages: [{ id: 1, role: 'ai', content: data.first_message.content, hint: data.first_message.hint }],
            chatRound: 0,
            inputText: '',
            showHints: false
          });
          this.scrollToBottom();
        }
      },
      fail: () => { wx.hideLoading(); wx.showToast({ title: '连接失败', icon: 'none' }); }
    });
  },

  onInput(e) {
    this.setData({ inputText: e.detail.value });
  },

  sendMessage() {
    const text = this.data.inputText.trim();
    if (!text || this.data.isLoading) return;

    const userId = getUserId();
    if (!userId) { wx.showToast({ title: '请先登录', icon: 'none' }); return; }
    const userMsg = { id: Date.now(), role: 'user', content: text };
    const messages = [...this.data.messages, userMsg];
    this.setData({ messages, inputText: '', isLoading: true });

    // AI思考中...
    const loadingMsg = { id: Date.now() + 1, role: 'ai', content: '正在思考...' };
    this.setData({ messages: [...this.data.messages, loadingMsg] });

    wx.request({
      url: `${BASE_URL}/api/mp/ai-coach/sessions/${this.data.sessionId}/message`,
      method: 'POST',
      timeout: 60000,
      header: { 'Authorization': `Bearer ${wx.getStorageSync('token')}` },
      data: { user_id: userId, content: text },
      success: (res) => {
        if (res.data.code === 0) {
          const data = res.data.data;
          const allMsgs = this.data.messages.slice(0, -1); // remove loading
          allMsgs.push({ id: Date.now() + 2, role: 'ai', content: data.message.content, hint: data.message.hint });
          this.setData({
            messages: allMsgs,
            chatRound: data.round,
            isLoading: false
          });
          this.scrollToBottom();
        } else {
          // 服务端返回错误
          console.warn('[教练] 消息失败:', res.data.message);
          const allMsgs = this.data.messages.slice(0, -1);
          allMsgs.push({ id: Date.now() + 2, role: 'ai', content: res.data.message || '抱歉出了点问题' });
          this.setData({ messages: allMsgs, isLoading: false });
        }
      },
      fail: () => {
        const allMsgs = this.data.messages.slice(0, -1);
        allMsgs.push({ id: Date.now() + 2, role: 'ai', content: '抱歉，我好像出了点问题，请重试一下。' });
        this.setData({ messages: allMsgs, isLoading: false });
      }
    });
  },

  confirmEnd() {
    wx.showModal({
      title: '结束对话',
      content: '确定要结束当前对话并获取AI评分吗？',
      confirmColor: '#e94560',
      success: (res) => {
        if (res.confirm) this.endSession();
      }
    });
  },

  endSession() {
    const userId = getUserId();
    if (!userId) { wx.showToast({ title: '请先登录', icon: 'none' }); return; }
    wx.showLoading({ title: 'AI评分中...' });

    wx.request({
      url: `${BASE_URL}/api/mp/ai-coach/sessions/${this.data.sessionId}/end`,
      method: 'POST',
      timeout: 60000,
      header: { 'Authorization': `Bearer ${wx.getStorageSync('token')}` },
      data: { user_id: userId },
      success: (res) => {
        wx.hideLoading();
        if (res.data.code === 0) {
          const evaluation = res.data.data;
          wx.setStorageSync('lastEvaluation', evaluation);

          // 显示评分结果弹窗
          this.showResult(evaluation);
        } else {
          console.warn('[教练] 评分失败:', res.data.message);
          wx.showToast({ title: res.data.message || '评分失败', icon: 'none' });
        }
      },
      fail: () => { wx.hideLoading(); wx.showToast({ title: '评分失败', icon: 'none' }); }
    });
  },

  showResult(evaluation) {
    const scores = evaluation.scores;
    const feedback = evaluation.feedback;

    wx.showModal({
      title: `${evaluation.result === '成交' ? '🎉 成交！' : evaluation.result === '有兴趣但未成交' ? '👍 有兴趣' : '💪 继续努力'}`,
      content: `总分: ${scores.overall}分\n\n` +
        `性格匹配: ${scores.personality}分\n` +
        `需求挖掘: ${scores.need_discovery}分\n` +
        `共情能力: ${scores.empathy}分\n` +
        `专业呈现: ${scores.professional}分\n` +
        `异议处理: ${scores.objection}分\n` +
        `成交推动: ${scores.closing}分\n` +
        `语言自然度: ${scores.naturalness}分\n\n` +
        `${feedback.summary}`,
      confirmText: '返回',
      cancelText: '查看详情',
      showCancel: true,
      success: (res) => {
        this.setData({
          sessionId: null,
          messages: [],
          chatRound: 0
        });
        if (!res.confirm) {
          wx.navigateTo({ url: '/pages/ai-training/history' });
        }
      }
    });
  },

  toggleHints() {
    this.setData({ showHints: !this.data.showHints });
  },

  startVoice() {
    this.setData({ isRecording: true });
    // 即将支持语音输入功能，敬请期待
    wx.showToast({ title: '即将支持语音输入', icon: 'none' });
    this.setData({ isRecording: false });
  },

  endVoice() {
    this.setData({ isRecording: false });
  },

  viewHistory() {
    wx.navigateTo({ url: '/pages/ai-training/history' });
  },

  scrollToBottom() {
    setTimeout(() => {
      this.setData({ scrollToId: 'msg-bottom' });
    }, 100);
  }
});
