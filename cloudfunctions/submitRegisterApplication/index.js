/**
 * 云函数：submitRegisterApplication
 * 用户自助注册时调用：以管理员权限写入 users 表（status = 'pending'）
 *
 * 为什么需要云函数：users 表的 RLS 策略只允许 admin 或已登录用户 INSERT，
 * 而注册时用户尚未登录（匿名），直接从前端写 PG 会被 RLS 拒绝。
 * 云函数环境使用内置管理员权限，可绕过 RLS 安全写入。
 */
const cloudbase = require('@cloudbase/node-sdk')
const { randomUUID } = require('crypto')

exports.main = async (event) => {
  const { id, name, email, phone, role, password } = event || {}

  if (!name || !email || !phone || !password) {
    return { code: -1, message: '缺少必填参数：name、email、phone、password' }
  }

  // 密码长度校验（与前端一致）
  if (String(password).length < 8) {
    return { code: -1, message: '密码长度至少 8 位' }
  }

  try {
    const envId =
      process.env.TCB_ENV_ID ||
      process.env.SCF_NAMESPACE ||
      cloudbase.SYMBOL_CURRENT_ENV
    const app = cloudbase.init({ env: envId })
    // node-sdk 的 rdb() 默认把 database 设为 envId，导致 PostgREST 报 Invalid schema，
    // 需显式指定 schema 为 public（与前端 js-sdk 默认行为一致）
    const db = app.rdb({ database: 'public' })

    // 优先使用前端传入的 id，保证本地缓存与云端记录一致
    const rowId = id || randomUUID()
    const now = new Date().toISOString()

    const row = {
      id: rowId,
      uid: rowId, // 临时 uid，审核通过后由 createAuthUser 返回的真实 uid 覆盖
      name: String(name).trim(),
      email: String(email).trim(),
      phone: String(phone).trim(),
      role: role || 'post',
      department: '',
      status: 'pending',
      password: String(password), // 暂存，审核通过创建 Auth 账号后清空
      source: 'register',
      createdAt: now,
    }

    console.log('[submitRegisterApplication] 写入申请:', id, row.email)
    const { error } = await db.from('users').insert(row)
    if (error) {
      console.error('[submitRegisterApplication] 写入失败:', error)
      return { code: -1, message: error.message || '写入失败' }
    }

    return { code: 0, data: { id: rowId } }
  } catch (e) {
    console.error('[submitRegisterApplication] 异常:', e)
    return { code: -1, message: e.message || '写入异常' }
  }
}
