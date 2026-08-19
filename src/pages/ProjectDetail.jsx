import React, { useState, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card,
  Descriptions,
  Tag,
  Button,
  Row,
  Col,
  Tabs,
  Timeline,
  Modal,
  Form,
  Select,
  DatePicker,
  Input,
  Upload,
  List,
  App,
  Dropdown,
  Tooltip,
  Statistic,
  Collapse,
  Divider,
  Badge,
  Avatar,
  Empty,
  Space,
  Alert,
  Progress,
  Radio,
  InputNumber,
} from 'antd'
import {
  DownloadOutlined,
  ArrowLeftOutlined,
  CalendarOutlined,
  DollarOutlined,
  PlusOutlined,
  FundOutlined,
  FileTextOutlined,
  MoreOutlined,
  FileExcelOutlined,
  FormOutlined,
  HistoryOutlined,
  PaperClipOutlined,
  BulbOutlined,
  EditOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
  RobotOutlined,
  RiseOutlined,
  ApartmentOutlined,
  DeleteOutlined,
  PercentageOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import dayjs from 'dayjs'
import { getYearlyFinance } from '../data/mockData.js'
import {
  useStore,
  can,
  addTimelineEvent,
  addFinanceData,
  ensureHighlights,
  getEquityHistory,
  addEquityEvent,
  deleteEquityEvent,
  getAllActionTypes,
  getActionTypeColor,
} from '../data/store.js'
import { exportProjectToDocx, exportTimelineToTxt, exportInquiryDraft } from '../utils/exportUtils.js'

const { TextArea } = Input
const { TabPane } = Tabs

const statusConfig = {
  normal: { color: 'green', text: '正常', dotClass: 'status-dot-green' },
  warning: { color: 'orange', text: '关注', dotClass: 'status-dot-orange' },
  danger: { color: 'red', text: '预警', dotClass: 'status-dot-red' },
}

export default function ProjectDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { message, modal } = App.useApp()
  const state = useStore()

  const project = state.projects.find((p) => p.id === id) || state.projects[0]
  const financeData = useMemo(() => state.finance[project?.id] || [], [state.finance, project?.id])
  const yearlyData = useMemo(() => getYearlyFinance(financeData), [financeData])
  const timeline = useMemo(() => state.timelines[project?.id] || [], [state.timelines, project?.id])
  // 内置 + 自定义事项类型（全团队共享）
  const allTypeOptions = useMemo(() => getAllActionTypes(), [state.customActionTypes])
  const highlights = useMemo(() => state.highlights[project?.id] || [], [state.highlights, project?.id])
  const equityHistory = useMemo(() => (project ? getEquityHistory(project.id) : []), [state.equity, project?.id])
  const [yearFilter, setYearFilter] = useState()
  const [typeFilter, setTypeFilter] = useState()
  const [timelineModal, setTimelineModal] = useState(false)
  const [financeModal, setFinanceModal] = useState(false)
  const [equityModal, setEquityModal] = useState(false)
  const [financeForm] = Form.useForm()
  const [timelineForm] = Form.useForm()
  const [equityForm] = Form.useForm()
  const [tabKey, setTabKey] = useState('overview')
  const [finReportType, setFinReportType] = useState('monthly') // 'monthly' | 'annual'
  const [exporting, setExporting] = useState(false)
  const revenueChartRef = useRef(null)
  const ratioChartRef = useRef(null)
  const cashChartRef = useRef(null)

  // 当前最新一轮股权结构（最新在前）
  const latestEquity = equityHistory[0]
  const totalEquityRatio = latestEquity
    ? latestEquity.shareholders.reduce((s, x) => s + (Number(x.ratio) || 0), 0)
    : 0

  // 挂载时确保亮点已生成
  React.useEffect(() => {
    if (project) ensureHighlights(project.id)
  }, [project])

  const projectTasks = state.todos.filter((t) => t.projectId === project?.id && t.status !== 'done')

  const filteredTimeline = useMemo(() => {
    let list = [...timeline]
    if (yearFilter) list = list.filter((t) => t.date.startsWith(String(yearFilter)))
    if (typeFilter) list = list.filter((t) => t.type === typeFilter)
    return list
  }, [timeline, yearFilter, typeFilter])

  if (!project) {
    return <Empty description="项目不存在" />
  }

  const status = statusConfig[project.status] || statusConfig.normal

  // 图表配置 - 美式科技风
  const techChartBase = {
    textStyle: {
      fontFamily: 'Inter, -apple-system, sans-serif',
      fontSize: 12,
      color: '#64748b',
    },
    grid: { left: 48, right: 24, top: 56, bottom: 32, containLabel: true },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#0f172a',
      borderColor: '#0f172a',
      textStyle: { color: '#f8fafc', fontSize: 12, fontFamily: 'Inter' },
      extraCssText: 'border-radius: 8px; box-shadow: 0 8px 24px -4px rgb(0 0 0 / 0.4);',
    },
  }

  const revenueOption = {
    ...techChartBase,
    legend: {
      data: ['营收', '毛利', '净利润'],
      top: 12,
      right: 12,
      textStyle: { color: '#64748b', fontSize: 12 },
      itemWidth: 10,
      itemHeight: 10,
      icon: 'circle',
    },
    xAxis: {
      type: 'category',
      data: yearlyData.map((y) => y.label),
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisTick: { show: false },
      axisLabel: { color: '#64748b', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      name: '万元',
      nameTextStyle: { color: '#94a3b8', fontSize: 11 },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
      axisLabel: { color: '#64748b', fontSize: 11 },
    },
    series: [
      {
        name: '营收',
        type: 'bar',
        data: yearlyData.map((y) => y.revenue),
        itemStyle: { color: '#2563eb', borderRadius: [4, 4, 0, 0] },
        barWidth: 18,
      },
      {
        name: '毛利',
        type: 'bar',
        data: yearlyData.map((y) => y.grossProfit),
        itemStyle: { color: '#10b981', borderRadius: [4, 4, 0, 0] },
        barWidth: 18,
      },
      {
        name: '净利润',
        type: 'line',
        smooth: true,
        data: yearlyData.map((y) => y.netProfit),
        itemStyle: { color: '#f59e0b' },
        lineStyle: { width: 3 },
        symbol: 'circle',
        symbolSize: 8,
      },
    ],
  }

  const ratioOption = {
    ...techChartBase,
    legend: {
      data: ['净利润率', '毛利率', '资产负债率'],
      top: 12,
      right: 12,
      textStyle: { color: '#64748b', fontSize: 12 },
      itemWidth: 10,
      itemHeight: 10,
      icon: 'circle',
    },
    xAxis: {
      type: 'category',
      data: yearlyData.map((y) => y.label),
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisTick: { show: false },
      axisLabel: { color: '#64748b', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      axisLabel: { formatter: (v) => Math.round(v * 100) + '%', color: '#64748b', fontSize: 11 },
      max: 1,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
    },
    series: [
      {
        name: '净利润率',
        type: 'line',
        smooth: true,
        data: yearlyData.map((y) => y.netMargin),
        itemStyle: { color: '#7c3aed' },
        symbol: 'circle',
        symbolSize: 7,
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(124, 58, 237, 0.2)' },
              { offset: 1, color: 'rgba(124, 58, 237, 0)' },
            ],
          },
        },
      },
      { name: '毛利率', type: 'line', smooth: true, data: yearlyData.map((y) => y.grossMargin), itemStyle: { color: '#06b6d4' }, symbol: 'circle', symbolSize: 7 },
      { name: '资产负债率', type: 'line', smooth: true, data: yearlyData.map((y) => y.debtRatio), itemStyle: { color: '#ec4899' }, lineStyle: { type: 'dashed' }, symbol: 'circle', symbolSize: 7 },
    ],
  }

  const cashOption = {
    ...techChartBase,
    grid: { left: 48, right: 24, top: 24, bottom: 32, containLabel: true },
    xAxis: {
      type: 'category',
      data: financeData.map((x) => x.period),
      boundaryGap: false,
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisTick: { show: false },
      axisLabel: { color: '#64748b', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      name: '万元',
      nameTextStyle: { color: '#94a3b8', fontSize: 11 },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
      axisLabel: { color: '#64748b', fontSize: 11 },
    },
    series: [
      {
        name: '经营现金流净额',
        type: 'line',
        smooth: true,
        data: financeData.map((x) => x.operatingCashFlow),
        itemStyle: { color: '#10b981' },
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 2.5 },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(16, 185, 129, 0.25)' },
              { offset: 1, color: 'rgba(16, 185, 129, 0)' },
            ],
          },
        },
        markLine: {
          symbol: 'none',
          data: [{ yAxis: 0, lineStyle: { color: '#ef4444', type: 'dashed', width: 1 } }],
        },
      },
    ],
  }

  const handleExportReport = async () => {
    try {
      setExporting(true)
      message.loading({ content: '正在生成报告...', key: 'exp', duration: 0 })
      // 收集三张趋势图为 base64 PNG，嵌入 Word 报告
      const grabChart = (ref) => {
        try {
          const inst = ref.current?.getEchartsInstance?.()
          if (inst) return inst.getDataURL({ pixelRatio: 2, backgroundColor: '#ffffff', type: 'png' })
        } catch (e) {
          /* ignore */
        }
        return null
      }
      const charts = []
      const rev = grabChart(revenueChartRef)
      const ratio = grabChart(ratioChartRef)
      const cash = grabChart(cashChartRef)
      if (rev) charts.push({ title: '营收与利润趋势', dataUrl: rev })
      if (ratio) charts.push({ title: '盈利能力与偿债能力趋势', dataUrl: ratio })
      if (cash) charts.push({ title: '经营现金流趋势（季度）', dataUrl: cash })
      await exportProjectToDocx(project, financeData, timeline, charts)
      message.success({ content: '报告导出成功（已嵌入趋势图）', key: 'exp' })
    } catch (e) {
      message.error({ content: '导出失败', key: 'exp' })
    } finally {
      setExporting(false)
    }
  }

  const handleAddTimeline = async () => {
    try {
      const v = await timelineForm.validateFields()
      addTimelineEvent(project.id, {
        date: dayjs(v.date).format('YYYY-MM-DD'),
        type: v.type,
        typeLabel: allTypeOptions.find((x) => x.value === v.type)?.label || '其他',
        title: v.title,
        description: v.description,
        operator: '王经理',
        attachments: v.attachments || [],
      })
      message.success('时间轴记录添加成功')
      setTimelineModal(false)
      timelineForm.resetFields()
    } catch (e) {
      //
    }
  }

  const handleAddEquity = async () => {
    try {
      const v = await equityForm.validateFields()
      addEquityEvent(project.id, {
        date: dayjs(v.date).format('YYYY-MM-DD'),
        round: v.round,
        title: v.title,
        description: v.description,
        shareholders: v.shareholders || [],
      })
      message.success('股权变更记录添加成功')
      setEquityModal(false)
      equityForm.resetFields()
    } catch (e) {
      //
    }
  }

  const handleDeleteEquity = (eventId) => {
    modal.confirm({
      title: '删除该轮股权记录？',
      content: '删除后不可恢复，但不会影响已生成的项目报告。',
      okText: '删除',
      okButtonProps: { danger: true },
      onOk: () => {
        deleteEquityEvent(project.id, eventId)
        message.success('已删除')
      },
    })
  }

  // 表单式财报填报：月报（期间 YYYYMM）/ 年报（期间 YYYY），同期间覆盖更新
  const handleFinanceSubmit = async () => {
    try {
      const v = await financeForm.validateFields()
      const year = Number(v.year)
      const period = finReportType === 'monthly' ? `${year}${String(v.month).padStart(2, '0')}` : `${year}`
      addFinanceData(project.id, {
        period,
        year,
        quarter: 0,
        revenue: Number(v.revenue) || 0,
        grossProfit: Number(v.grossProfit) || 0,
        netProfit: Number(v.netProfit) || 0,
        debtRatio: Number(v.debtRatioPct) ? Number(v.debtRatioPct) / 100 : 0,
        operatingCashFlow: Number(v.operatingCashFlow) || 0,
      })
      message.success(`财报数据已保存（${period}），看板与后台已更新`)
      setFinanceModal(false)
      financeForm.resetFields()
    } catch (e) {
      // 表单校验未通过
    }
  }

  // 财务核心指标卡
  const latestYear = yearlyData[yearlyData.length - 1]
  const prevYear = yearlyData[yearlyData.length - 2]
  const financeStatCards = latestYear ? [
    {
      title: `${latestYear.label}营收`,
      value: latestYear.revenue,
      suffix: '万元',
      color: '#2563eb',
      bg: 'rgba(37, 99, 235, 0.08)',
      sub: prevYear ? `YoY ${latestYear.revenue / prevYear.revenue - 1 >= 0 ? '+' : ''}${Math.round((latestYear.revenue / prevYear.revenue - 1) * 100)}%` : '-',
    },
    {
      title: `${latestYear.label}净利润`,
      value: latestYear.netProfit,
      suffix: '万元',
      color: latestYear.netProfit >= 0 ? '#059669' : '#dc2626',
      bg: latestYear.netProfit >= 0 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
      sub: `净利率 ${Math.round(latestYear.netMargin * 100)}%`,
    },
    {
      title: `${latestYear.label}毛利率`,
      value: Math.round(latestYear.grossMargin * 100),
      suffix: '%',
      color: '#0891b2',
      bg: 'rgba(6, 182, 212, 0.08)',
      sub: `毛利 ${latestYear.grossProfit.toLocaleString()} 万`,
    },
    {
      title: `${latestYear.label}资产负债率`,
      value: Math.round(latestYear.debtRatio * 100),
      suffix: '%',
      color: latestYear.debtRatio > 0.7 ? '#dc2626' : '#7c3aed',
      bg: latestYear.debtRatio > 0.7 ? 'rgba(239, 68, 68, 0.08)' : 'rgba(124, 58, 237, 0.08)',
      sub: `经营现金流 ${latestYear.operatingCashFlow.toLocaleString()} 万`,
    },
  ] : []

  return (
    <div className="space-y-5 animate-fade-in">
      {/* 顶部导航 + 操作 - 美式科技风 */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(-1)}
            className="!w-9 !h-9 !flex items-center justify-center hover:!bg-slate-100"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`status-dot ${status.dotClass}`} />
              <h2 className="text-[20px] font-bold tracking-tight text-slate-900 m-0 truncate">
                {project.name}
              </h2>
              <Tag color={status.color}>{status.text}</Tag>
            </div>
            <div className="text-[12px] text-slate-500 flex items-center gap-2 flex-wrap">
              <Tag color="blue" className="!m-0">{project.industry}</Tag>
              {(project.tags || []).slice(0, 3).map((t) => (
                <Tag key={t} className="!m-0">{t}</Tag>
              ))}
            </div>
          </div>
        </div>
        <Space wrap>
          {projectTasks.length > 0 && (
            <Badge count={projectTasks.length} size="small" offset={[-2, 2]}>
              <Button icon={<HistoryOutlined />} onClick={() => navigate('/tasks')}>
                <span className="mobile-hide">待办({projectTasks.length})</span>
              </Button>
            </Badge>
          )}
          {can('project.edit') && (
            <Button icon={<EditOutlined />} onClick={() => navigate(`/projects/${project.id}/edit`)}>
              <span className="mobile-hide">编辑项目</span>
            </Button>
          )}
          <Button
            icon={<DownloadOutlined />}
            type="primary"
            loading={exporting}
            onClick={handleExportReport}
          >
            <span className="mobile-hide">导出完整报告</span>
          </Button>
        </Space>
      </div>

      {/* 项目概览信息卡 */}
      <Card>
        <Descriptions
          column={{ xs: 1, sm: 2, md: 3 }}
          size="small"
          extra={
            <Space>
              <Button size="small" icon={<TeamOutlined />}>投资团队</Button>
              <Button size="small" icon={<PaperClipOutlined />}>
                附件({project.attachments?.length || 0})
              </Button>
            </Space>
          }
        >
          <Descriptions.Item label={<span className="text-slate-500 text-[12px] uppercase tracking-wider">投资时间</span>}>
            <span className="flex items-center gap-1.5 font-mono font-medium text-slate-900">
              <CalendarOutlined className="text-slate-400" />
              {project.investDate}
            </span>
          </Descriptions.Item>
          <Descriptions.Item label={<span className="text-slate-500 text-[12px] uppercase tracking-wider">投资金额</span>}>
            <span className="flex items-center gap-1.5 font-mono font-semibold text-emerald-600">
              <DollarOutlined />
              {project.investAmountDisplay}
            </span>
          </Descriptions.Item>
          <Descriptions.Item label={<span className="text-slate-500 text-[12px] uppercase tracking-wider">投资方式</span>}>
            <Tag color="geekblue">{project.investType}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label={<span className="text-slate-500 text-[12px] uppercase tracking-wider">投资方及占比</span>} span={2}>
            <Space wrap>
              {project.investors.map((inv) => (
                <Tag key={inv.name} color="blue">
                  {inv.name} <span className="text-slate-500">· {inv.ratio}%</span>
                </Tag>
              ))}
            </Space>
          </Descriptions.Item>
          {project.directors && (
            <>
              <Descriptions.Item label={<span className="text-slate-500 text-[12px] uppercase tracking-wider">总经理</span>}>
                <span className="font-medium text-slate-900">{project.directors.generalManager || '-'}</span>
              </Descriptions.Item>
              <Descriptions.Item label={<span className="text-slate-500 text-[12px] uppercase tracking-wider">董事长</span>}>
                <span className="font-medium text-slate-900">{project.directors.chairman || '-'}</span>
              </Descriptions.Item>
              <Descriptions.Item label={<span className="text-slate-500 text-[12px] uppercase tracking-wider">监事</span>}>
                {project.directors.supervisors && project.directors.supervisors.length ? (
                  <Space wrap>
                    {project.directors.supervisors.map((m) => (
                      <Tag key={m} color="cyan">{m}</Tag>
                    ))}
                  </Space>
                ) : (
                  <span className="text-slate-400">-</span>
                )}
              </Descriptions.Item>
              <Descriptions.Item label={<span className="text-slate-500 text-[12px] uppercase tracking-wider">董事会成员</span>} span={3}>
                {project.directors.boardMembers && project.directors.boardMembers.length ? (
                  <Space wrap>
                    {project.directors.boardMembers.map((m) => (
                      <Tag key={m} color="purple">{m}</Tag>
                    ))}
                  </Space>
                ) : (
                  <span className="text-slate-400">-</span>
                )}
              </Descriptions.Item>
            </>
          )}
          <Descriptions.Item label={<span className="text-slate-500 text-[12px] uppercase tracking-wider">团队规模</span>}>
            <span className="font-medium text-slate-900">{project.teamSize || '-'}</span>
          </Descriptions.Item>
          <Descriptions.Item label={<span className="text-slate-500 text-[12px] uppercase tracking-wider">公司网站</span>} span={2}>
            {project.website ? (
              <a href={project.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                {project.website}
              </a>
            ) : (
              <span className="text-slate-400">-</span>
            )}
          </Descriptions.Item>
          <Descriptions.Item label={<span className="text-slate-500 text-[12px] uppercase tracking-wider">项目简介</span>} span={3}>
            <span className="text-slate-700 leading-relaxed">{project.description}</span>
          </Descriptions.Item>
        </Descriptions>

        <Divider style={{ margin: '16px 0' }} />

        <Collapse
          ghost
          items={[
            {
              key: 'clauses',
              label: (
                <span className="flex items-center gap-2 font-medium text-slate-900">
                  <div
                    className="flex items-center justify-center rounded-md"
                    style={{ width: 24, height: 24, background: 'rgba(124, 58, 237, 0.1)' }}
                  >
                    <SafetyCertificateOutlined style={{ color: '#7c3aed', fontSize: 13 }} />
                  </div>
                  核心投资条款
                  <span className="text-[11px] text-slate-400 font-normal">点击展开</span>
                </span>
              ),
              children: (
                <Row gutter={[16, 12]}>
                  {Object.entries(project.clauses || {}).map(([k, v]) => {
                    const map = {
                      repurchase: { label: '回购条款', color: 'red' },
                      liquidation: { label: '优先清算权', color: 'blue' },
                      antiDilution: { label: '反稀释条款', color: 'orange' },
                      tagAlong: { label: '随售权', color: 'green' },
                      dragAlong: { label: '拖售权', color: 'cyan' },
                      veto: { label: '保护性条款(一票否决)', color: 'purple' },
                    }
                    const cfg = map[k] || { label: k, color: 'default' }
                    return (
                      <Col xs={24} md={12} key={k}>
                        <Card size="small" styles={{ body: { padding: 12 } }} className="!bg-slate-50/50">
                          <Tag color={cfg.color} className="mb-2">{cfg.label}</Tag>
                          <div className="text-[13px] text-slate-700 leading-relaxed">{v}</div>
                        </Card>
                      </Col>
                    )
                  })}
                </Row>
              ),
            },
          ]}
        />
      </Card>

      <Tabs activeKey={tabKey} onChange={setTabKey} size="large">
        {/* Tab: 财务数据看板 */}
        <TabPane
          tab={
            <span className="flex items-center gap-1.5">
              <FundOutlined />
              财务数据看板
            </span>
          }
          key="finance"
        >
          {/* 核心指标卡 - 美式科技风 */}
          <Row gutter={[12, 12]} className="mb-4">
            {financeStatCards.map((s, i) => (
              <Col xs={12} md={6} key={i}>
                <Card size="small" className="card-hover" styles={{ body: { padding: 16 } }}>
                  <div className="flex items-start justify-between mb-2">
                    <div
                      className="flex items-center justify-center rounded-md"
                      style={{ width: 30, height: 30, background: s.bg }}
                    >
                      <RiseOutlined style={{ color: s.color, fontSize: 14 }} />
                    </div>
                  </div>
                  <div className="section-title !mb-1">{s.title}</div>
                  <div className="flex items-baseline gap-1">
                    <span className="font-mono font-bold tracking-tight text-[22px] leading-none" style={{ color: s.color }}>
                      {s.value}
                    </span>
                    <span className="text-[12px] font-medium text-slate-500">{s.suffix}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1.5 font-medium">{s.sub}</div>
                </Card>
              </Col>
            ))}
          </Row>

          {/* AI亮点 - 规格书 10.3：Badge 形式展示 */}
          {highlights.length > 0 && (
            <div
              className="rounded-xl p-4 mb-4"
              style={{
                background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.06) 0%, rgba(124, 58, 237, 0.01) 100%)',
                border: '1px solid rgba(124, 58, 237, 0.15)',
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="flex items-center justify-center rounded-lg flex-shrink-0"
                  style={{ width: 28, height: 28, background: 'rgba(124, 58, 237, 0.12)' }}
                >
                  <RobotOutlined style={{ color: '#7c3aed', fontSize: 14 }} />
                </div>
                <span className="font-semibold text-slate-900 text-[14px]">AI 数据亮点</span>
                <Tag color="purple" className="!m-0 !text-[11px]">AUTO</Tag>
              </div>
              <div className="flex flex-wrap gap-2">
                {highlights.map((h) => (
                  <Tag
                    key={h.id}
                    className="!px-3 !py-1 !text-[12px] !rounded-full"
                    style={{
                      background: h.tone === 'positive' ? 'rgba(16, 185, 129, 0.1)' : h.tone === 'negative' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                      color: h.tone === 'positive' ? '#059669' : h.tone === 'negative' ? '#dc2626' : '#b45309',
                      border: `1px solid ${h.tone === 'positive' ? 'rgba(16, 185, 129, 0.3)' : h.tone === 'negative' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                    }}
                  >
                    {h.text}
                  </Tag>
                ))}
              </div>
            </div>
          )}

          {/* 图表区 */}
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <Card
                title="营收与利润趋势"
                size="small"
                className="card-hover"
              >
                <ReactECharts ref={revenueChartRef} option={revenueOption} style={{ height: 280 }} notMerge lazyUpdate />
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="盈利能力与偿债能力趋势" size="small" className="card-hover">
                <ReactECharts ref={ratioChartRef} option={ratioOption} style={{ height: 280 }} notMerge lazyUpdate />
              </Card>
            </Col>
            <Col xs={24}>
              <Card title="经营现金流趋势（季度）" size="small" className="card-hover">
                <ReactECharts ref={cashChartRef} option={cashOption} style={{ height: 240 }} notMerge lazyUpdate />
              </Card>
            </Col>
          </Row>

          <div className="mt-4 flex justify-end gap-2">
            {can('finance.edit') && (
              <Button icon={<FormOutlined />} onClick={() => setFinanceModal(true)}>
                填报财报数据
              </Button>
            )}
            <Button type="primary" onClick={() => navigate('/finance-summary')}>
              查看完整财务数据
            </Button>
          </div>
        </TabPane>

        {/* Tab: 投后情况（时间轴） */}
        <TabPane
          tab={
            <span className="flex items-center gap-1.5">
              <HistoryOutlined />
              投后情况
            </span>
          }
          key="timeline"
        >
          <Card
            title={
              <div className="flex flex-wrap items-center gap-2 justify-between w-full">
                <span className="font-semibold text-slate-900 text-[14px]">
                  投后动作时间轴
                  <Tag className="!ml-2 !m-0">{timeline.length} 条记录</Tag>
                </span>
                <Space wrap>
                  <Select
                    allowClear
                    placeholder="年份"
                    style={{ width: 110 }}
                    value={yearFilter}
                    onChange={setYearFilter}
                    options={Array.from(new Set(timeline.map((t) => t.date.slice(0, 4))))
                      .sort()
                      .map((y) => ({ value: Number(y), label: y + '年' }))}
                  />
                  <Select
                    allowClear
                    placeholder="动作类型"
                    style={{ width: 140 }}
                    value={typeFilter}
                    onChange={setTypeFilter}
                    options={allTypeOptions}
                  />
                  <Space>
                    <Dropdown
                      menu={{
                        items: [
                          { key: 'txt', icon: <FileTextOutlined />, label: '导出 TXT', onClick: () => exportTimelineToTxt(project.name, filteredTimeline, 'txt') },
                          { key: 'md', icon: <FileTextOutlined />, label: '导出 Markdown', onClick: () => exportTimelineToTxt(project.name, filteredTimeline, 'md') },
                        ],
                      }}
                    >
                      <Button icon={<DownloadOutlined />}>
                        <span className="mobile-hide">下载</span>
                      </Button>
                    </Dropdown>
                    {can('timeline.edit') && (
                      <Button type="primary" icon={<PlusOutlined />} onClick={() => setTimelineModal(true)}>
                        添加记录
                      </Button>
                    )}
                  </Space>
                </Space>
              </div>
            }
          >
            {filteredTimeline.length === 0 ? (
              <Empty description="暂无符合条件的记录" />
            ) : (
              <Timeline
                mode="left"
                items={filteredTimeline.map((item) => ({
                  color: getActionTypeColor(item.type),
                  label: (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-right">
                      <span className="font-mono text-[13px] font-semibold text-slate-700">{item.date}</span>
                      <Tag color={getActionTypeColor(item.type)} className="!text-[11px]">
                        {item.typeLabel}
                      </Tag>
                    </div>
                  ),
                  children: (
                    <Card size="small" className="card-hover !mb-3" styles={{ body: { padding: 12 } }}>
                      <div className="font-semibold mb-1 flex items-center justify-between text-slate-900">
                        <span className="text-[14px]">{item.title}</span>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                          <Avatar size={18} className="!w-[18px] !h-[18px] !text-[10px]" style={{ background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)' }}>
                            {item.operator?.[0]}
                          </Avatar>
                          <span className="font-medium">{item.operator}</span>
                        </span>
                      </div>
                      <div className="text-[13px] text-slate-600 leading-relaxed whitespace-pre-wrap">
                        {item.description}
                      </div>
                      {item.attachments?.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap gap-1">
                          {item.attachments.map((a, i) => (
                            <Tag key={i} icon={<PaperClipOutlined />} className="!m-0">{a}</Tag>
                          ))}
                        </div>
                      )}
                    </Card>
                  ),
                }))}
              />
            )}
          </Card>
        </TabPane>

        {/* Tab: 股权结构 */}
        <TabPane
          tab={
            <span className="flex items-center gap-1.5">
              <ApartmentOutlined />
              股权结构
            </span>
          }
          key="equity"
        >
          <Card
            title={
              <div className="flex flex-wrap items-center gap-2 justify-between w-full">
                <span className="font-semibold text-slate-900 text-[14px]">
                  股权变动时间线（多轮融资）
                  <Tag className="!ml-2 !m-0">{equityHistory.length} 轮记录</Tag>
                </span>
                {can('equity.edit') && (
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => setEquityModal(true)}>
                    新增融资/股权记录
                  </Button>
                )}
              </div>
            }
          >
            {equityHistory.length === 0 ? (
              <Empty description="暂无股权变更记录" />
            ) : (
              <Row gutter={[16, 16]}>
                {/* 当前最新股权结构 */}
                <Col xs={24} lg={8}>
                  <Card
                    size="small"
                    title={
                      <span className="flex items-center gap-1.5 text-[13px] font-semibold">
                        <PercentageOutlined style={{ color: '#2563eb' }} />
                        当前股权结构
                        <Tag color="blue" className="!m-0 !text-[11px]">{latestEquity.round}</Tag>
                      </span>
                    }
                    className="!h-full"
                  >
                    <div className="text-[11px] text-slate-400 mb-3">{latestEquity.date} · {latestEquity.title}</div>
                    <div className="space-y-3">
                      {latestEquity.shareholders.map((s) => (
                        <div key={s.name}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[12px] text-slate-600 font-medium">{s.name}</span>
                            <span className="font-mono text-[12px] font-semibold text-slate-800">
                              {Number(s.ratio).toFixed(1)}%
                            </span>
                          </div>
                          <Progress
                            percent={Number(s.ratio)}
                            showInfo={false}
                            strokeColor={{ from: '#2563eb', to: '#3b82f6' }}
                            size="small"
                          />
                        </div>
                      ))}
                      <div className="text-[10px] text-slate-400 border-t border-slate-100 pt-2">
                        合计 {totalEquityRatio.toFixed(1)}%（含未摊薄差异）
                      </div>
                    </div>
                  </Card>
                </Col>
                {/* 股权变更时间线 */}
                <Col xs={24} lg={16}>
                  <Timeline
                    items={equityHistory.map((ev) => ({
                      color: '#2563eb',
                      label: (
                        <div className="text-right">
                          <div className="font-mono text-[13px] font-semibold text-slate-700">{ev.date}</div>
                          <Tag color="blue" className="!text-[11px]">{ev.round}</Tag>
                        </div>
                      ),
                      children: (
                        <Card
                          size="small"
                          className="card-hover !mb-3"
                          styles={{ body: { padding: 12 } }}
                          extra={
                            can('equity.edit') && (
                              <Button
                                size="small"
                                type="text"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => handleDeleteEquity(ev.id)}
                              />
                            )
                          }
                        >
                          <div className="font-semibold text-[14px] text-slate-900 mb-1">{ev.title}</div>
                          {ev.description && (
                            <div className="text-[13px] text-slate-600 leading-relaxed mb-2">{ev.description}</div>
                          )}
                          <div className="flex flex-wrap gap-1.5">
                            {ev.shareholders.map((s) => (
                              <Tag key={s.name} className="!m-0 !text-[11px]">
                                {s.name} · {Number(s.ratio).toFixed(1)}%
                              </Tag>
                            ))}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-2">
                            记录人：{ev.operator || '王经理'} {ev.createdAt ? ` · ${ev.createdAt}` : ''}
                          </div>
                        </Card>
                      ),
                    }))}
                  />
                </Col>
              </Row>
            )}
          </Card>
        </TabPane>

        {/* Tab: 待办任务 */}
        <TabPane
          tab={
            <span className="flex items-center gap-1.5">
              <Badge dot={projectTasks.some((t) => t.status === 'overdue')}>
                <HistoryOutlined />
                待办任务
              </Badge>
            </span>
          }
          key="tasks"
        >
          <Card>
            {projectTasks.length === 0 ? (
              <Empty description="本项目暂无待办任务" />
            ) : (
              <List
                dataSource={projectTasks}
                renderItem={(t) => {
                  const diff = dayjs(t.dueDate).diff(dayjs(), 'day')
                  const isOverdue = t.status === 'overdue' || diff < 0
                  return (
                    <List.Item className="timeline-item !px-3 rounded-lg cursor-pointer" onClick={() => navigate('/tasks')}>
                      <List.Item.Meta
                        title={
                          <div className="flex flex-wrap items-center gap-2">
                            <Tag color={isOverdue ? 'red' : 'blue'}>{t.typeLabel}</Tag>
                            <span className={`text-[14px] ${isOverdue ? 'text-red-600 font-semibold' : 'font-medium text-slate-900'}`}>
                              {t.title}
                            </span>
                          </div>
                        }
                        description={<span className="text-[13px] text-slate-500">{t.desc}</span>}
                      />
                      <div className="text-right ml-2 flex-shrink-0">
                        <div className={`font-mono text-[13px] font-semibold ${isOverdue ? 'text-red-600' : 'text-slate-700'}`}>
                          {t.dueDate}
                        </div>
                        <div className={`text-[11px] font-medium ${isOverdue ? 'text-red-500' : 'text-slate-400'}`}>
                          {isOverdue ? `逾期 ${-diff} 天` : diff === 0 ? '今日截止' : `剩余 ${diff} 天`}
                        </div>
                        {t.attachment && (
                          <Button
                            size="small"
                            type="link"
                            icon={<FileTextOutlined />}
                            onClick={(e) => {
                              e.stopPropagation()
                              exportInquiryDraft(project, 'Q2')
                            }}
                            className="!p-0 !text-[11px]"
                          >
                            下载草稿
                          </Button>
                        )}
                      </div>
                    </List.Item>
                  )
                }}
              />
            )}
          </Card>
        </TabPane>
      </Tabs>

      {/* 新增时间轴 Modal */}
      <Modal
        title="新增投后时间轴记录"
        open={timelineModal}
        onCancel={() => setTimelineModal(false)}
        onOk={handleAddTimeline}
        okText="保存记录"
        destroyOnClose
        width={560}
      >
        <Form form={timelineForm} layout="vertical" preserve={false}>
          <Row gutter={12}>
            <Col xs={12}>
              <Form.Item label="时间" name="date" rules={[{ required: true, message: '请选择' }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={12}>
              <Form.Item label="动作类型" name="type" rules={[{ required: true }]}>
                <Select options={allTypeOptions} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="标题" name="title" rules={[{ required: true }]}>
            <Input placeholder="如：Q2经营问询函发送、现场走访调研等" />
          </Form.Item>
          <Form.Item label="内容简述" name="description" rules={[{ required: true }]}>
            <TextArea rows={4} placeholder="请填写记录的详细内容、关键结论、待跟进事项等" />
          </Form.Item>
          <Form.Item label="附件" name="attachments" valuePropName="fileList" getValueFromEvent={(e) => e?.fileList?.map((f) => f.name)}>
            <Upload multiple beforeUpload={() => false}>
              <Button icon={<PlusOutlined />}>上传附件（可选）</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

      {/* 财报填报 Modal */}
      <Modal
        title="填报财报数据"
        open={financeModal}
        onCancel={() => setFinanceModal(false)}
        onOk={handleFinanceSubmit}
        okText="保存财报"
        destroyOnClose
        width={560}
      >
        <Form
          form={financeForm}
          layout="vertical"
          preserve={false}
          initialValues={{ year: dayjs().year(), month: dayjs().month() + 1 }}
        >
          <Form.Item label="报表类型" className="!mb-3">
            <Radio.Group
              value={finReportType}
              onChange={(e) => setFinReportType(e.target.value)}
              optionType="button"
              buttonStyle="solid"
              options={[
                { value: 'monthly', label: '月报' },
                { value: 'annual', label: '年报' },
              ]}
            />
          </Form.Item>
          <Row gutter={12}>
            <Col span={finReportType === 'annual' ? 24 : 12}>
              <Form.Item label="年份" name="year" rules={[{ required: true, message: '请选择年份' }]}>
                <Select
                  options={Array.from({ length: 12 }, (_, i) => {
                    const y = dayjs().year() + 1 - i
                    return { value: y, label: `${y}年` }
                  })}
                />
              </Form.Item>
            </Col>
            {finReportType === 'monthly' && (
              <Col span={12}>
                <Form.Item label="月份" name="month" rules={[{ required: true, message: '请选择月份' }]}>
                  <Select
                    options={Array.from({ length: 12 }, (_, i) => ({
                      value: i + 1,
                      label: `${i + 1}月`,
                    }))}
                  />
                </Form.Item>
              </Col>
            )}
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="营业收入（万元）" name="revenue" rules={[{ required: true, message: '请输入营业收入' }]}>
                <InputNumber style={{ width: '100%' }} placeholder="如 2480.66" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="毛利（万元）" name="grossProfit">
                <InputNumber style={{ width: '100%' }} placeholder="选填" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="净利润（万元）" name="netProfit" rules={[{ required: true, message: '请输入净利润' }]}>
                <InputNumber style={{ width: '100%' }} placeholder="可为负数" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="资产负债率（%）" name="debtRatioPct">
                <InputNumber style={{ width: '100%' }} min={0} max={500} placeholder="选填，0-500" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="经营现金流（万元）" name="operatingCashFlow">
                <InputNumber style={{ width: '100%' }} placeholder="选填，可为负数" />
              </Form.Item>
            </Col>
          </Row>
          <Alert
            type="info"
            showIcon
            size="small"
            message="保存说明"
            description={
              finReportType === 'monthly'
                ? '月报保存后看板将展示「历年年报 + 最新一期」（如 2022/2023/2024/2025/202608）；同一期间重复填报将覆盖更新。'
                : '年报保存后该年度看板直接展示年度数据，优先于已有的月度/季度期间。'
            }
          />
        </Form>
      </Modal>

      {/* 新增融资/股权变更 Modal */}
      <Modal
        title="新增融资 / 股权变更记录"
        open={equityModal}
        onCancel={() => setEquityModal(false)}
        onOk={handleAddEquity}
        okText="保存记录"
        destroyOnClose
        width={620}
      >
        <Form form={equityForm} layout="vertical" preserve={false}>
          <Row gutter={12}>
            <Col xs={12}>
              <Form.Item label="变更日期" name="date" rules={[{ required: true, message: '请选择日期' }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={12}>
              <Form.Item label="轮次" name="round" rules={[{ required: true, message: '请输入轮次' }]}>
                <Input placeholder="如：天使轮 / A轮 / B轮 / 股权转让" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="标题" name="title">
            <Input placeholder="如：完成B轮融资，投后估值 10 亿元" />
          </Form.Item>
          <Form.Item label="事件描述" name="description">
            <TextArea rows={3} placeholder="请描述本轮融资/股权变动背景、估值、交割情况等" />
          </Form.Item>
          <div className="font-medium text-[13px] text-slate-700 mb-2">本轮融资后股权结构</div>
          <Form.List name="shareholders">
            {(fields, { add, remove }) => (
              <>
                {fields.map((field, idx) => (
                  <Row gutter={8} key={field.key} className="mb-2 items-center">
                    <Col flex="auto">
                      <Form.Item name={[field.name, 'name']} rules={[{ required: true, message: '股东名称' }]} className="!mb-0">
                        <Input placeholder="股东名称" />
                      </Form.Item>
                    </Col>
                    <Col style={{ width: 150 }}>
                      <Form.Item name={[field.name, 'ratio']} rules={[{ required: true, message: '占比%' }]} className="!mb-0">
                        <Input type="number" placeholder="占比(%)" suffix="%" />
                      </Form.Item>
                    </Col>
                    <Col flex="none">
                      <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} disabled={fields.length <= 1} />
                    </Col>
                  </Row>
                ))}
                <Button type="dashed" block icon={<PlusOutlined />} onClick={() => add({ name: '', ratio: 0 })}>
                  添加股东
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>
    </div>
  )
}
