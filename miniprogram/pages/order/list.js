const api = require('../../utils/api');
const util = require('../../utils/util');

Page({
  data: {
    activeTab: 'all',
    orders: [],
    page: 1,
    hasMore: true,
    loading: false,
    refreshing: false
  },

  onLoad() { this.loadOrders(); },

  onShow() { this.loadOrders(true); },

  onPullDownRefresh() {
    this.setData({ refreshing: true });
    this.loadOrders().then(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) this.loadOrders(false);
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab, page: 1 });
    this.loadOrders();
  },

  async loadOrders(reset = true) {
    if (this.data.loading) return;
    const page = reset ? 1 : this.data.page;
    this.setData({ loading: true });

    try {
      const params = { page, pageSize: 10 };
      if (this.data.activeTab !== 'all') params.status = this.data.activeTab;

      const res = await api.order.getList(params);
      const list = (res.data?.list || res.data || []).map(item => ({
        ...item,
        statusText: util.orderStatusText(item.status),
        statusColor: util.orderStatusColor(item.status),
        createTime: util.formatDate(item.created_at, 'MM-DD HH:mm')
      }));
      const orders = reset ? list : [...this.data.orders, ...list];

      this.setData({
        orders, page: page + 1,
        hasMore: list.length >= 10,
        loading: false, refreshing: false
      });
    } catch (e) {
      console.error('加载订单失败:', e);
      this.setData({ loading: false, refreshing: false });
    }
  },

  goDetail(e) { wx.navigateTo({ url: '/pages/order/detail?id=' + e.currentTarget.dataset.id }); },

  async cancelOrder(e) {
    const id = e.currentTarget.dataset.id;
    const res = await new Promise(resolve => {
      wx.showModal({ title: '提示', content: '确定要取消此订单吗？', success: resolve });
    });
    if (res.confirm) {
      try {
        await api.order.cancel(id);
        wx.showToast({ title: '已取消', icon: 'success' });
        this.loadOrders();
      } catch (e) { console.error(e); }
    }
  },

  async confirmOrder(e) {
    const id = e.currentTarget.dataset.id;
    const res = await new Promise(resolve => {
      wx.showModal({ title: '提示', content: '确认已收到商品？', success: resolve });
    });
    if (res.confirm) {
      try {
        await api.order.confirm(id);
        wx.showToast({ title: '已确认收货', icon: 'success' });
        this.loadOrders();
      } catch (e) { console.error(e); }
    }
  },

  goShopping() { wx.switchTab({ url: '/pages/goods/index' }); }
});
