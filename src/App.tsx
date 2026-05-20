import React, { Component, useEffect } from 'react';
import { ConfigProvider, theme, Button, Result } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import AppLayout from './components/Layout';
import { useAppStore } from './store/appStore';
import { useAccountStore } from './store/accountStore';
import Dashboard from './pages/Dashboard';
import CVM from './pages/CVM';
import Lighthouse from './pages/Lighthouse';
import Domain from './pages/Domain';
import Traffic from './pages/Traffic';
import Billing from './pages/Billing';
import COS from './pages/COS';
import Accounts from './pages/Accounts';

const pageComponents: Record<string, React.FC> = {
  dashboard: Dashboard,
  cvm: CVM,
  lh: Lighthouse,
  domain: Domain,
  traffic: Traffic,
  billing: Billing,
  cos: COS,
  accounts: Accounts,
};

class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean; error: string }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: '' };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message || String(error) };
  }
  render() {
    if (this.state.hasError) {
      return (
        <ConfigProvider locale={zhCN}>
          <Result
            status="error"
            title="页面出错"
            subTitle={this.state.error}
            extra={<Button type="primary" onClick={() => this.setState({ hasError: false, error: '' })}>重试</Button>}
          />
        </ConfigProvider>
      );
    }
    return this.props.children;
  }
}

const App: React.FC = () => {
  const currentPage = useAppStore((s) => s.currentPage);
  const PageComponent = pageComponents[currentPage] || Dashboard;
  const loadAccounts = useAccountStore((s) => s.loadAccounts);

  useEffect(() => {
    loadAccounts();
  }, []);

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          // 主色：腾讯云蓝（更鲜亮现代）
          colorPrimary: '#0052d9',
          colorLink: '#0052d9',
          // 圆角加大，更圆润
          borderRadius: 8,
          borderRadiusLG: 12,
          borderRadiusSM: 6,
          // 字体
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", Roboto, sans-serif',
          fontSize: 14,
          // 背景
          colorBgLayout: '#f0f2f5',
          colorBgContainer: '#ffffff',
          // 阴影
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          boxShadowSecondary: '0 6px 16px rgba(0,0,0,0.12)',
        },
        components: {
          Menu: {
            darkItemBg: 'transparent',
            darkSubMenuItemBg: 'transparent',
            darkItemSelectedBg: 'rgba(255,255,255,0.12)',
            darkItemHoverBg: 'rgba(255,255,255,0.08)',
          },
          Card: {
            headerBg: 'transparent',
          },
          Table: {
            headerBg: '#f8f9fb',
            rowHoverBg: '#f0f5ff',
          },
          Button: {
            borderRadius: 8,
          },
          Tag: {
            borderRadius: 6,
          },
        },
      }}
    >
      <ErrorBoundary>
        <AppLayout>
          <PageComponent />
        </AppLayout>
      </ErrorBoundary>
    </ConfigProvider>
  );
};

export default App;
