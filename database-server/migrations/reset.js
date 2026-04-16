/**
 * 重置数据库（删除并重建）
 */
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../data/jinglaimei.db');

if (fs.existsSync(DB_PATH)) {
  fs.unlinkSync(DB_PATH);
  console.log('🗑️  已删除旧数据库文件');
}

console.log('✅ 数据库重置完成，请运行 npm run migrate 重新创建表结构');
