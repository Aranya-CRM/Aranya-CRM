# Aranya CRM — Permission List (Live Configuration) / 权限清单（实际配置）

> **English**: This document is a snapshot of the **actual permission configuration in the running database** (`cap_definition` + `role_cap` tables), exported on **2026-07-15**. It is the *as-built* reference. For the original *design intent* and rationale, see [02-permission-design.md](02-permission-design.md).
> 
> **中文**：本文档是**运行数据库中真实权限配置**（`cap_definition` + `role_cap` 两张表）的快照，导出于 **2026-07-15**，是「实际落地」的参考。设计意图与理由请见 [02-permission-design.md](02-permission-design.md)。

> ⚠️ **English — Known drift**: The design doc (02) predates several seed migrations and no longer matches the DB. This document reflects the DB. Additionally, a runtime override layer (`CapPermissionEvaluator.correctedScope()`) can override some DB values at request time — see [§5](#5-runtime-override-caveat--运行时覆盖说明).
> 
> ⚠️ **中文 — 已知偏差**：设计文档（02）早于若干 seed 迁移，已与数据库不符；本文档以数据库为准。此外，后端存在一个运行时覆盖层（`CapPermissionEvaluator.correctedScope()`），会在请求时覆盖部分数据库取值 —— 见[第 5 节](#5-runtime-override-caveat--运行时覆盖说明)。

---

## 1. Model / 权限模型

**English**: Authorization is data-driven. A permission is a **cap** (capability, `{domain}:{action}`). Each role holds a set of caps, and every `(role, cap)` pair carries a **scope value**. After login the backend flattens the user's roles into a `caps: Record<CapKey, ScopeValue>` dictionary; both UI and API check cap keys, never role names. The `role_cap` table is the single source of truth, edited via Liquibase migrations.

**中文**：授权是数据驱动的。一个权限就是一个 **cap**（能力，`{域}:{动作}`）。每个角色持有一组 cap，每个 `(角色, cap)` 组合带一个**作用域值**。登录后后端把用户的角色摊平成 `caps: Record<CapKey, ScopeValue>` 字典；界面和接口都只检查 cap key，从不判断角色名。`role_cap` 表是唯一事实来源，通过 Liquibase 迁移修改。

**Totals / 总量**: 72 caps across 7 domains, 7 roles. / 7 个域共 72 个 cap，7 个角色。

---

## 2. Scope Values / 作用域取值

| Value      | English                                        | 中文                 |
| ---------- | ---------------------------------------------- | ------------------ |
| `ALL`      | Access all records regardless of ownership     | 不论归属，访问全部记录        |
| `YES`      | Binary permission granted (no data scope)      | 二元授权（无数据范围概念）      |
| `OWN`      | Only records owned by / assigned to self       | 仅本人拥有或被指派的记录       |
| `TEAM`     | Only records of the same team                  | 仅同团队的记录            |
| `WORKFLOW` | May **initiate an approval**, not act directly | 只能**发起审批**，不能直接执行  |
| `NO` / `—` | Denied (no `role_cap` row)                     | 拒绝（无 `role_cap` 行） |

Precedence when a user has multiple roles / 用户拥有多个角色时的优先级：
`ALL > YES > OWN > TEAM > WORKFLOW > NO`

---

## 3. Cap Registry / 能力清单

Role column abbreviations / 角色列缩写：
**ADM**=ADMIN · **FMGR**=FULL_MANAGER · **MGR**=MANAGER · **TL**=TEAM_LEAD · **SW**=SOCIAL_WORKER · **VMGR**=VIEW_MANAGER · **VOL**=VOLUNTEER

### 3.1 `admin` — System administration / 系统管理

| Cap Key                  | English                | 中文       | ADM | FMGR | MGR | TL  | SW  | VMGR | VOL |
| ------------------------ | ---------------------- | -------- |:---:|:----:|:---:|:---:|:---:|:----:|:---:|
| `admin:console.access`   | Access admin console   | 进入后台控制台  | YES | —    | —   | —   | —   | —    | —   |
| `admin:users.manage`     | Create & manage users  | 创建与管理用户  | YES | WF   | YES | WF  | —   | —    | —   |
| `admin:audit.view`       | View system audit logs | 查看系统审计日志 | YES | YES  | YES | YES | —   | YES  | —   |
| `admin:data.bulk_export` | Bulk export data       | 批量导出数据   | WF  | WF   | WF  | WF  | —   | —    | —   |
| `admin:data.delete`      | Bulk delete records    | 批量删除记录   | WF  | WF   | WF  | WF  | —   | —    | —   |

### 3.2 `cases` — Cases / 个案

| Cap Key                          | English                          | 中文                | ADM | FMGR | MGR | TL  | SW  | VMGR | VOL |
| -------------------------------- | -------------------------------- | ----------------- |:---:|:----:|:---:|:---:|:---:|:----:|:---:|
| `cases:view`                     | View case list & detail          | 查看个案列表与详情         | ALL | ALL  | ALL | ALL | OWN | YES  | OWN |
| `cases:create`                   | Create case for a client         | 为服务对象创建个案         | ALL | ALL  | ALL | ALL | —   | —    | —   |
| `cases:assign`                   | Assign caseworker                | 指派主责社工            | ALL | ALL  | ALL | ALL | WF  | —    | —   |
| `cases:reassign`                 | Reassign caseworker              | 改派主责社工            | ALL | ALL  | ALL | ALL | WF  | —    | —   |
| `cases:status.close`             | Close a case                     | 关闭个案              | WF  | WF   | WF  | WF  | WF  | —    | —   |
| `cases:audit`                    | View case audit log              | 查看个案审计日志          | YES | YES  | YES | YES | —   | YES  | —   |
| `cases:notes.create`             | Create case notes                | 新建个案笔记            | ALL | ALL  | ALL | ALL | YES | —    | YES |
| `cases:notes.update.own`         | Edit own notes                   | 编辑本人笔记            | ALL | ALL  | ALL | YES | YES | —    | YES |
| `cases:notes.update.others`      | Edit others' notes (supervisory) | 编辑他人笔记（督导）        | YES | YES  | YES | YES | —   | —    | —   |
| `cases:notes.delete`             | Delete case notes                | 删除个案笔记            | WF  | WF   | WF  | WF  | —   | —    | —   |
| `cases:documents.upload`         | Upload/edit case documents       | 上传/编辑个案文件         | ALL | ALL  | ALL | ALL | ALL | —    | YES |
| `cases:documents.delete`         | Delete case documents            | 删除个案文件            | ALL | ALL  | ALL | WF  | ALL | —    | —   |
| `cases:documents.import`         | Import from Google Drive         | 从 Google Drive 导入 | ALL | ALL  | ALL | —   | —   | —    | —   |
| `cases:services.view`            | View service requests            | 查看服务申请            | ALL | ALL  | ALL | ALL | OWN | YES  | —   |
| `cases:services.create`          | Create service request           | 创建服务申请            | YES | YES  | YES | YES | YES | —    | —   |
| `cases:services.assess`          | Assess eligibility               | 评估服务资格            | YES | YES  | YES | YES | YES | —    | —   |
| `cases:services.recommend`       | Recommend activation             | 推荐启用服务            | YES | YES  | YES | YES | YES | —    | —   |
| `cases:services.approve`         | Approve activation               | 审批启用服务            | WF  | WF   | WF  | WF  | —   | —    | —   |
| `cases:services.assign_provider` | Assign provider                  | 指派服务供应商           | ALL | ALL  | ALL | ALL | WF  | —    | —   |
| `cases:services.suspend`         | Suspend service                  | 暂停服务              | WF  | WF   | WF  | WF  | WF  | —    | —   |
| `cases:services.close`           | Close service request            | 关闭服务申请            | WF  | WF   | WF  | WF  | WF  | —    | —   |
| `cases:services.history`         | View service history             | 查看服务历史            | ALL | ALL  | ALL | ALL | OWN | YES  | —   |

### 3.3 `clients` — Client profiles / 服务对象档案

| Cap Key                   | English                           | 中文          | ADM | FMGR | MGR | TL  | SW  | VMGR | VOL |
| ------------------------- | --------------------------------- | ----------- |:---:|:----:|:---:|:---:|:---:|:----:|:---:|
| `clients:view`            | View basic profile                | 查看基础档案      | ALL | ALL  | ALL | ALL | ALL | YES  | OWN |
| `clients:view.full`       | View full profile incl. sensitive | 查看完整档案（含敏感） | ALL | ALL  | ALL | ALL | OWN | YES  | —   |
| `clients:create`          | Create client record              | 创建档案        | ALL | ALL  | ALL | YES | YES | —    | —   |
| `clients:update`          | Edit client record                | 编辑档案        | ALL | ALL  | ALL | ALL | ALL | —    | —   |
| `clients:delete`          | Delete client record              | 删除档案        | WF  | WF   | WF  | WF  | —   | —    | —   |
| `clients:docs.upload`     | Upload client documents           | 上传档案文件      | ALL | ALL  | ALL | ALL | ALL | —    | YES |
| `clients:convert_to_case` | Convert client to case            | 转为个案        | YES | YES  | YES | WF  | WF  | —    | —   |

### 3.4 `clients` (sensitive) — Sensitive records / 敏感记录

| Cap Key                               | English                              | 中文         | ADM | FMGR | MGR | TL  | SW  | VMGR | VOL |
| ------------------------------------- | ------------------------------------ | ---------- |:---:|:----:|:---:|:---:|:---:|:----:|:---:|
| `clients:sensitive.indicator`         | See "has sensitive record" flag      | 敏感记录存在指示   | YES | YES  | YES | ALL | ALL | YES  | —   |
| `clients:sensitive.ordination`        | View ordination certificate          | 查看剃度证明     | ALL | ALL  | ALL | YES | —   | YES  | —   |
| `clients:sensitive.medical`           | View full medical records            | 查看完整医疗记录   | YES | YES  | YES | ALL | OWN | —    | —   |
| `clients:sensitive.financial.view`    | View financial assistance            | 查看财务援助记录   | ALL | ALL  | ALL | ALL | ALL | YES  | —   |
| `clients:sensitive.financial.approve` | Approve financial assistance         | 审批财务援助     | WF  | WF   | WF  | WF  | WF  | —    | —   |
| `clients:sensitive.will_lpa`          | View Will & LPA docs                 | 查看遗嘱与持久授权书 | YES | YES  | YES | ALL | WF  | —    | —   |
| `clients:sensitive.acp`               | View Advance Care Planning           | 查看预立照护计划   | YES | YES  | YES | ALL | OWN | —    | —   |
| `clients:sensitive.living_will`       | View Living Will                     | 查看生前预嘱     | YES | YES  | YES | ALL | OWN | —    | —   |
| `clients:sensitive.safeguarding`      | View safeguarding records            | 查看安全防护记录   | YES | YES  | YES | ALL | OWN | —    | —   |
| `clients:sensitive.docs.upload`       | Upload sensitive documents           | 上传敏感文件     | YES | YES  | YES | ALL | YES | —    | —   |
| `clients:sensitive.export`            | Export sensitive records             | 导出敏感记录     | WF  | WF   | WF  | WF  | WF  | —    | —   |
| `clients:sensitive.audit`             | View sensitive-access audit log      | 查看敏感访问审计   | YES | YES  | YES | —   | —   | YES  | —   |
| `clients:sensitive.archive`           | Archive sensitive records            | 归档敏感记录     | WF  | WF   | WF  | WF  | —   | —    | —   |
| `clients:sensitive.delete`            | Permanently delete sensitive records | 永久删除敏感记录   | —   | —    | —   | —   | —   | —    | —   |

> **English**: `clients:sensitive.delete` currently has **no role** assigned — it is a defined but ungranted capability (reserved).
> **中文**：`clients:sensitive.delete` 当前**未分配给任何角色** —— 已定义但未授予（保留）。

### 3.5 `members` — Membership registry / 会员登记

| Cap Key                     | English                        | 中文        | ADM | FMGR | MGR | TL  | SW  | VMGR | VOL |
| --------------------------- | ------------------------------ | --------- |:---:|:----:|:---:|:---:|:---:|:----:|:---:|
| `members:view`              | View member profiles           | 查看会员档案    | YES | YES  | YES | ALL | OWN | YES  | —   |
| `members:create`            | Register new member            | 登记新会员     | YES | YES  | YES | YES | —   | —    | —   |
| `members:update`            | Edit member record             | 编辑会员记录    | YES | YES  | YES | OWN | —   | —    | —   |
| `members:docs.upload`       | Upload membership documents    | 上传会员文件    | YES | YES  | YES | OWN | —   | —    | —   |
| `members:report.generate`   | Generate member report         | 生成会员报告    | YES | YES  | YES | WF  | —   | —    | —   |
| `members:convert_to_client` | Start member→client conversion | 发起会员转服务对象 | YES | YES  | YES | WF  | WF  | —    | —   |

### 3.6 `reports` — Reports / 报告

| Cap Key          | English           | 中文    | ADM | FMGR | MGR | TL  | SW  | VMGR | VOL |
| ---------------- | ----------------- | ----- |:---:|:----:|:---:|:---:|:---:|:----:|:---:|
| `reports:view`   | View reports      | 查看报告  | ALL | ALL  | ALL | ALL | OWN | YES  | OWN |
| `reports:create` | Submit new report | 提交新报告 | YES | YES  | YES | YES | YES | —    | YES |
| `reports:update` | Edit report       | 编辑报告  | ALL | ALL  | ALL | ALL | OWN | —    | OWN |
| `reports:export` | Export reports    | 导出报告  | ALL | ALL  | ALL | ALL | OWN | —    | —   |
| `reports:delete` | Delete report     | 删除报告  | WF  | WF   | WF  | WF  | —   | —    | —   |

### 3.7 `dashboard` — Dashboard widgets / 工作台组件

| Cap Key                     | English               | 中文     | ADM | FMGR | MGR | TL  | SW  | VMGR | VOL |
| --------------------------- | --------------------- | ------ |:---:|:----:|:---:|:---:|:---:|:----:|:---:|
| `dashboard:total_clients`   | Total clients count   | 服务对象总数 | YES | YES  | YES | YES | YES | YES  | —   |
| `dashboard:active_cases`    | Active cases count    | 进行中个案数 | YES | YES  | YES | YES | YES | YES  | —   |
| `dashboard:urgent_cases`    | Urgent cases count    | 紧急个案数  | YES | YES  | YES | YES | YES | —    | —   |
| `dashboard:pending_reports` | Pending reports count | 待处理报告数 | YES | YES  | YES | YES | YES | —    | —   |
| `dashboard:my_reports`      | My recent reports     | 我的近期报告 | YES | YES  | YES | YES | YES | —    | YES |
| `dashboard:pending_tasks`   | My pending tasks      | 我的待办事件 | YES | YES  | YES | YES | YES | —    | YES |

### 3.8 `route` — Route access / 页面访问

| Cap Key           | English                  | 中文        | ADM | FMGR | MGR | TL  | SW  | VMGR | VOL |
| ----------------- | ------------------------ | --------- |:---:|:----:|:---:|:---:|:---:|:----:|:---:|
| `route:dashboard` | Dashboard                | 工作台       | YES | YES  | YES | YES | YES | YES  | YES |
| `route:cases`     | Case list & detail       | 个案列表与详情   | YES | YES  | YES | YES | YES | YES  | YES |
| `route:clients`   | Client list & detail     | 服务对象列表与详情 | YES | YES  | YES | YES | YES | YES  | —   |
| `route:reports`   | Report list & submission | 报告列表与提交   | YES | YES  | YES | YES | YES | YES  | YES |
| `route:users`     | User management          | 用户管理      | YES | YES  | YES | YES | —   | YES  | —   |
| `route:audit`     | Audit log viewer         | 审计日志查看    | YES | YES  | YES | YES | —   | YES  | —   |
| `route:admin`     | Admin shell entry        | 后台入口      | YES | —    | —   | —   | —   | —    | —   |

---

## 4. Per-role Totals / 各角色统计

| Role / 角色       | Caps held / 持有 cap 数 | Nature / 定位                                             |
| --------------- |:--------------------:| ------------------------------------------------------- |
| `ADMIN`         | 71                   | System & membership admin / 系统与会员管理                     |
| `MANAGER`       | 69                   | Legacy manager (= FULL_MANAGER) / 遗留经理（等同 FULL_MANAGER） |
| `FULL_MANAGER`  | 69                   | Full operational oversight / 全面运营管理                     |
| `TEAM_LEAD`     | 67                   | Programme supervision / 项目督导                            |
| `SOCIAL_WORKER` | 48                   | Day-to-day case work / 日常个案工作                           |
| `VIEW_MANAGER`  | 21                   | Read-only governance & audit / 只读治理与审计                  |
| `VOLUNTEER`     | 14                   | Field volunteer, limited / 现场义工，受限                      |

---

## 5. Runtime Override Caveat / 运行时覆盖说明

**English**: `CapPermissionEvaluator.correctedScope()` (backend) runs **before** the DB lookup and, when it matches, returns a hard-coded scope that **overrides the `role_cap` table**. This means some rows above are not authoritative at request time. Notable overrides:

- **VOLUNTEER (sole role)**: `route:tasks` / `tasks.list` → forced `YES`; `cases:view` and `cases:documents.*` → forced `NO`; all other `route:*` → forced `NO`. (So the DB `route:cases`, `route:reports`, `route:dashboard`, `cases:view=OWN` shown above are effectively suppressed for volunteers.)
- **SOCIAL_WORKER**: `clients:create` → `WORKFLOW`; `clients:update` / `clients:delete` → `NO`; `cases:create` → `WORKFLOW`; `cases:view` → `ALL`; `cases:services.create` → `WORKFLOW`; `cases:documents.upload` / `.delete` → `ALL`; `approvals:create` → `YES`.
- **MANAGER / ADMIN / FULL_MANAGER / TEAM_LEAD**: `approvals:view` / `approvals:decide` / `approvals:create` → `YES`; `clients:create` / `clients:update` / `clients:delete` / `cases:create` / `cases:services.create` / `cases:delete` → `WORKFLOW`.
- `route:approvals` → always `NO`.

> Some keys above (`route:tasks`, `route:approvals`, `tasks.list`, `approvals:*`, `cases:delete`) are **not** in `cap_definition` — they exist only in this override layer.

**中文**：后端的 `CapPermissionEvaluator.correctedScope()` 在查库**之前**执行，一旦命中就返回硬编码作用域，**覆盖 `role_cap` 表**。因此上表部分行在请求时并非最终结果。主要覆盖：

- **VOLUNTEER（单一角色时）**：`route:tasks` / `tasks.list` → 强制 `YES`；`cases:view` 与 `cases:documents.*` → 强制 `NO`；其余 `route:*` → 强制 `NO`。（即上表中义工的 `route:cases`、`route:reports`、`route:dashboard`、`cases:view=OWN` 实际被压制。）
- **SOCIAL_WORKER**：`clients:create` → `WORKFLOW`；`clients:update` / `clients:delete` → `NO`；`cases:create` → `WORKFLOW`；`cases:view` → `ALL`；`cases:services.create` → `WORKFLOW`；`cases:documents.upload` / `.delete` → `ALL`；`approvals:create` → `YES`。
- **MANAGER / ADMIN / FULL_MANAGER / TEAM_LEAD**：`approvals:view` / `approvals:decide` / `approvals:create` → `YES`；`clients:create` / `clients:update` / `clients:delete` / `cases:create` / `cases:services.create` / `cases:delete` → `WORKFLOW`。
- `route:approvals` → 恒为 `NO`。

> 上面部分 key（`route:tasks`、`route:approvals`、`tasks.list`、`approvals:*`、`cases:delete`）**不在** `cap_definition` 中 —— 它们只存在于这个覆盖层。

> ⚠️ **English — Impact on "Manager assigns permissions"**: because this layer wins over the DB, a future admin UI that edits `role_cap` will appear to grant/revoke some caps that silently do nothing. This override layer must be reconciled before building configurable permission assignment.
> 
> ⚠️ **中文 — 对「Manager 分配权限」的影响**：由于该层优先于数据库，未来编辑 `role_cap` 的管理界面会「看起来」授予/撤销了某些 cap，实际却静默无效。构建可配置的权限分配之前，必须先处理这个覆盖层。

---

## 6. Source / 数据来源

- Live tables / 实时表：`cap_definition`, `role_cap`, `role` (DB `aranya_crm`, exported 2026-07-15).
- Runtime override / 运行时覆盖：[`CapPermissionEvaluator.java`](../../backend/src/main/java/aranya/crm/security/CapPermissionEvaluator.java)
- Design rationale / 设计理由：[02-permission-design.md](02-permission-design.md)
