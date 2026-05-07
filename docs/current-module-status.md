# Current Module Status / 当前模块状态

This document summarizes the current status of two completed areas:

本文总结目前已经完成的两部分工作：

1. Roles authentication / capability manifest.
2. Client list/detail read flow.

---

## 1. Roles Authentication / Capability Manifest

## 1. 角色认证 / 能力清单模块

### Core Idea / 核心设计

The system separates permission decisions from UI rendering.

系统把“权限判断”和“前端渲染”分开。

The backend decides what the current user can access or do. The frontend decides how the allowed UI should look.

后端负责判断当前用户能访问什么、能执行什么；前端负责决定这些允许显示的内容怎么展示。

The frontend does not receive role names such as `VOLUNTEER`, `SOCIAL_WORKER`, or `MANAGER`. It only receives a capability manifest:

前端不会收到 `VOLUNTEER`、`SOCIAL_WORKER`、`MANAGER` 这类角色名，只会收到后端返回的能力清单：

```json
{
  "routes": [],
  "features": [],
  "widgets": []
}
```

### Manifest Design / 清单设计

The capability manifest comes from the role-permission overview. The human-readable permission overview defines what each role can do. That design is then translated into capability ids, and those capability ids are stored in the database.

能力清单来源于权限总览。权限总览先用人能读懂的方式定义每个角色能做什么；然后这些权限被翻译成 capability id；最后 capability id 被迁移到数据库中。

Current design flow:

当前设计链路：

```text
Role-Permission-Overview
        ↓
Capability sitemap
        ↓
permission table
        ↓
role_permission table
        ↓
/api/v1/ui/manifest
        ↓
Frontend canRoute / canFeature / canWidget
```

The database now stores the permission model instead of hardcoding role checks in the frontend. The backend reads the current user's role permissions and returns only the allowed capability ids.

现在权限模型已经从前端硬编码角色判断，迁移到了数据库。后端根据当前用户的角色权限查询数据库，然后只返回允许的 capability id。

The manifest is intentionally small. It only answers what the user can access or do. It does not describe how the UI should look.

这个清单刻意保持很小。它只回答“用户能看什么、能做什么”，不描述 UI 应该怎么长。

### Responsibility Split / 前后端分工

Frontend owns:

前端负责：

- Components / 组件
- Layout / 页面布局
- Static labels / 静态文案，例如日期、姓名、状态、按钮文案
- Table column display / 表格字段展示方式
- Interaction and local rendering / 交互体验和局部渲染
- Page transitions / 页面切换
- Figma UI structure / Figma 对应的 UI 结构

Backend owns:

后端负责：

- Authenticate the current user / 认证当前是谁
- Decide accessible pages, features, and actions / 判断能访问哪些页面、功能和操作
- Return dynamic data / 返回动态数据
- Execute business operations / 执行业务操作
- Enforce final permissions / 做最终权限校验

### How It Works / 运行方式

After login, the frontend calls:

登录后，前端会调用：

```http
GET /api/v1/users/me
GET /api/v1/ui/manifest
```

`/users/me` confirms the current authenticated profile.

`/users/me` 用来确认当前登录用户的基础信息。

`/ui/manifest` returns what the user can access:

`/ui/manifest` 返回当前用户能访问和能操作的能力清单：

```text
routes   -> page access and sidebar visibility
features -> page actions, buttons, and operations
widgets  -> dashboard widgets
```

```text
routes   -> 页面访问和侧边栏入口
features -> 页面里的操作、按钮、动作
widgets  -> Dashboard 小组件
```

The frontend then checks:

前端之后只检查：

```ts
canRoute('cases.list')
canFeature('reports.create')
canWidget('dashboard.myReports')
```

The backend still needs to enforce permissions on real business APIs. The manifest only helps the frontend render the correct UI.

后端业务 API 仍然需要做最终权限校验。manifest 只是帮助前端渲染正确的 UI。

### Current Status / 当前状态

Completed:

已完成：

- JWT no longer carries roles.
- JWT 不再携带 roles。
- `/users/me` no longer returns roles.
- `/users/me` 不再返回 roles。
- `/ui/manifest` returns only capability ids.
- `/ui/manifest` 只返回能力 id。
- Frontend no longer checks role names directly.
- 前端不再直接判断角色名。
- Sidebar and route access are capability-driven.
- 侧边栏和路由访问由 capability 控制。
- Dashboard has started using feature/widget capabilities.
- Dashboard 已开始使用 feature/widget capability。
- Volunteer no longer has any `clients.*` or `cases.*` capability.
- Volunteer 不再拥有任何 `clients.*` 或 `cases.*` capability。
- Social Worker cannot delete reports or close cases.
- Social Worker 不能删除报告，也不能关闭 case。
- Manager can delete reports and close cases, but cannot edit reports.
- Manager 可以删除报告、关闭 case，但不能编辑报告。

Not fully completed:

尚未完全完成：

- Reports, Cases, and Users pages are not fully implemented yet.
- Reports、Cases、Users 页面还没有完整实现。
- Some business APIs still need final permission enforcement as they become real.
- 一些业务 API 后续实现时还需要补最终权限校验。
- Full Figma-based UI implementation is for the next frontend phase.
- 完整 Figma UI 复刻属于下一阶段前端工作。

---

## 2. Client Read Flow

## 2. Client 读取链路

### Core Idea / 核心设计

The Client module currently has a minimum working read loop for list and detail pages.

Client 模块目前已经完成列表页和详情页的最小读取闭环。

The goal is to prove that real client data can flow from PostgreSQL to the frontend pages.

目标是验证真实 client 数据可以从 PostgreSQL 一路传到前端页面。

The current backend entity and table modeling is also in place. The main domain entities have matching database tables, so the data model is ready for normal repository/service/API development.

目前后端的 Entity 和数据库表建模也已经完善，主要业务实体和数据表基本一一对应，因此后续可以按正常的 Repository / Service / API 链路继续开发。

### Current API Scope / 当前 API 范围

Backend read APIs:

后端读取接口：

```http
GET /api/v1/clients
GET /api/v1/clients/{id}
```

`GET /api/v1/clients` is used by the Client list page.

`GET /api/v1/clients` 给 Client list 页面使用。

`GET /api/v1/clients/{id}` is used by the Client detail page.

`GET /api/v1/clients/{id}` 给 Client detail 页面使用。

### Data Flow / 数据链路

The current minimum loop is:

当前最小闭环是：

```text
PostgreSQL client / related_contact tables
        ↓
JPA Entity
        ↓
Repository
        ↓
Service
        ↓
Controller API
        ↓
frontend client API wrapper
        ↓
React Query hooks
        ↓
Client list / detail pages
```

### Current Status / 当前状态

Completed:

已完成：

- Backend can read client list data.
- 后端可以读取 client 列表数据。
- Backend can read client detail data.
- 后端可以读取 client 详情数据。
- Detail data can include related contacts.
- 详情数据可以包含 related contacts。
- Frontend calls real Client APIs.
- 前端已经接入真实 Client API。
- Client list page displays real API data.
- Client list 页面展示真实接口数据。
- Client detail page displays real API data.
- Client detail 页面展示真实接口数据。

Not included yet:

尚未包含：

- Client create.
- 新建 Client。
- Client edit.
- 编辑 Client。
- Client delete.
- 删除 Client。
- Document management.
- 文档管理。
- GCS / Firebase Storage integration.
- GCS / Firebase Storage 集成。

---

## 3. How These Two Parts Work Together

## 3. 两部分如何配合

The capability manifest decides whether the user can enter the Client pages or see related actions.

Capability manifest 决定当前用户能不能进入 Client 页面、能不能看到相关操作。

The Client APIs provide the real business data after access is allowed.

Client API 在用户被允许访问后，负责提供真实业务数据。

In short:

简单说：

```text
Capability manifest = what the user is allowed to see or do
Client APIs = actual client data
Frontend UI = how the allowed data and actions are displayed
```

```text
Capability manifest = 用户能看什么、能做什么
Client APIs = 真实 client 数据
Frontend UI = 这些数据和操作如何展示
```

This keeps the system maintainable: permissions can change through backend capability mapping, while UI layout and Figma structure stay in the frontend.

这样系统会更容易维护：权限变化主要通过后端 capability 映射调整，而 UI 布局和 Figma 结构继续留在前端。
