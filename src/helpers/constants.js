/**
 * 常量定义
 */

// 应用名称
export const APP_NAME = '投后管理工作台'

// 路由路径
export const ROUTES = {
  LOGIN: '/login',
  IMPORT: '/import',
  DASHBOARD: '/dashboard',
  PROJECT_NEW: '/projects/new',
  PROJECT_CREATE: '/projects/create',
  PROJECT_DETAIL: '/projects/:id',
  PROJECT_EDIT: '/projects/:id/edit',
  PROJECT_FINANCE: '/projects/:id/finance',
  PROJECT_FINANCIAL: '/projects/:id/financial',
  FINANCE_SUMMARY: '/finance-summary',
  TASKS: '/tasks',
  STAFF: '/staff',
}

// 用户角色
export const USER_ROLES = {
  ADMIN: 'admin',
  POST: 'post',
  RISK: 'risk',
  FINANCE: 'finance',
}

// 项目状态
export const PROJECT_STATUS = {
  NORMAL: 'normal',
  WARNING: 'warning',
  DANGER: 'danger',
}

// 待办优先级
export const TODO_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
}

// 内置待办类型
export const BUILT_IN_ACTION_TYPES = [
  { value: 'board_meeting', label: '董事会会议' },
  { value: 'financial_review', label: '财务审查' },
  { value: 'contract_review', label: '合同审核' },
  { value: 'legal_review', label: '法务审核' },
  { value: 'risk_assessment', label: '风险评估' },
  { value: 'compliance_check', label: '合规检查' },
  { value: 'report_submission', label: '报告提交' },
  { value: 'other', label: '其他' },
]

// 投资条款类型
export const CLAUSE_TYPES = {
  REPURCHASE: 'repurchase',
  LIQUIDATION: 'liquidation',
  ANTI_DILUTION: 'antiDilution',
  TAG_ALONG: 'tagAlong',
  DRAG_ALONG: 'dragAlong',
  VETO: 'veto',
}

// 财务科目
export const FINANCE_SUBJECTS = {
  REVENUE: 'revenue',
  GROSS_PROFIT: 'grossProfit',
  NET_PROFIT: 'netProfit',
  DEBT_RATIO: 'debtRatio',
  OPERATING_CASH_FLOW: 'operatingCashFlow',
}
