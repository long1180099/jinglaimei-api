/**
 * 静莱美代理商系统 - 小程序公共请求模块
 *
 * 环境自动切换：
 *   - 开发者工具模拟器 → http://192.168.3.111:4000/api（局域网IP，模拟器也能用）
 *   - 注意：IP地址会随WiFi网络变化，连不上时执行 `ipconfig getifaddr en0` 检查当前IP
 *   - 真机调试/体验版/正式版 → 按环境分别配置
 *
 * 【注意】真机调试时确保手机和电脑在同一WiFi，且本地后端4000端口已启动
 */
var __envVersion = '';
try {
  var __wxConfig = wx.getAccountInfoSync ? wx.getAccountInfoSync() : null;
  __envVersion = (__wxConfig && __wxConfig.miniProgram && __wxConfig.miniProgram.envVersion) || '';
} catch(e) {
  __envVersion = 'unknown';
}

// 局域网地址（开发/真机调试用）— ⚠️ IP变化时修改这里，运行 `ipconfig getifaddr en0` 查本机IP
var __lanHost = '192.168.3.111:4000';
var __lanUrl = 'http://' + __lanHost + '/api';
// 生产地址（备案已通过，使用自有域名）
var __prodUrl = 'https://api.jinglaimei.com/api';
var __prodHost = 'https://api.jinglaimei.com';

// ⚠️ 切换开关：true=走正式服务器（推荐，图片/接口都走HTTPS），false=走本地后端
var __useProd = true;

var BASE_URL;
if (__envVersion === 'release' || __useProd) {
  // 正式版 或 开启了 prod 开关：走生产服务器
  BASE_URL = __prodUrl;
} else {
  // develop / trial / experience 全部走局域网本地后端
  BASE_URL = __lanUrl;
}
const envVersion = __envVersion;

// 环境日志（仅开发环境输出）
if (__envVersion === 'develop') {
  console.log('[API] 环境:', envVersion, '| 地址:', BASE_URL);
}

const getBaseUrl = () => BASE_URL;

/**
 * 修复图片URL：将后端返回的 localhost 或旧云托管地址替换为当前可访问的地址
 * 问题：商品图片可能存的是 localhost、旧云托管地址或正式域名
 */
function fixImageUrl(url) {
  if (!url) return url;
  if (typeof url !== 'string') return url;
  // 走生产环境（正式版或开启了 prod 开关）
  if (__envVersion === 'release' || __useProd) {
    return url
      .replace(/http:\/\/localhost:4000/g, __prodHost)
      .replace(/http:\/\/\d+\.\d+\.\d+\.\d+:\d+/g, __prodHost)
      .replace(/https:\/\/express-co3x-247037-8-1422673068\.sh\.run\.tcloudbase\.com/g, __prodHost);
  }
  // 开发环境（局域网）：替换为局域网地址
  return url
    .replace(/http:\/\/localhost:4000/g, 'http://' + __lanHost)
    .replace(/https:\/\/api\.jinglaimei\.com/g, 'http://' + __lanHost);
}

/**
 * 封装请求
 * @param {string} url - 请求路径
 * @param {string} method - HTTP方法
 * @param {object} data - 请求数据
 * @param {boolean} needAuth - 是否需要携带token (默认true)
 * @param {boolean} silent - 是否静默模式(不弹toast) (默认false)
 * @param {boolean} softAuth - 软认证模式: 携带token但401时不清除登录态(默认false)
 *                          适用于辅助性数据(如团队页的收益概览), 避免因辅助接口过期导致主流程登录态被清掉
 */
function request(url, method = 'GET', data = {}, needAuth = true, silent = false, softAuth = false) {
  return new Promise((resolve, reject) => {
    const header = {
      'Content-Type': 'application/json',
      'X-Client': 'miniprogram'
    };

    // 添加token
    if (needAuth) {
      const token = wx.getStorageSync('token');
      if (token) {
        header['Authorization'] = 'Bearer ' + token;
      }
    }

    wx.request({
      url: BASE_URL + url,
      method,
      data,
      header,
      timeout: 60000,
      success(res) {
        if (res.statusCode === 401) {
          if (softAuth) {
            // 软认证模式：不清除登录态，仅静默reject，避免影响其他并发请求
            reject(new Error('SOFT_AUTH_401'));
            return;
          }
          // token过期，清除登录态
          wx.removeStorageSync('token');
          wx.removeStorageSync('userInfo');
          // 不再强制跳转登录页（满足微信审核要求）
          // 仅清除登录态，让用户自行决定何时登录
          reject(new Error('登录已过期'));
          return;
        }
        if (res.data && res.data.code === 0) {
          resolve(res.data);
        } else {
          var msg = (res.data && res.data.message) || '请求失败';
          if (!silent) { wx.showToast({ title: msg, icon: 'none' }); }
          reject(new Error(msg));
        }
      },
      fail(err) {
        console.error('请求失败:', url);
        // 网络异常时友好提示，不暴露内部URL和错误详情
        if (!silent) {
          wx.showToast({ title: '网络异常，请检查网络连接', icon: 'none' });
        }
        reject(err);
      }
    });
  });
}

// ==================== 认证相关 ====================
const auth = {
  // 微信登录
  wxLogin(code, userInfo) {
    return request('/mp/wx-login', 'POST', {
      code,
      nickname: userInfo.nickName,
      avatarUrl: userInfo.avatarUrl,
      gender: userInfo.gender
    }, false);
  },

  // 微信手机号快捷登录（真机版）
  wxPhoneLogin(code, extra = {}) {
    return request('/mp/wx-phone-login', 'POST', { code, ...extra }, false);
  },

  // 手机号登录（手机号+验证码，可选邀请码）
  phoneLogin(phone, code, invite_code) {
    const data = { phone, code };
    if (invite_code) data.invite_code = invite_code;
    return request('/mp/phone-login', 'POST', data, false);
  },

  // 发送短信验证码
  sendSmsCode(phone) {
    return request('/mp/send-sms', 'POST', { phone }, false);
  },

  // 绑定手机号
  bindPhone(phone, code) {
    return request('/mp/bind-phone', 'POST', { phone, code });
  },

  // 更新资料
  updateProfile(data) {
    return request('/mp/profile', 'PUT', data);
  },

  // 申请代理
  applyAgent(data) {
    return request('/mp/apply-agent', 'POST', data);
  },

  // 通过邀请码绑定上级
  bindInviteCode(invite_code) {
    return request('/mp/bind-invite-code', 'POST', { invite_code });
  }
};

// ==================== 首页 ====================
const home = {
  getData() {
    return request('/mp/home', 'GET', {}, false);
  }
};

// ==================== 商品 ====================
const product = {
  getList(params = {}) {
    return request('/mp/products', 'GET', params, false);
  },
  getDetail(id) {
    return request('/mp/products/' + id, 'GET', {}, false);
  },
  getCategories() {
    return request('/mp/categories', 'GET', {}, false);
  }
};

// ==================== 订单 ====================
const order = {
  create(data) {
    return request('/mp/orders', 'POST', data);
  },
  getList(params = {}) {
    return request('/mp/orders', 'GET', params);
  },
  getDetail(id) {
    return request('/mp/orders/' + id, 'GET');
  },
  confirm(id) {
    return request('/mp/orders/' + id + '/confirm', 'POST');
  },
  cancel(id) {
    return request('/mp/orders/' + id + '/cancel', 'POST');
  }
};

// ==================== 收益 ====================
const income = {
  getOverview() {
    return request('/mp/income', 'GET', {}, true, false, true);
  },
  getRecords(params = {}) {
    return request('/mp/income/records', 'GET', params, true, false, true);
  },
  withdraw(data) {
    return request('/mp/income/withdraw', 'POST', data);
  },
  getWithdrawals(params = {}) {
    return request('/mp/income/withdrawals', 'GET', params, true, false, true);
  }
};

// ==================== 团队 ====================
const team = {
  getMyTeam() {
    return request('/mp/team', 'GET');
  },
  getTree() {
    return request('/mp/team/tree', 'GET');
  },
  // 公开业绩排行榜（无需登录，供首页展示）
  getPublicRanking(limit) {
    var url = '/mp/public/ranking?limit=' + (limit || 10);
    return request(url, 'GET', {}, false);
  },
  // 团队排行（需要登录，团队管理页使用）
  getRanking() {
    return request('/mp/team/ranking', 'GET');
  }
};

// ==================== 商学院 ====================
const school = {
  getCourses(params = {}) {
    return request('/mp/school/courses', 'GET', params, false);
  },
  getCourseDetail(id) {
    return request('/mp/school/courses/' + id, 'GET', {}, false);
  },
  updateProgress(data) {
    return request('/mp/school/progress', 'POST', data);
  },
  getMyCourses() {
    return request('/mp/school/my-courses', 'GET');
  }
};

// ==================== 电子书 ====================
const ebook = {
  getList(params = {}) {
    return request('/mp/books', 'GET', params);
  },
  read(id) {
    return request('/mp/books/' + id + '/read', 'GET');
  },
  saveProgress(id, data) {
    return request('/mp/books/' + id + '/progress', 'POST', data);
  },
  getMyProgress() {
    return request('/mp/books/my-progress', 'GET');
  },
  // 收藏/取消收藏
  toggleFavorite(id) {
    return request('/mp/books/' + id + '/favorite', 'POST');
  },
  // 获取电子书分类列表
  getCategories() {
    return request('/mp/books/categories', 'GET');
  },
  // 获取阅读统计
  getStats() {
    return request('/mp/books/stats', 'GET');
  }
};

// ==================== 行动日志 ====================
const actionLog = {
  // 年度目标
  getAnnualGoals() {
    return request('/mp/action-log/annual-goals', 'GET');
  },
  saveAnnualGoal(data) {
    return request('/mp/action-log/annual-goals', 'POST', data);
  },
  updateGoal(id, data) {
    return request('/mp/action-log/goals/' + id, 'PUT', data);
  },
  deleteGoal(id) {
    return request('/mp/action-log/goals/' + id, 'DELETE');
  },
  // 每日日志
  getDailyLogs(params = {}) {
    return request('/mp/action-log/daily', 'GET', params);
  },
  getTodayLog() {
    return request('/mp/action-log/daily/today', 'GET');
  },
  saveDailyLog(data) {
    return request('/mp/action-log/daily', 'POST', data);
  },
  // 月度追踪
  getMonthlyTracking(params = {}) {
    return request('/mp/action-log/monthly-tracking', 'GET', params);
  },
  // 承诺书
  getCommitments() {
    return request('/mp/action-log/commitments', 'GET');
  },
  createCommitment(data) {
    return request('/mp/action-log/commitments', 'POST', data);
  },
  checkinCommitment(id, data = {}) {
    return request('/mp/action-log/commitments/' + id + '/checkin', 'POST', data);
  },
  // 月度目标
  getMonthlyGoals(params) {
    return request('/mp/action-log/monthly-goals', 'GET', params);
  },
  saveMonthlyGoal(data) {
    return request('/mp/action-log/monthly-goals', 'POST', data);
  },
  deleteMonthlyGoal(id) {
    return request('/mp/action-log/monthly-goals/' + id, 'DELETE');
  },
  // 周目标
  getWeeklyGoals(params) {
    return request('/mp/action-log/weekly-goals', 'GET', params);
  },
  saveWeeklyGoal(data) {
    return request('/mp/action-log/weekly-goals', 'POST', data);
  },
  toggleWeeklyGoalComplete(id) {
    return request('/mp/action-log/weekly-goals/' + id + '/complete', 'PUT');
  },
  deleteWeeklyGoal(id) {
    return request('/mp/action-log/weekly-goals/' + id, 'DELETE');
  },
  saveWeeklySummary(data) {
    return request('/mp/action-log/weekly-summary', 'POST', data);
  },
  // 日目标详情
  getDailyDetail(params) {
    return request('/mp/action-log/daily/detail', 'GET', params);
  },
  toggleDailyItemComplete(id) {
    return request('/mp/action-log/daily-items/' + id + '/complete', 'PUT');
  },
  deleteDailyItem(id) {
    return request('/mp/action-log/daily-items/' + id, 'DELETE');
  },
  // 月度追踪保存
  saveMonthlyTracking(data) {
    return request('/mp/action-log/monthly-tracking', 'POST', data);
  },
  // 承诺书补充
  deleteCommitment(id) {
    return request('/mp/action-log/commitments/' + id, 'DELETE');
  },
  // 学习积分（支持静默模式）
  getStudyPoints(silent) {
    return request('/mp/study-points/overview', 'GET', {}, true, !!silent);
  },
  getStudyRanking() {
    return request('/mp/study-points/ranking', 'GET');
  }
};

// ==================== 公告资讯 ====================
const announcement = {
  // 首页精简列表（置顶+最新5条）
  getHomeList() {
    return request('/mp/announcements-home', 'GET', {}, false);
  },
  // 完整列表（分页/分类筛选）
  getList(params = {}) {
    return request('/mp/announcements', 'GET', params, false);
  },
  // 详情
  getDetail(id) {
    return request('/mp/announcements/' + id, 'GET', {}, false);
  }
};

// ==================== 性格色彩 ====================
const personality = {
  getOverview(params = {}) {
    return request('/mp/personality/overview', 'GET', params, false);
  },
  getScripts(params = {}) {
    return request('/mp/personality/scripts', 'GET', params);
  },
  // AI生成个性化话术
  generateScript(data) {
    return request('/mp/personality/scripts/generate', 'POST', data);
  },
  toggleFavorite(id) {
    return request('/mp/personality/scripts/' + id + '/favorite', 'POST');
  },
  getMyFavorites() {
    return request('/mp/personality/my-favorites', 'GET');
  }
};

// ==================== AI营销海报 ====================
const poster = {
  getQuotes(type = 'all') {
    return request('/mp/poster/quotes', 'GET', type ? { type } : {});
  },
  getStyles() {
    return request('/mp/poster/styles', 'GET');
  },
  generate(params) {
    return request('/mp/poster/generate', 'POST', params);
  },
  randomGenerate(style) {
    var url = '/mp/poster/random' + (style ? '?style=' + style : '');
    return request(url, 'POST', {}, false, false);
  }
};

// ==================== 视频学习系统 ====================
const video = {
  // 获取视频分类
  getCategories() {
    return request('/mp/videos/categories', 'GET', {}, false);
  },
  // 视频列表（支持tab/分类/搜索）
  getList(params = {}) {
    return request('/mp/videos', 'GET', params);
  },
  // 视频详情
  getDetail(id) {
    return request('/mp/videos/' + id, 'GET');
  },
  // 购买视频
  buy(id) {
    return request('/mp/videos/' + id + '/buy', 'POST', {});
  },
  // 保存播放进度
  saveProgress(id, data) {
    return request('/mp/videos/' + id + '/progress', 'POST', data);
  },
  // 系列课列表
  getSeriesList(params = {}) {
    return request('/mp/videos/series-list', 'GET', params);
  },
  // 系列课详情
  getSeriesDetail(id) {
    return request('/mp/videos/series-list/' + id, 'GET');
  },
  // 购买系列课
  buySeries(id) {
    return request('/mp/videos/series-list/' + id + '/buy', 'POST', {});
  },
  // 我的学习中心
  getLearningCenter() {
    return request('/mp/videos/learning-center', 'GET');
  },
  // 我的笔记
  getMyNotes() {
    return request('/mp/videos/my-notes', 'GET');
  },
  // 保存笔记
  saveNotes(id, notes) {
    return request('/mp/videos/' + id + '/notes', 'POST', { notes: notes });
  },
  // 搜索视频
  search(params) {
    return request('/mp/videos/search', 'GET', params);
  }
};

module.exports = {
  request,
  auth,
  home,
  product,
  order,
  income,
  team,
  school,
  ebook,
  actionLog,
  personality,
  announcement,
  poster,
  video,
  BASE_URL,
  getBaseUrl,
  fixImageUrl
};
