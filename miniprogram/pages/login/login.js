const api = require('../../utils/api');
const store = require('../../utils/store');
const util = require('../../utils/util');

Page({
  data: {
    phone: '',
    smsCode: '',
    countdown: 0,
    agreed: false,
    // 申请代理
    isApply: false,
    isEdit: false,
    isRegister: false,
    realName: '',
    applyPhone: '',
    applyLevel: 0,
    applyLevelOptions: ['请选择', '打版代言人', '代理商', '批发商', '首席分公司', '集团事业部'],
    editNickname: '',
    loginMethod: 'phone', // phone | wechat
    // 邀请码（新用户注册时绑定上级）
    inviteCode: '',
    inviteCheckResult: null,  // { valid: true/false, msg: '...' }
    focusPhoneInput: false,   // 引导聚焦手机号输入框
    showPrivacyConfirm: false, // 自定义隐私确认弹窗
    pendingPhoneCode: null     // 待处理的手机号登录code
  },

  onLoad(options) {
    // 强制确保隐私协议未勾选（防止缓存导致默认勾选）
    this.setData({ agreed: false });
    if (options && options.apply === '1') {
      const userInfo = store.getUserInfo();
      if (userInfo) {
        this.setData({ isRegister: true, isApply: true, applyPhone: userInfo.phone || '' });
      }
    }
    if (options && options.edit === '1') {
      const userInfo = store.getUserInfo();
      if (userInfo) {
        this.setData({ isRegister: true, isEdit: true, editNickname: userInfo.nickname || '' });
      }
    }
    // 如果已登录，直接返回
    if (!options.apply && !options.edit && store.isLoggedIn()) {
      wx.navigateBack();
    }
  },

  // 页面显示时检查隐私授权（微信审核强制要求）
  onShow() {
    this.checkPrivacy();
  },

  // 检查隐私授权状态
  checkPrivacy() {
    const popup = this.selectComponent('#privacyPopup');
    if (popup) {
      popup.checkAndShow();
    }
  },

  // 隐私授权已同意回调（微信privacy-popup组件触发）
  // 仅处理微信系统隐私，不影响自定义勾选框
  onPrivacyAgreed() {
    console.log('[登录] 微信系统隐私弹窗已同意');
  },

  // 切换登录方式
  switchLoginMethod(e) {
    this.setData({ loginMethod: e.currentTarget.dataset.method });
  },

  // 微信登录（新版本使用手机号快速登录）
  onGetUserInfo(e) {
    if (!this.data.agreed) {
      wx.showToast({ title: '请先同意用户协议', icon: 'none' });
      return;
    }
    if (e.detail.userInfo) {
      this.wxLogin(e.detail.userInfo);
    } else {
      // 用户拒绝授权，使用手机号登录
      this.setData({ loginMethod: 'phone' });
    }
  },

  async wxLogin(userInfo) {
    try {
      wx.showLoading({ title: '登录中...', mask: true });
      const loginRes = await new Promise((resolve, reject) => {
        wx.login({ success: resolve, fail: reject });
      });
      
      const res = await api.auth.wxLogin(loginRes.code, {
        nickName: userInfo.nickName || '微信用户',
        avatarUrl: userInfo.avatarUrl || '',
        gender: userInfo.gender || 0
      });
      
      store.setToken(res.data.token);
      store.setUserInfo(res.data.userInfo);
      wx.hideLoading();
      wx.showToast({ title: '登录成功', icon: 'success' });
      setTimeout(() => this.goHome(), 1000);
    } catch (e) {
      wx.hideLoading();
      console.error('微信登录失败:', e);
      // 微信登录失败，切换到手机号登录
      this.setData({ loginMethod: 'phone' });
      wx.showToast({ title: '请使用手机号登录', icon: 'none' });
    }
  },

  // 微信静默登录（开发者工具可用，不依赖手机号授权）
  async wxSilentLogin() {
    if (!this.data.agreed) {
      wx.showToast({ title: '请先同意用户协议', icon: 'none' });
      return;
    }
    try {
      wx.showLoading({ title: '登录中...', mask: true });
      const loginRes = await new Promise((resolve, reject) => {
        wx.login({ success: resolve, fail: reject });
      });
      
      const res = await api.auth.wxLogin(loginRes.code, {
        nickName: '微信用户',
        avatarUrl: '',
        gender: 0
      });
      
      store.setToken(res.data.token);
      store.setUserInfo(res.data.userInfo);
      wx.hideLoading();
      wx.showToast({ title: '登录成功', icon: 'success' });
      setTimeout(() => this.goHome(), 1000);
    } catch (e) {
      wx.hideLoading();
      console.error('静默登录失败:', e);
      wx.showToast({ title: '登录失败，请用手机号登录', icon: 'none' });
    }
  },

  // 微信手机号快捷登录（新版API，真机可用）
  getPhoneNumber(e) {
    var that = this;
    console.log('[登录] getPhoneNumber回调:', e.detail);
    // 用户拒绝授权或取消
    if (e.detail.errMsg !== 'getPhoneNumber:ok') {
      wx.showModal({
        title: '提示',
        content: '如需快速登录，请授权手机号；也可使用验证码方式登录',
        confirmText: '使用验证码登录',
        success: function(res) {
          if (res.confirm) {
            that.setData({ focusPhoneInput: true });
          }
        }
      });
      return;
    }
    // 已同意隐私协议，直接登录
    if (this.data.agreed) {
      this.phoneLoginWithCode(e.detail.code);
      return;
    }
    // 未勾选隐私协议：显示自定义弹窗，同意后自动用已获取的code登录
    var code = e.detail.code;
    // 关闭隐私弹窗组件的遮罩
    var popup = this.selectComponent('#privacyPopup');
    if (popup) { popup.setData({ showPrivacy: false }); }
    this.setData({ pendingPhoneCode: code, showPrivacyConfirm: true });
  },

  // 取消隐私确认弹窗
  cancelPrivacyConfirm() {
    this.setData({ showPrivacyConfirm: false, pendingPhoneCode: null });
  },

  // 确认隐私协议
  confirmPrivacyAgree() {
    var code = this.data.pendingPhoneCode;
    this.setData({ agreed: true, showPrivacyConfirm: false, pendingPhoneCode: null });
    if (code) {
      this.phoneLoginWithCode(code);
    }
  },

  async phoneLoginWithCode(code) {
    try {
      wx.showLoading({ title: '登录中...', mask: true });
      const res = await api.auth.wxPhoneLogin(code, { invite_code: this.data.inviteCode || undefined });
      store.setToken(res.data.token);
      store.setUserInfo(res.data.userInfo);
      wx.hideLoading();
      wx.showToast({ title: '登录成功', icon: 'success' });
      setTimeout(() => this.goHome(), 1000);
    } catch (e) {
      wx.hideLoading();
      console.error('微信一键登录失败:', e);
      // 显示具体错误信息
      var errMsg = (e && e.message) || (e && e.data && e.data.message) || '';
      if (typeof errMsg !== 'string') { errMsg = String(errMsg); }
      if (errMsg.indexOf('凭证') >= 0 || errMsg.indexOf('AppSecret') >= 0 || errMsg.indexOf('配置') >= 0) {
        wx.showModal({
          title: '登录异常',
          content: '微信一键登录暂时不可用，请使用手机号验证码登录',
          showCancel: false,
          confirmText: '我知道了'
        });
      } else {
        wx.showToast({ title: errMsg || '登录失败，请用手机号登录', icon: 'none', duration: 2500 });
      }
    }
  },

  // 手机号输入登录
  onPhoneInput(e) { this.setData({ phone: e.detail.value }); },
  onCodeInput(e) { this.setData({ smsCode: e.detail.value }); },
  // 输入框失焦时重置focus
  onPhoneBlur() { this.setData({ focusPhoneInput: false }); },

  // 邀请码输入
  onInviteCodeInput(e) {
    const code = e.detail.value.toUpperCase().trim();
    this.setData({ inviteCode: code, inviteCheckResult: null });
  },

  // 显示邀请码说明
  showInviteHint() {
    wx.showModal({
      title: '🎁 邀请码说明',
      content: '填写上级的邀请码后，注册时将自动绑定上下级关系。\n\n• 上级可从"我的"页面查看邀请码\n• 绑定后下单时，上级可赚取差价\n• 不填也可以正常注册',
      showCancel: false,
      confirmText: '我知道了'
    });
  },

  async sendSmsCode() {
    if (this.data.countdown > 0) return;
    const phone = this.data.phone;
    if (!phone || phone.length !== 11) {
      wx.showToast({ title: '请输入正确手机号', icon: 'none' });
      return;
    }
    // 调用后端发送验证码
    wx.showLoading({ title: '发送中...' });
    try {
      await api.auth.sendSmsCode(phone);
      wx.hideLoading();
      // 开始倒计时
      this.setData({ countdown: 60 });
      const timer = setInterval(() => {
        this.setData({ countdown: this.data.countdown - 1 });
        if (this.data.countdown <= 0) clearInterval(timer);
      }, 1000);
      wx.showToast({ title: '验证码已发送', icon: 'success' });
    } catch (e) {
      wx.hideLoading();
      // 即使发送失败也启动倒计时，防止频繁点击
      this.setData({ countdown: 60 });
      const timer = setInterval(() => {
        this.setData({ countdown: this.data.countdown - 1 });
        if (this.data.countdown <= 0) clearInterval(timer);
      }, 1000);
    }
  },

  async phoneLogin() {
    var phone = this.data.phone;
    if (!phone || phone.length !== 11) {
      wx.showToast({ title: '请输入正确手机号', icon: 'none' });
      return;
    }
    if (!this.data.agreed) {
      wx.showToast({ title: '请先同意用户协议', icon: 'none' });
      return;
    }
    try {
      wx.showLoading({ title: '登录中...', mask: true });
      const res = await api.auth.phoneLogin(phone, this.data.smsCode, this.data.inviteCode || undefined);
      store.setToken(res.data.token);
      store.setUserInfo(res.data.userInfo);
      wx.hideLoading();
      
      // 如果是新用户且填了邀请码，提示绑定结果
      if (res.data.parentName) {
        wx.showToast({ title: `已绑定上级: ${res.data.parentName}`, icon: 'success', duration: 2000 });
      } else if (this.data.inviteCode && !res.data.parentName) {
        // 邀请码可能没被使用（老用户登录），尝试单独绑定
        try {
          const bindRes = await api.auth.bindInviteCode(this.data.inviteCode);
          if (bindRes.data?.parentName) {
            wx.showToast({ title: `已绑定上级: ${bindRes.data.parentName}`, icon: 'success', duration: 2000 });
          }
        } catch(bindErr) {
          // 绑定失败不阻断登录流程
          console.log('邀请码绑定:', bindErr.message || '未生效（可能已有上级或无效）');
        }
      } else {
        wx.showToast({ title: '登录成功', icon: 'success' });
      }
      
      setTimeout(() => this.goHome(), 1000);
    } catch (e) {
      wx.hideLoading();
      console.error('手机号登录失败:', e);
    }
  },

  // 申请代理
  onRealNameInput(e) { this.setData({ realName: e.detail.value }); },
  onApplyPhoneInput(e) { this.setData({ applyPhone: e.detail.value }); },
  onLevelChange(e) { this.setData({ applyLevel: parseInt(e.detail.value) }); },

  async submitApply() {
    const { realName, applyPhone, applyLevel } = this.data;
    if (!realName) { wx.showToast({ title: '请输入姓名', icon: 'none' }); return; }
    if (!applyPhone || applyPhone.length !== 11) { wx.showToast({ title: '请输入正确手机号', icon: 'none' }); return; }
    if (!applyLevel) { wx.showToast({ title: '请选择代理等级', icon: 'none' }); return; }
    
    wx.showLoading({ title: '提交中...', mask: true });
    try {
      await api.auth.applyAgent({ real_name: realName, phone: applyPhone, agent_level: applyLevel + 1 });
      wx.hideLoading();
      wx.showToast({ title: '申请已提交', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 1000);
    } catch (e) {
      wx.hideLoading();
      console.error('申请失败:', e);
    }
  },

  cancelApply() {
    this.setData({ isRegister: false, isApply: false });
  },

  // 编辑资料
  onEditNicknameInput(e) { this.setData({ editNickname: e.detail.value }); },

  async saveProfile() {
    const nickname = this.data.editNickname.trim();
    if (!nickname) { wx.showToast({ title: '请输入昵称', icon: 'none' }); return; }
    wx.showLoading({ title: '保存中...', mask: true });
    try {
      await api.auth.updateProfile({ nickname });
      const userInfo = store.getUserInfo();
      userInfo.nickname = nickname;
      store.setUserInfo(userInfo);
      wx.hideLoading();
      wx.showToast({ title: '保存成功', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 1000);
    } catch (e) {
      wx.hideLoading();
      console.error('保存失败:', e);
    }
  },

  // 登录成功后跳转首页
  goHome() {
    const pages = getCurrentPages();
    // 如果有上一页，正常返回
    if (pages.length > 1) {
      wx.navigateBack();
    } else {
      // 没有上一页，直接跳TabBar首页
      wx.switchTab({ url: '/pages/index/index' });
    }
  },

  // 返回首页/暂不登录（满足微信审核要求：提供可取消/拒绝按钮）
  goBackHome() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack();
    } else {
      wx.switchTab({ url: '/pages/index/index' });
    }
  },

  toggleAgreement() {
    this.setData({ agreed: !this.data.agreed });
  },

  // 查看用户服务协议
  showUserAgreement() {
    wx.navigateTo({
      url: '/pages/agreement/agreement'
    });
  },

  // 查看隐私政策
  showPrivacyPolicy() {
    wx.navigateTo({
      url: '/pages/privacy/privacy'
    });
  }
});
