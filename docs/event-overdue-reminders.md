# Event 逾期提醒与 Gmail 邮件

## 功能

Event 超过 Report 截止时间且仍未提交 Report 时，系统会：

- 为每位有效参与者建立一条站内提醒。
- 通过 Gmail API 从 `Aranya CRM <infotech@aranya.sg>` 发送邮件。
- 在 Report 提交、Event 取消或参与者移除后结束提醒。

## 处理流程

```text
Spring Scheduler（每 10 分钟）
  -> 查询逾期 Event 和 ACTIVE 参与者
  -> 写入 event_overdue_notification
  -> 站内通知
  -> Gmail API users.messages.send
```

Firebase Authentication 邮件仅用于密码重置、邮箱验证等认证流程。Event 逾期邮件是
自定义业务邮件，直接使用 Gmail API，不经过 Firestore、Firebase Trigger Email
Extension 或 SMTP。

## 逾期规则

- 存在 `visit_report.status = SUBMITTED` 时视为已完成，不提醒。
- 截止时间优先使用 `service_appointment.report_due_at`。
- 未设置时使用 Event 结束时间；没有结束时间则使用开始时间。
- 上述时间加 `EVENT_REPORT_GRACE_HOURS`，当前默认值为 `0`。
- 收件人来自 `service_event_assignment` 中所有 `ACTIVE` 参与者。

扫描默认每 10 分钟执行，因此截止后最多约等待 10 分钟。

## 防重复与重试

提醒保存在 PostgreSQL 表 `event_overdue_notification` 中，唯一键为：

```text
(event_id, recipient_user_id)
```

邮件状态为 `PENDING`、`SENDING`、`SENT` 或 `FAILED`。队列查询使用
`FOR UPDATE SKIP LOCKED`，避免多个后端实例处理同一记录。失败邮件默认最多尝试 3 次；
成功后保存 Gmail Message ID。

## 站内通知 API

```text
GET   /api/v1/notifications
PATCH /api/v1/notifications/{id}/read
PATCH /api/v1/notifications/read-all
```

用户可通过页面右上角通知铃铛查看、跳转和标记提醒。

## Gmail 与 OAuth 配置

Calendar 和 Gmail 共用 OAuth client 与 refresh token。授权 scope 至少包含：

```text
https://www.googleapis.com/auth/calendar
https://www.googleapis.com/auth/gmail.send
```

`gmail.send` 只授予发信权限，不允许读取邮箱。运行时配置：

```text
GOOGLE_GMAIL_ENABLED=true
GOOGLE_GMAIL_FROM_ADDRESS=infotech@aranya.sg
GOOGLE_GMAIL_FROM_NAME=Aranya CRM
EVENT_REPORT_GRACE_HOURS=0
```

机密只存放在 Google Secret Manager：

```text
gcal-oauth-client-secret
gcal-oauth-refresh-token
```

需要重新授权时运行：

```powershell
node scripts/google/authorize-gmail.mjs
```

脚本会验证授权账号，并把新 refresh token 直接写入 Secret Manager，不输出 token。

## 运维检查

- 后端日志应包含 `Gmail API client initialized`。
- 关注 `event_overdue_notification.email_status = FAILED` 和 `email_error`。
- OAuth client secret、refresh token 和邮箱密码不得写入 Git、镜像或 `.env`。
- Gmail API 与数据库之间无法提供严格的 exactly-once；唯一约束、数据库行锁和状态字段
  用于降低正常运行中的重复发送概率。

项目仍保留 Firebase Trigger Email Extension，用于监听 Firestore `mail` 集合的其他邮件。
它与 Event 逾期提醒是两条独立链路。
