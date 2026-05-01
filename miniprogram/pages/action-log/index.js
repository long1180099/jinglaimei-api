/**
 * 行动日志 v2.0 — 日历驱动的新一代行动管理系统
 *
 * 核心理念：以日历为轴心，串联年度→月度→周→日的目标体系
 * 设计灵感：融合 Notion Calendar、Habitica打卡、Bullet Journal
 * 新增功能：
 *   - 月历视图（打卡标记+连续天数）
 *   - 周历视图（7天概览+完成度）
 *   - 每日能量值追踪
 *   - 连续打卡统计与激励文案
 *   - 每日三件事聚焦模式
 *   - 时间块可视化
 */

var api = require('../../utils/api');
var util = require('../../utils/util');

// 激励文案库 — 根据连续天数动态显示
var MOTIVATIONS = [
  { min: 0, text: '🌱 开始行动，每一天都是新的起点', color: '#8c8c8c' },
  { min: 3, text: '💪 已坚持3天！习惯正在形成', color: '#52c41a' },
  { min: 7, text: '🔥 一整周！你已经超越80%的人了', color: '#faad14' },
  { min: 14, text: '⚡ 两周不间断！你的自律令人敬佩', color: '#fa8c16' },
  { min: 21, text: '🏆 21天养成习惯！你做到了！', color: '#e94560' },
  { min: 30, text: '🎖️ 整月打卡！你是真正的行动派', color: '#722ed1' },
  { min: 60, text: '💎 连续两个月！传奇人物就是你', color: '#13c2c2' },
  { min: 100, text: '🌟 百日行动！你的未来不可限量', color: '#eb2f96' }
];

// 能量等级配置
var ENERGY_LEVELS = [
  { key: 'energy_morning', label: '☀️ 早晨精力', emoji: '🌅' },
  { key: 'energy_afternoon', label: '下午状态', emoji: '🌤️' },
  { key: 'energy_evening', label: '晚上活力', emoji: '🌙' }
];

Page({
  data: {
    // ========== 视图模式 ==========
    viewMode: 'month',        // month | week | day
    selectedDate: '',          // 当前选中日期 YYYY-MM-DD
    todayDate: '',             // 今天日期

    // ========== 日历数据 ==========
    calendarDays: [],          // 月历42格(6x7)
    weekDays: [],              // 周历7格
    currentYear: 0,
    currentMonth: 0,
    currentWeekStart: '',
    weekdaysCN: ['一', '二', '三', '四', '五', '六', '日'],
    weekdaysFull: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],

    // ========== 打卡统计 ==========
    checkedDates: {},          // { '2026-04-13': { score:85, mindset:55 } }
    streakCount: 0,            // 当前连续天数
    maxStreak: 0,              // 历史最长连续
    totalCheckins: 0,          // 累计打卡天数
    thisMonthCheckins: 0,      // 本月打卡天数
    thisMonthAvgScore: 0,      // 本月平均分

    // ========== 激励系统 ==========
    motivationText: '',
    motivationColor: '',

    // ========== 每日详情（选中日期） ==========
    dailyDetail: null,         // 当日完整数据
    showDailyDetail: false,
    showEnergyBar: false,      // 是否显示能量（避免WXML中>符号问题）

    // 日目标
    dailyItems: [],
    dailyCompletedCount: 0,
    dailyTotalCount: 0,
    dailyCompleteRate: 0,

    // 心态管理
    mindset: {
      serious: 10, optimistic: 10, confident: 10,
      commitment: 10, love: 10, no_excuse: 10
    },
    mindsetTotal: 60,

    // 能量追踪
    energyLevels: [5, 5, 5],   // 早/午/晚 各1-10
    energyTotal: 15,

    // 学习 & 反思
    studyContent: '',
    improvementContent: '',
    gratitudeContent: '',       // 新增：每日感恩

    // 今日三件事（新增聚焦功能）
    topThreeItems: [],         // [{id, task, done}]

    // ========== Tab（详情内嵌） ==========
    activeSubTab: 'tasks',
    subTabs: [
      { key: 'tasks', label: '📋 任务', icon: '' },
      { key: 'mindset', label: '🧠 心态', icon: '' },
      { key: 'reflect', label: '💭 反思', icon: '' }
    ],

    // ========== 年度/月度/周目标 ==========
    annualGoals: [],
    annualGrouped: [],
    categories: ['事业目标', '财务目标', '家庭生活', '学习成长', '人际关系', '健康休闲'],
    catColors: {
      '事业目标': '#e94560', '财务目标': '#52c41a', '家庭生活': '#fa8c16',
      '学习成长': '#1890ff', '人际关系': '#722ed1', '健康休闲': '#13c2c2'
    },
    catIcons: {
      '事业目标': '🚀', '财务目标': '💰', '家庭生活': '🏠',
      '学习成长': '📚', '人际关系': '🤝', '健康休闲': '💪'
    },

    monthlyGoals: [],
    monthlyGrouped: [],
    weeklyGoals: [],
    weekStart: '',
    weekEnd: '',
    weeklyCompletedCount: 0,
    weeklyCompleteRate: 0,
    weeklySummary: {},

    // 月度追踪
    trackingData: [],
    trackingStats: {},
    trackingMonth: '',

    // 承诺书
    commitments: [],

    // 底部扩展Tab激活状态
    activeMainTab: '',

    // 表单状态
    showGoalForm: false,
    goalForm: { category: '', title: '', content: '' },
    showMonthlyFormFlag: false,
    monthlyForm: { priority: 'A1', title: '', content: '' },
    priorities: ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2'],
    newWeeklyTask: '',
    newPriorityIdx: 0,
    newTaskTime: '',
    newTaskText: '',
    showCommitmentForm: false,
    commitmentForm: { title: '', content: '', supervisor: '', pk_person: '', duration: 30 },
    currentMonth: '',

    loading: false
  },

  onLoad: function () {
    var now = new Date();
    var today = this.formatDate(now);
    var year = now.getFullYear();
    var month = now.getMonth() + 1;
    this.setData({
      todayDate: today,
      selectedDate: today,
      currentYear: year,
      currentMonth: month,
      trackingMonth: year + '-' + String(month).padStart(2, '0'),
      motivationText: MOTIVATIONS[0].text,
      motivationColor: MOTIVATIONS[0].color
    });
  },

  onShow: function () {
    this.refreshCalendarData();
  },

  // ==================== 日历核心 ====================

  /** 刷新全部日历相关数据 */
  refreshCalendarData: function () {
    this.generateCalendar();
    this.loadMonthCheckinData();
    this.updateMotivation();
  },

  /** 生成月历格子 */
  generateCalendar: function () {
    var y = this.data.currentYear;
    var m = this.data.currentMonth;
    var firstDay = new Date(y, m - 1, 1);
    var lastDay = new Date(y, m, 0);
    var daysInMonth = lastDay.getDate();
    var startWeekday = firstDay.getDay();  // 0=Sun
    var adjStart = startWeekday === 0 ? 6 : startWeekday - 1;  // Mon=0

    var todayStr = this.data.todayDate;
    var selStr = this.data.selectedDate;
    var days = [];

    // 上月填充
    var prevLast = new Date(y, m - 1, 0).getDate();
    for (var i = adjStart - 1; i >= 0; i--) {
      var d = prevLast - i;
      var dateStr = this.formatDate(new Date(y, m - 2, d));
      days.push({ day: d, type: 'prev', dateStr: dateStr });
    }

    // 本月
    for (var d = 1; d <= daysInMonth; d++) {
      var dateStr = y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      var isToday = dateStr === todayStr;
      var isSelected = dateStr === selStr;
      var checkinInfo = this.data.checkedDates[dateStr] || null;
      days.push({
        day: d, type: 'current', dateStr: dateStr,
        isToday: isToday, isSelected: isSelected,
        hasLog: !!checkinInfo,
        score: checkinInfo ? checkinInfo.score : null,
        scoreLevel: this.getScoreLevel(checkinInfo ? checkinInfo.score : null)
      });
    }

    // 下月填充
    var remaining = 42 - days.length;
    for (var d = 1; d <= remaining; d++) {
      var dateStr = this.formatDate(new Date(y, m, d));
      days.push({ day: d, type: 'next', dateStr: dateStr });
    }

    this.setData({ calendarDays: days });

    // 同时生成周历
    this.generateWeekView();
  },

  /** 生成本周的7天视图 */
  generateWeekView: function () {
    var monday = this.getMonday(new Date(this.data.selectedDate));
    var weekDays = [];
    var todayStr = this.data.todayDate;
    var selStr = this.data.selectedDate;

    for (var i = 0; i < 7; i++) {
      var d = new Date(monday);
      d.setDate(monday.getDate() + i);
      var dateStr = this.formatDate(d);
      var checkinInfo = this.data.checkedDates[dateStr] || null;
      weekDays.push({
        day: d.getDate(),
        weekday: this.data.weekdaysFull[i],
        dateStr: dateStr,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selStr,
        hasLog: !!checkinInfo,
        score: checkinInfo ? checkinInfo.score : null
      });
    }
    this.setData({ weekDays: weekDays });
  },

  getScoreLevel: function (score) {
    if (score === null || score === undefined) return 0;
    if (score >= 90) return 3;     // 优秀-深绿
    if (score >= 70) return 2;     // 良好-浅绿
    if (score >= 40) return 1;     // 一般-黄
    return 0;                       // 待提升-灰
  },

  /** 加载当月的打卡数据 */
  loadMonthCheckinData: function () {
    var that = this;
    var y = that.data.currentYear;
    var m = that.data.currentMonth;
    api.actionLog.getDailyLogs({ month: y + '-' + String(m).padStart(2, '0'), limit: 31 }).then(function (res) {
      var logs = res.data || [];
      var checked = {};
      var count = 0;
      var totalScore = 0;

      for (var i = 0; i < logs.length; i++) {
        var log = logs[i];
        var dateKey = log.log_date;
        if (!dateKey) continue;
        checked[dateKey] = {
          score: log.score || 0,
          mindset_total: log.mindset_total || 0,
          completedCount: log.completed_count || 0
        };
        count++;
        totalScore += (log.score || 0);
      }

      // 计算连续天数
      var streak = that.calcStreak(checked);

      that.setData({
        checkedDates: checked,
        thisMonthCheckins: count,
        thisMonthAvgScore: count > 0 ? Math.round(totalScore / count) : 0,
        streakCount: streak.current,
        maxStreak: streak.max,
        totalCheckins: count
      });

      // 重新生成日历以显示打卡标记
      that.generateCalendar();
    }).catch(function () {});
  },

  /** 计算当前连续打卡和历史最长 */
  calcStreak: function (checked) {
    var dates = Object.keys(checked).sort().reverse();
    if (dates.length === 0) return { current: 0, max: 0 };

    var today = this.formatDate(new Date());
    var current = 0;
    var checkDate = today;

    // 从今天往前数
    for (var i = 0; i < 365; i++) {
      if (checked[checkDate]) {
        current++;
        var d = new Date(checkDate);
        d.setDate(d.getDate() - 1);
        checkDate = this.formatDate(d);
      } else if (checkDate === today) {
        // 今天还没打，从昨天开始算
        var d = new Date(checkDate);
        d.setDate(d.getDate() - 1);
        checkDate = this.formatDate(d);
      } else {
        break;
      }
    }

    // 计算历史最长
    var max = 0;
    var tempStreak = 0;
    var sortedDates = dates.sort();
    for (var j = 0; j < sortedDates.length; j++) {
      if (j === 0) {
        tempStreak = 1;
      } else {
        var prev = new Date(sortedDates[j - 1]);
        var curr = new Date(sortedDates[j]);
        var diff = Math.round((curr - prev) / 86400000);
        if (diff === 1) {
          tempStreak++;
        } else {
          max = Math.max(max, tempStreak);
          tempStreak = 1;
        }
      }
    }
    max = Math.max(max, tempStreak);

    return { current: current, max: max };
  },

  /** 更新激励文案 */
  updateMotivation: function () {
    var streak = this.data.streakCount;
    var msg = MOTIVATIONS[0];
    for (var i = MOTIVATIONS.length - 1; i >= 0; i--) {
      if (streak >= MOTIVATIONS[i].min) {
        msg = MOTIVATIONS[i];
        break;
      }
    }
    this.setData({
      motivationText: msg.text,
      motivationColor: msg.color
    });
  },

  // ==================== 日历交互 ====================

  switchViewMode: function (e) {
    var mode = e.currentTarget.dataset.mode;
    this.setData({ viewMode: mode });
  },

  prevMonth: function () {
    var d = new Date(this.data.currentYear, this.data.currentMonth - 2, 1);
    this.setData({
      currentYear: d.getFullYear(),
      currentMonth: d.getMonth() + 1
    });
    this.loadMonthCheckinData();
  },

  nextMonth: function () {
    var d = new Date(this.data.currentYear, this.data.currentMonth, 1);
    this.setData({
      currentYear: d.getFullYear(),
      currentMonth: d.getMonth() + 1
    });
    this.loadMonthCheckinData();
  },

  prevWeek: function () {
    var d = new Date(this.data.selectedDate);
    d.setDate(d.getDate() - 7);
    var newDate = this.formatDate(d);
    this.setData({ selectedDate: newDate });
    this.generateWeekView();
    this.loadDailyByDate(newDate);
  },

  nextWeek: function () {
    var d = new Date(this.data.selectedDate);
    d.setDate(d.getDate() + 7);
    var newDate = this.formatDate(d);
    this.setData({ selectedDate: newDate });
    this.generateWeekView();
    this.loadDailyByDate(newDate);
  },

  /** 点击日历某一天 */
  selectDate: function (e) {
    var dateStr = e.currentTarget.dataset.date;
    var type = e.currentTarget.dataset.type;
    if (type && type !== 'current') return; // 非本月不可选
    this.setData({ selectedDate: dateStr, showDailyDetail: true });
    this.generateCalendar();
    this.generateWeekView();
    this.loadDailyByDate(dateStr);
  },

  /** 回到今天 */
  goToday: function () {
    var now = new Date();
    this.setData({
      selectedDate: this.formatDate(now),
      currentYear: now.getFullYear(),
      currentMonth: now.getMonth() + 1
    });
    this.generateCalendar();
    this.loadDailyByDate(this.formatDate(now));
  },

  /** 加载指定日期的每日详情 */
  loadDailyByDate: function (dateStr) {
    var that = this;
    that.setData({ loading: true, showDailyDetail: true });
    api.actionLog.getDailyDetail({ date: dateStr }).then(function (res) {
      var data = res.data || {};
      var items = data.items || [];
      var log = data.log || null;
      var completed = data.completedCount || 0;
      var total = data.totalCount || 0;
      var rate = total > 0 ? Math.round(completed / total * 100) : 0;

      that.setData({
        dailyDetail: data,
        dailyItems: items,
        dailyLog: log,
        dailyCompletedCount: completed,
        dailyTotalCount: total,
        dailyCompleteRate: rate,
        studyContent: log ? (log.study_content || '') : '',
        improvementContent: log ? (log.improvement || '') : '',
        gratitudeContent: log ? (log.gratitude_content || '') : '',
        mindset: {
          serious: log ? (log.mindset_serious || 10) : 10,
          optimistic: log ? (log.mindset_optimistic || 10) : 10,
          confident: log ? (log.mindset_confident || 10) : 10,
          commitment: log ? (log.mindset_commitment || 10) : 10,
          love: log ? (log.mindset_love || 10) : 10,
          no_excuse: log ? (log.mindset_no_excuse || 10) : 10
        },
        mindsetTotal: log ? (log.mindset_total || 60) : 60,
        energyLevels: log ? [
          log.energy_morning || 5,
          log.energy_afternoon || 5,
          log.energy_evening || 5
        ] : [5, 5, 5],
        energyTotal: log ? ((log.energy_morning || 5) + (log.energy_afternoon || 5) + (log.energy_evening || 5)) : 15,
        showEnergyBar: log ? (((log.energy_morning || 5) + (log.energy_afternoon || 5) + (log.energy_evening || 5)) > 0) : false,
        topThreeItems: log ? (log.top_three || []) : [],
        loading: false
      });
    }).catch(function () {
      that.setData({ loading: false });
      // 无数据时初始化空表单
      that.initEmptyDaily();
    });
  },

  /** 初始化空白的每日记录 */
  initEmptyDaily: function () {
    this.setData({
      dailyDetail: null,
      dailyItems: [],
      dailyCompletedCount: 0,
      dailyTotalCount: 0,
      dailyCompleteRate: 0,
      studyContent: '',
      improvementContent: '',
      gratitudeContent: '',
      mindset: { serious: 10, optimistic: 10, confident: 10, commitment: 10, love: 10, no_excuse: 10 },
      mindsetTotal: 60,
      energyLevels: [5, 5, 5],
      energyTotal: 15,
      topThreeItems: []
    });
  },

  closeDailyDetail: function () {
    this.setData({ showDailyDetail: false });
  },

  switchSubTab: function (e) {
    this.setData({ activeSubTab: e.currentTarget.dataset.key });
  },

  // ==================== 每日任务操作 ====================

  toggleDailyItem: function (e) {
    var that = this;
    var id = e.currentTarget.dataset.id;
    if (typeof id === 'string' && id.indexOf('new_') === 0) {
      var items = that.data.dailyItems;
      var completed = 0; var total = 0;
      for (var i = 0; i < items.length; i++) {
        if (items[i].id === id) items[i].is_completed = items[i].is_completed ? 0 : 1;
        if (items[i].task && items[i].task.trim()) { total++; if (items[i].is_completed) completed++; }
      }
      var rate = total > 0 ? Math.round(completed / total * 100) : 0;
      return that.setData({ dailyItems: items, dailyCompletedCount: completed, dailyTotalCount: total, dailyCompleteRate: rate });
    }
    api.actionLog.toggleDailyItemComplete(id).then(function (res) {
      var newCompleted = res.data.is_completed;
      var items = that.data.dailyItems;
      var completed = 0; var total = 0;
      for (var i = 0; i < items.length; i++) {
        if (items[i].id === id) items[i].is_completed = newCompleted ? 1 : 0;
        if (items[i].task && items[i].task.trim()) { total++; if (items[i].is_completed) completed++; }
      }
      that.setData({ dailyItems: items, dailyCompletedCount: completed, dailyTotalCount: total, dailyCompleteRate: total > 0 ? Math.round(completed / total * 100) : 0 });
    }).catch(function () {});
  },

  addDailyItem: function () {
    var that = this;
    var text = that.data.newTaskText;
    if (!text || !text.trim()) return;
    var items = that.data.dailyItems;
    items.push({
      priority: that.data.priorities[that.data.newPriorityIdx],
      time_range: that.data.newTaskTime || '',
      task: text.trim(), is_completed: 0, id: 'new_' + Date.now()
    });
    var total = 0, completed = 0;
    for (var i = 0; i < items.length; i++) {
      if (items[i].task && items[i].task.trim()) { total++; if (items[i].is_completed) completed++; }
    }
    that.setData({ dailyItems: items, newTaskText: '', newTaskTime: '', dailyTotalCount: total, dailyCompletedCount: completed, dailyCompleteRate: total > 0 ? Math.round(completed / total * 100) : 0 });
  },

  onNewPriorityChange: function (e) { this.setData({ newPriorityIdx: e.detail.value }); },
  onNewTimeInput: function (e) { this.setData({ newTaskTime: e.detail.value }); },
  onNewTaskInput: function (e) { this.setData({ newTaskText: e.detail.value }); },

  // ==================== 三件事聚焦 ====================

  addTopThree: function () {
    var that = this;
    var text = that.data.newTaskText;
    if (!text || !text.trim() || that.data.topThreeItems.length >= 3) return;
    var items = that.data.topThreeItems;
    items.push({ id: 'top_' + Date.now(), task: text.trim(), done: false });
    that.setData({ topThreeItems: items, newTaskText: '' });
  },

  toggleTopThree: function (e) {
    var idx = e.currentTarget.dataset.idx;
    var items = this.data.topThreeItems;
    if (items[idx]) items[idx].done = !items[idx].done;
    this.setData({ topThreeItems: items });
  },

  removeTopThree: function (e) {
    var idx = e.currentTarget.dataset.idx;
    var items = this.data.topThreeItems;
    items.splice(idx, 1);
    this.setData({ topThreeItems: items });
  },

  // ==================== 心态 & 能量 ====================

  onMindsetChange: function (e) {
    var key = e.currentTarget.dataset.key;
    var val = parseInt(e.detail.value);
    var m = this.data.mindset;
    m[key] = val;
    var total = m.serious + m.optimistic + m.confident + m.commitment + m.love + m.no_excuse;
    this.setData({ mindset: m, mindsetTotal: total });
  },

  onEnergyChange: function (e) {
    var idx = e.currentTarget.dataset.idx;
    var val = parseInt(e.detail.value);
    var el = this.data.energyLevels;
    el[idx] = val;
    this.setData({ energyLevels: el, energyTotal: el[0] + el[1] + el[2], showEnergyBar: (el[0] + el[1] + el[2]) > 0 });
  },

  // ==================== 反思区 ====================

  onStudyInput: function (e) { this.setData({ studyContent: e.detail.value }); },
  onImprovementInput: function (e) { this.setData({ improvementContent: e.detail.value }); },
  onGratitudeInput: function (e) { this.setData({ gratitudeContent: e.detail.value }); },

  // ==================== 保存 ====================

  saveDailyLog: function () {
    var that = this;
    var m = that.data.mindset;
    var el = that.data.energyLevels;
    var items = [];
    for (var i = 0; i < that.data.dailyItems.length; i++) {
      var item = that.data.dailyItems[i];
      if (item.task && item.task.trim()) {
        items.push({ priority: item.priority, time_range: item.time_range || '', task: item.task, is_completed: item.is_completed });
      }
    }
    var data = {
      date: that.data.selectedDate,
      items: items,
      study_content: that.data.studyContent,
      improvement: that.data.improvementContent,
      gratitude_content: that.data.gratitudeContent,
      mindset_serious: m.serious, mindset_optimistic: m.optimistic,
      mindset_confident: m.confident, mindset_commitment: m.commitment,
      mindset_love: m.love, mindset_no_excuse: m.no_excuse,
      energy_morning: el[0], energy_afternoon: el[1], energy_evening: el[2],
      top_three: that.data.topThreeItems
    };
    wx.showLoading({ title: '保存中...' });
    api.actionLog.saveDailyLog(data).then(function () {
      wx.hideLoading();
      wx.showToast({ title: '✅ 保存成功', icon: 'success' });
      that.loadDailyByDate(that.data.selectedDate);
      that.loadMonthCheckinData(); // 刷新日历标记
      that.updateMotivation();
    }).catch(function () {
      wx.hideLoading();
      wx.showToast({ title: '保存失败', icon: 'none' });
    });
  },

  // ==================== 年度目标 ====================
  loadAnnualGoals: function () {
    var that = this;
    that.setData({ loading: true });
    api.actionLog.getAnnualGoals().then(function (res) {
      var goals = res.data || [];
      var completed = 0, inProgress = 0, totalProgress = 0;
      for (var i = 0; i < goals.length; i++) {
        if (goals[i].status === 1 || goals[i].progress >= 100) completed++;
        else inProgress++;
        totalProgress += (goals[i].progress || 0);
      }
      that.setData({
        annualGoals: goals,
        annualGrouped: that.groupAnnualByCategory(goals),
        annualCompletedCount: completed,
        annualInProgressCount: inProgress,
        annualAvgProgress: goals.length > 0 ? Math.round(totalProgress / goals.length) : 0,
        loading: false
      });
    }).catch(function () { that.setData({ loading: false }); });
  },

  showAddGoal: function () { this.setData({ showGoalForm: true, goalForm: { category: '', title: '', content: '' } }); },
  cancelGoalForm: function () { this.setData({ showGoalForm: false }); },
  onGoalCategoryChange: function (e) { this.setData({ 'goalForm.category': this.data.categories[e.detail.value] }); },
  onGoalTitleInput: function (e) { this.setData({ 'goalForm.title': e.detail.value }); },
  onGoalContentInput: function (e) { this.setData({ 'goalForm.content': e.detail.value }); },

  saveGoal: function () {
    var that = this; var f = this.data.goalForm;
    if (!f.category) return wx.showToast({ title: '请选择类别', icon: 'none' });
    if (!f.title) return wx.showToast({ title: '请输入目标', icon: 'none' });
    api.actionLog.saveAnnualGoal(f).then(function () {
      that.setData({ showGoalForm: false }); wx.showToast({ title: '保存成功', icon: 'success' }); that.loadAnnualGoals();
    }).catch(function () { wx.showToast({ title: '保存失败', icon: 'none' }); });
  },

  deleteGoal: function (e) {
    var that = this; var id = e.currentTarget.dataset.id;
    wx.showModal({ title: '确认删除', content: '确定删除？', success: function (res) {
      if (res.confirm) { api.actionLog.deleteGoal(id).then(function () { wx.showToast({ title: '已删除', icon: 'success' }); that.loadAnnualGoals(); }); }
    }});
  },

  // ==================== 月度目标 ====================
  loadMonthlyGoals: function () {
    var that = this;
    that.setData({ loading: true });
    api.actionLog.getMonthlyGoals({ month: that.data.currentMonth }).then(function (res) {
      var goals = res.data || [];
      var completed = 0;
      for (var i = 0; i < goals.length; i++) {
        if (goals[i].status === 1 || goals[i].is_completed === 1) completed++;
      }
      that.setData({
        monthlyGoals: goals,
        monthlyGrouped: that.groupByPriority(goals),
        monthlyCompletedCount: completed,
        loading: false
      });
    }).catch(function () { that.setData({ loading: false }); });
  },

  changeMonth: function (e) { this.setData({ currentMonth: e.detail.value }); this.loadActiveTab(); },
  showMonthlyForm: function () { this.setData({ showMonthlyFormFlag: true, monthlyForm: { priority: 'A1', title: '', content: '' } }); },
  hideMonthlyForm: function () { this.setData({ showMonthlyFormFlag: false }); },
  onMonthlyPriorityChange: function (e) { this.setData({ 'monthlyForm.priority': this.data.priorities[e.detail.value] }); },
  onMonthlyTitleInput: function (e) { this.setData({ 'monthlyForm.title': e.detail.value }); },
  onMonthlyContentInput: function (e) { this.setData({ 'monthlyForm.content': e.detail.value }); },

  saveMonthlyGoal: function () {
    var that = this; var f = this.data.monthlyForm;
    if (!f.title) return wx.showToast({ title: '请输入目标', icon: 'none' });
    f.start_date = that.data.currentMonth + '-01';
    api.actionLog.saveMonthlyGoal(f).then(function () {
      that.setData({ showMonthlyFormFlag: false }); wx.showToast({ title: '保存成功', icon: 'success' }); that.loadMonthlyGoals();
    }).catch(function () { wx.showToast({ title: '保存失败', icon: 'none' }); });
  },

  groupByPriority: function (items) {
    var groups = [
      { group: 'A', label: '\uD83D\uDD34 A类 \u2014 \u5fc5\u987b\u5b8c\u6210', color: '#e94560', items: [] },
      { group: 'B', label: '\uD83D\uDFE1 B类 \u2014 \u5e94\u8be5\u5b8c\u6210', color: '#faad14', items: [] },
      { group: 'C', label: '\uD83D\uDFE2 C类 \u2014 \u5c3d\u91cf\u5b8c\u6210', color: '#52c41a', items: [] }
    ];
    for (var i = 0; i < items.length; i++) {
      var item = items[i]; var g = item.priority ? item.priority.charAt(0) : 'B';
      for (var j = 0; j < groups.length; j++) { if (groups[j].group === g) { groups[j].items.push(item); break; } }
    }
    return groups;
  },

  // ==================== 周目标 ====================
  loadWeeklyGoals: function () {
    var that = this; var range = that.getWeekRange();
    that.setData({ weekStart: range.start, weekEnd: range.end, loading: true });
    api.actionLog.getWeeklyGoals({ week_start: range.start }).then(function (res) {
      var data = res.data || {}; var goals = data.goals || []; var completed = 0;
      for (var i = 0; i < goals.length; i++) {
        goals[i].priorityColor = that.getPriorityColor(goals[i].priority);
        if (goals[i].is_completed) completed++;
      }
      var rate = goals.length > 0 ? Math.round(completed / goals.length * 100) : 0;
      that.setData({ weeklyGoals: goals, weeklyCompletedCount: completed, weeklyCompleteRate: rate, weeklySummary: data.summary || {}, loading: false });
    }).catch(function () { that.setData({ loading: false }); });
  },

  prevWeekNav: function () {
    var d = new Date(this.data.weekStart); d.setDate(d.getDate() - 7);
    this.setData({ weekStart: this.formatDate(d), weekEnd: this.formatDate(new Date(d.getTime() + 6 * 86400000)) }); this.loadWeeklyGoals();
  },

  nextWeekNav: function () {
    var d = new Date(this.data.weekStart); d.setDate(d.getDate() + 7);
    this.setData({ weekStart: this.formatDate(d), weekEnd: this.formatDate(new Date(d.getTime() + 6 * 86400000)) }); this.loadWeeklyGoals();
  },

  toggleWeeklyComplete: function (e) {
    var that = this; var id = e.currentTarget.dataset.id;
    if (!id || (typeof id === 'string' && id.indexOf('new_') === 0)) {
      var goals = that.data.weeklyGoals; var completed = 0;
      for (var i = 0; i < goals.length; i++) { if (goals[i].id == id) goals[i].is_completed = goals[i].is_completed ? 0 : 1; if (goals[i].is_completed) completed++; }
      return that.setData({ weeklyGoals: goals, weeklyCompletedCount: completed, weeklyCompleteRate: goals.length > 0 ? Math.round(completed / goals.length * 100) : 0 });
    }
    api.actionLog.toggleWeeklyGoalComplete(id).then(function (res) {
      var nc = res.data.is_completed; var goals = that.data.weeklyGoals; var completed = 0;
      for (var i = 0; i < goals.length; i++) { if (goals[i].id === id) goals[i].is_completed = nc ? 1 : 0; if (goals[i].is_completed) completed++; }
      that.setData({ weeklyGoals: goals, weeklyCompletedCount: completed, weeklyCompleteRate: goals.length > 0 ? Math.round(completed / goals.length * 100) : 0 });
    }).catch(function () {});
  },

  onNewWeeklyInput: function (e) { this.setData({ newWeeklyTask: e.detail.value }); },
  addWeeklyGoal: function () {
    var that = this; var text = that.data.newWeeklyTask;
    if (!text || !text.trim()) return;
    var goals = that.data.weeklyGoals; goals.push({ priority: 'A1', title: text.trim(), deadline: '', is_completed: 0, priorityColor: '#e94560' });
    that.setData({ newWeeklyTask: '', weeklyGoals: goals });
  },
  onSummaryInput: function (e) {
    var field = e.currentTarget.dataset.field; var summary = this.data.weeklySummary; summary[field] = e.detail.value; this.setData({ weeklySummary: summary });
  },
  saveWeeklySummary: function () {
    var that = this; var s = that.data.weeklySummary;
    api.actionLog.saveWeeklySummary({ week_start: that.data.weekStart, week_end: that.data.weekEnd, completion: s.completion || '', uncompleted_reason: s.uncompleted_reason || '', improvement: s.improvement || '', harvest: s.harvest || '', next_plan: s.next_plan || '' }).then(function () { wx.showToast({ title: '总结已保存', icon: 'success' }); }).catch(function () { wx.showToast({ title: '保存失败', icon: 'none' }); });
  },

  // ==================== 月度追踪 ====================
  loadTracking: function () {
    var that = this;
    that.setData({ loading: true });
    api.actionLog.getMonthlyTracking({ month: that.data.trackingMonth }).then(function (res) {
      var data = res.data || {};
      that.setData({ trackingData: data.tracking || [], trackingStats: data.dailyStats || {}, loading: false });
    }).catch(function () { that.setData({ loading: false }); });
  },

  // ==================== 承诺书 ====================
  loadCommitments: function () {
    var that = this;
    that.setData({ loading: true });
    api.actionLog.getCommitments().then(function (res) { that.setData({ commitments: res.data || [], loading: false }); }).catch(function () { that.setData({ loading: false }); });
  },

  showAddCommitment: function () { this.setData({ showCommitmentForm: true, commitmentForm: { title: '', content: '', supervisor: '', pk_person: '', duration: 30 } }); },
  cancelCommitmentForm: function () { this.setData({ showCommitmentForm: false }); },
  onCommitmentTitleInput: function (e) { this.setData({ 'commitmentForm.title': e.detail.value }); },
  onCommitmentContentInput: function (e) { this.setData({ 'commitmentForm.content': e.detail.value }); },
  onCommitmentSupervisorInput: function (e) { this.setData({ 'commitmentForm.supervisor': e.detail.value }); },
  onCommitmentPkInput: function (e) { this.setData({ 'commitmentForm.pk_person': e.detail.value }); },
  onDurationChange: function (e) { this.setData({ 'commitmentForm.duration': parseInt(e.detail.value) }); },

  saveCommitment: function () {
    var that = this; var f = that.data.commitmentForm;
    if (!f.title) return wx.showToast({ title: '请输入标题', icon: 'none' });
    api.actionLog.createCommitment(f).then(function () { that.setData({ showCommitmentForm: false }); wx.showToast({ title: '承诺书已创建', icon: 'success' }); that.loadCommitments(); }).catch(function () { wx.showToast({ title: '创建失败', icon: 'none' }); });
  },

  checkinCommitment: function (e) {
    var that = this; var id = e.currentTarget.dataset.id;
    api.actionLog.checkinCommitment(id).then(function () { wx.showToast({ title: '✅ 打卡成功', icon: 'none' }); that.loadCommitments(); }).catch(function () { wx.showToast({ title: '打卡失败', icon: 'none' }); });
  },

  // ==================== 工具函数 ====================

  formatDate: function (d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  },

  getMonday: function (d) {
    var day = d.getDay() || 7; var monday = new Date(d); monday.setDate(d.getDate() - day + 1); return monday;
  },

  getWeekRange: function () {
    var monday = this.getMonday(new Date()); var sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
    return { start: this.formatDate(monday), end: this.formatDate(sunday) };
  },

  getPriorityColor: function (p) {
    if (!p) return '#999'; var c = p.charAt(0);
    if (c === 'A') return '#e94560'; if (c === 'B') return '#faad14'; return '#52c41a';
  },

  // ==================== Tab切换（底部展开更多） ====================
  switchMainTab: function (e) {
    var tab = e.currentTarget.dataset.tab;
    this.setData({ activeMainTab: tab });
    if (tab === 'annual') this.loadAnnualGoals();
    else if (tab === 'monthly') this.loadMonthlyGoals();
    else if (tab === 'weekly') this.loadWeeklyGoals();
    else if (tab === 'tracking') this.loadTracking();
    else if (tab === 'commitment') this.loadCommitments();
  },

  // 加载当前激活的Tab
  loadActiveTab: function () {
    var tab = this.data.activeMainTab;
    if (!tab) return;
    if (tab === 'annual') this.loadAnnualGoals();
    else if (tab === 'monthly') this.loadMonthlyGoals();
    else if (tab === 'weekly') this.loadWeeklyGoals();
    else if (tab === 'tracking') this.loadTracking();
    else if (tab === 'commitment') this.loadCommitments();
  },

  // 年度目标进度滑块变更
  onProgressChange: function (e) {
    var id = e.currentTarget.dataset.id;
    var progress = parseInt(e.detail.value);
    // 更新本地数据（乐观UI）
    var goals = this.data.annualGoals;
    for (var i = 0; i < goals.length; i++) {
      if (goals[i].id == id) { goals[i].progress = progress; break; }
    }
    // 重算分组统计
    this.recalcAnnualStats(goals);
    // 异步保存到后端
    api.actionLog.updateGoal(id, { progress: progress }).catch(function() {});
  },

  // 重算年度目标统计
  recalcAnnualStats: function (goals) {
    var completed = 0, inProgress = 0, totalProgress = 0;
    for (var i = 0; i < goals.length; i++) {
      if (goals[i].status === 1 || goals[i].progress >= 100) completed++;
      else inProgress++;
      totalProgress += (goals[i].progress || 0);
    }
    this.setData({
      annualGoals: goals,
      annualGrouped: this.groupAnnualByCategory(goals),
      annualCompletedCount: completed,
      annualInProgressCount: inProgress,
      annualAvgProgress: goals.length > 0 ? Math.round(totalProgress / goals.length) : 0,
      loading: false
    });
  },

  // 按类别分组年度目标
  groupAnnualByCategory: function (goals) {
    var catMap = {};
    for (var i = 0; i < goals.length; i++) {
      var g = goals[i]; var cat = g.category || '其他';
      if (!catMap[cat]) catMap[cat] = [];
      catMap[cat].push(g);
    }
    var grouped = []; var cats = Object.keys(catMap);
    for (var j = 0; j < cats.length; j++) {
      grouped.push({
        cat: cats[j],
        icon: this.data.catIcons[cats[j]] || '📌',
        color: this.data.catColors[cats[j]] || '#e94560',
        goals: catMap[cats[j]]
      });
    }
    return grouped;
  },

  // 切换追踪月份
  changeTrackingMonth: function (e) {
    this.setData({ trackingMonth: e.detail.value });
    this.loadTracking();
  },

  onShareAppMessage: function () {
    return { title: '行动日志 v2.0 - 以日历为轴，串联每一天的成长', path: '/pages/action-log/index' };
  }
});
