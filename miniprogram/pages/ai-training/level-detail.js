// pages/ai-training/level-detail.js
const api = require('../../utils/api');
const BASE_URL = api.BASE_URL.replace('/api', '');

function getUserId() {
  var uid = wx.getStorageSync('userId') || (wx.getStorageSync('userInfo') || {}).id;
  return uid ? String(Number(uid)) : '';
}

const PERSONALITY_LABELS = {
  red: '🔴 红色（孔雀型）',
  yellow: '🟡 黄色（老虎型）',
  blue: '🔵 蓝色（猫头鹰型）',
  green: '🟢 绿色（考拉型）'
};

Page({
  data: {
    levelId: null,
    levelName: '',
    activeTab: 'study',
    studyMaterial: '',
    passScore: 80,
    questions: [],
    examStarted: false,
    examFinished: false,
    currentQuestion: null,
    currentIndex: 0,
    currentScore: 0,
    selectedAnswer: '',
    showAnswer: false,
    isCorrectAnswer: false,
    earnedScore: 0,
    examResult: null,
    examDuration: 0,
    answers: {},
    startTime: 0,
    personalityLabel: '',

    // ===== AI深度分析 =====
    aiAnalysis: null,       // AI深度分析数据
    showAiAnalysis: false   // 是否展开AI分析面板
  },

  onLoad(options) {
    this.setData({
      levelId: options.id,
      levelName: decodeURIComponent(options.name || '')
    });
    this.loadLevelDetail();
  },

  loadLevelDetail() {
    const userId = getUserId();
    if (!userId) { wx.showToast({ title: '请先登录', icon: 'none' }); return; }
    wx.request({
      url: `${BASE_URL}/api/mp/ai-levels/${this.data.levelId}`,
      data: { user_id: userId },
      success: (res) => {
        if (res.data.code === 0) {
          const data = res.data.data;
          this.setData({
            studyMaterial: data.study_material,
            passScore: data.pass_score,
            questions: data.questions,
            currentQuestion: data.questions[0] || null
          });
        }
      }
    });
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
  },

  startExam() {
    this.setData({
      examStarted: true,
      examFinished: false,
      currentIndex: 0,
      currentScore: 0,
      selectedAnswer: '',
      showAnswer: false,
      answers: {},
      currentQuestion: this.data.questions[0],
      startTime: Date.now()
    });
  },

  selectOption(e) {
    if (this.data.showAnswer) return;
    const key = e.currentTarget.dataset.key;
    const question = this.data.currentQuestion;
    const correctOption = question.options.find(o => o.key === question.correct_answer);
    const isCorrect = key === question.correct_answer;
    const earnedScore = isCorrect ? (correctOption ? correctOption.score : 0) : 0;

    this.setData({
      selectedAnswer: key,
      showAnswer: true,
      isCorrectAnswer: isCorrect,
      earnedScore: earnedScore,
      currentScore: this.data.currentScore + earnedScore,
      ['answers[' + question.id + ']']: key
    });
  },

  nextQuestion() {
    const nextIndex = this.data.currentIndex + 1;
    if (nextIndex >= this.data.questions.length) {
      this.submitExam();
      return;
    }
    const nextQuestion = this.data.questions[nextIndex];
    this.setData({
      currentIndex: nextIndex,
      currentQuestion: nextQuestion,
      selectedAnswer: '',
      showAnswer: false,
      isCorrectAnswer: false,
      earnedScore: 0
    });
  },

  submitExam() {
    const userId = getUserId();
    if (!userId) { wx.showToast({ title: '请先登录', icon: 'none' }); return; }
    const duration = Math.round((Date.now() - this.data.startTime) / 1000);

    wx.showLoading({ title: '评分中...' });
    wx.request({
      url: `${BASE_URL}/api/mp/ai-levels/${this.data.levelId}/submit`,
      method: 'POST',
      data: {
        user_id: userId,
        answers: this.data.answers,
        duration: duration
      },
      success: (res) => {
        wx.hideLoading();
        if (res.data.code === 0) {
          const resultData = res.data.data;
          this.setData({
            examFinished: true,
            examResult: resultData,
            examDuration: duration,
            // AI深度分析（如果后端返回了）
            aiAnalysis: resultData.ai_analysis || null
          });
        }
      },
      fail: () => { wx.hideLoading(); }
    });
  },

  goNextLevel() {
    if (this.data.examResult && this.data.examResult.next_level) {
      wx.redirectTo({
        url: `/pages/ai-training/level-detail?id=${this.data.examResult.next_level.id}&name=${encodeURIComponent(this.data.examResult.next_level.name)}`
      });
    }
  },

  // 切换AI深度分析面板
  toggleAiAnalysis() {
    this.setData({ showAiAnalysis: !this.data.showAiAnalysis });
  },

  goBack() {
    wx.navigateBack();
  }
});
