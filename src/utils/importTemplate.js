import * as XLSX from 'xlsx';

/**
 * 投后项目完整导入模板
 * 每个 Sheet 代表一个项目，包含完整信息
 */

/**
 * 解析上传的 Excel 文件（多 Sheet 格式）
 * 每个 Sheet 代表一个项目，包含基本信息、股权结构、财务数据、投资条款、投后情况
 */
export function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetNames = workbook.SheetNames.filter(n => n !== '使用说明');

        if (sheetNames.length === 0) {
          reject(new Error('Excel 文件中没有找到项目数据'));
          return;
        }

        const projects = [];

        sheetNames.forEach((sheetName) => {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          if (!jsonData || jsonData.length === 0) return;

          // 解析各模块数据
          const project = parseProjectSheet(jsonData, sheetName);
          if (project) {
            projects.push(project);
          }
        });

        resolve({ projects, total: projects.length });
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * 解析单个 Sheet 中的项目数据
 */
function parseProjectSheet(rows, sheetName) {
  const project = {
    name: sheetName,
    companyName: sheetName,
    industry: '',
    investmentDate: '',
    investmentAmount: '',
    shares: '',
    investType: '股权',
    valuation: '',
    description: '',
    teamSize: '',
    contactPerson: '',
    contactPhone: '',
    status: 'normal',
    investors: [],
    finance: [],
    clauses: {},
    postInvestment: {},
    directors: { generalManager: '', chairman: '', supervisors: [], boardMembers: [] },
  };

  // 字段名 → 目标字段映射（同时兼容「扁平模板」与「=== 模块标题 === 模板」两种格式）
  const numFields = { investmentAmount: true, shares: true, valuation: true };
  const basicMap = {
    '项目名称': 'name',
    '所属行业': 'industry',
    '投资日期': 'investmentDate',
    '投资金额(万元)': 'investmentAmount',
    '持股比例(%)': 'shares',
    '投资方式': 'investType',
    '投后估值(万元)': 'valuation',
    '项目简介': 'description',
    '团队规模': 'teamSize',
    '联系人': 'contactPerson',
    '联系电话': 'contactPhone',
    '项目状态': 'status',
  };
  const clauseMap = {
    '回购条款': 'repurchase',
    '优先清算权': 'liquidation',
    '反稀释条款': 'antiDilution',
    '随售权': 'tagAlong',
    '拖售权': 'dragAlong',
    '一票否决权': 'veto',
  };
  const postMap = {
    '投后联系人': 'contactPerson',
    '投后联系电话': 'contactPhone',
    '最近沟通日期': 'lastContactDate',
    '项目亮点': 'highlights',
    '风险提示': 'risks',
    '后续计划': 'nextSteps',
    '备注': 'notes',
  };
  // 董监高信息：总经理/董事长 各一人，监事/董事会成员可多行
  const directorMap = {
    '总经理': 'generalManager',
    '董事长': 'chairman',
  };

  let inEquity = false;
  let inFinance = false;
  let financeHeaders = [];

  rows.forEach((row) => {
    if (!row || row.length === 0) return;

    const cell0 = String(row[0] ?? '').trim();
    const cell1 = row[1] !== undefined ? String(row[1]).trim() : '';

    if (!cell0) return;

    // 模块标题行（兼容带 === 的模板）
    if (cell0.startsWith('===') && cell0.endsWith('===')) {
      inEquity = false;
      inFinance = false;
      return;
    }

    // 股权结构表头
    if (cell0 === '股东名称') {
      inEquity = true;
      inFinance = false;
      return;
    }

    // 财务数据表头
    if (cell0 === '年份' || cell0 === '期间') {
      inFinance = true;
      inEquity = false;
      financeHeaders = row.map((c) => String(c ?? '').trim());
      return;
    }

    // 基本信息字段
    if (Object.prototype.hasOwnProperty.call(basicMap, cell0)) {
      const field = basicMap[cell0];
      if (field === 'name') {
        project.name = cell1 || project.name; // 名称留空时回退 Sheet 名
        project.companyName = project.name;
      } else if (numFields[field]) {
        project[field] = cell1 === '' ? '' : parseFloat(cell1);
      } else {
        project[field] = cell1 || '';
      }
      inEquity = false;
      inFinance = false;
      return;
    }

    // 投资条款字段
    if (Object.prototype.hasOwnProperty.call(clauseMap, cell0)) {
      project.clauses[clauseMap[cell0]] = cell1 || '';
      inEquity = false;
      inFinance = false;
      return;
    }

    // 投后情况字段
    if (Object.prototype.hasOwnProperty.call(postMap, cell0)) {
      project.postInvestment[postMap[cell0]] = cell1 || '';
      inEquity = false;
      inFinance = false;
      return;
    }

    // 董监高信息：总经理 / 董事长（各一人）
    if (Object.prototype.hasOwnProperty.call(directorMap, cell0)) {
      project.directors[directorMap[cell0]] = cell1 || '';
      inEquity = false;
      inFinance = false;
      return;
    }

    // 董监高信息：监事（可多行，每行一人；也支持一行多值用顿号/逗号/分号分隔）
    if (cell0 === '监事') {
      const val = cell1 || '';
      if (val) {
        const names = val.split(/[、,，;；]/).map((s) => s.trim()).filter(Boolean);
        project.directors.supervisors.push(...names);
      }
      inEquity = false;
      inFinance = false;
      return;
    }

    // 董监高信息：董事会成员（可多行，每行一人；也支持一行多值用顿号/逗号分隔）
    if (cell0 === '董事' || cell0 === '董事会成员') {
      const val = cell1 || '';
      if (val) {
        const names = val.split(/[、,，;；]/).map((s) => s.trim()).filter(Boolean);
        project.directors.boardMembers.push(...names);
      }
      inEquity = false;
      inFinance = false;
      return;
    }

    // 股权结构数据行（带「股东名称」表头的模板）
    if (inEquity) {
      if (cell0) {
        const rv = cell1 === '' ? '' : parseFloat(cell1);
        project.investors.push({ name: cell0, ratio: Number.isFinite(rv) ? rv : '' });
      }
      return;
    }

    // 财务数据行
    if (inFinance) {
      parseFinance(project, row, financeHeaders);
      return;
    }

    // 扁平模板：无「股东名称」表头的股权结构行
    // 特征：cell0 为股东名（非已知字段/表头），cell1 为数字比例
    const ratioNum = cell1 === '' ? NaN : parseFloat(cell1);
    if (Number.isFinite(ratioNum)) {
      project.investors.push({ name: cell0, ratio: ratioNum });
    }
  });

  return project;
}

/**
 * 解析财务数据行，直接产出 store 标准字段。
 * 兼容多种列名：营收(万元) / 净利润(万元) / 毛利(万元)或毛利率(%) / 资产负债率(%) / 经营现金流(万元)
 * 期间支持「2022」「2026Q1」等格式，自动拆分 year/quarter。
 */
function parseFinance(project, row, headers) {
  if (!row || row.length < 2) return;

  const period = String(row[0] ?? '').trim();
  if (!period) return;

  // 列名 → 字段映射（按关键字匹配，兼容中英文括号与列顺序）
  const colField = (header) => {
    const h = String(header ?? '').trim();
    if (h.includes('营收')) return 'revenue';
    if (h.includes('净利润')) return 'netProfit';
    if (h.includes('毛利率')) return 'grossMarginPct';
    if (h.includes('毛利')) return 'grossProfit';
    if (h.includes('资产负债率')) return 'debtRatioPct';
    if (h.includes('现金流')) return 'operatingCashFlow';
    return null;
  };

  const raw = {};
  headers.forEach((header, idx) => {
    if (idx === 0) return; // 跳过「年份/期间」列
    const field = colField(header);
    if (!field) return;
    const v = row[idx];
    raw[field] = v !== '' && v !== undefined && v !== null && String(v).trim() !== '' ? parseFloat(v) : NaN;
  });

  // 整行财务数值全空 → 跳过，避免生成全 0 假数据（污染财务看板）
  if (!Object.values(raw).some((v) => Number.isFinite(v))) return;

  // 拆分 year / quarter
  const m = period.match(/^(\d{4})\s*[Qq](\d)/);
  const year = m ? Number(m[1]) : Number(period.match(/^(\d{4})/)?.[1]) || 0;
  const quarter = m ? Number(m[2]) : 0;

  const revenue = Number.isFinite(raw.revenue) ? raw.revenue : 0;
  const netProfit = Number.isFinite(raw.netProfit) ? raw.netProfit : 0;
  const operatingCashFlow = Number.isFinite(raw.operatingCashFlow) ? raw.operatingCashFlow : 0;

  // 毛利：优先「毛利(万元)」，否则用「毛利率(%)」× 营收 反推
  let grossProfit = Number.isFinite(raw.grossProfit) ? raw.grossProfit : 0;
  if (!grossProfit && Number.isFinite(raw.grossMarginPct) && revenue) {
    grossProfit = Math.round((revenue * raw.grossMarginPct) / 100);
  }

  // 资产负债率：模板为 0-100 百分比，store 统一为 0-1 小数（含负值，按绝对值判断）
  let debtRatio = 0;
  if (Number.isFinite(raw.debtRatioPct)) {
    debtRatio = Math.abs(raw.debtRatioPct) > 1 ? raw.debtRatioPct / 100 : raw.debtRatioPct;
  }

  project.finance.push({
    period,
    year,
    quarter,
    revenue,
    grossProfit,
    netProfit,
    debtRatio,
    operatingCashFlow,
  });
}

/**
 * 校验导入数据
 */
export function validateData(projects) {
  const errors = [];
  const validProjects = [];

  projects.forEach((project, index) => {
    const rowErrors = [];

    // 必填字段校验
    if (!project.name || project.name === '使用说明') {
      rowErrors.push('项目名称不能为空');
    }
    if (!project.investmentDate) {
      rowErrors.push('缺少投资日期');
    }
    if (!project.shares && project.shares !== 0) {
      rowErrors.push('缺少持股比例');
    }

    // 数值校验
    if (project.shares && (project.shares < 0 || project.shares > 100)) {
      rowErrors.push('持股比例应在0-100之间');
    }
    if (project.investmentAmount && project.investmentAmount < 0) {
      rowErrors.push('投资金额不能为负数');
    }

    if (rowErrors.length > 0) {
      errors.push({ sheet: project.name, errors: rowErrors, data: project });
    } else {
      validProjects.push(project);
    }
  });

  return { errors, validProjects };
}

/**
 * 下载空模板
 */
export function downloadTemplate() {
  // 生成一个示例模板
  const wb = XLSX.utils.book_new();

  // 示例项目 Sheet
  const exampleData = [
    ['=== 基本信息 ===', ''],
    ['项目名称', '示例项目'],
    ['所属行业', '金融科技'],
    ['投资日期', '2024-01-15'],
    ['投资金额(万元)', 500],
    ['持股比例(%)', 10],
    ['投资方式', '股权'],
    ['投后估值(万元)', 5000],
    ['项目简介', '这是一个示例项目，用于演示模板格式'],
    ['团队规模', '50人'],
    ['联系人', '张三'],
    ['联系电话', '13800138000'],
    ['项目状态', 'normal'],
    ['', ''],
    ['=== 股权结构 ===', ''],
    ['股东名称', '持股比例(%)'],
    ['我方基金', 10],
    ['其他股东', 90],
    ['', ''],
    ['=== 董监高信息 ===', ''],
    ['总经理', '张三'],
    ['董事长', '李四'],
    ['监事', '王五、赵六'],
    ['董事', '钱七'],
    ['董事', '孙八'],
    ['董事', '周九'],
    ['', ''],
    ['=== 财务数据 ===', ''],
    ['年份', '营收(万元)', '净利润(万元)', '毛利(万元)', '资产负债率(%)', '经营现金流(万元)'],
    ['2023', 1000, 100, 300, 45, 80],
    ['2024', 1200, 150, 360, 40, 100],
    ['2025', '', '', '', '', ''],
    ['', ''],
    ['=== 投资条款 ===', ''],
    ['回购条款', '按年化8%回购'],
    ['优先清算权', '1倍优先清算'],
    ['反稀释条款', '加权平均反稀释'],
    ['随售权', '有'],
    ['拖售权', '有'],
    ['一票否决权', '重大事项一票否决'],
    ['', ''],
    ['=== 投后情况 ===', ''],
    ['投后联系人', '李四'],
    ['投后联系电话', '13900139000'],
    ['最近沟通日期', '2024-06-01'],
    ['项目亮点', '技术领先，市场份额增长快'],
    ['风险提示', '行业竞争加剧'],
    ['后续计划', '下一轮融资准备'],
    ['备注', ''],
  ];

  const ws = XLSX.utils.aoa_to_sheet(exampleData);
  ws['!cols'] = [{ wch: 20 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, ws, '示例项目');

  // 使用说明 Sheet
  const readmeData = [
    ['投后项目批量导入模板说明', ''],
    ['', ''],
    ['使用方法', ''],
    ['1. 每个 Sheet 代表一个项目，Sheet 名称为项目名称', ''],
    ['2. 按模块填写信息，标有 === 的为模块标题，请保留', ''],
    ['3. 填写完成后，上传该 Excel 文件到系统批量导入', ''],
    ['', ''],
    ['模块说明', ''],
    ['- 基本信息：项目名称、行业、投资日期、投资金额、持股比例等', ''],
    ['- 股权结构：所有股东名称和持股比例', ''],
    ['- 董监高信息：总经理/董事长各一人，监事/董事可多人填写（顿号分隔）', ''],
    ['- 财务数据：按年度填写营收、净利润、毛利、资产负债率、经营现金流', ''],
    ['- 投资条款：回购条款、优先清算权、反稀释条款、随售权、拖售权、一票否决权', ''],
    ['- 投后情况：联系人、沟通记录、亮点、风险、后续计划', ''],
    ['', ''],
    ['注意事项', ''],
    ['- 请保留 === 模块标题行，不要修改或删除', ''],
    ['- 投资日期格式：YYYY-MM-DD', ''],
    ['- 持股比例范围：0-100', ''],
    ['- 财务数据中的年份列请勿修改列名', ''],
  ];

  const wsReadme = XLSX.utils.aoa_to_sheet(readmeData);
  wsReadme['!cols'] = [{ wch: 30 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, wsReadme, '使用说明');

  XLSX.writeFile(wb, '投后项目导入模板.xlsx');
}