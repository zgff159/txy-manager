import React, { useEffect, useState, useCallback } from 'react';
import { Table, Button, Space, Tag, message, Empty, Alert, Drawer, Modal, Form, Select, Input, Popconfirm } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, ReloadOutlined, SafetyOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useAccountStore } from '../store/accountStore';
import { useAppStore } from '../store/appStore';
import RegionSelector from '../components/RegionSelector';
import type { LighthouseInstance, FirewallRule } from '../types';

const stateColors: Record<string, string> = {
  RUNNING: 'green',
  STOPPED: 'red',
  STOPPING: 'orange',
  STARTING: 'blue',
  REBOOTING: 'orange',
  PENDING: 'default',
  TERMINATING: 'red',
  SHUTDOWN: 'red',
};

const platformLabels: Record<string, string> = {
  LINUX_UNIX: 'Linux',
  WINDOWS: 'Windows',
};

const LighthousePage: React.FC = () => {
  const currentAccountId = useAccountStore((s) => s.currentAccountId);
  const selectedRegion = useAppStore((s) => s.selectedRegion);
  const [instances, setInstances] = useState<LighthouseInstance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [firewallVisible, setFirewallVisible] = useState(false);
  const [firewallRules, setFirewallRules] = useState<FirewallRule[]>([]);
  const [fwLoading, setFwLoading] = useState(false);
  const [fwVersion, setFwVersion] = useState(0);
  const [currentInstance, setCurrentInstance] = useState<LighthouseInstance | null>(null);

  const fetchInstances = useCallback(() => {
    if (!currentAccountId) return;
    setLoading(true);
    setError('');
    window.api.lh.describeInstances(currentAccountId, selectedRegion)
      .then(setInstances)
      .catch((e) => setError(e.message || '加载失败'))
      .finally(() => setLoading(false));
  }, [currentAccountId, selectedRegion]);

  useEffect(() => { fetchInstances(); }, [fetchInstances]);

  const operate = async (instanceIds: string[], op: 'START' | 'STOP' | 'REBOOT') => {
    const label = { START: '启动', STOP: '停止', REBOOT: '重启' }[op];
    try {
      if (op === 'START') await window.api.lh.startInstances(currentAccountId!, selectedRegion, instanceIds);
      else if (op === 'STOP') await window.api.lh.stopInstances(currentAccountId!, selectedRegion, instanceIds);
      else await window.api.lh.rebootInstances(currentAccountId!, selectedRegion, instanceIds);
      message.success(`${label}指令已提交`);
      setSelectedRowKeys([]);
      setTimeout(fetchInstances, 3000);
    } catch (e: any) {
      message.error(e.message || `${label}失败`);
    }
  };

  // Firewall add modal
  const [fwAddOpen, setFwAddOpen] = useState(false);
  const [fwForm] = Form.useForm();

  const showFirewall = async (instance: LighthouseInstance) => {
    setCurrentInstance(instance);
    setFirewallVisible(true);
    setFwLoading(true);
    try {
      const result = await window.api.lh.describeFirewallRules(currentAccountId!, selectedRegion, instance.instanceId);
      setFirewallRules(result.rules || []);
      setFwVersion(result.firewallVersion || 0);
    } catch (e: any) {
      message.error(e.message || '获取防火墙规则失败');
    } finally {
      setFwLoading(false);
    }
  };

  const handleAddFwRule = async () => {
    if (!currentInstance || !currentAccountId) return;
    const values = await fwForm.validateFields();
    try {
      await window.api.lh.createFirewallRule(
        currentAccountId, selectedRegion, currentInstance.instanceId,
        values.protocol, values.port, values.cidrBlock, values.action, values.description || '', fwVersion
      );
      message.success('防火墙规则已添加');
      setFwAddOpen(false);
      fwForm.resetFields();
      showFirewall(currentInstance);
    } catch (e: any) {
      message.error(e.message || '添加失败');
    }
  };

  const handleDelFwRule = async (rule: any) => {
    if (!currentInstance || !currentAccountId) return;
    try {
      await window.api.lh.deleteFirewallRule(
        currentAccountId, selectedRegion, currentInstance.instanceId,
        rule.protocol, rule.port, rule.cidrBlock, rule.action, fwVersion
      );
      message.success('规则已删除');
      showFirewall(currentInstance);
    } catch (e: any) {
      message.error(e.message || '删除失败');
    }
  };

  if (!currentAccountId) {
    return <Empty description="请先选择账号" />;
  }

  return (
    <div>
      {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} closable onClose={() => setError('')} />}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <Space>
          <RegionSelector />
          <Button icon={<ReloadOutlined />} onClick={fetchInstances}>刷新</Button>
        </Space>
        <Space>
          <Button icon={<PlayCircleOutlined />} disabled={selectedRowKeys.length === 0}
            onClick={() => operate(selectedRowKeys as string[], 'START')}>
            启动
          </Button>
          <Button icon={<PauseCircleOutlined />} disabled={selectedRowKeys.length === 0}
            onClick={() => operate(selectedRowKeys as string[], 'STOP')}>
            停止
          </Button>
          <Button icon={<ReloadOutlined />} disabled={selectedRowKeys.length === 0}
            onClick={() => operate(selectedRowKeys as string[], 'REBOOT')}>
            重启
          </Button>
        </Space>
      </div>
      <Table
        dataSource={instances}
        rowKey="instanceId"
        loading={loading}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
        }}
        columns={[
          { title: '实例名称', dataIndex: 'instanceName', key: 'name', width: 150 },
          { title: '实例 ID', dataIndex: 'instanceId', key: 'id', width: 160 },
          {
            title: '状态', dataIndex: 'instanceState', key: 'state', width: 100,
            render: (s: string) => <Tag color={stateColors[s] || 'default'}>{s}</Tag>,
          },
          { title: 'CPU/内存', key: 'spec', width: 100,
            render: (_: any, r: LighthouseInstance) => `${r.cpu}核 ${r.memory}GB` },
          { title: '系统', key: 'os', width: 100,
            render: (_: any, r: LighthouseInstance) => platformLabels[r.platformType] || r.platform || '-' },
          { title: '公网 IP', dataIndex: 'publicAddresses', key: 'pubIp', width: 140,
            render: (ips: string[]) => ips?.join(', ') || '-' },
          {
            title: '带宽', key: 'bw', width: 80,
            render: (_: any, r: LighthouseInstance) =>
              r.internetAccessible ? `${r.internetAccessible.internetMaxBandwidthOut}Mbps` : '-',
          },
          { title: '可用区', dataIndex: 'zone', key: 'zone', width: 120 },
          { title: '到期时间', dataIndex: 'expiredTime', key: 'expire', width: 180,
            render: (v: string) => v ? new Date(v).toLocaleString('zh-CN') : '-' },
          {
            title: '操作', key: 'actions', width: 80,
            render: (_: any, record: LighthouseInstance) => (
              <Button type="link" icon={<SafetyOutlined />} onClick={() => showFirewall(record)}>
                防火墙
              </Button>
            ),
          },
        ]}
        scroll={{ x: 1300 }}
      />
      <Drawer
        title={currentInstance ? `${currentInstance.instanceName} 防火墙规则` : '防火墙规则'}
        open={firewallVisible}
        onClose={() => setFirewallVisible(false)}
        width={620}
      >
        <div style={{ marginBottom: 12 }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { fwForm.resetFields(); setFwAddOpen(true); }}>添加规则</Button>
        </div>
        <Table
          dataSource={firewallRules}
          rowKey={(r) => `${r.protocol}-${r.port}-${r.cidrBlock}`}
          loading={fwLoading}
          pagination={false}
          size="small"
          columns={[
            { title: '协议', dataIndex: 'protocol', key: 'protocol', width: 70 },
            { title: '端口', dataIndex: 'port', key: 'port', width: 90 },
            { title: '来源', dataIndex: 'cidrBlock', key: 'cidr', width: 150, ellipsis: true },
            {
              title: '策略', dataIndex: 'action', key: 'action', width: 70,
              render: (v: string) => <Tag color={v === 'ACCEPT' ? 'green' : 'red'}>{v === 'ACCEPT' ? '允许' : '拒绝'}</Tag>,
            },
            { title: '备注', dataIndex: 'firewallRuleDescription', key: 'desc', ellipsis: true },
            {
              title: '', key: 'del', width: 40,
              render: (_: any, r: any) => (
                <Popconfirm title="删除此规则？" onConfirm={() => handleDelFwRule(r)} okText="删除" cancelText="取消">
                  <Button type="link" size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              ),
            },
          ]}
        />
      </Drawer>

      {/* Firewall Add Modal */}
      <Modal
        title="添加防火墙规则"
        open={fwAddOpen}
        onOk={handleAddFwRule}
        onCancel={() => setFwAddOpen(false)}
        okText="添加"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={fwForm} layout="vertical" initialValues={{ action: 'ACCEPT', protocol: 'TCP', port: '80', cidrBlock: '0.0.0.0/0' }}>
          <Form.Item name="protocol" label="协议" rules={[{ required: true }]}>
            <Select options={['TCP', 'UDP', 'ICMP', 'ALL'].map((v) => ({ label: v, value: v }))} />
          </Form.Item>
          <Form.Item name="port" label="端口" rules={[{ required: true }]}>
            <Input placeholder="如：80 或 ALL" />
          </Form.Item>
          <Form.Item name="cidrBlock" label="来源 IP" rules={[{ required: true }]}>
            <Input placeholder="如：0.0.0.0/0" />
          </Form.Item>
          <Form.Item name="action" label="策略" rules={[{ required: true }]}>
            <Select options={[{ label: '允许 (ACCEPT)', value: 'ACCEPT' }, { label: '拒绝 (DROP)', value: 'DROP' }]} />
          </Form.Item>
          <Form.Item name="description" label="备注">
            <Input placeholder="规则描述（可选）" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default LighthousePage;
