#!/bin/bash

# 静莱美后台管理系统快速启动脚本

echo "🎯 静莱美代理商后台管理系统启动中..."

# 设置环境变量
export PATH="/Users/apple/.workbuddy/binaries/node/versions/22.12.0/bin:$PATH"
export NODE_OPTIONS="--openssl-legacy-provider"
export SKIP_PREFLIGHT_CHECK="true"

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "📦 正在安装依赖..."
    npm install --legacy-peer-deps
    if [ $? -ne 0 ]; then
        echo "❌ 依赖安装失败，请检查错误信息"
        exit 1
    fi
    echo "✅ 依赖安装完成"
else
    echo "✅ 依赖已安装"
fi

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