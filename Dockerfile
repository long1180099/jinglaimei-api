FROM node:18-alpine

WORKDIR /app

# 复制package文件
COPY database-server/package.json ./

# 安装依赖
RUN npm install --production --registry=https://registry.npmmirror.com

# 复制源代码
COPY database-server/ ./

# 创建数据目录
RUN mkdir -p /app/data/uploads/ebooks

# 暴露端口（微信云托管要求80）
EXPOSE 80

# 启动命令（微信云托管会自动设置PORT环境变量为80）
CMD ["node", "src/app.js"]
