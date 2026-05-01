FROM node:18-alpine

WORKDIR /app

# 全局安装 serve
RUN npm install -g serve

# 复制静态文件
COPY . .

# 暴露端口
EXPOSE 80

# 启动 serve 以静态模式运行
CMD ["serve", "-s", ".", "-l", "80"]
