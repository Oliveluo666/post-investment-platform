import cloudbase from '@cloudbase/js-sdk'

// CloudBase 环境配置（来自 .env，由 Vite 注入）
const envId = import.meta.env.VITE_CLOUDBASE_ENV_ID
const region = import.meta.env.VITE_CLOUDBASE_REGION
const accessKey = import.meta.env.VITE_CLOUDBASE_PUBLISHABLE_KEY

/**
 * 演示模式：VITE_DEMO_MODE=true 时跳过 CloudBase 初始化，
 * 应用使用内置示例数据（localStorage）运行，无需任何后端。
 */
export const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true'

/**
 * 云端配置是否完整（演示模式下视为未配置）
 */
export const isCloudConfigured = !isDemoMode && Boolean(envId && region && accessKey)

if (!isDemoMode && !isCloudConfigured) {
  console.warn(
    '[cloudbase] CloudBase 配置缺失，云端功能不可用。\n' +
    '请复制 .env.example 为 .env 并填写 VITE_CLOUDBASE_ENV_ID / VITE_CLOUDBASE_REGION / VITE_CLOUDBASE_PUBLISHABLE_KEY，\n' +
    '或设置 VITE_DEMO_MODE=true 进入演示模式。'
  )
}

// 初始化 SDK（单例）
let _app = null
let _auth = null
let _db = null

function ensureApp() {
  if (_app) return _app
  if (!isCloudConfigured) return null
  _app = cloudbase.init({
    env: envId,
    region,
    accessKey, // publishable key（前端 SDK 3.x 用 accessKey 字段）
  })
  return _app
}

/**
 * 获取 auth 实例（登录/登出/会话）
 * - signInWithPassword({ username, password }) -> { data: { user, session }, error }
 * - getSession() -> { data: session | null }
 * - signOut()
 * - onAuthStateChange(cb) -> unsubscribe
 *
 * 未配置云端时返回 null，调用方需自行判空。
 */
export function getAuth() {
  if (_auth) return _auth
  const app = ensureApp()
  if (!app) return null
  _auth = app.auth({ persistence: 'local' })
  return _auth
}

/**
 * 获取 PG 数据库客户端（app.rdb()）
 * Supabase 风格 API：from(table).select/insert/upsert/update/delete/.eq/.in/.order
 * 返回 Promise<{ data, error, count, status, statusText }>
 *
 * 未配置云端时返回 null，调用方需自行判空。
 */
export function getDB() {
  if (_db) return _db
  const app = ensureApp()
  if (!app) return null
  _db = app.rdb()
  return _db
}

export { envId, region }
export default ensureApp
