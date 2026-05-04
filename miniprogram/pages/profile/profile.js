const store = require('../../utils/store');
const util = require('../../utils/util');
const api = require('../../utils/api');

Page({
  data: {
    userInfo: null,
    isLoggedIn: false,
    levelText: '会员',
    levelColor: '#999',
    userBalance: '0.00',
    stats: {
      orderCount: 0,
      teamCount: 0,
      incomeAmount: '0.00',
      courseCount: 0
    },
    menuList: [
      { id: 'orders', icon: '📦', label: '我的订单', desc: '查看全部订单', arrow: true },
      { id: 'team', icon: '👥', label: '我的团队', desc: '邀请好友一起成长', arrow: true },
      { id: 'income', icon: '💰', label: '收益中心', desc: '查看收益和提现', arrow: true },
      { id: 'school', icon: '📚', label: '商学院', desc: '在线学习提升', arrow: true },
      { id: 'ebooks', icon: '📖', label: '电子书', desc: '精选电子书在线阅读', arrow: true },
      { id: 'actionlog', icon: '📋', label: '行动日志', desc: '目标追踪与每日记录', arrow: true },
      { id: 'personality', icon: '🎨', label: '性格色彩', desc: '成交话术学习', arrow: true },
      { id: 'divider' },
      { id: 'address', icon: '📍', label: '收货地址', desc: '管理收货地址' },
      { id: 'favorites', icon: '♥', label: '我的收藏', desc: '收藏的好物' },
      { id: 'coupon', icon: '🎫', label: '优惠券', desc: '查看可用优惠券' },
      { id: 'divider' },
      { id: 'apply', icon: '🌟', label: '申请升级', desc: '升级代理等级' },
      { id: 'service', icon: '🎧', label: '联系客服', desc: '在线客服' },
      { id: 'about', icon: 'ℹ', label: '关于静莱美', desc: 'v2.0.0' },
      { id: 'setting', icon: '⚙', label: '设置', desc: '' }
    ]
  },

  onShow() {
    this.loadUserInfo();
    this.updateCartBadge();
  },

  updateCartBadge() {
    const count = store.getCartCount();
    if (count > 0) {
      wx.setTabBarBadge({ index: 1, text: count > 99 ? '99+' : String(count) });
    } else {
      wx.removeTabBarBadge({ index: 1 });
    }
  },

  async loadUserInfo() {
    const userInfo = store.getUserInfo();
    if (userInfo) {
      // 兼容后端驼峰/下划线两种返回格式
      if (!userInfo.agent_level && userInfo.agentLevel) {
        userInfo.agent_level = userInfo.agentLevel;
      }
      const level = userInfo.agent_level || userInfo.agentLevel || 1;
      this.setData({
        userInfo,
        isLoggedIn: true,
        levelText: util.agentLevelText(level),
        levelColor: util.agentLevelColor(level),
        userBalance: userInfo.balance != null ? parseFloat(userInfo.balance).toFixed(2) : '0.00',
        stats: {
          orderCount: userInfo.order_count || 0,
          teamCount: userInfo.team_count || 0,
          incomeAmount: util.formatMoney(userInfo.total_income || 0),
          courseCount: userInfo.course_count || 0
        }
      });
      // 异步刷新余额（从服务端获取最新值）
      this.fetchBalance();
    } else {
      this.setData({ userInfo: null, isLoggedIn: false });
    }
  },

  // 从服务端获取最新余额
  async fetchBalance() {
    try {
      const token = store.getToken();
      if (!token) return;
      const res = await api.get('/users/' + (this.data.userInfo.id || '') + '/balance', { token });
      if (res.data && res.data.balance !== undefined) {
        this.setData({
          userBalance: parseFloat(res.data.balance).toFixed(2)
        });
        // 同步更新本地缓存的用户信息
        const info = store.getUserInfo();
        if (info) {
          info.balance = res.data.balance;
          wx.setStorageSync('userInfo', info);
        }
      }
    } catch (e) {
      // 余额加载失败不影响页面显示，静默处理
    }
  },

  // 快捷操作
  goLogin() {
    wx.navigateTo({ url: '/pages/login/login' });
  },

  // 需要登录的操作统一检查（满足微信审核：不强制跳转，仅提示）
  requireLogin() {
    if (!util.checkLogin()) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return false;
    }
    return true;
  },

  goOrders() {
    if (!this.requireLogin()) return;
    wx.navigateTo({ url: '/pages/order/list' });
  },

  goTeam() {
    if (!this.requireLogin()) return;
    wx.navigateTo({ url: '/pages/team/my-team' });
  },

  goIncome() {
    wx.switchTab({ url: '/pages/income/overview' });
  },

  // 跳转到余额明细
  goBalance() {
    wx.navigateTo({ url: '/pages/balance/detail' });
  },

  goSchool() {
    wx.navigateTo({ url: '/pages/school/list' });
  },

  // 菜单项点击
  onMenuTap(e) {
    const id = e.currentTarget.dataset.id;
    if (!id || id === 'divider') return;

    switch (id) {
      case 'orders':
        if (!this.requireLogin()) return;
        wx.navigateTo({ url: '/pages/order/list' });
        break;
      case 'team':
        if (!this.requireLogin()) return;
        wx.navigateTo({ url: '/pages/team/my-team' });
        break;
      case 'income':
        wx.switchTab({ url: '/pages/income/overview' });
        break;
      case 'school':
        wx.switchTab({ url: '/pages/school/list' });
        break;
      case 'ebooks':
        if (!this.requireLogin()) return;
        wx.navigateTo({ url: '/pages/school/ebooks' });
        break;
      case 'actionlog':
        if (!this.requireLogin()) return;
        wx.navigateTo({ url: '/pages/action-log/index' });
        break;
      case 'personality':
        if (!this.requireLogin()) return;
        wx.navigateTo({ url: '/pages/personality/index' });
        break;
      case 'usage-logs':
        if (!this.requireLogin()) return;
        wx.navigateTo({ url: '/pages/usage/my-logs' });
        break;
      case 'team-usage':
        if (!this.requireLogin()) return;
        wx.navigateTo({ url: '/pages/usage/team-logs' });
        break;
      case 'address':
        if (!this.requireLogin()) return;
        this.showAddress();
        break;
      case 'favorites':
        this.showFavorites();
        break;
      case 'coupon':
        wx.showModal({
          title: '优惠券',
          content: '优惠券功能即将上线，敬请期待！\n\n届时将提供新人券、满减券等多种优惠。',
          showCancel: false,
          confirmText: '知道了'
        });
        break;
      case 'apply':
        if (!this.requireLogin()) return;
        wx.navigateTo({ url: '/pages/login/login?apply=1' });
        break;
      case 'service':
        this.contactService();
        break;
      case 'about':
        wx.showModal({
          title: '关于静莱美',
          content: '静莱美 — 品质美妆代理商平台\n\n版本: 2.0.0\n\n提供优质美妆产品，\n助力每一位代理商成长。\n\n客服邮箱：support@jinglaimei.com\n\nICP备案：鲁ICP备2026019556号-1X\n主办单位：静莱美（山东）美业有限公司',
          showCancel: false,
          confirmText: '知道了'
        });
        break;
      case 'setting':
        this.showSettings();
        break;
    }
  },

  // 收货地址 → 跳转到地址管理页
  showAddress() {
    wx.navigateTo({
      url: '/pages/address/address?mode=manage'
    });
  },

  // 我的收藏
  showFavorites() {
    const favs = wx.getStorageSync('favorites') || [];
    if (favs.length === 0) {
      wx.showToast({ title: '暂无收藏', icon: 'none' });
      return;
    }
    wx.showToast({ title: '共收藏 ' + favs.length + ' 件商品', icon: 'none' });
  },

  // 联系客服 - 跳转到微信客服
  contactService() {
    wx.openCustomerServiceChat({
      extInfo: { url: '' },
      corpId: '',
      success: () => {},
      fail: () => {
        wx.showModal({
          title: '联系客服',
          content: '客服工作时间：周一至周日 9:00-21:00\n\n如有问题请通过公众号"静莱美"联系我们',
          showCancel: false,
          confirmText: '知道了'
        });
      }
    });
  },

  // 设置
  showSettings() {
    const actionList = ['清除缓存', '意见反馈', '版本更新'];
    wx.showActionSheet({
      itemList: actionList,
      success: (res) => {
        switch (res.tapIndex) {
          case 0: // 清除缓存
            wx.showModal({
              title: '清除缓存',
              content: '确定清除所有本地缓存数据？',
              success: (r) => {
                if (r.confirm) {
                  wx.clearStorageSync();
                  this.setData({ userInfo: null, isLoggedIn: false });
                  wx.showToast({ title: '缓存已清除', icon: 'success' });
                }
              }
            });
            break;
          case 1: // 意见反馈
            wx.showModal({
              title: '意见反馈',
              content: '如有问题或建议，请通过公众号"静莱美"联系我们，我们会尽快处理！',
              showCancel: false,
              confirmText: '知道了'
            });
            break;
          case 2: // 版本更新
            const updateManager = wx.getUpdateManager();
            updateManager.onUpdateReady(() => {
              wx.showModal({
                title: '发现新版本',
                content: '新版本已准备就绪，是否重启应用？',
                success: (res) => { if (res.confirm) updateManager.applyUpdate(); }
              });
            });
            updateManager.onUpdateFailed(() => {
              wx.showToast({ title: '已是最新版本', icon: 'none' });
            });
            updateManager.checkUpdate();
            break;
        }
      }
    });
  },

  // 编辑资料
  editProfile() {
    wx.navigateTo({ url: '/pages/login/login?edit=1' });
  },

  // 复制邀请码
  copyInviteCode() {
    const code = this.data.userInfo?.inviteCode;
    if (!code) return;
    wx.setClipboardData({
      data: code,
      success: () => {
        wx.showToast({ title: '邀请码已复制', icon: 'success' });
      }
    });
  },

  // 退出登录
  doLogout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          store.logout();
          this.setData({ userInfo: null, isLoggedIn: false });
          wx.showToast({ title: '已退出登录', icon: 'success' });
        }
      }
    });
  },

  onShareAppMessage() {
    return {
      title: '静莱美 - 品质美妆代理商平台',
      path: '/pages/index/index'
    };
  }
});
