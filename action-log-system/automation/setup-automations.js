#!/usr/bin/env node

/**
 * 行动日志系统自动化配置脚本
 * 用于在WorkBuddy中设置定时任务和自动化流程
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 自动化配置数据
const automations = [
  {
    name: "月度目标启动",
    prompt: "从年度目标生成当月月度目标，推送到企业微信",
    scheduleType: "recurring",
    rrule: "FREQ=MONTHLY;BYMONTHDAY=1;BYHOUR=0;BYMINUTE=0",
    cwds: "/Users/apple/WorkBuddy/20260324191412/action-log-system",
    status: "ACTIVE",
    description: "每月1日自动从年度目标提取当月目标"
  },
  {
    name: "周目标生成",
    prompt: "从月度目标提取未完成项，填入周目标表，推送本周重点",
    scheduleType: "recurring",
    rrule: "FREQ=WEEKLY;BYDAY=MO;BYHOUR=8;BYMINUTE=0",
    cwds: "/Users/apple/WorkBuddy/20260324191412/action-log-system",
    status: "ACTIVE",
    description: "每周一早上8点生成本周目标"
  },
  {
    name: "日目标提醒",
    prompt: "推送今日待办（从周目标表提取）",
    scheduleType: "recurring",
    rrule: "FREQ=DAILY;BYHOUR=8;BYMINUTE=30",
    cwds: "/Users/apple/WorkBuddy/20260324191412/action-log-system",
    status: "ACTIVE",
    description: "每天8:30推送今日待办事项"
  },
  {
    name: "日复盘提醒",
    prompt: "检查当日完成情况，推送未完成事项和明日建议",
    scheduleType: "recurring",
    rrule: "FREQ=DAILY;BYHOUR=21;BYMINUTE=0",
    cwds: "/Users/apple/WorkBuddy/20260324191412/action-log-system",
    status: "ACTIVE",
    description: "每天21:00推送当日复盘提醒"
  },
  {
    name: "心态预警",
    prompt: "若当日心态合计分<60，推送改进建议",
    scheduleType: "recurring",
    rrule: "FREQ=DAILY;BYHOUR=22;BYMINUTE=0",
    cwds: "/Users/apple/WorkBuddy/20260324191412/action-log-system",
    status: "ACTIVE",
    description: "每天22:00检查心态评分并预警"
  },
  {
    name: "周总结生成",
    prompt: "汇总本周完成情况，自动填写周总结，生成周报",
    scheduleType: "recurring",
    rrule: "FREQ=WEEKLY;BYDAY=SU;BYHOUR=20;BYMINUTE=0",
    cwds: "/Users/apple/WorkBuddy/20260324191412/action-log-system",
    status: "ACTIVE",
    description: "每周日20:00自动生成周总结"
  },
  {
    name: "月度复盘",
    prompt: "汇总本月所有日目标数据，生成月度完成情况报告",
    scheduleType: "recurring",
    rrule: "FREQ=MONTHLY;BYMONTHDAY=-1;BYHOUR=20;BYMINUTE=0",
    cwds: "/Users/apple/WorkBuddy/20260324191412/action-log-system",
    status: "ACTIVE",
    description: "每月最后一天20:00生成月度报告"
  },
  {
    name: "承诺书打卡",
    prompt: "检查承诺人是否完成当日填写，未完成则通知监督人",
    scheduleType: "recurring",
    rrule: "FREQ=DAILY;BYHOUR=23;BYMINUTE=0",
    cwds: "/Users/apple/WorkBuddy/20260324191412/action-log-system",
    status: "ACTIVE",
    description: "每天23:00检查承诺书打卡情况"
  }
];

// 生成自动化配置文件
function generateAutomationFiles() {
  const automationsDir = path.join(__dirname, '../config/automations');
  
  if (!fs.existsSync(automationsDir)) {
    fs.mkdirSync(automationsDir, { recursive: true });
  }
  
  automations.forEach((auto, index) => {
    const autoId = `action-log-${index + 1}`;
    const autoDir = path.join(automationsDir, autoId);
    
    if (!fs.existsSync(autoDir)) {
      fs.mkdirSync(autoDir, { recursive: true });
    }
    
    const config = {
      name: auto.name,
      description: auto.description,
      prompt: auto.prompt,
      schedule: {
        type: auto.scheduleType,
        rrule: auto.rrule,
        timezone: "Asia/Shanghai"
      },
      workspace: auto.cwds,
      enabled: auto.status === "ACTIVE",
      created: new Date().toISOString(),
      lastRun: null,
      nextRun: null
    };
    
    fs.writeFileSync(
      path.join(autoDir, 'automation.toml'),
      `# ${auto.name} 自动化配置\n` +
      `# 生成时间: ${new Date().toLocaleString('zh-CN')}\n\n` +
      `name = "${config.name}"\n` +
      `description = "${config.description}"\n` +
      `prompt = """${config.prompt}"""\n` +
      `schedule_type = "${config.schedule.type}"\n` +
      `rrule = "${config.schedule.rrule}"\n` +
      `timezone = "${config.schedule.timezone}"\n` +
      `workspace = "${config.workspace}"\n` +
      `enabled = ${config.enabled}\n` +
      `created = "${config.created}"\n`,
      'utf8'
    );
    
    console.log(`✅ 生成自动化配置: ${auto.name}`);
  });
  
  console.log(`\n📁 配置文件保存在: ${automationsDir}`);
}

// 生成WorkBuddy指令文档
function generateCommandDocs() {
  const commands = [
    {
      command: "设定年度目标",
      example: "读取 年度目标表.xlsx 的【目标表一】，帮我新增一行：【类别】财务指标、【序号】5、【目标内容】净利润500万、【方法和措施】控制成本、提升高毛利产品占比、【起止时间】1-12月",
      description: "在年度目标表中添加新目标"
    },
    {
      command: "查看年度目标进度",
      example: "统计 年度目标表.xlsx 两个工作表中‘完成打√’的数量，计算总完成率和分项完成率，生成‘年度目标完成进度报告.xlsx’",
      description: "生成年度目标完成进度报告"
    },
    {
      command: "生成月度目标",
      example: "读取 年度目标表.xlsx 中‘起止时间’包含6月的目标，自动填入 月度目标表.xlsx 的【方法和措施】工作表，重要级别按A1/A2/A3排序",
      description: "从年度目标生成当月月度目标"
    },
    {
      command: "填写月度完成情况",
      example: "根据 日目标表.xlsx 本月所有日期的数据，汇总完成情况，自动填写到 月度目标表.xlsx 的【完成情况】工作表，包含：实际完成、差距、原因分析",
      description: "月底复盘，汇总月度完成情况"
    },
    {
      command: "生成本周重点",
      example: "读取 月度目标表.xlsx 的【方法和措施】，筛选‘重要级别’为A1且未完成的，自动填入 周目标表.xlsx 的【本周目标】，优先级设为A1/A2/A3",
      description: "从月度目标提取本周重点事项"
    },
    {
      command: "创建日目标",
      example: "今天是2026年3月28日，帮我创建日目标。A1事项：拜访3个大客户，时间14:00-17:00；A2事项：完成月度报表，时间10:00-11:30；今日学习：《高效能人士的七个习惯》第3章；心态评分：认真10分、乐观10分、坚守承诺8分",
      description: "创建当天的日目标"
    },
    {
      command: "获取每日提醒",
      example: "每天早上8点，读取 周目标表.xlsx 的【本周目标】，找出未完成的高优先级事项，推送到企业微信/微信，提醒今日重点",
      description: "推送今日待办事项提醒"
    },
    {
      command: "晚间复盘",
      example: "每天晚上9点，检查 日目标表.xlsx 今日工作表中完成打√的情况，若A1事项未完成超过2个，发送提醒：‘今日A类事项未完成，请及时复盘改进’",
      description: "检查当日完成情况并提醒"
    },
    {
      command: "生成心态趋势图",
      example: "读取 日目标表.xlsx 本月所有工作表的‘心态合计分’，生成折线图，标注低于60分的日期及对应的‘改进方法’",
      description: "分析心态变化趋势"
    },
    {
      command: "目标偏差分析",
      example: "对比 年度目标表.xlsx 和 月度达成追踪表.xlsx，找出差距超过20%的目标项，生成‘目标偏差分析报告’，并给出建议措施",
      description: "分析年度目标达成偏差"
    },
    {
      command: "创建承诺书",
      example: "帮我创建一份承诺书，承诺人：张三，监督人：李四，PK人：王五，承诺内容：每日填写日目标，连续30天不中断",
      description: "创建个人承诺书"
    },
    {
      command: "监督人通知",
      example: "每周一上午10点，统计上周‘日目标表’填写情况，若张三有3天以上未填写，自动发送邮件给监督人李四，内容包含未填写的日期",
      description: "向监督人报告承诺书执行情况"
    }
  ];
  
  const docsDir = path.join(__dirname, '../docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }
  
  let markdown = `# 行动日志系统 - WorkBuddy指令手册\n\n`;
  markdown += `## 概述\n`;
  markdown += `本系统提供自然语言指令操作，您可以直接在WorkBuddy对话框中输入指令，系统会自动执行相应操作。\n\n`;
  markdown += `## 快速开始\n\n`;
  markdown += `### 1. 初始化系统\n`;
  markdown += `\`\`\`\n初始化行动日志系统\n\`\`\`\n\n`;
  markdown += `### 2. 创建今日目标\n`;
  markdown += `\`\`\`\n创建今日日目标\n\`\`\`\n\n`;
  markdown += `## 完整指令列表\n\n`;
  
  commands.forEach((cmd, index) => {
    markdown += `### ${index + 1}. ${cmd.command}\n`;
    markdown += `**描述**: ${cmd.description}\n\n`;
    markdown += `**示例**:\n`;
    markdown += `\`\`\`\n${cmd.example}\n\`\`\`\n\n`;
  });
  
  markdown += `## 自动化任务\n\n`;
  markdown += `系统已配置以下自动化任务：\n\n`;
  
  automations.forEach((auto, index) => {
    markdown += `${index + 1}. **${auto.name}**: ${auto.description} (${auto.rrule})\n`;
  });
  
  markdown += `\n## 文件结构\n\n`;
  markdown += `所有数据文件保存在以下目录：\n`;
  markdown += `- \`/Users/apple/WorkBuddy/20260324191412/action-log-system/data/\` - 核心数据目录\n`;
  markdown += `- \`年度目标表.xlsx\` - 年度目标\n`;
  markdown += `- \`月度目标表.xlsx\` - 月度目标\n`;
  markdown += `- \`周目标表.xlsx\` - 周目标\n`;
  markdown += `- \`日目标表_YYYY-MM-DD.xlsx\` - 每日目标\n`;
  markdown += `- \`月度达成追踪表.xlsx\` - 月度追踪\n`;
  markdown += `- \`承诺书.xlsx\` - 承诺书\n`;
  
  fs.writeFileSync(
    path.join(docsDir, 'commands.md'),
    markdown,
    'utf8'
  );
  
  console.log(`📘 生成指令文档: ${path.join(docsDir, 'commands.md')}`);
}

// 生成启动脚本
function generateStartupScripts() {
  const scriptsDir = path.join(__dirname, '../scripts');
  if (!fs.existsSync(scriptsDir)) {
    fs.mkdirSync(scriptsDir, { recursive: true });
  }
  
  // 初始化模板脚本
  const initScript = `#!/usr/bin/env node

const ActionLogService = require('../services/ActionLogService');

async function initializeSystem() {
  console.log('🚀 正在初始化行动日志系统...');
  
  try {
    const service = new ActionLogService();
    const result = await service.initializeAllTemplates();
    
    console.log('✅ 系统初始化完成！');
    console.log(\`已创建 \${result.initialized} 个模板文件\`);
    
    result.results.forEach(item => {
      console.log(\`  - \${item.type}: \${item.path || item.date}\`);
    });
    
    console.log('\\n📁 数据目录: /Users/apple/WorkBuddy/20260324191412/action-log-system/data/');
    console.log('🌐 API服务: 运行 npm start 启动服务');
    console.log('📖 指令手册: 查看 docs/commands.md');
    
  } catch (error) {
    console.error('❌ 初始化失败:', error.message);
    process.exit(1);
  }
}

initializeSystem();`;
  
  fs.writeFileSync(
    path.join(scriptsDir, 'initialize-templates.js'),
    initScript,
    'utf8'
  );
  
  // 创建日目标脚本
  const dailyScript = `#!/usr/bin/env node

const ActionLogService = require('../services/ActionLogService');

async function createDailyGoal() {
  const args = process.argv.slice(2);
  const date = args[0] || new Date().toISOString().split('T')[0];
  
  console.log(\`📝 正在创建 \${date} 的日目标...\`);
  
  try {
    const service = new ActionLogService();
    
    // 示例任务
    const tasks = [
      {
        content: '完成重要项目会议',
        timeRange: '09:00-10:30'
      },
      {
        content: '处理日常邮件和审批',
        timeRange: '10:30-12:00'
      },
      {
        content: '团队沟通和协调',
        timeRange: '14:00-15:30'
      }
    ];
    
    const learning = {
      content: '《高效能人士的七个习惯》第3章',
      improvement: '实践要事第一原则'
    };
    
    const mindsetScores = {
      认真: '10',
      乐观: '9',
      自信: '10',
      坚守承诺: '8',
      爱与奉献: '9',
      决不找借口: '10'
    };
    
    const result = await service.createDailyGoal(date, tasks, learning, mindsetScores);
    
    console.log(\`✅ 日目标创建成功！\`);
    console.log(\`文件路径: \${result.filePath}\`);
    console.log(\`任务数量: \${result.tasksCount}\`);
    
  } catch (error) {
    console.error('❌ 创建日目标失败:', error.message);
    process.exit(1);
  }
}

createDailyGoal();`;
  
  fs.writeFileSync(
    path.join(scriptsDir, 'create-daily-goal.js'),
    dailyScript,
    'utf8'
  );
  
  // 生成月度报告脚本
  const reportScript = `#!/usr/bin/env node

const ActionLogService = require('../services/ActionLogService');

async function generateMonthlyReport() {
  const args = process.argv.slice(2);
  const month = args[0] || \`\${new Date().getMonth() + 1}月\`;
  
  console.log(\`📊 正在生成 \${month} 月度报告...\`);
  
  try {
    const service = new ActionLogService();
    const result = await service.generateMonthlyReport(month);
    
    console.log(\`✅ 月度报告生成成功！\`);
    console.log(\`报告路径: \${result.reportPath}\`);
    console.log(\`包含模块: \${result.sections.join(', ')}\`);
    
    // 读取报告内容摘要
    const fs = require('fs');
    const reportData = JSON.parse(fs.readFileSync(result.reportPath, 'utf8'));
    
    console.log('\\n📈 报告摘要:');
    console.log(\`生成时间: \${reportData.generatedAt}\`);
    
    if (reportData.sections.monthlyCompletion) {
      const comp = reportData.sections.monthlyCompletion;
      console.log(\`月度完成率: \${comp.completionRate}%\`);
    }
    
    if (reportData.sections.mindsetTrend) {
      const trend = reportData.sections.mindsetTrend;
      console.log(\`平均心态评分: \${trend.averageScore}\`);
      console.log(\`低分天数: \${trend.lowScoreDays}\`);
    }
    
  } catch (error) {
    console.error('❌ 生成月度报告失败:', error.message);
    process.exit(1);
  }
}

generateMonthlyReport();`;
  
  fs.writeFileSync(
    path.join(scriptsDir, 'generate-monthly-report.js'),
    reportScript,
    'utf8'
  );
  
  // 添加执行权限
  [scriptsDir].forEach(dir => {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      if (file.endsWith('.js')) {
        const filePath = path.join(dir, file);
        try {
          fs.chmodSync(filePath, '755');
          console.log(`🔧 设置执行权限: ${file}`);
        } catch (error) {
          console.log(`⚠️  无法设置权限: ${file}`);
        }
      }
    });
  });
  
  console.log(`🔧 生成启动脚本: ${scriptsDir}/`);
}

// 主函数
function main() {
  console.log('🔧 开始配置行动日志系统自动化...\n');
  
  // 1. 生成自动化配置文件
  console.log('1️⃣ 生成自动化配置文件');
  generateAutomationFiles();
  
  // 2. 生成指令文档
  console.log('\n2️⃣ 生成指令文档');
  generateCommandDocs();
  
  // 3. 生成启动脚本
  console.log('\n3️⃣ 生成启动脚本');
  generateStartupScripts();
  
  // 4. 创建配置文件目录
  const configDir = path.join(__dirname, '../config');
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  
  // 5. 创建默认通知配置
  const notificationsConfig = {
    enabled: true,
    channels: {
      console: true,
      file: true,
      webhook: false,
      email: false
    },
    schedules: {
      morningReminder: '0 8 * * *',
      eveningReview: '0 21 * * *',
      weeklySummary: '0 20 * * 0',
      monthlyStart: '0 0 1 * *',
      mindsetAlert: '0 22 * * *',
      commitmentCheck: '0 23 * * *'
    },
    webhook: {
      wechat: '',
      slack: '',
      discord: ''
    },
    email: {
      enabled: false,
      smtp: {},
      recipients: []
    }
  };
  
  fs.writeFileSync(
    path.join(configDir, 'notifications.json'),
    JSON.stringify(notificationsConfig, null, 2),
    'utf8'
  );
  
  console.log(`\n✅ 自动化配置完成！`);
  console.log(`\n📋 下一步操作:`);
  console.log(`1. 安装依赖: cd /Users/apple/WorkBuddy/20260324191412/action-log-system && npm install`);
  console.log(`2. 初始化系统: npm run init-templates`);
  console.log(`3. 启动API服务: npm start`);
  console.log(`4. 在WorkBuddy中配置自动化任务流`);
  console.log(`\n📖 详细指令请查看: docs/commands.md`);
}

// 执行主函数
if (require.main === module) {
  main();
}

module.exports = {
  generateAutomationFiles,
  generateCommandDocs,
  generateStartupScripts
};