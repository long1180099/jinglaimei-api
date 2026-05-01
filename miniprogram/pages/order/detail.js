const api = require('../../utils/api');
const util = require('../../utils/util');

Page({
  data: {
    order: null,
    loading: true,
    statusDesc: ''
  },

  onLoad(options) {
    if (options && options.id) {
      this.orderId = options.id;
      this.loadDetail();
    }
  },

  async loadDetail() {
    try {
      const res = await api.order.getDetail(this.orderId);
      const order = res.data || {};
      order.statusText = util.orderStatusText(order.status);
      order.statusColor = util.orderStatusColor(order.status);

      const descMap = {
        0: '请在30分钟内完成支付',
        1: '商家正在处理您的订单',
        2: '商品已发出，请注意查收',
        3: '感谢您的购买，期待再次光临',
        4: '订单已取消'
      };
      this.setData({
        order,
        statusDesc: descMap[order.status] || '',
        loading: false
      });
    } catch (e) {
      this.setData({ loading: false });
      console.error('加载订单详情失败:', e);
    }
  },

  async cancelOrder() {
    const res = await new Promise(resolve => {
      wx.showModal({ title: '提示', content: '确定要取消此订单吗？', success: resolve });
    });
    if (res.confirm) {
      try {
        await api.order.cancel(this.orderId);
        wx.showToast({ title: '已取消', icon: 'success' });
        this.loadDetail();
      } catch (e) { console.error(e); }
    }
  },

  async confirmOrder() {
    const res = await new Promise(resolve => {
      wx.showModal({ title: '提示', content: '确认已收到商品？', success: resolve });
    });
    if (res.confirm) {
      try {
        await api.order.confirm(this.orderId);
        wx.showToast({ title: '已确认收货', icon: 'success' });
        this.loadDetail();
      } catch (e) { console.error(e); }
    }
  },

  copyText(e) {
    util.copyText(e.currentTarget.dataset.text);
  }
});
