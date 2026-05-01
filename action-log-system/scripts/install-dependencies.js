#!/usr/bin/env node

/**
 * 行动日志系统 - 依赖安装脚本
 * 自动安装所需依赖并检查环境
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🚀 行动日志系统 - 安装向导');
console.log('='.repeat(50));

// 检查环境
function checkEnvironment() {
  console.log('🔍 检查系统环境...');
  
  const checks = {
    nodeVersion: false,
    npmVersion: false,
    python3: false,
    git: false,
    diskSpace: true // 假设有足够空间
  };
  
  try {
    // 检查Node.js版本
    const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
    const nodeMajor = parseInt(nodeVersion.replace('v', '').split('.')[0]);
    checks.nodeVersion = nodeMajor >= 16;
    console.log(`  Node.js: ${nodeVersion} ${checks.nodeVersion ? '✅' : '❌ (需要 v16+)'}`);
  } catch (error) {
    console.log('  Node.js: ❌ 未安装');
  }
  
  try {
    // 检查npm版本
    const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
    checks.npmVersion = true;
    console.log(`  npm: ${npmVersion} ✅`);
  } catch (error) {
    console.log('  npm: ❌ 未安装');
  }
  
  try {
    // 检查Python3
    const pythonVersion = execSync('python3 --version', { encoding: 'utf8' }).trim();
    checks.python3 = true;
    console.log(`  Python3: ${pythonVersion} ✅`);
  } catch (error) {
    console.log('  Python3: ❌ 未安装 (可选)');
  }
  
  try {
    // 检查Git
    const gitVersion = execSync('git --version', { encoding: 'utf8' }).trim();
    checks.git = true;
    console.log(`  Git: ${gitVersion.split(' ')[2]} ✅`);
  } catch (error) {
    console.log('  Git: ❌ 未安装 (可选)');
  }
  
  return checks;
}

// 安装依赖
function installDependencies() {
  console.log('\n📦 安装依赖包...');
  
  const packageJsonPath = path.join(__dirname, '../package.json');
  if (!fs.existsSync(packageJsonPath)) {
    console.log('❌ 找不到 package.json 文件');
    process.exit(1);
  }
  
  try {
    console.log('  正在安装 npm 包...');
    execSync('npm install', { 
      cwd: path.dirname(packageJsonPath),
      stdio: 'inherit'
    });
    console.log('  ✅ npm 包安装完成');
  } catch (error) {
    console.log('  ❌ npm 安装失败:', error.message);
    return false;
  }
  
  return true;
}

// 检查Excel处理库
function checkExcelLibraries() {
  console.log('\n📊 检查Excel处理库...');
  
  try {
    // 尝试导入xlsx库
    require('xlsx');
    console.log('  ✅ xlsx 库可用');
    return true;
  } catch (error) {
    console.log('  ❌ xlsx 库不可用:', error.message);
    return false;
  }
}

// 创建目录结构
function createDirectoryStructure() {
  console.log('\n📁 创建目录结构...');
  
  const directories = [
    '../data',
    '../data/annual_goals',
    '../data/monthly_goals',
    '../data/weekly_goals',
    '../data/daily_goals',
    '../data/monthly_tracking',
    '../data/commitments',
    '../data/reports',
    '../logs',
    '../config',
    '../docs',
    '../scripts',
    '../automation',
    '../integration',
    '../cli'
  ];
  
  let createdCount = 0;
  
  directories.forEach(dir => {
    const fullPath = path.join(__dirname, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      createdCount++;
    }
  });
  
  console.log(`  ✅ 创建了 ${createdCount} 个目录`);
  return true;
}

// 设置文件权限
function setFilePermissions() {
  console.log('\n🔧 设置文件权限...');
  
  const scripts = [
    '../cli/action-log-cli.js',
    '../scripts/initialize-templates.js',
    '../scripts/create-daily-goal.js',
    '../scripts/generate-monthly-report.js',
    '../automation/setup-automations.js',
    '../integration/workbuddy-integration.js'
  ];
  
  let setCount = 0;
  
  scripts.forEach(script => {
    const fullPath = path.join(__dirname, script);
    if (fs.existsSync(fullPath)) {
      try {
        fs.chmodSync(fullPath, '755');
        setCount++;
      } catch (error) {
        console.log(`  ⚠️  无法设置权限: ${script}`);
      }
    }
  });
  
  console.log(`  ✅ 设置了 ${setCount} 个文件的可执行权限`);
  return true;
}

// 创建配置文件
function createConfigFiles() {
  console.log('\n⚙️  创建配置文件...');
  
  const configDir = path.join(__dirname, '../config');
  
  // 创建通知配置
  const notificationsConfig = {
    enabled: true,
    channels: {
      console: true,
      file: true,
      webhook: false,
      email: false
    },
    schedules: {
      morningReminder: '0 8 * * *',
      eveningReview: '0 21 * * *',
      weeklySummary: '0 20 * * 0',
      monthlyStart: '0 0 1 * *',
      mindsetAlert: '0 22 * * *',
      commitmentCheck: '0 23 * * *'
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
  
  fs.writeFileSync(
    path.join(configDir, 'notifications.json'),
    JSON.stringify(notificationsConfig, null, 2),
    'utf8'
  );
  console.log('  ✅ 创建通知配置');
  
  // 创建API配置
  const apiConfig = {
    port: 4001,
    host: 'localhost',
    cors: {
      origin: ['http://localhost:3000', 'http://localhost:4001'],
      credentials: true
    },
    logging: {
      level: 'info',
      format: 'combined',
      directory: './logs'
    }
  };
  
  fs.writeFileSync(
    path.join(configDir, 'api.json'),
    JSON.stringify(apiConfig, null, 2),
    'utf8'
  );
  console.log('  ✅ 创建API配置');
  
  return true;
}

// 测试系统
function testSystem() {
  console.log('\n🧪 测试系统功能...');
  
  try {
    // 测试Excel服务
    const ExcelService = require('../services/ExcelService');
    const excelService = new ExcelService();
    console.log('  ✅ Excel服务测试通过');
    
    // 测试行动日志服务
    const ActionLogService = require('../services/ActionLogService');
    const actionLogService = new ActionLogService();
    console.log('  ✅ 行动日志服务测试通过');
    
    // 测试API服务
    const app = require('../api/server');
    console.log('  ✅ API服务测试通过');
    
    return true;
  } catch (error) {
    console.log('  ❌ 系统测试失败:', error.message);
    return false;
  }
}

// 生成安装报告
function generateInstallReport(success, checks, steps) {
  console.log('\n📋 安装报告');
  console.log('='.repeat(50));
  
  if (success) {
    console.log('🎉 安装成功！');
    console.log('\n🚀 下一步操作:');
    console.log('1. 初始化系统模板:');
    console.log('   cd /Users/apple/WorkBuddy/20260324191412/action-log-system');
    console.log('   npm run init-templates');
    console.log('\n2. 启动API服务:');
    console.log('   npm start');
    console.log('\n3. 使用命令行工具:');
    console.log('   node cli/action-log-cli.js');
    console.log('\n4. 配置WorkBuddy自动化:');
    console.log('   node automation/setup-automations.js');
    console.log('\n🌐 访问地址:');
    console.log('   API服务: http://localhost:4001');
    console.log('   文档: http://localhost:4001/api-docs');
  } else {
    console.log('❌ 安装失败，请检查以下问题:');
    
    if (!checks.nodeVersion) {
      console.log('  - 需要安装 Node.js v16+');
    }
    
    if (!checks.npmVersion) {
      console.log('  - 需要安装 npm');
    }
    
    steps.forEach((step, index) => {
      if (!step.success) {
        console.log(`  - ${step.name}: ${step.error || '失败'}`);
      }
    });
  }
  
  console.log('\n📁 系统目录:');
  console.log(`   主目录: ${path.join(__dirname, '..')}`);
  console.log(`   数据目录: ${path.join(__dirname, '../data')}`);
  console.log(`   配置文件: ${path.join(__dirname, '../config')}`);
  console.log(`   日志文件: ${path.join(__dirname, '../logs')}`);
}

// 主安装流程
async function mainInstall() {
  const checks = checkEnvironment();
  
  if (!checks.nodeVersion || !checks.npmVersion) {
    console.log('\n❌ 系统环境不满足要求，安装中止');
    process.exit(1);
  }
  
  const steps = [];
  
  // 步骤1: 安装依赖
  steps.push({
    name: '安装npm依赖',
    success: installDependencies()
  });
  
  // 步骤2: 检查Excel库
  steps.push({
    name: '检查Excel库',
    success: checkExcelLibraries()
  });
  
  // 步骤3: 创建目录
  steps.push({
    name: '创建目录结构',
    success: createDirectoryStructure()
  });
  
  // 步骤4: 设置权限
  steps.push({
    name: '设置文件权限',
    success: setFilePermissions()
  });
  
  // 步骤5: 创建配置
  steps.push({
    name: '创建配置文件',
    success: createConfigFiles()
  });
  
  // 步骤6: 测试系统
  steps.push({
    name: '测试系统功能',
    success: testSystem()
  });
  
  const allSuccess = steps.every(step => step.success);
  
  generateInstallReport(allSuccess, checks, steps);
  
  rl.close();
  
  if (!allSuccess) {
    process.exit(1);
  }
}

// 执行安装
if (require.main === module) {
  mainInstall().catch(error => {
    console.error('安装过程中出现错误:', error);
    process.exit(1);
  });
}

module.exports = {
  checkEnvironment,
  installDependencies,
  checkExcelLibraries,
  createDirectoryStructure,
  setFilePermissions,
  createConfigFiles,
  testSystem
};