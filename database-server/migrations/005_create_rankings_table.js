/**
 * 005_create_rankings_table.js
 * 业绩排行榜配置表 - 后台可编辑管理排行榜数据
 */
const path = require('path');
const dbPath = path.join(__dirname, '..', 'data', 'jinglaimei.db');
const Database = require('better-sqlite3');

const db = new Database(dbPath);

console.log('╔══════════════════════════════════════╗');
console.log('║   创建业绩排行榜配置表...          ║');
console.log('╚══════════════════════════════════════╝');

db.exec(`
  CREATE TABLE IF NOT EXISTS ranking_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    rank_position INTEGER NOT NULL,
    display_name TEXT,
    highlight_color TEXT DEFAULT '#e94560',
    badge_text TEXT,
    is_pinned INTEGER DEFAULT 0,
    is_hidden INTEGER DEFAULT 0,
    custom_note TEXT,
    created_by INTEGER,
    updated_by INTEGER,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id)
  );

  CREATE INDEX IF NOT EXISTS idx_ranking_position ON ranking_configs(rank_position);
  CREATE INDEX IF NOT EXISTS idx_ranking_pinned ON ranking_configs(is_pinned);
`);

// 检查是否已有数据
const count = db.prepare('SELECT COUNT(*) as cnt FROM ranking_configs').get().cnt;
console.log(`✅ ranking_configs 表已就绪，当前 ${count} 条记录`);

// 创建排行榜展示设置表
db.exec(`
  CREATE TABLE IF NOT EXISTS ranking_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    updated_at TEXT DEFAULT (datetime('now','localtime'))
  );

  INSERT OR IGNORE INTO ranking_settings (setting_key, setting_value, description) VALUES 
    ('title', '业绩排行榜', '首页排行榜标题'),
    ('show_count', '8', '首页显示条数（0-20）'),
    ('period', 'month', '统计周期: month/quarter/all'),
    ('auto_refresh', '1', '自动刷新: 0关闭 1开启'),
    ('enable_top3', '1', '是否展示前三名领奖台'),
    ('background_color', '#fffbf0', '模块背景色')
`);

console.log('✅ ranking_settings 表已就绪');

db.close();
console.log('\n🎉 排行榜系统初始化完成！');
