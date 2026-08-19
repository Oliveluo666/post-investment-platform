import { saveAs } from 'file-saver'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  PageBreak,
  ImageRun,
} from 'docx'
import dayjs from 'dayjs'
import { getYearlyFinance } from '../data/mockData.js'
import { getState } from '../data/store.js'

/** 将 base64 dataURL 转为 ArrayBuffer（docx ImageRun 需要） */
function base64ToArrayBuffer(dataUrl) {
  const base64 = dataUrl.split(',')[1] || dataUrl
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

// 导出单个项目为 DOCX（优先使用 store 中的真实数据）
// charts: [{ title, dataUrl }]  —— 可将 ECharts getDataURL() 生成的 PNG 嵌入报告
export async function exportProjectToDocx(project, financeData, timeline, charts = []) {
  const state = getState()
  const financeDataList = financeData || state.finance[project?.id] || []
  const yearlyData = getYearlyFinance(financeDataList)
  const timelineList = timeline || state.timelines[project?.id] || []

  const border = {
    top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
    left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
    right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
  }

  const children = []

  // 标题
  children.push(
    new Paragraph({
      children: [new TextRun({ text: `${project.name} - 投后管理报告`, bold: true, size: 36, font: '微软雅黑' })],
      heading: HeadingLevel.TITLE,
      spacing: { after: 400 },
    })
  )

  children.push(
    new Paragraph({
      children: [new TextRun({ text: `报告生成时间：${dayjs().format('YYYY年M月D日 HH:mm')}`, size: 20, color: '888888' })],
      spacing: { after: 400 },
    })
  )

  // 第一部分：项目概览
  children.push(
    new Paragraph({
      children: [new TextRun({ text: '一、项目概览', bold: true, size: 28, font: '微软雅黑' })],
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 200, after: 200 },
    })
  )

  const infoRows = [
    ['项目名称', project.name],
    ['行业/赛道', project.industry],
    ['标签', project.tags?.join('、') || '-'],
    ['投资时间', project.investDate],
    ['投资金额', project.investAmountDisplay + '元'],
    ['投资方式', project.investType],
    ['融资轮次', project.round || '-'],
    ['估值', project.valuation ? Number(project.valuation).toLocaleString() + '万元' : '-'],
    ['联系人', project.contactPerson || '-'],
    ['联系电话', project.contactPhone || '-'],
    ['团队规模', project.teamSize || '-'],
    ['公司网站', project.website || '-'],
  ]

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: infoRows.map(
        ([k, v]) =>
          new TableRow({
            children: [
              new TableCell({
                width: { size: 25, type: WidthType.PERCENTAGE },
                borders: border,
                shading: { fill: 'F5F5F5' },
                children: [new Paragraph({ children: [new TextRun({ text: k, bold: true, size: 21, font: '微软雅黑' })] })],
              }),
              new TableCell({
                width: { size: 75, type: WidthType.PERCENTAGE },
                borders: border,
                children: [new Paragraph({ children: [new TextRun({ text: String(v || '-'), size: 21, font: '微软雅黑' })] })],
              }),
            ],
          })
      ),
    })
  )

  // 投资方
  if (project.investors?.length) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: '投资方及占股比例：', bold: true, size: 21, font: '微软雅黑' })],
        spacing: { before: 200 },
      })
    )
    project.investors.forEach((inv) => {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: `  · ${inv.name}：${inv.ratio}%`, size: 21, font: '微软雅黑' })],
        })
      )
    })
  }

  // 董监高信息
  const directors = project.directors || {}
  const directorLines = []
  if (directors.chairman) directorLines.push(`董事长：${directors.chairman}`)
  if (directors.generalManager) directorLines.push(`总经理：${directors.generalManager}`)
  const supervisors = directors.supervisors?.length
    ? directors.supervisors
    : directors.supervisor
      ? String(directors.supervisor).split(/[、,，;；]/).map((s) => s.trim()).filter(Boolean)
      : []
  if (supervisors.length) directorLines.push(`监事：${supervisors.join('、')}`)
  if (directors.boardMembers?.length) directorLines.push(`董事会成员：${directors.boardMembers.join('、')}`)
  if (directorLines.length) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: '董监高信息：', bold: true, size: 21, font: '微软雅黑' })],
        spacing: { before: 200 },
      })
    )
    directorLines.forEach((line) => {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: `  · ${line}`, size: 21, font: '微软雅黑' })],
        })
      )
    })
  }

  // 项目介绍
  if (project.description) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: '项目简介：', bold: true, size: 21, font: '微软雅黑' })],
        spacing: { before: 200 },
      })
    )
    children.push(
      new Paragraph({
        children: [new TextRun({ text: project.description, size: 21, font: '微软雅黑' })],
      })
    )
  }

  // 投资条款
  children.push(new PageBreak())
  children.push(
    new Paragraph({
      children: [new TextRun({ text: '二、核心投资条款', bold: true, size: 28, font: '微软雅黑' })],
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 200, after: 200 },
    })
  )

  const clauseLabels = {
    repurchase: '回购条款',
    liquidation: '优先清算权',
    antiDilution: '反稀释条款',
    tagAlong: '随售权',
    dragAlong: '拖售权',
    veto: '一票否决权/保护性条款',
  }

  Object.entries(project.clauses || {}).forEach(([key, val]) => {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${clauseLabels[key] || key}：`, bold: true, size: 21, font: '微软雅黑' }),
          new TextRun({ text: val, size: 21, font: '微软雅黑' }),
        ],
        spacing: { after: 120 },
      })
    )
  })

  // 财务数据
  children.push(new PageBreak())
  children.push(
    new Paragraph({
      children: [new TextRun({ text: '三、核心财务数据（年度）', bold: true, size: 28, font: '微软雅黑' })],
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 200, after: 200 },
    })
  )

  const finHeader = new TableRow({
    children: ['年度', '营收(万元)', '毛利(万元)', '净利润(万元)', '净利率', '资产负债率', '经营现金流(万元)'].map(
      (h) =>
        new TableCell({
          borders: border,
          shading: { fill: 'E6F4FF' },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: h, bold: true, size: 20, font: '微软雅黑' })],
            }),
          ],
        })
    ),
  })

  const finRows = yearlyData.map(
    (y) =>
      new TableRow({
        children: [
          y.label,
          y.revenue.toLocaleString(),
          y.grossProfit.toLocaleString(),
          y.netProfit.toLocaleString(),
          Math.round(y.netMargin * 100) + '%',
          Math.round(y.debtRatio * 100) + '%',
          y.operatingCashFlow.toLocaleString(),
        ].map(
          (v) =>
            new TableCell({
              borders: border,
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: String(v), size: 20, font: '微软雅黑' })],
                }),
              ],
            })
        ),
      })
  )

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [finHeader, ...finRows],
    })
  )

  // 财务趋势图表（ECharts 截图嵌入）
  if (charts.length > 0) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: '财务趋势图表', bold: true, size: 24, font: '微软雅黑' })],
        spacing: { before: 300, after: 100 },
      })
    )
    charts.forEach((c) => {
      try {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: c.title || '趋势图', size: 20, bold: true, color: '555555', font: '微软雅黑' })],
            spacing: { before: 200, after: 80 },
          })
        )
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new ImageRun({
                type: 'png',
                data: base64ToArrayBuffer(c.dataUrl),
                transformation: { width: 560, height: 300 },
              }),
            ],
          })
        )
      } catch (e) {
        console.warn('图表嵌入失败：', e)
      }
    })
  }

  // 时间轴
  children.push(new PageBreak())
  children.push(
    new Paragraph({
      children: [new TextRun({ text: '四、投后管理时间轴', bold: true, size: 28, font: '微软雅黑' })],
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 200, after: 200 },
    })
  )

  timelineList.forEach((item) => {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `【${item.date}】${item.typeLabel} - ${item.title}`, bold: true, size: 22, font: '微软雅黑' }),
        ],
        spacing: { before: 160 },
      })
    )
    children.push(
      new Paragraph({
        children: [new TextRun({ text: item.description, size: 20, font: '微软雅黑' })],
        spacing: { after: 80 },
      })
    )
    children.push(
      new Paragraph({
        children: [new TextRun({ text: `操作人：${item.operator}`, size: 18, color: '888888', font: '微软雅黑' })],
        spacing: { after: 120 },
      })
    )
  })

  const doc = new Document({ sections: [{ properties: {}, children }] })
  const blob = await Packer.toBlob(doc)
  saveAs(blob, `${project.name}_投后管理报告_${dayjs().format('YYYYMMDD')}.docx`)
}

// 导出时间轴为TXT
export function exportTimelineToTxt(projectName, timeline, format = 'txt') {
  let content = `${projectName} - 投后管理时间轴记录\n`
  content += `导出时间：${dayjs().format('YYYY-MM-DD HH:mm:ss')}\n`
  content += `共 ${timeline.length} 条记录\n`
  content += '='.repeat(60) + '\n\n'

  const sorted = [...timeline].sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf())

  if (format === 'md') {
    content = `# ${projectName} - 投后管理时间轴\n\n`
    content += `> 导出时间：${dayjs().format('YYYY-MM-DD HH:mm:ss')}\n\n`
    sorted.forEach((item) => {
      content += `## 📅 ${item.date} · ${item.typeLabel}：${item.title}\n\n`
      content += `${item.description}\n\n`
      content += `*操作人：${item.operator}*\n\n---\n\n`
    })
  } else {
    sorted.forEach((item) => {
      content += `日期：${item.date}\n`
      content += `类型：${item.typeLabel}\n`
      content += `标题：${item.title}\n`
      content += `内容：${item.description}\n`
      content += `操作人：${item.operator}\n`
      content += '-'.repeat(50) + '\n'
    })
  }

  const blob = new Blob([content], { type: `text/${format};charset=utf-8` })
  saveAs(blob, `${projectName}_投后时间轴_${dayjs().format('YYYYMMDD')}.${format === 'md' ? 'md' : 'txt'}`)
}

// 导出问询函草稿（模拟）
export function exportInquiryDraft(project, period = 'Q2') {
  const today = dayjs().format('YYYY年M月D日')
  const content = `${project.name} ${dayjs().year()}年${period}经营问询函

致：${project.name}管理层
自：我方投后管理团队
日期：${today}
回复截止：${dayjs().add(7, 'day').format('YYYY年M月D日')}

尊敬的各位管理层：

根据投资协议约定及我司投后管理制度要求，现将${dayjs().year()}年${period}经营问询事项列明如下，请贵司于回复截止日前逐一反馈书面回复。

一、经营情况
1. 请说明本期核心经营数据（营收、订单、毛利、客户数等）及同比环比变化。
2. 请说明本期主要产品/服务的市场表现、竞争格局及公司竞争优势变化。
3. 请说明本期新增客户及流失客户情况，前五大客户是否发生变动。

二、财务表现
1. 请提供本期利润表、资产负债表、现金流量表（合并口径）。
2. 请说明毛利率、净利率、费用率变动的主要原因。
3. 请说明应收账款账龄、坏账计提及经营性现金流情况。

三、合规事项
1. 本期是否发生重大诉讼、仲裁、行政处罚事项？
2. 本期工商信息（股权、董监高、经营范围等）是否发生变更？
3. 是否发生关联交易、对外担保、重大资产处置等事项？

四、战略与资本
1. 本期战略推进情况（产品研发、市场拓展、团队建设等）。
2. 是否有新的融资或并购计划？
3. 下季度经营展望及可能面临的主要风险。

感谢贵司对投后管理工作的配合，如有疑问请随时与我司联系。

顺祝商祺！

我方投后管理团队
${today}
`
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  saveAs(blob, `${project.name}_${dayjs().year()}${period}_问询函草稿.txt`)
}
