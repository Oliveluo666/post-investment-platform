/**
 * 云函数：fixUserStatus
 * 以管理员权限更新 users 表某员工的 status（绕过 RLS），用于修复历史脏数据。
 */
const cloudbase = require('@cloudbase/node-sdk')

exports.main = async (event) => {
  const { email, status } = event || {}

  if (!email || !status) {
    return { code: -1, message: '缺少必填参数：email、status' }
  }

  const allowed = ['active', 'inactive', 'pending', 'rejected']
  if (!allowed.includes(status)) {
    return { code: -1, message: 'status 不合法，可选：' + allowed.join('/') }
  }

  try {
    const envId =
      process.env.TCB_ENV_ID ||
      process.env.SCF_NAMESPACE ||
      cloudbase.SYMBOL_CURRENT_ENV
    const app = cloudbase.init({ env: envId })
    // 显式指定 schema 为 public，与前端 js-sdk 默认行为一致
    const db = app.rdb({ database: 'public' })

    const { data, error } = await db
      .from('users')
      .update({ status })
      .eq('email', String(email).trim())
      .select()

    if (error) {
      console.error('[fixUserStatus] 更新失败:', error)
      return { code: -1, message: error.message || '更新失败' }
    }

    return { code: 0, data: data || [] }
  } catch (e) {
    console.error('[fixUserStatus] 异常:', e)
    return { code: -1, message: e.message || '更新异常' }
  }
}
