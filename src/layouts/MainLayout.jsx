import React, { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Avatar, Dropdown, Badge, Drawer, Button, Tooltip, Tag, List, Empty, Modal, Input } from 'antd'
import {
  DashboardOutlined,
  FileAddOutlined,
  CheckSquareOutlined,
  BellOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
  TeamOutlined,
  SearchOutlined,
  ClockCircleOutlined,
  SendOutlined,
  FileTextOutlined,
  WarningOutlined,
  SwapOutlined,
  AuditOutlined,
  SafetyCertificateOutlined,
  ImportOutlined,
} from '@ant-design/icons'
import { useStore, can, setRole, getRoleLabel, getAuditLogs, ROLE_LABELS, setCloudReady } from '../data/store.js'
import { getAuth } from '../services/cloudbaseClient.js'
import dayjs from 'dayjs'

const { Header, Sider, Content, Footer } = Layout

export default function MainLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = useStore()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [logOpen, setLogOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // 全局搜索快捷键 Ctrl+K / Cmd+K
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // 搜索结果：按名称/行业/联系人/简介/标签匹配
  const searchResults = (() => {
    const k = searchKeyword.trim().toLowerCase()
    if (!k) return []
    return state.projects
      .filter(
        (p) =>
          (p.name || '').toLowerCase().includes(k) ||
          (p.industry || '').toLowerCase().includes(k) ||
          (p.contactPerson || '').toLowerCase().includes(k) ||
          (p.description || '').toLowerCase().includes(k) ||
          (p.tags || []).some((t) => String(t).toLowerCase().includes(k))
      )
      .slice(0, 20)
  })()

  const getSelectedKey = () => {
    if (location.pathname.startsWith('/dashboard')) return 'dashboard'
    if (location.pathname.startsWith('/projects/create')) return 'create'
    if (location.pathname.startsWith('/projects')) return 'projects'
    if (location.pathname.startsWith('/import')) return 'import'
    if (location.pathname.startsWith('/tasks')) return 'tasks'
    if (location.pathname.startsWith('/staff')) return 'staff'
    return 'dashboard'
  }

  const overdueCount = state.todos.filter(
    (t) => t.status === 'overdue' || (t.status === 'pending' && dayjs(t.dueDate).diff(dayjs(), 'day') < 2)
  ).length

  // 底部固定栏：近期未完成事项（规格书 1.2 / 3.1）
  const recentPending = state.todos
    .filter((t) => t.status !== 'done')
    .sort((a, b) => dayjs(a.dueDate).valueOf() - dayjs(b.dueDate).valueOf())
    .slice(0, 4)

  const todoTypeIcon = (type) => {
    if (type === 'report' || type === 'annual_report') return <FileTextOutlined />
    if (type === 'inquiry' || type === 'inquiry_reply') return <SendOutlined />
    return <ClockCircleOutlined />
  }

  const todoTypeColor = (type) => {
    if (type === 'report' || type === 'annual_report') return '#2563eb'
    if (type === 'inquiry' || type === 'inquiry_reply') return '#f59e0b'
    return '#64748b'
  }

  const menuItems = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: '项目总览',
      onClick: () => {
        navigate('/dashboard')
        setMobileOpen(false)
      },
    },
    ...(can('project.create')
      ? [
          {
            key: 'create',
            icon: <FileAddOutlined />,
            label: '新增项目',
            onClick: () => {
              navigate('/projects/create')
              setMobileOpen(false)
            },
          },
          {
            key: 'import',
            icon: <ImportOutlined />,
            label: '批量导入',
            onClick: () => {
              navigate('/import')
              setMobileOpen(false)
            },
          },
        ]
      : []),
    {
      key: 'tasks',
      icon: <CheckSquareOutlined />,
      label: '待办事项',
      onClick: () => {
        navigate('/tasks')
        setMobileOpen(false)
      },
    },
    ...(can('staff.manage')
      ? [
          {
            key: 'staff',
            icon: <TeamOutlined />,
            label: '员工库',
            onClick: () => {
              navigate('/staff')
              setMobileOpen(false)
            },
          },
        ]
      : []),
  ]

  // 「切换角色」为调试功能，仅管理员可见，避免普通用户客户端自提权
  const roleSubmenu = {
    key: 'switch_role',
    icon: <SwapOutlined />,
    label: '切换角色',
    children: Object.keys(ROLE_LABELS).map((r) => ({
      key: `role_${r}`,
      label: ROLE_LABELS[r],
      icon: <SafetyCertificateOutlined />,
    })),
  }
  const isAdmin = state.session?.role === 'admin'

  const userMenu = {
    items: [
      {
        key: 'role_info',
        label: `当前角色：${getRoleLabel()}`,
        disabled: true,
        style: { fontWeight: 600, color: '#2563eb' },
      },
      ...(isAdmin ? [roleSubmenu] : []),
      { key: 'audit_log', icon: <AuditOutlined />, label: '操作日志' },
      { type: 'divider' },
      { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', danger: true },
    ],
    onClick: ({ key }) => {
      if (key.startsWith('role_')) {
        setRole(key.replace('role_', ''))
      } else if (key === 'audit_log') {
        setLogOpen(true)
      } else if (key === 'logout') {
        handleLogout()
      }
    },
  }

  const handleLogout = async () => {
    try {
      const auth = getAuth()
      if (auth) await auth.signOut()
    } catch (e) {
      console.warn('[logout] signOut 失败', e?.message || e)
    }
    setCloudReady(false)
    navigate('/login', { replace: true })
  }

  const BrandLogo = (
    <div
      className="flex items-center gap-2.5 cursor-pointer group h-full px-4"
      onClick={() => navigate('/dashboard')}
      style={{ background: 'transparent' }}
    >
      <div
        className="flex items-center justify-center rounded-lg flex-shrink-0 transition-transform group-hover:scale-105"
        style={{
          width: 32,
          height: 32,
          background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 50%, #06b6d4 100%)',
          boxShadow: '0 4px 12px -2px rgb(37 99 235 / 0.5), inset 0 1px 0 0 rgb(255 255 255 / 0.25)',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 17L9 11L13 15L21 7" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M15 7H21V13" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      {!collapsed && (
        <div className="flex flex-col leading-tight">
          <span className="text-white font-semibold text-[14px] tracking-tight">
            Post-Invest
          </span>
          <span className="text-slate-400 text-[10px] font-medium tracking-wider uppercase">
            Workbench v1.0
          </span>
        </div>
      )}
    </div>
  )

  const SiderContent = (
    <div className="h-full flex flex-col dark-scroll" style={{ background: '#0b0f1a' }}>
      {/* 品牌区 */}
      <div
        className="h-[60px] flex items-center border-b border-white/5"
        style={{ background: 'transparent' }}
      >
        {BrandLogo}
      </div>

      {/* 导航区 - 添加 section label */}
      <div className="flex-1 overflow-y-auto py-3">
        {!collapsed && (
          <div className="px-5 mb-2 section-title text-slate-500" style={{ color: '#475569' }}>
            Workspace
          </div>
        )}
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[getSelectedKey()]}
          items={menuItems}
          style={{ borderRight: 0, background: 'transparent' }}
        />
      </div>

      {/* 底部信息区 */}
      <div className="border-t border-white/5 p-3">
        {!collapsed ? (
          <div className="rounded-lg p-3" style={{ background: 'rgba(255, 255, 255, 0.03)' }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="status-dot status-dot-green" />
              <span className="text-[11px] text-slate-300 font-medium tracking-wide">SYSTEM OPERATIONAL</span>
            </div>
            <div className="text-[10px] text-slate-500 leading-relaxed">
              合规版 · 数据加密传输<br/>
              上次同步 {dayjs().format('HH:mm')}
            </div>
          </div>
        ) : (
          <Tooltip title="系统运行正常" placement="right">
            <div className="flex justify-center">
              <span className="status-dot status-dot-green" />
            </div>
          </Tooltip>
        )}
      </div>
    </div>
  )

  return (
    <Layout className="h-screen">
      {isMobile ? (
        <Drawer
          placement="left"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          width={240}
          styles={{ body: { padding: 0, background: '#0b0f1a' } }}
          closable={false}
        >
          {SiderContent}
        </Drawer>
      ) : (
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          width={232}
          collapsedWidth={68}
          className="dark-scroll"
        >
          {SiderContent}
        </Sider>
      )}

      <Layout>
        <Header
          className="flex items-center justify-between px-5 bg-white border-b border-slate-200"
          style={{ padding: isMobile ? '0 12px' : '0 24px', height: 60 }}
        >
          {/* 左侧 - 折叠按钮 + 面包屑 */}
          <div className="flex items-center gap-3">
            <Button
              type="text"
              icon={isMobile ? <MenuFoldOutlined /> : collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => {
                if (isMobile) setMobileOpen(true)
                else setCollapsed(!collapsed)
              }}
              className="!w-9 !h-9 !flex items-center justify-center hover:!bg-slate-100"
            />
            {!isMobile && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-400">投后管理工作台</span>
                <span className="text-slate-300">/</span>
                <span className="text-slate-900 font-medium">
                  {getSelectedKey() === 'dashboard' && '项目总览'}
                  {getSelectedKey() === 'create' && '新增项目'}
                  {getSelectedKey() === 'import' && '批量导入'}
                  {getSelectedKey() === 'tasks' && '待办事项'}
                  {getSelectedKey() === 'staff' && '员工库'}
                  {getSelectedKey() === 'projects' && '项目详情'}
                </span>
              </div>
            )}
            {isMobile && <span className="font-semibold text-slate-900">投后工作台</span>}
          </div>

          {/* 右侧 - 搜索 + 通知 + 用户 */}
          <div className="flex items-center gap-2">
            {!isMobile && (
              <Tooltip title="快速搜索 (Ctrl+K)">
                <Button
                  type="text"
                  icon={<SearchOutlined />}
                  onClick={() => setSearchOpen(true)}
                  className="!w-9 !h-9 !flex items-center justify-center hover:!bg-slate-100"
                />
              </Tooltip>
            )}
            <Tooltip title="待办提醒">
              <Badge count={overdueCount} size="small" offset={[-2, 2]}>
                <Button
                  type="text"
                  icon={<BellOutlined style={{ fontSize: 17 }} />}
                  onClick={() => navigate('/tasks')}
                  className="!w-9 !h-9 !flex items-center justify-center hover:!bg-slate-100"
                />
              </Badge>
            </Tooltip>

            <div className="w-px h-6 bg-slate-200 mx-1" />

            <Dropdown menu={userMenu} placement="bottomRight">
              <div className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 rounded-lg px-2 py-1 transition-colors">
                <Avatar
                  size={28}
                  style={{
                    background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                    fontWeight: 600,
                    fontSize: 13,
                  }}
                >
                  {(state.session?.userName || '用').slice(0, 1)}
                </Avatar>
                {!isMobile && (
                  <div className="flex flex-col leading-tight">
                    <span className="text-[13px] font-medium text-slate-900">
                      {state.session?.userName || '用户'}
                    </span>
                    <Tag
                      color="blue"
                      style={{ fontSize: 10, lineHeight: '14px', padding: '0 4px', marginTop: 2 }}
                    >
                      {getRoleLabel()}
                    </Tag>
                  </div>
                )}
              </div>
            </Dropdown>
          </div>
        </Header>

        <Content
          className="overflow-auto"
          style={{
            margin: isMobile ? 8 : 16,
            marginBottom: isMobile ? 4 : 8,
            padding: isMobile ? 12 : 24,
            background: '#f8fafc',
            minHeight: 280,
          }}
        >
          <Outlet />
        </Content>

        {/* 底部固定栏 - 近期未完成事项（规格书 1.2 全局可见） */}
        <Footer
          className="!p-0 !bg-white border-t border-slate-200"
          style={{ height: 'auto', flexShrink: 0 }}
        >
          <div
            className="flex items-center gap-2 px-4 sm:px-6 overflow-x-auto"
            style={{ minHeight: 40 }}
          >
            <div className="flex items-center gap-1.5 flex-shrink-0 mr-1">
              <WarningOutlined style={{ color: '#f59e0b', fontSize: 13 }} />
              <span className="text-[12px] font-semibold text-slate-700 whitespace-nowrap">
                近期未完成事项
              </span>
              <span
                className="text-[11px] font-mono font-semibold text-white px-1.5 rounded-full flex-shrink-0"
                style={{ background: '#2563eb' }}
              >
                {state.todos.filter((t) => t.status !== 'done').length}
              </span>
            </div>
            <div className="w-px h-4 bg-slate-200 flex-shrink-0" />
            {recentPending.length === 0 && (
              <span className="text-[12px] text-slate-400 whitespace-nowrap">暂无未完成事项 🎉</span>
            )}
            {recentPending.map((t) => {
              const diff = dayjs(t.dueDate).diff(dayjs(), 'day')
              const overdue = diff < 0
              return (
                <div
                  key={t.id}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md cursor-pointer hover:bg-slate-100 transition-colors flex-shrink-0"
                  onClick={() => navigate(`/projects/${t.projectId}`)}
                >
                  <span style={{ color: todoTypeColor(t.type), fontSize: 12 }}>{todoTypeIcon(t.type)}</span>
                  <span className="text-[12px] text-slate-700 whitespace-nowrap">
                    {t.projectName} - {t.title}
                  </span>
                  {overdue ? (
                    <span className="text-[10px] font-medium text-red-600 whitespace-nowrap">
                      ⚠ 超期{Math.abs(diff)}天
                    </span>
                  ) : diff === 0 ? (
                    <span className="text-[10px] font-medium text-orange-500 whitespace-nowrap">今日截止</span>
                  ) : (
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">剩{diff}天</span>
                  )}
                </div>
              )
            })}
          </div>
        </Footer>
      </Layout>

      {/* 操作留痕日志抽屉 */}
      <Drawer
        title={
          <span>
            <AuditOutlined style={{ marginRight: 8, color: '#2563eb' }} />
            操作留痕（审计日志）
          </span>
        }
        width={Math.min(720, window.innerWidth - 24)}
        open={logOpen}
        onClose={() => setLogOpen(false)}
      >
        <List
          dataSource={getAuditLogs()}
          locale={{ emptyText: <Empty description="暂无操作记录" /> }}
          renderItem={(log) => (
            <List.Item>
              <div className="w-full">
                <div className="flex items-center gap-2 flex-wrap">
                  <Tag color="blue" style={{ marginInlineEnd: 0 }}>
                    {log.role ? ROLE_LABELS[log.role] || log.role : '投后经理'}
                  </Tag>
                  <span className="text-[13px] font-medium text-slate-800">{log.action}</span>
                  <span className="text-[12px] text-slate-500">{log.target}</span>
                  <span className="text-[11px] text-slate-400 ml-auto whitespace-nowrap">{log.time}</span>
                </div>
                {log.detail && (
                  <div className="text-[12px] text-slate-500 mt-1 pl-1 border-l-2 border-blue-100">
                    {log.detail}
                  </div>
                )}
                <div className="text-[11px] text-slate-400 mt-0.5">
                  操作人：{log.user || '王经理'}
                </div>
              </div>
            </List.Item>
          )}
        />
      </Drawer>

      {/* 全局搜索弹窗 */}
      <Modal
        open={searchOpen}
        onCancel={() => setSearchOpen(false)}
        footer={null}
        closable={false}
        width={560}
        destroyOnClose
        styles={{ body: { padding: 0 } }}
      >
        <div className="p-3 border-b border-slate-100">
          <Input
            autoFocus
            size="large"
            bordered={false}
            prefix={<SearchOutlined className="text-slate-400" />}
            placeholder="搜索项目名称、行业、联系人..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            allowClear
          />
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {!searchKeyword.trim() ? (
            <div className="py-10 text-center text-slate-400 text-sm">
              输入关键词搜索项目（名称 / 行业 / 联系人 / 简介 / 标签）
            </div>
          ) : searchResults.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-sm">未找到匹配项目</div>
          ) : (
            <List
              dataSource={searchResults}
              renderItem={(p) => (
                <List.Item
                  className="!px-4 cursor-pointer hover:!bg-slate-50 transition-colors"
                  onClick={() => {
                    navigate(`/projects/${p.id}`)
                    setSearchOpen(false)
                    setSearchKeyword('')
                  }}
                >
                  <List.Item.Meta
                    avatar={
                      <Avatar
                        size={32}
                        style={{ background: 'linear-gradient(135deg,#2563eb,#3b82f6)', fontSize: 13 }}
                      >
                        {p.name ? p.name.slice(0, 1) : '项'}
                      </Avatar>
                    }
                    title={<span className="text-slate-900">{p.name}</span>}
                    description={
                      <span className="text-slate-500">
                        {p.industry || '未分类'}
                        {p.contactPerson ? ` · ${p.contactPerson}` : ''}
                        {p.valuation ? ` · 估值 ${p.valuation}万` : ''}
                      </span>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </div>
      </Modal>
    </Layout>
  )
}

