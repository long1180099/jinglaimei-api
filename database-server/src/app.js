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

const { authMiddleware, requirePermission, requireRole } = require('./middleware/auth');

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

// ==================== Admin 前端静态文件服务 ====================
// 当通过 admin.jinglaimei.com 访问时，返回管理后台前端页面
// API 请求 (/api/*) 继续走后端路由
const fs = require('fs');
// 尝试多个可能的路径（兼容本地开发和云托管部署）
const _possiblePaths = [
  path.join(__dirname, '../../admin-backend/build'),   // 本地开发
  path.join(process.cwd(), 'admin-backend/build'),     // 云托管上传代码包
  '/app/admin-backend/build',                          // Docker 容器
  path.join(__dirname, '../../../admin-backend/build'), // 其他情况
];
const adminBuildPath = _possiblePaths.find(p => fs.existsSync(path.join(p, 'index.html')));
console.log('📁 Admin 前端路径:', adminBuildPath || '未找到');
if (adminBuildPath) {
  console.log('📁 Admin build 文件列表:');
  const _listDir = (dir, prefix = '') => {
    fs.readdirSync(dir).forEach(f => {
      const fp = path.join(dir, f);
      const stat = fs.statSync(fp);
      console.log(`  ${prefix}${f} (${stat.size} bytes)`);
      if (stat.isDirectory()) _listDir(fp, prefix + f + '/');
    });
  };
  _listDir(adminBuildPath);
}

// Admin 前端 - 使用 express.static + historyApiFallback
app.use((req, res, next) => {
  const host = req.headers.host || '';
  if (adminBuildPath && host.includes('admin.jinglaimei.com') && !req.path.startsWith('/api/')) {
    express.static(adminBuildPath)(req, res, (err) => {
      if (err) return next(err);
      // SPA 回退：静态文件不存在时返回 index.html
      res.sendFile(path.join(adminBuildPath, 'index.html'));
    });
  } else {
    next();
  }
});

// 静态文件服务 - 上传的文件
app.use('/uploads', express.static(path.join(__dirname, '../data/uploads')));

// COS 代理中间件 - 当本地文件不存在时从 COS 获取并返回（微信云托管临时密钥模式）
const { useCOS, getObject } = require('./utils/cosUpload');
if (useCOS) {
  app.use('/uploads', (req, res, next) => {
    // express.static 已处理（文件存在则直接返回），到达此处说明本地文件不存在
    const key = req.path.slice(1); // 去掉开头的 /，得到 products/xxx.jpg
    if (!key) return next();

    getObject(key).then(data => {
      if (!data || !data.Body) {
        return res.status(404).json({ error: '文件不存在' });
      }
      if (data.ContentType) res.set('Content-Type', data.ContentType);
      if (data.ContentLength) res.set('Content-Length', data.ContentLength);
      if (data.CacheControl) res.set('Cache-Control', data.CacheControl);
      res.set('X-COS-Proxy', 'true');
      if (typeof data.Body.pipe === 'function') {
        data.Body.pipe(res);
      } else {
        // 微信云托管COS SDK可能返回Buffer而非Stream
        res.send(data.Body);
      }
    }).catch(err => {
      console.warn('[COS代理] 获取失败:', key, err.message);
      return res.status(404).json({ error: '文件不存在' });
    });
  });
  console.log('[COS代理] 已启用(微信云托管模式): 本地文件不存在时从 COS 获取');
} else {
  console.log('[COS代理] 未启用: COS_BUCKET/COS_REGION 未配置');
}

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
app.use('/api/admins',      authMiddleware, requireRole('super_admin'), require('./routes/admins')); // 管理员账户管理(仅超管)
app.use('/api/users',       authMiddleware, requirePermission(['user:read']), require('./routes/users'));
app.use('/api/products',    authMiddleware, requirePermission(['product:read']), require('./routes/products'));
app.use('/api/orders',      authMiddleware, requirePermission(['order:read']), require('./routes/orders'));
app.use('/api/print-logs',  authMiddleware, requirePermission(['order:read']), require('./routes/printLogs')); // 打印记录+设置
app.use('/api/commissions', authMiddleware, requirePermission(['commission:read']), require('./routes/commissions'));
app.use('/api/teams',       authMiddleware, requirePermission(['team:read']), require('./routes/teams'));
// 注意: /api/school 路由已移到文件末尾(videoRoutes > school > schoolBooks 优先级顺序)
app.use('/api/dashboard',   authMiddleware, require('./routes/dashboard'));
app.use('/api/mp/usage',    require('./routes/mpUsage'));                           // 小程序端使用日志（必须在 /api/mp 之前，避免被 mp.js 拦截）
app.use('/api/mp',          require('./routes/mp')); // 小程序端API（内部自行验证token）
app.use('/api/mp',          require('./routes/mpExt')); // 小程序端扩展（电子书/行动日志/性格色彩）
app.use('/api/mp/poster',    require('./routes/posterGenerator')); // AI营销海报生成器
app.use('/api/announcements', authMiddleware, require('./routes/announcements')); // 公告资讯管理
app.use('/api/ai-training', authMiddleware, require('./routes/aiTraining')); // AI话术系统管理后台
app.use('/api/mp',          require('./routes/mpAITraining')); // AI话术系统小程序端
app.use('/api/inventory',   authMiddleware, require('./routes/inventory')); // 库存管理
app.use('/api/rankings',    authMiddleware, require('./routes/rankings')); // 排行榜管理
app.use('/api/migrate',    authMiddleware, requireRole('super_admin'), require('./routes/migrate')); // 数据迁移(仅超管)
app.use('/api/banners',     authMiddleware, require('./routes/banners'));    // 轮播图管理
app.use('/api/mp/socratic', require('./routes/mpSocratic')); // 苏格拉底式提问训练
// 打印记录系统初始化
try {
  require('../migrations/006_init_print_logs').init();
  console.log('✅ 打印记录系统已就绪');
} catch (err) {
  console.warn('⚠️ 打印记录系统初始化:', err.message);
}

// 视频学习系统数据库初始化
try {
  require('../migrations/005_init_video_learning');
  console.log('✅ 视频学习系统已就绪');
} catch (err) {
  console.warn('⚠️ 视频学习系统初始化:', err.message);
}

app.use('/api/mp/skin-analysis', require('./routes/skinAnalysis').router); // AI皮肤分析
// 产品使用日志系统初始化
try {
  require('./routes/usageInit').initUsageDB();
} catch (err) {
  console.warn('⚠️ 产品使用日志系统初始化:', err.message);
}
// 视频学习管理(必须在school.js之前, 避免路由被截胡)
app.use('/api/school', authMiddleware, require('./routes/videoRoutes'));          // Admin视频管理(完整CRUD)
app.use('/api/school',      authMiddleware, require('./routes/school'));           // 商学院旧路由
app.use('/api/school',      authMiddleware, require('./routes/schoolBooks'));       // 电子书管理
app.use('/api/mp',          require('./routes/mpVideoRoutes'));                    // 小程序视频端
app.use('/api/usage-logs',  authMiddleware, require('./routes/usage'));              // 管理后台使用日志

// AI话术系统数据库初始化
const { initAITrainingDB } = require('./routes/aiTrainingInit');
try {
  initAITrainingDB();
} catch (err) {
  console.warn('AI话术系统初始化警告:', err.message);
}

// 苏格拉底系统数据库初始化
try {
  const { initSocraticDB } = require('./routes/socraticInit');
  initSocraticDB();
} catch (err) {
  console.warn('苏格拉底系统初始化警告:', err.message);
}

// 皮肤分析系统数据库初始化
try {
  require('../migrations/004_init_skin_analysis');
  console.log('✅ 皮肤分析系统已就绪');
} catch (err) {
  console.warn('⚠️ 皮肤分析系统初始化:', err.message);
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
