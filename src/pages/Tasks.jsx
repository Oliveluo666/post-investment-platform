import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card,
  List,
  Button,
  Tag,
  Input,
  Select,
  Row,
  Col,
  Avatar,
  Badge,
  App,
  Modal,
  Form,
  Radio,
  DatePicker,
  Space,
  Tabs,
  Empty,
  Tooltip,
  Alert,
  Timeline,
  Progress,
} from 'antd'
import {
  CheckSquareOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  SafetyCertificateOutlined,
  SendOutlined,
  RobotOutlined,
  EyeOutlined,
  DownloadOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FilterOutlined,
  SettingOutlined,
  PlusOutlined,
  EditOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import {
  useStore,
  can,
  completeTodo,
  generateAutoTodos,
  addTodo,
  updateTodo,
  addCustomActionType,
  getAllActionTypes,
  getActionTypeColor,
  addTimelineEvent,
} from '../data/store.js'
import { exportInquiryDraft } from '../utils/exportUtils.js'

const { TabPane } = Tabs

const typeIcon = {
  report: FileTextOutlined,
  inquiry: SendOutlined,
  inquiry_reply: FileTextOutlined,
  visit: SafetyCertificateOutlined,
  meeting: CheckSquareOutlined,
}

export default function Tasks() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [keyword, setKeyword] = useState('')
  const [typeFilter, setTypeFilter] = useState()
  const [priorityFilter, setPriorityFilter] = useState()
  const [statusFilter, setStatusFilter] = useState('pending')
  const [doneModal, setDoneModal] = useState(null)
  const [form] = Form.useForm()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [addForm] = Form.useForm()
  const [newTypeInput, setNewTypeInput] = useState('')
  const [editingTodo, setEditingTodo] = useState(null)

  const state = useStore()
  const tasks = state.todos

  // 内置 + 自定义事项类型（全团队共享）
  const allTypeOptions = useMemo(() => getAllActionTypes(), [state.customActionTypes])

  const handleAddType = () => {
    const res = addCustomActionType(newTypeInput)
    if (res.error) {
      message.warning(res.error)
      return
    }
    addForm.setFieldsValue({ type: res.item.value })
    setNewTypeInput('')
    message.success(`已新增类型「${res.item.label}」，全团队可见`)
  }

  const openAdd = () => {
    setEditingTodo(null)
    addForm.resetFields()
    setAddOpen(true)
  }

  const openEdit = (t) => {
    setEditingTodo(t)
    addForm.setFieldsValue({
      projectId: t.projectId,
      type: t.type,
      title: t.title,
      desc: t.desc || '',
      dueDate: dayjs(t.dueDate),
      priority: t.priority || 'medium',
    })
    setAddOpen(true)
  }

  const submitAdd = async () => {
    try {
      const v = await addForm.validateFields()
      const project = state.projects.find((p) => p.id === v.projectId)
      const typeOpt = allTypeOptions.find((o) => o.value === v.type)
      const payload = {
        projectId: v.projectId,
        projectName: project?.name || '',
        title: v.title,
        type: v.type,
        typeLabel: typeOpt?.label || '其他',
        dueDate: v.dueDate.format('YYYY-MM-DD'),
        priority: v.priority || 'medium',
        desc: v.desc || '',
      }
      if (editingTodo) {
        updateTodo(editingTodo.id, payload)
        message.success('待办已更新')
      } else {
        addTodo(payload)
        message.success('待办已添加')
      }
      setAddOpen(false)
      setEditingTodo(null)
      addForm.resetFields()
    } catch (e) {
      // 表单校验未通过
    }
  }

  const filtered = useMemo(() => {
    let list = [...tasks]
    if (statusFilter === 'pending') list = list.filter((t) => t.status !== 'done')
    else if (statusFilter === 'done') list = list.filter((t) => t.status === 'done')
    else if (statusFilter === 'overdue') {
      list = list.filter(
        (t) => t.status === 'overdue' || (t.status === 'pending' && dayjs(t.dueDate).isBefore(dayjs(), 'day'))
      )
    }
    if (typeFilter) list = list.filter((t) => t.type === typeFilter)
    if (priorityFilter) list = list.filter((t) => t.priority === priorityFilter)
    if (keyword) {
      const k = keyword.toLowerCase()
      list = list.filter(
        (t) => t.title.toLowerCase().includes(k) || t.projectName.toLowerCase().includes(k)
      )
    }
    return list.sort((a, b) => {
      const aOver = a.status === 'overdue' || dayjs(a.dueDate).isBefore(dayjs(), 'day')
      const bOver = b.status === 'overdue' || dayjs(b.dueDate).isBefore(dayjs(), 'day')
      if (aOver !== bOver) return aOver ? -1 : 1
      return dayjs(a.dueDate).valueOf() - dayjs(b.dueDate).valueOf()
    })
  }, [tasks, keyword, typeFilter, priorityFilter, statusFilter])

  // 统计
  const stats = useMemo(() => {
    const pending = tasks.filter((t) => t.status !== 'done')
    const overdue = pending.filter(
      (t) => t.status === 'overdue' || dayjs(t.dueDate).isBefore(dayjs(), 'day')
    ).length
    const done = tasks.filter((t) => t.status === 'done').length
    return {
      total: tasks.length,
      pending: pending.length,
      overdue,
      done,
      completion: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
    }
  }, [tasks])

  // 合规自动化机制说明
  const autoRules = [
    {
      color: '#2563eb',
      bg: 'rgba(37, 99, 235, 0.08)',
      icon: FileTextOutlined,
      title: '定期报告提醒',
      desc: '每季度末自动生成"财报上传/录入"待办，年末生成"年报"待办。依据投资月份推算对应报告期。逾期持续高亮并推送。',
    },
    {
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.08)',
      icon: SendOutlined,
      title: '定期问询邮件',
      desc: '每季度/半年度（管理员可配置）自动生成"发送问询邮件"待办，并基于模板生成Word草稿作为附件。投后经理下载后通过外部邮箱发送。',
    },
    {
      color: '#7c3aed',
      bg: 'rgba(124, 58, 237, 0.08)',
      icon: RobotOutlined,
      title: '事找人推送',
      desc: '待办任务自动推送至对应负责人工作台首页、移动端通知栏、邮件。逾期每日10:00追加提醒。',
    },
  ]

  const handleDone = (task) => {
    setDoneModal(task)
    form.resetFields()
    form.setFieldsValue({
      completeDate: dayjs(),
      remark: task.type === 'inquiry_reply' ? '已收到被投企业回复，要点已录入时间轴。' : '',
    })
  }

  const submitDone = async () => {
    try {
      const v = await form.validateFields()
      completeTodo(doneModal.id, v.remark)
      // 选择加入投后情况 → 写入该项目的投后动作时间轴
      if (v.addToTimeline && doneModal.projectId) {
        addTimelineEvent(doneModal.projectId, {
          date: (v.completeDate || dayjs()).format('YYYY-MM-DD'),
          type: doneModal.type,
          typeLabel: doneModal.typeLabel,
          title: `完成：${doneModal.title}`,
          description: v.remark || '任务已完成',
          operator: state.session?.userName || '投后经理',
        })
        message.success('任务已完成，并已加入投后情况时间轴')
      } else {
        message.success('任务已标记完成')
      }
      setDoneModal(null)
    } catch (e) {
      //
    }
  }

  const TaskCard = ({ t }) => {
    const diff = dayjs(t.dueDate).diff(dayjs(), 'day')
    const isOverdue = t.status === 'overdue' || (t.status !== 'done' && diff < 0)
    const isUrgent = !isOverdue && t.status !== 'done' && diff <= 2
    const Icon = typeIcon[t.type] || ClockCircleOutlined
    const project = state.projects.find((p) => p.id === t.projectId)
    const baseColor = isOverdue ? '#dc2626' : isUrgent ? '#d97706' : getActionTypeColor(t.type)
    const accentColor = baseColor
    const accentBg = isOverdue ? 'rgba(239, 68, 68, 0.1)' : isUrgent ? 'rgba(245, 158, 11, 0.1)' : `${baseColor}1a`

    return (
      <Card
        size="small"
        className={`card-hover mb-3 ${isOverdue ? '!border-red-200' : isUrgent ? '!border-orange-200' : ''}`}
        styles={{ body: { padding: 14 } }}
      >
        <div className="flex items-start gap-3">
          {/* 左侧图标 - 美式科技风 */}
          <div
            className="flex items-center justify-center rounded-lg flex-shrink-0"
            style={{
              width: 40,
              height: 40,
              background: accentBg,
            }}
          >
            <Icon style={{ color: accentColor, fontSize: 18 }} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className={`text-[14px] ${isOverdue ? 'text-red-600 font-semibold' : 'font-semibold text-slate-900'}`}>
                {t.title}
              </span>
              <Tag
                style={{ background: accentBg, color: accentColor, border: 'none' }}
                className="!m-0 !text-[11px]"
              >
                {t.typeLabel}
              </Tag>
              {t.priority === 'high' && <Tag color="red" className="!m-0 !text-[11px]">高优先级</Tag>}
              {t.priority === 'medium' && <Tag color="orange" className="!m-0 !text-[11px]">中</Tag>}
              {t.priority === 'low' && <Tag className="!m-0 !text-[11px]">低</Tag>}
              {isOverdue && <Tag color="red" icon={<CloseCircleOutlined />} className="!m-0 !text-[11px]">已逾期</Tag>}
              {isUrgent && <Tag color="orange" className="!m-0 !text-[11px]">临近截止</Tag>}
              {t.status === 'done' && <Tag color="green" icon={<CheckCircleOutlined />} className="!m-0 !text-[11px]">已完成</Tag>}
            </div>

            <div
              className="text-[13px] text-slate-500 mb-1.5 cursor-pointer hover:text-blue-600 transition-colors"
              onClick={() => navigate(`/projects/${t.projectId}`)}
            >
              {t.projectName}
            </div>

            {t.desc && <div className="text-[12px] text-slate-500 mb-2 leading-relaxed">{t.desc}</div>}

            {t.attachment && (
              <div
                className="rounded-lg p-2 mb-2 flex items-center justify-between gap-2"
                style={{ background: 'rgba(37, 99, 235, 0.04)', border: '1px solid rgba(37, 99, 235, 0.1)' }}
              >
                <span className="text-[11px] text-slate-600 flex items-center gap-1.5">
                  <FileTextOutlined className="text-blue-500" />
                  系统自动生成草稿：<b className="font-semibold">{t.attachment}</b>
                </span>
                <Button
                  size="small"
                  type="link"
                  icon={<DownloadOutlined />}
                  onClick={() => {
                    exportInquiryDraft(project || { name: t.projectName }, 'Q2')
                  }}
                  className="!p-0 !text-[11px]"
                >
                  下载
                </Button>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-100">
              <div className={`flex items-center gap-1.5 text-[13px] font-mono ${isOverdue ? 'text-red-600 font-semibold' : isUrgent ? 'text-orange-600 font-semibold' : 'text-slate-500'}`}>
                <CalendarOutlined style={{ fontSize: 12 }} />
                {t.dueDate}
                <span className="text-[11px] ml-1 font-sans">
                  {t.status === 'done'
                    ? `· 完成于 ${t.doneAt || ''}`
                    : isOverdue
                    ? `（逾期 ${-diff} 天）`
                    : diff === 0
                    ? '（今日截止）'
                    : `（剩余 ${diff} 天）`}
                </span>
              </div>
              <Space size="small">
                <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/projects/${t.projectId}`)}>
                  查看项目
                </Button>
                {can('todo.edit') && (
                  <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(t)}>
                    编辑
                  </Button>
                )}
                {t.status !== 'done' && can('todo.edit') && (
                  <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={() => handleDone(t)}>
                    标记完成
                  </Button>
                )}
              </Space>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  // 统计卡数据
  const statCards = [
    {
      title: '待处理',
      value: stats.pending,
      suffix: '项',
      icon: <ClockCircleOutlined />,
      color: '#2563eb',
      bg: 'rgba(37, 99, 235, 0.08)',
    },
    {
      title: '逾期',
      value: stats.overdue,
      suffix: '项',
      icon: <CloseCircleOutlined />,
      color: '#dc2626',
      bg: 'rgba(239, 68, 68, 0.08)',
      danger: stats.overdue > 0,
    },
    {
      title: '已完成',
      value: stats.done,
      suffix: '项',
      icon: <CheckCircleOutlined />,
      color: '#059669',
      bg: 'rgba(16, 185, 129, 0.08)',
    },
    {
      title: '完成率',
      value: stats.completion,
      suffix: '%',
      icon: <ThunderboltOutlined />,
      color: '#7c3aed',
      bg: 'rgba(124, 58, 237, 0.08)',
      progress: stats.completion,
    },
  ]

  return (
    <div className="space-y-5 max-w-7xl mx-auto animate-fade-in">
      {/* 页面标题 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-slate-900 m-0 leading-tight">
            待办事项与合规中心
          </h1>
          <p className="text-[13px] text-slate-500 mt-1">
            系统自动生成合规任务 · 共 {tasks.length} 个任务 · 推动事找人
          </p>
        </div>
        <Space wrap>
          {can('todo.edit') && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={openAdd}
            >
              添加待办
            </Button>
          )}
          {can('todo.edit') && (
            <Button
              icon={<RobotOutlined />}
              onClick={() => {
                const count = generateAutoTodos()
                if (count > 0) {
                  message.success(`已自动生成 ${count} 个合规任务（财报上传 + 问询邮件）`)
                } else {
                  message.info('所有项目的本期合规任务已就绪，无需新增')
                }
              }}
            >
              立即生成合规任务
            </Button>
          )}
          <Button icon={<SettingOutlined />} onClick={() => setSettingsOpen(true)}>
            <span className="mobile-hide">问询模板配置</span>
          </Button>
        </Space>
      </div>

      {/* 统计卡片 - 美式科技风 */}
      <Row gutter={[16, 16]}>
        {statCards.map((s, i) => (
          <Col xs={12} sm={12} md={6} key={i}>
            <Card className="card-hover" styles={{ body: { padding: 18 } }}>
              <div className="flex items-start justify-between mb-3">
                <div
                  className="flex items-center justify-center rounded-lg"
                  style={{ width: 38, height: 38, background: s.bg }}
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
              {s.progress !== undefined && (
                <Progress
                  percent={s.progress}
                  showInfo={false}
                  size="small"
                  strokeColor={s.color}
                  className="!mt-3"
                />
              )}
            </Card>
          </Col>
        ))}
      </Row>

      {/* 合规自动化机制说明 - 美式科技风 */}
      <Card
        size="small"
        title={
          <span className="flex items-center gap-2">
            <div
              className="flex items-center justify-center rounded-md"
              style={{ width: 24, height: 24, background: 'rgba(124, 58, 237, 0.1)' }}
            >
              <ThunderboltOutlined style={{ color: '#7c3aed', fontSize: 13 }} />
            </div>
            <span className="text-[14px] font-semibold text-slate-900">合规任务自动生成机制</span>
            <Tag color="purple" className="!ml-1 !text-[11px]">核心规则</Tag>
          </span>
        }
      >
        <Row gutter={[16, 12]}>
          {autoRules.map((r, i) => {
            const Icon = r.icon
            return (
              <Col xs={24} md={8} key={i}>
                <div
                  className="p-3.5 rounded-lg h-full"
                  style={{ background: r.bg, borderLeft: `3px solid ${r.color}` }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon style={{ color: r.color, fontSize: 14 }} />
                    <span className="font-semibold text-[13px] text-slate-900">{r.title}</span>
                  </div>
                  <div className="text-[12px] text-slate-600 leading-relaxed">{r.desc}</div>
                </div>
              </Col>
            )
          })}
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={17}>
          {/* 筛选栏 - 美式科技风 */}
          <Card size="small" className="mb-3">
            <Row gutter={[8, 8]} align="middle">
              <Col xs={24} sm={6}>
                <Tabs activeKey={statusFilter} onChange={setStatusFilter} size="small">
                  <TabPane tab={<Badge count={stats.pending} size="small">待处理</Badge>} key="pending" />
                  <TabPane tab={<Badge count={stats.overdue} size="small" color="#ef4444">逾期</Badge>} key="overdue" />
                  <TabPane tab="已完成" key="done" />
                </Tabs>
              </Col>
              <Col xs={12} sm={6} md={5}>
                <Input
                  allowClear
                  prefix={<SearchOutlined className="text-slate-400" />}
                  placeholder="搜索任务/项目"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                />
              </Col>
              <Col xs={12} sm={6} md={5}>
                <Select
                  allowClear
                  style={{ width: '100%' }}
                  placeholder="任务类型"
                  value={typeFilter}
                  onChange={setTypeFilter}
                  options={allTypeOptions}
                />
              </Col>
              <Col xs={12} sm={6} md={4}>
                <Select
                  allowClear
                  style={{ width: '100%' }}
                  placeholder="优先级"
                  value={priorityFilter}
                  onChange={setPriorityFilter}
                  options={[
                    { value: 'high', label: '高优先级' },
                    { value: 'medium', label: '中' },
                    { value: 'low', label: '低' },
                  ]}
                />
              </Col>
              <Col xs={12} sm={6} md={4}>
                <Button block icon={<FilterOutlined />} onClick={() => { setKeyword(''); setTypeFilter(); setPriorityFilter() }}>
                  重置筛选
                </Button>
              </Col>
            </Row>
          </Card>

          {/* 任务列表 */}
          {filtered.length === 0 ? (
            <Card><Empty description="暂无任务" /></Card>
          ) : (
            <div>
              {filtered.map((t) => (
                <TaskCard key={t.id} t={t} />
              ))}
              <div className="text-center text-[12px] text-slate-400 py-3 font-mono">
                显示 {filtered.length} 条 · 共 {tasks.length} 条
              </div>
            </div>
          )}
        </Col>

        {/* 右栏：即将到期 + 时间轴 */}
        <Col xs={24} lg={7} className="space-y-4">
          <Card
            title={
              <span className="flex items-center gap-2">
                <div
                  className="flex items-center justify-center rounded-md"
                  style={{ width: 22, height: 22, background: 'rgba(239, 68, 68, 0.1)' }}
                >
                  <SafetyCertificateOutlined style={{ color: '#dc2626', fontSize: 12 }} />
                </div>
                <span className="text-[13px] font-semibold text-slate-900">合规 · 即将到期</span>
                <Tag color="red" className="!m-0 !text-[11px]">7天</Tag>
              </span>
            }
            size="small"
          >
            <Timeline
              mode="left"
              items={tasks
                .filter((t) => t.status !== 'done')
                .filter((t) => dayjs(t.dueDate).diff(dayjs(), 'day') <= 7)
                .sort((a, b) => dayjs(a.dueDate).valueOf() - dayjs(b.dueDate).valueOf())
                .slice(0, 5)
                .map((t) => {
                  const diff = dayjs(t.dueDate).diff(dayjs(), 'day')
                  const isOver = diff < 0
                  return {
                    color: isOver ? '#ef4444' : diff <= 2 ? '#f59e0b' : '#3b82f6',
                    children: (
                      <div className="pb-2 cursor-pointer hover:bg-slate-50 -mx-2 px-2 py-1 rounded-lg transition-colors" onClick={() => navigate(`/projects/${t.projectId}`)}>
                        <div className="text-[11px] text-slate-500 mb-0.5">{t.projectName}</div>
                        <div className="font-medium text-[13px] mb-1 text-slate-900">{t.title}</div>
                        <Tag
                          color={isOver ? 'red' : diff <= 2 ? 'orange' : 'blue'}
                          className="!text-[11px] !m-0"
                        >
                          {isOver ? `逾期${-diff}天` : diff === 0 ? '今日截止' : `剩${diff}天`}
                        </Tag>
                      </div>
                    ),
                  }
                })}
            />
          </Card>

          <Card
            title={
              <span className="flex items-center gap-2">
                <div
                  className="flex items-center justify-center rounded-md"
                  style={{ width: 22, height: 22, background: 'rgba(124, 58, 237, 0.1)' }}
                >
                  <RobotOutlined style={{ color: '#7c3aed', fontSize: 12 }} />
                </div>
                <span className="text-[13px] font-semibold text-slate-900">下周合规任务预告</span>
              </span>
            }
            size="small"
          >
            <Alert
              type="info"
              showIcon
              size="small"
              className="mb-3"
              message={<span className="text-[12px] font-medium">系统基于投资时间自动推算</span>}
              description={<span className="text-[11px]">依据各项目投资协议约定，将于下周自动生成以下待办</span>}
            />
            <div className="space-y-2">
              {[
                { d: dayjs().add(2, 'day'), name: '智云科技', task: 'Q2财报上传', color: '#2563eb' },
                { d: dayjs().add(4, 'day'), name: '芯创半导体', task: '半年度经营问询', color: '#f59e0b' },
                { d: dayjs().add(5, 'day'), name: '星途汽零', task: '年度董事会提醒', color: '#7c3aed' },
                { d: dayjs().add(6, 'day'), name: '食光预制菜', task: '半年报资料准备', color: '#10b981' },
              ].map((x, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-b-0">
                  <div className="min-w-0 flex-1 flex items-center gap-2">
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: x.color }}
                    />
                    <div className="min-w-0">
                      <div className="font-mono text-[10px] text-slate-500 mb-0.5">{x.d.format('MM/DD ddd')}</div>
                      <div className="truncate text-[13px] text-slate-700">
                        <span className="font-medium">{x.name}</span>
                        <span className="text-slate-300 mx-1">·</span>
                        <span className="text-slate-500">{x.task}</span>
                      </div>
                    </div>
                  </div>
                  <PlusOutlined className="text-slate-300 ml-2 text-[11px]" />
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      {/* 添加/编辑待办 Modal */}
      <Modal
        title={editingTodo ? '编辑待办事项' : '添加待办事项'}
        open={addOpen}
        onCancel={() => {
          setAddOpen(false)
          setEditingTodo(null)
        }}
        onOk={submitAdd}
        okText={editingTodo ? '保存修改' : '保存待办'}
        width={560}
      >
        <Form
          form={addForm}
          layout="vertical"
          initialValues={{ priority: 'medium', dueDate: dayjs().add(7, 'day') }}
        >
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="关联项目" name="projectId" rules={[{ required: true, message: '请选择项目' }]}>
                <Select
                  showSearch
                  optionFilterProp="label"
                  placeholder="选择被投项目"
                  options={state.projects.map((p) => ({ value: p.id, label: p.name }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="事项类型" name="type" rules={[{ required: true, message: '请选择类型' }]}>
                <Select
                  placeholder="选择或新增类型"
                  options={allTypeOptions}
                  dropdownRender={(menu) => (
                    <>
                      {menu}
                      <div className="px-2 py-2 border-t border-slate-100 flex gap-2" style={{ background: '#fff' }}>
                        <Input
                          size="small"
                          placeholder="新类型名称，如：担保核查"
                          value={newTypeInput}
                          onChange={(e) => setNewTypeInput(e.target.value)}
                          onKeyDown={(e) => e.stopPropagation()}
                        />
                        <Button size="small" type="link" icon={<PlusOutlined />} onClick={handleAddType}>
                          新增
                        </Button>
                      </div>
                    </>
                  )}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="事项标题" name="title" rules={[{ required: true, message: '请填写标题' }]}>
            <Input placeholder="如：完成 2026 年半年度现场走访" maxLength={60} />
          </Form.Item>
          <Form.Item label="详细信息" name="desc">
            <Input.TextArea rows={3} placeholder="补充背景、要求、联系人等详细信息..." />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="截止日期" name="dueDate" rules={[{ required: true, message: '请选择截止日期' }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="优先级" name="priority">
                <Select
                  options={[
                    { value: 'high', label: '高优先级' },
                    { value: 'medium', label: '中' },
                    { value: 'low', label: '低' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
          <Alert
            type="info"
            showIcon
            size="small"
            message="完成后该待办可选择同步写入项目「投后情况」时间轴"
          />
        </Form>
      </Modal>

      {/* 标记完成 Modal */}
      <Modal
        title="标记任务完成"
        open={!!doneModal}
        onCancel={() => setDoneModal(null)}
        onOk={submitDone}
        okText="确认完成"
        destroyOnClose
      >
        {doneModal && (
          <>
            <Alert
              type="info"
              showIcon
              size="small"
              className="mb-4"
              message={<span className="font-semibold">{doneModal.title}</span>}
              description={
                <span className="text-[12px] font-mono">
                  {doneModal.projectName} · 截止日 {doneModal.dueDate}
                </span>
              }
            />
            <Form form={form} layout="vertical" preserve={false}>
              <Form.Item label="实际完成日期" name="completeDate" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item label="处理结果/备注" name="remark">
                <Input.TextArea
                  rows={4}
                  placeholder={
                    doneModal.type === 'inquiry'
                      ? '请填写邮件发送日期、收件人等；收到回复后请在项目时间轴录入回复要点。'
                      : doneModal.type === 'report'
                      ? '请填写财报文件名、上传人、核验情况等。'
                      : '请简要说明处理结果...'
                  }
                />
              </Form.Item>
              <Form.Item label="完成后是否加入投后情况（投后动作时间轴）？" name="addToTimeline" initialValue={false}>
                <Radio.Group>
                  <Radio value={true}>是，同步生成时间轴条目</Radio>
                  <Radio value={false}>否，仅标记完成</Radio>
                </Radio.Group>
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>

      {/* 模板配置 Modal */}
      <Modal
        title="问询邮件模板配置（管理员）"
        open={settingsOpen}
        onCancel={() => setSettingsOpen(false)}
        footer={
          <Space>
            <Button onClick={() => setSettingsOpen(false)}>取消</Button>
            <Button
              type="primary"
              onClick={() => {
                message.success('模板配置已保存')
                setSettingsOpen(false)
              }}
            >
              保存配置
            </Button>
          </Space>
        }
        width={720}
        destroyOnClose
      >
        <Form layout="vertical" initialValues={{ interval: 'quarter', enableAttachment: true }} preserve={false}>
          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item label="问询发送频率" name="interval">
                <Radio.Group>
                  <Radio value="monthly">每月</Radio>
                  <Radio value="quarterly">每季度</Radio>
                  <Radio value="halfyear">每半年</Radio>
                  <Radio value="yearly">每年</Radio>
                </Radio.Group>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="是否自动生成附件草稿" name="enableAttachment" valuePropName="checked">
                <Radio.Group>
                  <Radio value={true}>生成 Word 草稿（推荐）</Radio>
                  <Radio value={false}>仅创建提醒任务</Radio>
                </Radio.Group>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            label="问询函模板正文（支持变量替换）"
            tooltip="可用变量：{公司名称}、{期间}、{回复截止日}、{投资机构}"
          >
            <Input.TextArea
              rows={10}
              defaultValue={`致：{公司名称} 管理层

尊敬的各位：

根据投资协议约定及投后管理制度要求，现将【{期间}】经营问询事项列明如下，请于【{回复截止日}】前书面反馈：

一、经营情况
1. 本期核心经营数据（营收、订单、客户数等）及同比变化。
2. 主要产品/服务的市场表现及竞争格局变化。

二、财务表现
1. 请提供本期三大报表（合并口径）。
2. 说明毛利率、费用率及现金流变动原因。

三、合规事项
1. 是否发生重大诉讼、处罚、工商变更等事项？
2. 是否发生关联交易、对外担保等？

四、战略与资本
1. 战略推进情况（研发、市场、团队）。
2. 是否有融资或并购计划？

感谢配合！顺祝商祺！
{投资机构} 投后管理团队`}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
