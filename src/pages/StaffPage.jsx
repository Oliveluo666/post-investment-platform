import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Alert,
  App,
  Avatar,
  Tooltip,
  Popconfirm,
  Tabs,
  Badge,
  Descriptions,
} from 'antd'
import {
  UserAddOutlined,
  EditOutlined,
  DeleteOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  CheckOutlined,
  CloseOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons'
import {
  useStore,
  can,
  ROLE_LABELS,
  addUser,
  addUserWithAuth,
  updateUser,
  deleteUser,
  getPendingUsers,
  approveUser,
  rejectUser,
} from '../data/store.js'

const STATUS_OPTIONS = [
  { value: 'active', label: '在职' },
  { value: 'inactive', label: '已停用' },
]

const ROLE_OPTIONS = Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }))

export default function StaffPage() {
  const navigate = useNavigate()
  const { message, modal } = App.useApp()
  const { users, session } = useStore()
  const [form] = Form.useForm()
  const [isOpen, setIsOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [activeTab, setActiveTab] = useState('active')
  const [approving, setApproving] = useState(null)

  const pendingUsers = useMemo(() => getPendingUsers(), [users])
  const activeUsers = useMemo(() => (users || []).filter((u) => u.status !== 'pending'), [users])

  if (!can('staff.manage')) {
    return (
      <div className="text-center py-24">
        <SafetyCertificateOutlined style={{ fontSize: 44, color: '#f59e0b' }} />
        <h2 className="mt-4 text-[18px] font-semibold text-slate-800">无权访问员工库</h2>
        <p className="text-slate-500 mt-2 text-[13px]">
          当前角色不具备「员工库」管理权限，请联系系统管理员。
        </p>
        <Button type="primary" className="mt-6" onClick={() => navigate('/dashboard')}>
          返回总览
        </Button>
      </div>
    )
  }

  const handleOpen = (record = null) => {
    setEditing(record)
    if (record) {
      form.setFieldsValue(record)
    } else {
      form.resetFields()
      form.setFieldsValue({ role: 'post', status: 'active' })
    }
    setIsOpen(true)
  }

  const handleClose = () => {
    setIsOpen(false)
    setEditing(null)
    form.resetFields()
  }

  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      if (editing) {
        await updateUser(editing.id, values)
        message.success('员工信息已更新')
      } else {
        const res = await addUserWithAuth(values)
        if (!res.success) {
          message.error(res.error || '添加员工失败')
          return
        }
        message.success('员工已添加，登录账号已创建')
      }
      handleClose()
    } catch {
      // validation failed
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (record) => {
    if (record.id === session.userId) {
      message.error('不能删除当前登录账号')
      return
    }
    Modal.confirm({
      title: '确认删除该员工？',
      content: `将删除「${record.name}」(${ROLE_LABELS[record.role]})，删除后不可恢复。`,
      okText: '确认删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => {
        deleteUser(record.id)
        message.success('员工已删除')
      },
    })
  }

  const handleApprove = async (record) => {
    setApproving(record.id)
    try {
      const res = await approveUser(record.id)
      if (res.success) {
        message.success(`已通过「${record.name}」的注册申请，账号已创建`)
      } else {
        message.error(res.error || '审核失败')
      }
    } finally {
      setApproving(null)
    }
  }

  const handleReject = (record) => {
    Modal.confirm({
      title: '确认驳回该申请？',
      content: `将驳回「${record.name}」的注册申请，该用户将无法登录。`,
      okText: '确认驳回',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => {
        rejectUser(record.id)
        message.success('已驳回该注册申请')
      },
    })
  }

  const activeColumns = [
    {
      title: '员工',
      dataIndex: 'name',
      render: (text, record) => (
        <div className="flex items-center gap-3">
          <Avatar style={{ backgroundColor: '#2563eb' }}>{(text || '?').charAt(0)}</Avatar>
          <div>
            <div className="font-medium text-slate-800">{text || '-'}</div>
            <div className="text-[12px] text-slate-500">{record.email || '未填写邮箱'}</div>
          </div>
        </div>
      ),
    },
    {
      title: '角色',
      dataIndex: 'role',
      width: 140,
      render: (role) => <Tag color={role === 'admin' ? 'red' : 'blue'}>{ROLE_LABELS[role] || role}</Tag>,
    },
    {
      title: '部门',
      dataIndex: 'department',
      width: 140,
      render: (v) => v || '-',
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      width: 140,
      render: (v) => v || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status) => (
        <Tag color={status === 'active' ? 'green' : 'default'}>
          {status === 'active' ? '在职' : '已停用'}
        </Tag>
      ),
    },
    {
      title: '添加时间',
      dataIndex: 'createdAt',
      width: 170,
      render: (v) => v || '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="编辑">
            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleOpen(record)} />
          </Tooltip>
          <Tooltip title="删除">
            <Button
              type="text"
              danger
              size="small"
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ]

  const pendingColumns = [
    {
      title: '申请人',
      dataIndex: 'name',
      render: (text, record) => (
        <div className="flex items-center gap-3">
          <Avatar style={{ backgroundColor: '#f59e0b' }}>{(text || '?').charAt(0)}</Avatar>
          <div>
            <div className="font-medium text-slate-800">{text || '-'}</div>
            <div className="text-[12px] text-slate-500">{record.email || '未填写邮箱'}</div>
          </div>
        </div>
      ),
    },
    {
      title: '申请岗位',
      dataIndex: 'role',
      width: 140,
      render: (role) => <Tag color="blue">{ROLE_LABELS[role] || role}</Tag>,
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      width: 140,
      render: (v) => v || '-',
    },
    {
      title: '申请时间',
      dataIndex: 'createdAt',
      width: 170,
      render: (v) => v || '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            icon={<CheckOutlined />}
            loading={approving === record.id}
            onClick={() => handleApprove(record)}
          >
            通过
          </Button>
          <Button
            type="default"
            danger
            size="small"
            icon={<CloseOutlined />}
            onClick={() => handleReject(record)}
          >
            驳回
          </Button>
        </Space>
      ),
    },
  ]

  const tabItems = [
    {
      key: 'active',
      label: (
        <span>
          在职员工
          <Badge count={activeUsers.length} style={{ marginLeft: 8 }} />
        </span>
      ),
      children: (
        <Table
          rowKey="id"
          columns={activeColumns}
          dataSource={activeUsers}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: '暂无员工，请点击右上角添加' }}
        />
      ),
    },
    {
      key: 'pending',
      label: (
        <span>
          待审核申请
          <Badge count={pendingUsers.length} style={{ marginLeft: 8 }} />
        </span>
      ),
      children: (
        <Table
          rowKey="id"
          columns={pendingColumns}
          dataSource={pendingUsers}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: '暂无待审核的注册申请' }}
        />
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <Card
        className="!mb-4"
        styles={{ body: { padding: 20 } }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-[20px] font-semibold text-slate-900 flex items-center gap-2">
              <TeamOutlined style={{ color: '#2563eb' }} />
              员工库
            </h1>
            <p className="text-[13px] text-slate-500 mt-1">
              管理公司内部账号，支持注册申请审核、编辑、停用及删除。
            </p>
          </div>
          <Button type="primary" icon={<UserAddOutlined />} onClick={() => handleOpen()}>
            添加员工
          </Button>
        </div>
      </Card>

      <Alert
        type="info"
        showIcon
        className="!mb-4"
        message="角色说明"
        description={
          <span className="text-[12px]">
            <b>系统管理员</b>：拥有全部权限，可管理员工、删除项目、查看所有数据；
            <b>投后经理</b>：负责项目全生命周期管理；
            <b>风控专员</b>：可查看并编辑项目、条款、风险信息；
            <b>财务专员</b>：可查看项目并编辑财务数据。
          </span>
        }
      />

      <Card size="small">
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </Card>

      <Modal
        title={editing ? '编辑员工' : '添加员工'}
        open={isOpen}
        onOk={handleSave}
        onCancel={handleClose}
        okText={editing ? '保存' : '添加'}
        cancelText="取消"
        confirmLoading={saving}
        destroyOnClose
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item label="姓名" name="name" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input placeholder="请输入员工姓名" />
          </Form.Item>
          <Form.Item
            label="邮箱"
            name="email"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效邮箱' },
            ]}
          >
            <Input placeholder="name@company.com" />
          </Form.Item>
          <Form.Item label="角色" name="role" rules={[{ required: true, message: '请选择角色' }]}>
            <Select options={ROLE_OPTIONS} placeholder="请选择角色" />
          </Form.Item>
          <Form.Item label="部门" name="department">
            <Input placeholder="如：投资部、风控部、财务部" />
          </Form.Item>
          <Form.Item label="手机号" name="phone">
            <Input placeholder="请输入手机号" />
          </Form.Item>
          <Form.Item
            label="登录密码"
            name="password"
            tooltip={editing ? '留空则不修改密码；填写则重置该员工登录密码' : '该密码用于员工登录系统，请妥善保管'}
            rules={
              editing
                ? [{ min: 8, max: 32, message: '密码长度需 8~32 位' }]
                : [
                    { required: true, message: '请设置登录密码' },
                    { min: 8, max: 32, message: '密码长度需 8~32 位' },
                  ]
            }
          >
            <Input.Password placeholder={editing ? '留空则不修改密码' : '请设置初始登录密码（8~32位）'} />
          </Form.Item>
          <Form.Item label="状态" name="status" rules={[{ required: true }]}>
            <Select options={STATUS_OPTIONS} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}