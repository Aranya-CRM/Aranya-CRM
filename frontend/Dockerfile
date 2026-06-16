# 构建阶段
FROM node:22-alpine AS builder
WORKDIR /app
ARG VITE_DASHBOARD_DATA_MODE=auto
ARG VITE_DATA_MODE=api
ENV VITE_DASHBOARD_DATA_MODE=$VITE_DASHBOARD_DATA_MODE
ENV VITE_DATA_MODE=$VITE_DATA_MODE
# Firebase Web 配置（属于公开值，会随前端 JS 一起暴露）。
# 云端构建（Cloud Build / GitHub 持续部署）通过构建参数注入；
# 本地构建留空则沿用构建上下文里的 .env。
ARG VITE_FIREBASE_API_KEY=
ARG VITE_FIREBASE_AUTH_DOMAIN=
ARG VITE_FIREBASE_PROJECT_ID=
ARG VITE_FIREBASE_APP_ID=
# 后端 API 基址。云端(两个独立 Cloud Run 服务,直连+CORS)传后端 URL;
# 本地留空 → 前端走相对 /api(由 nginx 反代到 docker 内的 backend)。
ARG VITE_API_BASE_URL=
COPY package*.json ./
RUN npm ci
COPY . .
# 仅当传入了构建参数时才写 .env（云端场景）；本地构建参数为空则跳过，保留 COPY 进来的 .env。
# 关键：build 前 unset 这些变量，避免空的 ARG 作为 process.env 覆盖掉 .env 里的真值
# （Vite 优先级：已存在的环境变量 > .env 文件）。这样 .env 始终是唯一来源。
RUN if [ -n "$VITE_FIREBASE_API_KEY" ]; then \
      { echo "VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY"; \
        echo "VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN"; \
        echo "VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID"; \
        echo "VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID"; } > .env; \
    fi; \
    if [ -n "$VITE_API_BASE_URL" ]; then echo "VITE_API_BASE_URL=$VITE_API_BASE_URL" >> .env; fi; \
    unset VITE_FIREBASE_API_KEY VITE_FIREBASE_AUTH_DOMAIN VITE_FIREBASE_PROJECT_ID VITE_FIREBASE_APP_ID VITE_API_BASE_URL; \
    npm run build:docker

# 运行阶段，用 Nginx 托管静态文件
FROM nginx:alpine
# Cloud Run 会注入 PORT（默认 8080）；BACKEND_URL 为 /api 的反向代理目标
ENV PORT=8080
# 安全默认值：未配置后端时 /api 返回 502 而不会让容器启动失败
# 部署时通过环境变量 BACKEND_URL 覆盖为真实后端地址
ENV BACKEND_URL=http://127.0.0.1:9
# 只替换这两个变量，避免误替换 nginx 自带的 $host/$uri 等
ENV NGINX_ENVSUBST_FILTER="PORT|BACKEND_URL"
COPY --from=builder /app/dist /usr/share/nginx/html
# 模板会在容器启动时由 nginx 入口脚本自动 envsubst 生成 default.conf
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 8080
