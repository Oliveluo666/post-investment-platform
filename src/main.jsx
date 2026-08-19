import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { ConfigProvider, App as AntdApp } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import './index.css'

dayjs.locale('zh-cn')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          // 美式科技风主色
          colorPrimary: '#2563eb',
          colorInfo: '#2563eb',
          colorSuccess: '#10b981',
          colorWarning: '#f59e0b',
          colorError: '#ef4444',
          colorLink: '#2563eb',
          // 圆角更克制
          borderRadius: 8,
          borderRadiusLG: 10,
          borderRadiusSM: 6,
          // 字体
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          fontSize: 14,
          // 颜色
          colorText: '#0f172a',
          colorTextSecondary: '#475569',
          colorTextTertiary: '#64748b',
          colorTextQuaternary: '#94a3b8',
          colorBorder: '#e2e8f0',
          colorBorderSecondary: '#f1f5f9',
          colorBgContainer: '#ffffff',
          colorBgLayout: '#f8fafc',
          colorBgElevated: '#ffffff',
          // 阴影
          boxShadow: '0 1px 3px 0 rgb(15 23 42 / 0.06), 0 1px 2px -1px rgb(15 23 42 / 0.04)',
          boxShadowSecondary: '0 4px 12px -2px rgb(15 23 42 / 0.08), 0 2px 6px -2px rgb(15 23 42 / 0.04)',
          // 间距
          controlHeight: 34,
          controlHeightLG: 40,
          // 动效
          motionDurationMid: '0.15s',
          motionDurationSlow: '0.2s',
          // 线宽
          lineWidth: 1,
          wireframe: false,
        },
        components: {
          Layout: {
            siderBg: '#0b0f1a',
            headerBg: '#ffffff',
            headerHeight: 60,
            bodyBg: '#f8fafc',
          },
          Menu: {
            darkItemBg: 'transparent',
            darkSubMenuItemBg: 'transparent',
            darkItemSelectedBg: 'rgba(37, 99, 235, 0.18)',
            darkItemHoverBg: 'rgba(255, 255, 255, 0.04)',
            darkItemColor: '#94a3b8',
            darkItemSelectedColor: '#ffffff',
            itemHeight: 38,
            itemMarginInline: 8,
            itemBorderRadius: 8,
          },
          Card: {
            headerFontSize: 14,
            headerHeight: 48,
            paddingLG: 20,
          },
          Table: {
            headerBg: '#f8fafc',
            headerColor: '#475569',
            headerSplitColor: 'transparent',
            rowHoverBg: '#f8fafc',
            borderColor: '#f1f5f9',
          },
          Statistic: {
            contentFontSize: 22,
            titleFontSize: 12,
          },
          Button: {
            fontWeight: 500,
            primaryShadow: '0 1px 2px 0 rgb(37 99 235 / 0.16), inset 0 1px 0 0 rgb(255 255 255 / 0.12)',
            defaultBorderColor: '#e2e8f0',
            defaultBg: '#ffffff',
          },
          Tag: {
            defaultBg: '#f1f5f9',
            defaultColor: '#475569',
          },
          Tabs: {
            horizontalItemPadding: '10px 4px',
            horizontalMargin: '0 24px 0 0',
            inkBarColor: '#2563eb',
            itemSelectedColor: '#0f172a',
            itemColor: '#64748b',
            itemHoverColor: '#0f172a',
            titleFontSize: 14,
          },
          Steps: {
            colorPrimary: '#2563eb',
          },
          Modal: {
            borderRadiusLG: 14,
          },
        },
      }}
    >
      <AntdApp>
        <HashRouter>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </HashRouter>
      </AntdApp>
    </ConfigProvider>
  </React.StrictMode>,
)
