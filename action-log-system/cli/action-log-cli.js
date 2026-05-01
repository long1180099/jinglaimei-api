#!/usr/bin/env node

/**
 * 行动日志系统 - 命令行交互工具
 * 提供友好的命令行界面来操作系统功能
 */

const readline = require('readline');
const chalk = require('chalk');
const figlet = require('figlet');
const ActionLogService = require('../services/ActionLogService');
const NotificationService = require('../services/NotificationService');

const service = new ActionLogService();
const notificationService = new NotificationService();

// 创建交互界面
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 显示欢迎信息
function showWelcome() {
  console.clear();
  console.log(chalk.cyan(figlet.textSync('Action Log', { horizontalLayout: 'full' })));
  console.log(chalk.gray('='.repeat(60)));
  console.log(chalk.yellow('🚀 个人行动日志管理系统 - 命令行版本'));
  console.log(chalk.gray('='.repeat(60)));
  console.log();
}

// 显示主菜单
function showMainMenu() {
  console.log(chalk.bold('📋 主菜单'));
  console.log(chalk.gray('─'.repeat(40)));
  console.log(chalk.cyan('1. 📅 年度目标管理'));
  console.log(chalk.cyan('2. 📆 月度目标管理'));
  console.log(chalk.cyan('3. 📊 周目标管理'));
  console.log(chalk.cyan('4. 📝 日目标管理'));
  console.log(chalk.cyan('5. 📈 月度追踪'));
  console.log(chalk.cyan('6. 🤝 承诺书管理'));
  console.log(chalk.cyan('7. 🔔 提醒与通知'));
  console.log(chalk.cyan('8. 📄 报告与统计'));
  console.log(chalk.cyan('9. ⚙️  系统设置'));
  console.log(chalk.cyan('0. 🚪 退出'));
  console.log(chalk.gray('─'.repeat(40)));
}

// 年度目标菜单
function showAnnualGoalsMenu() {
  console.log(chalk.bold('📅 年度目标管理'));
  console.log(chalk.gray('─'.repeat(40)));
  console.log(chalk.cyan('1. 设置年度目标'));
  console.log(chalk.cyan('2. 查看目标进度'));
  console.log(chalk.cyan('3. 标记目标完成'));
  console.log(chalk.cyan('4. 导出年度报告'));
  console.log(chalk.cyan('5. 返回主菜单'));
  console.log(chalk.gray('─'.repeat(40)));
}

// 月度目标菜单
function showMonthlyGoalsMenu() {
  console.log(chalk.bold('📆 月度目标管理'));
  console.log(chalk.gray('─'.repeat(40)));
  console.log(chalk.cyan('1. 生成月度目标'));
  console.log(chalk.cyan('2. 查看月度目标'));
  console.log(chalk.cyan('3. 更新完成情况'));
  console.log(chalk.cyan('4. 月度复盘'));
  console.log(chalk.cyan('5. 返回主菜单'));
  console.log(chalk.gray('─'.repeat(40)));
}

// 日目标菜单
function showDailyGoalsMenu() {
  console.log(chalk.bold('📝 日目标管理'));
  console.log(chalk.gray('─'.repeat(40)));
  console.log(chalk.cyan('1. 创建今日目标'));
  console.log(chalk.cyan('2. 查看历史目标'));
  console.log(chalk.cyan('3. 更新任务状态'));
  console.log(chalk.cyan('4. 填写心态评分'));
  console.log(chalk.cyan('5. 今日复盘'));
  console.log(chalk.cyan('6. 返回主菜单'));
  console.log(chalk.gray('─'.repeat(40)));
}

// 承诺书菜单
function showCommitmentMenu() {
  console.log(chalk.bold('🤝 承诺书管理'));
  console.log(chalk.gray('─'.repeat(40)));
  console.log(chalk.cyan('1. 创建承诺书'));
  console.log(chalk.cyan('2. 今日打卡'));
  console.log(chalk.cyan('3. 查看打卡记录'));
  console.log(chalk.cyan('4. 连续打卡统计'));
  console.log(chalk.cyan('5. 返回主菜单'));
  console.log(chalk.gray('─'.repeat(40)));
}

// 提醒菜单
function showRemindersMenu() {
  console.log(chalk.bold('🔔 提醒与通知'));
  console.log(chalk.gray('─'.repeat(40)));
  console.log(chalk.cyan('1. 获取今日提醒'));
  console.log(chalk.cyan('2. 晚间复盘提醒'));
  console.log(chalk.cyan('3. 心态预警'));
  console.log(chalk.cyan('4. 承诺书提醒'));
  console.log(chalk.cyan('5. 启动定时任务'));
  console.log(chalk.cyan('6. 停止定时任务'));
  console.log(chalk.cyan('7. 返回主菜单'));
  console.log(chalk.gray('─'.repeat(40)));
}

// 处理用户选择
function handleMainMenuChoice(choice) {
  switch (choice) {
    case '1':
      showAnnualGoalsMenu();
      askForChoice('请选择年度目标操作 (1-5): ', handleAnnualGoalsChoice);
      break;
    case '2':
      showMonthlyGoalsMenu();
      askForChoice('请选择月度目标操作 (1-5): ', handleMonthlyGoalsChoice);
      break;
    case '3':
      // 周目标菜单
      handleWeeklyGoals();
      break;
    case '4':
      showDailyGoalsMenu();
      askForChoice('请选择日目标操作 (1-6): ', handleDailyGoalsChoice);
      break;
    case '5':
      // 月度追踪
      handleMonthlyTracking();
      break;
    case '6':
      showCommitmentMenu();
      askForChoice('请选择承诺书操作 (1-5): ', handleCommitmentChoice);
      break;
    case '7':
      showRemindersMenu();
      askForChoice('请选择提醒操作 (1-7): ', handleRemindersChoice);
      break;
    case '8':
      // 报告与统计
      handleReports();
      break;
    case '9':
      // 系统设置
      handleSystemSettings();
      break;
    case '0':
      console.log(chalk.yellow('👋 感谢使用行动日志系统，再见！'));
      rl.close();
      process.exit(0);
      break;
    default:
      console.log(chalk.red('❌ 无效选择，请重新输入'));
      showMainMenu();
      askForChoice('请选择操作 (0-9): ', handleMainMenuChoice);
  }
}

// 年度目标操作处理
async function handleAnnualGoalsChoice(choice) {
  switch (choice) {
    case '1':
      await setAnnualGoal();
      break;
    case '2':
      await viewAnnualGoalProgress();
      break;
    case '3':
      await markAnnualGoalComplete();
      break;
    case '4':
      await exportAnnualReport();
      break;
    case '5':
      showWelcome();
      showMainMenu();
      askForChoice('请选择操作 (0-9): ', handleMainMenuChoice);
      break;
    default:
      console.log(chalk.red('❌ 无效选择'));
      showAnnualGoalsMenu();
      askForChoice('请选择年度目标操作 (1-5): ', handleAnnualGoalsChoice);
  }
}

// 月度目标操作处理
async function handleMonthlyGoalsChoice(choice) {
  switch (choice) {
    case '1':
      await generateMonthlyGoals();
      break;
    case '2':
      await viewMonthlyGoals();
      break;
    case '3':
      await updateMonthlyCompletion();
      break;
    case '4':
      await monthlyReview();
      break;
    case '5':
      showWelcome();
      showMainMenu();
      askForChoice('请选择操作 (0-9): ', handleMainMenuChoice);
      break;
    default:
      console.log(chalk.red('❌ 无效选择'));
      showMonthlyGoalsMenu();
      askForChoice('请选择月度目标操作 (1-5): ', handleMonthlyGoalsChoice);
  }
}

// 日目标操作处理
async function handleDailyGoalsChoice(choice) {
  switch (choice) {
    case '1':
      await createTodayGoal();
      break;
    case '2':
      await viewHistoryGoals();
      break;
    case '3':
      await updateTaskStatus();
      break;
    case '4':
      await fillMindsetScores();
      break;
    case '5':
      await todayReview();
      break;
    case '6':
      showWelcome();
      showMainMenu();
      askForChoice('请选择操作 (0-9): ', handleMainMenuChoice);
      break;
    default:
      console.log(chalk.red('❌ 无效选择'));
      showDailyGoalsMenu();
      askForChoice('请选择日目标操作 (1-6): ', handleDailyGoalsChoice);
  }
}

// 承诺书操作处理
async function handleCommitmentChoice(choice) {
  switch (choice) {
    case '1':
      await createCommitment();
      break;
    case '2':
      await checkinToday();
      break;
    case '3':
      await viewCheckinRecords();
      break;
    case '4':
      await checkinStatistics();
      break;
    case '5':
      showWelcome();
      showMainMenu();
      askForChoice('请选择操作 (0-9): ', handleMainMenuChoice);
      break;
    default:
      console.log(chalk.red('❌ 无效选择'));
      showCommitmentMenu();
      askForChoice('请选择承诺书操作 (1-5): ', handleCommitmentChoice);
  }
}

// 提醒操作处理
async function handleRemindersChoice(choice) {
  switch (choice) {
    case '1':
      await getDailyReminders();
      break;
    case '2':
      await getEveningReview();
      break;
    case '3':
      await getMindsetAlert();
      break;
    case '4':
      await getCommitmentReminder();
      break;
    case '5':
      await startScheduledTasks();
      break;
    case '6':
      await stopScheduledTasks();
      break;
    case '7':
      showWelcome();
      showMainMenu();
      askForChoice('请选择操作 (0-9): ', handleMainMenuChoice);
      break;
    default:
      console.log(chalk.red('❌ 无效选择'));
      showRemindersMenu();
      askForChoice('请选择提醒操作 (1-7): ', handleRemindersChoice);
  }
}

// 询问用户选择
function askForChoice(question, handler) {
  rl.question(chalk.yellow(question), (answer) => {
    handler(answer.trim());
  });
}

// ========== 具体功能实现 ==========

// 设置年度目标
async function setAnnualGoal() {
  console.log(chalk.bold('📝 设置年度目标'));
  
  rl.question(chalk.cyan('请输入目标类别 (如: 财务指标, 学习成长): '), async (category) => {
    rl.question(chalk.cyan('请输入目标内容: '), async (content) => {
      rl.question(chalk.cyan('请输入方法和措施: '), async (methods) => {
        rl.question(chalk.cyan('请输入起止时间 (默认: 1-12月): '), async (timeRange) => {
          try {
            console.log(chalk.gray('正在保存...'));
            const result = await service.setAnnualGoal(
              category,
              content,
              methods,
              timeRange || '1-12月'
            );
            
            console.log(chalk.green('✅ 年度目标设置成功！'));
            console.log(chalk.gray(`位置: 第${result.position}行`));
            console.log(chalk.gray(`类别: ${result.row.类别}`));
            console.log(chalk.gray(`序号: ${result.row.序号}`));
            
          } catch (error) {
            console.log(chalk.red(`❌ 错误: ${error.message}`));
          }
          
          setTimeout(() => {
            showAnnualGoalsMenu();
            askForChoice('请选择年度目标操作 (1-5): ', handleAnnualGoalsChoice);
          }, 1000);
        });
      });
    });
  });
}

// 查看年度目标进度
async function viewAnnualGoalProgress() {
  console.log(chalk.bold('📊 年度目标进度'));
  
  try {
    const progress = await service.getAnnualGoalProgress();
    
    console.log(chalk.gray('─'.repeat(50)));
    console.log(chalk.bold('📈 总体进度:'));
    console.log(chalk.white(`  总目标数: ${progress.total.total}`));
    console.log(chalk.green(`  已完成: ${progress.total.completed}`));
    console.log(chalk.cyan(`  完成率: ${progress.total.rate}%`));
    
    console.log(chalk.gray('─'.repeat(50)));
    console.log(chalk.bold('🏷️  按类别统计:'));
    
    Object.keys(progress.byCategory).forEach(category => {
      const cat = progress.byCategory[category];
      const rate = parseFloat(cat.rate);
      const color = rate >= 80 ? chalk.green : rate >= 60 ? chalk.yellow : chalk.red;
      
      console.log(color(`  ${category}: ${cat.completed}/${cat.total} (${cat.rate}%)`));
    });
    
    console.log(chalk.gray('─'.repeat(50)));
    
  } catch (error) {
    console.log(chalk.red(`❌ 错误: ${error.message}`));
  }
  
  setTimeout(() => {
    showAnnualGoalsMenu();
    askForChoice('请选择年度目标操作 (1-5): ', handleAnnualGoalsChoice);
  }, 1000);
}

// 生成月度目标
async function generateMonthlyGoals() {
  console.log(chalk.bold('📅 生成月度目标'));
  
  const now = new Date();
  const currentMonth = `${now.getMonth() + 1}月`;
  
  rl.question(chalk.cyan(`请输入月份 (默认: ${currentMonth}): `), async (month) => {
    try {
      console.log(chalk.gray('正在从年度目标生成月度目标...'));
      const result = await service.generateMonthlyGoalsFromAnnual(month || currentMonth);
      
      console.log(chalk.green('✅ 月度目标生成成功！'));
      console.log(chalk.gray(`月份: ${result.month}`));
      console.log(chalk.gray(`生成目标数: ${result.count}`));
      
    } catch (error) {
      console.log(chalk.red(`❌ 错误: ${error.message}`));
    }
    
    setTimeout(() => {
      showMonthlyGoalsMenu();
      askForChoice('请选择月度目标操作 (1-5): ', handleMonthlyGoalsChoice);
    }, 1000);
  });
}

// 创建今日目标
async function createTodayGoal() {
  console.log(chalk.bold('🌞 创建今日目标'));
  
  const today = new Date().toISOString().split('T')[0];
  
  console.log(chalk.cyan(`今天是: ${today}`));
  console.log(chalk.gray('请按顺序输入今日任务 (输入空行结束):'));
  
  const tasks = [];
  let taskIndex = 1;
  
  function askForTask() {
    rl.question(chalk.cyan(`任务${taskIndex} (A${taskIndex}): `), (content) => {
      if (!content.trim()) {
        // 输入结束，继续其他信息
        askForLearning();
        return;
      }
      
      rl.question(chalk.cyan(`  时间安排 (如: 09:00-12:00): `), (timeRange) => {
        tasks.push({
          content: content.trim(),
          timeRange: timeRange.trim() || `09:00-12:00`
        });
        
        taskIndex++;
        askForTask();
      });
    });
  }
  
  function askForLearning() {
    rl.question(chalk.cyan('今日学习内容: '), (learningContent) => {
      rl.question(chalk.cyan('改进方法: '), (improvement) => {
        const learning = {
          content: learningContent.trim(),
          improvement: improvement.trim()
        };
        
        askForMindsetScores(learning);
      });
    });
  }
  
  async function askForMindsetScores(learning) {
    console.log(chalk.cyan('\n💭 心态评分 (1-10分):'));
    
    const indicators = ['认真', '乐观', '自信', '坚守承诺', '爱与奉献', '决不找借口'];
    const scores = {};
    
    function askForScore(index) {
      if (index >= indicators.length) {
        // 所有指标都已输入
        createGoalWithAllData(learning, scores);
        return;
      }
      
      const indicator = indicators[index];
      rl.question(chalk.cyan(`${indicator} (1-10): `), (score) => {
        const numScore = parseInt(score);
        if (numScore >= 1 && numScore <= 10) {
          scores[indicator] = score;
          askForScore(index + 1);
        } else {
          console.log(chalk.red('请输入1-10之间的数字'));
          askForScore(index);
        }
      });
    }
    
    askForScore(0);
  }
  
  async function createGoalWithAllData(learning, mindsetScores) {
    try {
      console.log(chalk.gray('\n正在创建日目标...'));
      
      const result = await service.createDailyGoal(
        today,
        tasks,
        learning,
        mindsetScores
      );
      
      console.log(chalk.green('✅ 今日目标创建成功！'));
      console.log(chalk.gray(`文件路径: ${result.filePath}`));
      console.log(chalk.gray(`任务数量: ${result.tasksCount}`));
      
    } catch (error) {
      console.log(chalk.red(`❌ 错误: ${error.message}`));
    }
    
    setTimeout(() => {
      showDailyGoalsMenu();
      askForChoice('请选择日目标操作 (1-6): ', handleDailyGoalsChoice);
    }, 1000);
  }
  
  askForTask();
}

// 创建承诺书
async function createCommitment() {
  console.log(chalk.bold('🤝 创建承诺书'));
  
  rl.question(chalk.cyan('承诺人姓名: '), async (person) => {
    rl.question(chalk.cyan('监督人姓名: '), async (supervisor) => {
      rl.question(chalk.cyan('PK人姓名 (可选): '), async (pkPerson) => {
        rl.question(chalk.cyan('承诺天数 (默认: 30): '), async (duration) => {
          try {
            console.log(chalk.gray('正在创建承诺书...'));
            
            const result = await service.createCommitment(
              person.trim(),
              supervisor.trim(),
              pkPerson.trim(),
              parseInt(duration) || 30
            );
            
            console.log(chalk.green('✅ 承诺书创建成功！'));
            console.log(chalk.gray(`承诺人: ${result.commitment.承诺人}`));
            console.log(chalk.gray(`监督人: ${result.commitment.监督人}`));
            console.log(chalk.gray(`PK人: ${result.commitment.PK人 || '无'}`));
            console.log(chalk.gray(`承诺内容: ${result.commitment.个人承诺内容}`));
            console.log(chalk.gray(`打卡天数: ${result.checkinDays}天`));
            
          } catch (error) {
            console.log(chalk.red(`❌ 错误: ${error.message}`));
          }
          
          setTimeout(() => {
            showCommitmentMenu();
            askForChoice('请选择承诺书操作 (1-5): ', handleCommitmentChoice);
          }, 1000);
        });
      });
    });
  });
}

// 今日打卡
async function checkinToday() {
  console.log(chalk.bold('✅ 今日打卡'));
  
  const today = new Date().toLocaleDateString('zh-CN');
  
  rl.question(chalk.cyan(`是否完成今日承诺? (y/n, 默认: y): `), async (answer) => {
    const completed = !answer || answer.toLowerCase() === 'y';
    
    rl.question(chalk.cyan('备注 (可选): '), async (remark) => {
      try {
        const result = await service.updateCommitmentCheckin(
          today,
          completed,
          remark.trim()
        );
        
        if (result.success) {
          console.log(chalk.green('✅ 打卡成功！'));
          console.log(chalk.gray(`日期: ${result.date}`));
          console.log(chalk.gray(`状态: ${result.completed ? '已完成' : '未完成'}`));
          if (result.remark) {
            console.log(chalk.gray(`备注: ${result.remark}`));
          }
        } else {
          console.log(chalk.yellow('⚠️  未找到今日打卡记录'));
        }
        
      } catch (error) {
        console.log(chalk.red(`❌ 错误: ${error.message}`));
      }
      
      setTimeout(() => {
        showCommitmentMenu();
        askForChoice('请选择承诺书操作 (1-5): ', handleCommitmentChoice);
      }, 1000);
    });
  });
}

// 获取每日提醒
async function getDailyReminders() {
  console.log(chalk.bold('🔔 每日提醒'));
  
  try {
    const reminders = service.getDailyReminders();
    
    console.log(chalk.cyan(`📅 ${reminders.date}`));
    console.log(chalk.gray('─'.repeat(40)));
    
    if (reminders.reminders.length > 0) {
      console.log(chalk.yellow('🚨 今日高优先级事项:'));
      reminders.reminders.forEach((reminder, index) => {
        console.log(chalk.white(`  ${index + 1}. ${reminder}`));
      });
    } else {
      console.log(chalk.green('✅ 今日所有高优先级事项已完成！'));
    }
    
    console.log(chalk.gray('─'.repeat(40)));
    console.log(chalk.cyan(reminders.message));
    
  } catch (error) {
    console.log(chalk.red(`❌ 错误: ${error.message}`));
  }
  
  setTimeout(() => {
    showRemindersMenu();
    askForChoice('请选择提醒操作 (1-7): ', handleRemindersChoice);
  }, 1000);
}

// 获取晚间复盘
async function getEveningReview() {
  console.log(chalk.bold('🌙 晚间复盘'));
  
  try {
    const review = service.getEveningReview();
    
    console.log(chalk.cyan(`📅 ${review.date}`));
    console.log(chalk.gray('─'.repeat(40)));
    
    console.log(chalk.bold('📊 A类事项完成情况:'));
    console.log(chalk.white(`  完成数: ${review.aTasks.completed}/${review.aTasks.total}`));
    console.log(chalk.cyan(`  完成率: ${review.aTasks.rate}%`));
    
    console.log(chalk.bold('💭 心态评分:'));
    const scoreColor = review.mindsetScore >= 60 ? chalk.green : chalk.red;
    console.log(scoreColor(`  总分: ${review.mindsetScore}分`));
    
    console.log(chalk.gray('─'.repeat(40)));
    console.log(chalk.yellow(review.message));
    
  } catch (error) {
    console.log(chalk.red(`❌ 错误: ${error.message}`));
  }
  
  setTimeout(() => {
    showRemindersMenu();
    askForChoice('请选择提醒操作 (1-7): ', handleRemindersChoice);
  }, 1000);
}

// 启动定时任务
async function startScheduledTasks() {
  console.log(chalk.bold('⏰ 启动定时任务'));
  
  try {
    notificationService.startAllSchedules();
    console.log(chalk.green('✅ 所有定时任务已启动！'));
    
    const status = notificationService.getScheduleStatus();
    console.log(chalk.gray('─'.repeat(40)));
    console.log(chalk.bold('📋 任务状态:'));
    
    Object.keys(status.schedules).forEach(jobName => {
      const job = status.schedules[jobName];
      const statusText = job.running ? chalk.green('运行中') : chalk.red('已停止');
      console.log(chalk.white(`  ${jobName}: ${statusText}`));
    });
    
  } catch (error) {
    console.log(chalk.red(`❌ 错误: ${error.message}`));
  }
  
  setTimeout(() => {
    showRemindersMenu();
    askForChoice('请选择提醒操作 (1-7): ', handleRemindersChoice);
  }, 1000);
}

// ========== 其他功能 (简化实现) ==========

async function handleWeeklyGoals() {
  console.log(chalk.bold('📊 周目标管理'));
  console.log(chalk.gray('此功能需要启动API服务后使用Web界面'));
  console.log(chalk.gray('或使用指令: npm start 启动服务'));
  
  setTimeout(() => {
    showMainMenu();
    askForChoice('请选择操作 (0-9): ', handleMainMenuChoice);
  }, 2000);
}

async function handleMonthlyTracking() {
  console.log(chalk.bold('📈 月度追踪'));
  console.log(chalk.gray('此功能需要启动API服务后使用Web界面'));
  console.log(chalk.gray('或使用指令: npm start 启动服务'));
  
  setTimeout(() => {
    showMainMenu();
    askForChoice('请选择操作 (0-9): ', handleMainMenuChoice);
  }, 2000);
}

async function handleReports() {
  console.log(chalk.bold('📄 报告与统计'));
  console.log(chalk.gray('此功能需要启动API服务后使用Web界面'));
  console.log(chalk.gray('或使用指令: npm start 启动服务'));
  
  setTimeout(() => {
    showMainMenu();
    askForChoice('请选择操作 (0-9): ', handleMainMenuChoice);
  }, 2000);
}

async function handleSystemSettings() {
  console.log(chalk.bold('⚙️  系统设置'));
  console.log(chalk.gray('此功能需要启动API服务后使用Web界面'));
  console.log(chalk.gray('或使用指令: npm start 启动服务'));
  
  setTimeout(() => {
    showMainMenu();
    askForChoice('请选择操作 (0-9): ', handleMainMenuChoice);
  }, 2000);
}

async function markAnnualGoalComplete() {
  console.log(chalk.yellow('⚠️  此功能需要Web界面操作'));
  setTimeout(() => {
    showAnnualGoalsMenu();
    askForChoice('请选择年度目标操作 (1-5): ', handleAnnualGoalsChoice);
  }, 1000);
}

async function exportAnnualReport() {
  console.log(chalk.yellow('⚠️  此功能需要Web界面操作'));
  setTimeout(() => {
    showAnnualGoalsMenu();
    askForChoice('请选择年度目标操作 (1-5): ', handleAnnualGoalsChoice);
  }, 1000);
}

async function viewMonthlyGoals() {
  console.log(chalk.yellow('⚠️  此功能需要Web界面操作'));
  setTimeout(() => {
    showMonthlyGoalsMenu();
    askForChoice('请选择月度目标操作 (1-5): ', handleMonthlyGoalsChoice);
  }, 1000);
}

async function updateMonthlyCompletion() {
  console.log(chalk.yellow('⚠️  此功能需要Web界面操作'));
  setTimeout(() => {
    showMonthlyGoalsMenu();
    askForChoice('请选择月度目标操作 (1-5): ', handleMonthlyGoalsChoice);
  }, 1000);
}

async function monthlyReview() {
  console.log(chalk.yellow('⚠️  此功能需要Web界面操作'));
  setTimeout(() => {
    showMonthlyGoalsMenu();
    askForChoice('请选择月度目标操作 (1-5): ', handleMonthlyGoalsChoice);
  }, 1000);
}

async function viewHistoryGoals() {
  console.log(chalk.yellow('⚠️  此功能需要Web界面操作'));
  setTimeout(() => {
    showDailyGoalsMenu();
    askForChoice('请选择日目标操作 (1-6): ', handleDailyGoalsChoice);
  }, 1000);
}

async function updateTaskStatus() {
  console.log(chalk.yellow('⚠️  此功能需要Web界面操作'));
  setTimeout(() => {
    showDailyGoalsMenu();
    askForChoice('请选择日目标操作 (1-6): ', handleDailyGoalsChoice);
  }, 1000);
}

async function fillMindsetScores() {
  console.log(chalk.yellow('⚠️  此功能需要Web界面操作'));
  setTimeout(() => {
    showDailyGoalsMenu();
    askForChoice('请选择日目标操作 (1-6): ', handleDailyGoalsChoice);
  }, 1000);
}

async function todayReview() {
  console.log(chalk.yellow('⚠️  此功能需要Web界面操作'));
  setTimeout(() => {
    showDailyGoalsMenu();
    askForChoice('请选择日目标操作 (1-6): ', handleDailyGoalsChoice);
  }, 1000);
}

async function viewCheckinRecords() {
  console.log(chalk.yellow('⚠️  此功能需要Web界面操作'));
  setTimeout(() => {
    showCommitmentMenu();
    askForChoice('请选择承诺书操作 (1-5): ', handleCommitmentChoice);
  }, 1000);
}

async function checkinStatistics() {
  console.log(chalk.yellow('⚠️  此功能需要Web界面操作'));
  setTimeout(() => {
    showCommitmentMenu();
    askForChoice('请选择承诺书操作 (1-5): ', handleCommitmentChoice);
  }, 1000);
}

async function getMindsetAlert() {
  console.log(chalk.yellow('⚠️  此功能需要Web界面操作'));
  setTimeout(() => {
    showRemindersMenu();
    askForChoice('请选择提醒操作 (1-7): ', handleRemindersChoice);
  }, 1000);
}

async function getCommitmentReminder() {
  console.log(chalk.yellow('⚠️  此功能需要Web界面操作'));
  setTimeout(() => {
    showRemindersMenu();
    askForChoice('请选择提醒操作 (1-7): ', handleRemindersChoice);
  }, 1000);
}

async function stopScheduledTasks() {
  console.log(chalk.yellow('⚠️  此功能需要Web界面操作'));
  setTimeout(() => {
    showRemindersMenu();
    askForChoice('请选择提醒操作 (1-7): ', handleRemindersChoice);
  }, 1000);
}

// ========== 启动程序 ==========

// 启动CLI
function startCLI() {
  showWelcome();
  showMainMenu();
  askForChoice('请选择操作 (0-9): ', handleMainMenuChoice);
}

// 处理Ctrl+C
rl.on('close', () => {
  console.log(chalk.yellow('\n👋 感谢使用行动日志系统，再见！'));
  process.exit(0);
});

// 启动
if (require.main === module) {
  startCLI();
}

module.exports = {
  startCLI,
  service,
  notificationService
};