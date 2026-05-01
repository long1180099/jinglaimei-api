#!/bin/bash

# 静莱美后台管理系统 - 简化启动脚本

echo "🚀 启动静莱美后台管理系统..."

# 设置Node.js路径
NODE_PATH="/Users/apple/.workbuddy/binaries/node/workspace/node_modules"
NODE_BIN="/Users/apple/.workbuddy/binaries/node/versions/22.12.0/bin/node"
NPM_BIN="/Users/apple/.workbuddy/binaries/node/versions/22.12.0/bin/npm"

echo "📦 使用Node.js版本: $($NODE_BIN --version)"

# 检查并安装依赖
if [ ! -d "node_modules" ]; then
    echo "📦 正在安装依赖..."
    
    # 设置npm缓存路径
    export npm_config_cache="/Users/apple/.workbuddy/binaries/node/.npm-cache"
    export npm_config_prefix="/Users/apple/.workbuddy/binaries/node/workspace"
    
    # 安装依赖
    $NPM_BIN install
    if [ $? -ne 0 ]; then
        echo "❌ 依赖安装失败"
        exit 1
    fi
    echo "✅ 依赖安装完成"
else
    echo "✅ 依赖已存在"
fi

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

# 启动React开发服务器
NODE_PATH=$NODE_PATH $NODE_BIN ./node_modules/.bin/react-scripts start