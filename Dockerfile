FROM node:18-alpine

WORKDIR /app

# 复制package文件
COPY database-server/package.json ./

# 安装依赖
RUN npm install --production

# 复制源代码
COPY database-server/ ./

# 暴露端口（微信云托管要求80）
EXPOSE 80

# 启动命令
CMD ["node", "src/app.js"]
