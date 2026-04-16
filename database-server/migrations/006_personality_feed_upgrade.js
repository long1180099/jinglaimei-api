/**
 * 006 - 性格色彩话术投喂系统升级
 * 为 ai_scripts 表增加投喂优化相关字段
 */

const { getDB } = require('../src/utils/db');
const db = getDB();

exports.up = function() {
  // 确保ai_scripts表存在
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_scripts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      personality_type TEXT,
      scenario TEXT NOT NULL,
      script_content TEXT NOT NULL,
      tips TEXT,
      difficulty_level INTEGER DEFAULT 2,
      status INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 新增字段：投喂+优化
  const newColumns = [
    { name: 'source', sql: "TEXT DEFAULT 'admin'" },                    // 数据来源: admin_feed / ai_generated / builtin
    { name: 'is_ai_generated', sql: "INTEGER DEFAULT 0" },             // 是否AI生成
    { name: 'is_optimized', sql: "INTEGER DEFAULT 0" },                // 是否经过AI二次优化
    { name: 'raw_content', sql: "TEXT" },                        // 原始投喂内容（优化前）
    { name: 'optimize_style', sql: "TEXT DEFAULT 'natural'" },       // 优化风格
    { name: 'optimize_count', sql: "INTEGER DEFAULT 0" },            // 已优化次数
    { name: 'title', sql: "TEXT" },                              // 话术标题
  ];

  newColumns.forEach(col => {
    try {
      db.exec(`ALTER TABLE ai_scripts ADD COLUMN ${col.name} ${col.sql}`);
      console.log('  ✅ 新增字段: ' + col.name);
    } catch(e) {
      console.log('  ⏭️ 字段已存在(或失败): ' + col.name);
    }
  });

  // 创建索引
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_scripts_scenario ON ai_scripts(scenario)"); console.log('  ✅ 场景索引'); } catch(e) {}
  try { db.exec("CREATE INDEX IF NOT EXISTS scripts_source ON ai_scripts(source)"); console.log('  ✅ 来源索引'); } catch(e) {}
  
  console.log('\n✨ 性格色彩话术投喂系统升级完成！');
};

// 运行
exports.up();
