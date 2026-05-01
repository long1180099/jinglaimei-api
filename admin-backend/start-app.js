const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 静莱美后台管理系统启动中...\n');

// Node.js二进制路径
const nodeBin = '/Users/apple/.workbuddy/binaries/node/versions/22.12.0/bin/node';
const projectDir = __dirname;

// 启动React开发服务器
console.log('📦 正在启动React开发服务器...\n');
console.log('========================================');
console.log('🌐 访问地址: http://localhost:3000');
console.log('🔐 登录页面: http://localhost:3000/login');
console.log('📝 测试账户: 任意用户名(3+字符) + 任意密码(6+字符)');
console.log('========================================\n');
console.log('📢 按 Ctrl+C 停止服务器\n');

// 设置环境变量
const env = {
  ...process.env,
  NODE_OPTIONS: '--openssl-legacy-provider',
  SKIP_PREFLIGHT_CHECK: 'true',
  DISABLE_ESLINT_PLUGIN: 'true',
  PATH: `/Users/apple/.workbuddy/binaries/node/versions/22.12.0/bin:${process.env.PATH}`
};

// 启动React开发服务器
const reactScripts = spawn(nodeBin, ['node_modules/.bin/react-scripts', 'start'], {
  cwd: projectDir,
  env: env,
  stdio: 'inherit',
  shell: true
});

reactScripts.on('error', (err) => {
  console.error('❌ 启动失败:', err.message);
  if (err.message.includes('react-scripts')) {
    console.log('📦 请先安装依赖: npm install');
  }
});

reactScripts.on('close', (code) => {
  if (code !== 0) {
    console.error(`⚠️  服务器退出，代码: ${code}`);
  }
});