var api = require('../../utils/api');
var store = require('../../utils/store');
var util = require('../../utils/util');

Page({
  data: {
    banners: [],
    hotProducts: [],
    newProducts: [],
    notice: '',
    announcements: [],
    topAnnouncement: null,
    announcementList: [],
    rankingList: [],      // 业绩排行榜
    rankingLoaded: false,
    loading: true
  },

  onLoad: function() {
    this.loadHomeData();
  },

  onShow: function() {
    this.updateCartBadge();
  },

  onPullDownRefresh: function() {
    var that = this;
    that.loadHomeData(function() {
      wx.stopPullDownRefresh();
    });
  },

  onShareAppMessage: function() {
    return {
      title: '静莱美 - 品质美妆代理商平台',
      path: '/pages/index/index'
    };
  },

  updateCartBadge: function() {
    var count = store.getCartCount();
    if (count > 0) {
      wx.setTabBarBadge({ index: 1, text: count > 99 ? '99+' : String(count) });
    } else {
      wx.removeTabBarBadge({ index: 1 });
    }
  },

  // 下载图片到本地（解决真机调试<image>组件无法加载HTTP图片的问题）
  downloadImage: function(url, callback) {
    if (!url || url.indexOf('http') !== 0) { callback(url); return; }
    wx.downloadFile({
      url: url,
      success: function(res) {
        if (res.statusCode === 200 && res.tempFilePath) {
          callback(res.tempFilePath);
        } else {
          callback(url);
        }
      },
      fail: function() {
        callback(url);
      }
    });
  },

  loadHomeData: function(callback) {
    var that = this;
    that.setData({ loading: true });

    // 加载首页数据
    api.home.getData().then(function(res) {
      var data = res.data || {};
      var banners = data.banners || data.bannerList || [];
      var hotProducts = data.hotProducts || data.hotList || data.hot || [];
      var newProducts = data.newProducts || data.newList || data.new || [];

      // 修复图片URL + 字段同步
      function fixProductImages(list) {
        for (var i = 0; i < list.length; i++) {
          if (list[i].main_image) list[i].main_image = api.fixImageUrl(list[i].main_image);
          if (list[i].image) list[i].image = api.fixImageUrl(list[i].image);
          if (!list[i].main_image && list[i].image) {
            list[i].main_image = list[i].image;
          }
          if (list[i].images) {
            if (typeof list[i].images === 'string') {
              list[i].images = api.fixImageUrl(list[i].images);
            } else if (Array.isArray(list[i].images)) {
              for (var j = 0; j < list[i].images.length; j++) {
                if (typeof list[i].images[j] === 'string') {
                  list[i].images[j] = api.fixImageUrl(list[i].images[j]);
                }
              }
            }
          }
        }
        return list;
      }

      var fixedHot = fixProductImages(hotProducts).slice(0, 10);
      var fixedNew = fixProductImages(newProducts).slice(0, 6);

      that.setData({
        banners: banners,
        hotProducts: fixedHot,
        newProducts: fixedNew,
        notice: data.notice || data.announcement || '欢迎来到静莱美，品质生活从这里开始！'
      });

      // 异步预下载图片，替换为本地临时路径（解决<image>组件HTTP加载问题）
      setTimeout(function() {
        for (var k = 0; k < fixedHot.length; k++) {
          if (fixedHot[k].main_image && fixedHot[k].main_image.indexOf('http://') === 0) {
            (function(idx, imgUrl) {
              wx.downloadFile({
                url: imgUrl,
                success: function(r) {
                  if (r.statusCode === 200 && r.tempFilePath) {
                    var hotList = that.data.hotProducts;
                    hotList[idx].__localImage = r.tempFilePath;
                    that.setData({ hotProducts: hotList });
                  }
                }
              });
            })(k, fixedHot[k].main_image);
          }
        }
        for (var m = 0; m < fixedNew.length; m++) {
          if (fixedNew[m].main_image && fixedNew[m].main_image.indexOf('http://') === 0) {
            (function(idx2, imgUrl2) {
              wx.downloadFile({
                url: imgUrl2,
                success: function(r2) {
                  if (r2.statusCode === 200 && r2.tempFilePath) {
                    var newList = that.data.newProducts;
                    newList[idx2].__localImage = r2.tempFilePath;
                    that.setData({ newProducts: newList });
                  }
                }
              });
            })(m, fixedNew[m].main_image);
          }
        }
      }, 500);

    }).catch(function(e) {
      console.error('加载首页数据失败:', e);
    });

    // 加载公告数据
    api.announcement.getHomeList().then(function(newsRes) {
      var newsData = newsRes.data || [];
      if (!Array.isArray(newsData)) {
        newsData = newsData.list || newsData.items || [];
      }
      var topItem = null;
      for (var i = 0; i < newsData.length; i++) {
        if (newsData[i].is_top) { topItem = newsData[i]; break; }
      }
      if (!topItem && newsData.length > 0) { topItem = newsData[0]; }

      var list = [];
      if (topItem) {
        for (var j = 0; j < newsData.length; j++) {
          if (newsData[j].id !== topItem.id && list.length < 4) {
            list.push(newsData[j]);
          }
        }
      } else {
        list = newsData.slice(0, 4);
      }
      that.setData({
        announcements: newsData,
        topAnnouncement: topItem,
        announcementList: list,
        loading: false
      });

      if (callback) callback();
    }).catch(function(e) {
      console.error('加载公告数据失败:', e);
      that.setData({ loading: false });
      if (callback) callback();
    });

    // 加载业绩排行榜（公开接口，无需登录）
    api.team.getPublicRanking(8).then(function(rankRes) {
      var rankData = rankRes.list || [];
      if (!Array.isArray(rankData)) { rankData = []; }
      var list = rankData.map(function(r, idx) {
        return {
          id: r.id,
          avatar_url: r.avatar_url,
          nickname: r.nickname || r.username || r.real_name || '匿名用户',
          team_count: r.team_count || 0,
          total_income: parseFloat(r.total_income || r.month_income || 0).toFixed(2),
          rank: idx + 1,
          agent_level: r.agent_level || 1
        };
      }).slice(0, 8);

      that.setData({
        rankingList: list,
        rankingLoaded: true
      });
    }).catch(function(e) {
      console.error('加载排行榜失败:', e);
      that.setData({ rankingLoaded: true });
    });
  },

  goSearch: function() {
    wx.navigateTo({ url: '/pages/category/category?search=1' });
  },

  goCategory: function(e) {
    var id = e.currentTarget.dataset.id;
    if (id !== undefined && id !== '0') {
      wx.navigateTo({ url: '/pages/category/category?categoryId=' + id });
    } else {
      wx.switchTab({ url: '/pages/goods/index' });
    }
  },

  goSchool: function() {
    wx.switchTab({ url: '/pages/school/list' });
  },

  goSkinAnalysis: function() {
    wx.navigateTo({ url: '/pages/skin-analysis/analysis' });
  },

  goDetail: function(e) {
    var id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/product/detail?id=' + id });
  },

  addToCart: function(e) {
    if (!util.checkLogin()) { wx.showToast({ title: '请先登录', icon: 'none' }); return; }
    var item = e.currentTarget.dataset.item;
    var userInfo = store.getUserInfo();
    var level = userInfo ? (userInfo.agent_level || userInfo.agentLevel) : 1;
    var price = util.getPriceByLevel(item, level);
    item.price = price;
    store.addToCart(item);
    wx.showToast({ title: '已加入购物车', icon: 'success' });
    this.updateCartBadge();
  },

  onBannerTap: function(e) {
    var item = e.currentTarget.dataset.item;
    if (item && item.link_type === 'product' && item.link_id) {
      wx.navigateTo({ url: '/pages/product/detail?id=' + item.link_id });
    } else if (item && item.product_id) {
      wx.navigateTo({ url: '/pages/product/detail?id=' + item.product_id });
    }
  },

  goNewsDetail: function(e) {
    var id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/news/detail?id=' + id });
  },

  goNewsList: function() {
    wx.navigateTo({ url: '/pages/news/list' });
  },

  goRanking: function() {
    wx.setStorageSync('showGlobalRanking', '1');
    wx.switchTab({ url: '/pages/team/my-team' });
  },

  goActionLog: function() {
    wx.navigateTo({ url: '/pages/action-log/index' });
  }
});
