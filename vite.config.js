import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 注意：如遇到 Windows 中文路径导致的构建问题，请将项目克隆到纯英文路径下
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    open: true
  },
  build: {
    rollupOptions: {
      output: {
        // 拆分重型 vendor 为独立可缓存 chunk，配合路由懒加载降低首屏体积
        manualChunks(id) {
          if (!id || typeof id !== 'string') return undefined
          if (!id.includes('node_modules')) return undefined
          if (id.includes('@cloudbase')) return 'cloudbase'
          if (id.includes('echarts') || id.includes('zrender')) return 'echarts-vendor'
          if (id.includes('xlsx')) return 'xlsx-vendor'
          if (id.includes('docx') || id.includes('file-saver')) return 'docx-vendor'
          // react 生态整体一个 chunk，避免 react-router-dom → @remix-run/router 产生循环 chunk
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler|@remix-run)[\\/]/.test(id)) return 'react-vendor'
          if (id.includes('antd') || id.includes('@ant-design') || id.includes('rc-') || id.includes('@rc-component')) return 'antd-vendor'
          return 'vendor'
        },
      },
    },
  }
})
