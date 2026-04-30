FROM node:18-slim

WORKDIR /app

RUN apt-get update && apt-get install -y python3 make g++ --no-install-recommends && rm -rf /var/lib/apt/lists/*

COPY package.json ./
RUN npm install --production

COPY src/ ./src/

RUN mkdir -p /app/data/uploads && chmod -R 777 /app/data

COPY jinglaimei.db.migrate /app/data/jinglaimei.db.preseed
RUN chmod 666 /app/data/jinglaimei.db.preseed

ENV NODE_ENV=production
ENV PORT=80
EXPOSE 80

CMD ["node", "src/app.js"]
