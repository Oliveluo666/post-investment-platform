import { useEffect, useState, lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Spin } from 'antd'
import MainLayout from './layouts/MainLayout.jsx'
import LoginPage from './pages/LoginPage.jsx'
import { getAuth, isDemoMode } from './services/cloudbaseClient.js'
import { syncFromCloud, setCloudReady } from './data/store.js'

// 路由级懒加载：各页面（含 echarts/xlsx 等重依赖）按需加载，降低首屏体积
const ImportPage = lazy(() => import('./pages/ImportPage.jsx'))
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'))
const ProjectDetail = lazy(() => import('./pages/ProjectDetail.jsx'))
const ProjectCreate = lazy(() => import('./pages/ProjectCreate.jsx'))
const ProjectEdit = lazy(() => import('./pages/ProjectEdit.jsx'))
const FinancePage = lazy(() => import('./pages/FinancePage.jsx'))
const Tasks = lazy(() => import('./pages/Tasks.jsx'))
const StaffPage = lazy(() => import('./pages/StaffPage.jsx'))
const FinanceSummary = lazy(() => import('./pages/FinanceSummary.jsx'))

const PageLoading = (
  <div className="min-h-[60vh] flex items-center justify-center">
    <Spin size="large" tip="页面加载中…" />
  </div>
)

/** 启动时检查已有会话，已登录则自动同步云端数据
 * 关键：publishable key 模式下 SDK 会自动建立匿名 session，
 * 必须判断是否真实用户登录（非匿名），否则任何人都能看到数据。
 * 演示模式（VITE_DEMO_MODE=true）下直接放行，使用本地示例数据。
 */
function useSession() {
  const [status, setStatus] = useState('checking') // checking | authed | guest

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        // 演示模式：跳过云端会话检查，直接使用本地示例数据
        if (isDemoMode) {
          if (mounted) setStatus('authed')
          return
        }
        const auth = getAuth()
        if (!auth) {
          // 云端未配置：按未登录处理，跳转登录页（登录页会展示配置指引）
          if (mounted) setStatus('guest')
          return
        }
        const { data } = await auth.getSession()
        if (!mounted) return
        // 严格判断：session 必须存在，且 scope 不是 accessKey（匿名/publishable key）
        // SDK getSession 在匿名时返回 { session: null }，真实登录返回 { session: {...} }
        const session = data?.session
        const isRealLogin = session && session.scope !== 'accessKey' && session.access_token
        if (isRealLogin) {
          setCloudReady(true)
          setStatus('authed')
          syncFromCloud().catch((e) => console.warn('[session] 同步失败', e?.message || e))
        } else {
          setStatus('guest')
        }
      } catch (e) {
        console.warn('[session] 检查会话失败', e?.message || e)
        if (mounted) setStatus('guest')
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  return status
}

function ProtectedRoutes() {
  const status = useSession()
  if (status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spin size="large" tip="加载中…" />
      </div>
    )
  }
  if (status === 'guest') {
    return <Navigate to="/login" replace />
  }
  return (
    <Suspense fallback={PageLoading}>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="import" element={<ImportPage />} />
          <Route path="projects/new" element={<ProjectCreate />} />
          <Route path="projects/create" element={<ProjectCreate />} />
          <Route path="projects/:id" element={<ProjectDetail />} />
          <Route path="projects/:id/edit" element={<ProjectEdit />} />
          <Route path="projects/:id/finance" element={<FinancePage />} />
          <Route path="projects/:id/financial" element={<FinancePage />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="staff" element={<StaffPage />} />
          <Route path="finance-summary" element={<FinanceSummary />} />
        </Route>
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/*" element={<ProtectedRoutes />} />
    </Routes>
  )
}
