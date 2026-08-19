import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Row,
  Col,
  Card,
  Tag,
  Button,
  Select,
  DatePicker,
  Input,
  Empty,
  Alert,
  List,
  Badge,
  Avatar,
  Tooltip,
  App,
  Divider,
} from 'antd'
import {
  DownloadOutlined,
  ExportOutlined,
  CalendarOutlined,
  DollarOutlined,
  WarningOutlined,
  ArrowRightOutlined,
  FundOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  SearchOutlined,
  PlusOutlined,
  FireOutlined,
  RiseOutlined,
  AlertOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { industryOptions } from '../data/mockData.js'
import { useStore, can } from '../data/store.js'
import { exportProjectToDocx } from '../utils/exportUtils.js'

const { RangePicker } = DatePicker

const statusConfig = {
  normal: { color: 'green', text: '正常', icon: FundOutlined, dotClass: 'status-dot-green' },
  warning: { color: 'orange', text: '关注', icon: WarningOutlined, dotClass: 'status-dot-orange' },
  danger: { color: 'red', text: '预警', icon: FireOutlined, dotClass: 'status-dot-red' },
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const state = useStore()
  const [industryFilter, setIndustryFilter] = useState()
  const [dateRange, setDateRange] = useState()
  const [sortBy, setSortBy] = useState('date')
  const [keyword, setKeyword] = useState('')
  const [exportingId, setExportingId] = useState(null)

  // 过滤与排序
  const filteredProjects = useMemo(() => {
    let list = [...state.projects]
    if (keyword) {
      const k = keyword.toLowerCase()
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(k) ||
          p.industry.toLowerCase().includes(k) ||
          (p.tags || []).some((t) => t.toLowerCase().includes(k))
      )
    }
    if (industryFilter) list = list.filter((p) => p.industry === industryFilter)
    if (dateRange?.length === 2) {
      list = list.filter(
        (p) =>
          dayjs(p.investDate).isAfter(dateRange[0].subtract(1, 'day')) &&
          dayjs(p.investDate).isBefore(dateRange[1].add(1, 'day'))
      )
    }
    if (sortBy === 'date') {
      list.sort((a, b) => dayjs(b.investDate).valueOf() - dayjs(a.investDate).valueOf())
    } else if (sortBy === 'amount') {
      list.sort((a, b) => b.investAmount - a.investAmount)
    } else if (sortBy === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name))
    }
    return list
  }, [industryFilter, dateRange, sortBy, keyword, state.projects])

  // 合规提醒（截止日近的）
  const urgentTasks = useMemo(() => {
    return state.todos
      .filter((t) => {
        const diff = dayjs(t.dueDate).diff(dayjs(), 'day')
        return t.status !== 'done' && diff <= 7
      })
      .sort((a, b) => dayjs(a.dueDate).valueOf() - dayjs(b.dueDate).valueOf())
      .slice(0, 3)
  }, [state.todos])

  // 近期待办（底部）
  const pendingTasks = useMemo(() => {
    return [...state.todos]
      .filter((t) => t.status !== 'done')
      .sort((a, b) => dayjs(a.dueDate).valueOf() - dayjs(b.dueDate).valueOf())
      .slice(0, 5)
  }, [state.todos])

  // 统计卡片数据
  const stats = useMemo(() => {
    const totalAmount = state.projects.reduce((s, p) => s + p.investAmount, 0)
    const warningCount = state.projects.filter((p) => p.status !== 'normal').length
    const pendingCount = state.todos.filter((t) => t.status !== 'done').length
    const overdueCount = state.todos.filter(
      (t) => t.status === 'overdue' || (t.status === 'pending' && dayjs(t.dueDate).isBefore(dayjs(), 'day'))
    ).length
    const industryCount = new Set(state.projects.map((p) => p.industry).filter(Boolean)).size
    return { total: state.projects.length, totalAmount, warningCount, pendingCount, overdueCount, industryCount }
  }, [state.projects, state.todos])

  const handleExport = async (project) => {
    try {
      setExportingId(project.id)
      message.loading({ content: '正在生成报告...', key: 'exp', duration: 0 })
      await exportProjectToDocx(project)
      message.success({ content: '报告导出成功', key: 'exp' })
    } catch (e) {
      console.error(e)
      message.error({ content: '导出失败，请重试', key: 'exp' })
    } finally {
      setExportingId(null)
    }
  }

  // 统计卡数据
  const statCards = [
    {
      title: '项目总数',
      value: stats.total,
      suffix: '个',
      icon: <FileTextOutlined />,
      color: '#2563eb',
      bg: 'rgba(37, 99, 235, 0.08)',
      trend: '+2 本月',
    },
    {
      title: '累计投资金额',
      value: (stats.totalAmount / 10000).toFixed(2),
      suffix: '亿',
      icon: <DollarOutlined />,
      color: '#059669',
      bg: 'rgba(16, 185, 129, 0.08)',
      trend: `跨 ${stats.industryCount} 大行业`,
    },
    {
      title: '关注/预警项目',
      value: stats.warningCount,
      suffix: '个',
      icon: <WarningOutlined />,
      color: '#d97706',
      bg: 'rgba(245, 158, 11, 0.08)',
      trend: '需重点关注',
    },
    {
      title: '待办任务',
      value: stats.pendingCount,
      suffix: ` / ${stats.overdueCount} 逾期`,
      icon: <ClockCircleOutlined />,
      color: stats.overdueCount ? '#dc2626' : '#7c3aed',
      bg: stats.overdueCount ? 'rgba(239, 68, 68, 0.08)' : 'rgba(124, 58, 237, 0.08)',
      trend: stats.overdueCount ? '逾期需处理' : '按计划进行',
      danger: stats.overdueCount > 0,
    },
  ]

  return (
    <div className="space-y-5 animate-fade-in">
      {/* 页面标题区 */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-slate-900 m-0 leading-tight">
            投后项目总览
          </h1>
          <p className="text-[13px] text-slate-500 mt-1">
            欢迎回来，{state.session?.userName || '用户'} · 今日是 {dayjs().format('YYYY年M月D日 dddd')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button icon={<ExportOutlined />}>
            <span className="mobile-hide">批量导出</span>
          </Button>
          {can('project.create') && (
            <Button
              onClick={() => navigate('/projects/create')}
              type="primary"
              icon={<PlusOutlined />}
            >
              新增项目
            </Button>
          )}
        </div>
      </div>

      {/* 合规提醒横幅 - 更精致 */}
      {urgentTasks.length > 0 && (
        <div
          className="rounded-xl p-4 flex items-center gap-3"
          style={{
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(245, 158, 11, 0.02) 100%)',
            border: '1px solid rgba(245, 158, 11, 0.2)',
          }}
        >
          <div
            className="flex items-center justify-center rounded-lg flex-shrink-0"
            style={{
              width: 36,
              height: 36,
              background: 'rgba(245, 158, 11, 0.12)',
            }}
          >
            <AlertOutlined style={{ color: '#d97706', fontSize: 18 }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-slate-900 text-[14px]">合规任务提醒</span>
              <Tag color="orange" className="!m-0">{urgentTasks.length} 项待处理</Tag>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {urgentTasks.map((t) => {
                const diff = dayjs(t.dueDate).diff(dayjs(), 'day')
                const isOverdue = diff < 0
                return (
                  <Tag
                    key={t.id}
                    color={isOverdue ? 'red' : 'orange'}
                    onClick={() => navigate(`/projects/${t.projectId}`)}
                    style={{ cursor: 'pointer', margin: 0 }}
                  >
                    {t.projectName} · {t.title}
                    {isOverdue ? ` · 逾期${-diff}天` : ` · ${diff}天`}
                  </Tag>
                )
              })}
            </div>
          </div>
          <Button type="link" size="small" onClick={() => navigate('/tasks')} className="!ml-auto flex-shrink-0">
            查看全部 <ArrowRightOutlined />
          </Button>
        </div>
      )}

      {/* 统计概览 - 美式科技风 KPI 卡 */}
      <Row gutter={[16, 16]}>
        {statCards.map((s, i) => (
          <Col xs={12} sm={12} md={6} lg={6} key={i}>
            <Card className="card-hover shimmer" styles={{ body: { padding: 18 } }}>
              <div className="flex items-start justify-between mb-3">
                <div
                  className="flex items-center justify-center rounded-lg"
                  style={{
                    width: 38,
                    height: 38,
                    background: s.bg,
                  }}
                >
                  <span style={{ color: s.color, fontSize: 18 }}>{s.icon}</span>
                </div>
                {s.danger && (
                  <span className="status-dot status-dot-red animate-pulse-soft" />
                )}
              </div>
              <div className="section-title !mb-1.5">{s.title}</div>
              <div className="flex items-baseline gap-1">
                <span
                  className="font-mono font-bold tracking-tight text-[28px] leading-none"
                  style={{ color: s.color }}
                >
                  {s.value}
                </span>
                <span className="text-[14px] font-medium text-slate-500">{s.suffix}</span>
              </div>
              <div className="flex items-center gap-1 mt-3 pt-3 border-t border-slate-100">
                <RiseOutlined style={{ color: s.color, fontSize: 12 }} />
                <span className="text-[12px] text-slate-500 font-medium">{s.trend}</span>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 筛选栏 - 简化精致 */}
      <Card styles={{ body: { padding: 16 } }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={12} md={8} lg={7}>
            <Input
              allowClear
              prefix={<SearchOutlined className="text-slate-400" />}
              placeholder="搜索项目名称、行业或标签..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="!rounded-lg"
            />
          </Col>
          <Col xs={12} sm={6} md={5} lg={4}>
            <Select
              allowClear
              style={{ width: '100%' }}
              placeholder="行业筛选"
              options={industryOptions}
              value={industryFilter}
              onChange={setIndustryFilter}
            />
          </Col>
          <Col xs={12} sm={6} md={5} lg={5}>
            <RangePicker
              style={{ width: '100%' }}
              picker="month"
              value={dateRange}
              onChange={setDateRange}
              placeholder={['投资起期', '投资止期']}
            />
          </Col>
          <Col xs={12} sm={6} md={3} lg={4}>
            <Select
              style={{ width: '100%' }}
              value={sortBy}
              onChange={setSortBy}
              options={[
                { value: 'date', label: '按投资时间' },
                { value: 'amount', label: '按投资金额' },
                { value: 'name', label: '按项目名称' },
              ]}
            />
          </Col>
          <Col xs={12} sm={6} md={3} lg={4}>
            <div className="flex justify-end items-center gap-2">
              <span className="text-[12px] text-slate-500 mobile-hide">
                共 <span className="font-mono font-semibold text-slate-900">{filteredProjects.length}</span> 个项目
              </span>
            </div>
          </Col>
        </Row>
      </Card>

      {/* 项目卡片列表 */}
      {filteredProjects.length === 0 ? (
        <Card>
          <Empty description="暂无匹配项目" />
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {filteredProjects.map((p) => {
            const status = statusConfig[p.status] || statusConfig.normal
            const StatusIcon = status.icon
            const projectTasks = state.todos.filter((t) => t.projectId === p.id && t.status !== 'done').length
            return (
              <Col xs={24} sm={12} md={12} lg={8} xl={8} key={p.id}>
                <Card
                  className="card-hover h-full cursor-pointer group"
                  onClick={() => navigate(`/projects/${p.id}`)}
                  styles={{ body: { padding: 18 } }}
                  actions={[
                    <Tooltip title="进入详情" key="view">
                      <span onClick={() => navigate(`/projects/${p.id}`)} className="!text-slate-500 hover:!text-blue-600 transition-colors">
                        <FileTextOutlined />
                        <span className="ml-1 text-xs mobile-hide">详情</span>
                      </span>
                    </Tooltip>,
                    <Tooltip title="导出完整报告(DOCX)" key="export">
                      <span
                        onClick={(e) => {
                          e.stopPropagation()
                          handleExport(p)
                        }}
                        className="!text-slate-500 hover:!text-blue-600 transition-colors"
                      >
                        <Badge dot={exportingId === p.id}>
                          <DownloadOutlined />
                        </Badge>
                        <span className="ml-1 text-xs mobile-hide">导出</span>
                      </span>
                    </Tooltip>,
                  ]}
                >
                  {/* 头部 - 状态点 + 名称 */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`status-dot ${status.dotClass}`} />
                        <span className="font-semibold text-[15px] text-slate-900 truncate">
                          {p.name}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Tag color="blue">{p.industry}</Tag>
                        <Tag>{status.text}</Tag>
                        {(p.tags || []).slice(0, 1).map((t) => (
                          <Tag key={t} className="!m-0">{t}</Tag>
                        ))}
                        {(p.tags || []).length > 1 && (
                          <span className="text-[11px] text-slate-400">+{(p.tags || []).length - 1}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <Divider style={{ margin: '12px 0' }} />

                  {/* 关键指标 - 等宽数字 */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-1 flex items-center gap-1">
                        <CalendarOutlined style={{ fontSize: 10 }} />
                        投资时间
                      </div>
                      <div className="font-mono text-[13px] font-semibold text-slate-900">{p.investDate}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-1 flex items-center gap-1">
                        <DollarOutlined style={{ fontSize: 10 }} />
                        投资金额
                      </div>
                      <div className="font-mono text-[13px] font-semibold text-emerald-600">{p.investAmountDisplay}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-1 flex items-center gap-1">
                        <ExportOutlined style={{ fontSize: 10 }} />
                        投资方式 · 投资方
                      </div>
                      <div className="text-[13px] text-slate-700">
                        {p.investType}
                        <span className="text-slate-300 mx-1.5">·</span>
                        <span className="text-slate-500">{p.investors.length} 家机构</span>
                      </div>
                    </div>
                  </div>

                  {/* 待办徽标 */}
                  {projectTasks > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <Badge count={projectTasks} size="small" offset={[0, 0]} color="#ef4444">
                        <span className="text-[12px] text-slate-500 flex items-center gap-1.5">
                          <ClockCircleOutlined />
                          待办事项
                        </span>
                      </Badge>
                    </div>
                  )}
                </Card>
              </Col>
            )
          })}
        </Row>
      )}

      {/* 近期未完成事项 - 美式科技风列表 */}
      <Card
        title={
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <div
                className="flex items-center justify-center rounded-md"
                style={{ width: 24, height: 24, background: 'rgba(124, 58, 237, 0.1)' }}
              >
                <ClockCircleOutlined style={{ color: '#7c3aed', fontSize: 13 }} />
              </div>
              <span className="text-[14px] font-semibold text-slate-900">近期未完成事项</span>
              <Tag color="purple" className="!m-0 !text-[11px]">{pendingTasks.length}</Tag>
            </span>
            <Button type="link" size="small" onClick={() => navigate('/tasks')}>
              查看全部 <ArrowRightOutlined />
            </Button>
          </div>
        }
      >
        <List
          dataSource={pendingTasks}
          renderItem={(t) => {
            const diff = dayjs(t.dueDate).diff(dayjs(), 'day')
            const isOverdue = t.status === 'overdue' || diff < 0
            const isUrgent = !isOverdue && diff <= 2
            return (
              <List.Item
                className="!px-3 timeline-item cursor-pointer rounded-lg"
                onClick={() =>
                  t.type === 'inquiry' ? navigate('/tasks') : navigate(`/projects/${t.projectId}`)
                }
              >
                <List.Item.Meta
                  avatar={
                    <div
                      className="flex items-center justify-center rounded-lg flex-shrink-0"
                      style={{
                        width: 36,
                        height: 36,
                        background: isOverdue
                          ? 'rgba(239, 68, 68, 0.1)'
                          : isUrgent
                          ? 'rgba(245, 158, 11, 0.1)'
                          : 'rgba(37, 99, 235, 0.1)',
                      }}
                    >
                      <ClockCircleOutlined
                        style={{
                          color: isOverdue ? '#dc2626' : isUrgent ? '#d97706' : '#2563eb',
                          fontSize: 15,
                        }}
                      />
                    </div>
                  }
                  title={
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[14px] ${isOverdue ? 'text-red-600 font-semibold' : 'font-medium text-slate-900'}`}>
                        {t.title}
                      </span>
                      <Tag color="blue" className="!m-0 !text-[11px]">{t.typeLabel}</Tag>
                      <span className="text-[12px] text-slate-400">{t.projectName}</span>
                    </div>
                  }
                  description={
                    <span className="text-[12px] text-slate-500">
                      {t.desc?.slice(0, 60) + (t.desc?.length > 60 ? '...' : '')}
                    </span>
                  }
                />
                <div className="text-right ml-3 flex-shrink-0">
                  <div className={`font-mono text-[13px] font-semibold ${isOverdue ? 'text-red-600' : isUrgent ? 'text-orange-600' : 'text-slate-700'}`}>
                    {t.dueDate}
                  </div>
                  <div className={`text-[11px] font-medium ${isOverdue ? 'text-red-500' : 'text-slate-400'}`}>
                    {isOverdue ? `逾期 ${-diff} 天` : diff === 0 ? '今日截止' : `剩余 ${diff} 天`}
                  </div>
                </div>
              </List.Item>
            )
          }}
        />
      </Card>
    </div>
  )
}
