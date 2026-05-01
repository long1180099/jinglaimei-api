#!/bin/bash

echo "启动静莱美代理商后台管理系统..."
echo "项目目录: $(pwd)"

# 检查node_modules是否存在
if [ ! -d "node_modules" ]; then
  echo "检测到缺少依赖，正在安装..."
  npm install
else
  echo "依赖已存在，跳过安装"
fi

# 启动开发服务器
echo "正在启动开发服务器..."
npm start