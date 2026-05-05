FROM node:18-slim

WORKDIR /app

RUN apt-get update && apt-get install -y python3 make g++ ca-certificates --no-install-recommends && rm -rf /var/lib/apt/lists/*

# 复制后端代码
COPY database-server/package.json ./
RUN npm install --production

COPY database-server/src/ ./src/

RUN mkdir -p /app/data/uploads && chmod -R 777 /app/data

# Admin 前端：本地预构建后 COPY 产物（容器内构建不稳定）
COPY admin-backend/build /app/admin-backend/build

ENV NODE_ENV=production
ENV PORT=80
ENV JWT_SECRET=jinglaimei_secret_2026
ENV WX_APPID=wx9ac76bfc2dad7364
ENV WX_APP_SECRET=2e719267b5986241a7af8162a9d1e6a7
ENV HUNYUAN_API_KEY=sk-sNLnuLeFuInalb5MdMHL8Iwvi6x1hJxlVTwR9i5BeKcTnFmV
ENV DASHSCOPE_API_KEY=sk-7dd97fec3aef4c62a866e7294e167646
ENV COS_BUCKET=7072-prod-6g3ecawx14ba12f2-1422673068
ENV COS_REGION=ap-shanghai
ENV NODE_TLS_REJECT_UNAUTHORIZED=0

# MySQL 数据库连接配置
ENV DB_HOST=10.36.110.7
ENV DB_PORT=3306
ENV DB_USER=root
ENV DB_PASSWORD=Long0329
ENV DB_NAME=jinglaimei
EXPOSE 80

CMD ["node", "src/app.js"]
