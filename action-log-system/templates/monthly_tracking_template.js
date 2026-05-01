// 月度达成追踪表模板
const monthlyTrackingTemplate = {
  // 月度达成追踪表
  '月度达成追踪': [
    {
      月份: '1月',
      原定目标: '',
      实际达成: '',
      差距: '',
      完成率: '',
      自省改进点: ''
    },
    {
      月份: '2月',
      原定目标: '',
      实际达成: '',
      差距: '',
      完成率: '',
      自省改进点: ''
    },
    {
      月份: '3月',
      原定目标: '',
      实际达成: '',
      差距: '',
      完成率: '',
      自省改进点: ''
    },
    {
      月份: '4月',
      原定目标: '',
      实际达成: '',
      差距: '',
      完成率: '',
      自省改进点: ''
    },
    {
      月份: '5月',
      原定目标: '',
      实际达成: '',
      差距: '',
      完成率: '',
      自省改进点: ''
    },
    {
      月份: '6月',
      原定目标: '',
      实际达成: '',
      差距: '',
      完成率: '',
      自省改进点: ''
    },
    {
      月份: '7月',
      原定目标: '',
      实际达成: '',
      差距: '',
      完成率: '',
      自省改进点: ''
    },
    {
      月份: '8月',
      原定目标: '',
      实际达成: '',
      差距: '',
      完成率: '',
      自省改进点: ''
    },
    {
      月份: '9月',
      原定目标: '',
      实际达成: '',
      差距: '',
      完成率: '',
      自省改进点: ''
    },
    {
      月份: '10月',
      原定目标: '',
      实际达成: '',
      差距: '',
      完成率: '',
      自省改进点: ''
    },
    {
      月份: '11月',
      原定目标: '',
      实际达成: '',
      差距: '',
      完成率: '',
      自省改进点: ''
    },
    {
      月份: '12月',
      原定目标: '',
      实际达成: '',
      差距: '',
      完成率: '',
      自省改进点: ''
    }
  ]
};

// Excel配置
const excelConfig = {
  fileName: '月度达成追踪表.xlsx',
  columns: {
    '月度达成追踪': ['月份', '原定目标', '实际达成', '差距', '完成率', '自省改进点']
  },
  defaultPath: 'D:\\行动日志\\',
  dataPath: '/Users/apple/WorkBuddy/20260324191412/action-log-system/data/monthly_tracking.json'
};

// 计算完成率函数
function calculateCompletionRate(planned, actual) {
  if (!planned || planned === 0) return '0%';
  const rate = (actual / planned) * 100;
  return `${rate.toFixed(1)}%`;
}

// 计算差距函数
function calculateGap(planned, actual) {
  const gap = planned - actual;
  return gap >= 0 ? gap : `-${Math.abs(gap)}`;
}

module.exports = { monthlyTrackingTemplate, excelConfig, calculateCompletionRate, calculateGap };