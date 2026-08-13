# Aranya CRM VM 部署

## 访问地址

- 临时地址：<https://aranya-dev.34-142-150-221.sslip.io>
- 静态 IP：`34.142.150.221`
- GCP 项目：`aranya-crm-dev`
- 区域/可用区：`asia-southeast1` / `asia-southeast1-b`

该地址使用 `sslip.io` 将域名解析到静态 IP，Caddy 自动申请和续期 HTTPS 证书。正式
域名上线后替换该地址。

前端和后端原 Cloud Run 服务已下线。Cloud SQL、Artifact Registry、Secret Manager
以及 Firebase 邮件扩展继续作为托管服务使用。

## GCP 资源

| 资源 | 名称/配置 |
| --- | --- |
| VM | `aranya-crm-dev-vm` |
| 规格 | `e2-standard-2`，2 vCPU，8 GB RAM |
| 系统盘 | 50 GB balanced persistent disk |
| VPC | `aranya-crm-vpc` |
| Subnet | `aranya-crm-dev-subnet` (`10.20.0.0/24`) |
| VM 服务账号 | `aranya-crm-vm@aranya-crm-dev.iam.gserviceaccount.com` |
| 数据库 | Cloud SQL `aranya-crm-dev-db`（PostgreSQL 15） |
| 镜像仓库 | Artifact Registry `aranya-crm` |

VM 开启删除保护。公网只开放 TCP 80/443；SSH 仅允许通过 IAP，PostgreSQL 和后端端口
不对公网开放。

## 请求流程

```text
Browser
  -> HTTPS :443
  -> Caddy（TLS、HTTP -> HTTPS、反向代理）
  -> Frontend Nginx（静态文件、/api 代理）
  -> Spring Boot Backend :8080
  -> Cloud SQL Auth Proxy :5432
  -> Cloud SQL PostgreSQL
```

## VM 内部结构

服务由 `/opt/aranya/compose.yaml` 管理，运行在同一个 Docker bridge network：

| 容器 | 职责 | 公网端口 |
| --- | --- | --- |
| `caddy` | HTTPS、证书和公网入口 | 80、443 |
| `frontend` | Nginx 托管前端并代理 `/api` | 无 |
| `backend` | Spring Boot API、定时任务和 Gmail/Calendar 集成 | 无 |
| `cloud-sql-proxy` | 使用 VM 服务账号安全连接 Cloud SQL | 无 |

密钥在每次部署和开机时从 Secret Manager 获取，写入 VM 上权限为 `0600` 的运行文件，
不会进入镜像或 Git。主要密钥包括：

- `firebase-sa-dev`
- `db-pass-dev`
- `jwt-secret-dev`
- `gcal-oauth-client-secret`
- `gcal-oauth-refresh-token`

## CI/CD

推送到 `develop` 后，GitHub Actions 按以下顺序执行：

```text
Secret scan + Frontend CI + Backend CI
  -> GitHub OIDC / Workload Identity Federation
  -> 构建 backend 和 frontend 镜像
  -> 推送 Artifact Registry
  -> 通过 IAP + OS Login 连接 VM
  -> /usr/local/sbin/aranya-deploy
  -> 数据库、后端和前端健康检查
```

部署身份仅接受 `Aranya-CRM/Aranya-CRM` 仓库 `develop` 分支的 OIDC token，不使用
服务账号 JSON key。部署失败时，VM 会恢复上一组镜像。

GitHub Actions 使用以下仓库 Variables：

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_GOOGLE_OAUTH_CLIENT_ID`（可选）

## 常用运维命令

连接 VM：

```powershell
gcloud compute ssh aranya-crm-dev-vm `
  --project=aranya-crm-dev `
  --zone=asia-southeast1-b `
  --tunnel-through-iap
```

查看状态和日志：

```bash
sudo docker compose --env-file /opt/aranya/images.env -f /opt/aranya/compose.yaml ps
sudo docker compose --env-file /opt/aranya/images.env -f /opt/aranya/compose.yaml logs -f backend
sudo journalctl -u aranya-deploy.service
```

重新部署当前镜像并刷新 Secret：

```bash
sudo systemctl restart aranya-deploy.service
```

部署指定镜像：

```bash
sudo /usr/local/sbin/aranya-deploy \
  asia-southeast1-docker.pkg.dev/aranya-crm-dev/aranya-crm/backend:<tag> \
  asia-southeast1-docker.pkg.dev/aranya-crm-dev/aranya-crm/frontend:<tag>
```

## 更换正式域名

1. 将正式域名的 DNS A 记录指向 `34.142.150.221`。
2. 修改 `/opt/aranya/Caddyfile` 中的站点域名并 reload Caddy。
3. 修改后端 `APP_CORS_ALLOWED_ORIGINS`。
4. 将正式域名加入 Firebase Authentication Authorized domains。
5. 验证 HTTPS、登录、API、文件和 Calendar 功能后移除临时域名。

## 邮件服务

Event 逾期提醒由 VM 后端通过 Gmail API 发送。Firebase Trigger Email Extension 仍由
Cloud Functions/Eventarc 托管，用于监听 Firestore `mail` 集合；两条邮件链路相互独立。

## 限制

当前只有一台 VM。容器异常会自动重启，VM 重启后也会自动恢复服务，但 VM 或可用区
故障仍会造成中断。需要更高可用性时，应使用多 VM、Managed Instance Group 和负载均衡。
