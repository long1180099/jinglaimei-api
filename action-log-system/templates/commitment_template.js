// 承诺书模板
const commitmentTemplate = {
  // 承诺书主表
  '承诺书': [
    {
      承诺人: '',
      监督人: '',
      PK人: '',
      承诺日期: new Date().toLocaleDateString('zh-CN'),
      个人承诺内容: '',
      签字: ''
    }
  ],
  
  // 打卡记录表
  '打卡记录': [
    {
      日期: '',
      是否完成: '',
      备注: ''
    }
  ]
};

// Excel配置
const excelConfig = {
  fileName: '承诺书.xlsx',
  sheetNames: ['承诺书', '打卡记录'],
  columns: {
    '承诺书': ['承诺人', '监督人', 'PK人', '承诺日期', '个人承诺内容', '签字'],
    '打卡记录': ['日期', '是否完成', '备注']
  },
  defaultPath: 'D:\\行动日志\\',
  dataPath: '/Users/apple/WorkBuddy/20260324191412/action-log-system/data/commitment.json'
};

// 创建承诺书内容
function createCommitmentContent(person, supervisor, pkPerson, duration = 30) {
  const commitmentTexts = [
    '每日填写日目标，连续30天不中断',
    '每周完成周总结，及时复盘改进',
    '每月达成月度目标的80%以上',
    '保持积极心态，每日心态评分不低于70分',
    '坚持每日学习，提升个人能力',
    '严格遵守工作时间安排',
    '及时与监督人沟通进展',
    '与PK人良性竞争，共同进步'
  ];
  
  return {
    承诺人: person,
    监督人: supervisor,
    PK人: pkPerson,
    承诺日期: new Date().toLocaleDateString('zh-CN'),
    个人承诺内容: commitmentTexts.slice(0, 3).join('；'),
    签字: person
  };
}

// 生成打卡记录
function generateCheckinRecords(startDate, days = 30) {
  const records = [];
  const start = new Date(startDate);
  
  for (let i = 0; i < days; i++) {
    const currentDate = new Date(start);
    currentDate.setDate(start.getDate() + i);
    
    records.push({
      日期: currentDate.toLocaleDateString('zh-CN'),
      是否完成: '',
      备注: ''
    });
  }
  
  return records;
}

module.exports = { commitmentTemplate, excelConfig, createCommitmentContent, generateCheckinRecords };