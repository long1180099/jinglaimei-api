#!/bin/bash
echo "正在启动React开发服务器..."
cd "/Users/apple/WorkBuddy/20260324191412/admin-backend"

# 设置环境变量
export NODE_PATH="/Users/apple/.workbuddy/binaries/node/workspace/node_modules"
export NODE_OPTIONS="--max-old-space-size=4096"

# 停止现有进程
pkill -f "react-scripts start" 2>/dev/null
pkill -f "node.*start.js" 2>/dev/null
sleep 2

# 检查端口占用
PORT=3000
if lsof -ti:${PORT} >/dev/null 2>&1; then
    echo "端口 ${PORT} 被占用，正在清理..."
    lsof -ti:${PORT} | xargs kill -9 2>/dev/null
    sleep 1
fi

# 启动服务器
echo "使用Node 20.18.0启动服务器..."
/Users/apple/.workbuddy/binaries/node/versions/20.18.0/bin/node node_modules/.bin/react-scripts start