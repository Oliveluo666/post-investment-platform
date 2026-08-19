import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card,
  Button,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Row,
  Col,
  Tag,
  Space,
  Divider,
  Alert,
  App,
  Descriptions,
  Modal,
} from 'antd'
import {
  ArrowLeftOutlined,
  SaveOutlined,
  EditOutlined,
  DeleteOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  DollarOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { industryOptions, investTypeOptions } from '../data/mockData.js'
import { useStore, updateProject, can, deleteProject } from '../data/store.js'

const { TextArea } = Input

const TEAM_SIZE_OPTIONS = [
  { value: '50人以内', label: '50人以内' },
  { value: '50-100人', label: '50-100人' },
  { value: '100-300人', label: '100-300人' },
  { value: '300-500人', label: '300-500人' },
  { value: '500-1000人', label: '500-1000人' },
  { value: '1000人以上', label: '1000人以上' },
]

const STATUS_OPTIONS = [
  { value: 'normal', label: '正常' },
  { value: 'warning', label: '关注' },
  { value: 'danger', label: '预警' },
]

const CLAUSE_META = [
  { key: 'repurchase', label: '回购条款', color: 'red' },
  { key: 'liquidation', label: '优先清算权', color: 'blue' },
  { key: 'antiDilution', label: '反稀释条款', color: 'orange' },
  { key: 'tagAlong', label: '随售权', color: 'green' },
  { key: 'dragAlong', label: '拖售权', color: 'cyan' },
  { key: 'veto', label: '保护性条款(一票否决)', color: 'purple' },
]

export default function ProjectEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { message } = App.useApp()
  const state = useStore()
  const [saving, setSaving] = useState(false)

  const project = state.projects.find((p) => p.id === id)

  if (!project) {
    return (
      <div className="text-center py-20">
        <div className="text-slate-400 mb-4">项目不存在或已被删除</div>
        <Button onClick={() => navigate('/dashboard')}>返回总览</Button>
      </div>
    )
  }

  const [form] = Form.useForm()

  const handleSave = async () => {
    try {
      const v = await form.validateFields()
      setSaving(true)
      const { syncError } = await updateProject(project.id, {
        name: v.name,
        industry: v.industry,
        tags: v.tags || [],
        teamSize: v.teamSize,
        website: v.website,
        description: v.description,
        investDate: v.investDate ? dayjs(v.investDate).format('YYYY-MM-DD') : project.investDate,
        investAmount: v.investAmount,
        investType: v.investType,
        investors: v.investors || [],
        status: v.status,
        contactPerson: v.contactPerson || '',
        contactPhone: v.contactPhone || '',
        round: v.round || '',
        valuation: v.valuation,
        directors: {
          generalManager: v.directors?.generalManager || '',
          chairman: v.directors?.chairman || '',
          supervisors: v.directors?.supervisors || [],
          boardMembers: v.directors?.boardMembers || [],
        },
        clauses: {
          repurchase: v.repurchase || '',
          liquidation: v.liquidation || '',
          antiDilution: v.antiDilution || '',
          tagAlong: v.tagAlong || '',
          dragAlong: v.dragAlong || '',
          veto: v.veto || '',
        },
      })
      if (syncError) {
        message.warning('本地已保存，但云端同步失败：' + syncError)
      } else {
        message.success('项目信息已保存')
      }
      setTimeout(() => navigate(`/projects/${project.id}`), 600)
    } catch (e) {
      message.warning('请完善必填项后保存')
    } finally {
      setSaving(false)
    }
  }

  const initialValues = {
    name: project.name,
    industry: project.industry,
    tags: project.tags || [],
    teamSize: project.teamSize,
    website: project.website,
    description: project.description,
    investDate: project.investDate ? dayjs(project.investDate) : undefined,
    investAmount: project.investAmount,
    investType: project.investType,
    investors: (project.investors && project.investors.length ? project.investors : [{ name: '', ratio: 0 }]),
    status: project.status || 'normal',
    contactPerson: project.contactPerson || '',
    contactPhone: project.contactPhone || '',
    round: project.round || '',
    valuation: project.valuation || 0,
    directors: project.directors || { generalManager: '', chairman: '', supervisors: [], boardMembers: [] },
    repurchase: project.clauses?.repurchase || '',
    liquidation: project.clauses?.liquidation || '',
    antiDilution: project.clauses?.antiDilution || '',
    tagAlong: project.clauses?.tagAlong || '',
    dragAlong: project.clauses?.dragAlong || '',
    veto: project.clauses?.veto || '',
  }

  return (
    <div className="space-y-5 max-w-5xl mx-auto animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} className="!px-2" />
          <div>
            <h1 className="text-[24px] font-bold tracking-tight text-slate-900 m-0 leading-tight">编辑项目</h1>
            <p className="text-[13px] text-slate-500 mt-1">修改项目基本信息、投资条款与经营状态</p>
          </div>
        </div>
        <Tag color="blue" icon={<EditOutlined />} className="!m-0 !text-[12px]">
          {project.name}
        </Tag>
      </div>

      {!can('project.edit') ? (
        <Alert
          type="warning"
          showIcon
          message="当前角色无权编辑项目"
          description="请切换为「投后经理」角色后操作（右上角用户菜单 → 切换角色）。"
        />
      ) : (
        <>
          <Form form={form} layout="vertical" initialValues={initialValues} key={project.id}>
            {/* 基础信息 */}
            <Card
              size="small"
              className="mb-4"
              title={
                <span className="flex items-center gap-1.5">
                  <span className="w-1 h-3.5 rounded-full" style={{ background: '#2563eb' }} />
                  <span className="text-[14px] font-semibold text-slate-900">基础信息</span>
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
                    <Select mode="tags" placeholder="输入后回车添加" tokenSeparators={[',']} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item label="经营状态" name="status">
                    <Select options={STATUS_OPTIONS} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item label="公司网站" name="website">
                    <Input placeholder="https://" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
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

            {/* 投资信息 */}
            <Card
              size="small"
              className="mb-4"
              title={
                <span className="flex items-center gap-1.5">
                  <span className="w-1 h-3.5 rounded-full" style={{ background: '#10b981' }} />
                  <span className="text-[14px] font-semibold text-slate-900">投资信息</span>
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
                    <InputNumber style={{ width: '100%' }} min={0} step={100} addonAfter="万" />
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
                    <InputNumber style={{ width: '100%' }} min={0} step={100} addonAfter="万" />
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
                          {fields.map((f) => (
                            <Row gutter={8} key={f.key} className="mb-2">
                              <Col xs={14}>
                                <Form.Item
                                  {...f}
                                  name={[f.name, 'name']}
                                  rules={[{ required: true, message: '必填' }]}
                                  noStyle
                                >
                                  <Input placeholder="投资方名称" />
                                </Form.Item>
                              </Col>
                              <Col xs={8}>
                                <Form.Item {...f} name={[f.name, 'ratio']} noStyle>
                                  <InputNumber style={{ width: '100%' }} min={0} max={100} addonAfter="%" placeholder="占比" />
                                </Form.Item>
                              </Col>
                              <Col xs={2}>
                                <Button type="text" danger onClick={() => remove(f.name)} disabled={fields.length <= 1}>
                                  删除
                                </Button>
                              </Col>
                            </Row>
                          ))}
                          <Button type="dashed" block onClick={() => add({ name: '', ratio: 0 })} icon={<TeamOutlined />}>
                            添加投资方
                          </Button>
                        </>
                      )}
                    </Form.List>
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {/* 董监高信息 */}
            <Card
              size="small"
              className="mb-4"
              title={
                <span className="flex items-center gap-1.5">
                  <span className="w-1 h-3.5 rounded-full" style={{ background: '#7c3aed' }} />
                  <span className="text-[14px] font-semibold text-slate-900">董监高信息</span>
                  <TeamOutlined style={{ color: '#7c3aed' }} />
                </span>
              }
            >
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

            {/* 投资条款 */}
            <Card
              size="small"
              className="mb-4"
              title={
                <span className="flex items-center gap-1.5">
                  <span className="w-1 h-3.5 rounded-full" style={{ background: '#dc2626' }} />
                  <span className="text-[14px] font-semibold text-slate-900">核心投资条款</span>
                  <SafetyCertificateOutlined style={{ color: '#7c3aed' }} />
                </span>
              }
            >
              <Alert
                type="info"
                showIcon
                size="small"
                message="条款修改将影响投后合规提醒与风险判断，请依据最新签署的投资协议准确填写。"
                className="!mb-4"
              />
              <Row gutter={12}>
                {CLAUSE_META.map(({ key, label, color }) => (
                  <Col xs={24} md={12} key={key}>
                    <Form.Item label={<Tag color={color} className="!m-0">{label}</Tag>} name={key}>
                      <TextArea rows={3} placeholder={`请输入${label}的具体约定...`} />
                    </Form.Item>
                  </Col>
                ))}
              </Row>
            </Card>
          </Form>

          <Divider />

          <div className="flex justify-between items-center">
            <Space>
              <Descriptions size="small" column={1} className="!mb-0">
                <Descriptions.Item label={<DollarOutlined style={{ color: '#059669' }} />}>
                  <span className="text-[13px] font-mono font-semibold text-emerald-600">
                    {project.investAmountDisplay}
                  </span>
                </Descriptions.Item>
              </Descriptions>
              {can('project.delete') && (
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() =>
                    Modal.confirm({
                      title: '确认删除该项目？',
                      content: `将删除「${project.name}」及其所有关联数据（财务、时间线、权益等），删除后不可恢复。`,
                      okText: '确认删除',
                      okButtonProps: { danger: true },
                      cancelText: '取消',
                      onOk: async () => {
                        const { syncError } = await deleteProject(project.id)
                        if (syncError) {
                          message.warning('本地已删除，但云端同步失败：' + syncError)
                        } else {
                          message.success('项目已删除')
                        }
                        navigate('/dashboard')
                      },
                    })
                  }
                >
                  删除项目
                </Button>
              )}
            </Space>
            <Space>
              <Button onClick={() => navigate(-1)}>取消</Button>
              <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
                保存修改
              </Button>
            </Space>
          </div>
        </>
      )}
    </div>
  )
}
