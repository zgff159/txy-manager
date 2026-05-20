import React, { useEffect, useState } from 'react';
import { Card, Col, Row, Spin, Empty, Alert, Space, Button, Typography } from 'antd';
import {
  CloudServerOutlined, DollarOutlined, CloudOutlined, ReloadOutlined,
  CheckCircleOutlined, StopOutlined, SyncOutlined, ClockCircleOutlined,
} from '@ant-design/icons';
import { useAccountStore } from '../store/accountStore';
import { useAppStore } from '../store/appStore';
import RegionSelector from '../components/RegionSelector';
import type { CVMInstance, COSBucket, BillingInfo } from '../types';

const { Text, Title } = Typography;

const stateLabels: Record<string, string> = {
  RUNNING: '运行中',
  STOPPED: '已关机',
  STOPPING: '关机中',
  STARTING: '开机中',
  REBOOTING: '重启中',
  PENDING: '创建中',
  TERMINATING: '销毁中',
  SHUTDOWN: '已停止',
};

// 渐变色卡片配置
const statCardConfigs = [
  {
    key: 'cvm',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    shadowColor: 'rgba(102, 126, 234, 0.4)',
    icon: <CloudServerOutlined style={{ fontSize: 28, color: 'rgba(255,255,255,0.9)' }} />,
    bgIcon: <CloudServerOutlined style={{ fontSize: 80, color: 'rgba(255,255,255,0.08)', position: 'absolute', right: -10, bottom: -10 }} />,
  },
  {
    key: 'balance',
    gradient: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
    shadowColor: 'rgba(246, 211, 101, 0.4)',
    icon: <DollarOutlined style={{ fontSize: 28, color: 'rgba(255,255,255,0.9)' }} />,
    bgIcon: <DollarOutlined style={{ fontSize: 80, color: 'rgba(255,255,255,0.08)', position: 'absolute', right: -10, bottom: -10 }} />,
  },
  {
    key: 'cos',
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    shadowColor: 'rgba(79, 172, 254, 0.4)',
    icon: <CloudOutlined style={{ fontSize: 28, color: 'rgba(255,255,255,0.9)' }} />,
    bgIcon: <CloudOutlined style={{ fontSize: 80, color: 'rgba(255,255,255,0.08)', position: 'absolute', right: -10, bottom: -10 }} />,
  },
];

// 实例状态徽章配置
const stateChipConfigs: { key: string; label: string; color: string; bg: string; icon: React.ReactNode }[] = [
  { key: 'RUNNING', label: '运行中', color: '#389e0d', bg: '#f6ffed', icon: <CheckCircleOutlined /> },
  { key: 'STOPPED', label: '已关机', color: '#cf1322', bg: '#fff1f0', icon: <StopOutlined /> },
  { key: 'STARTING', label: '开机中', color: '#0958d9', bg: '#e6f4ff', icon: <SyncOutlined spin /> },
  { key: 'STOPPING', label: '关机中', color: '#d46b08', bg: '#fff7e6', icon: <SyncOutlined spin /> },
  { key: 'REBOOTING', label: '重启中', color: '#7c3aed', bg: '#f5f3ff', icon: <SyncOutlined spin /> },
  { key: 'PENDING', label: '创建中', color: '#6b7280', bg: '#f9fafb', icon: <ClockCircleOutlined /> },
];

const Dashboard: React.FC = () => {
  const currentAccountId = useAccountStore((s) => s.currentAccountId);
  const selectedRegion = useAppStore((s) => s.selectedRegion);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [instances, setInstances] = useState<CVMInstance[]>([]);
  const [balance, setBalance] = useState<BillingInfo | null>(null);
  const [buckets, setBuckets] = useState<COSBucket[]>([]);

  const fetchAll = () => {
    if (!currentAccountId) return;
    setLoading(true);
    setError('');
    Promise.all([
      window.api.cvm.describeInstances(currentAccountId, selectedRegion),
      window.api.billing.getBalance(currentAccountId),
      window.api.cos.listBuckets(currentAccountId),
    ]).then(([cvms, bal, bks]) => {
      setInstances(cvms || []);
      setBalance(bal);
      setBuckets(bks || []);
    }).catch((e) => {
      setError(e?.message || e?.Message || String(e) || '数据加载失败');
    }).finally(() => {
      setLoading(false);
    });
  };

  useEffect(() => { fetchAll(); }, [currentAccountId, selectedRegion]);

  if (!currentAccountId) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <Text type="secondary" style={{ fontSize: 14 }}>
            请先在侧边栏选择账号，或在「账号管理」中添加账号
          </Text>
        }
        style={{ padding: '60px 0' }}
      />
    );
  }

  const runningCount = instances.filter((i) => i.instanceState === 'RUNNING').length;

  return (
    <div>
      {error && (
        <Alert
          message={error}
          type="error"
          showIcon
          style={{ marginBottom: 20, borderRadius: 8 }}
          closable
          onClose={() => setError('')}
        />
      )}

      {/* 工具栏 */}
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={5} style={{ margin: 0, color: '#1a1a2e', fontSize: 16 }}>资源总览</Title>
          <Text type="secondary" style={{ fontSize: 12 }}>实时展示当前账号下的云资源状态</Text>
        </div>
        <Space>
          <RegionSelector />
          <Button icon={<ReloadOutlined />} onClick={fetchAll} loading={loading}>刷新</Button>
        </Space>
      </div>

      <Spin spinning={loading}>
        {/* 核心统计卡片 */}
        <Row gutter={[16, 16]}>
          {/* CVM 实例卡 */}
          <Col xs={24} sm={8}>
            <div style={{
              background: statCardConfigs[0].gradient,
              borderRadius: 12,
              padding: '20px 24px',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: `0 8px 24px ${statCardConfigs[0].shadowColor}`,
              cursor: 'default',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; }}
            >
              {statCardConfigs[0].bgIcon}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
                <div>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 8 }}>
                    CVM 实例总数 · {selectedRegion}
                  </div>
                  <div style={{ color: '#fff', fontSize: 36, fontWeight: 700, lineHeight: 1 }}>
                    {instances.length}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 8 }}>
                    {runningCount > 0 ? `🟢 ${runningCount} 台运行中` : '暂无运行实例'}
                  </div>
                </div>
                <div style={{
                  width: 52, height: 52, borderRadius: 12,
                  background: 'rgba(255,255,255,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backdropFilter: 'blur(4px)',
                }}>
                  {statCardConfigs[0].icon}
                </div>
              </div>
            </div>
          </Col>

          {/* 账户余额卡 */}
          <Col xs={24} sm={8}>
            <div style={{
              background: statCardConfigs[1].gradient,
              borderRadius: 12,
              padding: '20px 24px',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: `0 8px 24px ${statCardConfigs[1].shadowColor}`,
              cursor: 'default',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; }}
            >
              {statCardConfigs[1].bgIcon}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
                <div>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 8 }}>
                    账户余额
                  </div>
                  <div style={{ color: '#fff', fontSize: 36, fontWeight: 700, lineHeight: 1 }}>
                    {balance ? (balance.realBalance / 100).toFixed(2) : '--'}
                    <span style={{ fontSize: 16, fontWeight: 400, marginLeft: 4 }}>元</span>
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 8 }}>
                    💰 可用现金余额
                  </div>
                </div>
                <div style={{
                  width: 52, height: 52, borderRadius: 12,
                  background: 'rgba(255,255,255,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backdropFilter: 'blur(4px)',
                }}>
                  {statCardConfigs[1].icon}
                </div>
              </div>
            </div>
          </Col>

          {/* COS 桶卡 */}
          <Col xs={24} sm={8}>
            <div style={{
              background: statCardConfigs[2].gradient,
              borderRadius: 12,
              padding: '20px 24px',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: `0 8px 24px ${statCardConfigs[2].shadowColor}`,
              cursor: 'default',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; }}
            >
              {statCardConfigs[2].bgIcon}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
                <div>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 8 }}>
                    COS 存储桶
                  </div>
                  <div style={{ color: '#fff', fontSize: 36, fontWeight: 700, lineHeight: 1 }}>
                    {buckets.length}
                    <span style={{ fontSize: 16, fontWeight: 400, marginLeft: 4 }}>个</span>
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 8 }}>
                    ☁️ 对象存储桶总数
                  </div>
                </div>
                <div style={{
                  width: 52, height: 52, borderRadius: 12,
                  background: 'rgba(255,255,255,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backdropFilter: 'blur(4px)',
                }}>
                  {statCardConfigs[2].icon}
                </div>
              </div>
            </div>
          </Col>
        </Row>

        {/* 实例状态分布卡片 */}
        <Card
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <SyncOutlined style={{ color: '#0052d9' }} />
              <span style={{ fontWeight: 600 }}>实例状态分布</span>
            </div>
          }
          style={{ marginTop: 16 }}
          styles={{ header: { borderBottom: '1px solid #f0f0f0' } }}
        >
          <Row gutter={[12, 12]}>
            {stateChipConfigs.map(({ key, label, color, bg, icon }) => {
              const count = instances.filter((i) => i.instanceState === key).length;
              return (
                <Col key={key} xs={12} sm={8} md={4}>
                  <div style={{
                    background: bg,
                    border: `1px solid ${color}22`,
                    borderRadius: 10,
                    padding: '14px 16px',
                    textAlign: 'center',
                    transition: 'all 0.2s ease',
                  }}>
                    <div style={{ color, fontSize: 20, marginBottom: 4 }}>{icon}</div>
                    <div style={{ color, fontSize: 24, fontWeight: 700 }}>{count}</div>
                    <div style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>{label}</div>
                  </div>
                </Col>
              );
            })}
          </Row>
        </Card>
      </Spin>
    </div>
  );
};

export default Dashboard;
