# 静莱美代理商系统数据库设计

## 一、数据库设计原则

### 1. 数据一致性原则
- 所有关联数据保持一致性
- 事务处理确保数据完整性
- 外键约束保证关系正确性

### 2. 性能优化原则
- 合理设计索引
- 避免过度规范化
- 读写分离设计

### 3. 扩展性原则
- 预留扩展字段
- 支持水平扩展
- 兼容未来需求

## 二、核心数据表设计

### 1. 用户表 (users) - 核心表
```sql
CREATE TABLE users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  openid VARCHAR(100) UNIQUE COMMENT '微信openid',
  unionid VARCHAR(100) COMMENT '微信unionid',
  username VARCHAR(50) NOT NULL COMMENT '用户名',
  phone VARCHAR(20) UNIQUE COMMENT '手机号',
  email VARCHAR(100) COMMENT '邮箱',
  avatar_url VARCHAR(500) COMMENT '头像URL',
  real_name VARCHAR(50) COMMENT '真实姓名',
  gender TINYINT DEFAULT 0 COMMENT '性别: 0-未知, 1-男, 2-女',
  birthday DATE COMMENT '生日',
  
  -- 代理商信息
  agent_level TINYINT DEFAULT 1 COMMENT '代理等级: 1-普通代理, 2-高级代理, 3-合伙人',
  parent_id BIGINT DEFAULT NULL COMMENT '上级代理ID',
  team_id BIGINT DEFAULT NULL COMMENT '所属团队ID',
  invite_code VARCHAR(20) UNIQUE COMMENT '邀请码',
  registered_at DATETIME NOT NULL COMMENT '注册时间',
  
  -- 账户信息
  balance DECIMAL(10,2) DEFAULT 0.00 COMMENT '账户余额',
  frozen_balance DECIMAL(10,2) DEFAULT 0.00 COMMENT '冻结金额',
  total_income DECIMAL(10,2) DEFAULT 0.00 COMMENT '累计收益',
  today_income DECIMAL(10,2) DEFAULT 0.00 COMMENT '今日收益',
  
  -- 状态信息
  status TINYINT DEFAULT 1 COMMENT '状态: 0-禁用, 1-正常, 2-审核中',
  is_deleted TINYINT DEFAULT 0 COMMENT '是否删除',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_parent_id (parent_id),
  INDEX idx_team_id (team_id),
  INDEX idx_agent_level (agent_level),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';
```

### 2. 团队表 (teams) - 团队关系
```sql
CREATE TABLE teams (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  team_name VARCHAR(100) NOT NULL COMMENT '团队名称',
  leader_id BIGINT NOT NULL COMMENT '团队负责人ID',
  description TEXT COMMENT '团队描述',
  
  -- 团队统计
  member_count INT DEFAULT 0 COMMENT '成员数量',
  total_sales DECIMAL(10,2) DEFAULT 0.00 COMMENT '团队总销售额',
  total_commission DECIMAL(10,2) DEFAULT 0.00 COMMENT '团队总佣金',
  monthly_target DECIMAL(10,2) DEFAULT 0.00 COMMENT '月目标',
  monthly_achievement DECIMAL(10,2) DEFAULT 0.00 COMMENT '月完成额',
  
  -- 团队等级
  team_level TINYINT DEFAULT 1 COMMENT '团队等级',
  performance_rating DECIMAL(3,2) DEFAULT 0.00 COMMENT '绩效评分',
  
  status TINYINT DEFAULT 1 COMMENT '状态: 0-解散, 1-正常',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_leader_id (leader_id),
  INDEX idx_team_level (team_level),
  FOREIGN KEY (leader_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='团队表';
```

### 3. 商品表 (products) - 商品信息
```sql
CREATE TABLE products (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  product_code VARCHAR(50) UNIQUE NOT NULL COMMENT '商品编码',
  product_name VARCHAR(200) NOT NULL COMMENT '商品名称',
  category_id BIGINT NOT NULL COMMENT '分类ID',
  brand VARCHAR(100) COMMENT '品牌',
  
  -- 价格体系
  retail_price DECIMAL(10,2) NOT NULL COMMENT '零售价',
  agent_price DECIMAL(10,2) NOT NULL COMMENT '代理价',
  vip_price DECIMAL(10,2) COMMENT 'VIP价',
  cost_price DECIMAL(10,2) COMMENT '成本价',
  
  -- 库存信息
  stock_quantity INT DEFAULT 0 COMMENT '库存数量',
  sold_quantity INT DEFAULT 0 COMMENT '已售数量',
  min_stock_alert INT DEFAULT 10 COMMENT '最低库存预警',
  
  -- 商品信息
  description TEXT COMMENT '商品描述',
  specifications TEXT COMMENT '规格参数',
  main_image VARCHAR(500) COMMENT '主图URL',
  image_gallery JSON COMMENT '图片画廊',
  
  -- 状态信息
  status TINYINT DEFAULT 1 COMMENT '状态: 0-下架, 1-上架, 2-缺货',
  is_hot TINYINT DEFAULT 0 COMMENT '是否热销',
  is_recommend TINYINT DEFAULT 0 COMMENT '是否推荐',
  sort_order INT DEFAULT 0 COMMENT '排序',
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_category_id (category_id),
  INDEX idx_status (status),
  INDEX idx_is_hot (is_hot),
  INDEX idx_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品表';
```

### 4. 订单表 (orders) - 订单信息
```sql
CREATE TABLE orders (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_no VARCHAR(50) UNIQUE NOT NULL COMMENT '订单号',
  user_id BIGINT NOT NULL COMMENT '用户ID',
  
  -- 订单金额
  total_amount DECIMAL(10,2) NOT NULL COMMENT '订单总额',
  discount_amount DECIMAL(10,2) DEFAULT 0.00 COMMENT '优惠金额',
  shipping_fee DECIMAL(10,2) DEFAULT 0.00 COMMENT '运费',
  actual_amount DECIMAL(10,2) NOT NULL COMMENT '实付金额',
  paid_amount DECIMAL(10,2) DEFAULT 0.00 COMMENT '已支付金额',
  
  -- 收货信息
  receiver_name VARCHAR(50) NOT NULL COMMENT '收货人姓名',
  receiver_phone VARCHAR(20) NOT NULL COMMENT '收货人电话',
  receiver_address VARCHAR(500) NOT NULL COMMENT '收货地址',
  shipping_method VARCHAR(50) COMMENT '配送方式',
  shipping_no VARCHAR(100) COMMENT '物流单号',
  
  -- 订单状态
  order_status TINYINT DEFAULT 0 COMMENT '订单状态: 0-待支付, 1-待发货, 2-已发货, 3-已完成, 4-已取消, 5-退款中, 6-已退款',
  payment_status TINYINT DEFAULT 0 COMMENT '支付状态: 0-未支付, 1-已支付, 2-支付失败',
  payment_method VARCHAR(50) COMMENT '支付方式',
  payment_time DATETIME COMMENT '支付时间',
  
  -- 备注信息
  buyer_remark TEXT COMMENT '买家备注',
  seller_remark TEXT COMMENT '卖家备注',
  
  -- 时间信息
  order_time DATETIME NOT NULL COMMENT '下单时间',
  shipping_time DATETIME COMMENT '发货时间',
  confirm_time DATETIME COMMENT '确认收货时间',
  cancel_time DATETIME COMMENT '取消时间',
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_user_id (user_id),
  INDEX idx_order_no (order_no),
  INDEX idx_order_status (order_status),
  INDEX idx_order_time (order_time),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单表';
```

### 5. 订单明细表 (order_items) - 订单商品详情
```sql
CREATE TABLE order_items (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_id BIGINT NOT NULL COMMENT '订单ID',
  product_id BIGINT NOT NULL COMMENT '商品ID',
  product_name VARCHAR(200) NOT NULL COMMENT '商品名称',
  product_image VARCHAR(500) COMMENT '商品图片',
  
  -- 价格信息
  unit_price DECIMAL(10,2) NOT NULL COMMENT '单价',
  quantity INT NOT NULL COMMENT '数量',
  subtotal DECIMAL(10,2) NOT NULL COMMENT '小计',
  
  -- 规格信息
  specifications TEXT COMMENT '规格信息',
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_order_id (order_id),
  INDEX idx_product_id (product_id),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单明细表';
```

### 6. 收益表 (commissions) - 佣金收益
```sql
CREATE TABLE commissions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL COMMENT '用户ID',
  order_id BIGINT NOT NULL COMMENT '订单ID',
  
  -- 收益信息
  commission_type TINYINT DEFAULT 1 COMMENT '收益类型: 1-直接销售, 2-团队提成, 3-推荐奖励',
  commission_rate DECIMAL(5,2) NOT NULL COMMENT '佣金比例(%)',
  order_amount DECIMAL(10,2) NOT NULL COMMENT '订单金额',
  commission_amount DECIMAL(10,2) NOT NULL COMMENT '佣金金额',
  
  -- 状态信息
  commission_status TINYINT DEFAULT 0 COMMENT '状态: 0-待结算, 1-已结算, 2-已冻结',
  settlement_time DATETIME COMMENT '结算时间',
  
  -- 关联信息
  source_user_id BIGINT COMMENT '来源用户ID(团队提成时使用)',
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_user_id (user_id),
  INDEX idx_order_id (order_id),
  INDEX idx_commission_status (commission_status),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='收益表';
```

### 7. 提现表 (withdrawals) - 提现记录
```sql
CREATE TABLE withdrawals (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  withdrawal_no VARCHAR(50) UNIQUE NOT NULL COMMENT '提现单号',
  user_id BIGINT NOT NULL COMMENT '用户ID',
  
  -- 提现信息
  withdrawal_amount DECIMAL(10,2) NOT NULL COMMENT '提现金额',
  service_fee DECIMAL(10,2) DEFAULT 0.00 COMMENT '手续费',
  actual_amount DECIMAL(10,2) NOT NULL COMMENT '实际到账金额',
  
  -- 账户信息
  bank_name VARCHAR(100) NOT NULL COMMENT '银行名称',
  bank_card_no VARCHAR(50) NOT NULL COMMENT '银行卡号',
  account_name VARCHAR(50) NOT NULL COMMENT '账户名',
  
  -- 状态信息
  withdrawal_status TINYINT DEFAULT 0 COMMENT '状态: 0-待审核, 1-审核通过, 2-审核拒绝, 3-已打款, 4-已完成',
  audit_user_id BIGINT COMMENT '审核人ID',
  audit_time DATETIME COMMENT '审核时间',
  audit_remark TEXT COMMENT '审核备注',
  
  -- 打款信息
  payment_time DATETIME COMMENT '打款时间',
  payment_remark TEXT COMMENT '打款备注',
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_user_id (user_id),
  INDEX idx_withdrawal_status (withdrawal_status),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='提现表';
```

### 8. 商学院课程表 (school_courses) - 学习内容
```sql
CREATE TABLE school_courses (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  course_type TINYINT NOT NULL COMMENT '课程类型: 1-学习视频, 2-学习书籍, 3-话术通关, 4-行动日志',
  course_title VARCHAR(200) NOT NULL COMMENT '课程标题',
  course_subtitle VARCHAR(500) COMMENT '课程副标题',
  
  -- 内容信息
  cover_image VARCHAR(500) COMMENT '封面图',
  video_url VARCHAR(500) COMMENT '视频URL',
  content TEXT COMMENT '课程内容',
  attachments JSON COMMENT '附件列表',
  
  -- 学习要求
  required_time INT DEFAULT 0 COMMENT '要求学习时长(分钟)',
  difficulty_level TINYINT DEFAULT 1 COMMENT '难度等级: 1-初级, 2-中级, 3-高级',
  credit_points INT DEFAULT 0 COMMENT '学分',
  
  -- 状态信息
  status TINYINT DEFAULT 1 COMMENT '状态: 0-下架, 1-上架',
  sort_order INT DEFAULT 0 COMMENT '排序',
  view_count INT DEFAULT 0 COMMENT '浏览数',
  like_count INT DEFAULT 0 COMMENT '点赞数',
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_course_type (course_type),
  INDEX idx_status (status),
  INDEX idx_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商学院课程表';
```

### 9. 学习进度表 (study_progress) - 用户学习记录
```sql
CREATE TABLE study_progress (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL COMMENT '用户ID',
  course_id BIGINT NOT NULL COMMENT '课程ID',
  
  -- 进度信息
  study_status TINYINT DEFAULT 0 COMMENT '学习状态: 0-未开始, 1-学习中, 2-已完成',
  progress_percent DECIMAL(5,2) DEFAULT 0.00 COMMENT '进度百分比',
  study_duration INT DEFAULT 0 COMMENT '学习时长(秒)',
  
  -- 考核信息
  exam_score DECIMAL(5,2) COMMENT '考试成绩',
  exam_time DATETIME COMMENT '考试时间',
  
  -- 时间信息
  start_time DATETIME COMMENT '开始时间',
  complete_time DATETIME COMMENT '完成时间',
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY uk_user_course (user_id, course_id),
  INDEX idx_user_id (user_id),
  INDEX idx_study_status (study_status),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES school_courses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='学习进度表';
```

### 10. 系统配置表 (system_configs) - 全局配置
```sql
CREATE TABLE system_configs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  config_key VARCHAR(100) UNIQUE NOT NULL COMMENT '配置键',
  config_value TEXT COMMENT '配置值',
  config_type VARCHAR(50) COMMENT '配置类型',
  description VARCHAR(500) COMMENT '配置描述',
  sort_order INT DEFAULT 0 COMMENT '排序',
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_config_key (config_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统配置表';
```

## 三、数据关联关系图

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│    users    │1───∞ │    teams    │1───∞ │ school_courses│
└─────────────┘      └─────────────┘      └─────────────┘
       │1                     │1                     │1
       ↓∞                    ↓∞                    ↓∞
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   orders    │1───∞ │  order_items│1───∞ │ study_progress│
└─────────────┘      └─────────────┘      └─────────────┘
       │1                     │1
       ↓∞                    ↓∞
┌─────────────┐      ┌─────────────┐
│ commissions │      │ withdrawals │
└─────────────┘      └─────────────┘
```

## 四、核心数据关联逻辑

### 1. 用户-团队关联
```sql
-- 查询用户及其团队信息
SELECT u.*, t.team_name, t.leader_id, t.member_count
FROM users u
LEFT JOIN teams t ON u.team_id = t.id
WHERE u.id = ?;

-- 查询团队所有成员
SELECT u.* 
FROM users u
WHERE u.team_id = ?
ORDER BY u.created_at DESC;
```

### 2. 订单-收益关联
```sql
-- 查询订单及产生的收益
SELECT o.*, 
       SUM(c.commission_amount) as total_commission,
       COUNT(c.id) as commission_count
FROM orders o
LEFT JOIN commissions c ON o.id = c.order_id
WHERE o.user_id = ?
GROUP BY o.id;

-- 查询用户总收益
SELECT u.id, u.username,
       SUM(CASE WHEN c.commission_status = 1 THEN c.commission_amount ELSE 0 END) as settled_income,
       SUM(CASE WHEN c.commission_status = 0 THEN c.commission_amount ELSE 0 END) as pending_income
FROM users u
LEFT JOIN commissions c ON u.id = c.user_id
WHERE u.id = ?
GROUP BY u.id;
```

### 3. 商品-订单关联
```sql
-- 查询商品销售统计
SELECT p.*,
       SUM(oi.quantity) as total_sold,
       SUM(oi.subtotal) as total_sales,
       COUNT(DISTINCT o.user_id) as buyer_count
FROM products p
LEFT JOIN order_items oi ON p.id = oi.product_id
LEFT JOIN orders o ON oi.order_id = o.id
WHERE p.id = ?
GROUP BY p.id;

-- 库存预警查询
SELECT p.*,
       (p.stock_quantity - p.sold_quantity) as available_stock
FROM products p
WHERE (p.stock_quantity - p.sold_quantity) <= p.min_stock_alert
AND p.status = 1;
```

### 4. 用户-学习进度关联
```sql
-- 查询用户学习统计
SELECT u.id, u.username,
       COUNT(DISTINCT sp.course_id) as total_courses,
       COUNT(CASE WHEN sp.study_status = 2 THEN 1 END) as completed_courses,
       AVG(sp.progress_percent) as avg_progress,
       SUM(sp.study_duration) as total_study_time
FROM users u
LEFT JOIN study_progress sp ON u.id = sp.user_id
WHERE u.id = ?
GROUP BY u.id;

-- 团队学习统计
SELECT t.team_name,
       COUNT(DISTINCT u.id) as member_count,
       COUNT(DISTINCT sp.course_id) as total_study_courses,
       AVG(sp.progress_percent) as team_avg_progress
FROM teams t
LEFT JOIN users u ON t.id = u.team_id
LEFT JOIN study_progress sp ON u.id = sp.user_id
WHERE t.id = ?
GROUP BY t.id;
```

## 五、数据一致性维护

### 1. 触发器示例
```sql
-- 订单完成时更新用户收益
CREATE TRIGGER after_order_completed
AFTER UPDATE ON orders
FOR EACH ROW
BEGIN
  IF NEW.order_status = 3 AND OLD.order_status != 3 THEN
    -- 计算直接销售佣金
    INSERT INTO commissions (user_id, order_id, commission_type, commission_rate, order_amount, commission_amount)
    SELECT NEW.user_id, NEW.id, 1, 0.10, NEW.actual_amount, NEW.actual_amount * 0.10;
    
    -- 更新用户收益统计
    UPDATE users 
    SET total_income = total_income + (NEW.actual_amount * 0.10),
        balance = balance + (NEW.actual_amount * 0.10)
    WHERE id = NEW.user_id;
  END IF;
END;

-- 团队提成计算
CREATE TRIGGER after_commission_settled
AFTER UPDATE ON commissions
FOR EACH ROW
BEGIN
  IF NEW.commission_status = 1 AND OLD.commission_status != 1 THEN
    -- 查找上级代理
    SELECT parent_id INTO @parent_id FROM users WHERE id = NEW.user_id;
    
    IF @parent_id IS NOT NULL THEN
      -- 给上级代理分配团队提成
      INSERT INTO commissions (user_id, order_id, commission_type, commission_rate, order_amount, commission_amount, source_user_id)
      VALUES (@parent_id, NEW.order_id, 2, 0.05, NEW.order_amount, NEW.order_amount * 0.05, NEW.user_id);
    END IF;
  END IF;
END;
```

### 2. 存储过程示例
```sql
-- 月度收益统计存储过程
DELIMITER //
CREATE PROCEDURE calculate_monthly_statistics(IN month_year DATE)
BEGIN
  -- 计算用户月度收益
  INSERT INTO monthly_statistics (user_id, statistic_month, sales_amount, commission_amount, order_count)
  SELECT u.id, 
         DATE_FORMAT(month_year, '%Y-%m-01'),
         SUM(o.actual_amount),
         SUM(c.commission_amount),
         COUNT(DISTINCT o.id)
  FROM users u
  LEFT JOIN orders o ON u.id = o.user_id 
    AND DATE_FORMAT(o.order_time, '%Y-%m') = DATE_FORMAT(month_year, '%Y-%m')
    AND o.order_status = 3
  LEFT JOIN commissions c ON u.id = c.user_id 
    AND DATE_FORMAT(c.created_at, '%Y-%m') = DATE_FORMAT(month_year, '%Y-%m')
    AND c.commission_status = 1
  GROUP BY u.id;
END //
DELIMITER ;
```

## 六、数据库优化建议

### 1. 索引优化
```sql
-- 添加复合索引
CREATE INDEX idx_user_order_time ON orders(user_id, order_time);
CREATE INDEX idx_product_sales ON products(status, sold_quantity DESC);
CREATE INDEX idx_commission_user_time ON commissions(user_id, created_at DESC);
```

### 2. 分区策略
```sql
-- 按月分区订单表
ALTER TABLE orders 
PARTITION BY RANGE (YEAR(order_time) * 100 + MONTH(order_time)) (
    PARTITION p202601 VALUES LESS THAN (202602),
    PARTITION p202602 VALUES LESS THAN (202603),
    PARTITION p202603 VALUES LESS THAN (202604),
    PARTITION p_future VALUES LESS THAN MAXVALUE
);
```

### 3. 读写分离
- 主库：写操作 + 重要读操作
- 从库1：统计报表查询
- 从库2：用户行为分析

## 七、数据备份策略

### 1. 备份计划
- 完整备份：每日凌晨2点
- 增量备份：每小时
- 事务日志：实时

### 2. 恢复测试
- 每月进行一次恢复演练
- 保留30天备份数据
- 异地备份存储

## 八、监控指标

### 1. 性能监控
- 查询响应时间
- 连接池使用率
- 锁等待时间

### 2. 业务监控
- 订单增长趋势
- 用户活跃度
- 库存周转率

### 3. 异常监控
- 慢查询日志
- 死锁检测
- 数据一致性检查

---

这个数据库设计支持：
1. **高并发**：合理的索引和分区策略
2. **数据一致性**：完善的事务和外键约束
3. **可扩展性**：预留字段和灵活的表结构
4. **性能优化**：读写分离和缓存策略
5. **业务需求**：完整的代理商业务模型