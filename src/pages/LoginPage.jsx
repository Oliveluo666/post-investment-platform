import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Input, Button, Typography, App, Select, Steps, Form, Space, Alert } from 'antd'
import { UserOutlined, LockOutlined, MailOutlined, PhoneOutlined, TeamOutlined, ArrowLeftOutlined, RocketOutlined } from '@ant-design/icons'
import { getAuth, getDB, isDemoMode, isCloudConfigured } from '../services/cloudbaseClient.js'
import { syncFromCloud, setCloudReady, setSession, addUser } from '../data/store.js'

const { Title, Text, Paragraph } = Typography

const ROLE_OPTIONS = [
  { value: 'post', label: '投后经理' },
  { value: 'risk', label: '风控专员' },
  { value: 'finance', label: '财务专员' },
]

export default function LoginPage() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [mode, setMode] = useState('login') // 'login' | 'register' | 'success'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  // 注册表单
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regRole, setRegRole] = useState('post')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirm, setRegConfirm] = useState('')

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      message.warning('请输入邮箱和密码')
      return
    }
    setLoading(true)
    try {
      const auth = getAuth()
      if (!auth) {
        message.error('云端未配置：请检查 .env 中的 CloudBase 配置，或设置 VITE_DEMO_MODE=true 进入演示模式')
        return
      }
      // 邮箱即用户名：用户名 = 邮箱 @ 前的部分（与添加员工时创建的 Auth 用户名一致）。
      // CloudBase 用户名不允许 @ 符号，故登录时取前缀作为 username 校验。
      const rawInput = username.trim()
      const loginName = rawInput.includes('@') ? rawInput.split('@')[0].trim() : rawInput
      const { data, error } = await auth.signInWithPassword({ username: loginName, password })
      if (error) {
        message.error(`登录失败：${error.message || error.msg || JSON.stringify(error)}`)
        return
      }
      message.success('登录成功，正在同步数据…')
      setCloudReady(true)
      await syncFromCloud()
      const uid = data?.user?.uid || data?.user?.id || data?.session?.uid
      const uname = data?.user?.username || data?.user?.name || username.trim()
      let role = 'post'
      try {
        const db = getDB()
        // 以邮箱（用户名）为准查员工表，校验角色与在职状态
        const { data: userRow, error: ue } = await db
          .from('users')
          .select('role,name,status')
          .eq('email', rawInput)
          .maybeSingle()
        if (!ue && userRow) {
          // 仅「在职」可登录
          if (userRow.status !== 'active') {
            if (userRow.status === 'inactive') message.error('账号已被停用，请联系管理员')
            else if (userRow.status === 'pending') message.error('账号尚未审核通过，请联系管理员')
            else message.error('账号状态异常，请联系管理员')
            return
          }
          role = userRow.role || 'post'
          setSession({
            role,
            userName: userRow.name || uname,
            userId: String(uid),
          })
        } else {
          setSession({ role, userName: uname, userId: String(uid) })
        }
      } catch (e) {
        console.warn('[login] 查询用户角色失败', e?.message || e)
        setSession({ role, userName: uname, userId: String(uid) })
      }
      navigate('/dashboard', { replace: true })
    } catch (e) {
      message.error(`登录异常：${e?.message || e}`)
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async () => {
    if (!regName.trim()) { message.warning('请输入姓名'); return }
    if (!regEmail.trim()) { message.warning('请输入公司邮箱'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail)) { message.warning('邮箱格式不正确'); return }
    if (!regPhone.trim()) { message.warning('请输入手机号'); return }
    if (!/^1\d{10}$/.test(regPhone)) { message.warning('手机号格式不正确（11位数字）'); return }
    if (!regPassword) { message.warning('请设置密码'); return }
    if (regPassword.length < 8) { message.warning('密码长度至少8位'); return }
    // 密码强度：需包含大写、小写、数字、特殊字符中至少3类
    const strengthChecks = [/[A-Z]/.test(regPassword), /[a-z]/.test(regPassword), /\d/.test(regPassword), /[^A-Za-z0-9]/.test(regPassword)]
    const strength = strengthChecks.filter(Boolean).length
    if (strength < 3) {
      message.warning('密码强度不足，需包含大写字母、小写字母、数字、特殊字符中至少3类')
      return
    }
    if (regPassword !== regConfirm) { message.warning('两次输入的密码不一致'); return }

    setLoading(true)
    try {
      // 本地先缓存（用于当前浏览器回显）
      const user = addUser({
        name: regName.trim(),
        email: regEmail.trim(),
        phone: regPhone.trim(),
        role: regRole,
        password: regPassword, // 暂存密码，审核通过后由云函数创建 Auth 账号
        status: 'pending',
        source: 'register',
      })

      // 先匿名登录建立 session（控制台已开启「匿名登录」），再以 anon 身份写入云端 users 表。
      // 已为 anon 角色开放 INSERT 权限，且 RLS 策略 users_insert_anon 允许匿名插入 status='pending' 的申请。
      // 注意：用 insert（而非 upsert），因为 upsert 的 DO UPDATE 需要 anon 不具备的 UPDATE 权限。
      let cloudOk = false
      try {
        const auth = getAuth()
        if (!auth) {
          // 云端未配置：跳过云端写入，仅保留本地申请
          console.warn('[register] 云端未配置，跳过云端写入')
        } else {
        const { error: anonErr } = await auth.signInAnonymously()
        if (anonErr) {
          console.warn('[register] 匿名登录失败:', anonErr)
        } else {
          const db = getDB()
          const { error } = await db.from('users').insert({
            id: user.id,
            uid: user.id, // 临时 uid，审核通过后由 createAuthUser 返回的真实 uid 覆盖
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            department: user.department || '',
            status: 'pending',
            password: regPassword,
            source: 'register',
            createdAt: user.createdAt,
          })
          cloudOk = !error
          if (error) console.warn('[register] 云端写入失败:', error)
        }
        }
      } catch (e) {
        console.warn('[register] 云端写入异常:', e?.message || e)
      }

      setMode('success')
      if (cloudOk) {
        message.success('注册申请已提交，请等待管理员审核')
      } else {
        message.warning('申请已提交本地，但云端同步失败，请联系管理员')
      }
    } catch (e) {
      message.error(`注册失败：${e?.message || e}`)
    } finally {
      setLoading(false)
    }
  }

  const renderLogin = () => (
    <>
      {isDemoMode && (
        <div className="mb-5">
          <Alert
            type="success"
            showIcon
            message="演示模式"
            description="当前使用内置示例数据运行，无需后端配置。"
            style={{ marginBottom: 12 }}
          />
          <Button
            type="primary"
            size="large"
            block
            icon={<RocketOutlined />}
            onClick={() => navigate('/dashboard', { replace: true })}
            style={{ fontWeight: 600 }}
          >
            进入演示
          </Button>
        </div>
      )}
      {!isDemoMode && !isCloudConfigured && (
        <Alert
          type="warning"
          showIcon
          message="云端未配置"
          description={
            <span>
              请复制 <code>.env.example</code> 为 <code>.env</code> 并填入 CloudBase 配置，
              或设置 <code>VITE_DEMO_MODE=true</code> 进入演示模式。详见 README.md。
            </span>
          }
          style={{ marginBottom: 16 }}
        />
      )}
      <div className="flex flex-col gap-3">
        <Input
          size="large"
          prefix={<MailOutlined style={{ color: '#94a3b8' }} />}
          placeholder="邮箱"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onPressEnter={handleLogin}
          autoComplete="username"
        />
        <Input.Password
          size="large"
          prefix={<LockOutlined style={{ color: '#94a3b8' }} />}
          placeholder="密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onPressEnter={handleLogin}
          autoComplete="current-password"
        />
        <Button
          type="primary"
          size="large"
          block
          loading={loading}
          onClick={handleLogin}
          style={{ marginTop: 6, fontWeight: 600 }}
        >
          登 录
        </Button>
      </div>

      <div className="mt-6 pt-5 border-t border-slate-100 text-center">
        <Button type="link" onClick={() => setMode('register')} style={{ padding: 0 }}>
          还没有账号？注册账号
        </Button>
      </div>
    </>
  )

  const renderRegister = () => (
    <>
      <div className="flex items-center mb-5">
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => setMode('login')}
          style={{ marginRight: 8 }}
        />
        <Text strong style={{ fontSize: 15 }}>注册账号</Text>
      </div>

      <div className="flex flex-col gap-3">
        <Input
          size="large"
          prefix={<UserOutlined style={{ color: '#94a3b8' }} />}
          placeholder="姓名"
          value={regName}
          onChange={(e) => setRegName(e.target.value)}
        />
        <Select
          size="large"
          value={regRole}
          onChange={setRegRole}
          options={ROLE_OPTIONS}
          prefix={<TeamOutlined style={{ color: '#94a3b8' }} />}
          style={{ width: '100%' }}
        />
        <Input
          size="large"
          prefix={<MailOutlined style={{ color: '#94a3b8' }} />}
          placeholder="公司邮箱"
          value={regEmail}
          onChange={(e) => setRegEmail(e.target.value)}
          autoComplete="email"
        />
        <Input
          size="large"
          prefix={<PhoneOutlined style={{ color: '#94a3b8' }} />}
          placeholder="手机号"
          value={regPhone}
          onChange={(e) => setRegPhone(e.target.value)}
          autoComplete="tel"
        />
        <Input.Password
          size="large"
          prefix={<LockOutlined style={{ color: '#94a3b8' }} />}
          placeholder="设置密码（至少8位，需包含大写、小写、数字、特殊字符中至少3类）"
          value={regPassword}
          onChange={(e) => setRegPassword(e.target.value)}
          autoComplete="new-password"
        />
        <Input.Password
          size="large"
          prefix={<LockOutlined style={{ color: '#94a3b8' }} />}
          placeholder="确认密码"
          value={regConfirm}
          onChange={(e) => setRegConfirm(e.target.value)}
          autoComplete="new-password"
        />
        <Button
          type="primary"
          size="large"
          block
          loading={loading}
          onClick={handleRegister}
          style={{ marginTop: 6, fontWeight: 600 }}
        >
          提交注册申请
        </Button>
      </div>

      <div className="mt-4 text-center">
        <Text type="secondary" style={{ fontSize: 12 }}>
          提交后需管理员审核通过方可登录
        </Text>
      </div>
    </>
  )

  const renderSuccess = () => (
    <div className="flex flex-col items-center py-4">
      <div
        className="flex items-center justify-center rounded-full mb-4"
        style={{
          width: 64,
          height: 64,
          background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
        }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path d="M5 13L9 17L19 7" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <Title level={5} style={{ margin: 0 }}>注册申请已提交</Title>
      <Paragraph type="secondary" style={{ textAlign: 'center', marginTop: 8, marginBottom: 20 }}>
        请等待系统管理员审核您的申请
        <br />
        审核通过后您将可以使用邮箱登录系统
      </Paragraph>
      <Button type="primary" onClick={() => setMode('login')} style={{ fontWeight: 600 }}>
        返回登录
      </Button>
    </div>
  )

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background:
          'radial-gradient(1200px 600px at 20% 10%, rgba(37,99,235,0.08), transparent), radial-gradient(900px 500px at 90% 80%, rgba(6,182,212,0.06), transparent), #f8fafc',
      }}
    >
      <Card
        className="w-full"
        style={{ maxWidth: 420, borderRadius: 16, boxShadow: '0 12px 40px -8px rgba(15,23,42,0.12)' }}
        styles={{ body: { padding: 36 } }}
      >
        <div className="flex flex-col items-center mb-7">
          <div
            className="flex items-center justify-center rounded-xl mb-4"
            style={{
              width: 52,
              height: 52,
              background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 50%, #06b6d4 100%)',
              boxShadow: '0 6px 18px -4px rgba(37,99,235,0.5), inset 0 1px 0 0 rgba(255,255,255,0.25)',
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 17L9 11L13 15L21 7" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M15 7H21V13" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <Title level={4} style={{ margin: 0, fontWeight: 700, letterSpacing: '-0.02em' }}>
            投后管理工作台
          </Title>
          <Text type="secondary" style={{ fontSize: 12, marginTop: 4 }}>
            Post-Invest Workbench
          </Text>
        </div>

        {mode === 'login' && renderLogin()}
        {mode === 'register' && renderRegister()}
        {mode === 'success' && renderSuccess()}
      </Card>
    </div>
  )
}
