import { useSyncExternalStore } from 'react'
import dayjs from 'dayjs'
import { v4 as uuidv4 } from 'uuid'
import {
  mockProjects,
  generateFinanceData,
  generateTimeline,
  mockTasks,
  getYearlyFinance,
  actionTypeOptions,
  actionTypeColors,
} from './mockData.js'
import { getDB } from '../services/cloudbaseClient.js'

/**
 * store.js — 轻量级持久化数据层（模拟 PostgreSQL 数据库）
 *
 * 数据结构：
 * {
 *   projects:  Project[],
 *   finance:   { [projectId]: FinanceItem[] },   // 按期间倒序
 *   timelines: { [projectId]: TimelineEvent[] }, // 按日期倒序
 *   todos:     Todo[],
 *   highlights:{ [projectId]: Highlight[] },     // 数据亮点（可编辑/删除）
 *   equity:    { [projectId]: EquityEvent[] },   // 股权变更时间线（多轮融资）
 *   session:   { role, userName, userId },       // 当前登录角色（投后/风控/财务/管理员）
 *   auditLogs: AuditLog[],                       // 操作留痕审计日志
 * }
 *
 * 所有写操作自动同步 localStorage，刷新页面不丢失。
 */

const STORAGE_KEY = 'pip_platform_store_v1'

// ---------- 角色与权限 ----------
export const ROLE_LABELS = {
  post: '投后经理',
  risk: '风控专员',
  finance: '财务专员',
  admin: '系统管理员',
}

const DEFAULT_SESSION = { role: 'post', userName: '王经理', userId: 'current-user' }

/** 权限矩阵：每行是角色，值为该角色可执行的操作标识；'*' 表示全部权限 */
const ROLE_PERMISSIONS = {
  admin: ['*'], // 系统管理员：全部权限（含员工库、项目删除）
  post: [
    // 投后经理：项目全生命周期管理，但不含员工库和项目删除
    'project.create',
    'project.view',
    'project.edit',
    'finance.view',
    'finance.edit',
    'timeline.view',
    'timeline.edit',
    'equity.view',
    'equity.edit',
    'highlight.view',
    'highlight.edit',
    'report.export',
    'log.view',
    'todo.edit',
  ],
  risk: [
    'project.view',
    'project.edit',
    'finance.view',
    'timeline.view',
    'timeline.edit',
    'equity.view',
    'equity.edit',
    'highlight.view',
    'highlight.edit',
    'report.export',
    'log.view',
    'todo.edit',
  ],
  finance: [
    'project.view',
    'finance.view',
    'finance.edit',
    'report.export',
    'log.view',
    'todo.edit',
  ],
}

/** 判断当前角色是否拥有某项权限 */
export function can(permission) {
  const role = state.session?.role || 'post'
  const perms = ROLE_PERMISSIONS[role] || []
  return perms.includes('*') || perms.includes(permission)
}

export function getRole() {
  return state.session?.role || 'post'
}

export function getRoleLabel() {
  return ROLE_LABELS[state.session?.role] || ROLE_LABELS.post
}

/** 切换当前角色（模拟登录，生产环境应由后端认证控制） */
export function setRole(role) {
  if (!ROLE_LABELS[role]) return
  commit({
    ...state,
    session: { ...state.session, role, userId: state.session?.userId || DEFAULT_SESSION.userId },
  })
  logAction('切换角色', '系统', `当前角色切换为「${ROLE_LABELS[role]}」`)
}

/** 设置当前登录会话（真实登录后调用） */
export function setSession(session) {
  commit({ ...state, session: { ...state.session, ...session } })
}

/** 操作留痕：所有写操作自动记录（内部使用） */
function logAction(action, target, detail) {
  const item = {
    id: uuidv4(),
    time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    user: state.session?.userName || '王经理',
    role: state.session?.role || 'post',
    action,
    target: target || '-',
    detail: detail || '',
  }
  commit({
    ...state,
    auditLogs: [item, ...(state.auditLogs || [])].slice(0, 500),
  })
  cloudUpsert('audit_logs', item)
}

export function getAuditLogs() {
  return state.auditLogs || []
}

// ---------- 种子数据 ----------
/** 为项目生成初始股权历史（天使轮 + 我方投资轮） */
function generateEquitySeed(p) {
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
  const invs = (p.investors || []).filter((x) => x && x.name)
  // 模板提供了真实股东明细 → 直接生成「当前股权结构」轮次
  if (invs.length) {
    const invRatio = invs.reduce((s, x) => s + (Number(x.ratio) || 0), 0)
    let shareholders = invs.map((x) => ({ name: x.name, ratio: Number(x.ratio) || 0 }))
    // 比例不足 100% 时补齐「其他股东」，避免总和缺失
    if (invRatio < 99) {
      shareholders = [...shareholders, { name: '其他股东', ratio: Math.round((100 - invRatio) * 100) / 100 }]
    }
    return [{
      id: uuidv4(),
      date: p.investDate,
      round: '当前股权',
      title: `${p.name} 当前股权结构`,
      description: '由导入模板提供的股东明细生成。',
      shareholders,
      operator: '系统导入',
      createdAt: now,
    }]
  }
  // 未提供股东明细 → 回退为种子数据（天使轮 + 我方投资轮）
  const investDate = dayjs(p.investDate)
  return [
    {
      id: uuidv4(),
      date: investDate.subtract(1, 'year').format('YYYY-MM-DD'),
      round: '天使轮',
      title: '天使轮融资',
      description: '创始团队完成天使轮融资，用于早期产品研发与团队组建。',
      shareholders: [
        { name: '创始团队', ratio: 80 },
        { name: '天使投资人', ratio: 20 },
      ],
      operator: '系统导入',
      createdAt: now,
    },
    {
      id: uuidv4(),
      date: p.investDate,
      round: '投资轮',
      title: `${p.name} 股权投资（我方参投）`,
      description: '我方完成股权投资并成为公司股东，本轮投后股权结构如下。',
      shareholders: [
        { name: '创始团队', ratio: 60 },
        { name: '我方基金', ratio: 30 },
        { name: '期权池', ratio: 10 },
      ],
      operator: '系统导入',
      createdAt: now,
    },
  ]
}

function buildSeed() {
  const finance = {}
  const timelines = {}
  const equity = {}
  mockProjects.forEach((p) => {
    finance[p.id] = generateFinanceData(p.id)
    timelines[p.id] = generateTimeline(p.id)
    equity[p.id] = generateEquitySeed(p)
  })
  return {
    projects: mockProjects.map((p) => ({ ...p })),
    finance,
    timelines,
    equity,
    todos: mockTasks.map((t) => ({ ...t })),
    highlights: {},
    users: [],
    session: { ...DEFAULT_SESSION },
    auditLogs: [],
    financeSummary: [],
    customActionTypes: [],
  }
}

// ---------- 加载 / 持久化 ----------
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && parsed.projects && parsed.finance && parsed.timelines && parsed.todos) {
        if (!parsed.highlights) parsed.highlights = {}
        if (!parsed.equity) parsed.equity = {}
        if (!parsed.users) parsed.users = []
        if (!parsed.session) parsed.session = { ...DEFAULT_SESSION }
        if (!parsed.session.userId) parsed.session.userId = DEFAULT_SESSION.userId
        if (!parsed.auditLogs) parsed.auditLogs = []
        if (!parsed.financeSummary) parsed.financeSummary = []
        if (!parsed.customActionTypes) parsed.customActionTypes = []
        // 兼容旧数据：为没有股权记录的项目补充初始股权时间线
        parsed.projects.forEach((p) => {
          p.directors = normalizeDirectors(p.directors)
          if (!parsed.equity[p.id] || parsed.equity[p.id].length === 0) {
            parsed.equity[p.id] = generateEquitySeed(p)
          }
        })
        return parsed
      }
    }
  } catch (e) {
    /* ignore */
  }
  return buildSeed()
}

let state = load()
const listeners = new Set()

function commit(next) {
  state = next
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (e) {
    /* ignore */
  }
  listeners.forEach((l) => l())
}

export function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getSnapshot() {
  return state
}

/** React Hook：订阅全局状态 */
export function useStore() {
  return useSyncExternalStore(subscribe, getSnapshot)
}

export function getProjectById(id) {
  return state.projects.find((p) => p.id === id) || null
}

/** 获取当前状态快照（非 Hook 场景使用，如导出工具） */
export function getState() {
  return state
}

/** 财报汇总表数据（finance_summary，全公司共享，只读） */
export function getFinanceSummary() {
  return state.financeSummary || []
}

// ---------- 自定义事项类型（action_types，全团队共享） ----------
const CUSTOM_TYPE_COLORS = ['#0ea5e9', '#8b5cf6', '#f43f5e', '#14b8a6', '#f97316', '#84cc16']

/** 内置 + 自定义事项类型选项（供 Select / 筛选使用） */
export function getAllActionTypes() {
  const custom = (state.customActionTypes || []).map((c) => ({ value: c.value, label: c.label }))
  return [...actionTypeOptions, ...custom]
}

/** 事项类型配色：内置表 → 自定义表 → 默认蓝 */
export function getActionTypeColor(value) {
  const custom = (state.customActionTypes || []).find((c) => c.value === value)
  if (custom?.color) return custom.color
  return actionTypeColors[value] || '#2563eb'
}

/** 新增自定义事项类型（全团队共享，写入 action_types 表） */
export function addCustomActionType(label) {
  const name = String(label || '').trim()
  if (!name) return { error: '类型名称不能为空' }
  const all = getAllActionTypes()
  if (all.some((o) => o.label === name)) return { error: `类型「${name}」已存在` }
  const item = {
    id: uuidv4(),
    value: `custom_${uuidv4().slice(0, 8)}`,
    label: name,
    color: CUSTOM_TYPE_COLORS[(state.customActionTypes || []).length % CUSTOM_TYPE_COLORS.length],
    createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
  }
  commit({ ...state, customActionTypes: [...(state.customActionTypes || []), item] })
  logAction('新增事项类型', name, '自定义投后事项类型（全团队共享）')
  cloudUpsert('action_types', item)
  return { item }
}

// ---------- 工具 ----------
export function formatInvestAmount(v) {
  if (v == null) return '-'
  const n = Number(v)
  if (n >= 10000) return (n / 10000).toFixed(2).replace(/\.00$/, '') + '亿'
  return n.toLocaleString() + '万'
}

/** 归一化董监高结构，兼容旧版 supervisor 字符串 → supervisors 数组 */
function normalizeDirectors(d) {
  if (!d || typeof d !== 'object') {
    return { generalManager: '', chairman: '', supervisors: [], boardMembers: [] }
  }
  const out = {
    generalManager: d.generalManager || '',
    chairman: d.chairman || '',
    supervisors: Array.isArray(d.supervisors) ? d.supervisors.filter(Boolean) : [],
    boardMembers: Array.isArray(d.boardMembers) ? d.boardMembers.filter(Boolean) : [],
  }
  // 兼容旧数据：supervisor 字符串（可能是顿号/逗号分隔的多值）
  if (d.supervisor && out.supervisors.length === 0) {
    out.supervisors = String(d.supervisor).split(/[、,，;；]/).map((s) => s.trim()).filter(Boolean)
  }
  return out
}

// 季度末日期（YYYY-MM-DD）
function quarterEndDate(year, quarter) {
  const m = quarter * 3
  const lastDay = new Date(year, m, 0).getDate()
  return `${year}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
}

function sortByPeriodDesc(list) {
  return [...list].sort((a, b) => b.period.localeCompare(a.period))
}

function sortByDateDesc(list) {
  return [...list].sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf())
}

// ---------- 项目 CRUD ----------
/**
 * 创建项目
 * data: {
 *   name, industry, tags, teamSize, website, description,
 *   investAmount, investType, investDate, investors,
 *   clauses, investHistory, postInvestment, attachments
 * }
 */
export async function createProject(data) {
  const id = uuidv4()
  const now = dayjs().format('YYYY-MM-DD')
  const project = {
    id,
    name: data.name || '未命名项目',
    industry: data.industry || '其他',
    tags: data.tags || [],
    investDate: data.investDate || now,
    investAmount: data.investAmount || 0,
    investAmountDisplay: formatInvestAmount(data.investAmount || 0),
    investType: data.investType || '股权',
    investors: (data.investors && data.investors.length ? data.investors : [{ name: '我方基金', ratio: 100 }]).map((x) => ({
      name: x.name || '我方基金',
      ratio: Number(x.ratio) || 0,
    })),
    status: 'normal',
    clauses: data.clauses || {},
    description: data.description || '',
    teamSize: data.teamSize || '',
    website: data.website || '',
    contactPerson: data.contactPerson || '',
    contactPhone: data.contactPhone || '',
    round: data.round || '',
    valuation: Number(data.valuation) || 0,
    directors: normalizeDirectors(data.directors),
    attachments: data.attachments || [],
    createdAt: now,
  }

  // 投资历程 / 投后信息 → 时间轴事件
  const timelineEvents = []
  ;(data.investHistory || [])
    .filter((x) => x.status === 'done')
    .forEach((x) => {
      timelineEvents.push({
        id: uuidv4(),
        date: x.date,
        type: 'invest',
        typeLabel: '投资历程',
        title: x.title || '投资历程',
        description: '创建项目时由投资历程自动生成',
        operator: '系统',
        attachments: [],
      })
    })
  ;(data.postInvestment || [])
    .filter((x) => x.status === 'done')
    .forEach((x) => {
      timelineEvents.push({
        id: uuidv4(),
        date: x.date,
        type: 'other',
        typeLabel: '投后动作',
        title: x.title || '投后动作',
        description: '创建项目时由投后信息自动生成',
        operator: '系统',
        attachments: [],
      })
    })

  const equitySeed = generateEquitySeed(project)
  commit({
    ...state,
    projects: [project, ...state.projects],
    finance: { ...state.finance, [id]: [] },
    timelines: { ...state.timelines, [id]: sortByDateDesc(timelineEvents) },
    highlights: { ...state.highlights, [id]: [] },
    equity: { ...state.equity, [id]: equitySeed },
  })
  logAction('创建项目', project.name, `行业：${project.industry}，投资金额：${project.investAmountDisplay}`)

  // 云端同步：项目表 + 股权种子 + 时间轴，逐项返回错误（不再静默吞掉）
  let syncError = null
  const d = db()
  if (d) {
    syncError = await cloudUpsert('projects', project)
    if (!syncError) {
      const eq = equitySeed.map((e) => ({ ...e, projectId: id }))
      syncError = await cloudSafe('upsert equity', async () => {
        const { error } = await d.from('equity').upsert(eq)
        if (error) throw new Error(error.message || JSON.stringify(error))
      })
    }
    if (!syncError && timelineEvents.length) {
      const rows = timelineEvents.map((e) => ({ ...e, projectId: id }))
      syncError = await cloudSafe('upsert timelines', async () => {
        const { error } = await d.from('timelines').upsert(rows)
        if (error) throw new Error(error.message || JSON.stringify(error))
      })
    }
  }
  return { project, syncError: syncError ? (syncError.message || String(syncError)) : null }
}

/**
 * 批量导入项目（Excel 导入用）
 * rows: [{ companyName, industry, investmentDate, investmentAmount, shares, valuation, round, contactPerson, contactPhone, notes }]
 * 返回成功导入的数量
 */
export async function addProjects(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return { added: 0, updated: 0, syncError: null }
  const now = dayjs().format('YYYY-MM-DD')

  let projects = [...state.projects]
  const newFinance = { ...state.finance }
  const newTimelines = { ...state.timelines }
  const newHighlights = { ...state.highlights }
  const newEquity = { ...state.equity }

  let added = 0
  let updated = 0
  const syncProjects = [] // 新增 + 覆盖的项目行，统一 upsert 到云端
  const syncIds = [] // 所有导入项目 id（需同步财务/股权/时间轴数据）

  // 模板「投后情况」→ 时间轴事件（投后沟通记录）
  const buildPostEvents = (r) => {
    const post = r.postInvestment || {}
    const events = []
    const rawDate = String(post.lastContactDate || '').trim()
    // 从「2026年8月4日（…股东会）」等文本中提取标准日期 YYYY-MM-DD，无法提取则回退投资日期
    let date = ''
    let remark = ''
    let m = rawDate.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
    if (m) {
      date = `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
    } else {
      m = rawDate.match(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})?\s*日?/)
      if (m) date = `${m[1]}-${m[2].padStart(2, '0')}-${(m[3] || '01').padStart(2, '0')}`
    }
    // 提取括号备注（如「（…股东会）」）
    const rm = rawDate.match(/[（(]\s*([^）)]*)\s*[）)]/)
    if (rm) remark = rm[1].trim()
    if (!date && rawDate) date = r.investmentDate || now
    if (date) {
      const desc = [
        post.highlights ? `项目亮点：${post.highlights}` : '',
        post.risks ? `风险提示：${post.risks}` : '',
        post.nextSteps ? `后续计划：${post.nextSteps}` : '',
        post.notes ? `备注：${post.notes}` : '',
        remark ? `沟通事项：${remark}` : '',
      ].filter(Boolean).join('\n')
      events.push({
        id: uuidv4(),
        date,
        type: 'other',
        typeLabel: '投后动作',
        title: `投后沟通记录（${date}）`,
        description: desc || '最近一次投后沟通',
        operator: post.contactPerson || state.session?.userName || '投后经理',
        attachments: [],
      })
    }
    return events
  }

  rows.forEach((r) => {
    const name = (r.name || r.companyName || '未命名项目').trim()
    const investAmount = Number(r.investmentAmount) || 0
    const shares = Number(r.shares) || 0
    // 股权结构：优先使用模板中的股东明细，否则回退为「我方基金」
    const investors = (r.investors && r.investors.length)
      ? r.investors
          .filter((x) => x && x.name)
          .map((x) => ({ name: x.name, ratio: Number(x.ratio) || 0 }))
      : [{ name: '我方基金', ratio: shares || 100 }]
    // 财务数据（已由 parseFinance 转为 store 标准字段，按期间倒序）
    const finance = (r.finance && r.finance.length)
      ? [...r.finance].sort((a, b) => String(b.period).localeCompare(String(a.period)))
      : []
    // 投后情况 → 时间轴事件
    const postEvents = buildPostEvents(r)

    // 同名项目 → 覆盖更新，复用原 id，避免重复
    const existing = projects.find((p) => (p.name || '').trim() === name)

    if (existing) {
      const merged = {
        ...existing,
        name,
        industry: r.industry || existing.industry,
        investDate: r.investmentDate || existing.investDate,
        investAmount,
        investAmountDisplay: formatInvestAmount(investAmount),
        investType: r.investType || existing.investType,
        investors,
        status: r.status || existing.status,
        clauses: r.clauses || existing.clauses,
        description: r.description || r.notes || existing.description,
        teamSize: r.teamSize || existing.teamSize,
        contactPerson: r.contactPerson || existing.contactPerson,
        contactPhone: r.contactPhone || existing.contactPhone,
        round: r.round || existing.round,
        valuation: Number(r.valuation) || existing.valuation || 0,
        directors: normalizeDirectors(r.directors || existing.directors),
        updatedAt: now,
      }
      projects = projects.map((p) => (p.id === existing.id ? merged : p))
      newFinance[existing.id] = finance.length ? finance : newFinance[existing.id]
      newEquity[existing.id] = generateEquitySeed(merged)
      if (postEvents.length) {
        const cur = newTimelines[existing.id] || []
        const seen = new Set(cur.map((e) => `${e.date}|${e.title}`))
        const toAdd = postEvents.filter((e) => !seen.has(`${e.date}|${e.title}`))
        newTimelines[existing.id] = sortByDateDesc([...cur, ...toAdd])
      }
      syncProjects.push(merged)
      syncIds.push(existing.id)
      updated++
    } else {
      const id = uuidv4()
      const project = {
        id,
        name,
        industry: r.industry || '其他',
        tags: [],
        investDate: r.investmentDate || now,
        investAmount,
        investAmountDisplay: formatInvestAmount(investAmount),
        investType: r.investType || '股权',
        investors,
        status: r.status || 'normal',
        clauses: r.clauses || {},
        description: r.description || r.notes || '',
        teamSize: r.teamSize || '',
        website: '',
        contactPerson: r.contactPerson || '',
        contactPhone: r.contactPhone || '',
        round: r.round || '',
        valuation: Number(r.valuation) || 0,
        directors: normalizeDirectors(r.directors),
        attachments: [],
        createdAt: now,
        imported: true,
      }
      projects = [project, ...projects]
      newFinance[id] = finance
      newTimelines[id] = sortByDateDesc(postEvents)
      newHighlights[id] = []
      newEquity[id] = generateEquitySeed(project)
      syncProjects.push(project)
      syncIds.push(id)
      added++
    }
  })

  commit({
    ...state,
    projects,
    finance: newFinance,
    timelines: newTimelines,
    highlights: newHighlights,
    equity: newEquity,
  })

  logAction('批量导入', `共处理 ${rows.length} 个项目`, updated > 0 ? `新增 ${added} 个，覆盖 ${updated} 个同名项目` : `新增 ${added} 个`)

  // 云端同步：项目表 upsert
  let syncError = null
  const d = db()
  if (d && syncProjects.length) {
    syncError = await cloudSafe('upsert imported projects', async () => {
      const { error } = await d.from('projects').upsert(syncProjects)
      if (error) throw new Error(error.message || JSON.stringify(error))
    })
  }
  // 财务 / 股权 / 时间轴 全部先删后插同步（新增项目此前缺失，导致刷新后财务数据消失）
  if (d && syncIds.length && !syncError) {
    syncError = await cloudSafe('sync imported finance/equity/timeline', async () => {
      for (const pid of syncIds) {
        await d.from('finance').delete().eq('projectId', pid)
        const frows = (newFinance[pid] || []).map((f) => ({ id: uuidv4(), ...f, projectId: pid }))
        if (frows.length) await d.from('finance').upsert(frows, { onConflict: 'projectId,period' })

        await d.from('equity').delete().eq('projectId', pid)
        const erows = (newEquity[pid] || []).map((e) => ({ ...e, projectId: pid }))
        if (erows.length) await d.from('equity').upsert(erows)

        await d.from('timelines').delete().eq('projectId', pid)
        const trows = (newTimelines[pid] || []).map((t) => ({ ...t, projectId: pid }))
        if (trows.length) await d.from('timelines').upsert(trows)
      }
    })
  }

  return { added, updated, syncError: syncError ? (syncError.message || String(syncError)) : null }
}

/** 更新项目基本信息与投资条款（含董监高、联系人、电话、轮次、估值） */
export async function updateProject(id, data) {
  const old = state.projects.find((p) => p.id === id)
  if (!old) return { project: null, syncError: '项目不存在' }
  const next = {
    ...old,
    name: data.name !== undefined ? data.name : old.name,
    industry: data.industry !== undefined ? data.industry : old.industry,
    tags: data.tags !== undefined ? data.tags : old.tags,
    investDate: data.investDate !== undefined ? data.investDate : old.investDate,
    investAmount: data.investAmount !== undefined ? data.investAmount : old.investAmount,
    investAmountDisplay: data.investAmount !== undefined ? formatInvestAmount(data.investAmount) : old.investAmountDisplay,
    investType: data.investType !== undefined ? data.investType : old.investType,
    investors: data.investors !== undefined
      ? (data.investors.length ? data.investors : [{ name: '我方基金', ratio: 100 }]).map((x) => ({
          name: x.name || '我方基金',
          ratio: Number(x.ratio) || 0,
        }))
      : old.investors,
    status: data.status !== undefined ? data.status : old.status,
    clauses: data.clauses !== undefined ? data.clauses : old.clauses,
    description: data.description !== undefined ? data.description : old.description,
    teamSize: data.teamSize !== undefined ? data.teamSize : old.teamSize,
    website: data.website !== undefined ? data.website : old.website,
    contactPerson: data.contactPerson !== undefined ? data.contactPerson : old.contactPerson,
    contactPhone: data.contactPhone !== undefined ? data.contactPhone : old.contactPhone,
    round: data.round !== undefined ? data.round : old.round,
    valuation: data.valuation !== undefined ? (Number(data.valuation) || 0) : old.valuation,
    directors: normalizeDirectors(data.directors !== undefined ? data.directors : old.directors),
    updatedAt: dayjs().format('YYYY-MM-DD'),
  }
  commit({
    ...state,
    projects: state.projects.map((p) => (p.id === id ? next : p)),
  })
  logAction('编辑项目', next.name, '更新了项目基本信息与投资条款')
  const syncError = await cloudUpsert('projects', next)
  return { project: next, syncError: syncError ? (syncError.message || String(syncError)) : null }
}

// ---------- 财务数据 ----------
/** 添加 / 覆盖一条财报数据（同 period 覆盖） */
export function addFinanceData(projectId, data) {
  const list = state.finance[projectId] || []
  // finance 表 id 必填无默认值：同期间覆盖时复用原 id，新增时生成新 id，确保云端 upsert 成功
  const existing = list.find((x) => x.period === data.period)
  const item = {
    id: existing?.id || uuidv4(),
    period: data.period,
    year: Number(data.year),
    quarter: Number(data.quarter),
    revenue: Number(data.revenue) || 0,
    grossProfit: Number(data.grossProfit) || 0,
    netProfit: Number(data.netProfit) || 0,
    debtRatio: Number(data.debtRatio) || 0,
    operatingCashFlow: Number(data.operatingCashFlow) || 0,
  }
  const filtered = list.filter((x) => x.period !== item.period)
  const nextList = sortByPeriodDesc([...filtered, item])
  commit({
    ...state,
    finance: { ...state.finance, [projectId]: nextList },
  })
  // 数据变化后自动刷新亮点
  refreshHighlights(projectId)
  logAction('上传财报', `${projectId} · ${item.period}`, `营收 ${item.revenue} 万，净利 ${item.netProfit} 万`)
  cloudUpsert('finance', { ...item, projectId }, 'projectId,period')
  return item
}

/** 删除一条财报数据 */
export function removeFinanceData(projectId, period) {
  commit({
    ...state,
    finance: {
      ...state.finance,
      [projectId]: (state.finance[projectId] || []).filter((x) => x.period !== period),
    },
  })
  refreshHighlights(projectId)
  logAction('删除财报', `${projectId} · ${period}`, '删除了一条财报数据')
  const d = db()
  if (d) cloudSafe('delete finance', async () => {
    const { error } = await d.from('finance').delete().eq('projectId', projectId).eq('period', period)
    if (error) console.warn('[cloudSync] delete finance error:', error)
  })
}

// ---------- 时间轴 ----------
export function addTimelineEvent(projectId, data) {
  const item = {
    id: uuidv4(),
    date: data.date,
    type: data.type || 'other',
    typeLabel: data.typeLabel || '其他',
    title: data.title,
    description: data.description || '',
    operator: data.operator || '王经理',
    attachments: data.attachments || [],
  }
  const list = state.timelines[projectId] || []
  commit({
    ...state,
    timelines: { ...state.timelines, [projectId]: sortByDateDesc([...list, item]) },
  })
  logAction('添加时间轴', `${projectId} · ${item.title}`, `类型：${item.typeLabel}，日期：${item.date}`)
  cloudUpsert('timelines', { ...item, projectId })
  return item
}

// ---------- 股权结构 ----------
/** 获取项目股权变更时间线（按日期倒序，最新在前） */
export function getEquityHistory(projectId) {
  return (state.equity[projectId] || []).slice().sort((a, b) => (a.date < b.date ? 1 : -1))
}

/** 新增一轮融资/股权变更记录 */
export function addEquityEvent(projectId, data) {
  const item = {
    id: uuidv4(),
    date: data.date,
    round: data.round || '新轮次',
    title: data.title || `${data.round || '新轮次'}融资`,
    description: data.description || '',
    shareholders: (data.shareholders || []).map((s) => ({ name: s.name || '未命名', ratio: Number(s.ratio) || 0 })),
    operator: state.session?.userName || '王经理',
    createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
  }
  commit({
    ...state,
    equity: {
      ...state.equity,
      [projectId]: [...(state.equity[projectId] || []), item],
    },
  })
  logAction('新增股权记录', `${projectId} · ${item.round}`, `轮次：${item.round}，日期：${item.date}`)
  cloudUpsert('equity', { ...item, projectId })
  return item
}

/** 删除一轮股权变更记录 */
export function deleteEquityEvent(projectId, eventId) {
  const list = state.equity[projectId] || []
  const target = list.find((e) => e.id === eventId)
  commit({
    ...state,
    equity: {
      ...state.equity,
      [projectId]: list.filter((e) => e.id !== eventId),
    },
  })
  if (target) logAction('删除股权记录', `${projectId} · ${target.round}`, `轮次：${target.round}，日期：${target.date}`)
  cloudDelete('equity', eventId)
}

// ---------- 待办 ----------
export function completeTodo(todoId, remark) {
  const target = state.todos.find((t) => t.id === todoId)
  const updated = state.todos.map((t) =>
    t.id === todoId
      ? { ...t, status: 'done', doneAt: dayjs().format('YYYY-MM-DD HH:mm'), remark: remark || '' }
      : t
  )
  commit({ ...state, todos: updated })
  if (target) logAction('完成待办', target.title, `项目：${target.projectName}`)
  const next = updated.find((t) => t.id === todoId)
  if (next) cloudUpsert('todos', next)
}

export function addTodo(data) {
  const todo = {
    id: uuidv4(),
    projectId: data.projectId,
    projectName: data.projectName,
    title: data.title,
    type: data.type || 'other',
    typeLabel: data.typeLabel || '其他',
    dueDate: data.dueDate,
    priority: data.priority || 'medium',
    status: 'pending',
    desc: data.desc || '',
    attachment: data.attachment || '',
  }
  commit({ ...state, todos: [...state.todos, todo] })
  cloudUpsert('todos', todo)
  return todo
}

/** 编辑待办（项目/类型/标题/详情/截止/优先级），同步云端 */
export function updateTodo(todoId, data) {
  const target = state.todos.find((t) => t.id === todoId)
  if (!target) return null
  const next = {
    ...target,
    projectId: data.projectId !== undefined ? data.projectId : target.projectId,
    projectName: data.projectName !== undefined ? data.projectName : target.projectName,
    title: data.title !== undefined ? data.title : target.title,
    type: data.type !== undefined ? data.type : target.type,
    typeLabel: data.typeLabel !== undefined ? data.typeLabel : target.typeLabel,
    dueDate: data.dueDate !== undefined ? data.dueDate : target.dueDate,
    priority: data.priority !== undefined ? data.priority : target.priority,
    desc: data.desc !== undefined ? data.desc : target.desc,
    updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
  }
  commit({ ...state, todos: state.todos.map((t) => (t.id === todoId ? next : t)) })
  logAction('编辑待办', next.title, `项目：${next.projectName}`)
  cloudUpsert('todos', next)
  return next
}

/**
 * 待办自动化引擎：为所有项目生成当前季度财报上传 + 问询邮件待办
 * 幂等：已存在同类待办则不重复生成。返回新增数量。
 */
export function generateAutoTodos() {
  const now = dayjs()
  const year = now.year()
  const quarter = Math.floor(now.month() / 3) + 1
  const period = `${year}Q${quarter}`
  const due = quarterEndDate(year, quarter)
  const created = []

  state.projects.forEach((p) => {
    const hasReport = state.todos.some(
      (t) => t.projectId === p.id && t.type === 'report' && t.status !== 'done' && (t.title || '').includes(period)
    )
    if (!hasReport) {
      created.push({
        id: uuidv4(),
        projectId: p.id,
        projectName: p.name,
        title: `上传${period}财务报告`,
        type: 'report',
        typeLabel: '财报上传',
        dueDate: due,
        priority: 'high',
        status: 'pending',
        desc: `请于截止日期前上传被投企业${period}财报PDF/Excel，并完成核心数据录入。`,
        auto: true,
      })
    }
    const hasInquiry = state.todos.some(
      (t) => t.projectId === p.id && t.type === 'inquiry' && t.status !== 'done'
    )
    if (!hasInquiry) {
      created.push({
        id: uuidv4(),
        projectId: p.id,
        projectName: p.name,
        title: `发送${period}经营问询邮件`,
        type: 'inquiry',
        typeLabel: '问询发送',
        dueDate: due,
        priority: 'medium',
        status: 'pending',
        desc: '系统已生成问询邮件草稿（见附件），请下载后通过外部邮箱发送。',
        attachment: `${p.name}_${period}问询函草稿.docx`,
        auto: true,
      })
    }
  })

  if (created.length) {
    commit({ ...state, todos: [...state.todos, ...created] })
    logAction('生成合规任务', `共 ${created.length} 条`, `自动生成财报上传与经营问询待办`)
    const d = db()
    if (d) cloudSafe('upsert auto todos', async () => {
      const { error } = await d.from('todos').upsert(created)
      if (error) console.warn('[cloudSync] upsert auto todos error:', error)
    })
  }
  return created.length
}

// ---------- 数据亮点 ----------
/** 基于财务数据生成亮点 */
export function generateHighlightsFor(financeData) {
  const yearly = getYearlyFinance(financeData)
  const out = []
  if (yearly.length >= 2) {
    const first = yearly[0]
    const last = yearly[yearly.length - 1]
    // 1. 营收趋势
    if (first.revenue > 0 && last.revenue > 0) {
      const cagr = Math.pow(last.revenue / first.revenue, 1 / (yearly.length - 1)) - 1
      if (cagr >= 0.05) {
        out.push({
          chart: 'revenue',
          text: `营收连续${yearly.length}年增长，CAGR达${(cagr * 100).toFixed(1)}%`,
          tone: 'positive',
        })
      } else if (cagr <= -0.05) {
        out.push({
          chart: 'revenue',
          text: `营收承压，CAGR为${(cagr * 100).toFixed(1)}%，需关注增长`,
          tone: 'negative',
        })
      } else {
        out.push({
          chart: 'revenue',
          text: `营收保持平稳，近${yearly.length}年CAGR约${(cagr * 100).toFixed(1)}%`,
          tone: 'neutral',
        })
      }
    }
    // 2. 盈利能力 + 偿债能力（净利率 / 资产负债率）
    if (last.netMargin !== undefined && first.netMargin !== undefined) {
      const d = (last.netMargin - first.netMargin) * 100
      if (d > 2) {
        out.push({
          chart: 'profit',
          text: `净利润率由${(first.netMargin * 100).toFixed(1)}%升至${(last.netMargin * 100).toFixed(1)}%，盈利能力增强`,
          tone: 'positive',
        })
      } else if (d < -2) {
        out.push({
          chart: 'profit',
          text: `净利润率由${(first.netMargin * 100).toFixed(1)}%降至${(last.netMargin * 100).toFixed(1)}%，关注成本控制`,
          tone: 'negative',
        })
      }
    }
    if (last.debtRatio !== undefined && first.debtRatio !== undefined) {
      const d = (last.debtRatio - first.debtRatio) * 100
      if (d <= -3) {
        out.push({
          chart: 'profit',
          text: `资产负债率由${(first.debtRatio * 100).toFixed(0)}%降至${(last.debtRatio * 100).toFixed(0)}%，财务结构优化`,
          tone: 'positive',
        })
      } else if (d >= 5) {
        out.push({
          chart: 'profit',
          text: `资产负债率升至${(last.debtRatio * 100).toFixed(0)}%，关注偿债能力`,
          tone: 'negative',
        })
      }
    }
    // 3. 经营现金流（季度）
    if (financeData.length >= 2) {
      const cfs = financeData.map((x) => x.operatingCashFlow)
      const allPositive = cfs.every((v) => v > 0)
      const growing = cfs[cfs.length - 1] > cfs[0]
      if (allPositive) {
        out.push({
          chart: 'cashflow',
          text: `经营现金流连续${cfs.length}期为正${growing ? '，且呈增长态势' : ''}，造血能力良好`,
          tone: 'positive',
        })
      } else if (cfs[cfs.length - 1] < 0) {
        out.push({
          chart: 'cashflow',
          text: '最近一期经营现金流为负，关注资金链健康',
          tone: 'negative',
        })
      } else {
        out.push({
          chart: 'cashflow',
          text: '经营现金流波动，需持续跟踪回款情况',
          tone: 'neutral',
        })
      }
    }
  }
  return out
}

/** 为项目补齐亮点（自动生成部分），保留手动编辑/删除的结果 */
function refreshHighlights(projectId) {
  const finance = state.finance[projectId] || []
  const current = state.highlights[projectId] || []
  const manual = current.filter((h) => !h.auto) // 手动添加的保留
  const auto = generateHighlightsFor(finance).map((h) => ({ ...h, id: uuidv4(), auto: true }))
  const next = [...manual, ...auto]
  commit({
    ...state,
    highlights: { ...state.highlights, [projectId]: next },
  })
}

/** 在组件挂载时确保项目亮点已生成（供 useEffect 调用，避免渲染期写状态） */
export function ensureHighlights(projectId) {
  const list = state.highlights[projectId]
  if (list === undefined) {
    refreshHighlights(projectId)
  }
}

/** 获取项目亮点（纯读取） */
export function getHighlights(projectId) {
  return state.highlights[projectId] || []
}

/** 更新一条亮点 */
export function updateHighlight(projectId, hlId, text) {
  const next = (state.highlights[projectId] || []).map((h) => (h.id === hlId ? { ...h, text } : h))
  commit({
    ...state,
    highlights: { ...state.highlights, [projectId]: next },
  })
  logAction('编辑亮点', `${projectId}`, text)
  const row = next.find((h) => h.id === hlId)
  if (row) cloudUpsert('highlights', { ...row, projectId })
}

/** 删除一条亮点 */
export function deleteHighlight(projectId, hlId) {
  commit({
    ...state,
    highlights: {
      ...state.highlights,
      [projectId]: (state.highlights[projectId] || []).filter((h) => h.id !== hlId),
    },
  })
  logAction('删除亮点', `${projectId}`, '删除了AI智能亮点')
  cloudDelete('highlights', hlId)
}

/** 手动添加亮点 */
export function addHighlight(projectId, text) {
  const item = { id: uuidv4(), text, tone: 'neutral', chart: 'general', auto: false }
  commit({
    ...state,
    highlights: {
      ...state.highlights,
      [projectId]: [...(state.highlights[projectId] || []), item],
    },
  })
  logAction('添加亮点', `${projectId}`, text)
  cloudUpsert('highlights', { ...item, projectId })
  return item
}

/** 重置所有数据为种子数据（开发调试用） */
export function resetStore() {
  commit(buildSeed())
}

// ---------- 用户 / 员工库 ----------
export function getUsers() {
  return state.users || []
}

export function addUser(data) {
  const user = {
    id: uuidv4(),
    uid: data.uid || '', // Auth 账号 UID（管理员添加时由 createAuthUser 返回）
    name: data.name || '',
    email: data.email || '',
    role: data.role || 'post',
    phone: data.phone || '',
    department: data.department || '',
    status: data.status || 'active',
    password: data.password || '', // 注册时暂存，审核通过后由云函数创建 Auth 账号
    source: data.source || 'manual', // 'manual' | 'register'
    createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
  }
  commit({ ...state, users: [...(state.users || []), user] })
  logAction('添加用户', user.name, `角色：${ROLE_LABELS[user.role]}${user.source === 'register' ? '（注册申请）' : ''}`)
  cloudUpsert('users', user)
  return user
}

/**
 * 添加员工并同步创建 CloudBase Auth 登录账号（管理员在员工库直接开账号）
 * 成功后 users 表不保存明文密码，密码仅用于创建 Auth 账号
 */
export async function addUserWithAuth(data) {
  try {
    const app = (await import('../services/cloudbaseClient.js')).default()
    const result = await app.callFunction({
      name: 'createAuthUser',
      parse: true,
      data: {
        email: data.email,
        password: data.password,
        name: (data.email || '').split('@')[0] || 'user',
        nickName: data.name,
        phone: data.phone || '',
      },
    })
    const res = result?.result || {}
    if (res.code !== 0) {
      return { success: false, error: res.message || '创建登录账号失败' }
    }
    const uid = res.data?.uid || ''
    // 本地 + 云端保存（不存明文密码，密码由 Auth 账号管理）
    const user = addUser({ ...data, uid, password: '', source: 'manual' })
    return { success: true, user }
  } catch (e) {
    console.error('[addUserWithAuth] 添加员工失败:', e)
    return { success: false, error: e.message || '添加员工失败' }
  }
}

/** 获取待审核的注册申请 */
export function getPendingUsers() {
  return (state.users || []).filter((u) => u.status === 'pending')
}

/** 审核通过注册申请 - 调用云函数创建 Auth 账号 */
export async function approveUser(id) {
  const user = (state.users || []).find((u) => u.id === id)
  if (!user) return { error: '用户不存在' }
  if (user.status !== 'pending') return { error: '该用户不是待审核状态' }

  try {
    // 调用云函数创建 Auth 账号
    const app = (await import('../services/cloudbaseClient.js')).default()
    const result = await app.callFunction({
      name: 'createAuthUser',
      parse: true,
      data: {
        email: user.email,
        password: user.password,
        name: user.email.split('@')[0],
        nickName: user.name,
        phone: user.phone,
      },
    })

    const res = result?.result || {}
    if (res.code !== 0) {
      return { error: res.message || '创建 Auth 账号失败' }
    }

    const uid = res.data?.uid

    // 更新用户状态为 active，记录 uid
    const next = (state.users || []).map((u) =>
      u.id === id
        ? { ...u, status: 'active', uid, password: '', updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss') }
        : u
    )
    commit({ ...state, users: next })
    logAction('审核通过', user.name, `注册申请已通过，Auth UID: ${uid}`)
    const row = next.find((u) => u.id === id)
    if (row) cloudUpsert('users', row)
    return { success: true }
  } catch (e) {
    console.error('[approveUser] 审核失败:', e)
    return { error: e.message || '审核失败' }
  }
}

/** 驳回注册申请 */
export function rejectUser(id) {
  const user = (state.users || []).find((u) => u.id === id)
  if (!user) return { error: '用户不存在' }
  commit({
    ...state,
    users: (state.users || []).map((u) =>
      u.id === id ? { ...u, status: 'rejected', updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss') } : u
    ),
  })
  logAction('驳回申请', user.name, '注册申请已被驳回')
  cloudUpsert('users', { ...user, status: 'rejected' })
  return { success: true }
}

export async function updateUser(id, data) {
  const target = (state.users || []).find((u) => u.id === id)
  const next = (state.users || []).map((u) =>
    u.id === id ? { ...u, ...data, updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss') } : u
  )
  commit({ ...state, users: next })
  logAction('编辑用户', data.name || id, `角色：${ROLE_LABELS[data.role] || ''}`)
  const row = next.find((u) => u.id === id)
  if (row) cloudUpsert('users', row)

  // 若管理员重置了密码，同步更新 Auth 账号密码
  if (data.password && target?.uid) {
    try {
      const app = (await import('../services/cloudbaseClient.js')).default()
      const result = await app.callFunction({
        name: 'updateAuthPassword',
        parse: true,
        data: { uid: target.uid, password: data.password },
      })
      const res = result?.result || {}
      if (res.code !== 0) {
        console.warn('[updateUser] 更新 Auth 密码失败:', res.message)
      }
    } catch (e) {
      console.warn('[updateUser] 更新 Auth 密码异常:', e?.message || e)
    }
  }
  return row
}

export function deleteUser(id) {
  const target = (state.users || []).find((u) => u.id === id)
  commit({ ...state, users: (state.users || []).filter((u) => u.id !== id) })
  if (target) logAction('删除用户', target.name, `角色：${ROLE_LABELS[target.role]}`)
  cloudDelete('users', id)
}

// ---------- 项目删除 ----------
export async function deleteProject(id) {
  const target = state.projects.find((p) => p.id === id)
  if (!target) return { ok: false, syncError: '项目不存在' }
  const nextFinance = { ...state.finance }
  const nextTimelines = { ...state.timelines }
  const nextHighlights = { ...state.highlights }
  const nextEquity = { ...state.equity }
  delete nextFinance[id]
  delete nextTimelines[id]
  delete nextHighlights[id]
  delete nextEquity[id]
  commit({
    ...state,
    projects: state.projects.filter((p) => p.id !== id),
    todos: state.todos.filter((t) => t.projectId !== id),
    finance: nextFinance,
    timelines: nextTimelines,
    highlights: nextHighlights,
    equity: nextEquity,
  })
  logAction('删除项目', target.name, `行业：${target.industry}`)
  // 云端级联删除：财务 / 时间轴 / 亮点 / 股权 / 待办 + 项目本身，返回错误（不再静默吞掉）
  let syncError = null
  const d = db()
  if (d) {
    syncError = await cloudSafe('delete project & relations', async () => {
      await d.from('finance').delete().eq('projectId', id)
      await d.from('timelines').delete().eq('projectId', id)
      await d.from('highlights').delete().eq('projectId', id)
      await d.from('equity').delete().eq('projectId', id)
      await d.from('todos').delete().eq('projectId', id)
      const { error } = await d.from('projects').delete().eq('id', id)
      if (error) throw new Error(error.message || JSON.stringify(error))
    })
  }
  return { ok: true, syncError: syncError ? (syncError.message || String(syncError)) : null }
}

// ============================================================
// 云端同步层（CloudBase PostgreSQL）
// ============================================================
// 设计原则：
// - 不改变任何同步 API 签名，业务组件零改动
// - 登录后调 syncFromCloud() 全量拉取覆盖本地 state
// - 每个写操作在 commit() 后异步 upsert/delete 到 PG
// - 同步失败仅 console.warn，不阻塞 UI（本地数据仍有效）
let _cloudReady = false

/** 标记云端已就绪（登录成功后调用） */
export function setCloudReady(v) {
  _cloudReady = !!v
}

export function isCloudReady() {
  return _cloudReady
}

/** 安全获取 db（未登录或初始化失败时返回 null） */
function db() {
  if (!_cloudReady) return null
  try {
    return getDB()
  } catch {
    return null
  }
}

/** 执行云端操作，失败时记录错误并返回错误对象（不再静默吞掉） */
async function cloudSafe(label, fn) {
  try {
    await fn()
    return null
  } catch (e) {
    console.error(`[cloudSync] ${label} 失败:`, e?.message || e)
    return e
  }
}

/** upsert 单行到指定表，返回错误对象（成功为 null） */
async function cloudUpsert(table, row, onConflict) {
  const d = db()
  if (!d || !row) return null
  return cloudSafe(`upsert ${table}`, async () => {
    const { error } = await d.from(table).upsert(row, onConflict ? { onConflict } : undefined)
    if (error) throw new Error(error.message || JSON.stringify(error))
  })
}

/** 按 id 删除行，返回错误对象（成功为 null） */
async function cloudDelete(table, id) {
  const d = db()
  if (!d || !id) return null
  return cloudSafe(`delete ${table}`, async () => {
    const { error } = await d.from(table).delete().eq('id', id)
    if (error) throw new Error(error.message || JSON.stringify(error))
  })
}

/**
 * 登录成功后调用：从 PG 全量拉取数据覆盖本地 state。
 * 若 PG 为空（首次使用），自动上传当前本地种子数据。
 * 返回 true 表示成功。
 */
export async function syncFromCloud() {
  const d = getDB()
  if (!d) return false
  setCloudReady(true)

  const [projects, finance, timelines, todos, highlights, equity, users, auditLogs, financeSummary, actionTypes] =
    await Promise.all([
      d.from('projects').select('*'),
      d.from('finance').select('*'),
      d.from('timelines').select('*'),
      d.from('todos').select('*'),
      d.from('highlights').select('*'),
      d.from('equity').select('*'),
      d.from('users').select('*'),
      d.from('audit_logs').select('*'),
      d.from('finance_summary').select('*'),
      d.from('action_types').select('*'),
    ])

  // 任意表报错都视为未就绪
  const anyError = [projects, finance, timelines, todos, highlights, equity, users, auditLogs, financeSummary, actionTypes].some(
    (r) => r.error
  )
  if (anyError) {
    console.warn('[cloudSync] 拉取数据出错，保持本地状态', {
      projects: projects.error,
      finance: finance.error,
      timelines: timelines.error,
      todos: todos.error,
      highlights: highlights.error,
      equity: equity.error,
      users: users.error,
      auditLogs: auditLogs.error,
    })
    return false
  }

  const pList = projects.data || []
  // PG 为空 → 视为全新环境（或用户已手动清空数据），保持空状态，不再把本地缓存回灌云端
  if (pList.length === 0) {
    console.info('[cloudSync] 云端项目为空，保持空状态（不回灌本地数据）')
    commit({
      projects: [],
      finance: {},
      timelines: {},
      todos: [],
      highlights: {},
      equity: {},
      users: mergeUsers(users.data || [], state.users || []),
      auditLogs: auditLogs.data || [],
      financeSummary: financeSummary.data || [],
      customActionTypes: actionTypes.data || [],
      session: state.session,
    })
    return true
  }

  // 重建 state（结构与 buildSeed() 一致）
  const cloudUsers = users.data || []
  // 合并云端和本地用户：保留本地 pending 用户（尚未同步到云端），云端已存在的用云端数据
  const localUsers = state.users || []
  const mergedUsers = mergeUsers(cloudUsers, localUsers)

  const nextState = {
    projects: pList.map((p) => ({ ...p, directors: normalizeDirectors(p.directors) })),
    finance: groupBy(finance.data || [], 'projectId'),
    timelines: groupBy(timelines.data || [], 'projectId'),
    todos: todos.data || [],
    highlights: groupBy(highlights.data || [], 'projectId'),
    equity: groupBy(equity.data || [], 'projectId'),
    users: mergedUsers,
    auditLogs: auditLogs.data || [],
    financeSummary: financeSummary.data || [],
    customActionTypes: actionTypes.data || [],
    session: state.session, // 保留当前登录态
  }
  commit(nextState)
  console.info('[cloudSync] 已从云端同步', {
    projects: nextState.projects.length,
    finance: Object.keys(nextState.finance).length,
    todos: nextState.todos.length,
    users: nextState.users.length,
  })
  return true
}

/** 合并云端和本地用户列表 */
function mergeUsers(cloudUsers, localUsers) {
  const cloudMap = new Map()
  for (const u of cloudUsers) {
    cloudMap.set(u.id, u)
  }
  // 保留本地中 status 为 pending 或 rejected 且云端不存在的用户
  const merged = [...cloudUsers]
  for (const u of localUsers) {
    if ((u.status === 'pending' || u.status === 'rejected') && !cloudMap.has(u.id)) {
      merged.push(u)
    }
  }
  return merged
}

/** 将本地数据按某字段分组为 { [key]: row[] } */
function groupBy(rows, key) {
  const out = {}
  for (const r of rows) {
    const k = r[key]
    if (!out[k]) out[k] = []
    out[k].push(r)
  }
  return out
}

/** 首次使用：把本地种子数据批量上传到 PG */
async function seedCloudFromLocal() {
  const d = getDB()
  if (!d) return
  await cloudSafe('seed projects', async () => {
    const { error } = await d.from('projects').upsert(state.projects)
    if (error) console.warn('[seed] projects', error)
  })
  // finance / timelines / highlights / equity 是按 projectId 分组的对象，展开时补齐 projectId
  const flatWithProjectId = (obj) =>
    Object.entries(obj || {}).flatMap(([projectId, rows]) =>
      (rows || []).map((r) => ({ ...r, projectId }))
    )
  await cloudSafe('seed finance', async () => {
    const frows = flatWithProjectId(state.finance).map((f) => ({ id: uuidv4(), ...f }))
    const { error } = await d.from('finance').upsert(frows, { onConflict: 'projectId,period' })
    if (error) console.warn('[seed] finance', error)
  })
  await cloudSafe('seed timelines', async () => {
    const { error } = await d.from('timelines').upsert(flatWithProjectId(state.timelines))
    if (error) console.warn('[seed] timelines', error)
  })
  await cloudSafe('seed equity', async () => {
    const { error } = await d.from('equity').upsert(flatWithProjectId(state.equity))
    if (error) console.warn('[seed] equity', error)
  })
  await cloudSafe('seed todos', async () => {
    const { error } = await d.from('todos').upsert(state.todos)
    if (error) console.warn('[seed] todos', error)
  })
  await cloudSafe('seed users', async () => {
    if ((state.users || []).length === 0) return
    const { error } = await d.from('users').upsert(state.users)
    if (error) console.warn('[seed] users', error)
  })
  console.info('[cloudSync] 种子数据上传完成')
}

