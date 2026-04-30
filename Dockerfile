FROM node:18-alpine

WORKDIR /app

# 复制源代码（排除数据库文件，使用持久化存储）
COPY database-server/package.json ./

# 安装依赖
RUN npm install --production --omit=dev

# 复制源代码
COPY database-server/ ./

# 删除可能被复制的数据库文件（使用持久化存储中的数据）
RUN rm -f /app/data/jinglaimei.db /app/data/jinglaimei.db-shm /app/data/jinglaimei.db-wal

# 创建数据目录并设置权限（关键！）
RUN mkdir -p /app/data/uploads/ebooks && chmod -R 777 /app/data

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=80

# 暴露端口
EXPOSE 80

# 启动命令
CMD ["node", "src/app.js"]
