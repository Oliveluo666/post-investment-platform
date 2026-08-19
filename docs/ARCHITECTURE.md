# 架构文档 - 投后管理工作台

> 本文档描述系统的技术架构与设计决策，供二次开发与部署参考。
> 数据导入字段规范见 [投后数据批量导入规范.md](./投后数据批量导入规范.md)。

---

## 1. 技术架构

| 层 | 技术 |
|---|---|
| 前端 | React 18.2 + Vite 5.x + Ant Design 5.x + Tailwind CSS 3.x |
| 路由 | React Router v6（HashRouter，适配静态托管） |
| 状态管理 | 自研轻量 store（useSyncExternalStore 模式）+ localStorage 持久化 |
| 后端 | 腾讯云 CloudBase（PostgreSQL + 身份认证 + 静态托管 + 云函数） |
| 数据库 | PostgreSQL（10 张业务表 + RLS 行级安全） |

---

## 2. 路由表

| 路径 | 组件 | 需要登录 | 说明 |
|---|---|---|---|
| `/login` | LoginPage | 否 | 用户名密码登录 + 自助注册申请 |
| `/import` | ImportPage | 是 | 批量导入项目数据 |
| `/dashboard` | Dashboard | 是 | 项目总览看板 |
| `/projects/new` | ProjectCreate | 是 | 新增项目 |
| `/projects/:id` | ProjectDetail | 是 | 项目详情（概览/财务/时间轴） |
| `/projects/:id/edit` | ProjectEdit | 是 | 编辑项目 |
| `/finance-summary` | FinanceSummary | 是 | 财报汇总大表 |
| `/tasks` | Tasks | 是 | 待办事项 |
| `/staff` | StaffPage | 是 | 员工库 |

---

## 3. 认证与用户管理

### 登录流程

1. 访问任意页面 → 检查 `auth.getSession()`
2. 匿名 session（scope === 'accessKey'）→ 跳转 `/login`
3. 真实登录 session → 允许访问，并触发 `syncFromCloud()` 全量同步
4. 登录：`auth.signInWithPassword({ username, password })`
   - 用户名 = 邮箱 `@` 前部分（CloudBase 用户名不允许 `@`）
5. 退出：`auth.signOut()` → 清除云端就绪标志 → 跳转 `/login`

### 自助注册流程

1. 登录页「注册账号」→ 填写信息 → 走云函数 `submitRegisterApplication` 写入 users 表（status=pending）
   - 匿名状态下直写 PG 会被 RLS 拒绝，故需云函数（管理员权限）
2. 管理员在「员工库 → 待审核申请」审核
3. 通过 → 云函数 `createAuthUser` 创建 Auth 账号，真实 UID 回填 users 表
4. 重置密码 → 云函数 `updateAuthPassword`

---

## 4. 数据同步机制

### 云端同步层（store.js）

```
syncFromCloud()
  ├── getDB().from(...).select('*')    // 10 张表全量拉取
  ├── 任意表 error → 放弃同步，保持本地状态
  ├── PG 项目为空 → 保持空状态，仅同步 users/auditLogs 等
  └── PG 有数据 → 覆盖本地状态
```

### 写操作同步

每个写函数（createProject / addFinanceData / completeTodo 等）末尾追加：

```
cloudUpsert(table, row, onConflict)   // 异步 upsert，失败仅 console.warn
cloudDelete(table, id)                // 异步 delete
```

未登录时自动 no-op（`_cloudReady` 标志检查）。

---

## 5. 数据库设计

### 表清单

| 表名 | 用途 | 主键 | 唯一约束 |
|---|---|---|---|
| projects | 投资项目 | id (text) | - |
| finance | 财务数据 | id (text) | projectId + period |
| timelines | 时间轴事件 | id (text) | - |
| todos | 待办事项 | id (text) | - |
| highlights | 数据亮点 | id (text) | - |
| equity | 股权变更 | id (text) | - |
| users | 员工库 | id (text) | - |
| audit_logs | 操作日志 | id (text) | - |
| finance_summary | 财报汇总 | id (uuid) | company + sheet |
| action_types | 自定义事项类型 | id (uuid) | value |

> 完整建表语句见 `scripts/schema.sql`。

### RLS 策略概要

- 所有表：`authenticated` 角色可 SELECT/INSERT/UPDATE
- projects：DELETE 仅 `is_admin()`
- users：INSERT 需 admin 或本人；匿名用户可插入 `status='pending'` 的注册申请
- finance_summary：SELECT 对所有 authenticated；写操作仅 admin
- action_types：SELECT/INSERT 对所有 authenticated；UPDATE/DELETE 仅 admin

### 关键注意事项

- **finance 表 id 必填无默认值**：写入时必须带 id（同期间覆盖复用原 id，新增生成 uuid）
- **finance_summary 隔离设计**：导入流程与清数据流程均不触碰该表
- **列名全部 camelCase**：与前端 store.js 字段一致

---

## 6. 数据导入与规范化

### Excel 批量导入

- 格式：`.xlsx`，一个 Sheet = 一个项目，A 列字段名 / B 列字段值
- 解析入口：`src/utils/importTemplate.js`
- 详细字段规范：`docs/投后数据批量导入规范.md`

### 董监高结构归一化（normalizeDirectors）

统一结构：`{ generalManager, chairman, supervisors: [], boardMembers: [] }`
- 监事/董事支持多人（数组），兼容旧数据字符串自动拆分

### 财务数据规则

- 期间格式：年报 `2025`、季度 `2026Q1`、月报 `202608`（YYYYMM）
- 空行跳过：财务数值列全空时不生成假数据
- 看板显示：某年有年报用年报；只有季度/月度取最新一期

### 待办闭环

- 完成待办可填节点/过程信息，并选择是否写入投后情况时间轴
- 自定义类型存 `action_types` 表，全团队共享

---

## 7. 部署

### 前端部署（CloudBase 静态托管）

1. `npm run build` → 产物在 `dist/`
2. 上传到 CloudBase 静态托管
3. 配置 SPA 回退：执行一次 `setHostingFallback` 云函数（404 → index.html）

### 云函数部署

见 `cloudfunctions/README.md`。

### 数据库初始化

在 CloudBase 控制台 SQL 窗口执行 `scripts/schema.sql`。

---

## 8. 关键约定

1. 组件 PascalCase，工具函数 camelCase，数据库列名 camelCase
2. 样式优先 Tailwind，复杂样式用 antd props
3. 日期统一 dayjs
4. finance 写入必须带 id
5. finance_summary 前端只读，不提供写入口
6. 新增事项类型一律走 `addCustomActionType`，禁止硬编码
