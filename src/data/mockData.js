import dayjs from 'dayjs'
import { v4 as uuidv4 } from 'uuid'

// 模拟投后项目数据
export const mockProjects = [
  {
    id: '1',
    name: '智云科技有限公司',
    industry: '企业服务/SaaS',
    tags: ['云计算', '企业服务', '高成长'],
    investDate: '2024-03-15',
    investAmount: 5000,
    investAmountDisplay: '5,000万',
    investType: '股权',
    investors: [
      { name: '我方基金', ratio: 15 },
      { name: '红杉资本', ratio: 20 },
      { name: 'IDG资本', ratio: 10 },
    ],
    status: 'normal',
    clauses: {
      repurchase: '若2027年12月31日前未完成合格IPO，创始股东需按8%年化收益率回购',
      liquidation: '优先清算权，1倍回报，参与分配',
      antiDilution: '加权平均反稀释条款',
      tagAlong: '随售权，持股比例同比例出售',
      dragAlong: '拖售权，经75%股东同意可强制出售',
      veto: '重大事项一票否决权（增资、减资、合并、分立、解散等）',
    },
    description: '智云科技是国内领先的企业级云计算服务提供商，专注于为中大型企业提供一站式云基础设施解决方案。',
    teamSize: '300-500人',
    website: 'https://zhiyun.example.com',
    attachments: [
      { name: '尽调报告.pdf', type: 'pdf', size: '2.3MB', uploadDate: '2024-02-20' },
      { name: '法律意见书.pdf', type: 'pdf', size: '1.8MB', uploadDate: '2024-03-01' },
      { name: '投资协议签署版.pdf', type: 'pdf', size: '856KB', uploadDate: '2024-03-15' },
    ],
  },
  {
    id: '2',
    name: '绿能新能源股份公司',
    industry: '新能源/储能',
    tags: ['新能源', '硬科技', '政策红利'],
    investDate: '2023-09-20',
    investAmount: 8000,
    investAmountDisplay: '8,000万',
    investType: '可转债',
    investors: [
      { name: '我方基金', ratio: 12 },
      { name: '高瓴资本', ratio: 18 },
    ],
    status: 'normal',
    clauses: {
      repurchase: '2026年6月30日前未完成合格上市，按6%年化回购',
      liquidation: '优先清算权，1.5倍回报',
      antiDilution: '完全棘轮反稀释条款',
      tagAlong: '随售权',
      dragAlong: '拖售权',
      veto: '重大事项一票否决权',
    },
    description: '绿能新能源专注于储能电池和光伏逆变器的研发与生产，拥有多项核心专利技术。',
    teamSize: '500-1000人',
    website: 'https://lvneng.example.com',
    attachments: [],
  },
  {
    id: '3',
    name: '数智医疗科技公司',
    industry: '医疗健康/AI医疗',
    tags: ['AI医疗', '创新药', '高技术壁垒'],
    investDate: '2024-06-10',
    investAmount: 3500,
    investAmountDisplay: '3,500万',
    investType: '股权',
    investors: [
      { name: '我方基金', ratio: 20 },
      { name: '启明创投', ratio: 15 },
    ],
    status: 'warning',
    clauses: {
      repurchase: '2028年12月31日前未完成合格IPO，按10%年化回购',
      liquidation: '优先清算权，1倍回报',
      antiDilution: '加权平均反稀释',
      tagAlong: '随售权',
      dragAlong: '拖售权（80%同意）',
      veto: '重大事项否决权',
    },
    description: '数智医疗利用AI技术辅助诊断，主打产品在肺病影像领域获得NMPA三类证。',
    teamSize: '100-300人',
    website: 'https://shuzhi.example.com',
    attachments: [],
  },
  {
    id: '4',
    name: '星途汽车零部件公司',
    industry: '智能制造/汽车',
    tags: ['新能源车', '智能制造', '出海'],
    investDate: '2023-02-28',
    investAmount: 12000,
    investAmountDisplay: '1.2亿',
    investType: '股权',
    investors: [
      { name: '我方基金', ratio: 8 },
      { name: '比亚迪股份', ratio: 25 },
      { name: '宁德时代', ratio: 12 },
    ],
    status: 'normal',
    clauses: {
      repurchase: '2026年12月31日前未合格上市，按7%年化回购',
      liquidation: '1倍优先清算权，参与分配上限3倍',
      antiDilution: '广义加权平均',
      tagAlong: '同比例随售',
      dragAlong: '拖售权',
      veto: '重大事项一票否决权',
    },
    description: '星途汽零是新能源车核心三电系统零部件供应商，已进入多家头部车企供应链。',
    teamSize: '1000-2000人',
    website: 'https://xingtu.example.com',
    attachments: [],
  },
  {
    id: '5',
    name: '食光预制菜有限公司',
    industry: '消费/食品',
    tags: ['预制菜', '消费升级', '连锁'],
    investDate: '2024-01-08',
    investAmount: 4200,
    investAmountDisplay: '4,200万',
    investType: '股权',
    investors: [
      { name: '我方基金', ratio: 18 },
      { name: '今日资本', ratio: 15 },
    ],
    status: 'danger',
    clauses: {
      repurchase: '2027年6月30日前未合格上市，按8%年化回购',
      liquidation: '1倍优先清算权',
      antiDilution: '加权平均',
      tagAlong: '随售权',
      dragAlong: '拖售权',
      veto: '重大事项一票否决权',
    },
    description: '食光预制菜主打B端餐饮供应链，在全国有5个生产基地。',
    teamSize: '500-1000人',
    website: 'https://shiguang.example.com',
    attachments: [],
  },
  {
    id: '6',
    name: '芯创半导体有限公司',
    industry: '硬科技/半导体',
    tags: ['芯片设计', '国产替代', '国家战略'],
    investDate: '2023-11-15',
    investAmount: 15000,
    investAmountDisplay: '1.5亿',
    investType: '股权',
    investors: [
      { name: '我方基金', ratio: 10 },
      { name: '大基金二期', ratio: 20 },
      { name: '华为哈勃', ratio: 15 },
    ],
    status: 'normal',
    clauses: {
      repurchase: '2029年12月31日前未合格上市，按5%年化回购',
      liquidation: '1倍优先清算权',
      antiDilution: '加权平均反稀释',
      tagAlong: '随售权',
      dragAlong: '拖售权',
      veto: '重大事项一票否决权',
    },
    description: '芯创半导体专注于高端模拟芯片设计，产品应用于汽车电子、工业控制领域。',
    teamSize: '200-500人',
    website: 'https://xinchuang.example.com',
    attachments: [],
  },
]

// 模拟财务数据 - 每个项目3年数据
export function generateFinanceData(projectId) {
  const seed = projectId.charCodeAt(projectId.length - 1)
  const baseRevenue = [8000, 12000, 15000, 20000, 6000, 25000][seed % 6]
  const growthRate = 0.15 + (seed % 5) * 0.05
  const marginRate = 0.12 + (seed % 8) * 0.03

  const data = []
  for (let i = 2; i >= 0; i--) {
    const year = dayjs().year() - i
    const revenue = Math.round(baseRevenue * Math.pow(1 + growthRate, 2 - i))
    const grossProfit = Math.round(revenue * (0.35 + (seed % 10) * 0.02))
    const netProfit = Math.round(revenue * (marginRate - i * 0.02))
    const debtRatio = Math.max(0.2, 0.68 - (2 - i) * 0.08 - (seed % 5) * 0.02)
    const cashFlow = Math.round(netProfit * 0.8 + (seed % 10) * 100 - i * 50)

    for (let q = 1; q <= 4; q++) {
      if (i === 0 && q > 2) continue // 当前年度只到Q2
      const factor = q === 1 ? 0.22 : q === 2 ? 0.26 : q === 3 ? 0.24 : 0.28
      data.push({
        period: `${year}Q${q}`,
        year,
        quarter: q,
        revenue: Math.round(revenue * factor),
        grossProfit: Math.round(grossProfit * factor),
        netProfit: Math.round(netProfit * factor),
        debtRatio: Math.min(0.95, debtRatio + (q - 2) * 0.02),
        operatingCashFlow: Math.round(cashFlow * factor),
      })
    }
  }
  return data
}

// 生成年度汇总数据
/** 期间新旧排序值：同年内 年报 > 四季度/12月 > ... > 一季度/1月 */
function periodRank(period) {
  const p = String(period || '')
  const mQ = p.match(/^(\d{4})\s*[Qq](\d)$/)
  if (mQ) return Number(mQ[1]) * 100 + Number(mQ[2]) * 3
  const mM = p.match(/^(\d{4})(\d{2})$/)
  if (mM) return Number(mM[1]) * 100 + Number(mM[2])
  if (/^\d{4}$/.test(p)) return Number(p) * 100 + 12
  return 0
}

/**
 * 按年聚合财务数据，看板展示规则：年份数据 + 最新一期
 * - 某年存在年报（period 为 4 位年份）→ 直接用年报数据，标签如「2025年」
 * - 某年只有季度/月度数据 → 取最新一期（如 202608 / 2026Q1），标签即期间
 * 返回按期间升序排列（最新在末尾）
 */
export function getYearlyFinance(financeData) {
  const byYear = {}
  financeData.forEach((item) => {
    const y = Number(item.year) || Number(String(item.period).slice(0, 4)) || 0
    if (!y) return
    if (!byYear[y]) byYear[y] = []
    byYear[y].push(item)
  })
  return Object.keys(byYear)
    .map(Number)
    .sort((a, b) => a - b)
    .map((year) => {
      const rows = byYear[year]
      // 年报优先；否则取该年最新一期（季度或月度）
      const annual = rows.find((r) => /^\d{4}$/.test(String(r.period)))
      const target = annual || [...rows].sort((a, b) => periodRank(b.period) - periodRank(a.period))[0]
      const isPartial = !annual
      const revenue = Number(target.revenue) || 0
      const grossProfit = Number(target.grossProfit) || 0
      const netProfit = Number(target.netProfit) || 0
      return {
        year,
        revenue,
        grossProfit,
        netProfit,
        debtRatio: Number(target.debtRatio) || 0,
        count: rows.length,
        operatingCashFlow: Number(target.operatingCashFlow) || 0,
        isQuarterly: isPartial,
        period: String(target.period),
        grossMargin: revenue ? grossProfit / revenue : 0,
        netMargin: revenue ? netProfit / revenue : 0,
        label: isPartial ? String(target.period) : `${year}年`,
      }
    })
    .sort((a, b) => periodRank(a.period) - periodRank(b.period))
}

// 智能亮点提取
export function extractInsights(yearlyData) {
  const insights = []
  if (yearlyData.length >= 3) {
    const [y1, y2, y3] = yearlyData
    // 营收CAGR
    if (y1.revenue > 0) {
      const cagr = Math.pow(y3.revenue / y1.revenue, 1 / 2) - 1
      if (cagr > 0.05) {
        insights.push(`营收连续三年增长，CAGR达${Math.round(cagr * 100)}%，增长势头良好`)
      } else if (cagr < -0.05) {
        insights.push(`营收三年CAGR为${Math.round(cagr * 100)}%，需关注业务收缩风险`)
      } else {
        insights.push(`营收保持平稳，三年CAGR约${Math.round(cagr * 100)}%`)
      }
    }
    // 净利润率趋势
    if (y1.netMargin && y3.netMargin) {
      const diff = (y3.netMargin - y1.netMargin) * 100
      if (diff > 2) {
        insights.push(`净利润率持续改善，从${Math.round(y1.netMargin * 100)}%提升至${Math.round(y3.netMargin * 100)}%，盈利能力增强`)
      } else if (diff < -2) {
        insights.push(`净利润率有所下滑，从${Math.round(y1.netMargin * 100)}%降至${Math.round(y3.netMargin * 100)}%，建议关注成本控制`)
      }
    }
    // 资产负债率趋势
    if (y1.debtRatio && y3.debtRatio) {
      const diff = (y3.debtRatio - y1.debtRatio) * 100
      if (diff < -3) {
        insights.push(`资产负债率逐年优化，从${Math.round(y1.debtRatio * 100)}%下降至${Math.round(y3.debtRatio * 100)}%，财务结构更稳健`)
      } else if (diff > 5) {
        insights.push(`资产负债率上升较快（${Math.round(y1.debtRatio * 100)}% → ${Math.round(y3.debtRatio * 100)}%），建议关注偿债能力`)
      }
    }
    // 经营现金流
    if (y1.operatingCashFlow < 0 && y3.operatingCashFlow > 0) {
      insights.push('经营现金流由负转正，自身造血能力显著提升')
    } else if (y3.operatingCashFlow > y1.operatingCashFlow * 1.5) {
      insights.push('经营现金流大幅改善，现金获取能力增强')
    }
  }
  return insights
}

// 模拟时间轴记录
export function generateTimeline(projectId) {
  const items = []
  const baseDate = dayjs(mockProjects.find((p) => p.id === projectId)?.investDate || '2024-01-01')

  items.push({
    id: uuidv4(),
    date: baseDate.format('YYYY-MM-DD'),
    type: 'invest',
    typeLabel: '投资交割',
    title: '投资完成交割',
    description: '投资协议正式签署，完成工商变更，投资款全额到账。',
    operator: '张经理',
  })

  items.push({
    id: uuidv4(),
    date: baseDate.add(30, 'day').format('YYYY-MM-DD'),
    type: 'meeting',
    typeLabel: '三会',
    title: '投后首次股东会',
    description: '召开投后第一次股东会，审议年度经营计划，确认董事会席位。',
    operator: '李总监',
  })

  items.push({
    id: uuidv4(),
    date: baseDate.add(3, 'month').format('YYYY-MM-DD'),
    type: 'inquiry',
    typeLabel: '问询',
    title: 'Q1经营问询函发送',
    description: '发送季度经营问询邮件，涵盖经营数据、重大事项、合规情况等。',
    operator: '系统',
  })

  items.push({
    id: uuidv4(),
    date: baseDate.add(3, 'month').add(7, 'day').format('YYYY-MM-DD'),
    type: 'inquiry_reply',
    typeLabel: '问询回复',
    title: 'Q1问询回复收悉',
    description: '被投企业已回复Q1问询，经营情况整体符合预期，毛利率略低于预期2个百分点。',
    operator: '张经理',
  })

  items.push({
    id: uuidv4(),
    date: baseDate.add(4, 'month').format('YYYY-MM-DD'),
    type: 'report',
    typeLabel: '财报',
    title: 'Q1财报录入',
    description: '上传Q1财务报表，完成财务数据录入和核验。',
    operator: '王会计',
  })

  items.push({
    id: uuidv4(),
    date: baseDate.add(6, 'month').format('YYYY-MM-DD'),
    type: 'visit',
    typeLabel: '现场走访',
    title: '现场走访调研',
    description: '对公司总部及主要生产基地进行现场走访，与管理层深度沟通。核心结论：订单饱满，产能利用率90%以上。',
    operator: '张经理、李总监',
  })

  items.push({
    id: uuidv4(),
    date: baseDate.add(9, 'month').format('YYYY-MM-DD'),
    type: 'note',
    typeLabel: '跟进笔记',
    title: '竞品动态跟踪',
    description: '关注到主要竞争对手近期发布新产品，公司研发进度需要加快。已提醒CEO关注。',
    operator: '张经理',
  })

  return items.sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf())
}

// 模拟待办任务
export const mockTasks = [
  {
    id: 't1',
    projectId: '1',
    projectName: '智云科技有限公司',
    title: '上传Q2财务报告',
    type: 'report',
    typeLabel: '财报上传',
    dueDate: dayjs().add(3, 'day').format('YYYY-MM-DD'),
    priority: 'high',
    status: 'pending',
    desc: '请于截止日期前上传被投企业Q2财报PDF/Excel，并完成核心数据录入。',
  },
  {
    id: 't2',
    projectId: '5',
    projectName: '食光预制菜有限公司',
    title: '发送Q2经营问询邮件',
    type: 'inquiry',
    typeLabel: '问询发送',
    dueDate: dayjs().add(1, 'day').format('YYYY-MM-DD'),
    priority: 'high',
    status: 'pending',
    desc: '系统已生成问询邮件草稿（见附件），请下载后通过外部邮箱发送。',
    attachment: '食光预制菜_Q2问询函草稿.docx',
  },
  {
    id: 't3',
    projectId: '3',
    projectName: '数智医疗科技公司',
    title: '2023年年报录入',
    type: 'report',
    typeLabel: '年报录入',
    dueDate: dayjs().subtract(5, 'day').format('YYYY-MM-DD'),
    priority: 'high',
    status: 'overdue',
    desc: '年报数据录入已逾期，请尽快完成。',
  },
  {
    id: 't4',
    projectId: '2',
    projectName: '绿能新能源股份公司',
    title: '半年度现场走访',
    type: 'visit',
    typeLabel: '现场走访',
    dueDate: dayjs().add(10, 'day').format('YYYY-MM-DD'),
    priority: 'medium',
    status: 'pending',
    desc: '按制度要求每半年至少走访一次，请安排行程并提交走访记录。',
  },
  {
    id: 't5',
    projectId: '6',
    projectName: '芯创半导体有限公司',
    title: 'Q1问询回复录入',
    type: 'inquiry_reply',
    typeLabel: '问询回复',
    dueDate: dayjs().add(5, 'day').format('YYYY-MM-DD'),
    priority: 'medium',
    status: 'pending',
    desc: '已收到被投企业Q1问询回复，请在时间轴录入回复要点摘要。',
  },
  {
    id: 't6',
    projectId: '4',
    projectName: '星途汽车零部件公司',
    title: '董事会会议材料准备',
    type: 'meeting',
    typeLabel: '三会准备',
    dueDate: dayjs().add(15, 'day').format('YYYY-MM-DD'),
    priority: 'low',
    status: 'pending',
    desc: '拟于8月25日召开年度董事会，请准备董事会议案与会议材料。',
  },
]

// 动作类型配色
export const actionTypeColors = {
  invest: '#1677ff',
  meeting: '#722ed1',
  inquiry: '#faad14',
  inquiry_reply: '#13c2c2',
  report: '#52c41a',
  visit: '#eb2f96',
  note: '#8c8c8c',
  other: '#d9d9d9',
}

export const actionTypeOptions = [
  { value: 'invest', label: '投资交割' },
  { value: 'meeting', label: '三会召开' },
  { value: 'inquiry', label: '发送问询' },
  { value: 'inquiry_reply', label: '问询回复' },
  { value: 'report', label: '财报上传' },
  { value: 'visit', label: '现场走访' },
  { value: 'note', label: '跟进笔记' },
  { value: 'other', label: '其他' },
]

export const industryOptions = [
  { value: '企业服务/SaaS', label: '企业服务/SaaS' },
  { value: '新能源/储能', label: '新能源/储能' },
  { value: '医疗健康/AI医疗', label: '医疗健康/AI医疗' },
  { value: '智能制造/汽车', label: '智能制造/汽车' },
  { value: '消费/食品', label: '消费/食品' },
  { value: '硬科技/半导体', label: '硬科技/半导体' },
  { value: '金融科技', label: '金融科技' },
  { value: '教育科技', label: '教育科技' },
  { value: '其他', label: '其他' },
]

export const investTypeOptions = [
  { value: '股权', label: '股权投资' },
  { value: '债权', label: '债权投资' },
  { value: '可转债', label: '可转换债券' },
]
