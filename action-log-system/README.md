# 🚀 行动日志管理系统

基于Excel的个人目标管理与追踪系统，通过WorkBuddy实现自动化操作。

## 📋 系统概述

本系统将《行动日志》拆解为6个核心模块，每个模块对应一个独立的Excel文件，WorkBuddy负责“读取-处理-填写-提醒-汇总”的完整闭环。

## 📁 系统架构

```
action-log-system/
├── 📂 api/                    # RESTful API服务
│   ├── ActionLogAPI.js       # API路由
│   └── server.js            # Express服务器
├── 📂 services/              # 核心服务
│   ├── ActionLogService.js  # 行动日志服务
│   ├── ExcelService.js      # Excel处理服务
│   └── NotificationService.js # 通知服务
├── 📂 templates/             # Excel模板
│   ├── annual_goal_template.js
│   ├── monthly_goal_template.js
│   ├── weekly_goal_template.js
│   ├── daily_goal_template.js
│   ├── monthly_tracking_template.js
│   └── commitment_template.js
├── 📂 automation/            # 自动化配置
│   └── setup-automations.js # WorkBuddy自动化设置
├── 📂 cli/                   # 命令行工具
│   └── action-log-cli.js    # 交互式CLI
├── 📂 data/                  # 数据存储
│   ├── annual_goals/        # 年度目标数据
│   ├── monthly_goals/       # 月度目标数据
│   ├── weekly_goals/        # 周目标数据
│   ├── daily_goals/         # 日目标数据
│   ├── monthly_tracking/    # 月度追踪数据
│   ├── commitments/         # 承诺书数据
│   └── reports/             # 报告数据
├── 📂 docs/                  # 文档
│   └── commands.md          # 指令手册
├── 📂 scripts/              # 工具脚本
│   ├── initialize-templates.js
│   ├── create-daily-goal.js
│   └── generate-monthly-report.js
├── package.json             # 项目配置
└── README.md               # 本文档
```

## 🔧 快速开始

### 1. 安装依赖

```bash
cd /Users/apple/WorkBuddy/20260324191412/action-log-system
npm install
```

### 2. 初始化系统

```bash
npm run init-templates
```

### 3. 启动服务

```bash
npm start
```

服务启动后访问：
- 🌐 API服务: http://localhost:4001
- 📖 API文档: http://localhost:4001/api-docs
- 🩺 健康检查: http://localhost:4001/health

### 4. 使用命令行工具

```bash
node cli/action-log-cli.js
```

## 📊 六大核心模块

### 1. 年度目标表 (`年度目标表.xlsx`)
- **工作表**: 目标表一、目标表二
- **字段**: 类别、序号、目标内容、方法和措施、起止时间、完成打√
- **功能**: 设定年度总目标、分解到月

### 2. 月度目标表 (`月度目标表.xlsx`)
- **工作表**: 方法和措施、其他目标、完成情况
- **功能**: 每月具体目标、措施、完成情况

### 3. 周目标表 (`周目标表.xlsx`)
- **工作表**: 本周目标、本周总结
- **功能**: 周重点事项、其他目标、周总结

### 4. 日目标表 (`日目标表.xlsx`)
- **工作表**: 按日期命名 (如: 2026-03-28)
- **功能**: ABC分类、时间安排、心态评分、学习改进

### 5. 月度追踪表 (`月度达成追踪表.xlsx`)
- **工作表**: 月度达成追踪
- **功能**: 每月实际vs目标、差距分析

### 6. 承诺书 (`承诺书.xlsx`)
- **工作表**: 承诺书、打卡记录
- **功能**: 个人承诺、监督人、PK人

## 🎯 核心功能

### 1. 目标管理
- 年度目标设定与分解
- 月度目标自动生成
- 周目标重点提取
- 日目标创建与追踪

### 2. 进度追踪
- 自动计算完成率
- 目标偏差分析
- 心态趋势分析
- 承诺书打卡统计

### 3. 自动化提醒
- 每日晨间提醒 (8:00)
- 晚间复盘提醒 (21:00)
- 心态预警 (22:00)
- 承诺书检查 (23:00)

### 4. 报告生成
- 月度完成情况报告
- 目标偏差分析报告
- 心态趋势图
- 连续打卡统计

## 🔄 自动化流程

系统已配置以下自动化任务流：

| 流程名称 | 触发条件 | 执行动作 |
|---------|---------|---------|
| 月度目标启动 | 每月1日 00:00 | 从年度目标生成当月月度目标 |
| 周目标生成 | 每周一 08:00 | 从月度目标提取未完成项，填入周目标表 |
| 日目标提醒 | 每日 08:30 | 推送今日待办（从周目标表提取） |
| 日复盘提醒 | 每日 21:00 | 检查当日完成情况，推送未完成事项 |
| 心态预警 | 每日 22:00 | 若当日心态合计分<60，推送改进建议 |
| 周总结生成 | 每周日 20:00 | 汇总本周完成情况，自动填写周总结 |
| 月度复盘 | 每月最后一天 20:00 | 汇总本月数据，生成月度报告 |
| 承诺书打卡 | 每日 23:00 | 检查承诺人是否完成当日填写 |

## 📝 使用指令示例

### 年度目标操作
```bash
# 设置年度目标
node cli/action-log-cli.js

# 或通过API
curl -X POST http://localhost:4001/api/action-log/annual-goals \
  -H "Content-Type: application/json" \
  -d '{"category":"财务指标","content":"净利润500万","methods":"控制成本、提升高毛利产品占比","timeRange":"1-12月"}'
```

### 创建日目标
```bash
# 通过CLI交互创建
node cli/action-log-cli.js

# 或使用脚本
npm run create-daily
```

### 生成月度报告
```bash
npm run generate-report 3月
```

## 🛠️ API接口

### 年度目标
- `POST /api/action-log/annual-goals` - 设置年度目标
- `GET /api/action-log/annual-goals/progress` - 获取进度

### 月度目标
- `POST /api/action-log/monthly-goals/generate` - 生成月度目标
- `GET /api/action-log/monthly-goals/:month/completion` - 获取完成情况

### 日目标
- `POST /api/action-log/daily-goals` - 创建日目标
- `GET /api/action-log/daily-goals/mindset-trend/:month` - 获取心态趋势

### 提醒服务
- `GET /api/action-log/reminders/daily` - 获取每日提醒
- `GET /api/action-log/reminders/evening` - 获取晚间复盘

### 承诺书
- `POST /api/action-log/commitments` - 创建承诺书
- `PUT /api/action-log/commitments/checkin/:date` - 打卡
- `GET /api/action-log/commitments/:person/status` - 查看状态

## 🔌 集成到WorkBuddy

### 1. 配置自动化任务流
运行自动化配置脚本：
```bash
node automation/setup-automations.js
```

### 2. 在WorkBuddy中使用
直接在WorkBuddy对话框中输入自然语言指令：

```
"帮我创建今日日目标。A1事项：拜访3个大客户，时间14:00-17:00；A2事项：完成月度报表，时间10:00-11:30；今日学习：《高效能人士的七个习惯》第3章；心态评分：认真10分、乐观10分、坚守承诺8分"
```

### 3. 查看详细指令手册
```bash
cat docs/commands.md
```

## 📈 数据可视化

系统支持以下数据可视化：
- 年度目标完成进度图表
- 月度达成趋势图
- 心态评分折线图
- 连续打卡统计图
- 目标偏差分析图

## 🚀 部署与维护

### 生产环境部署
1. 配置环境变量
2. 设置数据备份
3. 配置Webhook通知
4. 设置日志轮转

### 数据备份
```bash
# 备份数据目录
tar -czf action-log-backup-$(date +%Y%m%d).tar.gz data/
```

### 监控与日志
- 查看API日志: `tail -f logs/api.log`
- 查看通知日志: `tail -f logs/notifications.log`
- 监控系统状态: http://localhost:4001/health

## 📚 学习与扩展

### 自定义模板
编辑 `templates/` 目录下的模板文件，调整字段和结构。

### 添加新功能
1. 在 `services/ActionLogService.js` 中添加新方法
2. 在 `api/ActionLogAPI.js` 中添加API接口
3. 在 `cli/action-log-cli.js` 中添加交互选项

### 集成其他系统
- 企业微信通知
- 邮件提醒
- 数据库存储
- 移动端应用

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 创建 Pull Request

## 📄 许可证

MIT License

## 📞 支持与反馈

如有问题或建议，请：
1. 查看详细文档: `docs/commands.md`
2. 检查系统状态: http://localhost:4001/system/status
3. 查看日志文件: `logs/` 目录

---

**开始你的高效行动之旅吧！** 🚀