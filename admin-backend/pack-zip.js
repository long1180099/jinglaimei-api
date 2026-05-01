const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { createWriteStream } = fs;

// ===== 配置 =====
const ADMIN_DIR = '/Users/apple/WorkBuddy/20260324191412/admin-backend';
const BUILD_DIR = path.join(ADMIN_DIR, 'build');
const OUTPUT_FILE = '/Users/apple/WorkBuddy/20260324191412/admin-deploy-cloudrun.zip';

console.log('\n📦 精简打包中...');

// 创建临时目录
const tmpDir = '/tmp/admin-cloudrun_' + Date.now();
fs.mkdirSync(tmpDir);
fs.mkdirSync(path.join(tmpDir, 'build'));

// 只复制必要文件
fs.copyFileSync(path.join(ADMIN_DIR, 'Dockerfile.admin'), path.join(tmpDir, 'Dockerfile'));
fs.copyFileSync(path.join(ADMIN_DIR, 'nginx.conf'), path.join(tmpDir, 'nginx.conf'));

// 复制 build，排除 source map 文件以减小体积
function copyDir(src, dest) {
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            fs.mkdirSync(destPath, { recursive: true });
            copyDir(srcPath, destPath);
        } else {
            // 排除 .map 文件（source map，生产环境不需要）
            if (!entry.name.endsWith('.map')) {
                fs.copyFileSync(srcPath, destPath);
            }
        }
    }
}
copyDir(BUILD_DIR, path.join(tmpDir, 'build'));

console.log('✅ 文件复制完成');

// 用系统 zip 命令打包（云托管通常接受 zip 格式）
try {
    // macOS 自带 ditto 可以创建 zip
    execSync('/usr/bin/ditto -c -k --sequesterRsrc "' + tmpDir + '" "' + OUTPUT_FILE + '"', { stdio: 'inherit' });
} catch(e) {
    console.log('ditto不可用, 尝试其他方式...');
    // fallback: 用 node archiver 或直接用 tar 再转
    try {
        execSync('/usr/bin/tar -czf "' + OUTPUT_FILE.replace('.zip', '.tar.gz') + '" -C "' + tmpDir + '" Dockerfile nginx.conf build', { stdio: 'inherit' });
    } catch(e2) {
        console.log('❌ 打包失败:', e2.message);
    }
}

// 检查结果
let finalFile;
if (fs.existsSync(OUTPUT_FILE)) finalFile = OUTPUT_FILE;
else finalFile = OUTPUT_FILE.replace('.zip', '.tar.gz');

if (finalFile && fs.existsSync(finalFile)) {
    const stats = fs.statSync(finalFile);
    console.log('\n╔══════════════════════╗');
    console.log('║  ✅ 打包完成          ║');
    console.log('╠══════════════════════╣');
    console.log('║ 📄', finalFile);
    console.log('║ 📏', (stats.size / 1024 / 1024).toFixed(2), 'MB (' + Math.round(stats.size / 1024) + ' KB)');
    console.log('╚══════════════════════╝\n');
}

// 清理
try { fs.rmSync(tmpDir, { recursive: true }); } catch(e) {}
