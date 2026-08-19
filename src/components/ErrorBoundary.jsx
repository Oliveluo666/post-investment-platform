import React from 'react'
import { Result, Button } from 'antd'

/**
 * 全局错误边界：单页渲染异常时兜底展示，避免整个 SPA 白屏。
 * 生产环境仅记录 console，详细错误上报可后续接入。
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] 页面渲染异常:', error, info?.componentStack)
  }

  handleReload = () => {
    window.location.reload()
  }

  handleBack = () => {
    this.setState({ hasError: false, error: null })
    window.location.hash = '#/dashboard'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <Result
            status="warning"
            title="页面出现异常"
            subTitle={this.state.error?.message || '当前页面渲染失败，可尝试刷新或返回总览页。'}
            extra={[
              <Button type="primary" key="reload" onClick={this.handleReload}>
                刷新页面
              </Button>,
              <Button key="back" onClick={this.handleBack}>
                返回项目总览
              </Button>,
            ]}
          />
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
