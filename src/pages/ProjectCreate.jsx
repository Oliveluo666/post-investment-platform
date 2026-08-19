import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card,
  Steps,
  Button,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Upload,
  Tabs,
  Alert,
  Progress,
  Row,
  Col,
  Divider,
  Tag,
  Space,
  Tooltip,
  App,
  List,
  Modal,
  Empty,
  Checkbox,
  Radio,
  Descriptions,
} from 'antd'
import {
  UploadOutlined,
  InboxOutlined,
  FileTextOutlined,
  RobotOutlined,
  SaveOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CheckCircleTwoTone,
  CheckCircleOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  PlusOutlined,
  BulbOutlined,
  InfoCircleOutlined,
  ThunderboltOutlined,
  CloseOutlined,
  SwapOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { industryOptions, investTypeOptions } from '../data/mockData.js'
import { createProject, generateAutoTodos, can } from '../data/store.js'

const { Dragger } = Upload
const { TextArea } = Input
const { Step } = Steps
const { TabPane } = Tabs

const TEAM_SIZE_OPTIONS = [
  { value: '50人以内', label: '50人以内' },
  { value: '50-100人', label: '50-100人' },
  { value: '100-300人', label: '100-300人' },
  { value: '300-500人', label: '300-500人' },
  { value: '500-1000人', label: '500-1000人' },
  { value: '1000人以上', label: '1000人以上' },
]

// 从上传文件名提取项目名（演示环境，生产环境应由后端 AI 解析返回）
function extractNameFromFile(fileName = '') {
  const base = fileName.replace(/\\.[^/.]+$/, '')
  const cleaned = base
    .replace(/[_\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/(投资协议|股东协议|增资协议|股权转让协议|尽调报告|投资|协议|合同|最终版|修订版|V\d+|第\s*\d+\s*稿)/gi, '')
    .trim()
  return cleaned || '未命名项目'
}

function inferIndustryFromName(name = '') {
  const n = name.toLowerCase()
  if (/芯片|半导体|晶圆|集成电路|ic|ai|智能|科技/.test(n)) return '硬科技/半导体'
  if (/医疗|药|生物|健康|医院/.test(n)) return '医疗健康/AI医疗'
  if (/新能源|储能|电池|光伏|锂/.test(n)) return '新能源/储能'
  if (/汽车|制造|机器人|工业/.test(n)) return '智能制造/汽车'
  if (/食品|消费|零售|餐饮|品牌/.test(n)) return '消费/食品'
  if (/saas|云|软件|数据|企业/.test(n)) return '企业服务/SaaS'
  return '硬科技/半导体'
}

function generateTagSuggestion(industry) {
  const map = {
    '企业服务/SaaS': ['SaaS', '订阅制', '高毛利'],
    '新能源/储能': ['新能源', '双碳', '硬科技'],
    '医疗健康/AI医疗': ['医疗AI', '创新药', '高技术壁垒'],
    '智能制造/汽车': ['新能源车', '出海', '国产替代'],
    '消费/食品': ['消费升级', '连锁', '品牌化'],
    '硬科技/半导体': ['芯片设计', '国产替代', 'AI推荐'],
  }
  return map[industry] || ['国产替代']
}

// AI 模拟解析结果（根据上传文件名动态生成）
function generateMockParseResult(fileName = '') {
  const name = extractNameFromFile(fileName)
  const industry = inferIndustryFromName(name)
  const tags = generateTagSuggestion(industry)
  const investDate = dayjs().subtract(30, 'day').format('YYYY-MM-DD')
  return {
    basic: {
      name,
      industry,
      tags,
      teamSize: '100-300人',
      website: '',
      description: `AI解析生成：${name}是${industry}领域的创新企业，专注于核心产品研发与市场拓展。请根据实际材料核对并补充详细信息。`,
    },
    finance: {
      investDate,
      investAmount: 6000,
      investType: '股权',
      investors: [
        { name: '我方基金', ratio: 18 },
        { name: '联想创投', ratio: 12 },
      ],
    },
    // AI 按日期自动分类：以投资日期为界
    investDate: dayjs(investDate),
    investHistory: [
      { id: 'p1', title: '项目立项', date: dayjs(investDate).subtract(150, 'day').format('YYYY-MM-DD'), status: 'done' },
      { id: 'p2', title: '尽调完成', date: dayjs(investDate).subtract(80, 'day').format('YYYY-MM-DD'), status: 'done' },
      { id: 'p3', title: '投资决策委员会通过', date: dayjs(investDate).subtract(30, 'day').format('YYYY-MM-DD'), status: 'done' },
      { id: 'inv', title: '投资交割', date: investDate, status: 'done' },
    ],
    postInvestment: [
      { id: 'c1', title: '完成工商变更', date: dayjs(investDate).add(7, 'day').format('YYYY-MM-DD'), status: 'done' },
      { id: 'c2', title: '首次股东会', date: dayjs(investDate).add(35, 'day').format('YYYY-MM-DD'), status: 'done' },
      { id: 'c3', title: '首次季报提交', date: dayjs(investDate).add(90, 'day').format('YYYY-MM-DD'), status: 'pending' },
    ],
    clauses: {
      repurchase: '若2028年12月31日前未完成合格IPO，创始股东需按8%年化收益率回购全部或部分股权',
      liquidation: '优先清算权，1倍回报，参与分配，上限为投资本金的3倍',
      antiDilution: '加权平均反稀释条款，下轮融资估值低于本轮则自动调整',
      tagAlong: '随售权，持股股东按持股比例同比例出售',
      dragAlong: '拖售权，经持有75%以上股份的股东同意可强制出售公司',
      veto: '重大事项一票否决权（含增资、减资、合并、分立、解散、修改公司章程、对外担保等）',
    },
  }
}

// 条款模板
const clauseTemplates = {
  repurchase: [
    { label: '标准8%年化回购', value: '若【】年【】月【】日前未完成合格IPO，创始股东需按8%年化收益率回购' },
    { label: '标准6%年化回购', value: '若【】年【】月【】日前未完成合格上市，按6%年化收益率回购' },
    { label: '10%年化高要求', value: '若【】年【】月【】日前未完成合格IPO，按10%年化收益率回购' },
  ],
  liquidation: [
    { label: '1倍参与分配', value: '优先清算权，1倍回报，参与分配' },
    { label: '1.5倍不参与', value: '优先清算权，1.5倍回报，不参与后续分配' },
    { label: '1倍上限3倍', value: '优先清算权，1倍回报，参与分配上限3倍' },
  ],
  antiDilution: [
    { label: '加权平均', value: '加权平均反稀释条款' },
    { label: '完全棘轮', value: '完全棘轮反稀释条款' },
    { label: '广义加权平均', value: '广义加权平均反稀释条款' },
  ],
}

const CLAUSE_META = [
  { key: 'repurchase', label: '回购条款', color: 'red' },
  { key: 'liquidation', label: '优先清算权', color: 'blue' },
  { key: 'antiDilution', label: '反稀释条款', color: 'orange' },
  { key: 'tagAlong', label: '随售权', color: 'green' },
  { key: 'dragAlong', label: '拖售权', color: 'cyan' },
  { key: 'veto', label: '保护性条款(一票否决)', color: 'purple' },
]

export default function ProjectCreate() {
  const navigate = useNavigate()
  const { message, modal } = App.useApp()
  const [step, setStep] = useState(0)
  const [tabKey, setTabKey] = useState('upload')

  // 无权限时禁止访问
  if (!can('project.create')) {
    return (
      <div className="text-center py-24">
        <SafetyCertificateOutlined style={{ fontSize: 44, color: '#f59e0b' }} />
        <h2 className="mt-4 text-[18px] font-semibold text-slate-800">无权创建项目</h2>
        <p className="text-slate-500 mt-2 text-[13px]">
          当前角色不具备「新增项目」权限，请联系投后经理或切换角色。
        </p>
        <Button type="primary" className="mt-6" onClick={() => navigate('/dashboard')}>
          返回总览
        </Button>
      </div>
    )
  }

  // ====== AI解析后的独立状态（第一步预览用，和form实例解耦） ======
  const [parsing, setParsing] = useState(false)
  const [parseProgress, setParseProgress] = useState(0)
  const [parseDone, setParseDone] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState(null)

  // 解析结果的分类状态（可编辑的独立对象）
  const [parsed, setParsed] = useState({
    basic: {},
    finance: {},
    investHistory: [],
    postInvestment: [],
    clauses: {},
  })

  // 附件
  const [attachments, setAttachments] = useState([])

  // ====== 表单实例 ======
  const [basicForm] = Form.useForm()      // 基础信息
  const [financeForm] = Form.useForm()    // 财务信息
  const [clauseForm] = Form.useForm()     // 条款信息
  const [investForm] = Form.useForm()     // 投资方（财务信息内）

  // 初始化：如果从第二步切过来，读取已有的表单值
  useEffect(() => {
    if (tabKey === 'manual') {
      const industry = basicForm.getFieldValue('industry')
      const amount = financeForm.getFieldValue('investAmount')
      const suggestions = []
      if (industry) {
        const tagMap = {
          '企业服务/SaaS': ['SaaS', '订阅制', '高毛利'],
          '新能源/储能': ['新能源', '双碳', '硬科技'],
          '医疗健康/AI医疗': ['医疗AI', '创新药', '高技术壁垒'],
          '智能制造/汽车': ['新能源车', '出海', '国产替代'],
          '消费/食品': ['消费升级', '连锁', '品牌化'],
          '硬科技/半导体': ['国产替代', '国家战略', '芯片设计'],
        }
        suggestions.push(`根据行业【${industry}】，推荐添加标签：${(tagMap[industry] || []).join('、')}`)
      }
      if (amount && amount >= 10000) {
        suggestions.push('投资金额较大（≥1亿），建议在条款中强化一票否决权和拖售权保护')
      }
      if (amount && amount < 3000) {
        suggestions.push('投资金额较小（<3000万），建议重点关注回购条款和随售权保护')
      }
      setAiSuggestion(suggestions)
    }
  }, [tabKey, basicForm, financeForm])

  // ====== 模拟AI解析 ======
  const handleParse = () => {
    setParsing(true)
    setParseProgress(0)
    const fileName = attachments[0]?.name || ''
    let p = 0
    const timer = setInterval(() => {
      p += Math.random() * 20
      if (p >= 100) {
        p = 100
        clearInterval(timer)
        setParseProgress(100)
        setTimeout(() => {
          setParsing(false)
          setParseDone(true)

          const result = generateMockParseResult(fileName)

          // AI自动分类：投资日期及之前归为投资历程，之后归为投后信息
          setParsed({
            basic: { ...result.basic },
            finance: { ...result.finance },
            investHistory: [...result.investHistory],
            postInvestment: [...result.postInvestment],
            clauses: { ...result.clauses },
          })

          // 同时填充到表单实例（用于后续步骤）
          basicForm.setFieldsValue({
            ...result.basic,
          })
          financeForm.setFieldsValue({
            investDate: result.investDate,
            investAmount: result.finance.investAmount,
            investType: result.finance.investType,
            investors: result.finance.investors,
          })
          clauseForm.setFieldsValue(result.clauses)

          message.success(`AI解析完成：已根据「${result.basic.name}」提取信息，请核对后修改`)
          setStep(1)
        }, 500)
      } else {
        setParseProgress(p)
      }
    }, 400)
  }

  // ====== 切换条目分类：投资历程 ↔ 投后信息 ======
  const toggleItemCategory = (itemId, moveToHistory) => {
    const all = [...parsed.investHistory, ...parsed.postInvestment]
    const item = all.find(x => x.id === itemId)
    if (!item) return

    setParsed(prev => {
      if (moveToHistory) {
        return {
          ...prev,
          investHistory: prev.investHistory.find(x => x.id === itemId)
            ? prev.investHistory
            : [...prev.investHistory, item],
          postInvestment: prev.postInvestment.filter(x => x.id !== itemId),
        }
      } else {
        return {
          ...prev,
          investHistory: prev.investHistory.filter(x => x.id !== itemId),
          postInvestment: prev.postInvestment.find(x => x.id === itemId)
            ? prev.postInvestment
            : [...prev.postInvestment, item],
        }
      }
    })
    message.success('分类已更新')
  }

  // 基本信息修改：同步到parsed.basic（保持状态一致）
  const updateBasic = (field, value) => {
    setParsed(prev => ({ ...prev, basic: { ...prev.basic, [field]: value } }))
    basicForm.setFieldsValue({ [field]: value })
  }
  const updateFinance = (field, value) => {
    setParsed(prev => ({ ...prev, finance: { ...prev.finance, [field]: value } }))
    financeForm.setFieldsValue({ [field]: value })
  }
  const updateInvestors = (list) => {
    setParsed(prev => ({ ...prev, finance: { ...prev.finance, investors: list } }))
  }
  const updateClause = (key, value) => {
    setParsed(prev => ({ ...prev, clauses: { ...prev.clauses, [key]: value } }))
    clauseForm.setFieldsValue({ [key]: value })
  }

  const handleApplyTags = () => {
    const industry = basicForm.getFieldValue('industry')
    const tagMap = {
      '企业服务/SaaS': ['SaaS', '订阅制'],
      '新能源/储能': ['新能源', '双碳'],
      '医疗健康/AI医疗': ['医疗AI'],
      '智能制造/汽车': ['新能源车'],
      '消费/食品': ['消费升级'],
      '硬科技/半导体': ['国产替代'],
    }
    const cur = basicForm.getFieldValue('tags') || []
    const add = tagMap[industry] || []
    const merged = Array.from(new Set([...cur, ...add]))
    basicForm.setFieldsValue({ tags: merged })
    setParsed(prev => ({ ...prev, basic: { ...prev.basic, tags: merged } }))
    message.success('已应用AI推荐标签')
  }

  const handleApplyClause = (field, tmpl) => {
    updateClause(field, tmpl)
    message.success('已应用条款模板')
  }

  // ====== 同步parsed和form实例（进入第三步前汇总） ======
  const syncFromForms = () => {
    const b = basicForm.getFieldsValue()
    const f = financeForm.getFieldsValue()
    const c = clauseForm.getFieldsValue()
    setParsed(prev => ({
      ...prev,
      basic: { ...prev.basic, ...b },
      finance: { ...prev.finance, ...f },
      clauses: { ...prev.clauses, ...c },
    }))
    return { ...b, ...f, clauses: c }
  }

  const handleSubmit = async () => {
    try {
      const merged = syncFromForms()
      await basicForm.validateFields()
      await financeForm.validateFields()
      await clauseForm.validateFields()

      modal.confirm({
        title: '确认提交项目档案？',
        icon: <InfoCircleOutlined />,
        content: (
          <div className="space-y-2">
            <div>项目名称：<b>{merged.name}</b></div>
            <div>行业：<b>{merged.industry}</b></div>
            <div>投资金额：<b>{merged.investAmount}万</b></div>
            <div>投资时间：<b>{dayjs(merged.investDate).format('YYYY-MM-DD')}</b></div>
            <div>投资历程：<b>{parsed.investHistory.length}条</b>，投后信息：<b>{parsed.postInvestment.length}条</b></div>
            <div className="text-slate-500 text-xs mt-2">提交后将进入项目详情页，可继续录入财务数据与时间轴。</div>
          </div>
        ),
        onOk: async () => {
          // 组装项目数据并持久化
          const { project: newProject, syncError } = await createProject({
            name: merged.name,
            industry: merged.industry,
            tags: merged.tags || [],
            teamSize: merged.teamSize,
            website: merged.website,
            description: merged.description,
            investDate: merged.investDate ? dayjs(merged.investDate).format('YYYY-MM-DD') : '',
            investAmount: merged.investAmount,
            investType: merged.investType,
            investors: merged.investors || [],
            contactPerson: merged.contactPerson || '',
            contactPhone: merged.contactPhone || '',
            round: merged.round || '',
            valuation: merged.valuation,
            directors: {
              generalManager: merged.directors?.generalManager || '',
              chairman: merged.directors?.chairman || '',
              supervisors: merged.directors?.supervisors || [],
              boardMembers: merged.directors?.boardMembers || [],
            },
            clauses: merged.clauses || {},
            investHistory: parsed.investHistory,
            postInvestment: parsed.postInvestment,
            attachments: attachments.map((a) => ({ name: a.name, uid: a.uid })),
          })
          // 自动生成该项目的合规任务（季报上传 + 问询）
          generateAutoTodos()
          if (syncError) {
            message.warning('项目已本地创建，但云端同步失败：' + syncError)
          } else {
            message.success('项目档案创建成功！正在跳转...')
          }
          setTimeout(() => navigate(`/projects/${newProject.id}`), 800)
        },
      })
    } catch (e) {
      message.warning('请完善必填项后提交')
    }
  }

  const stepItems = [
    { title: '信息录入' },
    { title: '条款与附件' },
    { title: '确认提交' },
  ]

  return (
    <div className="space-y-5 max-w-6xl mx-auto animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} className="!px-2" />
          <div>
            <h1 className="text-[26px] font-bold tracking-tight text-slate-900 m-0 leading-tight">
              新增投后项目
            </h1>
            <p className="text-[13px] text-slate-500 mt-1">
              AI 协议解析 · 智能分类 · 条款模板 · 投资档案创建
            </p>
          </div>
        </div>
        {step > 0 && (
          <Tag className="!text-[11px] !m-0" color="processing">
            步骤 {step + 1} / 3
          </Tag>
        )}
      </div>

      <Card styles={{ body: { padding: '20px 24px' } }}>
        <Steps
          current={step}
          items={stepItems}
          responsive
          className="!mb-2"
          labelPlacement="horizontal"
        />
      </Card>

      {/* ========================================== */}
      {/* Step 0: 录入方式选择 */}
      {/* ========================================== */}
      {step === 0 && (
        <Card
          title={
            <span className="flex items-center gap-2">
              <div
                className="flex items-center justify-center rounded-md"
                style={{ width: 24, height: 24, background: 'rgba(37, 99, 235, 0.1)' }}
              >
                <PlusOutlined style={{ color: '#2563eb', fontSize: 13 }} />
              </div>
              <span className="text-[14px] font-semibold text-slate-900">选择录入方式</span>
            </span>
          }
        >
          <Tabs activeKey={tabKey} onChange={setTabKey} size="large">
            {/* ===== 方式一：AI解析 ===== */}
            <TabPane
              tab={
                <span className="flex items-center gap-1.5">
                  <ThunderboltOutlined style={{ color: '#7c3aed' }} />
                  上传协议 AI 解析
                  <Tag color="purple" className="!ml-1 !text-[11px]">推荐</Tag>
                </span>
              }
              key="upload"
            >
              <Alert
                type="info"
                showIcon
                icon={<RobotOutlined />}
                message={<span className="text-[13px] font-semibold">AI 自动提取协议关键信息</span>}
                description={<span className="text-[12px] text-slate-600">支持 PDF / Word 格式的投资协议、股东协议等文件，AI 可自动提取项目方信息、投资金额、交割时间、核心条款等字段，并自动分类为基础信息 / 财务信息 / 投资历程 / 投后信息 / 条款信息，所有内容均可修改。</span>}
                className="!mb-4"
              />

              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Dragger
                    multiple
                    accept=".pdf,.doc,.docx"
                    beforeUpload={() => false}
                    onChange={(info) => {
                      if (info.fileList.length > 0 && !parsing) handleParse()
                    }}
                    disabled={parsing}
                    showUploadList={{ showPreviewIcon: false }}
                  >
                    <p className="ant-upload-drag-icon">
                      <InboxOutlined style={{ color: parsing ? '#94a3b8' : '#2563eb', fontSize: 40 }} />
                    </p>
                    <p className="ant-upload-text font-semibold text-slate-900 !text-[14px]">
                      {parsing ? 'AI 解析中...' : '点击或拖拽协议文件到此上传'}
                    </p>
                    <p className="ant-upload-hint text-[12px] text-slate-500">
                      支持 PDF / DOC / DOCX 格式，单个文件不超过 50MB
                    </p>
                    <div className="flex justify-center gap-1.5 mt-2">
                      <Tag icon={<FilePdfOutlined />} color="red" className="!text-[11px]">PDF</Tag>
                      <Tag icon={<FileWordOutlined />} color="blue" className="!text-[11px]">Word</Tag>
                    </div>
                  </Dragger>

                  {parsing && (
                    <div className="mt-4 p-3.5 rounded-lg" style={{ background: 'rgba(124, 58, 237, 0.04)', border: '1px solid rgba(124, 58, 237, 0.12)' }}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="flex items-center gap-1.5 text-[13px] font-medium text-slate-700">
                          <RobotOutlined className="animate-pulse" style={{ color: '#7c3aed' }} />
                          AI 智能解析处理中
                        </span>
                        <span className="font-mono text-[13px] font-semibold text-violet-600">{Math.round(parseProgress)}%</span>
                      </div>
                      <Steps
                        size="small"
                        current={parseProgress > 80 ? 3 : parseProgress > 40 ? 2 : 1}
                        items={[
                          { title: 'OCR 识别' },
                          { title: '信息抽取与分类' },
                          { title: '条款解析' },
                        ]}
                      />
                      <Progress
                        percent={Math.round(parseProgress)}
                        status="active"
                        showInfo={false}
                        strokeColor="#7c3aed"
                        className="!mt-3"
                      />
                    </div>
                  )}

                  {parseDone && (
                    <Alert
                      type="success"
                      showIcon
                      icon={<CheckCircleTwoTone twoToneColor="#10b981" />}
                      message={<span className="text-[13px] font-semibold">解析完成</span>}
                      description={<span className="text-[12px] text-slate-600">AI 已按分类整理：基础信息、财务信息、投资历程、投后信息、条款信息。所有字段均可直接修改，条目可勾选分类。</span>}
                      className="!mt-4"
                    />
                  )}
                </Col>

                <Col xs={24} md={12}>
                  <div
                    className="p-4 rounded-lg h-full min-h-[400px]"
                    style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
                  >
                    <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-200">
                      <div
                        className="flex items-center justify-center rounded-md"
                        style={{ width: 26, height: 26, background: 'rgba(124, 58, 237, 0.1)' }}
                      >
                        <RobotOutlined style={{ color: '#7c3aed', fontSize: 14 }} />
                      </div>
                      <span className="text-[13px] font-semibold text-slate-900">AI 解析结果预览</span>
                      <Tag color="purple" className="!ml-auto !text-[11px] !m-0">可编辑</Tag>
                    </div>
                    {parseDone ? (
                      <div className="space-y-3">
                        {/* === 基础信息 === */}
                        <Card size="small" className="!mb-2" styles={{ body: { padding: 12 } }}
                          title={
                            <span className="flex items-center gap-1.5">
                              <span className="w-1 h-3.5 rounded-full" style={{ background: '#2563eb' }} />
                              <span className="text-[13px] font-semibold text-slate-900">基础信息</span>
                            </span>
                          }>
                          <div className="space-y-1">
                            <Row gutter={6}>
                              <Col xs={24}>
                                <label className="block text-xs text-slate-500 mb-0.5">项目名称</label>
                                <Input
                                  size="small"
                                  value={parsed.basic.name}
                                  onChange={e => updateBasic('name', e.target.value)}
                                  placeholder="可修改项目名称"
                                />
                              </Col>
                              <Col xs={12}>
                                <label className="block text-xs text-slate-500 mb-0.5 mt-1">行业</label>
                                <Select
                                  size="small"
                                  style={{ width: '100%' }}
                                  value={parsed.basic.industry}
                                  onChange={v => updateBasic('industry', v)}
                                  options={industryOptions}
                                  placeholder="可修改行业"
                                />
                              </Col>
                              <Col xs={12}>
                                <label className="block text-xs text-slate-500 mb-0.5 mt-1">团队规模</label>
                                <Select
                                  size="small"
                                  style={{ width: '100%' }}
                                  value={parsed.basic.teamSize}
                                  onChange={v => updateBasic('teamSize', v)}
                                  options={TEAM_SIZE_OPTIONS}
                                  placeholder="选择团队规模"
                                />
                              </Col>
                              <Col xs={24}>
                                <label className="block text-xs text-slate-500 mb-0.5 mt-1">标签（输入后按回车新增）</label>
                                <Select
                                  size="small"
                                  mode="tags"
                                  allowClear
                                  style={{ width: '100%' }}
                                  value={parsed.basic.tags}
                                  onChange={v => updateBasic('tags', v)}
                                  tokenSeparators={[',', '，', ' ']}
                                  placeholder="输入后按回车新增，支持逗号/空格批量输入"
                                />
                              </Col>
                              <Col xs={24}>
                                <label className="block text-xs text-slate-500 mb-0.5 mt-1">公司网站</label>
                                <Input
                                  size="small"
                                  value={parsed.basic.website}
                                  onChange={e => updateBasic('website', e.target.value)}
                                  placeholder="https://"
                                />
                              </Col>
                              <Col xs={24}>
                                <label className="block text-xs text-slate-500 mb-0.5 mt-1">项目简介</label>
                                <TextArea
                                  size="small"
                                  rows={2}
                                  value={parsed.basic.description}
                                  onChange={e => updateBasic('description', e.target.value)}
                                  placeholder="公司业务、产品、团队等"
                                />
                              </Col>
                            </Row>
                          </div>
                        </Card>

                        {/* === 财务信息 === */}
                        <Card size="small" className="!mb-2" styles={{ body: { padding: 12 } }}
                          title={
                            <span className="flex items-center gap-1.5">
                              <span className="w-1 h-3.5 rounded-full" style={{ background: '#10b981' }} />
                              <span className="text-[13px] font-semibold text-slate-900">财务信息</span>
                            </span>
                          }>
                          <div className="space-y-1">
                            <Row gutter={6}>
                              <Col xs={8}>
                                <label className="block text-xs text-slate-500 mb-0.5">投资金额(万)</label>
                                <InputNumber
                                  size="small"
                                  style={{ width: '100%' }}
                                  min={0}
                                  step={100}
                                  value={parsed.finance.investAmount}
                                  onChange={v => updateFinance('investAmount', v)}
                                />
                              </Col>
                              <Col xs={8}>
                                <label className="block text-xs text-slate-500 mb-0.5">投资方式</label>
                                <Select
                                  size="small"
                                  style={{ width: '100%' }}
                                  value={parsed.finance.investType}
                                  onChange={v => updateFinance('investType', v)}
                                  options={investTypeOptions}
                                />
                              </Col>
                              <Col xs={8}>
                                <label className="block text-xs text-slate-500 mb-0.5">投资时间</label>
                                <DatePicker
                                  size="small"
                                  style={{ width: '100%' }}
                                  value={parsed.finance.investDate ? dayjs(parsed.finance.investDate) : undefined}
                                  onChange={d => updateFinance('investDate', d ? d.format('YYYY-MM-DD') : '')}
                                />
                              </Col>
                              <Col xs={24}>
                                <label className="block text-xs text-slate-500 mb-1 mt-1">投资方及占比</label>
                                {(parsed.finance.investors || []).map((inv, i) => (
                                  <Row gutter={6} key={i} className="mb-1">
                                    <Col xs={13}>
                                      <Input
                                        size="small"
                                        value={inv.name}
                                        placeholder="投资方名称"
                                        onChange={e => {
                                          const list = [...(parsed.finance.investors || [])]
                                          list[i] = { ...inv, name: e.target.value }
                                          updateInvestors(list)
                                        }}
                                      />
                                    </Col>
                                    <Col xs={9}>
                                      <InputNumber
                                        size="small"
                                        style={{ width: '100%' }}
                                        min={0}
                                        max={100}
                                        value={inv.ratio}
                                        addonAfter="%"
                                        placeholder="占比"
                                        onChange={v => {
                                          const list = [...(parsed.finance.investors || [])]
                                          list[i] = { ...inv, ratio: v }
                                          updateInvestors(list)
                                        }}
                                      />
                                    </Col>
                                    <Col xs={2}>
                                      <Button
                                        type="text"
                                        danger
                                        size="small"
                                        icon={<CloseOutlined />}
                                        disabled={(parsed.finance.investors || []).length <= 1}
                                        onClick={() => {
                                          const list = (parsed.finance.investors || []).filter((_, k) => k !== i)
                                          updateInvestors(list)
                                        }}
                                      />
                                    </Col>
                                  </Row>
                                ))}
                                <Button
                                  type="dashed"
                                  block
                                  size="small"
                                  icon={<PlusOutlined />}
                                  onClick={() => {
                                    const list = [...(parsed.finance.investors || []), { name: '', ratio: 0 }]
                                    updateInvestors(list)
                                  }}
                                >添加投资方</Button>
                              </Col>
                            </Row>
                          </div>
                        </Card>

                        {/* === 投资历程 === */}
                        <Card size="small" className="!mb-2" styles={{ body: { padding: 12 } }}
                          title={
                            <span className="flex items-center gap-1.5">
                              <span className="w-1 h-3.5 rounded-full" style={{ background: '#7c3aed' }} />
                              <span className="text-[13px] font-semibold text-slate-900">投资历程</span>
                              <Tag color="purple" className="!ml-1 !text-[11px] !m-0">{parsed.investHistory.length} 条</Tag>
                            </span>
                          }>
                          <div className="space-y-1">
                            {parsed.investHistory.map(item => (
                              <div key={item.id} className="flex items-center justify-between text-xs py-1.5 px-2 rounded" style={{ background: 'rgba(124, 58, 237, 0.05)' }}>
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="font-mono text-[11px] text-violet-600 flex-shrink-0">{item.date}</span>
                                  <span className="text-slate-700 truncate">{item.title}</span>
                                </div>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: item.status === 'done' ? '#10b981' : '#f59e0b' }} />
                                  <Checkbox
                                    checked={true}
                                    onChange={e => toggleItemCategory(item.id, e.target.checked)}
                                    className="!text-[11px] !text-slate-500"
                                  >投资历程</Checkbox>
                                </div>
                              </div>
                            ))}
                            {parsed.investHistory.length === 0 && (
                              <div className="text-slate-400 text-xs text-center py-1">暂无记录</div>
                            )}
                          </div>
                          <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center gap-1">
                            <SwapOutlined className="text-[10px]" /> AI 已按投资日期自动归类，勾选可切换到投后信息
                          </div>
                        </Card>

                        {/* === 投后信息 === */}
                        <Card size="small" className="!mb-2" styles={{ body: { padding: 12 } }}
                          title={
                            <span className="flex items-center gap-1.5">
                              <span className="w-1 h-3.5 rounded-full" style={{ background: '#f59e0b' }} />
                              <span className="text-[13px] font-semibold text-slate-900">投后信息</span>
                              <Tag color="orange" className="!ml-1 !text-[11px] !m-0">{parsed.postInvestment.length} 条</Tag>
                            </span>
                          }>
                          <div className="space-y-1">
                            {parsed.postInvestment.map(item => (
                              <div key={item.id} className="flex items-center justify-between text-xs py-1.5 px-2 rounded" style={{ background: 'rgba(245, 158, 11, 0.05)' }}>
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="font-mono text-[11px] text-amber-600 flex-shrink-0">{item.date}</span>
                                  <span className="text-slate-700 truncate">{item.title}</span>
                                </div>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: item.status === 'done' ? '#10b981' : '#3b82f6' }} />
                                  <Checkbox
                                    checked={false}
                                    onChange={e => toggleItemCategory(item.id, e.target.checked)}
                                    className="!text-[11px] !text-slate-500"
                                  >投资历程</Checkbox>
                                </div>
                              </div>
                            ))}
                            {parsed.postInvestment.length === 0 && (
                              <div className="text-slate-400 text-xs text-center py-1">暂无记录</div>
                            )}
                          </div>
                          <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center gap-1">
                            <SwapOutlined className="text-[10px]" /> 勾选"投资历程"可移动到投资历程分类
                          </div>
                        </Card>

                        {/* === 条款信息 === */}
                        <Card size="small" className="!mb-2" styles={{ body: { padding: 12 } }}
                          title={
                            <span className="flex items-center gap-1.5">
                              <span className="w-1 h-3.5 rounded-full" style={{ background: '#dc2626' }} />
                              <span className="text-[13px] font-semibold text-slate-900">条款信息</span>
                            </span>
                          }>
                          <div className="space-y-2">
                            {CLAUSE_META.map(({ key, label, color }) => (
                              <div key={key}>
                                <div className="flex items-center gap-1 mb-1">
                                  <Tag color={color} className="!text-xs !py-0 !px-1">{label}</Tag>
                                </div>
                                <TextArea
                                  size="small"
                                  rows={2}
                                  value={parsed.clauses[key] || ''}
                                  onChange={e => updateClause(key, e.target.value)}
                                  placeholder={`可修改${label}的具体约定...`}
                                />
                                {clauseTemplates[key] && (
                                  <Space size={[4, 4]} wrap className="mt-1">
                                    <span className="text-[11px] text-slate-400">模板：</span>
                                    {clauseTemplates[key].map(t => (
                                      <Tag
                                        key={t.label}
                                        color="processing"
                                        style={{ cursor: 'pointer' }}
                                        className="!text-xs"
                                        onClick={() => handleApplyClause(key, t.value)}
                                      >{t.label}</Tag>
                                    ))}
                                  </Space>
                                )}
                              </div>
                            ))}
                          </div>
                        </Card>
                      </div>
                    ) : (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={<span className="text-[12px] text-slate-400">上传文件后，AI 将自动提取并分类展示</span>}
                        className="mt-20"
                      />
                    )}
                  </div>
                </Col>
              </Row>

              <Divider className="!my-5" />
              <div className="flex justify-end gap-2">
                <Button onClick={() => navigate(-1)}>取消</Button>
                <Button type="primary" disabled={!parseDone} onClick={() => setStep(1)}>
                  确认解析结果，下一步 <ArrowRightOutlined />
                </Button>
              </div>
            </TabPane>

            {/* ===== 方式二：手动填写 ===== */}
            <TabPane
              tab={
                <span className="flex items-center gap-1.5">
                  <FileTextOutlined style={{ color: '#2563eb' }} />
                  手动填写 + AI 辅助
                </span>
              }
              key="manual"
            >
              <Row gutter={16}>
                <Col xs={24} lg={16}>
                  {/* 基础信息 */}
                  <Form form={basicForm} layout="vertical" initialValues={{}}>
                    <Card
                      size="small"
                      className="mb-4"
                      title={
                        <span className="flex items-center gap-1.5">
                          <span className="w-1 h-3.5 rounded-full" style={{ background: '#2563eb' }} />
                          <span className="text-[13px] font-semibold text-slate-900">基础信息</span>
                        </span>
                      }
                    >
                      <Row gutter={12}>
                        <Col xs={24} md={14}>
                          <Form.Item label="项目名称" name="name" rules={[{ required: true, message: '请输入项目名称' }]}>
                            <Input placeholder="请输入被投企业工商全称" />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={10}>
                          <Form.Item label="行业/赛道" name="industry" rules={[{ required: true, message: '请选择行业' }]}>
                            <Select options={industryOptions} placeholder="请选择" />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                          <Form.Item label="标签" name="tags">
                            <Select
                              mode="tags"
                              allowClear
                              placeholder="输入后按回车新增标签，支持逗号/空格批量输入"
                              tokenSeparators={[',', '，', ' ']}
                              options={['芯片设计', '国产替代', 'AI推荐', 'SaaS', '新能源', '医疗AI', '出海', '硬科技'].map(v => ({ value: v, label: v }))}
                            />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                          <Form.Item label="公司网站" name="website">
                            <Input placeholder="https://" />
                          </Form.Item>
                        </Col>
                        <Col xs={24}>
                          <Form.Item label="团队规模" name="teamSize">
                            <Select options={TEAM_SIZE_OPTIONS} placeholder="请选择" />
                          </Form.Item>
                        </Col>
                        <Col xs={24}>
                          <Form.Item label="项目简介" name="description">
                            <TextArea rows={4} placeholder="请简述公司业务、产品、团队、市场等核心信息" />
                          </Form.Item>
                        </Col>
                      </Row>
                    </Card>
                  </Form>

                  {/* 财务信息 */}
                  <Form form={financeForm} layout="vertical" initialValues={{ investors: [{ ratio: 100 }] }}>
                    <Card
                      size="small"
                      className="mb-4"
                      title={
                        <span className="flex items-center gap-1.5">
                          <span className="w-1 h-3.5 rounded-full" style={{ background: '#10b981' }} />
                          <span className="text-[13px] font-semibold text-slate-900">财务信息 / 投资信息</span>
                        </span>
                      }
                    >
                      <Row gutter={12}>
                        <Col xs={24} md={8}>
                          <Form.Item label="投资时间" name="investDate" rules={[{ required: true, message: '请选择投资时间' }]}>
                            <DatePicker style={{ width: '100%' }} />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={8}>
                          <Form.Item label="投资金额（万元）" name="investAmount" rules={[{ required: true, message: '请输入金额' }]}>
                            <InputNumber style={{ width: '100%' }} min={0} step={100} />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={8}>
                          <Form.Item label="投资方式" name="investType" rules={[{ required: true, message: '请选择' }]}>
                            <Select options={investTypeOptions} />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={6}>
                          <Form.Item label="融资轮次" name="round">
                            <Input placeholder="如：A轮、B轮" />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={6}>
                          <Form.Item label="估值（万元）" name="valuation">
                            <InputNumber style={{ width: '100%' }} min={0} step={100} />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={6}>
                          <Form.Item label="联系人" name="contactPerson">
                            <Input placeholder="被投企业对接人" />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={6}>
                          <Form.Item label="联系电话" name="contactPhone">
                            <Input placeholder="联系电话" />
                          </Form.Item>
                        </Col>
                        <Col xs={24}>
                          <Form.Item label="投资方及占比" name="investors">
                            <Form.List name="investors">
                              {(fields, { add, remove }) => (
                                <>
                                  {fields.map(f => (
                                    <Row gutter={8} key={f.key} className="mb-2">
                                      <Col xs={14}>
                                        <Form.Item {...f} name={[f.name, 'name']} rules={[{ required: true, message: '必填' }]} noStyle>
                                          <Input placeholder="投资方名称" />
                                        </Form.Item>
                                      </Col>
                                      <Col xs={8}>
                                        <Form.Item {...f} name={[f.name, 'ratio']} noStyle>
                                          <InputNumber style={{ width: '100%' }} min={0} max={100} addonAfter="%" placeholder="占比" />
                                        </Form.Item>
                                      </Col>
                                      <Col xs={2}>
                                        <Button type="text" danger onClick={() => remove(f.name)} disabled={fields.length <= 1}>删除</Button>
                                      </Col>
                                    </Row>
                                  ))}
                                  <Button type="dashed" block onClick={() => add()} icon={<PlusOutlined />}>添加投资方</Button>
                                </>
                              )}
                            </Form.List>
                          </Form.Item>
                        </Col>
                      </Row>
                      <Divider orientation="left" plain style={{ marginTop: 8, marginBottom: 8 }}>
                        <span className="text-[13px] font-medium text-slate-500">董监高信息</span>
                      </Divider>
                      <Row gutter={12}>
                        <Col xs={24} md={8}>
                          <Form.Item label="董事长" name={['directors', 'chairman']}>
                            <Input placeholder="董事长姓名" />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={8}>
                          <Form.Item label="总经理" name={['directors', 'generalManager']}>
                            <Input placeholder="总经理姓名" />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={8}>
                          <Form.Item label="监事" name={['directors', 'supervisors']}>
                            <Select mode="tags" placeholder="输入姓名后回车添加，可添加多位" tokenSeparators={[',', '，']} />
                          </Form.Item>
                        </Col>
                        <Col xs={24}>
                          <Form.Item label="董事会成员" name={['directors', 'boardMembers']}>
                            <Select mode="tags" placeholder="输入姓名后回车添加，可添加多位" tokenSeparators={[',', '，']} />
                          </Form.Item>
                        </Col>
                      </Row>
                    </Card>
                  </Form>
                </Col>

                {/* AI 辅助面板 */}
                <Col xs={24} lg={8}>
                  <div className="sticky top-2 space-y-3">
                    <Card
                      size="small"
                      title={
                        <span className="flex items-center gap-1.5">
                          <div
                            className="flex items-center justify-center rounded-md"
                            style={{ width: 22, height: 22, background: 'rgba(124, 58, 237, 0.1)' }}
                          >
                            <RobotOutlined style={{ color: '#7c3aed', fontSize: 12 }} />
                          </div>
                          <span className="text-[13px] font-semibold text-slate-900">AI 智能辅助</span>
                          <Tag color="purple" className="!ml-auto !text-[11px] !m-0">Beta</Tag>
                        </span>
                      }
                      styles={{ body: { padding: 12 } }}
                    >
                      {(aiSuggestion || []).length > 0 ? (
                        <ul className="space-y-2 p-0 m-0 list-none">
                          {aiSuggestion.map((s, i) => (
                            <li key={i} className="flex items-start gap-2 text-[12px] p-2.5 rounded-lg" style={{ background: 'rgba(124, 58, 237, 0.05)', borderLeft: '2px solid rgba(124, 58, 237, 0.3)' }}>
                              <BulbOutlined style={{ color: '#f59e0b' }} className="mt-0.5 flex-shrink-0" />
                              <span className="flex-1 text-slate-700 leading-relaxed">{s}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-slate-400 text-[12px] text-center py-6">填写信息后，AI 会自动给出补充建议</div>
                      )}
                      <Divider style={{ margin: '12px 0' }} />
                      <Button
                        type="primary"
                        ghost
                        block
                        size="small"
                        icon={<ThunderboltOutlined />}
                        disabled={!basicForm.getFieldValue('industry')}
                        onClick={handleApplyTags}
                      >一键应用 AI 推荐标签</Button>
                    </Card>

                    <Alert
                      type="info"
                      showIcon
                      size="small"
                      message={<span className="text-[12px] font-medium">提示</span>}
                      description={<span className="text-[11px]">下一步可配置投资条款并上传尽调 / 法务附件存档。</span>}
                    />
                  </div>
                </Col>
              </Row>

              <Divider className="!my-5" />
              <div className="flex justify-end gap-2">
                <Button onClick={() => navigate(-1)}>取消</Button>
                <Button type="primary" onClick={() => setStep(1)}>
                  保存并下一步 <ArrowRightOutlined />
                </Button>
              </div>
            </TabPane>
          </Tabs>
        </Card>
      )}

      {/* ========================================== */}
      {/* Step 1: 条款与附件（含所有分类可编辑） */}
      {/* ========================================== */}
      {step === 1 && (
        <>
          {/* 基础信息快速校验 + 条款 */}
          <Card
            className="mb-4"
            title={
              <span className="flex items-center gap-2">
                <span className="flex">
                  <span className="w-1 h-3.5 rounded-full" style={{ background: '#2563eb' }} />
                  <span className="w-1 h-3.5 rounded-full -ml-0.5" style={{ background: '#10b981' }} />
                </span>
                <span className="text-[14px] font-semibold text-slate-900">基础信息 & 财务信息</span>
                <Tag className="!text-[11px] !m-0">可继续修改</Tag>
              </span>
            }
          >
            <Form form={basicForm} layout="vertical">
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item label="项目名称" name="name" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item label="行业" name="industry" rules={[{ required: true }]}>
                    <Select options={industryOptions} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item label="标签" name="tags">
                    <Select
                      mode="tags"
                      allowClear
                      tokenSeparators={[',', '，', ' ']}
                      placeholder="输入后按回车新增标签，支持逗号/空格批量输入"
                      options={['芯片设计', '国产替代', 'AI推荐', 'SaaS', '新能源', '医疗AI', '出海', '硬科技'].map(v => ({ value: v, label: v }))}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item label="团队规模" name="teamSize">
                    <Select options={TEAM_SIZE_OPTIONS} placeholder="请选择" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item label="公司网站" name="website">
                    <Input placeholder="https://example.com" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={24}>
                  <Form.Item label="项目简介" name="description">
                    <TextArea rows={3} placeholder="请补充项目简介、商业模式、核心团队等关键信息" />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
            <Form form={financeForm} layout="vertical">
              <Row gutter={16}>
                <Col xs={24} md={8}>
                  <Form.Item label="投资时间" name="investDate" rules={[{ required: true }]}>
                    <DatePicker style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item label="投资金额(万)" name="investAmount" rules={[{ required: true }]}>
                    <InputNumber style={{ width: '100%' }} min={0} step={100} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item label="投资方式" name="investType" rules={[{ required: true }]}>
                    <Select options={investTypeOptions} />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Card>

          <Card
            className="mb-4"
            title={
              <span className="flex items-center gap-1.5">
                <span className="w-1 h-3.5 rounded-full" style={{ background: '#dc2626' }} />
                <span className="text-[14px] font-semibold text-slate-900">条款信息配置</span>
              </span>
            }
          >
            <Alert
              type="warning"
              showIcon
              size="small"
              message={<span className="text-[12px] font-medium">条款信息用于后续合规提醒和投后跟踪，请务必根据实际投资协议准确填写。</span>}
              className="!mb-4"
            />
            <Form form={clauseForm} layout="vertical">
              <Row gutter={16}>
                {CLAUSE_META.map(({ key, label, color }) => (
                  <Col xs={24} md={12} key={key}>
                    <Form.Item label={<Tag color={color} className="!m-0">{label}</Tag>} name={key}>
                      <TextArea rows={3} placeholder={`请输入${label}的具体约定...`} />
                    </Form.Item>
                    {clauseTemplates[key] && (
                      <Space size={[4, 4]} wrap className="-mt-2 mb-2">
                        <span className="text-[11px] text-slate-400">模板：</span>
                        {clauseTemplates[key].map(t => (
                          <Tooltip title={t.value} key={t.label}>
                            <Tag color="processing" style={{ cursor: 'pointer' }} className="!text-[11px]"
                              onClick={() => {
                                const v = clauseForm.getFieldsValue()
                                const nv = { ...v, [key]: t.value }
                                clauseForm.setFieldsValue(nv)
                                setParsed(prev => ({ ...prev, clauses: { ...prev.clauses, [key]: t.value } }))
                                message.success('已应用模板')
                              }}>{t.label}</Tag>
                          </Tooltip>
                        ))}
                      </Space>
                    )}
                  </Col>
                ))}
              </Row>
            </Form>
          </Card>

          <Card
            className="mb-4"
            title={
              <span className="flex items-center gap-2">
                <span className="flex">
                  <span className="w-1 h-3.5 rounded-full" style={{ background: '#7c3aed' }} />
                  <span className="w-1 h-3.5 rounded-full -ml-0.5" style={{ background: '#f59e0b' }} />
                </span>
                <span className="text-[14px] font-semibold text-slate-900">投资历程 & 投后信息</span>
                <Tag className="!text-[11px] !m-0">可修改分类</Tag>
              </span>
            }
          >
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <div className="flex items-center gap-1.5 mb-2.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#7c3aed' }} />
                  <span className="text-[12px] font-semibold text-slate-700">投资历程</span>
                  <span className="text-[11px] text-slate-400">{parsed.investHistory.length} 条</span>
                </div>
                <div className="space-y-1">
                  {parsed.investHistory.map(item => (
                    <div key={item.id} className="flex items-center justify-between text-xs py-1.5 px-2 rounded" style={{ background: 'rgba(124, 58, 237, 0.05)' }}>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-mono text-[11px] text-violet-600 flex-shrink-0">{item.date}</span>
                        <span className="text-slate-700 truncate">{item.title}</span>
                      </div>
                      <Checkbox
                        checked={true}
                        onChange={e => toggleItemCategory(item.id, e.target.checked)}
                        className="!text-[11px] !text-slate-500"
                      >投资历程</Checkbox>
                    </div>
                  ))}
                  {parsed.investHistory.length === 0 && <div className="text-slate-400 text-xs">暂无</div>}
                </div>
              </Col>
              <Col xs={24} md={12}>
                <div className="flex items-center gap-1.5 mb-2.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#f59e0b' }} />
                  <span className="text-[12px] font-semibold text-slate-700">投后信息</span>
                  <span className="text-[11px] text-slate-400">{parsed.postInvestment.length} 条</span>
                </div>
                <div className="space-y-1">
                  {parsed.postInvestment.map(item => (
                    <div key={item.id} className="flex items-center justify-between text-xs py-1.5 px-2 rounded" style={{ background: 'rgba(245, 158, 11, 0.05)' }}>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-mono text-[11px] text-amber-600 flex-shrink-0">{item.date}</span>
                        <span className="text-slate-700 truncate">{item.title}</span>
                      </div>
                      <Checkbox
                        checked={false}
                        onChange={e => toggleItemCategory(item.id, e.target.checked)}
                      >投资历程</Checkbox>
                    </div>
                  ))}
                  {parsed.postInvestment.length === 0 && <div className="text-slate-400 text-xs">暂无</div>}
                </div>
              </Col>
            </Row>
          </Card>

          <Card
            className="mb-4"
            title={
              <span className="flex items-center gap-1.5">
                <span className="w-1 h-3.5 rounded-full" style={{ background: '#64748b' }} />
                <span className="text-[14px] font-semibold text-slate-900">投前资料交接（附件存档）</span>
              </span>
            }
          >
            <Dragger
              multiple
              beforeUpload={() => false}
              onChange={(info) => setAttachments(info.fileList)}
              fileList={attachments}
              onRemove={(f) => setAttachments(attachments.filter(x => x.uid !== f.uid))}
            >
              <p className="ant-upload-drag-icon"><UploadOutlined style={{ color: '#2563eb', fontSize: 40 }} /></p>
              <p className="ant-upload-text font-semibold text-slate-900 !text-[14px]">上传尽调报告、法律意见书、投资协议等资料</p>
              <p className="ant-upload-hint text-[12px] text-slate-500">支持 PDF / Word / Excel / PPT 等格式，作为项目附件永久存档</p>
            </Dragger>
          </Card>

          <div className="flex justify-between gap-2">
            <Button onClick={() => setStep(0)} icon={<ArrowLeftOutlined />}>上一步</Button>
            <Space>
              <Button onClick={() => navigate(-1)}>取消</Button>
              <Button type="primary" onClick={() => { syncFromForms(); setStep(2) }}>
                下一步 <ArrowRightOutlined />
              </Button>
            </Space>
          </div>
        </>
      )}

      {/* ========================================== */}
      {/* Step 2: 确认提交（所有分类可编辑） */}
      {/* ========================================== */}
      {step === 2 && (
        <>
          <Card
            className="mb-4"
            title={
              <span className="flex items-center gap-2">
                <div
                  className="flex items-center justify-center rounded-md"
                  style={{ width: 24, height: 24, background: 'rgba(16, 185, 129, 0.1)' }}
                >
                  <CheckCircleOutlined style={{ color: '#10b981', fontSize: 13 }} />
                </div>
                <span className="text-[14px] font-semibold text-slate-900">信息确认</span>
                <Tag className="!text-[11px] !m-0">所有字段均可修改</Tag>
              </span>
            }
          >
            <Alert
              type="success"
              showIcon
              message={<span className="text-[13px] font-semibold">档案信息已按分类整理，请确认无误后提交</span>}
              description={<span className="text-[12px] text-slate-600">提交后系统将：① 生成项目档案 ② 自动创建首次季报 / 年报合规任务 ③ 将项目推送至负责人工作台</span>}
              className="!mb-4"
            />

            {/* 基础信息 */}
            <Form form={basicForm} layout="vertical" className="mb-4">
              <Card size="small" className="mb-3" title={
                <span className="flex items-center gap-1.5">
                  <span className="w-1 h-3.5 rounded-full" style={{ background: '#2563eb' }} />
                  <span className="text-[13px] font-semibold text-slate-900">基础信息</span>
                </span>
              }>
                <Descriptions column={2} size="small" bordered>
                  <Descriptions.Item label="项目名称">
                    <Form.Item name="name" noStyle rules={[{ required: true }]}><Input /></Form.Item>
                  </Descriptions.Item>
                  <Descriptions.Item label="行业">
                    <Form.Item name="industry" noStyle rules={[{ required: true }]}><Select options={industryOptions} /></Form.Item>
                  </Descriptions.Item>
                  <Descriptions.Item label="标签">
                    <Form.Item name="tags" noStyle>
                      <Select
                        mode="tags"
                        allowClear
                        tokenSeparators={[',', '，', ' ']}
                        placeholder="输入后按回车新增标签"
                        options={['芯片设计', '国产替代', 'AI推荐', 'SaaS', '新能源', '医疗AI', '出海', '硬科技'].map(v => ({ value: v, label: v }))}
                      />
                    </Form.Item>
                  </Descriptions.Item>
                  <Descriptions.Item label="团队规模">
                    <Form.Item name="teamSize" noStyle><Select options={TEAM_SIZE_OPTIONS} /></Form.Item>
                  </Descriptions.Item>
                  <Descriptions.Item label="公司网站" span={2}>
                    <Form.Item name="website" noStyle><Input /></Form.Item>
                  </Descriptions.Item>
                  <Descriptions.Item label="项目简介" span={2}>
                    <Form.Item name="description" noStyle><TextArea rows={2} /></Form.Item>
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            </Form>

            {/* 财务信息 */}
            <Form form={financeForm} layout="vertical" className="mb-4">
              <Card size="small" className="mb-3" title={
                <span className="flex items-center gap-1.5">
                  <span className="w-1 h-3.5 rounded-full" style={{ background: '#10b981' }} />
                  <span className="text-[13px] font-semibold text-slate-900">财务信息</span>
                </span>
              }>
                <Descriptions column={3} size="small" bordered>
                  <Descriptions.Item label="投资时间">
                    <Form.Item name="investDate" noStyle rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
                  </Descriptions.Item>
                  <Descriptions.Item label="投资金额(万)">
                    <Form.Item name="investAmount" noStyle rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={0} /></Form.Item>
                  </Descriptions.Item>
                  <Descriptions.Item label="投资方式">
                    <Form.Item name="investType" noStyle rules={[{ required: true }]}><Select options={investTypeOptions} /></Form.Item>
                  </Descriptions.Item>
                  <Descriptions.Item label="投资方及占比" span={3}>
                    <Form.Item name="investors" noStyle>
                      <Form.List name="investors">
                        {(fields, { add, remove }) => (
                          <>
                            {fields.map(f => (
                              <Row gutter={8} key={f.key} className="mb-2">
                                <Col xs={14}>
                                  <Form.Item {...f} name={[f.name, 'name']} rules={[{ required: true }]} noStyle>
                                    <Input placeholder="投资方名称" />
                                  </Form.Item>
                                </Col>
                                <Col xs={8}>
                                  <Form.Item {...f} name={[f.name, 'ratio']} noStyle>
                                    <InputNumber style={{ width: '100%' }} min={0} max={100} addonAfter="%" placeholder="占比" />
                                  </Form.Item>
                                </Col>
                                <Col xs={2}>
                                  <Button type="text" danger size="small" onClick={() => remove(f.name)} disabled={fields.length <= 1}>删除</Button>
                                </Col>
                              </Row>
                            ))}
                            <Button type="dashed" block size="small" onClick={() => add()} icon={<PlusOutlined />}>添加投资方</Button>
                          </>
                        )}
                      </Form.List>
                    </Form.Item>
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            </Form>

            {/* 投资历程 & 投后信息 */}
            <Card size="small" className="mb-3" title={
              <span className="flex items-center gap-2">
                <span className="flex">
                  <span className="w-1 h-3.5 rounded-full" style={{ background: '#7c3aed' }} />
                  <span className="w-1 h-3.5 rounded-full -ml-0.5" style={{ background: '#f59e0b' }} />
                </span>
                <span className="text-[13px] font-semibold text-slate-900">投资历程 & 投后信息</span>
              </span>
            }>
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#7c3aed' }} />
                    <span className="text-[12px] font-semibold text-slate-700">投资历程</span>
                    <span className="text-[11px] text-slate-400">{parsed.investHistory.length} 条</span>
                  </div>
                  <div className="space-y-1">
                    {parsed.investHistory.map(item => (
                      <div key={item.id} className="flex items-center justify-between text-xs py-1.5 px-2 rounded" style={{ background: 'rgba(124, 58, 237, 0.05)' }}>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-mono text-[11px] text-violet-600 flex-shrink-0">{item.date}</span>
                          <span className="text-slate-700 truncate">{item.title}</span>
                        </div>
                        <Checkbox checked={true} onChange={e => toggleItemCategory(item.id, e.target.checked)} className="!text-[11px] !text-slate-500">投资历程</Checkbox>
                      </div>
                    ))}
                    {parsed.investHistory.length === 0 && <div className="text-slate-400 text-xs">暂无</div>}
                  </div>
                </Col>
                <Col xs={24} md={12}>
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#f59e0b' }} />
                    <span className="text-[12px] font-semibold text-slate-700">投后信息</span>
                    <span className="text-[11px] text-slate-400">{parsed.postInvestment.length} 条</span>
                  </div>
                  <div className="space-y-1">
                    {parsed.postInvestment.map(item => (
                      <div key={item.id} className="flex items-center justify-between text-xs py-1.5 px-2 rounded" style={{ background: 'rgba(245, 158, 11, 0.05)' }}>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-mono text-[11px] text-amber-600 flex-shrink-0">{item.date}</span>
                          <span className="text-slate-700 truncate">{item.title}</span>
                        </div>
                        <Checkbox checked={false} onChange={e => toggleItemCategory(item.id, e.target.checked)} className="!text-[11px] !text-slate-500">投资历程</Checkbox>
                      </div>
                    ))}
                    {parsed.postInvestment.length === 0 && <div className="text-slate-400 text-xs">暂无</div>}
                  </div>
                </Col>
              </Row>
            </Card>

            {/* 条款信息 */}
            <Form form={clauseForm} layout="vertical">
              <Card size="small" className="mb-3" title={
                <span className="flex items-center gap-1.5">
                  <span className="w-1 h-3.5 rounded-full" style={{ background: '#dc2626' }} />
                  <span className="text-[13px] font-semibold text-slate-900">条款信息</span>
                </span>
              }>
                <Row gutter={12}>
                  {CLAUSE_META.map(({ key, label, color }) => (
                    <Col xs={24} md={12} key={key}>
                      <Form.Item label={<Tag color={color}>{label}</Tag>} name={key}>
                        <TextArea rows={3} />
                      </Form.Item>
                    </Col>
                  ))}
                </Row>
              </Card>
            </Form>
          </Card>

          <div className="flex justify-between gap-2">
            <Button onClick={() => setStep(1)} icon={<ArrowLeftOutlined />}>返回修改</Button>
            <Space>
              <Button onClick={() => navigate(-1)}>取消</Button>
              <Button type="primary" icon={<SaveOutlined />} onClick={handleSubmit}>确认提交并创建档案</Button>
            </Space>
          </div>
        </>
      )}
    </div>
  )
}
