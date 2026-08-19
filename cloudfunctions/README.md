# CloudBase 云函数

本目录包含 6 个云函数，用于执行需要管理员权限的操作（绕过前端 RLS 限制）。
所有函数已使用 `cloudbase.SYMBOL_CURRENT_ENV` 自动绑定当前环境，无需修改代码即可部署到你自己的 CloudBase 环境。

## 函数清单

| 函数 | 职责 | 对应前端功能 |
|---|---|---|
| `submitRegisterApplication` | 匿名状态下以管理员权限写入注册申请（users 表 status=pending） | 登录页「注册账号」 |
| `createAuthUser` | 审核通过后创建 CloudBase Auth 账号（externalUser 类型） | 员工库「待审核申请 → 通过」 |
| `updateAuthPassword` | 重置用户密码（manager-node modifyUser） | 员工库「编辑 → 重置密码」 |
| `fixUserStatus` | 修复用户 status 脏数据 | 运维工具 |
| `clearBusinessData` | 清空业务数据（保留 users/audit_logs） | 运维工具 |
| `setHostingFallback` | 配置静态托管 SPA 回退（404 → index.html） | 部署后一次性执行 |

## 依赖说明

- 所有函数依赖 `@cloudbase/node-sdk`
- `createAuthUser` / `updateAuthPassword` 额外依赖 `@cloudbase/manager-node`
- 各函数目录下的 `package.json` 已声明依赖，部署时会自动安装

## 部署方式

### 方式一：CloudBase CLI（推荐）

```bash
# 安装 CLI
npm install -g @cloudbase/cli

# 登录
tcb login

# 进入函数目录并部署（以 submitRegisterApplication 为例）
cd cloudfunctions/submitRegisterApplication
tcb fn deploy submitRegisterApplication -e your-env-id

# 其余函数同理
```

### 方式二：控制台上传

1. 打开 CloudBase 控制台 → 云函数 → 新建云函数
2. 函数名与目录名保持一致
3. 将对应目录下的 `index.js` 和 `package.json` 内容粘贴/上传
4. 运行环境选择 Node.js 16+

## 注意事项

- 云函数运行时自动获得管理员权限，可绕过 RLS，请勿在函数中暴露敏感操作给未授权调用方
- `clearBusinessData` 会清空全部业务数据，建议仅在测试环境使用
- 前端调用方式：`app.callFunction({ name: '函数名', data: {...} })`
