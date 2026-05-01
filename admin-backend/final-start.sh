#!/bin/bash

echo "🎯 静莱美代理商后台管理系统启动中..."
echo "========================================"
echo "📦 使用Node.js版本: $(/Users/apple/.workbuddy/binaries/node/versions/20.18.0/bin/node --version)"
echo ""

# 设置环境
export PATH="/Users/apple/.workbuddy/binaries/node/versions/20.18.0/bin:$PATH"
export BROWSER=none

# 检查端口
if lsof -ti:3000 &> /dev/null; then
    echo "⚠️  端口3000已被占用，正在清理..."
    lsof -ti:3000 | xargs kill -9
    sleep 1
fi

# 启动React开发服务器
echo "🚀 启动开发服务器..."
echo ""
echo "========================================"
echo "🌐 访问地址: http://localhost:3000"
echo "🔐 登录页面: http://localhost:3000/login"
echo "📝 测试账户: 任意用户名(3+字符) + 任意密码(6+字符)"
echo "========================================"
echo ""
echo "📢 按 Ctrl+C 停止服务器"
echo ""

# 启动服务
npm start