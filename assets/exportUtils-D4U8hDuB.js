import{F as y,P as a,H as u,T as i,a as L,W as b,b as E,c as p,B as $,d as C,A as z,I as G,e as I,f as F}from"./docx-vendor-QJB4IT8P.js";import{y as d}from"./vendor-CE3pyGmO.js";import{g as _,z as B}from"./index-Bd6LVSP4.js";function O(e){const h=e.split(",")[1]||e,r=atob(h),s=new Uint8Array(r.length);for(let l=0;l<r.length;l++)s[l]=r.charCodeAt(l);return s.buffer}async function Q(e,h,r,s=[]){var D,T,v,A;const l=B(),x=h||l.finance[e==null?void 0:e.id]||[],o=_(x),m=r||l.timelines[e==null?void 0:e.id]||[],g={top:{style:$.SINGLE,size:1,color:"CCCCCC"},bottom:{style:$.SINGLE,size:1,color:"CCCCCC"},left:{style:$.SINGLE,size:1,color:"CCCCCC"},right:{style:$.SINGLE,size:1,color:"CCCCCC"}},t=[];t.push(new a({children:[new i({text:`${e.name} - 投后管理报告`,bold:!0,size:36,font:"微软雅黑"})],heading:u.TITLE,spacing:{after:400}})),t.push(new a({children:[new i({text:`报告生成时间：${d().format("YYYY年M月D日 HH:mm")}`,size:20,color:"888888"})],spacing:{after:400}})),t.push(new a({children:[new i({text:"一、项目概览",bold:!0,size:28,font:"微软雅黑"})],heading:u.HEADING_1,spacing:{before:200,after:200}}));const M=[["项目名称",e.name],["行业/赛道",e.industry],["标签",((D=e.tags)==null?void 0:D.join("、"))||"-"],["投资时间",e.investDate],["投资金额",e.investAmountDisplay+"元"],["投资方式",e.investType],["融资轮次",e.round||"-"],["估值",e.valuation?Number(e.valuation).toLocaleString()+"万元":"-"],["联系人",e.contactPerson||"-"],["联系电话",e.contactPhone||"-"],["团队规模",e.teamSize||"-"],["公司网站",e.website||"-"]];t.push(new L({width:{size:100,type:b.PERCENTAGE},rows:M.map(([n,c])=>new E({children:[new p({width:{size:25,type:b.PERCENTAGE},borders:g,shading:{fill:"F5F5F5"},children:[new a({children:[new i({text:n,bold:!0,size:21,font:"微软雅黑"})]})]}),new p({width:{size:75,type:b.PERCENTAGE},borders:g,children:[new a({children:[new i({text:String(c||"-"),size:21,font:"微软雅黑"})]})]})]}))})),(T=e.investors)!=null&&T.length&&(t.push(new a({children:[new i({text:"投资方及占股比例：",bold:!0,size:21,font:"微软雅黑"})],spacing:{before:200}})),e.investors.forEach(n=>{t.push(new a({children:[new i({text:`  · ${n.name}：${n.ratio}%`,size:21,font:"微软雅黑"})]}))}));const f=e.directors||{},w=[];f.chairman&&w.push(`董事长：${f.chairman}`),f.generalManager&&w.push(`总经理：${f.generalManager}`);const Y=(v=f.supervisors)!=null&&v.length?f.supervisors:f.supervisor?String(f.supervisor).split(/[、,，;；]/).map(n=>n.trim()).filter(Boolean):[];Y.length&&w.push(`监事：${Y.join("、")}`),(A=f.boardMembers)!=null&&A.length&&w.push(`董事会成员：${f.boardMembers.join("、")}`),w.length&&(t.push(new a({children:[new i({text:"董监高信息：",bold:!0,size:21,font:"微软雅黑"})],spacing:{before:200}})),w.forEach(n=>{t.push(new a({children:[new i({text:`  · ${n}`,size:21,font:"微软雅黑"})]}))})),e.description&&(t.push(new a({children:[new i({text:"项目简介：",bold:!0,size:21,font:"微软雅黑"})],spacing:{before:200}})),t.push(new a({children:[new i({text:e.description,size:21,font:"微软雅黑"})]}))),t.push(new C),t.push(new a({children:[new i({text:"二、核心投资条款",bold:!0,size:28,font:"微软雅黑"})],heading:u.HEADING_1,spacing:{before:200,after:200}}));const S={repurchase:"回购条款",liquidation:"优先清算权",antiDilution:"反稀释条款",tagAlong:"随售权",dragAlong:"拖售权",veto:"一票否决权/保护性条款"};Object.entries(e.clauses||{}).forEach(([n,c])=>{t.push(new a({children:[new i({text:`${S[n]||n}：`,bold:!0,size:21,font:"微软雅黑"}),new i({text:c,size:21,font:"微软雅黑"})],spacing:{after:120}}))}),t.push(new C),t.push(new a({children:[new i({text:"三、核心财务数据（年度）",bold:!0,size:28,font:"微软雅黑"})],heading:u.HEADING_1,spacing:{before:200,after:200}}));const N=new E({children:["年度","营收(万元)","毛利(万元)","净利润(万元)","净利率","资产负债率","经营现金流(万元)"].map(n=>new p({borders:g,shading:{fill:"E6F4FF"},children:[new a({alignment:z.CENTER,children:[new i({text:n,bold:!0,size:20,font:"微软雅黑"})]})]}))}),H=o.map(n=>new E({children:[n.label,n.revenue.toLocaleString(),n.grossProfit.toLocaleString(),n.netProfit.toLocaleString(),Math.round(n.netMargin*100)+"%",Math.round(n.debtRatio*100)+"%",n.operatingCashFlow.toLocaleString()].map(c=>new p({borders:g,children:[new a({alignment:z.CENTER,children:[new i({text:String(c),size:20,font:"微软雅黑"})]})]}))}));t.push(new L({width:{size:100,type:b.PERCENTAGE},rows:[N,...H]})),s.length>0&&(t.push(new a({children:[new i({text:"财务趋势图表",bold:!0,size:24,font:"微软雅黑"})],spacing:{before:300,after:100}})),s.forEach(n=>{try{t.push(new a({children:[new i({text:n.title||"趋势图",size:20,bold:!0,color:"555555",font:"微软雅黑"})],spacing:{before:200,after:80}})),t.push(new a({alignment:z.CENTER,children:[new G({type:"png",data:O(n.dataUrl),transformation:{width:560,height:300}})]}))}catch(c){console.warn("图表嵌入失败：",c)}})),t.push(new C),t.push(new a({children:[new i({text:"四、投后管理时间轴",bold:!0,size:28,font:"微软雅黑"})],heading:u.HEADING_1,spacing:{before:200,after:200}})),m.forEach(n=>{t.push(new a({children:[new i({text:`【${n.date}】${n.typeLabel} - ${n.title}`,bold:!0,size:22,font:"微软雅黑"})],spacing:{before:160}})),t.push(new a({children:[new i({text:n.description,size:20,font:"微软雅黑"})],spacing:{after:80}})),t.push(new a({children:[new i({text:`操作人：${n.operator}`,size:18,color:"888888",font:"微软雅黑"})],spacing:{after:120}}))});const P=new I({sections:[{properties:{},children:t}]}),R=await F.toBlob(P);y.saveAs(R,`${e.name}_投后管理报告_${d().format("YYYYMMDD")}.docx`)}function U(e,h,r="txt"){let s=`${e} - 投后管理时间轴记录
`;s+=`导出时间：${d().format("YYYY-MM-DD HH:mm:ss")}
`,s+=`共 ${h.length} 条记录
`,s+="=".repeat(60)+`

`;const l=[...h].sort((o,m)=>d(o.date).valueOf()-d(m.date).valueOf());r==="md"?(s=`# ${e} - 投后管理时间轴

`,s+=`> 导出时间：${d().format("YYYY-MM-DD HH:mm:ss")}

`,l.forEach(o=>{s+=`## 📅 ${o.date} · ${o.typeLabel}：${o.title}

`,s+=`${o.description}

`,s+=`*操作人：${o.operator}*

---

`})):l.forEach(o=>{s+=`日期：${o.date}
`,s+=`类型：${o.typeLabel}
`,s+=`标题：${o.title}
`,s+=`内容：${o.description}
`,s+=`操作人：${o.operator}
`,s+="-".repeat(50)+`
`});const x=new Blob([s],{type:`text/${r};charset=utf-8`});y.saveAs(x,`${e}_投后时间轴_${d().format("YYYYMMDD")}.${r==="md"?"md":"txt"}`)}function J(e,h="Q2"){const r=d().format("YYYY年M月D日"),s=`${e.name} ${d().year()}年${h}经营问询函

致：${e.name}管理层
自：我方投后管理团队
日期：${r}
回复截止：${d().add(7,"day").format("YYYY年M月D日")}

尊敬的各位管理层：

根据投资协议约定及我司投后管理制度要求，现将${d().year()}年${h}经营问询事项列明如下，请贵司于回复截止日前逐一反馈书面回复。

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
${r}
`,l=new Blob([s],{type:"text/plain;charset=utf-8"});y.saveAs(l,`${e.name}_${d().year()}${h}_问询函草稿.txt`)}export{U as a,J as b,Q as e};
