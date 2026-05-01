#!/bin/bash
echo "=== 静莱美代理商后台管理系统启动脚本 ==="
echo "时间: $(date)"
echo ""

# 切换到项目目录
cd "/Users/apple/WorkBuddy/20260324191412/admin-backend"

# 检查node_modules是否存在
if [ ! -d "node_modules" ]; then
    echo "❌ node_modules目录不存在，正在安装依赖..."
    /Users/apple/.workbuddy/binaries/node/versions/20.18.0/bin/npm install
else
    echo "✅ node_modules目录存在"
fi

# 设置环境变量
export NODE_PATH="/Users/apple/.workbuddy/binaries/node/workspace/node_modules"
export NODE_OPTIONS="--max-old-space-size=4096"

# 停止现有进程
echo "检查并停止现有React服务器..."
pkill -f "react-scripts start" 2>/dev/null || true
pkill -f "node.*start.js" 2>/dev/null || true
sleep 2

# 检查端口占用
PORT=3000
if lsof -ti:${PORT} >/dev/null 2>&1; then
    echo "端口 ${PORT} 被占用，正在清理..."
    lsof -ti:${PORT} | xargs kill -9 2>/dev/null
    sleep 2
fi

echo "使用Node 20.18.0启动React开发服务器..."
echo "服务器地址: http://localhost:3000"
echo "按 Ctrl+C 停止服务器"
echo ""

# 启动React开发服务器
/Users/apple/.workbuddy/binaries/node/versions/20.18.0/bin/node node_modules/.bin/react-scripts start