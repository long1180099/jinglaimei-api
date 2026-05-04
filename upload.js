const ci = require('miniprogram-ci');

(async () => {
  const project = new ci.Project({
    appid: 'wx9ac76bfc2dad7364',
    type: 'miniProgram',
    projectPath: `${__dirname}/miniprogram`,
    privateKeyPath: `${__dirname}/miniprogram/private.wx9ac76bfc2dad7364.key`,
    ignores: ['node_modules/**/*', '.DS_Store', 'private.wx9ac76bfc2dad7364.key'],
  });

  try {
    const result = await ci.upload({
      project,
      version: '1.0.' + new Date().toISOString().slice(0, 10).replace(/-/g, ''),
      desc: 'fix: 商品页上滑卡顿优化 + 购物车跳转修复 + 价格修复',
      setting: {
        es6: true,
        es7: true,
        minify: true,
        autoPrefixWXSS: true,
        minifyWXML: true,
      },
    });
    console.log('上传成功!');
    console.log('subPackage:', result.subPackage);
    console.log('packageSize:', JSON.stringify(result.packageSize, null, 2));
  } catch (err) {
    console.error('上传失败:', err.message || err);
    process.exit(1);
  }
})();
