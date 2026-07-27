# Event 逾期自定义邮件：Gmail API 实现与部署记录

## 1. 最终目标

当 Event 已超过报告截止时间且仍未提交 Report 时：

1. 为 Event 的每位有效参与者创建一条站内提醒。
2. 从 `Aranya CRM <infotech@aranya.sg>` 向参与者邮箱发送一封逾期提醒。
3. 同一 Event、同一参与者只发送一次，不因定时扫描而重复发送。
4. Report 提交、参与者被移除或 Event 取消后，相关站内提醒自动结束。

Event 参与者来自 `service_event_assignment` 中状态为 `ACTIVE` 的记录，因此
Social Worker、Volunteer 或 Manager 只要是该 Event 的有效参与者，都会进入提醒流程。

## 2. 为什么邀请邮件可以使用 Firebase，逾期邮件不能直接照搬

现有邀请流程调用 Firebase Authentication 的内置认证邮件：

```ts
sendPasswordResetEmail(firebaseAuth, email)
```

这是 Firebase 专门提供的密码重置/账号认证邮件，并不是通用邮件发送服务。Firebase
Authentication 可以使用 Firebase 默认发件人发送这类固定用途的认证邮件。

Event 逾期提醒属于自定义业务邮件，主题、正文、收件人和发送时机均由 CRM 决定。
Firebase Authentication 没有“发送任意业务邮件”的接口。

原本考虑的 Firebase 方案是：

```text
CRM -> Firestore -> Trigger Email Extension -> SMTP 服务商
```

Trigger Email Extension 最终仍然需要 SMTP。由于本项目 SMTP 配置持续失败，最终改成：

```text
CRM -> Gmail API -> infotech@aranya.sg -> Event 参与者
```

Firestore、Trigger Email Extension 和 SMTP 不再参与 Event 逾期邮件流程。

## 3. 整体架构

```text
Spring @Scheduled（默认每 10 分钟）
        |
        v
查询已逾期且没有 SUBMITTED Report 的 Event
        |
        v
读取所有 ACTIVE Event 参与者
        |
        v
PostgreSQL: event_overdue_notification
  - 唯一键：(event_id, recipient_user_id)
  - 邮件状态：PENDING / SENDING / SENT / FAILED
  - 发送次数与错误信息
        |
        +----------------------+
        |                      |
        v                      v
站内通知 API/通知铃铛       Gmail API users.messages.send
                               |
                               v
                    Aranya CRM <infotech@aranya.sg>
                               |
                               v
                         Event 参与者邮箱
```

## 4. Event 逾期判定

已完成 Event 的判断：

```text
存在 visit_report.status = SUBMITTED
```

逾期截止时间按以下顺序确定：

1. 优先使用 `service_appointment.report_due_at`。
2. 未设置时使用 `scheduled_end + EVENT_REPORT_GRACE_HOURS`。
3. 没有结束时间时使用 `scheduled_start + EVENT_REPORT_GRACE_HOURS`。

代码和部署模板的默认宽限时间现已改为：

```text
EVENT_REPORT_GRACE_HOURS=0
```

即 Event 到达截止时间后立即成为逾期候选。实际发送仍取决于下一次定时扫描，因此默认
最多约等待 10 分钟。

> 注意：最后一次 Cloud Run 后端部署时显式设置的是
> `EVENT_REPORT_GRACE_HOURS=24`。源代码和部署模板已改为 `0`，但云端环境变量会覆盖
> 代码默认值。下次部署时必须把 Cloud Run 的该变量同步为 `0`，才能实现云端“逾期即发”。

## 5. 数据库与防重复设计

Liquibase 迁移：

```text
backend/src/main/resources/db/changelog/changes/
073-create-event-overdue-notification.yaml
```

新增表 `event_overdue_notification`，主要字段：

| 字段 | 用途 |
| --- | --- |
| `event_id` | Event ID |
| `recipient_user_id` | 收件参与者 |
| `deadline` | 本次逾期判定使用的截止时间 |
| `read_at` | 站内提醒已读时间 |
| `resolved_at` | 提醒已结束时间 |
| `email_status` | `PENDING`、`SENDING`、`SENT` 或 `FAILED` |
| `email_attempts` | Gmail API 调用次数 |
| `email_document_id` | Gmail 返回的 Message ID |
| `email_error` | 最近一次失败原因 |
| `last_email_attempt_at` | 最近一次邮件尝试时间 |

唯一约束：

```text
(event_id, recipient_user_id)
```

因此定时器即使每分钟或每 10 分钟执行，也不能为同一 Event、同一参与者插入第二条
提醒。

发送队列使用 PostgreSQL：

```sql
FOR UPDATE SKIP LOCKED
```

这可以避免多个 Cloud Run 实例同时获取同一批待发送记录。

正常运行下，成功记录会变为：

```text
email_status = SENT
email_attempts = 1
email_document_id = Gmail Message ID
```

失败记录会变成 `FAILED`，后续扫描最多重试
`EVENT_REMINDER_MAX_EMAIL_ATTEMPTS` 次，默认 3 次。

## 6. Gmail API 邮件实现

主要文件：

| 文件 | 职责 |
| --- | --- |
| `GoogleGmailProperties.java` | Gmail 配置属性 |
| `GoogleGmailConfig.java` | 使用 OAuth refresh token 创建 Gmail API 客户端 |
| `GmailEmailGateway.java` | 构造 MIME 邮件并调用 Gmail API |
| `EventOverdueNotificationService.java` | 扫描、建提醒、发邮件、重试和结束提醒 |
| `EventOverdueNotificationScheduler.java` | 定时触发扫描 |

邮件调用：

```text
Gmail API: users.messages.send("me", message)
```

发送步骤：

1. 生成 UTF-8 的 RFC 2822 MIME 邮件。
2. 同时提供纯文本和 HTML 正文。
3. 将 MIME 内容做 Base64 URL-safe 编码。
4. 调用 Gmail API `users.messages.send`。
5. 将 Gmail 返回的 Message ID 保存到 PostgreSQL。

邮件头还包含：

```text
Auto-Submitted: auto-generated
X-Auto-Response-Suppress: All
```

用于减少自动回复和邮件循环。

发件人：

```text
Aranya CRM <infotech@aranya.sg>
```

收件人是 Event 参与者在 `users.email` 中登记的地址。`infotech@aranya.sg` 只是系统
发件账号，并不是所有逾期邮件的收件人。

## 7. OAuth 授权

项目复用了现有 Google Calendar OAuth 客户端：

```text
名称：Share Calendar
客户端 ID：
746649380908-esbcfbu0egckeuucfng3n0tococv5s4b.apps.googleusercontent.com
```

为本地授权回调添加了：

```text
http://127.0.0.1:53682/oauth2/callback
```

最终一次性授权的 scope：

```text
openid
email
https://www.googleapis.com/auth/calendar
https://www.googleapis.com/auth/gmail.send
```

- `calendar`：保留现有日历集成功能。
- `gmail.send`：只允许发邮件，不授予读取邮箱内容的权限。
- `openid`、`email`：授权脚本用于确认授权账号确实是
  `infotech@aranya.sg`。

授权账号：

```text
infotech@aranya.sg
```

系统不保存该邮箱的密码。OAuth client secret 和 refresh token 存储在 Google Secret
Manager：

```text
gcal-oauth-client-secret
gcal-oauth-refresh-token
```

新的 refresh token 同时包含 Calendar 和 Gmail Send 权限，因此 Calendar 与 Gmail
共用同一套 OAuth client/token。

本地授权脚本：

```text
scripts/google/authorize-gmail.mjs
```

脚本完成以下工作：

1. 从 Secret Manager 读取 OAuth client secret。
2. 在 `127.0.0.1:53682` 启动一次性回调服务器。
3. 打开/输出 Google OAuth 授权链接。
4. 使用授权 code 换取 refresh token。
5. 验证授权邮箱。
6. 将 refresh token 作为新版本写入 Secret Manager。

脚本和日志不会输出 refresh token。

## 8. Cloud Run 端完成的工作

### 8.1 Google Cloud API 与 Secret

- Gmail API 已启用。
- OAuth redirect URI 已登记。
- 合并后的 Calendar + Gmail refresh token 已写入 Secret Manager。
- Cloud Run 继续通过 Secret Manager 引用 OAuth client secret 和 refresh token，
  密钥没有写入镜像或 Git。

### 8.2 后端部署

构建并推送的后端镜像标签：

```text
asia-southeast1-docker.pkg.dev/aranya-crm-dev/aranya-crm/backend:
gmail-overdue-20260724
```

部署到现有服务：

```text
项目：aranya-crm-dev
区域：asia-southeast1
服务：backend-dev
Revision：backend-dev-00017-zw5
```

部署后该 revision 承载 100% 流量。

配置了：

```text
GOOGLE_GMAIL_ENABLED=true
GOOGLE_GMAIL_FROM_ADDRESS=infotech@aranya.sg
GOOGLE_GMAIL_FROM_NAME=Aranya CRM
APP_PUBLIC_BASE_URL=https://aranya-frontend-2bf3zhn3pq-as.a.run.app
EVENT_REPORT_GRACE_HOURS=24
```

其中 `EVENT_REPORT_GRACE_HOURS=24` 是当时部署使用的值；按最新需求，下次部署应改为
`0`。

移除了旧的 Event 邮件环境变量：

```text
FIREBASE_TRIGGER_EMAIL_ENABLED
FIREBASE_TRIGGER_EMAIL_COLLECTION
```

Cloud Run 仍保持：

```text
--min-instances=1
--no-cpu-throttling
```

原因是 Spring `@Scheduled` 必须在没有 HTTP 请求时仍然拥有运行实例和 CPU，才能按时
扫描逾期 Event。这会产生少量 Cloud Run 空闲实例费用。

旧的 Firebase Trigger Email Extension 服务没有被删除，但后端不再向它写邮件任务，
因此它已经与 Event 逾期流程断开。若要卸载该 Extension，应作为单独的、明确授权的
清理操作执行。

### 8.3 数据库迁移

新后端启动时，Cloud Run 自动运行 Liquibase：

```text
073-create-event-overdue-notification
```

日志确认迁移成功，`event_overdue_notification` 表和索引已创建。

### 8.4 后端验证

Cloud Run 验证结果：

```text
/actuator/health -> UP
```

启动日志确认：

```text
Gmail API client initialized for sender infotech@aranya.sg
Started AranyaCrmApplication
```

新 revision 没有启动级 ERROR。

### 8.5 前端部署

通知铃铛和 `/v1/notifications` 前端代码已构建并部署到：

```text
服务：aranya-frontend
Revision：aranya-frontend-00027-xn7
URL：https://aranya-frontend-2bf3zhn3pq-as.a.run.app
```

验证结果：

```text
前端 HTTP = 200
生产 bundle 中包含 /v1/notifications
```

## 9. 站内提醒

后端 API：

```text
GET   /api/v1/notifications
PATCH /api/v1/notifications/{id}/read
PATCH /api/v1/notifications/read-all
```

登录用户可以：

- 在页面右上角看到通知铃铛和未读数量。
- 查看自己的 Event 逾期提醒。
- 点击提醒进入相应 Event/Report 页面。
- 单条标记已读或全部标记已读。

Report 提交后，`ReportService` 会结束该 Event 的未解决逾期提醒。

## 10. 本地端到端验证

### 10.1 Gmail API 直接验证

使用 Secret Manager 中的 OAuth 凭据直接调用 Gmail API，成功从
`infotech@aranya.sg` 向自身发送测试邮件。

测试 Message ID：

```text
19f92c12d40a023a
```

### 10.2 Event 逾期完整流程验证

本地测试使用现有镜像：

```text
docker-backend:latest
Image ID: sha256:ab24acd29342b7c532fd5bbcad083e3262630798ed266198c57a07dd17ffcccb
```

没有构建、拉取或创建新镜像。

为避免影响本地登录：

1. 原登录后端保持在 `8080`，没有重启。
2. 使用同一现有镜像临时启动隔离后端到 `8081`。
3. 仅向临时后端注入 Gmail OAuth 环境变量。
4. 设置 `EVENT_REPORT_GRACE_HOURS=0`。
5. 设置每分钟扫描一次。
6. 测试成功后删除临时容器。

实际验证的 Event：

```text
Event ID：15
负责人/收件人：e1519752@u.nus.edu
```

数据库结果：

```text
email_status = SENT
email_attempts = 1
email_document_id = 19f92ec8f71878e9
```

调度器日志：

```text
created=1, resolved=0, emailsSent=1
```

临时 `8081` 容器随后已删除，原 `8080` 登录后端保持 `UP`，前端保持 HTTP 200。
`SENT` 记录保留在本地数据库，因此该 Event 不会在下一次扫描时重复发送。

## 11. 本地运行时如何注入 OAuth Secret

不要把 secret 写入 `.env`、`application.yml` 或 Git。可以在启动后端的同一个
PowerShell 会话中临时设置：

```powershell
gcloud config set project aranya-crm-dev

$env:GOOGLE_GMAIL_ENABLED = "true"
$env:GOOGLE_GMAIL_OAUTH_CLIENT_ID = "746649380908-esbcfbu0egckeuucfng3n0tococv5s4b.apps.googleusercontent.com"
$env:GOOGLE_GMAIL_OAUTH_CLIENT_SECRET = (
  & gcloud secrets versions access latest `
    --secret=gcal-oauth-client-secret `
    --project=aranya-crm-dev
).Trim()
$env:GOOGLE_GMAIL_OAUTH_REFRESH_TOKEN = (
  & gcloud secrets versions access latest `
    --secret=gcal-oauth-refresh-token `
    --project=aranya-crm-dev
).Trim()
$env:GOOGLE_GMAIL_FROM_ADDRESS = "infotech@aranya.sg"
$env:GOOGLE_GMAIL_FROM_NAME = "Aranya CRM"
$env:EVENT_REPORT_GRACE_HOURS = "0"
```

这些变量只在当前 PowerShell 进程及其子进程中有效，关闭终端后消失。

## 12. Push 和再次部署前检查

当前功能代码是从本地未提交工作区部署的。正式 push 前应确认：

1. `git diff --check` 通过。
2. 后端编译成功。
3. 前端 `npm run build` 成功。
4. 不包含 OAuth client secret、refresh token 或邮箱密码。
5. `EVENT_REPORT_GRACE_HOURS` 的代码、Cloud Build 和 Cloud Run 值均为 `0`。
6. Cloud Run Secret 映射仍指向：
   - `gcal-oauth-client-secret:latest`
   - `gcal-oauth-refresh-token:latest`
7. 部署后检查：
   - `/actuator/health`
   - Gmail 客户端初始化日志
   - Liquibase 状态
   - Cloud Run ERROR 日志
   - 前端通知 API 是否存在

建议部署后执行：

```powershell
gcloud run services update backend-dev `
  --project=aranya-crm-dev `
  --region=asia-southeast1 `
  --update-env-vars EVENT_REPORT_GRACE_HOURS=0
```

或者使用已更新为默认 `0` 的 Cloud Build 后端部署配置重新部署。

## 13. 安全与运维注意事项

- 不共享或提交 `infotech@aranya.sg` 密码。
- 不把 OAuth client secret 或 refresh token 写进仓库。
- Gmail OAuth scope 只申请 `gmail.send`，不读取邮箱。
- refresh token 应只存在于 Secret Manager。
- Cloud Run 最小实例会产生空闲费用。
- Gmail API 有账号/Workspace 配额，批量提醒需要监控失败率。
- `FAILED` 和 `email_error` 应纳入运维监控。
- Gmail API 和数据库无法提供严格的分布式 exactly-once：如果 Gmail 已接受邮件、
  但进程在数据库提交前崩溃，理论上仍可能重试。当前唯一约束、行锁、发送状态和
  Message ID 已将正常运行下的重复概率降到最低。
- 若未来要求更严格的投递保证，应使用专用任务队列和带幂等键的邮件服务。
