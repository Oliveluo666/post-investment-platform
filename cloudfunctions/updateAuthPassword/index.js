/**
 * 云函数：updateAuthPassword
 * 管理员在员工库编辑中重置用户密码时调用，更新 CloudBase Auth 账号密码
 *
 * 使用 @cloudbase/manager-node 的 app.user.modifyUser() 接口
 * 云函数环境自动使用内置管理员权限，无需手动传入 secretId/secretKey
 */
const CloudBase = require('@cloudbase/manager-node')

exports.main = async (event, context) => {
  const { uid, password } = event

  if (!uid) {
    return { code: -1, message: '缺少必填参数：uid' }
  }

  if (!password) {
    return { code: -1, message: '缺少必填参数：password' }
  }

  if (password.length < 8 || password.length > 32) {
    return { code: -1, message: '密码长度需 8~32 位' }
  }

  try {
    // 初始化 manager-node（不传 secretId/secretKey，自动使用云函数内置管理员权限）
    const envId =
      process.env.TCB_ENV_ID ||
      context?.environment?.TCB_ENV_ID ||
      process.env.SCF_NAMESPACE ||
      cloudbase.SYMBOL_CURRENT_ENV
    const app = CloudBase.init({ envId })

    const result = await app.user.modifyUser({
      uid: String(uid),
      password: password,
    })
    console.log('[debug] result:', JSON.stringify(result))

    return { code: 0, data: { uid: String(uid) } }
  } catch (e) {
    console.error('[updateAuthPassword] 更新密码失败:', e)
    return { code: -1, message: e.message || '更新密码失败' }
  }
}