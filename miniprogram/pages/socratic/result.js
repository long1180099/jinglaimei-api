// 苏格拉底式提问训练 - 评分结果（AI学院增强版）
Page({
  data: {
    // 评分数据
    grade: 'C',
    gradeColor: '#e94560',
    gradeBg: '',
    gradeTextColor: '',
    scores: { overall: 0, question: 0, listening: 0, guiding: 0, timing: 0, depth: 0 },
    result: '',
    resultText: '',
    duration: 0,
    durationText: '',
    feedback: '',
    highlight_question: '',
    stats: {},
    
    // 五维数据
    dimensionData: [],
    
    // 类型分布
    typeCount: 0,
    questionDensity: 50,
    typeColors: {
      clarification: { color: '#1890ff', icon: '🔍' },
      hypothesis: { color: '#722ed1', icon: '💭' },
      reverse: { color: '#e94560', icon: '🔄' },
      guiding: { color: '#52c41a', icon: '➡️' },
      summary: { color: '#faad14', icon: '✅' }
    },
    typeNames: {
      clarification: '澄清式', hypothesis: '假设式', reverse: '反向式', guiding: '引导式', summary: '总结式'
    },

    // ====== AI学院新增 ======
    xpEarned: 0,
    levelUp: false,
    newLevel: null,
    newTitle: '',
    achievementsUnlocked: [],
    showAchievementPopup: false,

    // Canvas
    canvasWidth: 340,
    canvasHeight: 360
  },

  onLoad(options) {
    if (options.data) {
      try {
        let d;
        if (options.data) {
          d = JSON.parse(decodeURIComponent(options.data));
        } else {
          d = getApp().socraticResultData || {};
          getApp().socraticResultData = null;
        }
        this.initResult(d);
        
        // 播放成就解锁动画（延迟显示）
        if (d.achievements_unlocked && d.achievements_unlocked.length > 0) {
          setTimeout(() => {
            this.setData({
              achievementsUnlocked: d.achievements_unlocked || [],
              showAchievementPopup: true
            });
          }, 1200);
        }
      } catch (e) {
        wx.showToast({ title: '数据异常', icon: 'none' });
      }
    }
  },

  initResult(d) {
    const scores = d.scores || {};
    const grade = d.grade || 'C';
    
    // 等级颜色映射
    const gradeMap = {
      S: { color: '#ffd700', bg: 'linear-gradient(135deg, #ffd700, #ffaa00)', text: '#333' },
      A: { color: '#667eea', bg: 'linear-gradient(135deg, #667eea, #764ba2)', text: '#fff' },
      B: { color: '#52c41a', bg: 'linear-gradient(135deg, #52c41a, #389e0d)', text: '#fff' },
      C: { color: '#999', bg: 'rgba(255,255,255,0.1)', text: 'rgba(255,255,255,0.7)' },
      D: { color: '#e57373', bg: 'rgba(244,67,54,0.15)', text: '#e57373' }
    };
    const gInfo = gradeMap[grade] || gradeMap.C;

    // 结果文字
    const resultMap = { '成交': '🎉 恭喜成交！', '有兴趣但未成交': '👍 客户有兴趣！', '需继续跟进': '💪 继续努力！' };
    const resultText = resultMap[d.result] || d.result || '';

    // 时长格式化
    let durText = '';
    if (d.duration >= 60) {
      durText = Math.floor(d.duration / 60) + '分' + (d.duration % 60 > 0 ? (d.duration % 60) + '秒' : '');
    } else {
      durText = d.duration + '秒';
    }

    // 五维数据
    const dimData = [
      { key: 'question', name: '提问技巧', icon: '❓', value: scores.question || 0, color: '#1890ff', percent: Math.min(100, scores.question || 0) },
      { key: 'listening', name: '倾听确认', icon: '👂', value: scores.listening || 0, color: '#722ed1', percent: Math.min(100, scores.listening || 0) },
      { key: 'guiding', name: '引导能力', icon: '➡️', value: scores.guiding || 0, color: '#52c41a', percent: Math.min(100, scores.guiding || 0) },
      { key: 'timing', name: '时机把握', icon: '⏰', value: scores.timing || 0, color: '#faad14', percent: Math.min(100, scores.timing || 0) },
      { key: 'depth', name: '深度挖掘', icon: '🔍', value: scores.depth || 0, color: '#e94560', percent: Math.min(100, scores.depth || 0) }
    ];

    // 提问类型数量
    const td = d.stats?.type_distribution || {};
    const typeCount = Object.keys(td).length;
    const totalRounds = d.stats?.total_rounds || 1;
    const questionDensity = Math.round((typeCount / 5) * 100);

    this.setData({
      grade,
      gradeColor: gInfo.color,
      gradeBg: gInfo.bg.replace('linear-gradient(', '').split(',')[0]?.replace(/[^#a-fA-F0-9]/g, '') || gInfo.color,
      gradeTextColor: gInfo.text,
      scores: { overall: scores.overall || 0, question: scores.question || 0, listening: scores.listening || 0, guiding: scores.guiding || 0, timing: scores.timing || 0, depth: scores.depth || 0 },
      result: d.result || '',
      resultText,
      duration: d.duration || 0,
      durationText: durText,
      feedback: typeof d.feedback === 'string' ? d.feedback : Array.isArray(d.feedback) ? d.feedback.join('\n') : '',
      highlight_question: d.highlight_question || '',
      stats: d.stats || {},
      dimensionData: dimData,
      typeCount,
      questionDensity,

      // ====== AI学院新增数据 ======
      xpEarned: d.xp_earned || 0,
      levelUp: d.level_up || false,
      newLevel: d.new_level || null,
      newTitle: d.new_title || '',
      achievementsUnlocked: d.achievements_unlocked || [],
    }, () => {
      setTimeout(() => this.drawRadar(), 300);
    });
  },

  closeAchievementPopup() {
    this.setData({ showAchievementPopup: false });
  },

  // 绘制五边形雷达图
  drawRadar() {
    const sysInfo = wx.getSystemInfoSync();
    const pixelRatio = sysInfo.pixelRatio;
    const w = 340 * pixelRatio;
    const h = 360 * pixelRatio;

    try {
      const ctx = wx.createCanvasContext('radarCanvas', this);
      
      // 尺寸参数
      const cx = w / 2;
      const cy = h / 2 + 10;
      const maxRadius = Math.min(w, h) / 2 - 60;

      // 清空背景
      ctx.setFillStyle('#0f0f1a');
      ctx.fillRect(0, 0, w, h);

      const dims = this.data.dimensionData;
      if (!dims.length) return;

      const n = dims.length; // 5个维度
      const angleStep = (Math.PI * 2) / n;
      const startAngle = -Math.PI / 2; // 从正上方开始

      // ===== 绘制网格（5层）=====
      for (let level = 5; level >= 1; level--) {
        const r = (maxRadius / 5) * level;
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
          const angle = startAngle + i * angleStep;
          const x = cx + r * Math.cos(angle);
          const y = cy + r * Math.sin(angle);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.setStrokeStyle(level === 5 ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)');
        ctx.setLineWidth(level === 5 ? 2 : 1);
        ctx.stroke();
        
        if (level === 5 && false) {
          // 最外层填充极浅色
          ctx.setFillStyle('rgba(233,69,96,0.02)');
          ctx.fill();
        }
      }

      // ===== 绘制轴线 ======
      for (let i = 0; i < n; i++) {
        const angle = startAngle + i * angleStep;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + maxRadius * Math.cos(angle), cy + maxRadius * Math.sin(angle));
        ctx.setStrokeStyle('rgba(255,255,255,0.06)');
        ctx.setLineWidth(1);
        ctx.stroke();
      }

      // ===== 绘制数据区域 ======
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const angle = startAngle + i * angleStep;
        const val = Math.max(10, dims[i].value); // 最小显示10%
        const r = (val / 100) * maxRadius;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();

      // 渐变填充
      ctx.setFillStyle('rgba(233,69,96,0.15)');
      ctx.fill();
      ctx.setStrokeStyle('#e94560');
      ctx.setLineWidth(2.5);
      ctx.stroke();

      // ===== 数据点 + 标签 ======
      for (let i = 0; i < n; i++) {
        const angle = startAngle + i * angleStep;
        const val = Math.max(10, dims[i].value);
        const r = (val / 100) * maxRadius;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);

        // 数据点圆圈
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.setFillStyle(dims[i].color);
        ctx.fill();
        ctx.setStrokeStyle('#0f0f1a');
        ctx.setLineWidth(2);
        ctx.stroke();

        // 维度名称标签（外圈）
        const labelR = maxRadius + 28;
        const lx = cx + labelR * Math.cos(angle);
        const ly = cy + labelR * Math.sin(angle);

        ctx.setFontSize(24 * pixelRatio);
        var align = 'left';
        if (i === 0) align = 'center';
        else if (i === 3 || i < 3) align = 'right';
        else if (i === 2) align = 'left';
        ctx.setTextAlign(align);
        ctx.setTextBaseline('middle');
        ctx.setFillStyle('rgba(255,255,255,0.75)');

        // 图标+名称
        const label = `${dims[i].icon} ${dims[i].name}`;
        ctx.fillText(label, lx, ly);
      }

      // 中心文字
      ctx.setFontSize(32 * pixelRatio);
      ctx.setTextAlign('center');
      ctx.setTextBaseline('middle');
      ctx.setFillStyle('#fff');
      ctx.fillText(`${this.data.scores.overall}`, cx, cy - 8);
      ctx.setFontSize(18 * pixelRatio);
      ctx.setFillStyle('rgba(255,255,255,0.4)');
      ctx.fillText('总分', cx, cy + 18);

      ctx.draw(false, () => {});
    } catch(e) {
      console.error('雷达图绘制失败:', e);
    }
  },

  retrain() { wx.navigateBack(); },
  
  goHistory() {
    wx.redirectTo({ url: '/pages/socratic/history' });
  },

  goBackList() {
    wx.navigateTo({ url: '/pages/socratic/list' });
  },

  onShareAppMessage() {
    return { title: `苏格拉底式提问训练 ${this.data.grade}级 ${this.data.scores.overall}分`, path: '/pages/socratic/list' };
  }
});
