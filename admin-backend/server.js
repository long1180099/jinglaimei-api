/**
 * 静莱美管理后台 - SPA静态服务器 + API代理（无第三方代理库依赖）
 */
const express = require('express');
const { createServer } = require('http');
const http = require('http');
const https = require('https');
const path = require('path');

const app = express();
const PORT = 8081;
const BUILD_PATH = path.join(__dirname, 'build');
const API_TARGET = 'http://localhost:4000';
const ACTIONLOG_TARGET = 'http://localhost:4001';

// API 代理 - 手动转发，不依赖 http-proxy-middleware
app.use('/api/action-log', (req, res) => {
  proxyRequest(req, res, ACTIONLOG_TARGET);
});

app.use('/api', (req, res) => {
  proxyRequest(req, res, API_TARGET);
});

// 静态文件
app.use(express.static(BUILD_PATH));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(BUILD_PATH, 'index.html'));
});

function proxyRequest(req, res, target) {
  const url = new URL(req.originalUrl, target);
  const options = {
    hostname: url.hostname,
    port: url.port,
    path: url.pathname + url.search,
    method: req.method,
    headers: { ...req.headers, host: url.host },
  };

  const lib = url.protocol === 'https:' ? https : http;
  const proxyReq = lib.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('[代理错误]', req.originalUrl, err.message);
    res.status(502).json({ code: 502, message: '后端服务连接失败: ' + target });
  });

  req.pipe(proxyReq);
}

app.listen(PORT, () => {
  console.log('✅ 管理后台已启动: http://localhost:' + PORT);
  console.log('📡 API代理 → ' + API_TARGET);
  console.log('👤 账号: admin  密码: admin123456');
});
