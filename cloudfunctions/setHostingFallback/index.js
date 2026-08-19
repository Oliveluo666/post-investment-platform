/**
 * 云函数：setHostingFallback
 * 配置静态网站托管的 SPA 回退：将错误文档指向 index.html
 * 这样访问 /dashboard、/staff 等深层路径时，服务端返回 index.html，由前端 HashRouter 接管，不再 404
 */
const CloudBase = require('@cloudbase/manager-node')

exports.main = async (event, context) => {
  try {
    const envId =
      process.env.TCB_ENV_ID ||
      context?.environment?.TCB_ENV_ID ||
      process.env.SCF_NAMESPACE ||
      cloudbase.SYMBOL_CURRENT_ENV
    const app = CloudBase.init({ envId })

    const result = await app.hosting.setWebsiteDocument({
      indexDocument: 'index.html',
      errorDocument: 'index.html',
      routingRules: [
        {
          httpErrorCodeReturnedEquals: '404',
          replaceKeyWith: 'index.html',
        },
      ],
    })

    console.log('[debug] setWebsiteDocument result:', JSON.stringify(result))

    // 回读配置，验证 RoutingRules 是否写入
    let config = null
    try {
      const c = await app.hosting.getWebsiteConfig()
      config = c?.WebsiteConfiguration
    } catch (e2) {
      config = 'read-fail:' + e2.message
    }
    console.log('[debug] getWebsiteConfig:', JSON.stringify(config))

    return {
      code: 0,
      message: 'SPA 回退配置成功',
      data: { statusCode: result?.statusCode, config },
    }
  } catch (e) {
    console.error('[setHostingFallback] 配置失败:', e)
    return { code: -1, message: e.message || '配置失败' }
  }
}
