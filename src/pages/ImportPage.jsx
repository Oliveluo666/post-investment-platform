import React, { useState, useCallback } from 'react';
import {
  Card, Upload, Button, Table, Alert, Space, Steps, message,
  Modal, Typography, Tag, Tooltip, Progress
} from 'antd';
import {
  UploadOutlined, DownloadOutlined, InboxOutlined,
  CheckCircleOutlined, CloseCircleOutlined, WarningOutlined,
  ArrowLeftOutlined, ArrowRightOutlined
} from '@ant-design/icons';
import { downloadTemplate, parseExcelFile, validateData } from '../utils/importTemplate';
import { useStore, addProjects } from '../data/store';
import { useNavigate } from 'react-router-dom';

const { Dragger } = Upload;
const { Title, Text, Paragraph } = Typography;

export default function ImportPage() {
  const navigate = useNavigate();
  const { projects } = useStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [validationResult, setValidationResult] = useState({ errors: [], validProjects: [] });
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  // 步骤标题
  const steps = [
    { title: '下载模板', description: '获取标准格式' },
    { title: '上传文件', description: '上传填好的Excel' },
    { title: '预览校验', description: '检查数据' },
    { title: '导入完成', description: '完成导入' },
  ];

  // 下载模板
  const handleDownloadTemplate = useCallback(() => {
    downloadTemplate();
    message.success('模板下载成功！请按格式填写数据后上传。');
  }, []);

  // 上传文件
  const handleUpload = useCallback(async (uploadedFile) => {
    try {
      const result = await parseExcelFile(uploadedFile);
      const { errors, validProjects } = validateData(result.projects);

      setFile(uploadedFile);
      setPreviewData(result.projects);
      setValidationResult({ errors, validProjects });

      if (errors.length > 0) {
        message.warning(`解析完成，但有 ${errors.length} 个项目存在问题`);
      } else {
        message.success(`解析成功！共 ${validProjects.length} 个项目`);
      }

      setCurrentStep(2);
    } catch (error) {
      message.error('文件解析失败：' + error.message);
    }
    return false; // 阻止默认上传行为
  }, []);

  // 确认导入
  const handleImport = useCallback(async () => {
    const { validProjects } = validationResult;
    if (validProjects.length === 0) {
      message.warning('没有有效数据可导入');
      return;
    }

    setImporting(true);
    try {
      // 模拟导入进度
      for (let i = 0; i <= 100; i += 20) {
        await new Promise(r => setTimeout(r, 100));
      }

      // 批量添加项目（同名自动覆盖，返回新增/覆盖数量 + 云端同步结果）
      const { added, updated, syncError } = await addProjects(validProjects);

      setImportResult({
        added,
        updated,
        total: validProjects.length,
      });
      setCurrentStep(3);
      if (syncError) {
        message.error(`本地已导入，但云端同步失败：${syncError}。请重试或联系管理员。`);
      } else {
        message.success(updated > 0 ? `新增 ${added} 个，覆盖更新 ${updated} 个同名项目` : `成功导入 ${added} 个项目！`);
      }
    } catch (error) {
      message.error('导入失败：' + error.message);
    } finally {
      setImporting(false);
    }
  }, [validationResult, addProjects]);

  // 重新开始
  const handleReset = useCallback(() => {
    setCurrentStep(0);
    setFile(null);
    setPreviewData([]);
    setValidationResult({ errors: [], validProjects: [] });
    setImportResult(null);
  }, []);

  // 预览表格列定义
  const previewColumns = [
    { title: '项目名称', dataIndex: 'name', key: 'name', width: 200, render: (v) => v || <Text type="warning">-</Text> },
    { title: '所属行业', dataIndex: 'industry', key: 'industry', width: 120, render: (v) => v || <Text type="warning">-</Text> },
    { title: '投资日期', dataIndex: 'investmentDate', key: 'investmentDate', width: 120, render: (v) => v || <Text type="warning">-</Text> },
    { title: '投资金额(万元)', dataIndex: 'investmentAmount', key: 'investmentAmount', width: 130, render: (v) => v ? Number(v).toLocaleString() : <Text type="warning">-</Text> },
    { title: '持股比例(%)', dataIndex: 'shares', key: 'shares', width: 110, render: (v) => v ? `${v}%` : <Text type="warning">-</Text> },
    { title: '投资方式', dataIndex: 'investType', key: 'investType', width: 100, render: (v) => v || <Text type="warning">-</Text> },
    { title: '投后估值(万元)', dataIndex: 'valuation', key: 'valuation', width: 130, render: (v) => v ? Number(v).toLocaleString() : <Text type="warning">-</Text> },
    { title: '股东数', dataIndex: 'investors', key: 'investors', width: 80, render: (v) => (v && v.length) || 0 },
    { title: '财务数据', dataIndex: 'finance', key: 'finance', width: 80, render: (v) => (v && v.length) || 0 },
    { title: '项目简介', dataIndex: 'description', key: 'description', ellipsis: true, render: (v) => v || <Text type="warning">-</Text> },
  ];

  // 错误列表
  const errorColumns = [
    { title: 'Sheet', dataIndex: 'sheet', key: 'sheet', width: 200, render: (v) => v || '-' },
    { title: '错误信息', dataIndex: 'errors', key: 'errors', render: (errors) => (
      <Space direction="vertical" size={2}>
        {errors.map((err, i) => <Text key={i} type="danger">{err}</Text>)}
      </Space>
    )},
  ];

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <Card>
        <Title level={3}>批量导入项目</Title>
        <Paragraph type="secondary">
          按照标准模板填写项目数据，批量导入到系统中。支持 Excel (.xlsx) 格式。
        </Paragraph>

        {/* 步骤条 */}
        <Steps current={currentStep} items={steps} style={{ marginBottom: 32 }} />

        {/* 步骤 0: 下载模板 */}
        {currentStep === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: 48, color: '#1890ff', marginBottom: 16 }}>
              <DownloadOutlined />
            </div>
            <Title level={4}>第一步：下载导入模板</Title>
            <Paragraph>
              下载标准 Excel 模板，每个 Sheet 代表一个项目。
              <br />
              按模块填写基本信息、股权结构、财务数据、投资条款和投后情况。
            </Paragraph>
            <Space size="large" style={{ marginTop: 24 }}>
              <Button type="primary" size="large" icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>
                下载 Excel 模板
              </Button>
              <Button size="large" icon={<ArrowRightOutlined />} onClick={() => setCurrentStep(1)}>
                我已填好，直接上传
              </Button>
            </Space>
          </div>
        )}

        {/* 步骤 1: 上传文件 */}
        {currentStep === 1 && (
          <div style={{ padding: '20px 0' }}>
            <Dragger
              name="file"
              accept=".xlsx,.xls"
              showUploadList={false}
              beforeUpload={handleUpload}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">点击或拖拽 Excel 文件到此区域上传</p>
              <p className="ant-upload-hint">
                支持 .xlsx 格式，请使用下载的模板填写数据
              </p>
            </Dragger>
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Button icon={<ArrowLeftOutlined />} onClick={() => setCurrentStep(0)}>
                返回下载模板
              </Button>
            </div>
          </div>
        )}

        {/* 步骤 2: 预览校验 */}
        {currentStep === 2 && (
          <div>
            <Alert
              type={validationResult.errors.length > 0 ? 'warning' : 'success'}
              showIcon
              message={
                <span>
                  共解析 <strong>{previewData.length}</strong> 条数据，
                  有效 <strong style={{ color: '#52c41a' }}>{validationResult.validProjects.length}</strong> 条，
                  {validationResult.errors.length > 0 && (
                    <span>有问题 <strong style={{ color: '#faad14' }}>{validationResult.errors.length}</strong> 条</span>
                  )}
                </span>
              }
              style={{ marginBottom: 16 }}
            />

            {/* 错误列表 */}
            {validationResult.errors.length > 0 && (
              <Card
                size="small"
                title={<span><WarningOutlined style={{ color: '#faad14' }} /> 数据校验问题</span>}
                style={{ marginBottom: 16, borderColor: '#faad14' }}
              >
                <Table
                  dataSource={validationResult.errors}
                  columns={errorColumns}
                  rowKey="row"
                  pagination={false}
                  size="small"
                />
              </Card>
            )}

            {/* 数据预览 */}
            <Card
              size="small"
              title={<span><CheckCircleOutlined style={{ color: '#52c41a' }} /> 数据预览（仅显示有效数据）</span>}
            >
              <Table
                dataSource={validationResult.validProjects}
                columns={previewColumns}
                rowKey={(_, index) => index}
                pagination={{ pageSize: 10, showSizeChanger: true }}
                size="small"
                scroll={{ x: 1200 }}
              />
            </Card>

            {/* 操作按钮 */}
            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <Space size="large">
                <Button icon={<ArrowLeftOutlined />} onClick={() => setCurrentStep(1)}>
                  重新上传
                </Button>
                <Button
                  type="primary"
                  size="large"
                  icon={<UploadOutlined />}
                  loading={importing}
                  disabled={validationResult.validProjects.length === 0}
                  onClick={handleImport}
                >
                  确认导入 {validationResult.validProjects.length} 条数据
                </Button>
              </Space>
            </div>
          </div>
        )}

        {/* 步骤 3: 导入完成 */}
        {currentStep === 3 && importResult && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: 64, color: '#52c41a', marginBottom: 16 }}>
              <CheckCircleOutlined />
            </div>
            <Title level={4}>导入完成</Title>
            <Space direction="vertical" size="middle">
              <Text>
                共处理 <strong>{importResult.total}</strong> 条数据，
                新增 <strong style={{ color: '#52c41a' }}>{importResult.added}</strong> 条
                {importResult.updated > 0 && (
                  <span>，覆盖更新 <strong style={{ color: '#faad14' }}>{importResult.updated}</strong> 条同名项目</span>
                )}
              </Text>
              <Text type="secondary">
                当前系统共有 <strong>{projects.length}</strong> 个项目
              </Text>
              <Space size="large" style={{ marginTop: 16 }}>
                <Button onClick={handleReset}>继续导入</Button>
                <Button type="primary" onClick={() => navigate('/dashboard')}>
                  返回项目列表
                </Button>
              </Space>
            </Space>
          </div>
        )}
      </Card>
    </div>
  );
}