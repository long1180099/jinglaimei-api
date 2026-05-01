const express = require('express');
const path = require('path');
const app = express();

// 静态文件服务
app.use(express.static(path.join(__dirname, 'admin-backend/build')));

// API代理（如果需要）
app.use('/api', (req, res) => {
  res.json({ message: 'API服务正在开发中', status: 'ok' });
});

// 所有其他请求返回index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin-backend/build/index.html'));
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`静莱美代理商后台管理系统生产服务器已启动`);
  console.log(`服务器地址: http://localhost:${PORT}`);
  console.log(`启动时间: ${new Date().toLocaleString()}`);
});