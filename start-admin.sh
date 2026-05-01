#!/bin/bash
# 静莱美管理后台启动脚本（SPA模式）

PROJECT="/Users/apple/WorkBuddy/20260324191412/admin-backend"
PORT=8081

echo "正在启动管理后台..."

# 杀掉旧进程
kill $(lsof -ti:$PORT) 2>/dev/null
sleep 1

# 启动（-s SPA模式，所有路由回退到index.html）
cd "$PROJECT"
export PATH="/Users/apple/.workbuddy/binaries/node/versions/20.18.0/bin:$PATH"
npx serve -s build -l $PORT > /tmp/admin-backend.log 2>&1 &
PID=$!

sleep 4

if curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT/dashboard | grep -q "200"; then
    echo "✅ 管理后台启动成功！"
    echo "🌐 访问地址: http://localhost:$PORT"
    echo "👤 账号: admin  密码: admin123456"
else
    echo "❌ 启动失败，查看日志："
    tail -15 /tmp/admin-backend.log
fi
