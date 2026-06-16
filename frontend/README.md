# Aranya CRM Frontend

Aranya CRM 前端使用 React、TypeScript、Vite、Ant Design、Firebase Auth 和 TanStack Query。

当前代码采用 feature-first 结构：`app` 负责应用组装，`features` 负责业务模块，`shared` 放跨模块复用能力。


## 快速开始

```bash
npm install
npm run dev
```

常用命令：

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

## 目录结构

```text
frontend/src
├─ app
│  ├─ App.tsx
│  ├─ ManifestProtectedRoute.tsx
│  ├─ navigation.tsx
│  ├─ providers.tsx
│  ├─ queryClient.ts
│  └─ router.tsx
│
├─ contexts
│  └─ AuthContext.tsx
│
├─ features
│  ├─ auth
│  ├─ cases
│  ├─ clients
│  ├─ dashboard
│  ├─ reports
│  └─ users
│
├─ shared
│  ├─ api
│  ├─ auth
│  ├─ layout
│  └─ ui
│
├─ mocks
├─ types
├─ assets
├─ index.css
└─ main.tsx
```

## 分层说明

### `app`

`app` 是应用级组装层，只放跨 feature 的入口、路由、导航和 Provider。

- `App.tsx`：渲染 public routes 和 protected routes。
- `providers.tsx`：组合全局 Provider，目前包含 `AuthProvider`、`QueryClientProvider`、`BrowserRouter`。
- `queryClient.ts`：TanStack Query 的全局 client 配置。
- `router.tsx`：收集各 feature 暴露的 `routes.tsx`。
- `navigation.tsx`：侧边栏导航配置。
- `ManifestProtectedRoute.tsx`：登录态和 UI manifest 路由权限保护。

应用渲染链路：

```text
main.tsx
  -> AppProviders
    -> AuthProvider
      -> QueryClientProvider
        -> BrowserRouter
          -> App
            -> PUBLIC_ROUTES
            -> PROTECTED_ROUTES
              -> ManifestProtectedRoute
                -> AppLayout
                  -> Page
```

### `features`

`features` 是业务模块层。业务页面、业务 API、业务类型、业务 hooks 和业务组件都优先放在对应 feature 内。

推荐结构：

```text
features/<feature-name>
├─ api
├─ components
├─ hooks
├─ pages
├─ routes.tsx
├─ types.ts
└─ index.ts
```

当前模块：

- `auth`：登录页、Firebase 登录流程、TOTP、当前用户和 UI manifest API。
- `clients`：客户/僧人档案列表、详情、表单、相关组件和 React Query hooks。
- `cases`：个案模块页面、API、类型。
- `dashboard`：工作台页面、API、类型。
- `reports`：报告模块页面、API、类型。
- `users`：用户模块占位页和路由。

### `shared`

`shared` 放跨 feature 复用的基础能力。

- `shared/api`：HTTP 基础设施，目前包含 axios 实例和请求拦截器。
- `shared/auth`：权限判断，如 `canRoute`、`canFeature`、`Can`。
- `shared/layout`：后台主布局 `AppLayout`。
- `shared/ui`：通用 UI 组件和表单组件。

业务相关代码不要轻易放进 `shared`。只有两个以上 feature 真的需要复用时，再考虑提升到 `shared`。

### `contexts`

`contexts/AuthContext.tsx` 管理全局认证状态：

- Firebase auth state
- 当前后端用户信息
- UI manifest
- `refreshUser`
- `logout`

### `mocks`

`mocks` 放本地 mock 数据。mock 数据可以引用各 feature 的 `types.ts`。

### `types`

`types` 只放真正全局的类型。大部分业务类型应该放在对应 feature 内。

当前保留：

- `qrcode.d.ts`
- `uiManifest.ts`

## 路由开发

新增页面时，优先在对应 feature 内添加路由。

示例：

```text
features/clients/routes.tsx
```

```tsx
export const clientRoutes: AppRouteConfig[] = [
  {
    path: '/clients',
    routeId: 'clients.list',
    element: <ClientListPage />,
  },
]
```

然后在 `app/router.tsx` 收集：

```tsx
export const PROTECTED_ROUTES: AppRouteConfig[] = [
  ...clientRoutes,
]
```

公开页面放入 `PUBLIC_ROUTES`，需要登录和权限控制的页面放入 `PROTECTED_ROUTES`。

受保护路由必须提供 `routeId`，并且后端返回的 UI manifest 中需要包含该 route id。

## 导航开发

侧边栏配置在：

```text
src/app/navigation.tsx
```

新增主导航项时，需要添加：

- `id`
- `routeId`
- `path`
- `zhLabel`
- `enLabel`
- `icon`

导航显示会通过 `useAccess().canRoute(routeId)` 自动过滤。

## API 开发

业务 API 放在 feature 内：

```text
features/clients/api/client.api.ts
features/cases/api/case.api.ts
features/reports/api/report.api.ts
```

通用 HTTP client 放在：

```text
shared/api/http.ts
```

请求会自动带上 Firebase ID token：

```ts
config.headers.Authorization = `Bearer ${token}`
```

不要在页面组件里直接写 axios 请求。页面应该通过 feature API 或 feature hooks 访问数据。

## TanStack Query 开发

项目已经接入 TanStack Query。全局配置在：

```text
src/app/queryClient.ts
```

默认配置：

```ts
staleTime: 60 * 1000
retry: 1
refetchOnWindowFocus: false
```

推荐每个 feature 自己维护 query hooks：

```text
features/clients/hooks/useClients.ts
```

示例：

```tsx
const { data = [], isLoading } = useClients()
```

mutation 成功后应该主动更新或失效相关缓存：

```tsx
queryClient.invalidateQueries({ queryKey: clientQueryKeys.lists() })
queryClient.setQueryData(clientQueryKeys.detail(client.id), client)
```

服务端数据优先使用 TanStack Query 管理。不要把 API 返回的列表、详情数据放进 Context 或 Redux。

## 新增 feature 的推荐步骤

1. 在 `src/features/<name>` 下创建模块目录。
2. 添加 `pages`，放路由级页面。
3. 添加 `api`，封装后端请求。
4. 添加 `types.ts`，放该业务域类型。
5. 如有请求状态，添加 `hooks` 并使用 TanStack Query。
6. 添加 `routes.tsx`，导出该模块路由。
7. 在 `app/router.tsx` 收集该模块路由。
8. 如果需要侧边栏入口，在 `app/navigation.tsx` 添加导航项。
9. 如果需要权限，确认后端 UI manifest 返回对应 `routeId`、feature id 或 widget id。
10. 运行 `npm run build` 验证。

## 组件放置规则

优先级：

```text
feature/components  ->  只服务当前业务模块
shared/ui           ->  多个 feature 复用的纯 UI 组件
shared/layout       ->  应用布局组件
app                 ->  应用组装，不放普通 UI 组件
```

不要为了“可能复用”提前放进 `shared`。先放在 feature 内，真实复用出现后再上移。

## 类型放置规则

业务类型放在 feature 内：

```text
features/clients/types.ts
features/cases/types.ts
features/reports/types.ts
```

全局类型才放在：

```text
src/types
```

## 环境变量

API base URL：

```text
VITE_API_BASE_URL=/api
```

数据模式：

```text
VITE_DATA_MODE=auto
VITE_DASHBOARD_DATA_MODE=auto
```

可选值：

- `mock`：只使用本地 mock 数据。
- `api`：只调用后端 API，失败则报错。
- `auto`：优先调用 API，失败后回退 mock。

Firebase：

```text
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
```

## 开发约定

- 页面组件尽量只负责页面状态、布局和用户交互。
- API 请求放在 feature 的 `api` 目录。
- 服务端数据状态使用 TanStack Query hooks。
- 权限判断使用 `shared/auth`。
- 公共 UI 使用 `shared/ui`。
- 新增 protected route 时必须设置 `routeId`。
- 大范围调整后运行 `npm run build`。

## 当前注意事项

- 部分中文文本存在编码乱码问题，当前结构调整没有修复它。
- `clients` 模块已开始使用 TanStack Query。
- `dashboard`、`cases`、`reports` 后续也可以继续迁移到 TanStack Query hooks。
