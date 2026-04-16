/**
 * 005 - 话术投喂系统
 * 
 * 功能：管理员投喂原始话术 → AI(DeepSeek)延伸优化 → 小程序优先展示
 * 
 * 新增/修改表：
 * 1. ai_scripts 增加 source/title/difficulty 字段
 * 2. 新建 script_feeds 表（管理员投喂原始话术）
 */

const db = require('../src/utils/db');

exports.up = function() {
  db.exec(`
    -- ==========================================
    -- 1. ai_scripts 表增加字段
    -- ==========================================
    ALTER TABLE ai_scripts ADD COLUMN source TEXT DEFAULT 'ai_generated';
    ALTER TABLE ai_scripts ADD COLUMN title TEXT DEFAULT '';
    ALTER TABLE ai_scripts ADD COLUMN difficulty_level INTEGER DEFAULT 2;
    ALTER TABLE ai_scripts ADD COLUMN personality_type TEXT DEFAULT '';
    ALTER TABLE ai_scripts ADD COLUMN scene TEXT DEFAULT '';
    ALTER TABLE ai_scripts ADD COLUMN optimized_from INTEGER;
    ALTER TABLE ai_scripts ADD COLUMN feed_id INTEGER;
    ALTER TABLE ai_scripts ADD COLUMN is_optimized INTEGER DEFAULT 0;
    ALTER TABLE ai_scripts ADD COLUMN optimizer_prompt TEXT;
    ALTER TABLE ai_scripts ADD COLUMN optimized_at TEXT;
  `);

  db.exec(`
    -- ==========================================
    -- 2. 新建 script_feeds 投喂表
    -- ==========================================
    CREATE TABLE IF NOT EXISTS script_feeds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      
      -- 投喂内容
      raw_content TEXT NOT NULL,
      target_personality TEXT,       -- 目标性格 red/blue/yellow/green 或 空表示通用
      target_scene TEXT,             -- 目标场景
      
      -- 投喂信息
      status TEXT DEFAULT 'pending',   -- pending/optimized/published/rejected
      admin_notes TEXT,
      priority INTEGER DEFAULT 0,     -- 优先级，高的排前面
      
      -- AI优化结果
      optimized_content TEXT,        -- AI优化后的话术
      optimization_prompt TEXT,     -- 发给AI的提示词
      model_used TEXT,               -- 使用的AI模型
      tokens_used INTEGER,
      
      -- 关联
      created_script_id INTEGER,     -- 优化后生成的话术ID
      
      -- 时间戳
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      optimized_at DATETIME,
      published_at DATETIME,
      created_by TEXT DEFAULT 'admin'
    );

    -- 创建索引
    CREATE INDEX IF NOT EXISTS idx_feeds_status ON script_feeds(status);
    CREATE INDEX IF NOT EXISTS idx_feeds_personality ON script_feeds(target_personality);
    CREATE INDEX IF NOT EXISTS idx_feeds_scene ON script_feeds(target_scene);
    CREATE INDEX IF NOT EXISTS idx_scripts_source ON ai_scripts(source);
  `);

  console.log('[005] 话术投喂系统数据库升级完成!');
};

exports.down = function() {
  // 回滚
  console.log('[005] 回滚话术投喂系统...');
};
