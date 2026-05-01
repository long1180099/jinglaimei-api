// 日目标表模板
const dailyGoalTemplate = (date) => {
  const formattedDate = date || new Date().toISOString().split('T')[0];
  
  return {
    // ABC分类事项
    'ABC分类事项': [
      {
        'ABC分类': 'A1',
        起止时间: '09:00-12:00',
        今日事项: '',
        '完成打√': ''
      },
      {
        'ABC分类': 'A2',
        起止时间: '13:00-15:00',
        今日事项: '',
        '完成打√': ''
      },
      {
        'ABC分类': 'A3',
        起止时间: '15:00-17:00',
        今日事项: '',
        '完成打√': ''
      },
      {
        'ABC分类': 'B1',
        起止时间: '',
        今日事项: '',
        '完成打√': ''
      },
      {
        'ABC分类': 'B2',
        起止时间: '',
        今日事项: '',
        '完成打√': ''
      },
      {
        'ABC分类': 'C',
        起止时间: '',
        今日事项: '',
        '完成打√': ''
      }
    ],
    
    // 今日学习改进
    '今日学习改进': [
      {
        今日学习: '',
        改进方法: ''
      }
    ],
    
    // 心态管理
    '心态管理': [
      {
        心态指标: '认真',
        评分: '10'
      },
      {
        心态指标: '乐观',
        评分: '10'
      },
      {
        心态指标: '自信',
        评分: '10'
      },
      {
        心态指标: '坚守承诺',
        评分: '10'
      },
      {
        心态指标: '爱与奉献',
        评分: '10'
      },
      {
        心态指标: '决不找借口',
        评分: '10'
      },
      {
        心态指标: '心态合计分',
        评分: '60'
      }
    ]
  };
};

// Excel配置
const excelConfig = {
  fileName: '日目标表.xlsx',
  dateBasedSheets: true,
  columns: {
    'ABC分类事项': ['ABC分类', '起止时间', '今日事项', '完成打√'],
    '今日学习改进': ['今日学习', '改进方法'],
    '心态管理': ['心态指标', '评分']
  },
  defaultPath: 'D:\\行动日志\\',
  dataPath: '/Users/apple/WorkBuddy/20260324191412/action-log-system/data/daily_goals/'
};

// 心态评分计算函数
function calculateMindsetScore(scores) {
  const total = Object.values(scores).reduce((sum, score) => sum + parseInt(score || 0), 0);
  return total;
}

// 日期格式化函数
function formatDate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

module.exports = { dailyGoalTemplate, excelConfig, calculateMindsetScore, formatDate };