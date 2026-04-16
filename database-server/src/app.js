/**
 * 静莱美代理商系统 - 数据库 API 服务器
 * 端口: 4000
 */

// 加载环境变量（必须在最顶部）
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');

const { authMiddleware } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 4000;

// ==================== 中间件 ====================
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Client'],
}));
app.use(bodyParser.json({ limit: '20mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// 静态文件服务 - 上传的文件
app.use('/uploads', express.static(path.join(__dirname, '../data/uploads')));

// 静态文件服务 - 商品图片等公开资源（通过 /api/public 访问）
app.use('/api/public', express.static(path.join(__dirname, '../public')));

// 请求日志
app.use((req, res, next) => {
  const timestamp = new Date().toLocaleTimeString('zh-CN');
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// ==================== 路由 ====================
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/users',       authMiddleware, require('./routes/users'));
app.use('/api/products',    authMiddleware, require('./routes/products'));
app.use('/api/orders',      authMiddleware, require('./routes/orders'));
app.use('/api/commissions', authMiddleware, require('./routes/commissions'));
app.use('/api/teams',       authMiddleware, require('./routes/teams'));
app.use('/api/school',      authMiddleware, require('./routes/school'));
app.use('/api/school',      authMiddleware, require('./routes/schoolBooks')); // 电子书管理
app.use('/api/dashboard',   authMiddleware, require('./routes/dashboard'));
app.use('/api/mp',          require('./routes/mp')); // 小程序端API（内部自行验证token）
app.use('/api/mp',          require('./routes/mpExt')); // 小程序端扩展（电子书/行动日志/性格色彩）
app.use('/api/announcements', authMiddleware, require('./routes/announcements')); // 公告资讯管理
app.use('/api/ai-training', authMiddleware, require('./routes/aiTraining')); // AI话术系统管理后台
app.use('/api/mp',          require('./routes/mpAITraining')); // AI话术系统小程序端
app.use('/api/inventory',   authMiddleware, require('./routes/inventory')); // 库存管理
app.use('/api/rankings',    authMiddleware, require('./routes/rankings')); // 排行榜管理
app.use('/api/banners',     authMiddleware, require('./routes/banners'));    // 轮播图管理
app.use('/api/mp/socratic', require('./routes/mpSocratic')); // 苏格拉底式提问训练

// AI话术系统数据库初始化
const { initAITrainingDB } = require('./routes/aiTrainingInit');
try {
  initAITrainingDB();
} catch (err) {
  console.warn('AI话术系统初始化警告:', err.message);
}

// ==================== 根路径 ====================
app.get('/', (req, res) => {
  res.json({
    name: '静莱美代理商系统 - 数据库服务',
    version: '1.0.0',
    status: '运行中 ✅',
    database: 'SQLite (jinglaimei.db)',
    timestamp: new Date().toLocaleString('zh-CN'),
    endpoints: {
      auth:        '/api/auth        (登录/认证)',
      users:       '/api/users       (用户管理)',
      products:    '/api/products    (商品管理)',
      orders:      '/api/orders      (订单管理)',
      commissions: '/api/commissions (收益管理)',
      teams:       '/api/teams       (团队管理)',
      school:      '/api/school      (商学院)',
      dashboard:   '/api/dashboard   (数据看板)',
    }
  });
});

// 健康检查
app.get('/health', (req, res) => {
  const { getDB } = require('./utils/db');
  try {
    const db = getDB();
    const result = db.prepare('SELECT COUNT(*) as cnt FROM users').get();
    res.json({ status: 'healthy', users: result.cnt, timestamp: Date.now() });
  } catch (err) {
    res.status(500).json({ status: 'unhealthy', error: err.message });
  }
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({ code: 404, message: `接口不存在: ${req.method} ${req.path}` });
});

// 全局错误处理
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
});

// ==================== 启动 ====================
app.listen(PORT, () => {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║   静莱美代理商系统 - 数据库服务 已启动 🚀     ║');
  console.log('╠══════════════════════════════════════════════╣');
  console.log(`║  地址: http://localhost:${PORT}                  ║`);
  console.log('║  数据库: SQLite (jinglaimei.db)              ║');
  console.log('╠══════════════════════════════════════════════╣');
  console.log('║  API端点:                                    ║');
  console.log('║  POST /api/auth/login   - 管理员登录         ║');
  console.log('║  GET  /api/dashboard    - 数据看板           ║');
  console.log('║  GET  /api/users        - 用户管理           ║');
  console.log('║  GET  /api/products     - 商品管理           ║');
  console.log('║  GET  /api/orders       - 订单管理           ║');
  console.log('║  GET  /api/commissions  - 收益管理           ║');
  console.log('║  GET  /api/teams        - 团队管理           ║');
  console.log('║  GET  /api/school       - 商学院             ║');
  console.log('╠══════════════════════════════════════════════╣');
  console.log('║  默认账号: admin / admin123456               ║');
  console.log('╚══════════════════════════════════════════════╝\n');
});

module.exports = app;
