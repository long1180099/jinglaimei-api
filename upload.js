// 微信小程序自动上传脚本
// 使用方法: node upload.js
// 前置条件: 1) npm install miniprogram-ci  2) 把上传密钥放到同目录下

const ci = require('miniprogram-ci');
const path = require('path');

// ===== 配置（按需修改）=====
const APPID = 'wx9ac76bfc2dad7364';
const VERSION = '1.5.1';                    // 版本号，每次上传需递增
const DESC = '微信云托管部署临时切换+CVM恢复前使用';
const PROJECT_PATH = path.resolve(__dirname, 'miniprogram');
const KEY_PATH = path.resolve(__dirname, 'miniprogram/private.wx9ac76bfc2dad7364.key');  // 上传密钥路径

// ===== 上传配置 =====
const project = new ci.Project({
  appid: APPID,
  type: 'miniProgram',
  projectPath: PROJECT_PATH,
  privateKeyPath: KEY_PATH,
  ignores: ['node_modules/*', '.DS_Store']
});

async function upload() {
  console.log('========================================');
  console.log('  静莱美小程序 - 自动上传工具');
  console.log('========================================');
  console.log(`  AppID:    ${APPID}`);
  console.log(`  版本号:   ${VERSION}`);
  console.log(`  描述:     ${DESC}`);
  console.log(`  项目路径: ${PROJECT_PATH}`);
  console.log(`  密钥路径: ${KEY_PATH}`);
  console.log('----------------------------------------\n');

  try {
    const result = await ci.upload({
      project,
      version: VERSION,
      desc: DESC,
      setting: {
        es6: true,
        es7: true,
        minify: true,
        codeProtect: false,
        autoPrefixWXSS: true
      },
      onProgressUpdate: console.log
    });

    console.log('\n✅ 上传成功！');
    console.log(`   版本: ${VERSION}`);
    console.log(`   请前往 mp.weixin.qq.com → 管理 → 版本管理 → 提交审核`);
  } catch (err) {
    if (err.message && err.message.includes('privateKeyPath')) {
      console.error('\n❌ 错误: 找不到上传密钥文件！');
      console.error('   请按以下步骤获取密钥：\n');
      console.error('   1. 登录 mp.weixin.qq.com');
      console.error('   2. 进入 开发管理 → 开发设置');
      console.error('   3. 找到「小程序代码上传」区域');
      console.error('   4. 点击「生成」并下载密钥文件');
      console.error('   5. 将文件重命名为 private.wx9ac76bfc2dad7364.key');
      console.error('   6. 放到 miniprogram/ 目录下\n');
    } else {
      console.error('\n❌ 上传失败:', err.message || err);
    }
    process.exit(1);
  }
}

upload();
