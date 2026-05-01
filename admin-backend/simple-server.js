const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const publicDir = path.join(__dirname, 'public');

const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  
  let filePath = path.join(publicDir, req.url === '/' ? 'index.html' : req.url);
  
  // 默认返回index.html
  if (req.url === '/') {
    filePath = path.join(publicDir, 'index.html');
  }
  
  const extname = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
  };
  
  const contentType = mimeTypes[extname] || 'application/octet-stream';
  
  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        // 文件不存在，返回index.html（SPA路由）
        fs.readFile(path.join(publicDir, 'index.html'), (err, data) => {
          if (err) {
            res.writeHead(404);
            res.end('404 Not Found');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data, 'utf-8');
          }
        });
      } else {
        res.writeHead(500);
        res.end('Server Error: ' + error.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log('');
  console.log('========================================');
  console.log('🚀 静莱美后台管理系统已启动！');
  console.log('🌐 访问地址: http://localhost:3000');
  console.log('🔐 登录页面: http://localhost:3000/login');
  console.log('📝 测试账户: 任意用户名(3+字符) + 任意密码(6+字符)');
  console.log('========================================');
  console.log('');
  console.log('📢 按 Ctrl+C 停止服务器');
  console.log('');
});