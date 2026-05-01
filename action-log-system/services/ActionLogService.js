const ExcelService = require('./ExcelService');
const path = require('path');
const fs = require('fs');

// 导入模板
const annualGoalTemplate = require('../templates/annual_goal_template');
const monthlyGoalTemplate = require('../templates/monthly_goal_template');
const weeklyGoalTemplate = require('../templates/weekly_goal_template');
const dailyGoalTemplate = require('../templates/daily_goal_template');
const monthlyTrackingTemplate = require('../templates/monthly_tracking_template');
const commitmentTemplate = require('../templates/commitment_template');

class ActionLogService {
  constructor() {
    this.excelService = new ExcelService();
    this.baseDataPath = '/Users/apple/WorkBuddy/20260324191412/action-log-system/data';
    
    // 初始化模板映射
    this.templates = {
      annual: annualGoalTemplate.annualGoalTemplate,
      monthly: monthlyGoalTemplate.monthlyGoalTemplate,
      weekly: weeklyGoalTemplate.weeklyGoalTemplate,
      daily: dailyGoalTemplate.dailyGoalTemplate,
      tracking: monthlyTrackingTemplate.monthlyTrackingTemplate,
      commitment: commitmentTemplate.commitmentTemplate
    };
    
    // 文件路径映射
    this.filePaths = {
      annual: path.join(this.baseDataPath, 'annual_goals/年度目标表.xlsx'),
      monthly: path.join(this.baseDataPath, 'monthly_goals/月度目标表.xlsx'),
      weekly: path.join(this.baseDataPath, 'weekly_goals/周目标表.xlsx'),
      daily: path.join(this.baseDataPath, 'daily_goals/日目标表.xlsx'),
      tracking: path.join(this.baseDataPath, 'monthly_tracking/月度达成追踪表.xlsx'),
      commitment: path.join(this.baseDataPath, 'commitments/承诺书.xlsx')
    };
  }
  
  // 1. 年度目标相关功能
  async setAnnualGoal(category, content, methods, timeRange = '1-12月') {
    const filePath = this.filePaths.annual;
    const sheetName = category.includes('财务') ? '目标表一' : '目标表二';
    
    // 获取当前序号
    const existingData = this.excelService.readWorkbook(filePath);
    const sheetData = existingData[sheetName] || [];
    const maxId = sheetData.length > 0 
      ? Math.max(...sheetData.map(item => item.序号 || 0)) 
      : 0;
    
    const newRow = {
      类别: category,
      序号: maxId + 1,
      目标内容: content,
      方法和措施: methods,
      起止时间: timeRange,
      '完成打√': ''
    };
    
    const position = await this.excelService.addRow(filePath, sheetName, newRow, 'append');
    return { success: true, position, row: newRow };
  }
  
  async getAnnualGoalProgress() {
    const filePath = this.filePaths.annual;
    const data = this.excelService.readWorkbook(filePath);
    
    const result = {
      total: { completed: 0, total: 0, rate: 0 },
      byCategory: {},
      bySheet: {}
    };
    
    Object.keys(data).forEach(sheetName => {
      const sheetData = data[sheetName];
      const completed = sheetData.filter(item => item['完成打√'] === '√').length;
      const total = sheetData.length;
      const rate = total > 0 ? (completed / total * 100).toFixed(1) : 0;
      
      result.bySheet[sheetName] = { completed, total, rate };
      result.total.completed += completed;
      result.total.total += total;
      
      // 按类别统计
      sheetData.forEach(item => {
        const category = item.类别;
        if (!result.byCategory[category]) {
          result.byCategory[category] = { completed: 0, total: 0 };
        }
        result.byCategory[category].total++;
        if (item['完成打√'] === '√') {
          result.byCategory[category].completed++;
        }
      });
    });
    
    if (result.total.total > 0) {
      result.total.rate = (result.total.completed / result.total.total * 100).toFixed(1);
    }
    
    // 计算分类完成率
    Object.keys(result.byCategory).forEach(category => {
      const cat = result.byCategory[category];
      cat.rate = cat.total > 0 ? (cat.completed / cat.total * 100).toFixed(1) : 0;
    });
    
    return result;
  }
  
  // 2. 月度目标相关功能
  async generateMonthlyGoalsFromAnnual(month) {
    const annualPath = this.filePaths.annual;
    const monthlyPath = this.filePaths.monthly;
    
    // 读取年度目标
    const annualData = this.excelService.readWorkbook(annualPath);
    const relevantGoals = [];
    
    // 筛选包含该月份的目标
    Object.keys(annualData).forEach(sheetName => {
      annualData[sheetName].forEach(goal => {
        if (goal.起止时间 && goal.起止时间.includes(month)) {
          relevantGoals.push({
            重要级别: 'A' + (relevantGoals.length + 1),
            目标内容: goal.目标内容,
            具体措施: goal.方法和措施,
            '完成打√': ''
          });
        }
      });
    });
    
    // 更新月度目标表
    if (relevantGoals.length > 0) {
      const updates = {
        '方法和措施': relevantGoals
      };
      
      this.excelService.updateWorkbook(monthlyPath, updates);
    }
    
    return { success: true, count: relevantGoals.length, month };
  }
  
  async updateMonthlyCompletion(month) {
    const dailyPath = this.filePaths.daily;
    const monthlyPath = this.filePaths.monthly;
    
    // 读取当月所有日目标
    const dailyFiles = fs.readdirSync(path.dirname(dailyPath))
      .filter(file => file.includes(month) && file.endsWith('.xlsx'));
    
    const dailyData = [];
    dailyFiles.forEach(file => {
      const filePath = path.join(path.dirname(dailyPath), file);
      const data = this.excelService.readWorkbook(filePath);
      if (data['ABC分类事项']) {
        dailyData.push(...data['ABC分类事项']);
      }
    });
    
    // 分析完成情况
    const completedTasks = dailyData.filter(task => task['完成打√'] === '√').length;
    const totalTasks = dailyData.length;
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks * 100).toFixed(1) : 0;
    
    // 更新月度完成情况
    const monthlyData = this.excelService.readWorkbook(monthlyPath);
    const methodsData = monthlyData['方法和措施'] || [];
    
    const completionUpdates = methodsData.map(goal => {
      const relatedTasks = dailyData.filter(task => 
        task.今日事项 && task.今日事项.includes(goal.目标内容)
      );
      
      const completed = relatedTasks.filter(task => task['完成打√'] === '√').length;
      const total = relatedTasks.length;
      
      return {
        目标内容: goal.目标内容,
        实际完成: total > 0 ? `${completed}/${total}` : '无相关任务',
        差距: total > 0 ? total - completed : 0,
        原因分析: total > 0 && completed < total ? '部分任务未完成' : '全部完成',
        改进对策: completed < total ? '加强任务跟踪' : '保持良好状态',
        创新收获: completed >= total ? '达成目标，积累了经验' : '需要改进执行'
      };
    });
    
    this.excelService.updateWorkbook(monthlyPath, {
      '完成情况': completionUpdates
    });
    
    return {
      success: true,
      month,
      completionRate,
      taskStats: { completedTasks, totalTasks }
    };
  }
  
  // 3. 周目标相关功能
  async generateWeeklyGoals() {
    const monthlyPath = this.filePaths.monthly;
    const weeklyPath = this.filePaths.weekly;
    
    // 读取月度目标
    const monthlyData = this.excelService.readWorkbook(monthlyPath);
    const methodsData = monthlyData['方法和措施'] || [];
    
    // 筛选未完成的高优先级目标
    const highPriorityGoals = methodsData
      .filter(goal => goal.重要级别?.startsWith('A') && goal['完成打√'] !== '√')
      .slice(0, 5); // 最多5个
    
    const weeklyGoals = highPriorityGoals.map((goal, index) => ({
      优先顺序: `A${index + 1}`,
      本周工作目标: goal.目标内容,
      完成期限: '本周五'
    }));
    
    // 更新周目标表
    this.excelService.updateWorkbook(weeklyPath, {
      '本周目标': weeklyGoals
    });
    
    return {
      success: true,
      count: weeklyGoals.length,
      goals: weeklyGoals.map(g => g.本周工作目标)
    };
  }
  
  async completeWeeklySummary() {
    const weeklyPath = this.filePaths.weekly;
    const weeklyData = this.excelService.readWorkbook(weeklyPath);
    const weeklyGoals = weeklyData['本周目标'] || [];
    
    const completed = weeklyGoals.filter(goal => 
      goal.完成情况 === '已完成' || goal['完成打√'] === '√'
    ).length;
    const total = weeklyGoals.length;
    const completionRate = total > 0 ? (completed / total * 100).toFixed(1) : 0;
    
    const summary = {
      目标完成情况: `${completed}/${total} (${completionRate}%)`,
      未完成原因: completed < total ? '时间安排不够合理，部分任务优先级调整' : '全部完成',
      改进方法: completed < total ? '优化时间管理，提高专注力' : '继续保持高效执行',
      本周创新与收获: '学会了新的工作方法，提高了效率'
    };
    
    this.excelService.updateWorkbook(weeklyPath, {
      '本周总结': [summary]
    });
    
    return {
      success: true,
      summary,
      stats: { completed, total, completionRate }
    };
  }
  
  // 4. 日目标相关功能
  async createDailyGoal(date, tasks, learning, mindsetScores) {
    const dailyPath = path.join(
      this.baseDataPath, 
      'daily_goals', 
      `日目标表_${date}.xlsx`
    );
    
    // 创建日目标模板
    const template = dailyGoalTemplate.dailyGoalTemplate(date);
    
    // 更新ABC分类事项
    if (tasks && tasks.length > 0) {
      tasks.forEach((task, index) => {
        if (index < template['ABC分类事项'].length) {
          template['ABC分类事项'][index] = {
            ...template['ABC分类事项'][index],
            今日事项: task.content,
            起止时间: task.timeRange || template['ABC分类事项'][index].起止时间
          };
        }
      });
    }
    
    // 更新今日学习
    if (learning) {
      template['今日学习改进'][0] = {
        今日学习: learning.content,
        改进方法: learning.improvement
      };
    }
    
    // 更新心态管理
    if (mindsetScores) {
      const mindsetTemplate = template['心态管理'];
      const mindsetIndicators = ['认真', '乐观', '自信', '坚守承诺', '爱与奉献', '决不找借口'];
      
      mindsetIndicators.forEach((indicator, index) => {
        if (mindsetScores[indicator] !== undefined && index < mindsetTemplate.length - 1) {
          mindsetTemplate[index].评分 = mindsetScores[indicator].toString();
        }
      });
      
      // 计算心态合计分
      const totalScore = mindsetIndicators.reduce((sum, indicator) => {
        return sum + (parseInt(mindsetScores[indicator]) || 10);
      }, 0);
      
      mindsetTemplate[6].评分 = totalScore.toString();
    }
    
    // 保存文件
    const workbook = this.excelService.createWorkbook(template, `日目标表_${date}`);
    this.excelService.saveWorkbook(workbook, dailyPath);
    
    return {
      success: true,
      date,
      filePath: dailyPath,
      tasksCount: tasks?.length || 0
    };
  }
  
  async getDailyMindsetTrend(month) {
    const dailyDir = path.join(this.baseDataPath, 'daily_goals');
    const files = fs.readdirSync(dailyDir)
      .filter(file => file.includes(month) && file.endsWith('.xlsx'));
    
    const trendData = [];
    
    files.forEach(file => {
      const filePath = path.join(dailyDir, file);
      const date = file.match(/日目标表_(\d{4}-\d{2}-\d{2})\.xlsx/)?.[1];
      
      if (date) {
        const data = this.excelService.readWorkbook(filePath);
        const mindsetData = data['心态管理'] || [];
        
        const totalScoreRow = mindsetData.find(row => row.心态指标 === '心态合计分');
        const improvementRow = data['今日学习改进']?.[0];
        
        if (totalScoreRow) {
          trendData.push({
            date,
            score: parseInt(totalScoreRow.评分) || 0,
            improvement: improvementRow?.改进方法 || '',
            lowScore: parseInt(totalScoreRow.评分) < 60
          });
        }
      }
    });
    
    // 按日期排序
    trendData.sort((a, b) => a.date.localeCompare(b.date));
    
    return {
      success: true,
      month,
      trendData,
      averageScore: trendData.length > 0 
        ? (trendData.reduce((sum, item) => sum + item.score, 0) / trendData.length).toFixed(1)
        : 0,
      lowScoreDays: trendData.filter(item => item.lowScore).length
    };
  }
  
  // 5. 月度追踪相关功能
  async updateMonthlyTracking(month, planned, actual) {
    const trackingPath = this.filePaths.tracking;
    const trackingData = this.excelService.readWorkbook(trackingPath);
    const trackingSheet = trackingData['月度达成追踪'] || [];
    
    const monthIndex = trackingSheet.findIndex(item => item.月份 === month);
    if (monthIndex === -1) {
      throw new Error(`找不到月份: ${month}`);
    }
    
    const gap = monthlyTrackingTemplate.calculateGap(planned, actual);
    const completionRate = monthlyTrackingTemplate.calculateCompletionRate(planned, actual);
    
    const updateData = {
      原定目标: planned,
      实际达成: actual,
      差距: gap,
      完成率: completionRate,
      自省改进点: parseInt(completionRate) < 80 ? '需要加强执行力和跟踪' : '继续保持良好状态'
    };
    
    this.excelService.updateRow(
      trackingPath,
      '月度达成追踪',
      { 月份: month },
      updateData
    );
    
    return {
      success: true,
      month,
      planned,
      actual,
      gap,
      completionRate
    };
  }
  
  async analyzeAnnualTargetGap() {
    const annualPath = this.filePaths.annual;
    const trackingPath = this.filePaths.tracking;
    
    const annualData = this.excelService.readWorkbook(annualPath);
    const trackingData = this.excelService.readWorkbook(trackingPath);
    
    const analysis = {
      criticalGaps: [],
      warnings: [],
      suggestions: []
    };
    
    // 分析目标偏差
    Object.keys(annualData).forEach(sheetName => {
      annualData[sheetName].forEach(goal => {
        if (goal['完成打√'] !== '√') {
          analysis.warnings.push({
            category: goal.类别,
            goal: goal.目标内容,
            status: '未完成',
            suggestion: '需要重新评估或调整计划'
          });
        }
      });
    });
    
    // 分析月度达成偏差
    const trackingSheet = trackingData['月度达成追踪'] || [];
    trackingSheet.forEach(item => {
      const rate = parseFloat(item.完成率) || 0;
      if (rate < 80 && item.实际达成 !== '') {
        analysis.criticalGaps.push({
          month: item.月份,
          planned: item.原定目标,
          actual: item.实际达成,
          gap: item.差距,
          rate: item.完成率,
          issue: item.自省改进点
        });
      }
    });
    
    // 生成建议
    if (analysis.criticalGaps.length > 0) {
      analysis.suggestions.push(
        '重点关注偏差超过20%的月份，分析原因并调整执行策略',
        '加强月度目标跟踪，确保目标分解合理',
        '建立预警机制，及时发现并处理偏差'
      );
    }
    
    if (analysis.warnings.length > 0) {
      analysis.suggestions.push(
        '重新评估未完成的年度目标，调整优先级',
        '将长期目标分解为更具体的短期任务',
        '增加定期检查和反馈机制'
      );
    }
    
    return {
      success: true,
      analysis,
      summary: {
        totalGaps: analysis.criticalGaps.length,
        totalWarnings: analysis.warnings.length,
        suggestions: analysis.suggestions.length
      }
    };
  }
  
  // 6. 承诺书相关功能
  async createCommitment(person, supervisor, pkPerson, duration = 30) {
    const commitmentPath = this.filePaths.commitment;
    
    const commitmentContent = commitmentTemplate.createCommitmentContent(
      person, supervisor, pkPerson, duration
    );
    
    const checkinRecords = commitmentTemplate.generateCheckinRecords(
      new Date().toISOString().split('T')[0],
      duration
    );
    
    const updates = {
      '承诺书': [commitmentContent],
      '打卡记录': checkinRecords
    };
    
    this.excelService.updateWorkbook(commitmentPath, updates);
    
    return {
      success: true,
      commitment: commitmentContent,
      duration,
      checkinDays: checkinRecords.length
    };
  }
  
  async updateCommitmentCheckin(date, completed = true, remark = '') {
    const commitmentPath = this.filePaths.commitment;
    
    const updateResult = this.excelService.updateRow(
      commitmentPath,
      '打卡记录',
      { 日期: date },
      { 
        是否完成: completed ? '是' : '否',
        备注: remark
      }
    );
    
    return {
      success: updateResult.updated,
      date,
      completed,
      remark
    };
  }
  
  async checkCommitmentStatus(person) {
    const commitmentPath = this.filePaths.commitment;
    const commitmentData = this.excelService.readWorkbook(commitmentPath);
    
    const commitment = commitmentData['承诺书']?.[0] || {};
    const checkinRecords = commitmentData['打卡记录'] || [];
    
    if (commitment.承诺人 !== person) {
      return { success: false, error: '承诺人信息不匹配' };
    }
    
    const totalDays = checkinRecords.length;
    const completedDays = checkinRecords.filter(record => record.是否完成 === '是').length;
    const completionRate = totalDays > 0 ? (completedDays / totalDays * 100).toFixed(1) : 0;
    
    // 检查连续打卡
    let continuousDays = 0;
    let maxContinuous = 0;
    let currentStreak = 0;
    
    checkinRecords.sort((a, b) => a.日期.localeCompare(b.日期));
    
    checkinRecords.forEach(record => {
      if (record.是否完成 === '是') {
        currentStreak++;
        continuousDays++;
        if (currentStreak > maxContinuous) {
          maxContinuous = currentStreak;
        }
      } else {
        currentStreak = 0;
      }
    });
    
    const currentDate = new Date().toLocaleDateString('zh-CN');
    const todayRecord = checkinRecords.find(record => record.日期 === currentDate);
    const todayStatus = todayRecord ? todayRecord.是否完成 === '是' : '未打卡';
    
    return {
      success: true,
      person,
      commitment: commitment.个人承诺内容,
      supervisor: commitment.监督人,
      pkPerson: commitment.PK人,
      stats: {
        totalDays,
        completedDays,
        completionRate: `${completionRate}%`,
        continuousDays,
        maxContinuous,
        todayStatus
      },
      recentRecords: checkinRecords.slice(-7) // 最近7天记录
    };
  }
  
  // 7. 通知提醒功能
  getDailyReminders() {
    const weeklyPath = this.filePaths.weekly;
    const weeklyData = this.excelService.readWorkbook(weeklyPath);
    const weeklyGoals = weeklyData['本周目标'] || [];
    
    // 获取未完成的高优先级事项
    const unfinishedHighPriority = weeklyGoals
      .filter(goal => 
        goal.优先顺序?.startsWith('A') && 
        (!goal.完成情况 || goal.完成情况 !== '已完成')
      )
      .map(goal => `${goal.优先顺序}: ${goal.本周工作目标}`);
    
    return {
      date: new Date().toLocaleDateString('zh-CN'),
      reminders: unfinishedHighPriority,
      count: unfinishedHighPriority.length,
      message: unfinishedHighPriority.length > 0 
        ? `今日有${unfinishedHighPriority.length}个高优先级事项待完成` 
        : '今日所有高优先级事项已完成'
    };
  }
  
  getEveningReview() {
    const today = new Date().toISOString().split('T')[0];
    const dailyPath = path.join(this.baseDataPath, 'daily_goals', `日目标表_${today}.xlsx`);
    
    if (!fs.existsSync(dailyPath)) {
      return {
        date: today,
        status: '未创建日目标',
        message: '今日尚未创建日目标，请及时填写'
      };
    }
    
    const dailyData = this.excelService.readWorkbook(dailyPath);
    const tasks = dailyData['ABC分类事项'] || [];
    const mindset = dailyData['心态管理'] || [];
    
    const aTasks = tasks.filter(task => task['ABC分类']?.startsWith('A'));
    const completedATasks = aTasks.filter(task => task['完成打√'] === '√').length;
    const totalATasks = aTasks.length;
    
    const totalScoreRow = mindset.find(row => row.心态指标 === '心态合计分');
    const totalScore = totalScoreRow ? parseInt(totalScoreRow.评分) : 0;
    
    let message = '';
    if (completedATasks < totalATasks) {
      const unfinished = totalATasks - completedATasks;
      message = `今日A类事项未完成${unfinished}个，请及时复盘改进`;
    } else {
      message = '今日A类事项全部完成，表现良好';
    }
    
    if (totalScore < 60) {
      message += '。心态评分较低，请关注心态管理';
    }
    
    return {
      date: today,
      aTasks: {
        total: totalATasks,
        completed: completedATasks,
        rate: totalATasks > 0 ? ((completedATasks / totalATasks) * 100).toFixed(1) : 0
      },
      mindsetScore: totalScore,
      message,
      needsImprovement: completedATasks < totalATasks || totalScore < 60
    };
  }
  
  // 8. 数据汇总与报告
  async generateMonthlyReport(month) {
    const reportData = {
      month,
      generatedAt: new Date().toISOString(),
      sections: {}
    };
    
    // 月度目标完成情况
    const monthlyCompletion = await this.updateMonthlyCompletion(month);
    reportData.sections.monthlyCompletion = monthlyCompletion;
    
    // 日目标心态趋势
    const mindsetTrend = await this.getDailyMindsetTrend(month);
    reportData.sections.mindsetTrend = mindsetTrend;
    
    // 周目标汇总
    const weeklySummary = await this.completeWeeklySummary();
    reportData.sections.weeklySummary = weeklySummary;
    
    // 承诺书状态
    const commitmentData = this.excelService.readWorkbook(this.filePaths.commitment);
    const commitment = commitmentData['承诺书']?.[0] || {};
    const checkinRecords = commitmentData['打卡记录'] || [];
    
    const monthlyCheckins = checkinRecords.filter(record => 
      record.日期 && record.日期.includes(month)
    );
    
    const completedCheckins = monthlyCheckins.filter(record => record.是否完成 === '是').length;
    
    reportData.sections.commitmentStatus = {
      person: commitment.承诺人,
      monthlyCheckins: monthlyCheckins.length,
      completedCheckins,
      completionRate: monthlyCheckins.length > 0 
        ? ((completedCheckins / monthlyCheckins.length) * 100).toFixed(1) 
        : 0
    };
    
    // 生成报告文件
    const reportPath = path.join(
      this.baseDataPath,
      'reports',
      `月度报告_${month}_${Date.now()}.json`
    );
    
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2), 'utf8');
    
    return {
      success: true,
      reportPath,
      month,
      sections: Object.keys(reportData.sections)
    };
  }
  
  // 9. 初始化所有模板
  async initializeAllTemplates() {
    const results = [];
    
    // 年度目标表
    const annualWorkbook = this.excelService.createWorkbook(
      this.templates.annual,
      '年度目标表.xlsx'
    );
    this.excelService.saveWorkbook(annualWorkbook, this.filePaths.annual);
    results.push({ type: 'annual', path: this.filePaths.annual });
    
    // 月度目标表
    const monthlyWorkbook = this.excelService.createWorkbook(
      this.templates.monthly,
      '月度目标表.xlsx'
    );
    this.excelService.saveWorkbook(monthlyWorkbook, this.filePaths.monthly);
    results.push({ type: 'monthly', path: this.filePaths.monthly });
    
    // 周目标表
    const weeklyWorkbook = this.excelService.createWorkbook(
      this.templates.weekly,
      '周目标表.xlsx'
    );
    this.excelService.saveWorkbook(weeklyWorkbook, this.filePaths.weekly);
    results.push({ type: 'weekly', path: this.filePaths.weekly });
    
    // 日目标表（当天）
    const today = new Date().toISOString().split('T')[0];
    const dailyTemplate = dailyGoalTemplate.dailyGoalTemplate(today);
    const dailyWorkbook = this.excelService.createWorkbook(
      dailyTemplate,
      `日目标表_${today}.xlsx`
    );
    this.excelService.saveWorkbook(dailyWorkbook, 
      path.join(this.baseDataPath, 'daily_goals', `日目标表_${today}.xlsx`)
    );
    results.push({ type: 'daily', date: today });
    
    // 月度达成追踪表
    const trackingWorkbook = this.excelService.createWorkbook(
      this.templates.tracking,
      '月度达成追踪表.xlsx'
    );
    this.excelService.saveWorkbook(trackingWorkbook, this.filePaths.tracking);
    results.push({ type: 'tracking', path: this.filePaths.tracking });
    
    // 承诺书
    const commitmentWorkbook = this.excelService.createWorkbook(
      this.templates.commitment,
      '承诺书.xlsx'
    );
    this.excelService.saveWorkbook(commitmentWorkbook, this.filePaths.commitment);
    results.push({ type: 'commitment', path: this.filePaths.commitment });
    
    return {
      success: true,
      initialized: results.length,
      results
    };
  }
}

module.exports = ActionLogService;