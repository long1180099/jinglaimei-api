const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8081;
const API_TARGET = 'http://localhost:4000';
// 使用构建产物目录（含完整的前端代码）
const publicDir = path.join(__dirname, 'build');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json'
};

const server = http.createServer((req, res) => {
  // 简单的CORS头（允许局域网跨域访问）
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // ===== API 代理：将 /api/* 转发到后端 =====
  if (req.url.startsWith('/api/')) {
    const apiPath = req.url; // 保持完整路径含/api前缀
    console.log(`[代理] ${req.method} ${apiPath} → ${API_TARGET}${apiPath}`);
    
    const options = {
      hostname: 'localhost',
      port: 4000,
      path: apiPath,
      method: req.method,
      headers: { ...req.headers, host: 'localhost:4000' }
    };
    
    const proxyReq = http.request(options, (proxyRes) => {
      // 转发响应头（特别是 CORS 相关的）
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });
    
    proxyReq.on('error', (err) => {
      console.error('[代理错误]', err.message);
      res.writeHead(502);
      res.end('Bad Gateway: 后端服务不可用');
    });
    
    // 收集请求体并转发
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      if (body) proxyReq.write(body);
      proxyReq.end();
    });
    return;
  }

  // ===== 静态文件服务 =====

  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);

  // SPA路由：所有非文件请求都返回index.html
  let filePath = req.url.split('?')[0];
  if (filePath === '/') filePath = '/index.html';
  
  // 去掉开头的 /
  const cleanPath = filePath.replace(/^\//, '');
  const fullPath = path.join(publicDir, cleanPath);

  const extname = path.extname(fullPath).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(fullPath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        // 文件不存在 → 返回 index.html (SPA fallback)
        fs.readFile(path.join(publicDir, 'index.html'), (err, data) => {
          if (err) {
            res.writeHead(404);
            res.end('Not Found');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(data, 'utf-8');
          }
        });
      } else {
        console.error('[错误]', error.message);
        res.writeHead(500);
        res.end('Server Error');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

// 明确绑定 0.0.0.0 以允许局域网访问
server.listen(PORT, '0.0.0.0', () => {
  console.log('\n╔════════════════════════════════════╗');
  console.log('║  🚀 静莱美后台 (静态构建版)          ║');
  console.log('╠════════════════════════════════════╣');
  console.log(`║  本机访问: http://localhost:${PORT}       ║`);
  console.log(`║  局域网:   http://192.168.0.112:${PORT}   ║`);
  console.log('╠════════════════════════════════════╣');
  console.log('║  登录: admin / admin123456           ║');
  console.log('╠════════════════════════════════════╣');
  console.log('║  Ctrl+C 停止                        ║');
  console.log('╚════════════════════════════════════╝\n');
});
