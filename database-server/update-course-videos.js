/**
 * 为商学院课程补充视频URL和章节内容
 * 运行: node database-server/update-course-videos.js
 */
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'jinglaimei.db');
const db = new Database(DB_PATH);

// 更新课程 - 添加video_url和content(章节JSON)
const updates = [
  {
    id: 1,
    video_url: 'https://video-cdn.jinglaimei.com/courses/course-01-intro.mp4',
    content: JSON.stringify([
      { title: '第1课：了解静莱美品牌', duration: '8分钟' },
      { title: '第2课：产品体系全景图', duration: '10分钟' },
      { title: '第3课：新手第一步做什么', duration: '12分钟' },
      { title: '第4课：寻找你的第一批客户', duration: '15分钟' },
    ])
  },
  {
    id: 2,
    video_url: 'https://video-cdn.jinglaimei.com/courses/course-02-wechat.mp4',
    content: JSON.stringify([
      { title: '第1课：朋友圈运营基础', duration: '10分钟' },
      { title: '第2课：爆款文案的5个公式', duration: '12分钟' },
      { title: '第3课：图片拍摄与美化技巧', duration: '15分钟' },
      { title: '第4课：互动与评论管理', duration: '10分钟' },
      { title: '第5课：私域流量转化方法', duration: '13分钟' },
    ])
  },
  {
    id: 3,
    video_url: 'https://video-cdn.jinglaimei.com/courses/course-03-team.mp4',
    content: JSON.stringify([
      { title: '第1课：从个人到团队的思维转变', duration: '12分钟' },
      { title: '第2课：如何招募到优质代理', duration: '15分钟' },
      { title: '第3课：新人带教SOP', duration: '18分钟' },
      { title: '第4课：团队激励机制设计', duration: '15分钟' },
      { title: '第5课：处理团队冲突的艺术', duration: '14分钟' },
      { title: '第6课：打造高执行力团队文化', duration: '16分钟' },
    ])
  },
  {
    id: 4,
    video_url: 'https://video-cdn.jinglaimei.com/courses/course-04-guidebook.mp4',
    content: JSON.stringify([
      { title: '第1课：创业初期的心理准备', duration: '15分钟' },
      { title: '第2课：客户画像与精准定位', duration: '18分钟' },
      { title: '第3课：首单突破的7种方法', duration: '20分钟' },
      { title: '第4课：复购率提升策略', duration: '16分钟' },
      { title: '第5课：转介绍裂变玩法', duration: '18分钟' },
      { title: '第6课：时间管理与效率提升', duration: '15分钟' },
      { title: '第7课：月入过万的路径规划', duration: '18分钟' },
    ])
  },
  {
    id: 5,
    video_url: 'https://video-cdn.jinglaimei.com/courses/course-05-industry.mp4',
    content: JSON.stringify([
      { title: '第1课：2026美妆市场趋势总览', duration: '12分钟' },
      { title: '第2课：护肤品成分革命', duration: '15分钟' },
      { title: '第3课：消费者行为变化', duration: '14分钟' },
      { title: '第4课：社交媒体对消费的影响', duration: '19分钟' },
    ])
  },
  {
    id: 6,
    video_url: 'https://video-cdn.jinglaimei.com/courses/course-06-skincare.mp4',
    content: JSON.stringify([
      { title: '第1课：保湿系列话术', duration: '8分钟' },
      { title: '第2课：美白淡斑话术', duration: '10分钟' },
      { title: '第3课：抗衰老话术', duration: '12分钟' },
    ])
  },
  {
    id: 7,
    video_url: 'https://video-cdn.jinglaimei.com/courses/course-07-objection.mp4',
    content: JSON.stringify([
      { title: '第1课：价格异议应对', duration: '12分钟' },
      { title: '第2课：效果疑虑化解', duration: '14分钟' },
      { title: '第3课：竞品对比话术', duration: '14分钟' },
    ])
  },
  {
    id: 8,
    video_url: 'https://video-cdn.jinglaimei.com/courses/course-08-copywriting.mp4',
    content: JSON.stringify([
      { title: '第1课：节日营销文案', duration: '8分钟' },
      { title: '第2课：产品推广文案', duration: '12分钟' },
    ])
  },
];

const updateStmt = db.prepare('UPDATE school_courses SET video_url = ?, content = ? WHERE id = ?');

let successCount = 0;
for (const item of updates) {
  const result = updateStmt.run(item.video_url, item.content, item.id);
  if (result.changes > 0) {
    successCount++;
    console.log(`  ✅ 课程ID ${item.id} 更新成功`);
  } else {
    console.log(`  ⚠️ 课程ID ${item.id} 未找到`);
  }
}

console.log(`\n✨ 完成！共更新 ${successCount}/${updates.length} 门课程`);
db.close();
