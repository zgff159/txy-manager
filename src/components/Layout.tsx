import React from 'react';
import { Layout as AntLayout, Menu, Typography } from 'antd';
import {
  DashboardOutlined,
  CloudServerOutlined,
  RocketOutlined,
  GlobalOutlined,
  SwapOutlined,
  DollarOutlined,
  CloudOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useAppStore, PageKey } from '../store/appStore';
import { useAccountStore } from '../store/accountStore';
import AccountSwitcher from './AccountSwitcher';

const { Sider, Content, Header } = AntLayout;
const { Text } = Typography;

const menuItems: { key: PageKey; icon: React.ReactNode; label: string }[] = [
  { key: 'dashboard', icon: <DashboardOutlined />, label: '总览' },
  { key: 'cvm', icon: <CloudServerOutlined />, label: '云服务器' },
  { key: 'lh', icon: <RocketOutlined />, label: '轻量服务器' },
  { key: 'domain', icon: <GlobalOutlined />, label: '域名管理' },
  { key: 'traffic', icon: <SwapOutlined />, label: '共享流量包' },
  { key: 'billing', icon: <DollarOutlined />, label: '费用账单' },
  { key: 'cos', icon: <CloudOutlined />, label: '对象存储' },
  { key: 'accounts', icon: <SettingOutlined />, label: '账号管理' },
];

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentPage, sidebarCollapsed, setCurrentPage, setSidebarCollapsed } = useAppStore();
  const currentAccountId = useAccountStore((s) => s.currentAccountId);
  const currentPageLabel = menuItems.find((m) => m.key === currentPage)?.label || '腾讯云管理器';
  const currentPageIcon = menuItems.find((m) => m.key === currentPage)?.icon;

  return (
    <AntLayout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      {/* 侧边栏 */}
      <Sider
        collapsible
        collapsed={sidebarCollapsed}
        onCollapse={setSidebarCollapsed}
        theme="dark"
        width={220}
        style={{
          background: 'linear-gradient(180deg, #0a1628 0%, #0d2141 40%, #0a1e3d 100%)',
          boxShadow: '2px 0 12px rgba(0,0,0,0.25)',
          overflow: 'hidden',
        }}
      >
        {/* Logo 区域 */}
        <div style={{
          height: 56,
          margin: '0 0 4px 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
          padding: sidebarCollapsed ? '0' : '0 20px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          gap: 10,
          flexShrink: 0,
        }}>
          {/* 云图标 */}
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: 'linear-gradient(135deg, #1677ff 0%, #0052d9 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 2px 8px rgba(0,82,217,0.5)',
          }}>
            <CloudOutlined style={{ color: '#fff', fontSize: 16 }} />
          </div>
          {!sidebarCollapsed && (
            <div style={{ overflow: 'hidden' }}>
              <div style={{
                color: '#ffffff',
                fontSize: 15,
                fontWeight: 700,
                lineHeight: '1.2',
                whiteSpace: 'nowrap',
                letterSpacing: '0.5px',
              }}>
                腾讯云管理器
              </div>
              <div style={{
                color: 'rgba(255,255,255,0.35)',
                fontSize: 10,
                whiteSpace: 'nowrap',
              }}>
                Tencent Cloud Manager
              </div>
            </div>
          )}
        </div>

        {/* 账号切换器 */}
        <AccountSwitcher collapsed={sidebarCollapsed} />

        {/* 导航菜单 */}
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[currentPage]}
          items={menuItems.map((item) => ({
            key: item.key,
            icon: item.icon,
            label: item.label,
          }))}
          onClick={({ key }) => setCurrentPage(key as PageKey)}
          disabled={!currentAccountId && currentPage !== 'accounts'}
          style={{
            background: 'transparent',
            border: 'none',
            marginTop: 4,
            flex: 1,
          }}
        />

        {/* 底部版本信息 */}
        {!sidebarCollapsed && (
          <div style={{
            padding: '12px 20px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            color: 'rgba(255,255,255,0.2)',
            fontSize: 11,
            textAlign: 'center',
          }}>
            v1.0.0
          </div>
        )}
      </Sider>

      <AntLayout style={{ background: '#f0f2f5' }}>
        {/* 顶部 Header */}
        <Header style={{
          background: '#ffffff',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #eef0f4',
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
          height: 56,
          lineHeight: '56px',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}>
          {/* 页面标题 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              color: '#0052d9',
              fontSize: 18,
              display: 'flex',
              alignItems: 'center',
            }}>
              {currentPageIcon}
            </span>
            <Text style={{
              fontSize: 16,
              fontWeight: 600,
              color: '#1a1a2e',
              lineHeight: '56px',
            }}>
              {currentPageLabel}
            </Text>
          </div>

          {/* 右侧信息区域 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {currentAccountId && (
              <div style={{
                background: '#f0f5ff',
                border: '1px solid #d0e4ff',
                borderRadius: 20,
                padding: '3px 12px',
                fontSize: 12,
                color: '#0052d9',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}>
                <div style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#52c41a',
                  animation: 'pulse 2s infinite',
                }} />
                已连接
              </div>
            )}
          </div>
        </Header>

        {/* 主内容区 */}
        <Content style={{
          margin: '20px 20px 20px 20px',
          padding: '0',
          overflow: 'auto',
          minHeight: 'calc(100vh - 56px - 40px)',
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: 12,
            padding: '24px',
            minHeight: '100%',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}>
            {children}
          </div>
        </Content>
      </AntLayout>
    </AntLayout>
  );
};

export default AppLayout;
