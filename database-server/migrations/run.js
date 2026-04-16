/**
 * 迁移执行入口
 */
const path = require('path');
const { execSync } = require('child_process');

const migrations = [
  '001_create_tables.js'
];

console.log('🔄 开始执行数据库迁移...\n');

migrations.forEach(file => {
  console.log(`执行迁移: ${file}`);
  require(path.join(__dirname, file));
});

console.log('\n✅ 所有迁移执行完成！');
