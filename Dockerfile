FROM node:18-slim

WORKDIR /app

RUN apt-get update && apt-get install -y python3 make g++ --no-install-recommends && rm -rf /var/lib/apt/lists/*

# 复制后端代码
COPY database-server/package.json ./
RUN npm install --production

COPY database-server/src/ ./src/

RUN mkdir -p /app/data/uploads && chmod -R 777 /app/data

COPY database-server/jinglaimei.db.migrate /app/data/jinglaimei.db.preseed
RUN chmod 666 /app/data/jinglaimei.db.preseed

# 复制 Admin 前端构建产物（app.js 通过 admin.jinglaimei.com 域名识别返回前端页面）
COPY admin-backend/build /app/admin-backend/build

ENV NODE_ENV=production
ENV PORT=80
EXPOSE 80

CMD ["node", "src/app.js"]
