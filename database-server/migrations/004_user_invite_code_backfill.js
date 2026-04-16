/**
 * 数据库迁移 #004 - 用户管理完善
 * 
 * 功能：
 * 1. 为所有缺少邀请码的用户自动生成唯一邀请码
 * 2. 确认 level_weight 概念（直接使用agent_level字段作为权重）
 * 
 * 执行方式：node 004_user_invite_code_backfill.js
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/jinglaimei.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

console.log('🚀 开始用户管理迁移...\n');

const migrate = db.transaction(() => {
  
  // ====== 1. 补全缺失的邀请码 ======
  const usersWithoutCode = db.prepare(`
    SELECT id, username FROM users 
    WHERE (invite_code IS NULL OR invite_code = '') AND is_deleted = 0
  `).all();
  
  console.log(`📋 发现 ${usersWithoutCode.length} 个用户缺少邀请码`);
  
  let generated = 0;
  for (const user of usersWithoutCode) {
    // 生成唯一邀请码：JLM + 时间戳36进制 + 随机2位
    let code;
    let attempts = 0;
    do {
      code = 'JLM' + Date.now().toString(36).toUpperCase() + 
             Math.floor(Math.random() * 100).toString().padStart(2, '0');
      attempts++;
      if (attempts > 10) break; // 安全退出
    } while (db.prepare("SELECT 1 FROM users WHERE invite_code = ?").get(code));
    
    try {
      db.prepare("UPDATE users SET invite_code = ? WHERE id = ?").run(code, user.id);
      generated++;
      console.log(`  ✅ 用户${user.id}(${user.username}) → ${code}`);
    } catch(e) {
      console.log(`  ⚠️ 用户${user.id} 邀请码生成失败: ${e.message}`);
    }
  }
  
  // ====== 2. 确认等级体系 ======
  const levelStats = db.prepare(`
    SELECT 
      agent_level,
      COUNT(*) as cnt,
      GROUP_CONCAT(DISTINCT username, ', ') as sample_users
    FROM users WHERE is_deleted = 0
    GROUP BY agent_level ORDER BY agent_level
  `).all();
  
  console.log('\n📊 当前等级分布:');
  const levelNames = { 1:'会员', 2:'打版代言人', 3:'代理商', 4:'批发商', 5:'首席分公司', 6:'集团事业部' };
  for (const row of levelStats) {
    console.log(`  等级${row.agent_level} (${levelNames[row.agent_level] || '未知'}): ${row_cnt}人`);
  }
  
  // ====== 3. 统计上下级关系 ======
  const parentStats = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN parent_id IS NOT NULL THEN 1 ELSE 0 END) as has_parent,
      SUM(CASE WHEN parent_id IS NULL THEN 1 ELSE 0 END) as no_parent
    FROM users WHERE is_deleted = 0
  `).get();
  
  console.log('\n🔗 上下级关系统计:');
  console.log(`  总用户数: ${parent_stats.total}`);
  console.log(`  有上级: ${parent_stats.has_parent}`);
  console.log(`  无上级(顶级): ${parent_stats.no_parent}`);

  // ====== 结果汇总 ======
  console.log('\n' + '='.repeat(50));
  console.log('✨ 迁移完成！');
  console.log(`  新生成邀请码: ${generated}个`);
  console.log(`  剩余无邀请码: ${usersWithoutCode.length - generated}个`);
});

try {
  migrate();
} catch(err) {
  console.error('❌ 迁移失败:', err.message);
}

db.close();
