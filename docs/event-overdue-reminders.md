# Event 逾期提醒

## 规则

- `visit_report.status = SUBMITTED`：Event 已完成，不提醒。
- 未提交 Report 且超过截止时间：Event 逾期。
- 截止时间优先使用 `service_appointment.report_due_at`。
- 没有单独设置截止时间时，使用 Event 结束时间（没有结束时间则使用开始时间）加
  `EVENT_REPORT_GRACE_HOURS`，默认 0 小时，即逾期后立即进入提醒队列。
- 收件人来自 `service_event_assignment` 中所有 `ACTIVE` 参与者。

后端每 10 分钟扫描一次。每个 Event、每位参与者只建立一条提醒；数据库行锁避免
Cloud Run 多实例同时扫描时重复发信。参与者被移除、Event 被取消，或任意一份
Report 提交后，提醒自动结束。

## 站内提醒

提醒保存在 PostgreSQL 的 `event_overdue_notification` 表中。登录用户会在右上角
铃铛中看到自己的未解决提醒，可以逐条或全部标记为已读。点击提醒进入相应 Event。

## Gmail API 邮件

后端使用 Gmail API `users.messages.send` 直接从一个已授权的 Gmail/Google Workspace
账号发信，不依赖 Firestore、Firebase Extension 或 SMTP。

邮件主题和正文使用英文，不包含网页链接。提醒会列出 Event 标题、Case、Service、
起止时间、Report deadline、Location，以及有填写时的 Agenda 和 Work description。

所需 OAuth scope：

- `https://www.googleapis.com/auth/calendar`
- `https://www.googleapis.com/auth/gmail.send`

必须以 `access_type=offline` 和 `prompt=consent` 完成一次合并授权，取得包含两个
scope 的 refresh token。新的 token 写入现有 Secret Manager 密钥
`gcal-oauth-refresh-token`，Calendar 与 Gmail 共用同一套 OAuth client 和 token。

运行配置：

- `GOOGLE_GMAIL_ENABLED=true`
- `GOOGLE_GMAIL_FROM_ADDRESS=<完成授权的 Gmail 地址或其已配置的 Send-as alias>`
- `GOOGLE_GMAIL_FROM_NAME=Aranya CRM`
- 可选：`EVENT_REPORT_GRACE_HOURS=0`

OAuth client secret 和 refresh token 始终从 Secret Manager 注入，不写入仓库。

## Cloud Run

项目当前使用 Spring `@Scheduled` 扫描。Cloud Run 部署配置设置了一个最小实例和
`--no-cpu-throttling`，保证没有 HTTP 流量时任务仍能运行。这会产生少量空闲实例费用。
