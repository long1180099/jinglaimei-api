/**
 * 隐私授权弹窗组件（符合微信2023.9后审核要求）
 *
 * 使用方式：
 *   <privacy-popup id="privacyPopup" bind:agreed="onPrivacyAgreed" />
 *
 * 调用：
 *   this.selectComponent('#privacyPopup').checkAndShow();
 */
Component({
  properties: {
    // 是否在同意后自动关闭
    autoClose: {
      type: Boolean,
      value: true
    }
  },

  data: {
    showPrivacy: false,
    privacyContractName: '《静莱美隐私保护指引》'
  },

  lifetimes: {
    attached() {
      // 组件加载时检查隐私协议状态
      this.checkPrivacyStatus();
    }
  },

  methods: {
    /**
     * 检查隐私授权状态并决定是否显示弹窗
     */
    checkPrivacyStatus() {
      // 兼容低版本基础库
      if (wx.getPrivacySetting) {
        wx.getPrivacySetting({
          success: (res) => {
            console.log('[隐私] 需要授权的隐私接口:', res.needAuthorization);
            console.log('[隐私] 已授权的隐私接口:', res.privacyCollection);

            if (res.needAuthorization) {
              // 用户尚未同意隐私协议，显示弹窗
              this.setData({ showPrivacy: true });
            } else {
              // 已同意，触发回调
              this.triggerEvent('agreed');
            }
          },
          fail: (err) => {
            console.warn('[隐私] 检查失败，默认不显示弹窗', err);
            // 基础库不支持时，直接触发同意
            this.triggerEvent('agreed');
          }
        });
      } else {
        // 低版本基础库，直接触发
        this.triggerEvent('agreed');
      }
    },

    /**
     * 手动调用检查（供外部页面使用）
     */
    checkAndShow() {
      this.checkPrivacyStatus();
    },

    /**
     * 打开隐私协议详情页
     */
    openPrivacyContract() {
      wx.openPrivacyContract({
        success: () => {
          console.log('[隐私] 打开隐私协议成功');
        },
        fail: (err) => {
          console.warn('[隐私] 打开协议失败，跳转至隐私页', err);
          // 降级方案：如果 openPrivacyContract 失败，跳转到自定义隐私页
          wx.navigateTo({
            url: '/pages/privacy/privacy'
          });
        }
      });
    },

    /**
     * 用户点击"同意并继续"
     */
    handleAgree() {
      // 先处理隐私接口授权
      wx.getPrivacySetting({
        success: (res) => {
          if (res.needAuthorization) {
            // 触发微信隐私按钮的授权
            this.setData({ showPrivacy: false });

            // 通知父组件已同意
            this.triggerEvent('agreed');

            wx.showToast({
              title: '感谢您的信任',
              icon: 'success',
              duration: 1500
            });
          } else {
            this.setData({ showPrivacy: false });
            this.triggerEvent('agreed');
          }
        },
        fail: () => {
          this.setData({ showPrivacy: false });
          this.triggerEvent('agreed');
        }
      });
    },

    /**
     * 用户点击"拒绝"/关闭 — 引导到隐私协议页或退出
     */
    handleDisagree() {
      this.setData({ showPrivacy: false });

      wx.showModal({
        title: '提示',
        content: '您拒绝了隐私授权，部分功能将无法正常使用。如需继续使用请重新进入小程序并同意隐私协议。',
        confirmText: '查看协议',
        cancelText: '知道了',
        success: (res) => {
          if (res.confirm) {
            this.openPrivacyContract();
          }
        }
      });
    }
  }
});
