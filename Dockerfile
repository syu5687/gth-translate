# gth-translate/Dockerfile.s
FROM node:20-alpine

WORKDIR /app

# 依存のみコピー→インストール
COPY package*.json ./
RUN npm ci --omit=dev

# サーバ本体をコピー
COPY server.js ./

# Cloud Run の待受ポート
ENV PORT=8080
EXPOSE 8080

CMD ["node", "server.js"]