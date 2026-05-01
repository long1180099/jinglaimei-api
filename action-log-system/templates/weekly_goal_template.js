// 周目标表模板
const weeklyGoalTemplate = {
  // 本周目标工作表
  '本周目标': [
    {
      优先顺序: 'A1',
      本周工作目标: '',
      完成期限: ''
    },
    {
      优先顺序: 'A2',
      本周工作目标: '',
      完成期限: ''
    },
    {
      优先顺序: 'A3',
      本周工作目标: '',
      完成期限: ''
    },
    {
      优先顺序: 'B1',
      本周工作目标: '',
      完成期限: ''
    },
    {
      优先顺序: 'B2',
      本周工作目标: '',
      完成期限: ''
    }
  ],
  
  // 本周总结工作表
  '本周总结': [
    {
      目标完成情况: '',
      未完成原因: '',
      改进方法: '',
      本周创新与收获: ''
    }
  ]
};

// Excel配置
const excelConfig = {
  fileName: '周目标表.xlsx',
  sheetNames: ['本周目标', '本周总结'],
  columns: {
    '本周目标': ['优先顺序', '本周工作目标', '完成期限'],
    '本周总结': ['目标完成情况', '未完成原因', '改进方法', '本周创新与收获']
  },
  defaultPath: 'D:\\行动日志\\',
  weekPrefix: true,
  dataPath: '/Users/apple/WorkBuddy/20260324191412/action-log-system/data/weekly_goals/'
};

// 获取当前周的函数
function getCurrentWeek() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now - start;
  const oneDay = 1000 * 60 * 60 * 24;
  const day = Math.floor(diff / oneDay);
  const weekNumber = Math.ceil((day + start.getDay() + 1) / 7);
  return `第${weekNumber}周`;
}

module.exports = { weeklyGoalTemplate, excelConfig, getCurrentWeek };