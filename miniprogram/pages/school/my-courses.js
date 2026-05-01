/**
 * 视频学习中心 - 课程列表页
 * 分类筛选 + 搜索 + 课程卡片
 */
const api = require('../../utils/api');
const util = require('../../utils/util');

const TYPE_TABS = [
  { key: 0, name: '全部', icon: '📚' },
  { key: 1, name: '新手入门', icon: '🌱' },
  { key: 2, name: '进阶课程', icon: '📈' },
  { key: 3, name: '实战案例', icon: '🎯' },
  { key: 4, name: '专题讲座', icon: '🎓' },
];

const TYPE_COLORS = {
  0: '#e94560',
  1: '#52c41a',
  2: '#1890ff',
  3: '#e94560',
  4: '#ff9900',
};

Page({
  data: {
    tabs: TYPE_TABS,
    activeTab: 0,
    courses: [],
    page: 1,
    pageSize: 10,
    total: 0,
    loading: false,
    loaded: false,
    keyword: '',
    showSearch: false,
  },

  onLoad() {
    this.loadCourses(true);
  },

  onShow() {
    // 每次显示刷新列表（可能从详情页返回，进度有变化）
    this.loadCourses(true);
  },

  onPullDownRefresh() {
    this.setData({ page: 1 });
    this.loadCourses(true).then(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    if (this.data.loading) return;
    const { page, pageSize, total } = this.data;
    if (page * pageSize < total) {
      this.setData({ page: page + 1 });
      this.loadCourses(false);
    }
  },

  // 切换分类Tab
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    if (this.data.activeTab === tab.key) return;
    this.setData({ activeTab: tab.key, page: 1, courses: [] });
    this.loadCourses(true);
  },

  // 搜索相关
  toggleSearch() {
    this.setData({ showSearch: !this.data.showSearch, keyword: '' });
    if (!this.data.showSearch) {
      this.setData({ page: 1, courses: [] });
      this.loadCourses(true);
    }
  },

  onSearchInput(e) {
    this.setData({ keyword: e.detail.value });
  },

  doSearch() {
    this.setData({ page: 1, courses: [] });
    this.loadCourses(true);
  },

  clearSearch() {
    this.setData({ keyword: '', page: 1, courses: [] });
    this.loadCourses(true);
  },

  // 加载课程列表
  async loadCourses(reset = false) {
    if (this.data.loading) return;
    this.setData({ loading: true });

    try {
      const params = {
        page: this.data.page,
        pageSize: this.data.pageSize,
      };
      if (this.data.activeTab > 0) params.type = this.data.activeTab;
      if (this.data.keyword) params.keyword = this.data.keyword;

      const res = await api.school.getCourses(params);
      const newList = (res.data?.list || res.data || []).map(item => {
        const chapters = this._parseChapters(item.content);
        return {
          ...item,
          title: item.course_title || item.title,
          subtitle: item.course_subtitle || '',
          cover: item.cover_image || '',
          videoUrl: item.video_url || '',
          chapters: chapters,
          totalLessons: chapters.length || 1,
          progress: item.progress || 0,
          typeText: TYPE_TABS[item.course_type || 0]?.name || '其他',
          typeColor: TYPE_COLORS[item.course_type || 0] || '#e94560',
          difficultyText: ['初级', '中级', '高级', '专家'][item.difficulty_level - 1] || '初级',
        };
      });

      const courses = reset ? newList : this.data.courses.concat(newList);
      const total = res.data?.total || newList.length;

      this.setData({ courses, total, loading: false, loaded: true });
    } catch (e) {
      console.error('加载课程失败:', e);
      this.setData({ loading: false, loaded: true });
    }
  },

  // 解析课程章节
  _parseChapters(content) {
    if (!content) return [];
    try {
      const parsed = typeof content === 'string' ? JSON.parse(content) : content;
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    return [];
  },

  // 进入课程详情
  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/school/detail?id=' + id });
  },

  // 返回商学院首页
  goBack() {
    wx.navigateBack();
  },

  onShareAppMessage() {
    return {
      title: '静莱美商学院 - 精选视频课程',
      path: '/pages/school/my-courses'
    };
  }
});
