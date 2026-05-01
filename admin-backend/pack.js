const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { execSync } = require('child_process');

// 使用 macOS 自带的 /usr/bin/tar
const buildDir = '/Users/apple/WorkBuddy/20260324191412/admin-backend/build';
const outputFile = '/tmp/admin_build2.tar.gz';

try {
  // macOS 的 tar 在 /usr/bin/tar
  execSync('/usr/bin/tar -czf ' + outputFile + ' -C ' + path.dirname(buildDir) + ' build', {
    stdio: 'inherit'
  });
  
  const stats = fs.statSync(outputFile);
  console.log('\n✅ 打包成功:', outputFile);
  console.log('   大小:', (stats.size / 1024).toFixed(1), 'KB');
} catch(e) {
  // 如果 /usr/bin/tar 不行，尝试其他路径
  const tarPaths = ['/usr/bin/tar', '/bin/tar', '/opt/homebrew/bin/tar', '/usr/local/bin/tar'];
  let found = false;
  for (const tp of tarPaths) {
    if (fs.existsSync(tp)) {
      console.log('找到tar:', tp);
      try {
        execSync(tp + ' -czf ' + outputFile + ' -C ' + path.dirname(buildDir) + ' build', { stdio: 'inherit' });
        found = true;
        break;
      } catch(e2) {}
    }
  }
  if (!found) console.log('❌ 找不到tar命令');
}
