#!/bin/bash

# 静莱美代理商系统 - 一键启动脚本
# 启动: 数据库服务(4000) + 行动日志(4001) + React前端(3000)

export PATH="/Users/apple/.workbuddy/binaries/node/versions/20.18.0/bin:$PATH"
PROJECT_DIR="/Users/apple/WorkBuddy/20260324191412"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║     静莱美代理商系统 - 一键启动               ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# 清理旧进程
echo "🔄 清理旧进程..."
pkill -f "node.*database-server" 2>/dev/null
pkill -f "node.*action-log-system" 2>/dev/null
kill -9 $(lsof -ti:4000) 2>/dev/null
kill -9 $(lsof -ti:4001) 2>/dev/null
sleep 1

# 启动数据库服务 (端口4000)
echo "🗄️  启动数据库服务 (端口4000)..."
cd "$PROJECT_DIR/database-server"
nohup node src/app.js > /tmp/db-server.log 2>&1 &
sleep 2

# 检查数据库服务
DB_STATUS=$(curl -s http://localhost:4000/health 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print('✅ 健康' if d.get('status')=='healthy' else '❌ 异常')" 2>/dev/null || echo "❌ 无法连接")
echo "   数据库服务状态: $DB_STATUS"

# 启动行动日志服务 (端口4001)
echo "📋 启动行动日志服务 (端口4001)..."
cd "$PROJECT_DIR/action-log-system"
nohup node api/server.js > /tmp/action-log.log 2>&1 &
sleep 2

AL_STATUS=$(curl -s http://localhost:4001/ 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print('✅ 运行中')" 2>/dev/null || echo "❌ 无法连接")
echo "   行动日志状态: $AL_STATUS"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  ✅ 后台服务启动完成！                        ║"
echo "╠══════════════════════════════════════════════╣"
echo "║  🗄️  数据库服务: http://localhost:4000        ║"
echo "║  📋 行动日志:   http://localhost:4001         ║"
echo "╠══════════════════════════════════════════════╣"
echo "║  启动前端请另开终端执行:                      ║"
echo "║  cd admin-backend && BROWSER=none npm start  ║"
echo "╠══════════════════════════════════════════════╣"
echo "║  管理员账号: admin / admin123456              ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
