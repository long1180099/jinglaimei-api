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

# 复制种子数据库（数据库为空时自动初始化）
RUN if [ -f /app/jinglaimei.db.migrate ]; then cp /app/jinglaimei.db.migrate /app/data/jinglaimei.db.preseed; fi

# 创建数据目录并设置权限（关键！）
RUN mkdir -p /app/data/uploads/ebooks && chmod -R 777 /app/data

# 设置环境变量（注意：敏感信息后续应迁移到云托管控制台的环境变量配置）
ENV NODE_ENV=production
ENV PORT=80
ENV JWT_SECRET=jinglaimei_secret_2026
ENV WX_APPID=wx9ac76bfc2dad7364
ENV WX_APP_SECRET=2e719267b5986241a7af8162a9d1e6a7
ENV HUNYUAN_API_KEY=sk-sNLnuLeFuInalb5MdMHL8Iwvi6x1hJxlVTwR9i5BeKcTnFmV
ENV DASHSCOPE_API_KEY=sk-7dd97fec3aef4c62a866e7294e167646

# 复制管理后台前端构建产物
COPY admin-backend/build /app/admin-backend/build

# 暴露端口
EXPOSE 80

# 启动命令
CMD ["node", "src/app.js"]
