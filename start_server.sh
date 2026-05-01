#!/bin/bash

# 停止现有的React服务器
echo "停止现有的React服务器..."
pkill -f "react-scripts"

# 等待进程完全停止
sleep 2

# 进入项目目录
cd /Users/apple/WorkBuddy/20260324191412/admin-backend

# 启动React开发服务器
echo "启动React开发服务器..."
NODE_PATH=/Users/apple/.workbuddy/binaries/node/workspace/node_modules \
/Users/apple/.workbuddy/binaries/node/versions/20.18.0/bin/node \
node_modules/.bin/react-scripts start &

# 显示启动状态
echo "等待服务器启动..."
sleep 5

# 检查服务器是否运行
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ React服务器已成功启动！"
    echo "访问地址：http://localhost:3000"
else
    echo "❌ 服务器启动失败，请检查错误日志"
fi