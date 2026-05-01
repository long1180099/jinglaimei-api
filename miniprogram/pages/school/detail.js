/**
 * 课程详情 - 视频播放 + 章节列表 + 进度追踪
 */
const api = require('../../utils/api');
const store = require('../../utils/store');
const util = require('../../utils/util');

const TYPE_TEXTS = ['全部', '新手入门', '进阶课程', '实战案例', '专题讲座'];
const TYPE_COLORS = ['#e94560', '#52c41a', '#1890ff', '#e94560', '#ff9900'];
const DIFF_TEXTS = ['初级', '中级', '高级', '专家'];

Page({
  data: {
    course: null,
    chapters: [],
    currentChapter: 0,
    progress: 0,
    completedLessons: 0,
    totalLessons: 0,
    typeText: '',
    typeColor: '#e94560',
    diffText: '',
    isLoggedIn: false,
    loading: true,
    videoUrl: '',
    videoContext: null,
    isPlaying: false,
    videoProgress: 0,
    duration: 0,
    showChapterList: false,
    activeTab: 'intro', // intro | chapters | comments
  },

  _videoTimer: null,

  onLoad(options) {
    if (options && options.id) {
      this.courseId = options.id;
      this.isLoggedIn = store.isLoggedIn();
      this.setData({ isLoggedIn: this.isLoggedIn });
      this.loadCourse();
    }
  },

  onUnload() {
    // 页面卸载时保存进度
    this._saveProgress();
    if (this._videoTimer) clearInterval(this._videoTimer);
  },

  onHide() {
    this._saveProgress();
  },

  onShareAppMessage() {
    const c = this.data.course || {};
    return {
      title: c.course_title || c.title || '静莱美商学院课程推荐',
      path: '/pages/school/detail?id=' + this.courseId
    };
  },

  async loadCourse() {
    try {
      this.setData({ loading: true });
      const res = await api.school.getCourseDetail(this.courseId);
      const course = res.data || {};

      const typeIdx = course.course_type || 0;
      const title = course.course_title || course.title || '';
      const subtitle = course.course_subtitle || course.subtitle || '';
      const cover = course.cover_image || course.image || '';
      const videoUrl = course.video_url || '';

      // 解析章节
      let chapters = this._parseChapters(course.content);
      if (chapters.length === 0) {
        chapters = [{ title: '完整课程', duration: (course.required_time || 30) + '分钟' }];
      }

      // 学习进度
      const myProgress = course.myProgress || {};
      const progress = myProgress.progress_percent || myProgress.progress || 0;
      const totalLessons = chapters.length;
      const completedLessons = Math.floor((progress / 100) * totalLessons);
      const currentChapter = progress >= 100 ? 0 : Math.min(completedLessons, totalLessons - 1);

      this.setData({
        course: { ...course, title, subtitle, cover, videoUrl },
        chapters,
        currentChapter,
        progress: Math.round(progress),
        completedLessons,
        totalLessons,
        typeText: TYPE_TEXTS[typeIdx] || '其他',
        typeColor: TYPE_COLORS[typeIdx] || '#e94560',
        diffText: DIFF_TEXTS[(course.difficulty_level || 1) - 1] || '初级',
        videoUrl,
        loading: false,
        activeTab: videoUrl ? 'chapters' : 'intro',
      });

      // 如果有视频URL且有进度，自动定位到当前章节
      if (videoUrl && progress > 0 && progress < 100) {
        this._playChapter(currentChapter);
      }
    } catch (e) {
      console.error('加载课程失败:', e);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  _parseChapters(content) {
    if (!content) return [];
    try {
      const parsed = typeof content === 'string' ? JSON.parse(content) : content;
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    return [];
  },

  // ========== 视频播放 ==========

  onVideoPlay() {
    this.setData({ isPlaying: true });
    this._startProgressTimer();
  },

  onVideoPause() {
    this.setData({ isPlaying: false });
    this._saveProgress();
    if (this._videoTimer) clearInterval(this._videoTimer);
  },

  onVideoEnded() {
    this.setData({ isPlaying: false });
    if (this._videoTimer) clearInterval(this._videoTimer);

    // 标记当前章节完成，自动播放下一章
    const { currentChapter, totalLessons, completedLessons } = this.data;
    const newCompleted = Math.max(completedLessons, currentChapter + 1);

    if (currentChapter < totalLessons - 1) {
      // 自动播放下一章
      wx.showToast({ title: '自动播放下一节', icon: 'none' });
      setTimeout(() => {
        this._playChapter(currentChapter + 1);
      }, 1000);
    } else {
      // 全部完成
      this.setData({ completedLessons: totalLessons, progress: 100 });
      this._saveProgress();
      wx.showToast({ title: '🎉 课程完成！', icon: 'none' });
    }
  },

  onVideoTimeUpdate(e) {
    const { currentTime, duration } = e.detail;
    if (duration > 0) {
      const percent = Math.round((currentTime / duration) * 100);
      this.setData({
        videoProgress: percent,
        duration: Math.round(duration),
      });
    }
  },

  onVideoError(e) {
    console.error('视频播放错误:', e.detail);
    wx.showToast({ title: '视频加载失败', icon: 'none' });
  },

  _startProgressTimer() {
    if (this._videoTimer) clearInterval(this._videoTimer);
    this._videoTimer = setInterval(() => {
      this._saveProgress();
    }, 10000); // 每10秒自动保存一次
  },

  _playChapter(index) {
    const { chapters, videoUrl } = this.data;
    this.setData({ currentChapter: index, showChapterList: false });

    // 如果每个章节有独立的video_url
    const chapter = chapters[index];
    if (chapter && chapter.video_url) {
      this.setData({ videoUrl: chapter.video_url });
    } else {
      // 使用课程统一视频
      this.setData({ videoUrl });
    }

    // 更新进度
    const newCompleted = Math.max(this.data.completedLessons, index);
    this.setData({ completedLessons: Math.min(newCompleted, this.data.totalLessons) });
    this._updateProgress();
  },

  _updateProgress() {
    if (!this.isLoggedIn) return;
    const total = this.data.totalLessons || 1;
    const progress = Math.min(100, Math.round((this.data.completedLessons / total) * 100));
    this.setData({ progress });
  },

  _saveProgress() {
    if (!this.isLoggedIn || !this.courseId) return;
    const { progress, videoProgress } = this.data;
    const finalProgress = Math.max(progress, videoProgress);
    if (finalProgress <= 0) return;

    api.school.updateProgress({
      course_id: parseInt(this.courseId),
      progress: finalProgress,
      progress_percent: finalProgress,
      completed_lessons: this.data.completedLessons,
    }).catch(() => {});
  },

  // ========== 章节列表 ==========

  selectChapter(e) {
    const index = e.currentTarget.dataset.index;
    if (!util.checkLogin()) { wx.showToast({ title: '请先登录', icon: 'none' }); return; }
    this.setData({ isLoggedIn: true });
    this._playChapter(index);
  },

  toggleChapterList() {
    this.setData({ showChapterList: !this.data.showChapterList });
  },

  // ========== Tab切换 ==========

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
  },

  // ========== 操作按钮 ==========

  startLearning() {
    if (!util.checkLogin()) { wx.showToast({ title: '请先登录', icon: 'none' }); return; }
    this.setData({ isLoggedIn: true });
    this._playChapter(0);
  },

  continueLearning() {
    if (!util.checkLogin()) { wx.showToast({ title: '请先登录', icon: 'none' }); return; }
    const idx = this.data.completedLessons > 0 ? this.data.completedLessons : 0;
    this._playChapter(Math.min(idx, this.data.totalLessons - 1));
  },

  collectCourse() {
    wx.showToast({ title: '已收藏', icon: 'success' });
  },

  shareCourse() {
    wx.showModal({
      title: '分享课程',
      content: '课程链接已复制，快分享给好友吧！',
      showCancel: false
    });
  },

  goBack() {
    wx.navigateBack();
  }
});
