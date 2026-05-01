const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 4001;

// 中间件配置
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件服务
app.use('/data', express.static(path.join(__dirname, '../data')));
app.use('/reports', express.static(path.join(__dirname, '../data/reports')));

// API路由
const actionLogAPI = require('./ActionLogAPI');
app.use('/api/action-log', actionLogAPI);

// 根路径
app.get('/', (req, res) => {
  res.json({
    name: '行动日志管理系统 API',
    version: '1.0.0',
    description: '基于Excel的个人目标管理与追踪系统',
    endpoints: {
      annual_goals: '/api/action-log/annual-goals',
      monthly_goals: '/api/action-log/monthly-goals',
      weekly_goals: '/api/action-log/weekly-goals',
      daily_goals: '/api/action-log/daily-goals',
      monthly_tracking: '/api/action-log/monthly-tracking',
      commitments: '/api/action-log/commitments',
      reminders: '/api/action-log/reminders',
      reports: '/api/action-log/reports',
      system: '/api/action-log/system'
    },
    documentation: '查看 README.md 获取详细API文档'
  });
});

// API文档
app.get('/api-docs', (req, res) => {
  const docs = {
    title: '行动日志管理系统 API 文档',
    sections: [
      {
        name: '年度目标管理',
        endpoints: [
          {
            method: 'POST',
            path: '/api/action-log/annual-goals',
            description: '设置年度目标',
            parameters: {
              category: 'string - 目标类别',
              content: 'string - 目标内容',
              methods: 'string - 方法和措施',
              timeRange: 'string - 起止时间'
            }
          },
          {
            method: 'GET',
            path: '/api/action-log/annual-goals/progress',
            description: '获取年度目标进度',
            parameters: '无'
          }
        ]
      },
      {
        name: '月度目标管理',
        endpoints: [
          {
            method: 'POST',
            path: '/api/action-log/monthly-goals/generate',
            description: '从年度目标生成月度目标',
            parameters: {
              month: 'string - 月份 (如 "6月")'
            }
          }
        ]
      },
      {
        name: '日目标管理',
        endpoints: [
          {
            method: 'POST',
            path: '/api/action-log/daily-goals',
            description: '创建日目标',
            parameters: {
              date: 'string - 日期 (YYYY-MM-DD)',
              tasks: 'array - 任务列表',
              learning: 'object - 学习内容',
              mindsetScores: 'object - 心态评分'
            }
          }
        ]
      },
      {
        name: '提醒服务',
        endpoints: [
          {
            method: 'GET',
            path: '/api/action-log/reminders/daily',
            description: '获取每日提醒',
            parameters: '无'
          },
          {
            method: 'GET',
            path: '/api/action-log/reminders/evening',
            description: '获取晚间复盘',
            parameters: '无'
          }
        ]
      }
    ]
  };
  
  res.json(docs);
});

// 健康检查
app.get('/health', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    system: {
      platform: process.platform,
      version: process.version,
      pid: process.pid
    }
  };
  
  res.json(health);
});

// 数据目录检查
app.get('/system/status', (req, res) => {
  const basePath = path.join(__dirname, '../data');
  const directories = ['annual_goals', 'monthly_goals', 'weekly_goals', 'daily_goals', 'monthly_tracking', 'commitments', 'reports'];
  
  const status = {
    basePath,
    directories: {}
  };
  
  directories.forEach(dir => {
    const dirPath = path.join(basePath, dir);
    const exists = fs.existsSync(dirPath);
    status.directories[dir] = {
      exists,
      path: dirPath,
      files: exists ? fs.readdirSync(dirPath).filter(f => !f.startsWith('.')).length : 0
    };
  });
  
  res.json(status);
});

// 404处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'API端点不存在',
    requested: req.originalUrl,
    available: '/api-docs'
  });
});

// 启动服务器
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`
    🚀 行动日志管理系统 API 已启动
    =================================
    📍 本地地址: http://localhost:${PORT}
    📍 API文档: http://localhost:${PORT}/api-docs
    📍 健康检查: http://localhost:${PORT}/health
    📍 系统状态: http://localhost:${PORT}/system/status
    =================================
    按 Ctrl+C 停止服务
    `);
  });
}

module.exports = app;