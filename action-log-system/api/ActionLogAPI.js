const express = require('express');
const router = express.Router();
const ActionLogService = require('../services/ActionLogService');

const actionLogService = new ActionLogService();

// 中间件：日志记录
const logRequest = (req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
};

router.use(logRequest);

// 健康检查
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Action Log System'
  });
});

// 1. 年度目标API
router.post('/annual-goals', async (req, res) => {
  try {
    const { category, content, methods, timeRange } = req.body;
    
    if (!category || !content) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数: category, content'
      });
    }
    
    const result = await actionLogService.setAnnualGoal(
      category,
      content,
      methods || '',
      timeRange || '1-12月'
    );
    
    res.json(result);
  } catch (error) {
    console.error('设置年度目标错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/annual-goals/progress', async (req, res) => {
  try {
    const result = await actionLogService.getAnnualGoalProgress();
    res.json(result);
  } catch (error) {
    console.error('获取年度目标进度错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.put('/annual-goals/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const filePath = actionLogService.filePaths.annual;
    
    // 这里需要根据实际情况实现标记完成的功能
    res.json({
      success: true,
      message: '标记完成功能待实现',
      goalId: id
    });
  } catch (error) {
    console.error('标记年度目标完成错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 2. 月度目标API
router.post('/monthly-goals/generate', async (req, res) => {
  try {
    const { month } = req.body;
    
    if (!month) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数: month'
      });
    }
    
    const result = await actionLogService.generateMonthlyGoalsFromAnnual(month);
    res.json(result);
  } catch (error) {
    console.error('生成月度目标错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/monthly-goals/:month/completion', async (req, res) => {
  try {
    const { month } = req.params;
    const result = await actionLogService.updateMonthlyCompletion(month);
    res.json(result);
  } catch (error) {
    console.error('获取月度完成情况错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 3. 周目标API
router.post('/weekly-goals/generate', async (req, res) => {
  try {
    const result = await actionLogService.generateWeeklyGoals();
    res.json(result);
  } catch (error) {
    console.error('生成周目标错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/weekly-goals/summary', async (req, res) => {
  try {
    const result = await actionLogService.completeWeeklySummary();
    res.json(result);
  } catch (error) {
    console.error('完成周总结错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 4. 日目标API
router.post('/daily-goals', async (req, res) => {
  try {
    const { date, tasks, learning, mindsetScores } = req.body;
    
    const result = await actionLogService.createDailyGoal(
      date || new Date().toISOString().split('T')[0],
      tasks,
      learning,
      mindsetScores
    );
    
    res.json(result);
  } catch (error) {
    console.error('创建日目标错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/daily-goals/mindset-trend/:month', async (req, res) => {
  try {
    const { month } = req.params;
    const result = await actionLogService.getDailyMindsetTrend(month);
    res.json(result);
  } catch (error) {
    console.error('获取心态趋势错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 5. 月度追踪API
router.put('/monthly-tracking/:month', async (req, res) => {
  try {
    const { month } = req.params;
    const { planned, actual } = req.body;
    
    if (planned === undefined || actual === undefined) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数: planned, actual'
      });
    }
    
    const result = await actionLogService.updateMonthlyTracking(
      month,
      parseFloat(planned),
      parseFloat(actual)
    );
    
    res.json(result);
  } catch (error) {
    console.error('更新月度追踪错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/monthly-tracking/analysis/gap', async (req, res) => {
  try {
    const result = await actionLogService.analyzeAnnualTargetGap();
    res.json(result);
  } catch (error) {
    console.error('分析目标差距错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 6. 承诺书API
router.post('/commitments', async (req, res) => {
  try {
    const { person, supervisor, pkPerson, duration } = req.body;
    
    if (!person || !supervisor) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数: person, supervisor'
      });
    }
    
    const result = await actionLogService.createCommitment(
      person,
      supervisor,
      pkPerson || '',
      duration || 30
    );
    
    res.json(result);
  } catch (error) {
    console.error('创建承诺书错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.put('/commitments/checkin/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const { completed, remark } = req.body;
    
    const result = await actionLogService.updateCommitmentCheckin(
      date,
      completed !== false,
      remark || ''
    );
    
    res.json(result);
  } catch (error) {
    console.error('更新打卡记录错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/commitments/:person/status', async (req, res) => {
  try {
    const { person } = req.params;
    const result = await actionLogService.checkCommitmentStatus(person);
    res.json(result);
  } catch (error) {
    console.error('检查承诺书状态错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 7. 提醒API
router.get('/reminders/daily', async (req, res) => {
  try {
    const result = actionLogService.getDailyReminders();
    res.json(result);
  } catch (error) {
    console.error('获取每日提醒错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/reminders/evening', async (req, res) => {
  try {
    const result = actionLogService.getEveningReview();
    res.json(result);
  } catch (error) {
    console.error('获取晚间复盘错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 8. 报告API
router.post('/reports/monthly/:month', async (req, res) => {
  try {
    const { month } = req.params;
    const result = await actionLogService.generateMonthlyReport(month);
    res.json(result);
  } catch (error) {
    console.error('生成月度报告错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 9. 系统初始化API
router.post('/system/initialize', async (req, res) => {
  try {
    const result = await actionLogService.initializeAllTemplates();
    res.json(result);
  } catch (error) {
    console.error('初始化系统错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 10. 数据导出API
router.get('/export/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { format = 'json' } = req.query;
    
    let filePath;
    switch (type) {
      case 'annual':
        filePath = actionLogService.filePaths.annual;
        break;
      case 'monthly':
        filePath = actionLogService.filePaths.monthly;
        break;
      case 'weekly':
        filePath = actionLogService.filePaths.weekly;
        break;
      case 'tracking':
        filePath = actionLogService.filePaths.tracking;
        break;
      case 'commitment':
        filePath = actionLogService.filePaths.commitment;
        break;
      default:
        return res.status(400).json({
          success: false,
          error: '不支持的数据类型'
        });
    }
    
    if (format === 'json') {
      const data = actionLogService.excelService.readWorkbook(filePath);
      res.json({
        success: true,
        type,
        data
      });
    } else if (format === 'excel') {
      // 返回Excel文件
      res.download(filePath);
    } else {
      res.status(400).json({
        success: false,
        error: '不支持的格式'
      });
    }
  } catch (error) {
    console.error('导出数据错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 错误处理中间件
router.use((err, req, res, next) => {
  console.error('API错误:', err);
  res.status(500).json({
    success: false,
    error: '服务器内部错误',
    message: err.message
  });
});

module.exports = router;