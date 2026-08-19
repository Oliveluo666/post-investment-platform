-- =====================================================================
-- Post-Investment Platform 数据库初始化脚本
-- 适用：腾讯云 CloudBase PostgreSQL
-- 用法：在 CloudBase 控制台 → 数据库 → SQL 执行窗口中整段运行
-- 内容：10 张业务表 + is_admin() 函数 + RLS 行级安全策略 + 管理员种子
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. projects 投资项目
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
  id                  text PRIMARY KEY,
  name                text,
  industry            text,
  tags                jsonb,
  "investDate"        text,
  "investAmount"      numeric,
  "investAmountDisplay" text,
  "investType"        text,
  investors           jsonb,
  status              text,
  clauses             jsonb,
  description         text,
  "teamSize"          text,
  website             text,
  attachments         jsonb,
  "createdAt"         text,
  "updatedAt"         text,
  "createdBy"         varchar,
  "contactPerson"     text,
  "contactPhone"      text,
  round               text,
  valuation           numeric,
  directors           jsonb,
  imported            boolean
);

-- ---------------------------------------------------------------------
-- 2. finance 财务数据
--    注意：id 为 text 必填无默认值，写入时必须由前端生成 uuid
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS finance (
  id                  text PRIMARY KEY,
  "projectId"         text,
  period              text,
  year                integer,
  quarter             integer,
  revenue             numeric,
  "grossProfit"       numeric,
  "netProfit"         numeric,
  "debtRatio"         numeric,
  "operatingCashFlow" numeric
);

-- 同项目同期间唯一（用于 upsert onConflict）
CREATE UNIQUE INDEX IF NOT EXISTS finance_project_period_idx
  ON finance ("projectId", period);

-- ---------------------------------------------------------------------
-- 3. timelines 时间轴事件
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS timelines (
  id          text PRIMARY KEY,
  "projectId" text,
  date        text,
  type        text,
  "typeLabel" text,
  title       text,
  description text,
  operator    text,
  attachments jsonb
);

-- ---------------------------------------------------------------------
-- 4. equity 股权变更
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS equity (
  id           text PRIMARY KEY,
  "projectId"  text,
  date         text,
  round        text,
  title        text,
  description  text,
  shareholders jsonb,
  operator     text,
  "createdAt"  text
);

-- ---------------------------------------------------------------------
-- 5. todos 待办事项
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS todos (
  id           text PRIMARY KEY,
  "projectId"  text,
  "projectName" text,
  title        text,
  type         text,
  "typeLabel"  text,
  "dueDate"    text,
  priority     text,
  status       text,
  "desc"       text,
  attachment   text,
  "doneAt"     text,
  remark       text
);

-- ---------------------------------------------------------------------
-- 6. highlights 数据亮点
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS highlights (
  id          text PRIMARY KEY,
  "projectId" text,
  text        text,
  tone        text,
  chart       text,
  auto        boolean
);

-- ---------------------------------------------------------------------
-- 7. users 员工库
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id          text PRIMARY KEY,
  uid         text,
  name        text,
  email       text,
  role        text,
  phone       text,
  department  text,
  status      text,
  password    text,
  source      text,
  "createdAt" text
);

-- ---------------------------------------------------------------------
-- 8. audit_logs 操作日志
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id     text PRIMARY KEY,
  time   text,
  "user" text,
  role   text,
  action text,
  target text,
  detail text
);

-- ---------------------------------------------------------------------
-- 9. finance_summary KISP 财报汇总（隔离设计，导入流程不触碰）
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS finance_summary (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company     text,
  sheet       text,           -- balance / income / cashflow / equity
  payload     jsonb,          -- { periods[6], items[{name, values[6]}] }，单位万元
  "updatedAt" timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS finance_summary_company_sheet_idx
  ON finance_summary (company, sheet);

-- ---------------------------------------------------------------------
-- 10. action_types 自定义事项类型（全团队共享）
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS action_types (
  id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  value text UNIQUE,
  label text
);

-- ---------------------------------------------------------------------
-- is_admin()：判断当前登录用户是否为管理员
-- SECURITY DEFINER：以函数所有者权限执行，绕过 users 表 RLS
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE uid = auth.uid()::text AND role = 'admin'
  );
$$;

-- =====================================================================
-- RLS 行级安全策略
-- =====================================================================

-- 启用 RLS
ALTER TABLE projects        ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance         ENABLE ROW LEVEL SECURITY;
ALTER TABLE timelines       ENABLE ROW LEVEL SECURITY;
ALTER TABLE equity          ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos           ENABLE ROW LEVEL SECURITY;
ALTER TABLE highlights      ENABLE ROW LEVEL SECURITY;
ALTER TABLE users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_types    ENABLE ROW LEVEL SECURITY;

-- 通用读写策略：authenticated 可 SELECT/INSERT/UPDATE
-- （projects / finance / timelines / equity / todos / highlights / audit_logs）
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['projects','finance','timelines','equity','todos','highlights','audit_logs']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_select ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_insert ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_update ON %I', t, t);
    EXECUTE format('CREATE POLICY %I_select ON %I FOR SELECT TO authenticated USING (true)', t, t);
    EXECUTE format('CREATE POLICY %I_insert ON %I FOR INSERT TO authenticated WITH CHECK (true)', t, t);
    EXECUTE format('CREATE POLICY %I_update ON %I FOR UPDATE TO authenticated USING (true)', t, t);
  END LOOP;
END $$;

-- projects：DELETE 仅 admin
DROP POLICY IF EXISTS projects_delete ON projects;
CREATE POLICY projects_delete ON projects
  FOR DELETE TO authenticated USING (is_admin());

-- users：SELECT 所有 authenticated；INSERT admin 或本人；UPDATE authenticated；DELETE 仅 admin
DROP POLICY IF EXISTS users_select ON users;
CREATE POLICY users_select ON users FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS users_insert ON users;
CREATE POLICY users_insert ON users FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR (uid = auth.uid()::text AND role = 'post'));

-- 匿名注册申请：允许 anon 插入 status='pending' 的申请（配合登录页自助注册）
DROP POLICY IF EXISTS users_insert_anon ON users;
CREATE POLICY users_insert_anon ON users FOR INSERT TO anon
  WITH CHECK (status = 'pending');

DROP POLICY IF EXISTS users_update ON users;
CREATE POLICY users_update ON users FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS users_delete ON users;
CREATE POLICY users_delete ON users FOR DELETE TO authenticated USING (is_admin());

-- finance_summary：SELECT 所有 authenticated；写操作仅 admin
DROP POLICY IF EXISTS finance_summary_select ON finance_summary;
CREATE POLICY finance_summary_select ON finance_summary FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS finance_summary_insert ON finance_summary;
CREATE POLICY finance_summary_insert ON finance_summary FOR INSERT TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS finance_summary_update ON finance_summary;
CREATE POLICY finance_summary_update ON finance_summary FOR UPDATE TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS finance_summary_delete ON finance_summary;
CREATE POLICY finance_summary_delete ON finance_summary FOR DELETE TO authenticated
  USING (is_admin());

-- action_types：SELECT/INSERT 所有 authenticated（任何员工可新增类型）；UPDATE/DELETE 仅 admin
DROP POLICY IF EXISTS action_types_select ON action_types;
CREATE POLICY action_types_select ON action_types FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS action_types_insert ON action_types;
CREATE POLICY action_types_insert ON action_types FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS action_types_update ON action_types;
CREATE POLICY action_types_update ON action_types FOR UPDATE TO authenticated USING (is_admin());

DROP POLICY IF EXISTS action_types_delete ON action_types;
CREATE POLICY action_types_delete ON action_types FOR DELETE TO authenticated USING (is_admin());

-- =====================================================================
-- 管理员种子记录（users 表）
-- 注意：这只是业务表记录，对应的 CloudBase Auth 账号需另行创建：
--   方式 1：部署 cloudfunctions/createAuthUser 后通过「员工库」界面添加
--   方式 2：CloudBase 控制台 → 身份认证 → 用户管理 → 手动创建用户名密码用户
-- 创建 Auth 账号后，将其真实 UID 回填到下方记录的 uid 字段。
-- =====================================================================
INSERT INTO users (id, uid, name, email, role, phone, department, status, source, "createdAt")
VALUES (
  'seed-admin',
  '',  -- TODO: 创建 Auth 账号后回填真实 UID
  '管理员',
  'admin@example.com',
  'admin',
  '',
  '',
  'active',
  'manual',
  now()::text
)
ON CONFLICT (id) DO NOTHING;

-- 内置事项类型种子
INSERT INTO action_types (value, label) VALUES
  ('board_meeting',     '董事会会议'),
  ('financial_review',  '财务审查'),
  ('contract_review',   '合同审核'),
  ('legal_review',      '法务审核'),
  ('risk_assessment',   '风险评估'),
  ('compliance_check',  '合规检查'),
  ('report_submission', '报告提交'),
  ('other',             '其他')
ON CONFLICT (value) DO NOTHING;
