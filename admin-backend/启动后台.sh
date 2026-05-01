#!/bin/bash

# 静莱美代理商系统 - 后台启动脚本
# 作者: 静莱美开发团队
# 日期: 2026-03-26

echo "🎯 静莱美代理商后台管理系统启动脚本"
echo "========================================"

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误: 请在 admin-backend 目录中运行此脚本"
    echo "当前目录: $(pwd)"
    exit 1
fi

# 检查Node.js
echo "🔍 检查Node.js版本..."
node_version=$(node --version 2>/dev/null || echo "未安装")
npm_version=$(npm --version 2>/dev/null || echo "未安装")

echo "📦 Node.js: $node_version"
echo "📦 npm: $npm_version"

if [ "$node_version" = "未安装" ] || [ "$npm_version" = "未安装" ]; then
    echo "❌ 请先安装 Node.js 和 npm"
    echo "   下载地址: https://nodejs.org/"
    exit 1
fi

# 检查依赖
echo "📦 检查依赖安装状态..."
if [ ! -d "node_modules" ]; then
    echo "⚠️  检测到未安装依赖，正在安装..."
    npm install
    
    if [ $? -ne 0 ]; then
        echo "❌ 依赖安装失败，请检查网络连接"
        exit 1
    fi
    
    echo "✅ 依赖安装完成"
else
    echo "✅ 依赖已安装"
fi

# 启动开发服务器
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
npm start