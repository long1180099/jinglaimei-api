var api = require('../../utils/api');

Page({
  data: {
    id: null,
    detail: null,
    htmlContent: '',
    categoryColor: '#1890ff',
    categoryLabel: '公告',
    loading: true
  },

  onLoad: function(options) {
    if (options.id) {
      this.setData({ id: options.id });
      this.loadDetail(options.id);
    }
  },

  onShareAppMessage: function() {
    if (this.data.detail) {
      return {
        title: this.data.detail.title,
        path: '/pages/news/detail?id=' + this.data.id
      };
    }
    return { title: '静莱美公告', path: '/pages/index/index' };
  },

  loadDetail: function(id) {
    var that = this;
    that.setData({ loading: true });
    api.announcement.getDetail(id).then(function(res) {
      var detail = res.data || {};

      // 分类映射
      var categoryMap = {
        notice: { label: '公告', color: '#e94560' },
        activity: { label: '活动', color: '#faad14' },
        update: { label: '更新', color: '#52c41a' },
        policy: { label: '政策', color: '#1890ff' },
        news: { label: '资讯', color: '#722ed1' }
      };
      var cat = categoryMap[detail.category] || categoryMap.notice;

      // 将纯文本转换为HTML（保留换行）
      var htmlContent = detail.content || '';
      if (htmlContent.indexOf('<') === -1) {
        htmlContent = htmlContent
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\n/g, '<br/>');
      }

      // 设置导航栏标题
      wx.setNavigationBarTitle({ title: detail.title || '公告详情' });

      that.setData({
        detail: detail,
        htmlContent: htmlContent,
        categoryColor: cat.color,
        categoryLabel: cat.label,
        loading: false
      });
    }).catch(function(e) {
      console.error('加载公告详情失败:', e);
      that.setData({ loading: false });
    });
  }
});
