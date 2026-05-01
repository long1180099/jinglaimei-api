const cron = require('node-cron');
const ActionLogService = require('./ActionLogService');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

class NotificationService {
  constructor() {
    this.actionLogService = new ActionLogService();
    this.cronJobs = {};
    this.notificationHistory = [];
    this.maxHistory = 100;
    
    // 加载配置
    this.config = this.loadConfig();
  }
  
  loadConfig() {
    const configPath = path.join(__dirname, '../config/notifications.json');
    
    if (fs.existsSync(configPath)) {
      try {
        return JSON.parse(fs.readFileSync(configPath, 'utf8'));
      } catch (error) {
        console.error('加载通知配置错误:', error);
      }
    }
    
    // 默认配置
    return {
      enabled: true,
      channels: {
        console: true,
        file: true,
        webhook: false,
        email: false
      },
      schedules: {
        morningReminder: '0 8 * * *', // 每天早上8点
        eveningReview: '0 21 * * *',  // 每天晚上9点
        weeklySummary: '0 20 * * 0',  // 每周日晚上8点
        monthlyStart: '0 0 1 * *',    // 每月1日0点
        mindsetAlert: '0 22 * * *',   // 每天晚上10点
        commitmentCheck: '0 23 * * *' // 每天晚上11点
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
  }
  
  saveConfig() {
    const configPath = path.join(__dirname, '../config');
    if (!fs.existsSync(configPath)) {
      fs.mkdirSync(configPath, { recursive: true });
    }
    
    fs.writeFileSync(
      path.join(configPath, 'notifications.json'),
      JSON.stringify(this.config, null, 2),
      'utf8'
    );
  }
  
  // 添加通知记录
  addNotification(type, message, level = 'info') {
    const notification = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      type,
      level,
      message,
      delivered: false
    };
    
    this.notificationHistory.unshift(notification);
    
    // 限制历史记录数量
    if (this.notificationHistory.length > this.maxHistory) {
      this.notificationHistory = this.notificationHistory.slice(0, this.maxHistory);
    }
    
    return notification;
  }
  
  // 发送通知到不同渠道
  async sendNotification(notification) {
    const channels = [];
    
    if (this.config.channels.console) {
      this.sendToConsole(notification);
      channels.push('console');
    }
    
    if (this.config.channels.file) {
      this.sendToFile(notification);
      channels.push('file');
    }
    
    if (this.config.channels.webhook && this.config.webhook.wechat) {
      const sent = await this.sendToWebhook(notification);
      if (sent) channels.push('webhook');
    }
    
    if (this.config.channels.email && this.config.email.enabled) {
      const sent = await this.sendToEmail(notification);
      if (sent) channels.push('email');
    }
    
    notification.delivered = true;
    notification.channels = channels;
    
    return channels;
  }
  
  sendToConsole(notification) {
    const timestamp = new Date(notification.timestamp).toLocaleTimeString('zh-CN');
    const levelColors = {
      info: '\x1b[36m', // 青色
      warning: '\x1b[33m', // 黄色
      error: '\x1b[31m', // 红色
      success: '\x1b[32m' // 绿色
    };
    
    const color = levelColors[notification.level] || '\x1b[0m';
    const reset = '\x1b[0m';
    
    console.log(`${color}[${timestamp}] [${notification.type.toUpperCase()}] ${notification.message}${reset}`);
  }
  
  sendToFile(notification) {
    const logPath = path.join(__dirname, '../logs/notifications.log');
    const logDir = path.dirname(logPath);
    
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    const logEntry = `[${notification.timestamp}] [${notification.type}] [${notification.level}] ${notification.message}\n`;
    
    try {
      fs.appendFileSync(logPath, logEntry, 'utf8');
      return true;
    } catch (error) {
      console.error('写入日志文件错误:', error);
      return false;
    }
  }
  
  async sendToWebhook(notification) {
    if (!this.config.webhook.wechat) {
      return false;
    }
    
    try {
      const payload = {
        msgtype: 'text',
        text: {
          content: `[行动日志提醒] ${notification.message}\n时间: ${new Date(notification.timestamp).toLocaleString('zh-CN')}`
        }
      };
      
      await axios.post(this.config.webhook.wechat, payload);
      return true;
    } catch (error) {
      console.error('发送Webhook通知错误:', error);
      return false;
    }
  }
  
  async sendToEmail(notification) {
    // 这里需要配置实际的邮件服务
    // 暂时返回false，表示未实现
    return false;
  }
  
  // 1. 每日晨间提醒
  async sendMorningReminder() {
    try {
      const reminders = this.actionLogService.getDailyReminders();
      
      let message;
      if (reminders.reminders.length > 0) {
        message = `🌞 早上好！今日重点事项:\n${reminders.reminders.map((r, i) => `${i + 1}. ${r}`).join('\n')}`;
      } else {
        message = '🌞 早上好！今日所有高优先级事项已完成，继续保持！';
      }
      
      const notification = this.addNotification('morning_reminder', message, 'info');
      await this.sendNotification(notification);
      
      return { success: true, reminders: reminders.reminders.length };
    } catch (error) {
      console.error('发送晨间提醒错误:', error);
      return { success: false, error: error.message };
    }
  }
  
  // 2. 晚间复盘提醒
  async sendEveningReview() {
    try {
      const review = this.actionLogService.getEveningReview();
      
      let message;
      if (review.needsImprovement) {
        message = `🌙 晚间复盘提醒:\n${review.message}\n今日A类事项完成率: ${review.aTasks.rate}%\n心态评分: ${review.mindsetScore}分`;
      } else {
        message = `🌙 晚间复盘: 今日表现良好！\nA类事项完成率: 100%\n心态评分: ${review.mindsetScore}分`;
      }
      
      const notification = this.addNotification('evening_review', message, review.needsImprovement ? 'warning' : 'success');
      await this.sendNotification(notification);
      
      return { success: true, review };
    } catch (error) {
      console.error('发送晚间复盘错误:', error);
      return { success: false, error: error.message };
    }
  }
  
  // 3. 周总结生成
  async generateWeeklySummary() {
    try {
      const summary = await this.actionLogService.completeWeeklySummary();
      
      const message = `📊 周总结已生成:\n完成情况: ${summary.summary.目标完成情况}\n创新收获: ${summary.summary.本周创新与收获}`;
      
      const notification = this.addNotification('weekly_summary', message, 'info');
      await this.sendNotification(notification);
      
      return { success: true, summary };
    } catch (error) {
      console.error('生成周总结错误:', error);
      return { success: false, error: error.message };
    }
  }
  
  // 4. 月度目标启动
  async startMonthlyGoals() {
    try {
      const now = new Date();
      const month = `${now.getMonth() + 1}月`;
      
      const result = await this.actionLogService.generateMonthlyGoalsFromAnnual(month);
      
      const message = `📅 ${month}目标已从年度目标中生成\n共 ${result.count} 个目标需要完成`;
      
      const notification = this.addNotification('monthly_start', message, 'info');
      await this.sendNotification(notification);
      
      return { success: true, month, count: result.count };
    } catch (error) {
      console.error('启动月度目标错误:', error);
      return { success: false, error: error.message };
    }
  }
  
  // 5. 心态预警
  async sendMindsetAlert() {
    try {
      const now = new Date();
      const month = `${now.getMonth() + 1}月`;
      const today = now.toISOString().split('T')[0];
      
      // 检查今日心态评分
      const dailyPath = path.join(
        this.actionLogService.baseDataPath,
        'daily_goals',
        `日目标表_${today}.xlsx`
      );
      
      if (!fs.existsSync(dailyPath)) {
        // 今日尚未创建日目标
        const message = '⚠️ 今日尚未填写日目标，请及时填写心态评分';
        const notification = this.addNotification('mindset_alert', message, 'warning');
        await this.sendNotification(notification);
        return { success: true, alert: 'no_daily_goal' };
      }
      
      const dailyData = this.actionLogService.excelService.readWorkbook(dailyPath);
      const mindsetData = dailyData['心态管理'] || [];
      
      const totalScoreRow = mindsetData.find(row => row.心态指标 === '心态合计分');
      const totalScore = totalScoreRow ? parseInt(totalScoreRow.评分) : 0;
      
      if (totalScore < 60) {
        const improvementRow = dailyData['今日学习改进']?.[0];
        const improvement = improvementRow?.改进方法 || '请关注心态调整';
        
        const message = `⚠️ 今日心态评分较低: ${totalScore}分 (<60)\n改进建议: ${improvement}`;
        
        const notification = this.addNotification('mindset_alert', message, 'warning');
        await this.sendNotification(notification);
        
        return { success: true, alert: 'low_score', score: totalScore, improvement };
      }
      
      return { success: true, alert: 'normal', score: totalScore };
    } catch (error) {
      console.error('发送心态预警错误:', error);
      return { success: false, error: error.message };
    }
  }
  
  // 6. 承诺书打卡检查
  async checkCommitmentCheckin() {
    try {
      const commitmentData = this.actionLogService.excelService.readWorkbook(
        this.actionLogService.filePaths.commitment
      );
      
      const commitment = commitmentData['承诺书']?.[0] || {};
      const checkinRecords = commitmentData['打卡记录'] || [];
      
      if (!commitment.承诺人) {
        return { success: false, error: '未找到承诺书' };
      }
      
      const today = new Date().toLocaleDateString('zh-CN');
      const todayRecord = checkinRecords.find(record => record.日期 === today);
      
      let message;
      let level = 'info';
      
      if (!todayRecord) {
        message = `📝 ${commitment.承诺人}，今日尚未打卡承诺书`;
        level = 'warning';
      } else if (todayRecord.是否完成 !== '是') {
        message = `📝 ${commitment.承诺人}，今日承诺书打卡状态: 未完成`;
        level = 'warning';
      } else {
        message = `✅ ${commitment.承诺人}，今日承诺书打卡已完成`;
        level = 'success';
      }
      
      // 检查连续打卡天数
      const sortedRecords = [...checkinRecords].sort((a, b) => a.日期.localeCompare(b.日期));
      let continuousDays = 0;
      let currentStreak = 0;
      
      for (let i = sortedRecords.length - 1; i >= 0; i--) {
        if (sortedRecords[i].是否完成 === '是') {
          currentStreak++;
        } else {
          break;
        }
      }
      
      if (currentStreak > 0) {
        message += `\n连续打卡天数: ${currentStreak}天`;
      }
      
      // 如果有监督人且未完成，发送提醒给监督人
      if (commitment.监督人 && todayRecord && todayRecord.是否完成 !== '是') {
        const supervisorMessage = `👀 监督提醒: ${commitment.承诺人} 今日未完成承诺书打卡`;
        const supervisorNotification = this.addNotification(
          'supervisor_alert', 
          supervisorMessage, 
          'warning'
        );
        await this.sendNotification(supervisorNotification);
      }
      
      const notification = this.addNotification('commitment_check', message, level);
      await this.sendNotification(notification);
      
      return { 
        success: true, 
        person: commitment.承诺人,
        todayStatus: todayRecord?.是否完成 || '未打卡',
        continuousDays: currentStreak
      };
    } catch (error) {
      console.error('检查承诺书打卡错误:', error);
      return { success: false, error: error.message };
    }
  }
  
  // 7. 启动所有定时任务
  startAllSchedules() {
    if (!this.config.enabled) {
      console.log('通知服务已禁用');
      return;
    }
    
    const schedules = this.config.schedules;
    
    // 晨间提醒 (每天早上8点)
    this.cronJobs.morningReminder = cron.schedule(schedules.morningReminder, () => {
      console.log('执行晨间提醒任务...');
      this.sendMorningReminder();
    });
    
    // 晚间复盘 (每天晚上9点)
    this.cronJobs.eveningReview = cron.schedule(schedules.eveningReview, () => {
      console.log('执行晚间复盘任务...');
      this.sendEveningReview();
    });
    
    // 周总结 (每周日晚上8点)
    this.cronJobs.weeklySummary = cron.schedule(schedules.weeklySummary, () => {
      console.log('执行周总结任务...');
      this.generateWeeklySummary();
    });
    
    // 月度目标启动 (每月1日0点)
    this.cronJobs.monthlyStart = cron.schedule(schedules.monthlyStart, () => {
      console.log('执行月度目标启动任务...');
      this.startMonthlyGoals();
    });
    
    // 心态预警 (每天晚上10点)
    this.cronJobs.mindsetAlert = cron.schedule(schedules.mindsetAlert, () => {
      console.log('执行心态预警任务...');
      this.sendMindsetAlert();
    });
    
    // 承诺书检查 (每天晚上11点)
    this.cronJobs.commitmentCheck = cron.schedule(schedules.commitmentCheck, () => {
      console.log('执行承诺书检查任务...');
      this.checkCommitmentCheckin();
    });
    
    console.log('所有定时任务已启动');
    
    // 立即执行一次晨间提醒（如果当前时间是早上8点后）
    const now = new Date();
    if (now.getHours() >= 8) {
      setTimeout(() => {
        this.sendMorningReminder();
      }, 5000);
    }
  }
  
  // 停止所有定时任务
  stopAllSchedules() {
    Object.keys(this.cronJobs).forEach(jobName => {
      if (this.cronJobs[jobName]) {
        this.cronJobs[jobName].stop();
        console.log(`已停止任务: ${jobName}`);
      }
    });
    
    this.cronJobs = {};
  }
  
  // 获取任务状态
  getScheduleStatus() {
    const status = {
      enabled: this.config.enabled,
      schedules: {},
      nextRuns: {}
    };
    
    Object.keys(this.config.schedules).forEach(jobName => {
      status.schedules[jobName] = {
        cron: this.config.schedules[jobName],
        running: !!this.cronJobs[jobName]
      };
    });
    
    return status;
  }
  
  // 手动触发任务
  async triggerTask(taskName) {
    const taskMap = {
      'morning_reminder': this.sendMorningReminder.bind(this),
      'evening_review': this.sendEveningReview.bind(this),
      'weekly_summary': this.generateWeeklySummary.bind(this),
      'monthly_start': this.startMonthlyGoals.bind(this),
      'mindset_alert': this.sendMindsetAlert.bind(this),
      'commitment_check': this.checkCommitmentCheckin.bind(this)
    };
    
    if (!taskMap[taskName]) {
      return { success: false, error: `未知任务: ${taskName}` };
    }
    
    try {
      const result = await taskMap[taskName]();
      return { success: true, task: taskName, result };
    } catch (error) {
      console.error(`手动触发任务 ${taskName} 错误:`, error);
      return { success: false, task: taskName, error: error.message };
    }
  }
}

module.exports = NotificationService;