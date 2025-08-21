FROM php:8.1-apache

ENV PORT=8080
EXPOSE 8080

# Cloud Run用Apache設定
RUN sed -i "s/Listen 80/Listen ${PORT}/" /etc/apache2/ports.conf \
 && echo "ServerName localhost" >> /etc/apache2/apache2.conf

# .htaccess対応とmod_rewrite
RUN a2enmod rewrite \
 && sed -i "s/AllowOverride None/AllowOverride All/" /etc/apache2/apache2.conf

# /var/www/html にアクセス許可
RUN printf '%s\n' \
  '<Directory /var/www/html>' \
  '    Options Indexes FollowSymLinks' \
  '    AllowOverride All' \
  '    Require all granted' \
  '</Directory>' >> /etc/apache2/apache2.conf

# ファイル配置
COPY . /var/www/html

# パーミッション
RUN chown -R www-data:www-data /var/www/html \
 && chmod -R 755 /var/www/html
 
 
# Node 公式ランタイム（小さめ）
 FROM node:20-slim
 
 # 必要ツール（fetch/ssl等は標準でOK）
 WORKDIR /app
 
 # 依存
 COPY package.json package-lock.json* ./
 RUN npm ci --omit=dev
 
 # ソース
 COPY tsconfig.json ./
 COPY server.ts ./
 
 # ビルドして本番用に差し替え
 RUN npm run build && \
	 npm prune --omit=dev
 
 # Cloud Run が渡す $PORT を使う
 ENV PORT=8080
 EXPOSE 8080
 
 CMD ["node", "dist/server.js"]