/**
 * 云函数：createAuthUser
 * 管理员审核通过注册申请后调用，创建 CloudBase Auth 账号
 *
 * 使用 @cloudbase/manager-node 的 app.user.createUser() 接口
 * 云函数环境自动使用内置管理员权限，无需手动传入 secretId/secretKey
 */
const CloudBase = require('@cloudbase/manager-node')

exports.main = async (event, context) => {
  const { email, password, name, nickName, phone } = event

  if (!email || !password || !name) {
    return { code: -1, message: '缺少必填参数：email、password、name' }
  }

  if (password.length < 8 || password.length > 32) {
    return { code: -1, message: '密码长度需 8~32 位' }
  }

  try {
    // 初始化 manager-node（不传 secretId/secretKey，自动使用云函数内置管理员权限）
    // 显式传入 envId，避免 DescribeEnvInfo 报错
    const envId =
      process.env.TCB_ENV_ID ||
      context?.environment?.TCB_ENV_ID ||
      process.env.SCF_NAMESPACE ||
      cloudbase.SYMBOL_CURRENT_ENV
    const app = CloudBase.init({ envId })

    // 用户名 = 邮箱 @ 前的部分（邮箱即用户名）。
    // CloudBase 用户名只允许字母、数字、. _ -，不允许 @ 等符号；
    // 登录方式「用户名密码登录」已开启（UserNameLogin=true），
    // 前端登录时会把用户输入的邮箱取 @ 前部分作为 username 校验，此处保持一致。
    let cleanName = String(name || email).split('@')[0].trim()
    cleanName = cleanName.replace(/[^a-zA-Z0-9._-]/g, '')
    if (!/^[a-zA-Z0-9]/.test(cleanName)) cleanName = 'u_' + cleanName
    if (!cleanName) cleanName = 'user_' + Date.now()
    if (cleanName.length > 64) cleanName = cleanName.slice(0, 64)

    let cleanNick = String(nickName || name).trim()
    if (cleanNick.length < 2) cleanNick = cleanNick + '_user'
    if (cleanNick.length > 64) cleanNick = cleanNick.slice(0, 64)

    const params = {
      name: cleanName,
      password: password,
      // 使用 externalUser（外部用户）而非 internalUser（组织成员）：
      // internalUser 受套餐「组织成员」配额限制（本环境仅 3 个，已满），
      // externalUser 不受该配额限制，且同样支持用户名密码登录，业务权限仍由 users 表 role 控制。
      type: 'externalUser',
      nickName: cleanNick,
      email: email,
      phone: phone || '',
      userStatus: 'ACTIVE',
    }

    console.log('[debug] params:', JSON.stringify(params))

    const result = await app.user.createUser(params)
    console.log('[debug] result:', JSON.stringify(result))

    return {
      code: 0,
      data: { uid: result?.Data?.Uid || '' },
    }
  } catch (e) {
    console.error('[createAuthUser] 创建用户失败:', e)
    return { code: -1, message: e.message || '创建用户失败' }
  }
}