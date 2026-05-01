const api = require('../../utils/api');
var _baseRaw = api.BASE_URL || '';
var BASE = _baseRaw.replace(/\/api\/?$/, '');

Page({
  data: {
    bookId: '',
    bookTitle: '',
    bookAuthor: '',
    bookFormat: '',
    bookType: '',  // text or file
    content: '',   // TXT文本内容
    fileUrl: '',   // 文件URL (web-view直接预览或下载用)
    progress: 0,
    scrollTop: 0,
    fontSize: 32,
    lineHeight: 1.8,
    theme: 'light',
    themes: [
      { key: 'light', label: '☀️ 白天', bg: '#ffffff', color: '#333333' },
      { key: 'sepia', label: '📖 护眼', bg: '#f5e6ca', color: '#5b4636' },
      { key: 'dark', label: '🌙 夜间', bg: '#1a1a2e', color: '#e0e0e0' }
    ],
    loading: true,
    showSettings: false,
    showThemePicker: false,
    openFailed: false,
    isFavorited: false
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ bookId: options.id });
      this.loadBook(options.id);
    }
  },

  onUnload() {
    this.saveReadProgress();
  },

  onHide() {
    this.saveReadProgress();
  },

  async loadBook(id) {
    this.setData({ loading: true, openFailed: false });
    try {
      const res = await api.ebook.read(id);
      const data = res.data || {};
      const isText = data.type === 'text';
      // 文件URL: 用于下载打开或web-view预览
      const rawUrl = data.url || '';
      const fileUrl = isText ? '' : (BASE + rawUrl);
      const theme = wx.getStorageSync('ebook_theme') || 'light';
      const fontSize = wx.getStorageSync('ebook_fontSize') || 32;

      this.setData({
        bookTitle: data.title || '未知',
        bookAuthor: data.author || '',
        bookFormat: data.format || '',
        bookType: data.type || 'file',
        content: isText ? data.content : '',
        fileUrl,
        progress: data.readProgress || 0,
        theme,
        fontSize,
        loading: false
      });

      wx.setNavigationBarTitle({ title: data.title || '阅读' });

      // 获取收藏状态
      var that = this;
      api.ebook.getList({ page: 1, pageSize: 100 }).then(function(res) {
        var list = res.data && res.data.list ? res.data.list : [];
        var book = list.find(function(b) { return String(b.id) === String(id); });
        if (book) {
          that.setData({ isFavorited: !!book.is_favorited });
        }
      }).catch(function() {});

      // 恢复阅读位置 (仅文本模式)
      if (isText && data.readPosition > 0) {
        setTimeout(() => {
          this.setData({ scrollTop: data.readPosition });
        }, 500);
      }

      // PDF模式: 自动打开文档(在线阅读体验), 无需手动点下载
      if (!isText && fileUrl) {
        // 记录开始阅读
        api.ebook.saveProgress(id, { progress: 1 }).catch(() => {});
        // 自动下载并打开PDF
        this.autoOpenDocument(fileUrl);
      }
    } catch (e) {
      console.error('加载电子书失败:', e);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  /** 自动下载并打开文档(PDF在线阅读) */
  autoOpenDocument(url) {
    wx.showLoading({ title: '正在打开...' });
    wx.downloadFile({
      url: url,
      success: (res) => {
        wx.hideLoading();
        if (res.statusCode === 200) {
          wx.openDocument({
            filePath: res.tempFilePath,
            showMenu: true,  // 允许转发/分享
            success: () => {
              console.log('[ebook-reader] 文档已打开');
            },
            fail: (err) => {
              console.error('[ebook-reader] 打开失败:', err);
              this.setData({ openFailed: true });
              wx.showToast({ title: '打开失败，请重试', icon: 'none' });
            }
          });
        } else {
          wx.hideLoading();
          this.setData({ openFailed: true });
          wx.showToast({ title: '文件获取失败', icon: 'none' });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('[ebook-reader] 下载失败:', err);
        this.setData({ openFailed: true });
        wx.showToast({ title: '加载失败，请检查网络', icon: 'none' });
      }
    });
  },

  // 滚动事件，更新进度
  onPageScroll(e) {
    if (this.data.bookType !== 'text') return;
    const scrollTop = e.scrollTop;
    this.setData({ scrollTop });

    // 简单计算进度（估算）
    const query = wx.createSelectorQuery();
    query.select('.reader-content').boundingClientRect(rect => {
      if (rect && rect.height > 0) {
        const scrollHeight = rect.height;
        const windowHeight = wx.getSystemInfoSync().windowHeight;
        const progress = Math.min(100, Math.round((scrollTop / (scrollHeight - windowHeight)) * 100));
        if (progress > 0) {
          this.setData({ progress });
        }
      }
    }).exec();
  },

  // 自动保存进度（节流）
  saveTimer: null,
  saveReadProgress() {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      if (this.data.bookId && this.data.progress > 0) {
        api.ebook.saveProgress(this.data.bookId, {
          progress: this.data.progress,
          read_position: this.data.scrollTop
        }).catch(() => {});
      }
    }, 2000);
  },

  toggleSettings() {
    this.setData({ showSettings: !this.data.showSettings, showThemePicker: false });
  },

  toggleThemePicker() {
    this.setData({ showThemePicker: !this.data.showThemePicker });
  },

  changeTheme(e) {
    const theme = e.currentTarget.dataset.theme;
    this.setData({ theme, showThemePicker: false });
    wx.setStorageSync('ebook_theme', theme);
  },

  changeFontSize(e) {
    const delta = parseInt(e.currentTarget.dataset.delta);
    const fontSize = Math.max(24, Math.min(48, this.data.fontSize + delta));
    this.setData({ fontSize });
    wx.setStorageSync('ebook_fontSize', fontSize);
  },

  changeLineHeight(e) {
    const delta = parseFloat(e.currentTarget.dataset.delta);
    const lineHeight = Math.max(1.4, Math.min(2.4, +(this.data.lineHeight + delta).toFixed(1)));
    this.setData({ lineHeight });
  },

  // 收藏/取消收藏
  toggleFavorite() {
    var that = this;
    api.ebook.toggleFavorite(this.data.bookId).then(function(res) {
      var faved = res.data && res.data.favorited;
      that.setData({ isFavorited: faved });
      wx.showToast({ title: faved ? '已收藏' : '已取消收藏', icon: 'none' });
    }).catch(function() {
      wx.showToast({ title: '操作失败', icon: 'none' });
    });
  },

  // 下载文件（PDF等格式 - web-view预览失败时的降级方案）
  downloadBook() {
    if (!this.data.fileUrl) return;
    wx.showLoading({ title: '加载中...' });
    wx.downloadFile({
      url: this.data.fileUrl,
      success: (res) => {
        wx.hideLoading();
        if (res.statusCode === 200) {
          wx.openDocument({
            filePath: res.tempFilePath,
            showMenu: true,
            success: () => {},
            fail: () => {
              wx.showToast({ title: '打开文件失败', icon: 'none' });
            }
          });
        } else {
          wx.showToast({ title: '文件获取失败', icon: 'none' });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '下载失败', icon: 'none' });
      }
    });
  },

  // web-view 消息回调
  onWebMessage(e) {
    console.log('[ebook-reader] web-view message:', e.detail);
  },

  // web-view 加载错误 - 自动切换到手动打开模式
  onWebError(e) {
    console.error('[ebook-reader] web-view error:', e);
    this.setData({ openFailed: true, loading: false });
  },

  onShareAppMessage() {
    return {
      title: '推荐阅读：' + this.data.bookTitle,
      path: '/pages/school/ebook-reader?id=' + this.data.bookId
    };
  }
});
