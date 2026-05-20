import React, { useEffect, useState, useCallback, lazy, Suspense } from 'react';
import { Table, Button, Space, Tag, message, Empty, Alert, Modal, Form, Input, Select, Drawer, Descriptions, Spin, Popconfirm } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, ReloadOutlined, CodeOutlined, DesktopOutlined, InfoCircleOutlined, SafetyOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useAccountStore } from '../store/accountStore';
import { useAppStore } from '../store/appStore';
import RegionSelector from '../components/RegionSelector';
import type { CVMInstance } from '../types';

const SSHTerminal = lazy(() => import('../components/SSHTerminal'));

const stateColors: Record<string, string> = {
  RUNNING: 'green', STOPPED: 'red', STOPPING: 'orange',
  STARTING: 'blue', REBOOTING: 'orange', PENDING: 'default', TERMINATING: 'red',
};

const CVM: React.FC = () => {
  const currentAccountId = useAccountStore((s) => s.currentAccountId);
  const selectedRegion = useAppStore((s) => s.selectedRegion);
  const [instances, setInstances] = useState<CVMInstance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // SSH modal
  const [sshModalOpen, setSshModalOpen] = useState(false);
  const [sshTarget, setSshTarget] = useState<CVMInstance | null>(null);
  const [sshConnId, setSshConnId] = useState('');
  const [sshForm] = Form.useForm();

  // Detail drawer
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTarget, setDetailTarget] = useState<CVMInstance | null>(null);
  const [sgLoading, setSgLoading] = useState(false);
  const [sgList, setSgList] = useState<any[]>([]);

  // Firewall in detail
  const [fwPolicies, setFwPolicies] = useState<any[]>([]);
  const [fwLoading, setFwLoading] = useState(false);
  const [fwModalOpen, setFwModalOpen] = useState(false);
  const [fwCurrentSgId, setFwCurrentSgId] = useState('');
  const [fwForm] = Form.useForm();

  const loadPolicies = async (sgId: string) => {
    if (!currentAccountId) return;
    setFwCurrentSgId(sgId);
    setFwLoading(true);
    try {
      const result = await window.api.cvm.describeSecurityGroupPolicies(currentAccountId, selectedRegion, sgId);
      setFwPolicies(result.policies);
    } catch (e: any) {
      message.error(e.message || '加载防火墙规则失败');
    } finally {
      setFwLoading(false);
    }
  };

  const addFwRule = async () => {
    const values = await fwForm.validateFields();
    try {
      await window.api.cvm.createSecurityGroupPolicy(
        currentAccountId!, selectedRegion, fwCurrentSgId,
        values.direction, values.protocol, values.port, values.cidrBlock, values.action, values.description || ''
      );
      message.success('规则添加成功');
      setFwModalOpen(false);
      fwForm.resetFields();
      loadPolicies(fwCurrentSgId);
    } catch (e: any) {
      message.error(e.message || '添加失败');
    }
  };

  const delFwRule = async (direction: string, policyIndex: number) => {
    try {
      await window.api.cvm.deleteSecurityGroupPolicy(currentAccountId!, selectedRegion, fwCurrentSgId, direction, policyIndex);
      message.success('规则已删除');
      loadPolicies(fwCurrentSgId);
    } catch (e: any) {
      message.error(e.message || '删除失败');
    }
  };

  const fetchInstances = useCallback(() => {
    if (!currentAccountId) return;
    setLoading(true);
    setError('');
    window.api.cvm.describeInstances(currentAccountId, selectedRegion)
      .then(setInstances)
      .catch((e) => setError(e.message || '加载失败'))
      .finally(() => setLoading(false));
  }, [currentAccountId, selectedRegion]);

  useEffect(() => { fetchInstances(); }, [fetchInstances]);

  const operate = async (instanceIds: string[], op: 'START' | 'STOP' | 'REBOOT') => {
    const label = { START: '启动', STOP: '停止', REBOOT: '重启' }[op];
    try {
      if (op === 'START') await window.api.cvm.startInstances(currentAccountId!, selectedRegion, instanceIds);
      else if (op === 'STOP') await window.api.cvm.stopInstances(currentAccountId!, selectedRegion, instanceIds);
      else await window.api.cvm.rebootInstances(currentAccountId!, selectedRegion, instanceIds);
      message.success(`${label}指令已提交`);
      setSelectedRowKeys([]);
      setTimeout(fetchInstances, 3000);
    } catch (e: any) {
      message.error(e.message || `${label}失败`);
    }
  };

  const openSsh = (instance: CVMInstance) => {
    if (!instance.publicIpAddresses?.length) {
      message.warning('该实例没有公网 IP，无法 SSH 连接');
      return;
    }
    setSshTarget(instance);
    setSshConnId(`ssh-${instance.instanceId}-${Date.now()}`);
    setSshModalOpen(true);
  };

  const startSsh = async () => {
    const values = await sshForm.validateFields();
    setSshModalOpen(false); // close form, show terminal
    setTimeout(() => setSshModalOpen(true), 50); // reopen with terminal
  };

  const handleReset = async (instance: CVMInstance) => {
    try {
      await window.api.cvm.resetInstance(currentAccountId!, selectedRegion, instance.instanceId);
      message.success('重装指令已提交');
      setTimeout(fetchInstances, 5000);
    } catch (e: any) { message.error(e.message || '重装失败'); }
  };

  const openVnc = async (instance: CVMInstance) => {
    try {
      const result = await window.api.cvm.describeVncUrl(currentAccountId!, selectedRegion, instance.instanceId);
      if (result.vncUrl) {
        window.api.shell.openExternal(result.vncUrl);
        message.success('正在打开 VNC 控制台...');
      } else {
        message.error('获取 VNC 地址失败');
      }
    } catch (e: any) {
      message.error(e.message || '获取 VNC 失败');
    }
  };

  const showDetail = async (instance: CVMInstance) => {
    setDetailTarget(instance);
    setDetailOpen(true);
    if (instance.securityGroupIds?.length) {
      setSgLoading(true);
      try {
        const sgs = await window.api.cvm.describeSecurityGroups(currentAccountId!, selectedRegion, instance.securityGroupIds);
        setSgList(sgs);
      } catch { setSgList([]); }
      finally { setSgLoading(false); }
    } else {
      setSgList([]);
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
            onClick={() => operate(selectedRowKeys as string[], 'START')}>启动</Button>
          <Button icon={<PauseCircleOutlined />} disabled={selectedRowKeys.length === 0}
            onClick={() => operate(selectedRowKeys as string[], 'STOP')}>停止</Button>
          <Button icon={<ReloadOutlined />} disabled={selectedRowKeys.length === 0}
            onClick={() => operate(selectedRowKeys as string[], 'REBOOT')}>重启</Button>
        </Space>
      </div>
      <Table
        dataSource={instances}
        rowKey="instanceId"
        loading={loading}
        rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
        columns={[
          { title: '实例名称', dataIndex: 'instanceName', key: 'name', width: 150 },
          { title: '实例 ID', dataIndex: 'instanceId', key: 'id', width: 160 },
          { title: '状态', dataIndex: 'instanceState', key: 'state', width: 90,
            render: (s: string) => <Tag color={stateColors[s] || 'default'}>{s}</Tag> },
          { title: '机型', dataIndex: 'instanceType', key: 'type', width: 130 },
          { title: 'CPU/内存', key: 'spec', width: 90,
            render: (_: any, r: CVMInstance) => `${r.cpu}核 ${r.memory}GB` },
          { title: '公网 IP', dataIndex: 'publicIpAddresses', key: 'pubIp', width: 140,
            render: (ips: string[]) => ips?.join(', ') || <span style={{ color: '#999' }}>无</span> },
          { title: '可用区', dataIndex: 'zone', key: 'zone', width: 110 },
          { title: '到期时间', dataIndex: 'expiredTime', key: 'expire', width: 170,
            render: (v: string) => v ? new Date(v).toLocaleString('zh-CN') : '-' },
          {
            title: '操作', key: 'actions', width: 200,
            render: (_: any, record: CVMInstance) => (
              <Space size="small">
                <Button type="link" size="small" icon={<CodeOutlined />}
                  onClick={() => openSsh(record)}>SSH</Button>
                <Button type="link" size="small" icon={<DesktopOutlined />}
                  onClick={() => openVnc(record)}>VNC</Button>
                <Button type="link" size="small" icon={<InfoCircleOutlined />}
                  onClick={() => showDetail(record)}>详情</Button>
                <Popconfirm
                  title="重装系统会清空系统盘数据！"
                  description="确定要继续吗？"
                  onConfirm={() => handleReset(record)}
                  okText="确定重装"
                  okType="danger"
                  cancelText="取消"
                >
                  <Button type="link" size="small" danger icon={<ReloadOutlined />}>重装</Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
        scroll={{ x: 1300 }}
      />

      {/* SSH Modal */}
      <Modal
        title={sshTarget ? `SSH 连接 - ${sshTarget.instanceName} (${sshTarget.publicIpAddresses?.[0] || '无公网IP'})` : 'SSH 连接'}
        open={sshModalOpen}
        onCancel={() => { setSshModalOpen(false); setSshTarget(null); }}
        footer={null}
        width={800}
        destroyOnClose
      >
        {sshTarget && sshForm.getFieldValue('_submitted') ? (
          <Suspense fallback={<div style={{ textAlign: 'center', padding: 40 }}>加载终端...</div>}>
            <SSHTerminal
              connId={sshConnId}
              accountId={currentAccountId!}
              instanceId={sshTarget.instanceId}
              region={selectedRegion}
              username={sshForm.getFieldValue('username')}
              password={sshForm.getFieldValue('password')}
              onClose={() => setSshModalOpen(false)}
            />
          </Suspense>
        ) : (
          <Form form={sshForm} layout="vertical" onFinish={startSsh}>
            <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}
              initialValue="root">
              <Input placeholder="root" />
            </Form.Item>
            <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
              <Input.Password placeholder="实例登录密码" />
            </Form.Item>
            <Form.Item name="_submitted" hidden initialValue={true}>
              <Input />
            </Form.Item>
            <Button type="primary" htmlType="submit" block>连接</Button>
          </Form>
        )}
      </Modal>

      {/* Detail Drawer */}
      <Drawer
        title={detailTarget ? `${detailTarget.instanceName} 详情` : '实例详情'}
        open={detailOpen}
        onClose={() => { setDetailOpen(false); setDetailTarget(null); }}
        width={560}
      >
        {detailTarget && (
          <Descriptions column={2} size="small" bordered>
            <Descriptions.Item label="实例 ID" span={2}>{detailTarget.instanceId}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={stateColors[detailTarget.instanceState] || 'default'}>{detailTarget.instanceState}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="机型">{detailTarget.instanceType}</Descriptions.Item>
            <Descriptions.Item label="CPU">{detailTarget.cpu} 核</Descriptions.Item>
            <Descriptions.Item label="内存">{detailTarget.memory} GB</Descriptions.Item>
            <Descriptions.Item label="公网 IP" span={2}>
              {detailTarget.publicIpAddresses?.join(', ') || '无'}
            </Descriptions.Item>
            <Descriptions.Item label="私网 IP" span={2}>
              {detailTarget.privateIpAddresses?.join(', ') || '无'}
            </Descriptions.Item>
            <Descriptions.Item label="操作系统" span={2}>{detailTarget.osName}</Descriptions.Item>
            <Descriptions.Item label="系统盘">
              {detailTarget.systemDisk ? `${detailTarget.systemDisk.diskType} ${detailTarget.systemDisk.diskSize}GB` : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="可用区">{detailTarget.zone}</Descriptions.Item>
            {(detailTarget as any).dataDisks?.length > 0 && (
              <Descriptions.Item label="数据盘" span={2}>
                {(detailTarget as any).dataDisks.map((d: any, i: number) =>
                  <div key={i}>{d.diskType} {d.diskSize}GB ({d.diskId})</div>
                )}
              </Descriptions.Item>
            )}
            {(detailTarget as any).vpcId && (
              <>
                <Descriptions.Item label="VPC">{(detailTarget as any).vpcId}</Descriptions.Item>
                <Descriptions.Item label="子网">{(detailTarget as any).subnetId}</Descriptions.Item>
              </>
            )}
            <Descriptions.Item label="创建时间" span={2}>
              {detailTarget.createdTime ? new Date(detailTarget.createdTime).toLocaleString('zh-CN') : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="到期时间" span={2}>
              {detailTarget.expiredTime ? new Date(detailTarget.expiredTime).toLocaleString('zh-CN') : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="安全组" span={2}>
              {sgLoading ? <Spin size="small" /> : (
                sgList.length > 0 ? sgList.map((sg: any) => (
                  <Tag key={sg.securityGroupId} style={{ cursor: 'pointer' }}
                    color={fwCurrentSgId === sg.securityGroupId ? 'blue' : undefined}
                    onClick={() => loadPolicies(sg.securityGroupId)}>
                    {sg.securityGroupName}
                  </Tag>
                )) : <span style={{ color: '#999' }}>无</span>
              )}
            </Descriptions.Item>
          </Descriptions>
        )}
        {fwCurrentSgId && (
          <>
            <div style={{ marginTop: 16, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: 14 }}>防火墙规则</strong>
              <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => { fwForm.resetFields(); setFwModalOpen(true); }}>
                添加规则
              </Button>
            </div>
            <Table
              dataSource={fwPolicies}
              rowKey={(r: any) => `${r.direction}-${r.PolicyIndex || r.Priority || Math.random()}`}
              loading={fwLoading}
              size="small"
              pagination={false}
              columns={[
                { title: '方向', dataIndex: 'direction', key: 'dir', width: 60,
                  render: (v: string) => <Tag color={v === 'ingress' ? 'green' : 'orange'}>{v === 'ingress' ? '入站' : '出站'}</Tag> },
                { title: '协议', dataIndex: 'Protocol', key: 'proto', width: 70 },
                { title: '端口', dataIndex: 'Port', key: 'port', width: 90 },
                { title: '来源/目标', dataIndex: 'CidrBlock', key: 'cidr', width: 150, ellipsis: true },
                { title: '策略', dataIndex: 'Action', key: 'action', width: 70,
                  render: (v: string) => <Tag color={v === 'ACCEPT' ? 'green' : 'red'}>{v === 'ACCEPT' ? '允许' : '拒绝'}</Tag> },
                { title: '备注', dataIndex: 'PolicyDescription', key: 'desc', ellipsis: true },
                {
                  title: '', key: 'del', width: 40,
                  render: (_: any, r: any) => (
                    <Popconfirm title="删除此规则？" onConfirm={() => delFwRule(r.direction, r.PolicyIndex)} okText="删除" cancelText="取消">
                      <Button type="link" size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  ),
                },
              ]}
            />
          </>
        )}
      </Drawer>

      {/* Firewall Add Modal */}
      <Modal
        title="添加防火墙规则"
        open={fwModalOpen}
        onOk={addFwRule}
        onCancel={() => setFwModalOpen(false)}
        okText="添加"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={fwForm} layout="vertical" initialValues={{ direction: 'ingress', action: 'ACCEPT', protocol: 'TCP', port: '80' }}>
          <Form.Item name="direction" label="方向" rules={[{ required: true }]}>
            <Select options={[{ label: '入站 (Ingress)', value: 'ingress' }, { label: '出站 (Egress)', value: 'egress' }]} />
          </Form.Item>
          <Space style={{ width: '100%' }} size="middle">
            <Form.Item name="protocol" label="协议" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Select options={['TCP', 'UDP', 'ICMP', 'ALL'].map((v) => ({ label: v, value: v }))} />
            </Form.Item>
            <Form.Item name="port" label="端口" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Input placeholder="如：80 或 80-90 或 ALL" />
            </Form.Item>
          </Space>
          <Form.Item name="cidrBlock" label="来源/目标 IP" rules={[{ required: true, message: '请输入 IP 段' }]}>
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

export default CVM;
