/**
 * AI皮肤分析 - 页面逻辑 v2.0
 */
const api = require('../../utils/api');
const store = require('../../utils/store');

Page({
  data: {
    // 状态
    analyzing: false,
    report: null,
    reportIssues: [],
    matchedProducts: [],
    tempImagePath: '',
    expandedIssueId: -1, // 当前展开的issue索引

    // 分析进度
    step: 0, // 1=上传 2=识别 3=报告
    analyzeStep: '正在上传图片...',
    analyzeSubStep: '请稍候',

    // 映射表
    skinTypeName: {
      dry: '干性肤质', oily: '油性肤质', combo: '混合性肤质',
      sensitive: '敏感性肤质', neutral: '中性肤质', unknown: '待分析'
    },
    skinTypeColor: {
      dry: '#4169E1', oily: '#FFD700', combo: '#FF8C00',
      sensitive: '#FF6347', neutral: '#52c41a'
    },
    categoryName: {
      spot: '色斑类', acne: '痘肌类', state: '肤质状态',
      inflammation: '炎症类', vascular: '血管类',
      eye_area: '眼周问题', keratin: '角质问题',
      aging: '衰老纹路', depigmentation: '脱失类', other: '其他'
    },
    severityLabel: {
      1: '轻度', 2: '轻度', 3: '中度', 4: '重度', 5: '极重度'
    },
    severityColor: {
      1: '#52c41a', 2: '#73d13d', 3: '#faad14', 4: '#fa8c16', 5: '#e94560'
    }
  },

  // reportId 用于从历史记录加载
  _reportId: null,

  onLoad(options) {
    // 连通性测试：检查后端是否可达
    console.log('[皮肤分析] 页面加载, BASE_URL:', api.getBaseUrl());
    wx.request({
      url: api.getBaseUrl() + '/mp/home',
      method: 'GET',
      timeout: 5000,
      success(res) {
        console.log('[皮肤分析] ✅ 后端连通性测试成功, statusCode:', res.statusCode);
      },
      fail(err) {
        console.error('[皮肤分析] ❌ 后端连通性测试失败!', JSON.stringify(err));
      }
    });

    if (options && options.reportId) {
      this._reportId = parseInt(options.reportId);
      this.loadExistingReport(this._reportId);
    }
  },

  // ===== 加载历史报告 =====
  async loadExistingReport(reportId) {
    wx.showLoading({ title: '加载报告...' });
    try {
      const res = await api.get('/mp/skin-analysis/report/' + reportId);
      const reportData = res.data || res;

      if (!reportData || reportData.success === false) {
        throw new Error('报告不存在');
      }

      // 处理时间格式
      if (reportData.created_at) {
        reportData.created_at = reportData.created_at.replace('T', ' ').substring(0, 19);
      }

      // 处理 issues 数据
      const issues = Array.isArray(reportData.issues) ? reportData.issues.map((item, idx) => ({
        ...item,
        _idx: idx,
        // 确保 cause_text 和 advice_text 存在
        cause_text: item.cause_text || '',
        advice_text: item.advice_text || '',
        confidence: item.confidence || 0,
        area: item.area || '',
      })) : [];

      // 格式化置信度百分比
      issues.forEach(item => {
        item.confidencePercent = Math.round((item.confidence || 0) * 100);
      });

      // 构建图片URL（历史报告用服务器图片）
      let imageUrl = reportData.image_url || '';
      if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('wxfile://') && !imageUrl.startsWith('/tmp')) {
        imageUrl = api.getBaseUrl() + imageUrl;
      }

      this.setData({
        report: reportData,
        reportIssues: issues,
        matchedProducts: [],
        tempImagePath: imageUrl,
        analyzing: false,
        step: 3,
      });

      wx.hideLoading();
    } catch (err) {
      wx.hideLoading();
      wx.showModal({
        title: '加载失败',
        content: err.message || '报告数据异常',
        showCancel: false,
      });
      // 加载失败回退到首页
      this.reAnalysis();
    }
  },

  // ===== 选择图片 =====
  chooseImage() {
    wx.showActionSheet({
      itemList: ['拍照检测', '相册选择'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.takePhoto();
        } else if (res.tapIndex === 1) {
          this.pickFromAlbum();
        }
      }
    });
  },

  takePhoto() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['camera'],
      sizeType: ['compressed'],
      cameraDevice: 'front',
      success: (res) => {
        const tempFile = res.tempFiles[0].tempFilePath;
        this.setData({ tempImagePath: tempFile });
      }
    });
  },

  pickFromAlbum() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album'],
      sizeType: ['compressed'],
      success: (res) => {
        const tempFile = res.tempFiles[0].tempFilePath;
        this.setData({ tempImagePath: tempFile });
      }
    });
  },

  // ===== 开始分析 =====
  startAnalysis() {
    console.log('[皮肤分析] startAnalysis 被调用');

    if (!this.data.tempImagePath) {
      console.warn('[皮肤分析] ❌ 没有选择图片');
      wx.showToast({ title: '请先选择照片', icon: 'none' });
      return;
    }

    const userInfo = store.getUserInfo();
    console.log('[皮肤分析] userInfo =', userInfo ? JSON.stringify({ id: userInfo.id, nickname: userInfo.nickname }) : 'null');
    console.log('[皮肤分析] token =', store.getToken() ? store.getToken().substring(0, 20) + '...' : 'null');

    if (!userInfo) {
      console.warn('[皮肤分析] ❌ 用户未登录');
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    const uploadUrl = api.getBaseUrl() + '/mp/skin-analysis/analyze';
    console.log('[皮肤分析] 上传地址:', uploadUrl);
    console.log('[皮肤分析] 图片路径:', this.data.tempImagePath);

    this.setData({
      analyzing: true,
      step: 1,
      analyzeStep: '正在上传图片...',
      analyzeSubStep: '准备上传到AI分析服务器',
      report: null,
      reportIssues: [],
      expandedIssueId: -1,
    });

    // 步骤动画
    this.runAnalyzeAnimation();
    // 执行上传和分析
    this.doUploadAndAnalyze(userInfo);
  },

  // 进度动画模拟
  runAnalyzeAnimation() {
    const steps = [
      { step: 1, main: '正在上传图片...', sub: '加密传输中' },
      { step: 2, main: 'AI正在识别面部特征...', sub: '检测斑类问题' },
      { step: 2, main: 'AI深度分析中...', sub: '检测痘类问题' },
      { step: 2, main: 'AI评估皮肤状态...', sub: '判断肤质类型' },
      { step: 3, main: '正在生成分析报告...', sub: '整理分析结果' },
      { step: 3, main: '生成专业话术...', sub: '匹配护肤建议' },
    ];

    let idx = 0;
    this._animTimer = setInterval(() => {
      if (idx < steps.length && this.data.analyzing) {
        const s = steps[idx];
        this.setData({
          step: s.step,
          analyzeStep: s.main,
          analyzeSubStep: s.sub,
        });
        idx++;
      }
    }, 2000);
  },

  // 上传+分析主流程
  async doUploadAndAnalyze(userInfo) {
    try {
      this.setData({ step: 1, analyzeStep: '正在上传图片...', analyzeSubStep: '传输中' });

      const uploadUrl = api.getBaseUrl() + '/mp/skin-analysis/analyze';
      console.log('[皮肤分析] 开始上传, URL:', uploadUrl);
      console.log('[皮肤分析] filePath:', this.data.tempImagePath);
      console.log('[皮肤分析] user_id:', userInfo.id);

      const uploadRes = await new Promise((resolve, reject) => {
        wx.uploadFile({
          url: uploadUrl,
          filePath: this.data.tempImagePath,
          name: 'image',
          formData: {
            user_id: userInfo.id,
            token: store.getToken(),
          },
          header: { 'X-Client': 'miniprogram' },
          timeout: 180000,
          success(res) {
            console.log('[皮肤分析] ✅ uploadFile success! statusCode:', res.statusCode);
            console.log('[皮肤分析] 响应长度:', (res.data || '').length);
            console.log('[皮肤分析] 响应前200字符:', (res.data || '').substring(0, 200));
            resolve(res);
          },
          fail(err) {
            console.error('[皮肤分析] ❌ uploadFile fail!', JSON.stringify(err));
            reject(err);
          },
          complete(res) {
            console.log('[皮肤分析] uploadFile complete, statusCode:', res ? res.statusCode : 'N/A');
          },
        });
      });

      let data = {};
      try {
        data = JSON.parse(uploadRes.data);
      } catch(e) {
        data = uploadRes.data || {};
      }

      clearInterval(this._animTimer);

      if (data.success === false) {
        throw new Error(data.error || '分析失败，请重试');
      }

      const reportData = data.data || {};

      // 处理时间格式
      if (reportData.created_at) {
        reportData.created_at = reportData.created_at.replace('T', ' ').substring(0, 19);
      }

      // 格式化问题列表 - 补全所有字段
      const issues = Array.isArray(reportData.issues) ? reportData.issues.map((item, idx) => ({
        ...item,
        _idx: idx,
        cause_text: item.cause_text || item.形成原因 || '',
        advice_text: item.advice_text || item.专业建议 || '',
        confidence: parseFloat(item.confidence || 0),
        area: item.area || item.区域 || '',
        issue_name: item.issue_name || item.name || item.问题 || '未知问题',
        severity: parseInt(item.severity || 3),
        category: item.category || 'other',
      })) : [];

      // 格式化置信度百分比
      issues.forEach(item => {
        item.confidencePercent = Math.round((item.confidence || 0) * 100);
      });

      // 格式化产品推荐
      let matchedProducts = [];
      if (reportData.matchedProducts) {
        for (const group of reportData.matchedProducts) {
          matchedProducts = [...matchedProducts, ...group.products];
        }
      }

      this.setData({
        analyzing: false,
        step: 3,
        report: reportData,
        reportIssues: issues,
        matchedProducts: matchedProducts,
        analyzeStep: '分析完成！',
        analyzeSubStep: '已为您生成分析报告',
      });

      wx.showToast({ title: '分析完成', icon: 'success' });

    } catch (err) {
      clearInterval(this._animTimer);

      console.error('[皮肤分析] ❌ 分析流程异常:', err.message || JSON.stringify(err));

      this.setData({
        analyzing: false,
        step: 0,
        analyzeStep: '',
        analyzeSubStep: '',
      });

      wx.showModal({
        title: '分析失败',
        content: err.message || '网络异常，请检查网络后重试',
        showCancel: false,
        confirmText: '知道了',
      });
    }
  },

  // ===== 报告操作 =====
  toggleIssueDetail(e) {
    const idx = e.currentTarget.dataset.idx;
    this.setData({
      expandedIssueId: this.data.expandedIssueId === idx ? -1 : idx,
    });
  },

  copyText(e) {
    const text = e.currentTarget.dataset.text || '';
    if (!text) return;

    wx.setClipboardData({
      data: text,
      success: () => wx.showToast({ title: '已复制', icon: 'success' }),
    });
  },

  previewReportImage() {
    const src = this.data.tempImagePath;
    if (src) {
      wx.previewImage({ urls: [src], current: src });
    }
  },

  goProductDetail(e) {
    const id = e.currentTarget.dataset.id;
    if (id) {
      wx.navigateTo({ url: '/pages/product/detail?id=' + id });
    }
  },

  viewHistory() {
    wx.navigateTo({ url: '/pages/skin-analysis/history' });
  },

  reAnalysis() {
    this.setData({
      report: null, reportIssues: [], matchedProducts: [],
      tempImagePath: '', analyzing: false, step: 0,
      expandedIssueId: -1,
    });
  },

  onShareAppMessage() {
    const report = this.data.report;
    return {
      title: '玫小可AI皮肤分析 - 打造素颜裸妆肌',
      path: report ? '/pages/skin-analysis/analysis?reportId=' + report.id : '/pages/skin-analysis/analysis',
    };
  }
});
