/**
 * 数据库连接单例（MySQL 兼容层）
 * 保持 better-sqlite3 的 API 接口，底层使用 mysql2/promise
 * 支持: getDB(), db.prepare(sql).get/all/run(), db.exec(sql)
 *
 * 注意: 所有查询方法返回 Promise，需要在路由中使用 await
 */
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const DB_HOST = process.env.DB_HOST || '10.36.110.7';
const DB_PORT = parseInt(process.env.DB_PORT) || 3306;
const DB_USER = process.env.DB_USER || 'root';
const DB_PASS = process.env.DB_PASSWORD || 'Long0329';
const DB_NAME = process.env.DB_NAME || 'jinglaimei';

let _pool = null;
let _dbInstance = null;
let _initPromise = null;

// ==================== SQL 翻译：SQLite → MySQL ====================
function translateSQL(sql) {
  let s = sql;
  s = s.replace(/INTEGER\s+PRIMARY\s+KEY\s+AUTOINCREMENT/gi, 'INT AUTO_INCREMENT PRIMARY KEY');
  s = s.replace(/AUTOINCREMENT/gi, 'AUTO_INCREMENT');
  s = s.replace(/datetime\s*\(\s*'now'\s*,\s*'localtime'\s*\)/gi, 'NOW()');
  s = s.replace(/datetime\s*\(\s*'now'\s*\)/gi, 'NOW()');
  s = s.replace(/INSERT\s+OR\s+IGNORE/gi, 'INSERT IGNORE');
  s = s.replace(/INSERT\s+OR\s+REPLACE/gi, 'REPLACE INTO');
  // ON CONFLICT(...) DO UPDATE SET ... → ON DUPLICATE KEY UPDATE ...
  s = s.replace(/ON\s+CONFLICT\s*\(([^)]+)\)\s*DO\s+UPDATE\s+SET\s+/gi, 'ON DUPLICATE KEY UPDATE ');
  // ON CONFLICT(id) DO UPDATE SET ... → ON DUPLICATE KEY UPDATE ...（单列唯一键）
  // 已被上面的规则覆盖
  // 将 DO UPDATE SET 中排除字段引用 excluded.xxx 改为 VALUES(xxx)
  // SQLite: excluded.column_name → MySQL: VALUES(column_name)
  s = s.replace(/\bexcluded\.(\w+)/gi, 'VALUES($1)');
  // strftime 翻译: SQLite strftime → MySQL DATE_FORMAT
  // strftime('%Y-%m', column) → DATE_FORMAT(column, '%Y-%m')
  s = s.replace(/strftime\s*\(\s*'([^']+)'\s*,\s*([\w.]+)\s*\)/gi, "DATE_FORMAT($2, '$1')");
  // strftime('%Y-%m','now') → DATE_FORMAT(NOW(), '%Y-%m')
  s = s.replace(/strftime\s*\(\s*'([^']+)'\s*,\s*'now'\s*\)/gi, "DATE_FORMAT(NOW(), '$1')");
  // date('now','localtime') → CURDATE() (MySQL)
  s = s.replace(/date\s*\(\s*'now'\s*,\s*'localtime'\s*\)/gi, 'CURDATE()');
  s = s.replace(/date\s*\(\s*'now'\s*\)/gi, 'CURDATE()');
  s = s.replace(/FROM\s+sqlite_master\s+WHERE\s+type\s*=\s*'table'/gi,
    'FROM information_schema.tables WHERE table_schema = DATABASE()');
  return s;
}

function appendTableOptions(sql) {
  if (/^\s*CREATE\s+TABLE/i.test(sql) && !/ENGINE\s*=/i.test(sql)) {
    return sql.trim() + ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4';
  }
  return sql;
}

function splitStatements(sql) {
  const statements = [];
  let current = '';
  let inString = false;
  let stringChar = '';
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (inString) {
      current += ch;
      if (ch === stringChar && sql[i - 1] !== '\\') inString = false;
    } else if (ch === "'" || ch === '"') {
      inString = true;
      stringChar = ch;
      current += ch;
    } else if (ch === ';') {
      const trimmed = current.trim();
      if (trimmed) statements.push(trimmed);
      current = '';
    } else {
      current += ch;
    }
  }
  const trimmed = current.trim();
  if (trimmed) statements.push(trimmed);
  return statements;
}

// ==================== MySQL Statement（兼容 better-sqlite3） ====================
class MySQLStatement {
  constructor(poolOrConn, sql) {
    this._poolOrConn = poolOrConn;
    this._sql = translateSQL(sql.trim());
  }

  async get(...params) {
    const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : [...params];
    let finalSQL = this._sql;
    if (/^\s*SELECT/i.test(finalSQL) && !/LIMIT\s+\d+/i.test(finalSQL)) {
      finalSQL += ' LIMIT 1';
    }
    try {
      const [rows] = await this._poolOrConn.query(finalSQL, flatParams);
      return rows && rows.length > 0 ? rows[0] : null;
    } catch (err) {
      throw this._enhanceError(err, finalSQL);
    }
  }

  async all(...params) {
    const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : [...params];
    try {
      const [rows] = await this._poolOrConn.query(this._sql, flatParams);
      return rows || [];
    } catch (err) {
      throw this._enhanceError(err, this._sql);
    }
  }

  async run(...params) {
    const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : [...params];
    try {
      const [result] = await this._poolOrConn.query(this._sql, flatParams);
      return {
        changes: result ? (result.affectedRows || 0) : 0,
        lastInsertRowid: result ? (result.insertId || 0) : 0,
      };
    } catch (err) {
      throw this._enhanceError(err, this._sql);
    }
  }

  _enhanceError(err, sql) {
    err.message = `[MySQL] ${err.message}\n  SQL: ${sql.substring(0, 200)}`;
    return err;
  }
}

// ==================== MySQL Database（兼容 better-sqlite3） ====================
class MySQLDB {
  constructor(pool) {
    this._pool = pool;
  }

  prepare(sql) {
    return new MySQLStatement(this._pool, sql);
  }

  async exec(sql) {
    const statements = splitStatements(sql);
    for (const stmt of statements) {
      const translated = appendTableOptions(translateSQL(stmt));
      await this._pool.query(translated);
    }
  }

  pragma() { /* MySQL 无需 PRAGMA */ }

  /**
   * 兼容 better-sqlite3 的 db.transaction(fn) 
   * 用法与 better-sqlite3 相同，但 fn 内部的 db 操作必须用 await
   * 原有代码: db.transaction(() => { ... }) 改为 db.transaction(async () => { ... })
   * 调用处: const txn = db.transaction(async () => { ... }); await txn();
   */
  transaction(fn) {
    const self = this;
    return async (...args) => {
      const conn = await self._pool.getConnection();
      try {
        await conn.beginTransaction();
        // 在事务期间，用连接替换 pool，让所有 prepare() 都走同一个连接
        const origPrepare = self.prepare.bind(self);
        const origPool = self._pool;
        self._pool = conn;
        // 临时替换 prepare 方法
        self.prepare = function(sql) {
          return new MySQLStatement(conn, sql);
        };
        try {
          await fn(...args);
          await conn.commit();
        } finally {
          // 恢复原始状态
          self._pool = origPool;
          self.prepare = origPrepare;
        }
      } catch (err) {
        try { await conn.rollback(); } catch(e) { /* ignore rollback error */ }
        throw err;
      } finally {
        conn.release();
      }
    };
  }

  /**
   * 直接执行 SQL 并返回结果（用于特殊查询如 information_schema）
   */
  async raw(sql, params) {
    const translated = translateSQL(sql);
    const [rows] = await this._pool.query(translated, params || []);
    return rows;
  }
}

// ==================== 初始化 ====================
function getDB() {
  if (!_dbInstance) {
    _dbInstance = new MySQLDB(_pool);
  }
  return _dbInstance;
}

/**
 * 获取初始化 Promise（确保在服务器启动前完成）
 */
function getInitPromise() {
  return _initPromise;
}

async function _autoInit() {
  console.log('🚀 数据库表结构检查/初始化...');
  const db = getDB();

  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        openid VARCHAR(255) UNIQUE, unionid VARCHAR(255),
        username VARCHAR(255) NOT NULL, phone VARCHAR(20) UNIQUE, email VARCHAR(255), avatar_url TEXT,
        real_name VARCHAR(255), gender INT DEFAULT 0, birthday VARCHAR(50),
        agent_level INT DEFAULT 1, parent_id INT DEFAULT NULL,
        team_id INT DEFAULT NULL, invite_code VARCHAR(100) UNIQUE,
        registered_at VARCHAR(100) NOT NULL, balance DOUBLE DEFAULT 0.00,
        frozen_balance DOUBLE DEFAULT 0.00, total_income DOUBLE DEFAULT 0.00,
        today_income DOUBLE DEFAULT 0.00, status INT DEFAULT 1,
        is_deleted INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_phone (phone),
        INDEX idx_parent (parent_id),
        INDEX idx_team (team_id),
        INDEX idx_invite (invite_code)
      );
      CREATE TABLE IF NOT EXISTS admins (
        id INT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL, real_name VARCHAR(100), email VARCHAR(255), phone VARCHAR(20),
        avatar_url TEXT, role VARCHAR(50) DEFAULT 'operator', permissions TEXT DEFAULT '[]',
        last_login_at TIMESTAMP NULL, last_login_ip VARCHAR(50), status INT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS teams (
        id INT AUTO_INCREMENT PRIMARY KEY, team_name VARCHAR(200) NOT NULL,
        leader_id INT NOT NULL, description TEXT, member_count INT DEFAULT 0,
        total_sales DOUBLE DEFAULT 0.00, total_commission DOUBLE DEFAULT 0.00,
        monthly_target DOUBLE DEFAULT 0.00, monthly_achievement DOUBLE DEFAULT 0.00,
        team_level INT DEFAULT 1, performance_rating DOUBLE DEFAULT 0.00,
        status INT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (leader_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS product_categories (
        id INT AUTO_INCREMENT PRIMARY KEY, category_name VARCHAR(200) NOT NULL,
        parent_id INT DEFAULT 0, icon_url TEXT, sort_order INT DEFAULT 0,
        status INT DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY, product_code VARCHAR(100) UNIQUE NOT NULL,
        product_name VARCHAR(255) NOT NULL, category_id INT NOT NULL, brand VARCHAR(200),
        retail_price DOUBLE NOT NULL, vip_price DOUBLE, agent_price DOUBLE,
        partner_price DOUBLE, wholesale_price DOUBLE, chief_price DOUBLE,
        division_price DOUBLE, cost_price DOUBLE, stock_quantity INT DEFAULT 0,
        sold_quantity INT DEFAULT 0, min_stock_alert INT DEFAULT 10,
        description TEXT, specifications TEXT, main_image TEXT,
        image_gallery TEXT DEFAULT '[]', status INT DEFAULT 1,
        is_hot INT DEFAULT 0, is_recommend INT DEFAULT 0,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES product_categories(id)
      );
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY, order_no VARCHAR(100) UNIQUE NOT NULL,
        user_id INT NOT NULL, total_amount DOUBLE NOT NULL,
        discount_amount DOUBLE DEFAULT 0.00, shipping_fee DOUBLE DEFAULT 0.00,
        actual_amount DOUBLE NOT NULL, paid_amount DOUBLE DEFAULT 0.00,
        receiver_name VARCHAR(100) NOT NULL, receiver_phone VARCHAR(20) NOT NULL,
        receiver_address TEXT NOT NULL, shipping_method VARCHAR(100), shipping_no VARCHAR(100),
        order_status INT DEFAULT 0, payment_status INT DEFAULT 0,
        payment_method VARCHAR(50), payment_time TIMESTAMP NULL, buyer_remark TEXT,
        seller_remark TEXT, order_time VARCHAR(100) NOT NULL, shipping_time TIMESTAMP NULL,
        confirm_time TIMESTAMP NULL, cancel_time TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS order_items (
        id INT AUTO_INCREMENT PRIMARY KEY, order_id INT NOT NULL,
        product_id INT NOT NULL, product_name VARCHAR(255) NOT NULL,
        product_image TEXT, unit_price DOUBLE NOT NULL, quantity INT NOT NULL,
        subtotal DOUBLE NOT NULL, specifications TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id)
      );
      CREATE TABLE IF NOT EXISTS commissions (
        id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL,
        order_id INT NOT NULL, commission_type INT DEFAULT 1,
        commission_rate DOUBLE NOT NULL, order_amount DOUBLE NOT NULL,
        commission_amount DOUBLE NOT NULL, commission_status INT DEFAULT 0,
        settlement_time TIMESTAMP NULL, source_user_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS withdrawals (
        id INT AUTO_INCREMENT PRIMARY KEY, withdrawal_no VARCHAR(100) UNIQUE NOT NULL,
        user_id INT NOT NULL, withdrawal_amount DOUBLE NOT NULL,
        service_fee DOUBLE DEFAULT 0.00, actual_amount DOUBLE NOT NULL,
        bank_name VARCHAR(100) NOT NULL, bank_card_no VARCHAR(30) NOT NULL,
        account_name VARCHAR(100) NOT NULL, withdrawal_status INT DEFAULT 0,
        audit_user_id INT, audit_time TIMESTAMP NULL, audit_remark TEXT,
        payment_time TIMESTAMP NULL, payment_remark TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS school_courses (
        id INT AUTO_INCREMENT PRIMARY KEY, course_type INT NOT NULL,
        course_title VARCHAR(255) NOT NULL, course_subtitle VARCHAR(255), cover_image TEXT,
        video_url TEXT, content TEXT, attachments TEXT DEFAULT '[]',
        required_time INT DEFAULT 0, difficulty_level INT DEFAULT 1,
        credit_points INT DEFAULT 0, status INT DEFAULT 1,
        sort_order INT DEFAULT 0, view_count INT DEFAULT 0,
        like_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS study_progress (
        id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL,
        course_id INT NOT NULL, study_status INT DEFAULT 0,
        progress_percent DOUBLE DEFAULT 0.00, study_duration INT DEFAULT 0,
        exam_score DOUBLE, exam_time TIMESTAMP NULL, start_time TIMESTAMP NULL, complete_time TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_user_course (user_id, course_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (course_id) REFERENCES school_courses(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS system_configs (
        id INT AUTO_INCREMENT PRIMARY KEY, config_key VARCHAR(200) UNIQUE NOT NULL,
        config_value TEXT, config_type VARCHAR(50), description TEXT,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS monthly_statistics (
        id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL,
        statistic_month VARCHAR(20) NOT NULL, sales_amount DOUBLE DEFAULT 0.00,
        commission_amount DOUBLE DEFAULT 0.00, order_count INT DEFAULT 0,
        new_members INT DEFAULT 0, active_members INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_user_month (user_id, statistic_month),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS operation_logs (
        id INT AUTO_INCREMENT PRIMARY KEY, operator_id INT,
        operator_type VARCHAR(50) DEFAULT 'admin', action VARCHAR(200) NOT NULL,
        target_type VARCHAR(100), target_id INT, description TEXT,
        ip_address VARCHAR(50), user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS announcements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(500) NOT NULL DEFAULT '',
        content TEXT NOT NULL DEFAULT '',
        summary VARCHAR(1000) DEFAULT '',
        category VARCHAR(50) DEFAULT 'notice',
        cover_url TEXT DEFAULT '',
        author VARCHAR(100) DEFAULT '管理员',
        is_top INT DEFAULT 0,
        status INT DEFAULT 1,
        view_count INT DEFAULT 0,
        sort_order INT DEFAULT 0,
        published_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS socratic_xp_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        xp_amount INT NOT NULL DEFAULT 0,
        source VARCHAR(200) DEFAULT '',
        source_id INT,
        description TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS ranking_configs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNIQUE NOT NULL,
        rank_position INT DEFAULT 0,
        display_name VARCHAR(200) DEFAULT '',
        highlight_color VARCHAR(50) DEFAULT '',
        badge_text VARCHAR(100) DEFAULT '',
        is_pinned INT DEFAULT 0,
        is_hidden INT DEFAULT 0,
        custom_note TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS ranking_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        setting_key VARCHAR(200) UNIQUE NOT NULL,
        setting_value TEXT DEFAULT '',
        description TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS script_feeds (
        id INT AUTO_INCREMENT PRIMARY KEY,
        raw_content TEXT NOT NULL DEFAULT '',
        target_personality VARCHAR(200) DEFAULT '',
        target_scene VARCHAR(200) DEFAULT '',
        admin_notes TEXT DEFAULT '',
        status INT DEFAULT 0,
        priority INT DEFAULT 0,
        optimized_content TEXT DEFAULT '',
        optimization_prompt TEXT DEFAULT '',
        created_script_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS sales_scripts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(500) NOT NULL DEFAULT '',
        content TEXT NOT NULL DEFAULT '',
        category VARCHAR(100) DEFAULT '',
        difficulty INT DEFAULT 1,
        sort_order INT DEFAULT 0,
        status INT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS skin_report_issues (
        id INT AUTO_INCREMENT PRIMARY KEY,
        report_id INT NOT NULL,
        issue_name VARCHAR(200) NOT NULL DEFAULT '',
        category VARCHAR(100) DEFAULT '',
        severity VARCHAR(50) DEFAULT '',
        confidence DOUBLE DEFAULT 0,
        area VARCHAR(200) DEFAULT '',
        description TEXT DEFAULT '',
        cause_text TEXT DEFAULT '',
        advice_text TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (report_id) REFERENCES skin_reports(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS study_points (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNIQUE NOT NULL,
        points INT DEFAULT 0,
        available_points INT DEFAULT 0,
        spent_points INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    console.log('  ✅ 核心表结构就绪');
  } catch(e) {
    console.warn('  ⚠️ 核心表创建警告:', e.message);
  }

  // 插入默认管理员
  try {
    const existing = await db.prepare('SELECT id FROM admins WHERE username = ?').get('admin');
    if (!existing) {
      const hashedPassword = bcrypt.hashSync('admin123456', 10);
      await db.prepare('INSERT INTO admins (username, password, real_name, role, permissions, status) VALUES (?, ?, ?, ?, ?, ?)')
        .run('admin', hashedPassword, '超级管理员', 'super_admin', '["all"]', 1);
      console.log('  ✅ 默认管理员账号已创建: admin / admin123456');
    }
  } catch(e) {
    console.warn('  ⚠️ 管理员检查:', e.message);
  }

  console.log('✅ 数据库初始化完成！');
}

async function _connect() {
  console.log(`🔌 正在连接 MySQL: ${DB_HOST}:${DB_PORT}...`);

  // 先不指定数据库连接，创建数据库
  const initConn = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASS,
    charset: 'utf8mb4',
    multipleStatements: true,
  });

  await initConn.query(
    `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;`
  );
  await initConn.query(`USE \`${DB_NAME}\`;`);
  await initConn.query(`SET FOREIGN_KEY_CHECKS = 0;`);
  await initConn.end();
  console.log(`✅ 数据库 ${DB_NAME} 已就绪`);

  // 创建连接池
  _pool = mysql.createPool({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASS,
    database: DB_NAME,
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  // 测试连接
  await _pool.query('SELECT 1');
  console.log('✅ MySQL 连接池已建立');

  // 自动建表
  await _autoInit();
}

// 启动连接
_initPromise = _connect().catch(err => {
  console.error('❌ 数据库初始化失败:', err.message);
  process.exit(1);
});

module.exports = { getDB, getInitPromise };
