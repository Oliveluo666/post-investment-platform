# Scripts 目录说明

本目录包含数据初始化与导入辅助脚本。

## 文件清单

| 文件 | 用途 |
|---|---|
| `schema.sql` | **数据库初始化脚本**（10 张表 + RLS 策略 + is_admin 函数 + 种子数据）。在 CloudBase 控制台 SQL 窗口执行 |

## 使用方式

### 1. 初始化数据库

在 CloudBase 控制台 → 数据库 → SQL 执行窗口中，粘贴并执行 `schema.sql` 全文。

### 2. 获取导入模板

登录系统后进入「批量导入」页面，点击「下载模板」按钮即可获取标准 Excel 模板
（一个 Sheet = 一个项目，由 `src/utils/importTemplate.js` 的 `downloadTemplate()` 生成）。

### 3. 批量导入

在「批量导入」页面上传按模板填写的 Excel 文件即可。
字段规范详见 `docs/投后数据批量导入规范.md`。
