const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const zlib = require('zlib');

// ===== 配置 =====
const ADMIN_DIR = '/Users/apple/WorkBuddy/20260324191412/admin-backend';
const BUILD_DIR = path.join(ADMIN_DIR, 'build');
const OUTPUT_FILE = '/Users/apple/WorkBuddy/20260324191412/admin-deploy-cloudrun.zip';

console.log('');
console.log('╔════════════════════════════════════╗');
console.log('║  📦 打包管理后台 (云托管版)         ║');
console.log('╚════════════════════════════════════╝\n');

// 1. 检查构建产物
if (!fs.existsSync(BUILD_DIR)) {
    console.error('❌ 构建目录不存在:', BUILD_DIR);
    console.error('   请先执行: cd admin-backend && npm run build');
    process.exit(1);
}
console.log('✅ 构建产物确认');

// 2. 创建临时部署目录结构
const tmpDir = path.join('/tmp', 'jinglaimei-admin-deploy_' + Date.now());
fs.mkdirSync(tmpDir, { recursive: true });
fs.mkdirSync(path.join(tmpDir, 'build'), { recursive: true });

// 复制 Dockerfile（云托管要求根目录有 Dockerfile）
fs.copyFileSync(
    path.join(ADMIN_DIR, 'Dockerfile.admin'),
    path.join(tmpDir, 'Dockerfile')
);
console.log('✅ Dockerfile 复制完成');

// 复制 Nginx 配置
fs.copyFileSync(
    path.join(ADMIN_DIR, 'nginx.conf'),
    path.join(tmpDir, 'nginx.conf')
);
console.log('✅ nginx.conf 复制完成');

// 复制构建产物
function copyDir(src, dest) {
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            fs.mkdirSync(destPath, { recursive: true });
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}
copyDir(BUILD_DIR, path.join(tmpDir, 'build'));
console.log('✅ 构建产物复制完成');

// 3. 打包为 zip（云托管支持 zip 上传）
console.log('\n📦 正在打包...');
try {
    // 用 Node.js 原生方式打包 tar.gz（更可靠）
    const tar = require('tar');
    
    // 先创建 .tar.gz 文件
    const tgzFile = OUTPUT_FILE.replace('.zip', '.tar.gz');
    
    tar.create({
        gzip: true,
        cwd: tmpDir,
        filter: (p) => !/node_modules/.test(p)
    }, ['Dockerfile', 'nginx.conf', 'build'])
    .pipe(fs.createWriteStream(tgzFile))
    .on('finish', () => {
        const stats = fs.statSync(tgzFile);
        const sizeKB = (stats.size / 1024).toFixed(0);
        
        console.log(`\n✅ 打包成功!`);
        console.log(`📄 文件: ${tgzFile}`);
        console.log(`📏 大小: ${sizeKB} KB (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
        
        console.log('\n╔═════════════════════════════════════════╗');
        console.log('║  🚀 下一步操作：                          ║');
        console.log('╠═════════════════════════════════════════╣');
        console.log('║  1. 打开微信云托管控制台                   ║');
        console.log('║  2. 进入 prod 环境 → 服务管理             ║');
        console.log('║  3. 点击 "新建服务"                       ║');
        console.log('║     服务名称: admin-web                   ║');
        console.log('║     部署方式: 本地上传代码包               ║');
        console.log(`║     选择文件: ${tgzFile}          ║`);
        console.log('║  4. 等待构建完成即可访问                   ║');
        console.log('╚═════════════════════════════════════════╝\n');
        
        // 清理临时目录
        try {
            fs.rmSync(tmpDir, { recursive: true });
            console.log('🧹 临时文件已清理');
        } catch(e) {}
    })
    .on('error', (err) => {
        console.error('❌ 打包失败:', err.message);
    });
    
} catch(e) {
    // 如果没有 tar 模块，用备用方案
    console.log('⚠️ tar模块不可用，尝试备用方案...');
    fallbackPack();
}

function fallbackPack() {
    // 直接用系统命令
    try {
        const outputTgz = OUTPUT_FILE.replace('.zip', '.tar.gz');
        execSync(`/usr/bin/tar -czf "${outputTgz}" -C "${tmpDir}" Dockerfile nginx.conf build`, { stdio: 'inherit' });
        const stats = fs.statSync(outputTgz);
        console.log(`\n✅ 打包成功: ${outputTgz} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
    } catch(e) {
        console.error('❌ 所有打包方式均失败，请手动打包目录:', tmpDir);
        console.error('   内容: Dockerfile + nginx.conf + build/');
    }
}
