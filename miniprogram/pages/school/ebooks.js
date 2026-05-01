const api = require('../../utils/api');
const util = require('../../utils/util');
const store = require('../../utils/store');

Page({
  data: {
    books: [],
    loading: false,
    loaded: false,
    isLoggedIn: false,
    activeTab: 'all',
    tabs: [],
    page: 1,
    hasMore: true,
    keyword: '',
    showSearch: false,
    categories: [],
    selectedCategory: '',
    myStats: null
  },

  onLoad() {
    this.loadCategories();
    this.loadBooks();
  },

  onShow() {
    if (this.data.loaded) {
      this.setData({ page: 1, hasMore: true });
      if (this.data.activeTab === 'my' || this.data.activeTab === 'favorites') {
        this.loadBooks();
      } else {
        this.loadBooks();
      }
    }
  },

  onPullDownRefresh() {
    this.setData({ page: 1, hasMore: true });
    this.loadBooks().then(function() { wx.stopPullDownRefresh(); });
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.setData({ page: this.data.page + 1 });
      this.loadMore();
    }
  },

  // 加载分类列表
  loadCategories() {
    var that = this;
    api.ebook.getCategories().then(function(res) {
      var cats = res.data || [];
      var tabs = [
        { key: 'all', label: '全部' },
        { key: 'favorites', label: '我的收藏' },
        { key: 'my', label: '我的书架' }
      ];
      // 把分类Tab追加到"全部"后面
      cats.forEach(function(c) {
        tabs.push({ key: 'cat_' + c.id, label: c.icon + ' ' + c.name, catName: c.name });
      });
      that.setData({ categories: cats, tabs: tabs });
    }).catch(function() {});
  },

  switchTab(e) {
    var key = e.currentTarget.dataset.key;
    var catName = e.currentTarget.dataset.catname || '';
    this.setData({
      activeTab: key,
      books: [],
      page: 1,
      hasMore: true,
      selectedCategory: catName
    });
    this.loadBooks();
  },

  async loadBooks() {
    if (!util.checkLoginSilent()) {
      this.setData({ isLoggedIn: false, loading: false, loaded: true });
      return;
    }
    this.setData({ isLoggedIn: true, loading: true });

    var params = { page: this.data.page, pageSize: 10 };

    if (this.data.activeTab === 'favorites') {
      params.tab = 'favorites';
    } else if (this.data.activeTab === 'my') {
      // 我的书架走my-progress接口
      this.setData({ loading: false });
      this.loadMyBooks();
      return;
    } else if (this.data.activeTab.indexOf('cat_') === 0) {
      params.category = this.data.selectedCategory;
    }

    if (this.data.keyword) {
      params.keyword = this.data.keyword;
    }

    var that = this;
    try {
      var res = await api.ebook.getList(params);
      var list = res.data && res.data.list ? res.data.list : [];
      that.setData({
        books: that.data.page === 1 ? list : that.data.books.concat(list),
        loading: false,
        loaded: true,
        hasMore: list.length >= 10
      });
    } catch (e) {
      that.setData({ loading: false, loaded: true });
    }
  },

  async loadMore() {
    var params = { page: this.data.page, pageSize: 10 };
    if (this.data.activeTab === 'favorites') {
      params.tab = 'favorites';
    } else if (this.data.activeTab.indexOf('cat_') === 0) {
      params.category = this.data.selectedCategory;
    }
    if (this.data.keyword) {
      params.keyword = this.data.keyword;
    }
    try {
      var res = await api.ebook.getList(params);
      var list = res.data && res.data.list ? res.data.list : [];
      this.setData({
        books: this.data.books.concat(list),
        hasMore: list.length >= 10
      });
    } catch (e) {}
  },

  async loadMyBooks() {
    if (!util.checkLoginSilent()) return;
    this.setData({ loading: true });
    try {
      var res = await api.ebook.getMyProgress();
      var list = res.data || [];
      this.setData({ books: list, loading: false, loaded: true });
    } catch (e) {
      this.setData({ loading: false, loaded: true });
    }
  },

  // 搜索
  toggleSearch() {
    this.setData({ showSearch: !this.data.showSearch, keyword: '' });
    if (this.data.showSearch === false) {
      this.setData({ page: 1, hasMore: true });
      this.loadBooks();
    }
  },

  onSearchInput(e) {
    this.setData({ keyword: e.detail.value });
  },

  doSearch() {
    this.setData({ page: 1, hasMore: true, books: [] });
    this.loadBooks();
  },

  clearSearch() {
    this.setData({ keyword: '', page: 1, hasMore: true, books: [] });
    this.loadBooks();
  },

  // 收藏/取消收藏
  toggleFavorite(e) {
    var id = e.currentTarget.dataset.id;
    var index = e.currentTarget.dataset.index;
    var that = this;
    var book = that.data.books[index];
    var favorited = book.is_favorited;

    api.ebook.toggleFavorite(id).then(function(res) {
      var newFav = res.data && res.data.favorited;
      var books = 'books[' + index + '].is_favorited';
      that.setData({
        [books]: newFav
      });
      wx.showToast({ title: newFav ? '已收藏' : '已取消收藏', icon: 'none' });
    }).catch(function() {
      wx.showToast({ title: '操作失败', icon: 'none' });
    });
  },

  goRead(e) {
    var id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/school/ebook-reader?id=' + id });
  },

  goLogin() {
    wx.navigateTo({ url: '/pages/login/login' });
  },

  onShareAppMessage() {
    return { title: '静莱美商学院 - 精选电子书', path: '/pages/school/ebooks' };
  }
});
