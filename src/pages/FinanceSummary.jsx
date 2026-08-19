import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Tabs, Table, Select, Input, Button, Empty, Tag } from 'antd'
import { ArrowLeftOutlined, SearchOutlined } from '@ant-design/icons'
import { useStore } from '../data/store.js'

const SHEET_TABS = [
  { key: 'balance', label: '资产负债表' },
  { key: 'income', label: '利润表' },
  { key: 'cashflow', label: '现金流量表' },
  { key: 'equity', label: '权益变动表' },
]

const fmt = (v) => {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return '-'
  return Number(v).toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}

export default function FinanceSummary() {
  const navigate = useNavigate()
  const state = useStore()
  const [sheet, setSheet] = useState('income')
  const [companyFilter, setCompanyFilter] = useState([])
  const [keyword, setKeyword] = useState('')

  const summaryRows = state.financeSummary || []

  // 全部公司（按表内出现顺序）
  const allCompanies = useMemo(() => {
    const seen = []
    summaryRows.forEach((r) => {
      if (!seen.includes(r.company)) seen.push(r.company)
    })
    return seen
  }, [summaryRows])

  // 当前报表的公司行（company -> payload）
  const sheetRows = useMemo(() => summaryRows.filter((r) => r.sheet === sheet), [summaryRows, sheet])

  const visibleCompanies = useMemo(() => {
    const inSheet = allCompanies.filter((c) => sheetRows.some((r) => r.company === c))
    return companyFilter.length ? inSheet.filter((c) => companyFilter.includes(c)) : inSheet
  }, [allCompanies, sheetRows, companyFilter])

  // 期间表头（取第一家公司的期间定义）
  const periods = useMemo(() => sheetRows[0]?.payload?.periods || [], [sheetRows])

  // 行：科目去重（保持出现顺序）
  const items = useMemo(() => {
    const names = []
    const seen = new Set()
    sheetRows.forEach((r) => {
      ;(r.payload?.items || []).forEach((it) => {
        if (!seen.has(it.name)) {
          seen.add(it.name)
          names.push(it.name)
        }
      })
    })
    if (keyword.trim()) {
      const k = keyword.trim()
      return names.filter((n) => n.includes(k))
    }
    return names
  }, [sheetRows, keyword])

  // 公司 -> { itemName -> values }
  const valueMap = useMemo(() => {
    const m = new Map()
    sheetRows.forEach((r) => {
      const im = new Map()
      ;(r.payload?.items || []).forEach((it) => im.set(it.name, it.values))
      m.set(r.company, im)
    })
    return m
  }, [sheetRows])

  const columns = useMemo(() => {
    const cols = [
      {
        title: '科目',
        dataIndex: '_item',
        key: '_item',
        fixed: 'left',
        width: 200,
        render: (t) => <span className="text-[12px] font-medium text-slate-700">{t}</span>,
      },
    ]
    visibleCompanies.forEach((c) => {
      cols.push({
        title: c,
        key: c,
        children: periods.map((p, pi) => ({
          title: p,
          key: `${c}_${pi}`,
          width: 110,
          align: 'right',
          render: (_, row) => {
            const v = valueMap.get(c)?.get(row._item)?.[pi]
            return <span className="font-mono text-[12px] text-slate-600">{fmt(v)}</span>
          },
        })),
      })
    })
    return cols
  }, [visibleCompanies, periods, valueMap])

  const dataSource = useMemo(
    () => items.map((name, i) => ({ key: i, _item: name })),
    [items]
  )

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} className="!px-2" />
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-slate-900 m-0 leading-tight">
              KISP 财报汇总
              <Tag color="blue" className="!ml-2 !mr-0 align-middle">2021-2026</Tag>
            </h1>
            <p className="text-[12px] text-slate-500 mt-1">
              共 {allCompanies.length} 家公司 · 单位：万元 · 数据来源：KISP财报汇总_2021-2026
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Input
            allowClear
            prefix={<SearchOutlined className="text-slate-400" />}
            placeholder="搜索科目..."
            style={{ width: 180 }}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <Select
            mode="multiple"
            allowClear
            maxTagCount={2}
            placeholder="筛选公司（默认全部）"
            style={{ minWidth: 220 }}
            value={companyFilter}
            onChange={setCompanyFilter}
            options={allCompanies.map((c) => ({ value: c, label: c }))}
          />
        </div>
      </div>

      <Card size="small" styles={{ body: { padding: 0 } }}>
        <Tabs
          activeKey={sheet}
          onChange={setSheet}
          items={SHEET_TABS.map((t) => ({ key: t.key, label: t.label }))}
          className="!px-4 !pt-2"
        />
        {summaryRows.length === 0 ? (
          <div className="py-16">
            <Empty description="财报汇总数据未加载，请确认已登录并完成云端同步" />
          </div>
        ) : (
          <Table
            size="small"
            columns={columns}
            dataSource={dataSource}
            pagination={false}
            scroll={{ x: Math.max(1200, 200 + visibleCompanies.length * periods.length * 110), y: 560 }}
            tableLayout="fixed"
            className="finance-summary-table"
          />
        )}
      </Card>
    </div>
  )
}
