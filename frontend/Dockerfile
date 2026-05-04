# 构建阶段
FROM node:22-alpine AS builder
WORKDIR /app
ARG VITE_DASHBOARD_DATA_MODE=auto
ENV VITE_DASHBOARD_DATA_MODE=$VITE_DASHBOARD_DATA_MODE
COPY package*.json .
RUN npm ci
COPY . .
RUN npm run build:docker

# 运行阶段，用 Nginx 托管静态文件
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
