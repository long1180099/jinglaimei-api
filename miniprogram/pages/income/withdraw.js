const api = require('../../utils/api');
const util = require('../../utils/util');

Page({
  data: {
    balance: '0.00',
    totalIncome: '0.00',
    withdrawn: '0.00',
    method: 1,
    amount: '',
    bankCard: '',
    bankName: '',
    remark: ''
  },

  onLoad() {
    this.loadBalance();
  },

  async loadBalance() {
    try {
      const res = await api.income.getOverview();
      const data = res.data || {};
      this.setData({
        balance: util.formatMoney(data.pendingIncome || 0),
        totalIncome: util.formatMoney(data.totalIncome || 0),
        withdrawn: util.formatMoney(data.withdrawnAmount || 0)
      });
    } catch (e) {
      console.error('加载余额失败:', e);
    }
  },

  setMethod(e) {
    this.setData({ method: parseInt(e.currentTarget.dataset.method) });
  },

  onBankCardInput(e) { this.setData({ bankCard: e.detail.value }); },
  onBankNameInput(e) { this.setData({ bankName: e.detail.value }); },
  onAmountInput(e) { this.setData({ amount: e.detail.value }); },
  onRemarkInput(e) { this.setData({ remark: e.detail.value }); },

  withdrawAll() {
    this.setData({ amount: this.data.balance });
  },

  async submitWithdraw() {
    const amount = parseFloat(this.data.amount);
    if (!amount || amount < 100) {
      wx.showToast({ title: '最低提现金额100元', icon: 'none' });
      return;
    }
    if (amount > parseFloat(this.data.balance)) {
      wx.showToast({ title: '余额不足', icon: 'none' });
      return;
    }

    try {
      util.showLoading('提交中...');
      await api.income.withdraw({
        amount,
        method: this.data.method,
        bank_card: this.data.bankCard,
        bank_name: this.data.bankName,
        remark: this.data.remark
      });
      util.hideLoading();
      wx.showToast({ title: '提现申请已提交', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 1500);
    } catch (e) {
      util.hideLoading();
      console.error('提现失败:', e);
    }
  }
});
