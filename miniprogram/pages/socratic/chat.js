// 苏格拉底式提问训练 - 对话训练（核心页面）
const api = require('../../utils/api');
var _fullUrl = api.BASE_URL || 'https://api.jinglaimei.com/api';
var BASE_URL = _fullUrl.replace(/\/api\/?$/, ''); // 只去掉末尾的/api，避免替换域名中的api

// 获取当前登录用户ID（规范化，防止浮点字符串 "1.0"）
function getUserId() {
  const uid = wx.getStorageSync('userId') || (wx.getStorageSync('userInfo') || {}).id;
  return uid ? String(Number(uid)) : '';
}

Page({
  data: {
    // 场景信息
    scenarioId: null,
    scenarioName: '',
    personalityType: '',
    step: 'personality',

    // 性格选择
    personalities: [
      { key: '', name: '通用客户', icon: '👤', traits: '默认反应模式', style: '根据场景自动匹配', color: '#722ed1' },
      { key: 'red', name: '红色性格', icon: '🔴', traits: '热情·感性·爱分享·社交认同', style: '回应热情、喜欢被赞美、容易跑题', color: '#e53935' },
      { key: 'blue', name: '蓝色性格', icon: '🔵', traits: '严谨·理性·注重数据·需要证据', style: '回应谨慎、会追问细节、需要充分信息才做决定', color: '#2196f3' },
      { key: 'yellow', name: '黄色性格', icon: '🟡', traits: '直接·目标明确·效率优先·看重性价比', style: '回应简短、直奔主题、不耐烦废话', color: '#ffc107' },
      { key: 'green', name: '绿色性格', icon: '🟢', traits: '温和·怕冲突·决策慢·需要安全感', style: '回应缓慢、不会直接拒绝、常用"考虑考虑"', color: '#4caf50' }
    ],
    selectedPerson: '',

    // 对话状态
    sessionId: null,
    messages: [],
    chatRound: 0,
    inputText: '',
    canSend: false,
    scrollToId: '',
    showHints: true,
    isLoading: false,
    lastWasQuestion: false,

    // 当前会话信息
    currentPersonalityName: '',
    currentPersonalityColor: '#722ed1',

    // 结束确认
    showEndConfirm: false,

    // ====== AI学院新增：实时质量指标 ======
    qualityIndicator: {
      totalQuestions: 0,        // 已发送消息数
      typeDiversity: 0,          // 使用了几种提问类型
      usedTypes: {},             // 各类型使用次数
      hasClarification: false,
      hasSummary: false,
      earlyReverse: false,       // 是否过早用了反向式
      estimatedGrade: '-',       // 预估等级
      xpEstimate: 0,             // 预估获得XP
    },

    // 智能提示（根据轮次和类型动态生成）
    smartHints: [],

    // 问题类型颜色映射
    typeColors: {
      clarification: { color: '#1890ff', icon: '🔍', name: '澄清式', hint: '确认理解、聚焦问题' },
      hypothesis: { color: '#722ed1', icon: '💭', name: '假设式', hint: '探索可能性、测试意愿' },
      reverse: { color: '#e94560', icon: '🔄', name: '反向式', hint: '挑战固有思维' },
      guiding: { color: '#52c41a', icon: '➡️', name: '引导式', hint: '引导方向、推进话题' },
      summary: { color: '#faad14', icon: '✅', name: '总结式', hint: '确认共识、推动决策' }
    },

    // 推荐的下一句话术模板
    suggestTemplates: [
      { type: 'clarification', text: '您说的XX具体是指...？' },
      { type: 'hypothesis', text: '如果...您觉得怎么样？' },
      { type: 'summary', text: '所以我理解下来，您的核心诉求是...' },
    ],
  },

  onLoad(options) {
    if (options.scenario_id) {
      this.setData({
        scenarioId: options.scenario_id,
        scenarioName: decodeURIComponent(options.name || ''),
        personalityType: options.personality || ''
      });
      
      // 如果有指定性格，直接跳过选择进入对话
      if (options.personality) {
        this.setData({ selectedPerson: options.personality, step: 'chatting' });
        this.startSession(options.personality);
      }
    }
  },

  // ===== 性格选择 =====

  selectPersonality(e) {
    this.setData({ selectedPerson: e.currentTarget.dataset.key });
  },

  confirmStart() {
    if (!this.data.selectedPerson) return;
    this.setData({ step: 'chatting' });
    this.startSession(this.data.selectedPerson);
  },

  // ===== 会话管理 =====

  startSession(personalityType) {
    const userId = getUserId();
    if (!userId) { wx.showToast({ title: '请先登录', icon: 'none' }); return; }

    wx.showLoading({ title: '连接AI教练...' });
    
    wx.request({
      url: `${BASE_URL}/api/mp/socratic/sessions`,
      method: 'POST',
      timeout: 30000,
      header: { 'Authorization': `Bearer ${wx.getStorageSync('token')}` },
      data: {
        user_id: userId,
        scenario_id: this.data.scenarioId,
        personality_type: personalityType
      },
      success: (res) => {
        wx.hideLoading();
        if (res.data.code === 0) {
          const d = res.data.data;
          const pColor = this._getPersonalityColor(d.personality_type);
          this.setData({
            sessionId: d.session_id,
            messages: [{
              id: Date.now(), role: 'ai', content: d.first_message.content, hint: d.first_message.hint
            }],
            chatRound: 0,
            inputText: '',
            currentPersonalityName: this._getPersonalityName(d.personality_type),
            currentPersonalityColor: pColor,
            isLoading: false
          }, () => this.scrollToBottom());
        } else {
          wx.showToast({ title: res.data.message || '创建失败', icon: 'none' });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '网络错误', icon: 'none' });
      }
    });
  },

  // ===== 消息收发 =====

  onInput(e) {
    this.setData({ inputText: e.detail.value, canSend: e.detail.value.trim().length > 0 });
  },

  sendMessage() {
    const text = this.data.inputText.trim();
    if (!text || this.data.isLoading) return;

    const isQuestion = text.includes('？') || text.includes('?');
    const userMsg = { 
      id: Date.now(), role: 'user', content: text,
      isQuestion,
      detected_type: null,
      typeIcon: null, typeName: null, typeColor: null
    };
    
    this.setData({
      messages: [...this.data.messages, userMsg],
      inputText: '',
      canSend: false,
      isLoading: true,
      lastWasQuestion: isQuestion
    });

    // 加载动画
    const loadingMsg = { id: Date.now() + 1, role: 'ai', content: 'AI正在思考...' };
    this.setData({ messages: [...this.data.messages, loadingMsg] });

    const userId = getUserId();

    wx.request({
      url: `${BASE_URL}/api/mp/socratic/sessions/${this.data.sessionId}/message`,
      method: 'POST',
      timeout: 60000,
      header: { 'Authorization': `Bearer ${wx.getStorageSync('token')}` },
      data: { content: text, user_id: userId },
      success: (res) => {
        if (res.data.code === 0) {
          const d = res.data.data;
          const allMsgs = this.data.messages.slice(0, -1); // 移除loading
          
          // AI回复消息
          const aiMsg = {
            id: Date.now() + 2, role: 'ai', 
            content: d.message.content,
            hint: d.message.hint,
            questionTypeInfo: d.type_info ? { ...d.type_info } : null
          };

          // 更新用户消息的类型识别标签 + 追踪质量指标
          let q = this.data.qualityIndicator;
          const newRound = d.round;
          
          if (d.detected_type) {
            var tc = this.data.typeColors[d.detected_type] || {};
            
            // 更新类型使用统计
            var usedTypes = Object.assign({}, q.usedTypes);
            usedTypes[d.detected_type] = (usedTypes[d.detected_type] || 0) + 1;
            var diversityCount = Object.keys(usedTypes).length;

            // 检测特殊模式
            var hasClarif = d.detected_type === 'clarification' ? true : q.hasClarification;
            var hasSumm = d.detected_type === 'summary' ? true : q.hasSummary;
            var earlyRev = d.detected_type === 'reverse' && newRound <= 2 ? true : q.earlyReverse;

            // 预估等级和XP
            var estGrade = '-';
            if (newRound >= 5 && diversityCount >= 4) estGrade = 'A';
            else if (newRound >= 4 && diversityCount >= 3) estGrade = 'B';
            else if (newRound >= 3 && diversityCount >= 2) estGrade = 'C';
            
            var estXp = Math.round(newRound * 12 + diversityCount * 8);
            if (estGrade === 'A') estXp += 30;
            if (hasSumm) estXp += 10;

            q = {
              totalQuestions: newRound,
              typeDiversity: diversityCount,
              usedTypes: usedTypes,
              hasClarification: hasClarif,
              hasSummary: hasSumm,
              earlyReverse: earlyRev,
              estimatedGrade: estGrade,
              xpEstimate: estXp,
            };

            // 生成智能提示
            var hints = this._generateSmartHints(d.detected_type, newRound, diversityCount);

            this.setData({
              qualityIndicator: q,
              smartHints: hints,
            });
          }

          const updatedMsgs = allMsgs.map(m => {
            if (m.id === userMsg.id && d.detected_type) {
              const tc = this.data.typeColors[d.detected_type] || {};
              return { ...m, detected_type: d.detected_type, typeIcon: tc.icon, typeName: tc.name, typeColor: tc.color };
            }
            return m;
          });

          this.setData({
            messages: [...updatedMsgs, aiMsg],
            chatRound: d.round,
            isLoading: false
          }, () => this.scrollToBottom());
        } else {
          // 错误处理
          const allMsgs = this.data.messages.slice(0, -1);
          allMsgs.push({ id: Date.now() + 2, role: 'ai', content: '抱歉，我好像出了点问题，请重试一下。' });
          this.setData({ messages: allMsgs, isLoading: false }, () => this.scrollToBottom());
        }
      },
      fail: () => {
        const allMsgs = this.data.messages.slice(0, -1);
        allMsgs.push({ id: Date.now() + 2, role: 'ai', content: '网络异常，请检查连接后重试。' });
        this.setData({ messages: allMsgs, isLoading: false }, () => this.scrollToBottom());
      }
    });
  },

  /**
   * 根据当前对话状态生成智能提示
   */
  _generateSmartHints(currentType, round, diversity) {
    var hints = [];
    
    if (round === 1) {
      hints.push({ icon: '💡', text: '第一轮建议用澄清式提问了解客户需求', priority: 'high' });
    } else if (round === 3 && !this.data.qualityIndicator.hasClarification) {
      hints.push({ icon: '🔍', text: '试试澄清式提问来确认理解', priority: 'high' });
    }

    if (!this.data.qualityIndicator.hasSummary && round >= 4) {
      hints.push({ icon: '✅', text: '考虑用总结式确认客户需求', priority: 'medium' });
    }

    if (diversity < 3 && round >= 4) {
      hints.push({ icon: '🎯', text: '已使用' + diversity + '种提问技巧，尝试更多类型', priority: 'medium' });
    }

    if (currentType === 'reverse' && round <= 2) {
      hints.push({ icon: '⚠️', text: '反向式提问在早期可能引起客户防御', priority: 'warning' });
    }

    return hints.slice(0, 3); // 最多显示3条
  },

  confirmEnd() {
    if (this.data.chatRound < 3) {
      wx.showModal({ title: '提示', content: '至少进行3轮对话后才能结束评分哦~', showCancel: false });
      return;
    }
    this.setData({ showEndConfirm: true });
  },

  cancelEnd() { this.setData({ showEndConfirm: false }); },

  doEndSession() {
    this.setData({ showEndConfirm: false });
    const userId = getUserId();
    if (!userId) return;

    console.log('[苏格拉底结束] 开始评分, sessionId:', this.data.sessionId, 'userId:', userId);

    wx.showLoading({ title: 'AI评分中...' });

    wx.request({
      url: `${BASE_URL}/api/mp/socratic/sessions/${this.data.sessionId}/end`,
      method: 'POST',
      timeout: 60000,
      header: { 'Authorization': `Bearer ${wx.getStorageSync('token')}` },
      data: { user_id: userId },
      success: (res) => {
        wx.hideLoading();
        if (res.data.code === 0) {
          // 用全局存储传递数据，避免URL超长
          getApp().socraticResultData = res.data.data;
          wx.redirectTo({ url: '/pages/socratic/result' });
        } else {
          wx.showToast({ title: res.data.message || '评分失败', icon: 'none' });
        }
      },
      fail: () => { wx.hideLoading(); wx.showToast({ title: '评分失败', icon: 'none' }); }
    });
  },

  toggleHints() {
    this.setData({ showHints: !this.data.showHints });
  },

  scrollToBottom() {
    setTimeout(() => { this.setData({ scrollToId: 'msg-bottom' }); }, 150);
  },

  // ===== 辅助方法 =====

  _getPersonalityName(type) {
    const map = { red: '红色热情', blue: '蓝色理性', yellow: '黄色直接', green: '绿色温和' };
    return map[type] || '通用';
  },

  _getPersonalityColor(type) {
    const map = { red: '#e53935', blue: '#2196f3', yellow: '#ffc107', green: '#4caf50' };
    return map[type] || '#722ed1';
  }
});
