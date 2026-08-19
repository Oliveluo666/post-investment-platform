/**
 * 云函数：clearBusinessData
 * 以管理员权限清空项目相关的业务数据（绕过 RLS），用于重新导入前的数据清理。
 *
 * 清理范围：
 *   projects / finance / timelines / highlights / equity / todos
 * 保留：
 *   users（员工库）、audit_logs（审计日志）
 */
const cloudbase = require('@cloudbase/node-sdk')

// 按依赖顺序：先子表后主表
const TABLES = ['finance', 'timelines', 'highlights', 'equity', 'todos', 'projects']

exports.main = async (event) => {
  try {
    const envId =
      process.env.TCB_ENV_ID ||
      process.env.SCF_NAMESPACE ||
      cloudbase.SYMBOL_CURRENT_ENV
    const app = cloudbase.init({ env: envId })
    const db = app.rdb({ database: 'public' })

    const result = {}
    for (const table of TABLES) {
      // 先统计数量
      const { count } = await db
        .from(table)
        .select('*', { head: true, count: 'exact' })

      // 删除全表：id 为主键，neq 空字符串即匹配所有行
      const { error } = await db.from(table).delete().neq('id', '')

      if (error) {
        console.error(`[clearBusinessData] 删除 ${table} 失败:`, error)
        result[table] = { deleted: 0, error: error.message || String(error) }
      } else {
        console.log(`[clearBusinessData] 已清空 ${table}，原记录数 ${count ?? '?'}`)
        result[table] = { deleted: count ?? null, error: null }
      }
    }

    const hasError = Object.values(result).some((r) => r.error)
    return {
      code: hasError ? -1 : 0,
      message: hasError ? '部分表清理失败，详见 result' : '业务数据已全部清空',
      result,
    }
  } catch (e) {
    console.error('[clearBusinessData] 异常:', e)
    return { code: -1, message: e.message || '清理异常' }
  }
}
