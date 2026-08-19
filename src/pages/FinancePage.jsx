import React, { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card,
  Button,
  Table,
  Row,
  Col,
  Tabs,
  Space,
  App,
  Tag,
  Alert,
  Progress,
  Divider,
  Modal,
  Form,
  InputNumber,
  Select,
  Input,
  Popconfirm,
  Dropdown,
} from 'antd'
import {
  ArrowLeftOutlined,
  DownloadOutlined,
  FundOutlined,
  BulbOutlined,
  RobotOutlined,
  FileExcelOutlined,
  LineChartOutlined,
  DatabaseOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import dayjs from 'dayjs'
import { getYearlyFinance } from '../data/mockData.js'
import { useStore, can, addFinanceData, ensureHighlights, updateHighlight, deleteHighlight, addHighlight } from '../data/store.js'

const { TabPane } = Tabs

export default function FinancePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { message } = App.useApp()
  const state = useStore()
  const project = state.projects.find((p) => p.id === id) || state.projects[0]

  const financeData = useMemo(() => state.finance[project?.id] || [], [state.finance, project?.id])
  const yearlyData = useMemo(() => getYearlyFinance(financeData), [financeData])
  const highlights = useMemo(() => state.highlights[project?.id] || [], [state.highlights, project?.id])

  // 上传新财报
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadForm] = Form.useForm()
  // 编辑亮点
  const [editHl, setEditHl] = useState(null)
  const [editText, setEditText] = useState('')
  const [newHlOpen, setNewHlOpen] = useState(false)
  const [newHlText, setNewHlText] = useState('')

  React.useEffect(() => {
    if (project) ensureHighlights(project.id)
  }, [project])

  if (!project) {
    return <Alert type="error" showIcon message="项目不存在" />
  }

  const toneMap = {
    positive: { color: '#059669', bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.3)' },
    negative: { color: '#dc2626', bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)' },
    neutral: { color: '#b45309', bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.3)' },
  }

  const openUpload = () => {
    // 预填下一期间
    const latest = financeData[0]
    let year = dayjs().year()
    let quarter = Math.floor(dayjs().month() / 3) + 1
    if (latest) {
      let q = latest.quarter + 1
      let y = latest.year
      if (q > 4) { q = 1; y += 1 }
      year = y
      quarter = q
    }
    uploadForm.setFieldsValue({
      year,
      quarter,
      revenue: latest ? Math.round(latest.revenue * 1.06) : 5000,
      grossProfit: latest ? Math.round(latest.grossProfit * 1.06) : 2000,
      netProfit: latest ? Math.round(latest.netProfit * 1.06) : 800,
      debtRatio: latest ? latest.debtRatio : 0.5,
      operatingCashFlow: latest ? Math.round(latest.operatingCashFlow * 1.05) : 500,
    })
    setUploadOpen(true)
  }

  const submitUpload = async () => {
    try {
      const v = await uploadForm.validateFields()
      addFinanceData(project.id, {
        period: `${v.year}Q${v.quarter}`,
        year: v.year,
        quarter: v.quarter,
        revenue: v.revenue,
        grossProfit: v.grossProfit,
        netProfit: v.netProfit,
        debtRatio: v.debtRatio,
        operatingCashFlow: v.operatingCashFlow,
      })
      message.success(`财报数据已保存（${v.year}Q${v.quarter}），亮点已自动刷新`)
      setUploadOpen(false)
    } catch (e) {
      /* 校验未通过 */
    }
  }

  const fmtMoney = (v) => (v == null ? '-' : v.toLocaleString() + ' 万')
  const fmtPct = (v) => (v == null ? '-' : Math.round(v * 100) + '%')

  const quarterlyColumns = [
    {
      title: '期间',
      dataIndex: 'period',
      fixed: 'left',
      width: 90,
      render: (v, row) => <Tag color="blue" className="!font-mono !text-[11px]">{v}</Tag>,
    },
    {
      title: '营收',
      dataIndex: 'revenue',
      render: (v) => <span className="font-medium font-mono">{fmtMoney(v)}</span>,
      sorter: (a, b) => a.revenue - b.revenue,
    },
    {
      title: '毛利',
      dataIndex: 'grossProfit',
      render: (v) => <span className="font-mono text-slate-600">{fmtMoney(v)}</span>,
    },
    {
      title: '毛利率',
      render: (_, r) => <span className="font-mono text-slate-600">{fmtPct(r.grossProfit / r.revenue)}</span>,
    },
    {
      title: '净利润',
      dataIndex: 'netProfit',
      render: (v) => <span className={`font-mono font-medium ${v >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmtMoney(v)}</span>,
      sorter: (a, b) => a.netProfit - b.netProfit,
    },
    {
      title: '净利率',
      render: (_, r) => <span className="font-mono text-slate-600">{fmtPct(r.netProfit / r.revenue)}</span>,
    },
    {
      title: '资产负债率',
      dataIndex: 'debtRatio',
      render: (v) => (
        <span className={`font-mono ${v > 0.7 ? 'text-rose-600 font-medium' : 'text-slate-600'}`}>{fmtPct(v)}</span>
      ),
    },
    {
      title: '经营现金流净额',
      dataIndex: 'operatingCashFlow',
      render: (v) => <span className={`font-mono font-medium ${v >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmtMoney(v)}</span>,
    },
  ]

  const yearlyColumns = [
    {
      title: '年度',
      dataIndex: 'year',
      fixed: 'left',
      width: 90,
      render: (v, r) => <span className="font-semibold text-slate-900">{r.label || `${v}年`}</span>,
    },
    {
      title: '营收',
      dataIndex: 'revenue',
      render: (v, r, i) => {
        const prev = yearlyData[i - 1]?.revenue
        const yoy = prev ? ((v - prev) / prev) * 100 : null
        return (
          <div>
            <div className="font-medium font-mono">{fmtMoney(v)}</div>
            {yoy !== null && (
              <div className={`text-[11px] font-mono ${yoy >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                YoY {yoy >= 0 ? '+' : ''}{Math.round(yoy)}%
              </div>
            )}
          </div>
        )
      },
    },
    { title: '毛利', dataIndex: 'grossProfit', render: (v) => <span className="font-mono text-slate-600">{fmtMoney(v)}</span> },
    { title: '毛利率', dataIndex: 'grossMargin', render: (v) => <span className="font-mono text-slate-600">{fmtPct(v)}</span> },
    {
      title: '净利润',
      dataIndex: 'netProfit',
      render: (v, r, i) => {
        const prev = yearlyData[i - 1]?.netProfit
        const yoy = prev && prev !== 0 ? ((v - prev) / Math.abs(prev)) * 100 : null
        return (
          <div>
            <div className={`font-mono font-medium ${v >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmtMoney(v)}</div>
            {yoy !== null && (
              <div className={`text-[11px] font-mono ${yoy >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                YoY {yoy >= 0 ? '+' : ''}{Math.round(yoy)}%
              </div>
            )}
          </div>
        )
      },
    },
    { title: '净利率', dataIndex: 'netMargin', render: (v) => <span className="font-mono text-slate-600">{fmtPct(v)}</span> },
    {
      title: '资产负债率',
      dataIndex: 'debtRatio',
      render: (v) => {
        const lv = Math.round(v * 100)
        return (
          <div className="flex items-center gap-2 min-w-[120px]">
            <Progress
              percent={lv}
              showInfo={false}
              size="small"
              strokeColor={lv > 70 ? '#ef4444' : lv > 50 ? '#f59e0b' : '#10b981'}
              style={{ width: 60 }}
            />
            <span className={`font-mono ${lv > 70 ? 'text-rose-600 font-medium' : 'text-slate-600'}`}>{lv}%</span>
          </div>
        )
      },
    },
    {
      title: '经营现金流净额',
      dataIndex: 'operatingCashFlow',
      render: (v) => <span className={`font-mono font-medium ${v >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmtMoney(v)}</span>,
    },
  ]

  // 美式科技风 ECharts 基础配置
  const techChartBase = {
    textStyle: { fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#64748b' },
    grid: { left: 56, right: 56, top: 56, bottom: 36 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#0f172a',
      borderColor: '#0f172a',
      textStyle: { color: '#f8fafc', fontSize: 12 },
      extraCssText: 'border-radius: 8px; box-shadow: 0 8px 24px -4px rgb(0 0 0 / 0.4);',
      axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(37, 99, 235, 0.06)' } },
      formatter: (params) => {
        const list = Array.isArray(params) ? params : [params]
        if (!list.length) return ''
        let html = `<div style="font-weight:600;margin-bottom:6px;">${list[0].axisValue}</div>`
        for (const p of list) {
          const raw = p.value && typeof p.value === 'object' ? p.value.value : p.value
          const isPct = String(p.seriesName).includes('%')
          const val = isPct ? `${Number(raw).toFixed(1)}%` : raw
          html += `<div style="display:flex;align-items:center;gap:8px;line-height:1.7;">${p.marker}<span style="color:#cbd5e1;">${p.seriesName}</span><span style="font-weight:600;margin-left:auto;padding-left:12px;">${val}</span></div>`
        }
        return html
      },
    },
  }

  // 复合趋势图
  const trendOption = {
    ...techChartBase,
    legend: {
      data: ['营收(万)', '净利润(万)', '净利率(%)'],
      textStyle: { color: '#64748b', fontSize: 12 },
      itemWidth: 12,
      itemHeight: 12,
      icon: 'roundRect',
      top: 16,
    },
    xAxis: {
      type: 'category',
      data: financeData.map((f) => f.period),
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisTick: { show: false },
      axisLabel: { color: '#64748b', fontSize: 11 },
    },
    yAxis: [
      {
        type: 'value',
        name: '金额(万元)',
        position: 'left',
        nameTextStyle: { color: '#94a3b8', fontSize: 11 },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#94a3b8', fontSize: 11 },
        splitLine: { lineStyle: { color: '#f1f5f9' } },
      },
      {
        type: 'value',
        name: '净利率%',
        position: 'right',
        axisLabel: { formatter: '{value}%', color: '#94a3b8', fontSize: 11 },
        nameTextStyle: { color: '#94a3b8', fontSize: 11 },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        max: Math.max(30, ...yearlyData.map((y) => Math.round(y.netMargin * 100)) + 5),
      },
    ],
    series: [
      {
        name: '营收(万)',
        type: 'bar',
        data: financeData.map((f) => f.revenue),
        itemStyle: { color: '#2563eb', borderRadius: [4, 4, 0, 0] },
        barWidth: 16,
      },
      {
        name: '净利润(万)',
        type: 'bar',
        data: financeData.map((f) => f.netProfit),
        itemStyle: { color: '#10b981', borderRadius: [4, 4, 0, 0] },
        barWidth: 16,
      },
      {
        name: '净利率(%)',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        data: financeData.map((f) => Number(((f.netProfit / f.revenue) * 100).toFixed(1))),
        itemStyle: { color: '#f59e0b' },
        lineStyle: { width: 2.5 },
        symbol: 'circle',
        symbolSize: 7,
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(245, 158, 11, 0.18)' },
              { offset: 1, color: 'rgba(245, 158, 11, 0)' },
            ],
          },
        },
      },
    ],
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(`/projects/${id}`)} className="!px-2" />
          <div className="min-w-0">
            <h1 className="text-[26px] font-bold tracking-tight text-slate-900 m-0 leading-tight truncate">
              {project.name} · 财务数据中心
            </h1>
            <p className="text-[13px] text-slate-500 mt-1 font-mono">
              期间数据：{financeData[0]?.period} ~ {financeData[financeData.length - 1]?.period}
            </p>
          </div>
        </div>
        <Space wrap>
          <Dropdown
            menu={{
              items: [
                { key: 1, icon: <FileExcelOutlined />, label: '导出 Excel（季度明细）' },
                { key: 2, icon: <FileExcelOutlined />, label: '导出 Excel（年度汇总）' },
              ],
              onClick: () => message.success('导出功能已触发（演示环境）'),
            }}
          >
            <Button icon={<DownloadOutlined />}>导出财务数据</Button>
          </Dropdown>
          {can('finance.edit') && (
            <Button type="primary" icon={<PlusOutlined />} onClick={openUpload}>
              上传新财报
            </Button>
          )}
        </Space>
      </div>

      {/* 核心年度指标卡 - 美式科技风 */}
      <Row gutter={[16, 16]}>
        {yearlyData.map((y, i) => {
          const latest = i === yearlyData.length - 1
          return (
            <Col xs={12} sm={8} md={yearlyData.length <= 3 ? 8 : 6} key={y.year}>
              <Card
                size="small"
                className={`card-hover ${latest ? '!border-blue-300' : ''}`}
                styles={{ body: { padding: 18 } }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono font-semibold text-[14px] text-slate-900">{y.label || `${y.year}年`}</span>
                  {latest && (
                    <Tag color="blue" className="!text-[11px] !m-0">
                      <span className="status-dot status-dot-blue !inline-block !w-1.5 !h-1.5 !mr-1" />
                      最新
                    </Tag>
                  )}
                </div>
                <div className="section-title !mb-1.5">营收</div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="font-mono font-bold tracking-tight text-[24px] leading-none text-blue-600">
                    {y.revenue.toLocaleString()}
                  </span>
                  <span className="text-[13px] font-medium text-slate-500">万</span>
                </div>
                <div className="text-[12px] text-slate-500 mb-3">
                  净利润 <span className={`font-mono font-medium ${y.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {fmtMoney(y.netProfit)}
                  </span>
                </div>
                <Divider style={{ margin: '0 0 12px 0' }} />
                <Row gutter={8}>
                  <Col span={8}>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">毛利率</div>
                    <div className="font-mono text-[13px] font-medium text-slate-900">{fmtPct(y.grossMargin)}</div>
                  </Col>
                  <Col span={8}>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">净利率</div>
                    <div className="font-mono text-[13px] font-medium text-slate-900">{fmtPct(y.netMargin)}</div>
                  </Col>
                  <Col span={8}>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">负债率</div>
                    <div className={`font-mono text-[13px] font-medium ${y.debtRatio > 0.7 ? 'text-rose-600' : 'text-slate-900'}`}>
                      {fmtPct(y.debtRatio)}
                    </div>
                  </Col>
                </Row>
              </Card>
            </Col>
          )
        })}
      </Row>

      {/* AI数据亮点 - 规格书 10.3：Badge 展示，绿色正面/黄色中性，可编辑删除 */}
      <Card
        size="small"
        className="!border-violet-200"
        title={
          <span className="flex items-center gap-2">
            <div
              className="flex items-center justify-center rounded-md"
              style={{ width: 24, height: 24, background: 'rgba(124, 58, 237, 0.1)' }}
            >
              <RobotOutlined style={{ color: '#7c3aed', fontSize: 13 }} />
            </div>
            <span className="text-[14px] font-semibold text-slate-900">AI 智能亮点 & 趋势分析</span>
            <Tag color="purple" className="!ml-1 !text-[11px] !m-0">自动生成</Tag>
          </span>
        }
        extra={
          can('highlight.edit') ? (
            <Button size="small" icon={<PlusOutlined />} onClick={() => setNewHlOpen(true)}>
              手动添加
            </Button>
          ) : undefined
        }
      >
        <div className="flex flex-wrap gap-2">
          {highlights.length === 0 && (
            <span className="text-[13px] text-slate-400">暂无亮点，上传财报后自动生成</span>
          )}
          {highlights.map((h) => {
            const t = toneMap[h.tone] || toneMap.neutral
            return (
              <Tag
                key={h.id}
                className="!px-3 !py-1.5 !text-[12px] !rounded-full !m-0"
                style={{ background: t.bg, color: t.color, border: `1px solid ${t.border}` }}
                closeIcon={
                  can('highlight.edit') ? <DeleteOutlined style={{ color: t.color, fontSize: 11 }} /> : undefined
                }
                onClose={(e) => {
                  e.preventDefault()
                  deleteHighlight(project.id, h.id)
                }}
                icon={<BulbOutlined style={{ color: t.color, fontSize: 12 }} />}
              >
                {h.text}
                {can('highlight.edit') && (
                  <a
                    className="!ml-2 !text-[11px] !text-slate-400 hover:!text-slate-600"
                    style={{ marginLeft: 4 }}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setEditHl(h)
                      setEditText(h.text)
                    }}
                  >
                    <EditOutlined />
                  </a>
                )}
              </Tag>
            )
          })}
        </div>
      </Card>

      {/* 复合趋势大图 - 美式科技风 */}
      <Card
        title={
          <span className="flex items-center gap-2">
            <div
              className="flex items-center justify-center rounded-md"
              style={{ width: 24, height: 24, background: 'rgba(37, 99, 235, 0.1)' }}
            >
              <LineChartOutlined style={{ color: '#2563eb', fontSize: 13 }} />
            </div>
            <span className="text-[14px] font-semibold text-slate-900">复合趋势图</span>
            <span className="text-[12px] text-slate-500 font-normal">营收 / 利润 / 净利率</span>
          </span>
        }
      >
        <ReactECharts option={trendOption} style={{ height: 380 }} notMerge />
      </Card>

      {/* 盈利能力与偿债能力趋势图（双轴图） - 规格书 4.6 */}
      <Card
        title={
          <span className="flex items-center gap-2">
            <div
              className="flex items-center justify-center rounded-md"
              style={{ width: 24, height: 24, background: 'rgba(245, 158, 11, 0.1)' }}
            >
              <LineChartOutlined style={{ color: '#f59e0b', fontSize: 13 }} />
            </div>
            <span className="text-[14px] font-semibold text-slate-900">盈利能力与偿债能力趋势图</span>
            <span className="text-[12px] text-slate-500 font-normal">净利润率 + 资产负债率</span>
          </span>
        }
      >
        <ReactECharts
          option={{
            ...techChartBase,
            legend: {
              data: ['净利润率(%)', '资产负债率(%)'],
              textStyle: { color: '#64748b', fontSize: 12 },
              itemWidth: 12,
              itemHeight: 12,
              icon: 'roundRect',
              top: 16,
            },
            xAxis: {
              type: 'category',
              data: financeData.map((f) => f.period),
              axisLine: { lineStyle: { color: '#e2e8f0' } },
              axisTick: { show: false },
              axisLabel: { color: '#64748b', fontSize: 11 },
            },
            yAxis: [
              {
                type: 'value',
                name: '净利润率%',
                position: 'left',
                nameTextStyle: { color: '#94a3b8', fontSize: 11 },
                axisLine: { show: false },
                axisTick: { show: false },
                axisLabel: { color: '#94a3b8', fontSize: 11 },
                splitLine: { lineStyle: { color: '#f1f5f9' } },
                scale: true,
              },
              {
                type: 'value',
                name: '资产负债率%',
                position: 'right',
                axisLabel: { formatter: '{value}%', color: '#94a3b8', fontSize: 11 },
                nameTextStyle: { color: '#94a3b8', fontSize: 11 },
                axisLine: { show: false },
                axisTick: { show: false },
                splitLine: { show: false },
                scale: true,
              },
            ],
            series: [
              {
                name: '净利润率(%)',
                type: 'line',
                smooth: true,
                data: financeData.map((f) => Math.round((f.netProfit / f.revenue) * 100)),
                itemStyle: { color: '#10b981' },
                lineStyle: { width: 2.5 },
                symbol: 'circle',
                symbolSize: 7,
                areaStyle: {
                  color: {
                    type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                    colorStops: [
                      { offset: 0, color: 'rgba(16, 185, 129, 0.16)' },
                      { offset: 1, color: 'rgba(16, 185, 129, 0)' },
                    ],
                  },
                },
              },
              {
                name: '资产负债率(%)',
                type: 'line',
                yAxisIndex: 1,
                smooth: true,
                data: financeData.map((f) => Number((f.debtRatio * 100).toFixed(1))),
                itemStyle: { color: '#f59e0b' },
                lineStyle: { width: 2.5, type: 'dashed' },
                symbol: 'diamond',
                symbolSize: 7,
              },
            ],
          }}
          style={{ height: 320 }}
          notMerge
        />
      </Card>

      {/* 经营现金流趋势图（柱状图） - 规格书 4.6 */}
      <Card
        title={
          <span className="flex items-center gap-2">
            <div
              className="flex items-center justify-center rounded-md"
              style={{ width: 24, height: 24, background: 'rgba(16, 185, 129, 0.1)' }}
            >
              <FundOutlined style={{ color: '#10b981', fontSize: 13 }} />
            </div>
            <span className="text-[14px] font-semibold text-slate-900">经营现金流趋势图</span>
            <span className="text-[12px] text-slate-500 font-normal">各期经营现金流净额</span>
          </span>
        }
      >
        <ReactECharts
          option={{
            ...techChartBase,
            xAxis: {
              type: 'category',
              data: financeData.map((f) => f.period),
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
              axisLabel: { color: '#94a3b8', fontSize: 11 },
              splitLine: { lineStyle: { color: '#f1f5f9' } },
            },
            series: [
              {
                name: '经营现金流净额',
                type: 'bar',
                data: financeData.map((f) => ({
                  value: f.operatingCashFlow,
                  itemStyle: {
                    color: f.operatingCashFlow >= 0 ? '#10b981' : '#ef4444',
                    borderRadius: [4, 4, 0, 0],
                  },
                })),
                barWidth: 22,
                label: {
                  show: true,
                  position: 'top',
                  formatter: (p) => `${p.value >= 0 ? '+' : ''}${p.value}`,
                  color: '#64748b',
                  fontSize: 11,
                },
              },
            ],
          }}
          style={{ height: 320 }}
          notMerge
        />
      </Card>

      {/* 数据表格 - 美式科技风 */}
      <Card
        title={
          <span className="flex items-center gap-2">
            <div
              className="flex items-center justify-center rounded-md"
              style={{ width: 24, height: 24, background: 'rgba(16, 185, 129, 0.1)' }}
            >
              <DatabaseOutlined style={{ color: '#10b981', fontSize: 13 }} />
            </div>
            <span className="text-[14px] font-semibold text-slate-900">财报明细数据</span>
          </span>
        }
      >
        <Tabs defaultActiveKey="yearly">
          <TabPane tab={<span className="flex items-center gap-1.5"><FundOutlined className="text-[13px]" />年度汇总数据</span>} key="yearly">
            <Table
              size="small"
              rowKey="year"
              columns={yearlyColumns}
              dataSource={yearlyData}
              pagination={false}
              bordered
              scroll={{ x: 1000 }}
              summary={(pageData) => {
                const last = pageData[pageData.length - 1] || {}
                const first = pageData[0] || {}
                if (pageData.length < 2) return null
                const cagrRev = Math.pow(last.revenue / first.revenue, 1 / (pageData.length - 1)) - 1
                return (
                  <Table.Summary fixed>
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={1}>
                        <span className="font-semibold text-slate-900">CAGR（复合增速）</span>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={1}>
                        <span className="font-mono font-bold" style={{ color: cagrRev >= 0 ? '#059669' : '#dc2626' }}>
                          营收 {cagrRev >= 0 ? '+' : ''}{Math.round(cagrRev * 100)}%
                        </span>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={2} colSpan={6}>
                        <span className="text-slate-500 text-[11px]">
                          * CAGR 反映期间复合年均增长情况，用于评估长期成长性
                        </span>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                )
              }}
            />
          </TabPane>
          <TabPane tab={<span className="flex items-center gap-1.5"><DatabaseOutlined className="text-[13px]" />季度明细数据</span>} key="quarterly">
            <Table
              size="small"
              rowKey="period"
              columns={quarterlyColumns}
              dataSource={financeData}
              pagination={{ pageSize: 8, showSizeChanger: false }}
              bordered
              scroll={{ x: 1100 }}
            />
          </TabPane>
        </Tabs>

        <Alert
          type="info"
          showIcon
          size="small"
          className="!mt-4"
          message={<span className="text-[12px] font-medium">数据来源说明</span>}
          description={<span className="text-[11px] text-slate-600">本页面数据来自财报文件 AI 解析或人工录入。每次上传新财报后，系统将自动刷新图表和 AI 分析结论。所有操作均有留痕审计。</span>}
        />
      </Card>

      {/* 上传新财报 Modal - 规格书 4.3 */}
      <Modal
        title="上传新财报"
        open={uploadOpen}
        onOk={submitUpload}
        onCancel={() => setUploadOpen(false)}
        okText="保存财报数据"
        cancelText="取消"
        width={560}
      >
        <Alert
          type="info"
          showIcon
          size="small"
          className="!mb-4"
          message="上传后系统将自动写入财报明细、刷新三张趋势图并重新生成数据亮点"
        />
        <Form form={uploadForm} layout="vertical" requiredMark={false}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="年度" name="year" rules={[{ required: true, message: '请选择年度' }]}>
                <Select
                  placeholder="选择年度"
                  options={[2024, 2025, 2026, 2027].map((y) => ({ value: y, label: `${y}年` }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="季度" name="quarter" rules={[{ required: true, message: '请选择季度' }]}>
                <Select
                  placeholder="选择季度"
                  options={[1, 2, 3, 4].map((q) => ({ value: q, label: `Q${q}` }))}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="营收（万元）" name="revenue" rules={[{ required: true, message: '请输入营收' }]}>
            <InputNumber style={{ width: '100%' }} min={0} placeholder="如 5000" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="毛利（万元）" name="grossProfit" rules={[{ required: true, message: '请输入毛利' }]}>
                <InputNumber style={{ width: '100%' }} min={0} placeholder="如 2000" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="净利润（万元）" name="netProfit" rules={[{ required: true, message: '请输入净利润' }]}>
                <InputNumber style={{ width: '100%' }} placeholder="如 800" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                label="资产负债率（小数，如 0.45 表示45%）"
                name="debtRatio"
                rules={[{ required: true, message: '请输入资产负债率' }]}
              >
                <InputNumber style={{ width: '100%' }} min={0} max={1} step={0.01} placeholder="如 0.45" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="经营现金流净额（万元）"
                name="operatingCashFlow"
                rules={[{ required: true, message: '请输入经营现金流' }]}
              >
                <InputNumber style={{ width: '100%' }} placeholder="如 500" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* 编辑亮点 Modal */}
      <Modal
        title="编辑数据亮点"
        open={!!editHl}
        onOk={() => {
          if (editText.trim() && editHl) {
            updateHighlight(project.id, editHl.id, editText.trim())
            message.success('亮点已更新')
            setEditHl(null)
          }
        }}
        onCancel={() => setEditHl(null)}
        okText="保存"
        cancelText="取消"
      >
        <Input.TextArea rows={3} value={editText} onChange={(e) => setEditText(e.target.value)} placeholder="输入亮点文字" />
      </Modal>

      {/* 手动添加亮点 Modal */}
      <Modal
        title="手动添加数据亮点"
        open={newHlOpen}
        onOk={() => {
          if (newHlText.trim()) {
            addHighlight(project.id, newHlText.trim())
            message.success('亮点已添加')
            setNewHlText('')
            setNewHlOpen(false)
          }
        }}
        onCancel={() => {
          setNewHlOpen(false)
          setNewHlText('')
        }}
        okText="添加"
        cancelText="取消"
      >
        <Input.TextArea rows={3} value={newHlText} onChange={(e) => setNewHlText(e.target.value)} placeholder="输入亮点文字" />
      </Modal>
    </div>
  )
}
