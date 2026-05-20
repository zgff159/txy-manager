import React, { useEffect, useState, useCallback } from 'react';
import { Table, Button, Modal, Form, Select, InputNumber, Space, Tag, message, Empty, Alert, Popconfirm, Progress, Card } from 'antd';
import { PlusOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { useAccountStore } from '../store/accountStore';
import { useAppStore } from '../store/appStore';
import type { TrafficPackage } from '../types';

const TRAFFIC_OPTIONS = [
  { label: '10GB (1个月)', value: 10 }, { label: '50GB (1个月)', value: 50 },
  { label: '512GB (1个月)', value: 512 }, { label: '1TB (1个月)', value: 1024 },
  { label: '5TB (1个月)', value: 5120 }, { label: '50TB (1个月)', value: 51200 },
  { label: '60GB (半年)', value: 60 }, { label: '300GB (半年)', value: 300 },
  { label: '3TB (半年)', value: 3072 }, { label: '6TB (半年)', value: 6144 },
  { label: '30TB (半年)', value: 30720 }, { label: '60TB (半年)', value: 61440 },
  { label: '300TB (半年)', value: 307200 },
];

const REGIONS = [
  { label: '广州', value: 'ap-guangzhou' }, { label: '上海', value: 'ap-shanghai' },
  { label: '北京', value: 'ap-beijing' }, { label: '成都', value: 'ap-chengdu' },
  { label: '重庆', value: 'ap-chongqing' }, { label: '南京', value: 'ap-nanjing' },
  { label: '香港', value: 'ap-hongkong' }, { label: '新加坡', value: 'ap-singapore' },
  { label: '东京', value: 'ap-tokyo' }, { label: '硅谷', value: 'na-siliconvalley' },
  { label: '法兰克福', value: 'eu-frankfurt' },
];

const statusColors: Record<string, string> = { AVAILABLE: 'green', EXPIRED: 'default', EXHAUSTED: 'orange', REFUNDED: 'red', DELETED: 'red' };
const statusLabels: Record<string, string> = { AVAILABLE: '可用', EXPIRED: '已过期', EXHAUSTED: '已用完', REFUNDED: '已退还', DELETED: '已删除' };
const deductLabels: Record<string, string> = { FULL_TIME: '全时', IDLE_TIME: '闲时' };

interface TrafficPackageFull extends TrafficPackage { _region: string; }

const packageColumns = (onDelete: (r: TrafficPackageFull) => void) => [
  { title: '名称', dataIndex: 'trafficPackageName', key: 'name', width: 180 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 80,
    render: (s: string) => <Tag color={statusColors[s] || 'default'}>{statusLabels[s] || s}</Tag> },
  { title: '类型', dataIndex: 'deductType', key: 'deductType', width: 60,
    render: (v: string) => deductLabels[v] || v },
  { title: '使用情况', key: 'usage', width: 200,
    render: (_: any, r: TrafficPackageFull) => (
      <Progress percent={r.totalAmount > 0 ? Math.round((r.usedAmount / r.totalAmount) * 100) : 0}
        size="small" format={() => `${r.usedAmount || 0} / ${r.totalAmount} GB`}
        status={r.status === 'EXHAUSTED' ? 'exception' : r.status === 'AVAILABLE' ? 'active' : 'normal'} />
    ),
  },
  { title: '剩余', dataIndex: 'remainingAmount', key: 'remaining', width: 80,
    render: (v: number) => <strong>{v} GB</strong> },
  { title: '到期时间', dataIndex: 'deadline', key: 'deadline', width: 160,
    render: (v: string) => v ? new Date(v).toLocaleString('zh-CN') : '-' },
  { title: '操作', key: 'actions', width: 70,
    render: (_: any, record: TrafficPackageFull) => (
      record.status === 'AVAILABLE' ? (
        <Popconfirm title="确定退还此流量包？" description="退还后剩余流量将按比例退款。"
          onConfirm={() => onDelete(record)} okText="确定退还" cancelText="取消">
          <Button type="link" danger icon={<DeleteOutlined />}>退还</Button>
        </Popconfirm>
      ) : <span style={{ color: '#999', fontSize: 12 }}>{statusLabels[record.status]}</span>
    ),
  },
];

const TrafficPage: React.FC = () => {
  const currentAccountId = useAccountStore((s) => s.currentAccountId);
  const { trafficRegionA, trafficRegionB, setTrafficRegionA, setTrafficRegionB } = useAppStore();
  const [pkgsA, setPkgsA] = useState<TrafficPackageFull[]>([]);
  const [pkgsB, setPkgsB] = useState<TrafficPackageFull[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [buyModalOpen, setBuyModalOpen] = useState(false);
  const [buyLoading, setBuyLoading] = useState(false);
  const [buyRegion, setBuyRegion] = useState('');
  const [form] = Form.useForm();

  const fetchRegion = useCallback(async (region: string): Promise<TrafficPackageFull[]> => {
    if (!currentAccountId) return [];
    const list = await window.api.traffic.describePackages(currentAccountId, region);
    return list
      .filter((p: TrafficPackage) => p.status !== 'EXHAUSTED' && p.status !== 'DELETED' && p.status !== 'REFUNDED')
      .map((p: TrafficPackage) => ({ ...p, _region: region }));
  }, [currentAccountId]);

  const fetchAll = useCallback(async () => {
    if (!currentAccountId) return;
    setLoading(true);
    setError('');
    try {
      const [a, b] = await Promise.all([fetchRegion(trafficRegionA), fetchRegion(trafficRegionB)]);
      a.sort((a: any, b: any) => new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime());
      b.sort((a: any, b: any) => new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime());
      setPkgsA(a);
      setPkgsB(b);
    } catch (e: any) { setError(e.message || '加载失败'); }
    finally { setLoading(false); }
  }, [currentAccountId, trafficRegionA, trafficRegionB, fetchRegion]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openBuy = (region: string) => {
    setBuyRegion(region);
    form.resetFields();
    setBuyModalOpen(true);
  };

  const handleBuy = async () => {
    const values = await form.validateFields();
    setBuyLoading(true);
    try {
      await window.api.traffic.createPackages(
        currentAccountId!, buyRegion,
        values.trafficAmount, values.trafficPackageCount || 1, values.deductType || 'FULL_TIME'
      );
      message.success('购买成功');
      setBuyModalOpen(false);
      fetchAll();
    } catch (e: any) { message.error(e.message || '购买失败'); }
    finally { setBuyLoading(false); }
  };

  const handleDelete = async (record: TrafficPackageFull) => {
    try {
      await window.api.traffic.deletePackages(currentAccountId!, record._region, [record.trafficPackageId]);
      message.success('退还成功');
      fetchAll();
    } catch (e: any) { message.error(e.message || '退还失败'); }
  };

  if (!currentAccountId) {
    return <Empty description="请先选择账号" />;
  }

  const regionSection = (region: string, data: TrafficPackageFull[], setRegion: (v: string) => void) => (
    <Card
      size="small"
      title={
        <Space>
          <Select value={region} onChange={setRegion} style={{ width: 110 }} options={REGIONS} />
          <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => openBuy(region)}>购买</Button>
          <Button size="small" icon={<ReloadOutlined />} onClick={fetchAll}>刷新</Button>
        </Space>
      }
      style={{ marginBottom: 16 }}
    >
      <Table
        dataSource={data}
        rowKey="trafficPackageId"
        loading={loading}
        pagination={false}
        size="small"
        columns={packageColumns(handleDelete)}
        scroll={{ x: 900 }}
        locale={{ emptyText: '暂无流量包' }}
      />
    </Card>
  );

  return (
    <div>
      {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} closable onClose={() => setError('')} />}
      {regionSection(trafficRegionA, pkgsA, setTrafficRegionA)}
      {regionSection(trafficRegionB, pkgsB, setTrafficRegionB)}
      <Modal title="购买共享流量包" open={buyModalOpen} onOk={handleBuy}
        onCancel={() => setBuyModalOpen(false)} confirmLoading={buyLoading}
        okText="立即购买" cancelText="取消" destroyOnClose>
        <Form form={form} layout="vertical" initialValues={{ trafficPackageCount: 1, deductType: 'FULL_TIME' }}>
          <Form.Item name="trafficAmount" label="流量包规格" rules={[{ required: true, message: '请选择规格' }]}>
            <Select showSearch placeholder="选择规格" options={TRAFFIC_OPTIONS} />
          </Form.Item>
          <Form.Item name="trafficPackageCount" label="购买数量">
            <InputNumber min={1} max={20} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="deductType" label="抵扣类型">
            <Select options={[{ label: '全时流量包', value: 'FULL_TIME' }, { label: '闲时流量包', value: 'IDLE_TIME' }]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TrafficPage;
