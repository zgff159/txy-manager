import React, { useEffect, useState, useCallback } from 'react';
import { Table, Button, Modal, Form, Input, Select, InputNumber, Space, Tag, message, Empty, Alert, Popconfirm, Switch, Breadcrumb, Descriptions, Popover } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined, LockOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useAccountStore } from '../store/accountStore';
import type { DomainInfo, DnsRecord } from '../types';

const RECORD_TYPES = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SRV', 'CAA', 'SPF'];

const DomainPage: React.FC = () => {
  const currentAccountId = useAccountStore((s) => s.currentAccountId);
  const [domains, setDomains] = useState<DomainInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<DomainInfo | null>(null);
  const [records, setRecords] = useState<DnsRecord[]>([]);
  const [recLoading, setRecLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DnsRecord | null>(null);
  const [form] = Form.useForm();
  // Domain CRUD states
  const [addDomainOpen, setAddDomainOpen] = useState(false);
  const [remarkOpen, setRemarkOpen] = useState(false);
  const [lockOpen, setLockOpen] = useState(false);
  const [remarkDomain, setRemarkDomain] = useState<DomainInfo | null>(null);
  const [lockDomain, setLockDomain] = useState<DomainInfo | null>(null);
  const [remarkForm] = Form.useForm();
  const [lockForm] = Form.useForm();
  const [addDomForm] = Form.useForm();
  // Dynamic lines & types
  const [lineList, setLineList] = useState<string[]>(['默认', '电信', '联通', '移动', '教育网', '境外']);
  const [typeList, setTypeList] = useState<string[]>(RECORD_TYPES);

  const fetchDomains = useCallback(() => {
    if (!currentAccountId) return;
    setLoading(true);
    setError('');
    window.api.domain.list(currentAccountId)
      .then(setDomains)
      .catch((e) => setError(e.message || '加载失败'))
      .finally(() => setLoading(false));
  }, [currentAccountId]);

  useEffect(() => { fetchDomains(); }, [fetchDomains]);

  const fetchRecords = useCallback((domain: DomainInfo) => {
    if (!currentAccountId) return;
    setRecLoading(true);
    window.api.domain.listRecords(currentAccountId, domain.domain, domain.domainId)
      .then(setRecords)
      .catch((e) => message.error(e.message || '加载记录失败'))
      .finally(() => setRecLoading(false));
  }, [currentAccountId]);

  const fetchLines = useCallback((domain: DomainInfo) => {
    if (!currentAccountId) return;
    window.api.domain.listLines(currentAccountId, domain.domain, domain.grade).then((result: any) => {
      const lines: string[] = ['默认'];
      if (result?.lineGroupList) {
        for (const g of result.lineGroupList) {
          if (g.lineList) lines.push(...g.lineList);
        }
      }
      if (result?.lineList) {
        for (const l of result.lineList) {
          if (!lines.includes(l.lineName)) lines.push(l.lineName);
        }
      }
      setLineList(lines);
    }).catch(() => { /* use defaults */ });
    window.api.domain.listTypes(currentAccountId, domain.grade).then(setTypeList).catch(() => { /* use defaults */ });
  }, [currentAccountId]);

  const enterDomain = (domain: DomainInfo) => {
    setSelectedDomain(domain);
    fetchRecords(domain);
    fetchLines(domain);
  };

  const handleAddDomain = async () => {
    const values = await addDomForm.validateFields();
    try {
      await window.api.domain.create(currentAccountId!, values.domain);
      message.success('域名添加成功');
      setAddDomainOpen(false);
      addDomForm.resetFields();
      fetchDomains();
    } catch (e: any) { message.error(e.message || '添加失败'); }
  };

  const handleDeleteDomain = async (domain: DomainInfo) => {
    try {
      await window.api.domain.delete(currentAccountId!, domain.domain);
      message.success('域名已删除');
      if (selectedDomain?.domainId === domain.domainId) { setSelectedDomain(null); setRecords([]); }
      fetchDomains();
    } catch (e: any) { message.error(e.message || '删除失败'); }
  };

  const handleToggleDomain = async (domain: DomainInfo, checked: boolean) => {
    try {
      await window.api.domain.modifyStatus(currentAccountId!, domain.domain, checked ? 'ENABLE' : 'PAUSE');
      message.success(checked ? '已启用' : '已暂停');
      fetchDomains();
    } catch (e: any) { message.error(e.message || '操作失败'); }
  };

  const handleRemark = async () => {
    const values = await remarkForm.validateFields();
    try {
      await window.api.domain.modifyRemark(currentAccountId!, remarkDomain!.domain, values.remark);
      message.success('备注已更新');
      setRemarkOpen(false);
      fetchDomains();
    } catch (e: any) { message.error(e.message || '操作失败'); }
  };

  const handleLock = async () => {
    const values = await lockForm.validateFields();
    try {
      await window.api.domain.modifyLock(currentAccountId!, lockDomain!.domain, values.lockDays);
      message.success('域名已锁定');
      setLockOpen(false);
      fetchDomains();
    } catch (e: any) { message.error(e.message || '锁定失败'); }
  };

  // Record operations
  const openAdd = () => {
    setEditingRecord(null);
    form.resetFields();
    form.setFieldsValue({ recordLine: '默认', ttl: 600, name: '@' });
    setModalOpen(true);
  };

  const openEdit = (record: DnsRecord) => {
    setEditingRecord(record);
    form.setFieldsValue({ name: record.name, type: record.type, value: record.value, line: record.line, ttl: record.ttl, mx: record.mx });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (!selectedDomain || !currentAccountId) return;
    try {
      if (editingRecord) {
        await window.api.domain.modifyRecord(currentAccountId, selectedDomain.domain, editingRecord.recordId, values.type, values.line, values.value, values.name, values.ttl, values.mx);
        message.success('记录已修改');
      } else {
        await window.api.domain.createRecord(currentAccountId, selectedDomain.domain, values.type, values.line, values.value, values.name, values.ttl, values.mx);
        message.success('记录已添加');
      }
      setModalOpen(false);
      fetchRecords(selectedDomain);
    } catch (e: any) { message.error(e.message || '操作失败'); }
  };

  const handleDelRecord = async (record: DnsRecord) => {
    try {
      await window.api.domain.deleteRecord(currentAccountId!, selectedDomain!.domain, record.recordId);
      message.success('记录已删除');
      fetchRecords(selectedDomain!);
    } catch (e: any) { message.error(e.message || '删除失败'); }
  };

  const handleToggleRecord = async (record: DnsRecord, checked: boolean) => {
    try {
      await window.api.domain.modifyRecordStatus(currentAccountId!, selectedDomain!.domain, record.recordId, checked ? 'ENABLE' : 'DISABLE');
      message.success(checked ? '已启用' : '已暂停');
      fetchRecords(selectedDomain!);
    } catch (e: any) { message.error(e.message || '操作失败'); }
  };

  if (!currentAccountId) {
    return <Empty description="请先选择账号" />;
  }

  // Domain list
  if (!selectedDomain) {
    return (
      <div>
        {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} closable onClose={() => setError('')} />}
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <Button icon={<ReloadOutlined />} onClick={fetchDomains}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { addDomForm.resetFields(); setAddDomainOpen(true); }}>添加域名</Button>
        </div>
        <Table
          dataSource={domains}
          rowKey="domainId"
          loading={loading}
          columns={[
            { title: '域名', dataIndex: 'domain', key: 'domain', render: (v: string, r: DomainInfo) => (
              <Space><a onClick={() => enterDomain(r)}>{v}</a>{r.remark ? <Popover content={r.remark}><InfoCircleOutlined style={{ color: '#999' }} /></Popover> : null}</Space>
            )},
            { title: '状态', dataIndex: 'status', key: 'status', width: 90, render: (s: string, r: DomainInfo) => (
              <Switch checked={s === 'ENABLE'} onChange={(c) => handleToggleDomain(r, c)} size="small" />
            )},
            { title: '记录数', dataIndex: 'recordCount', key: 'count', width: 80 },
            { title: '套餐', dataIndex: 'grade', key: 'grade', width: 100 },
            { title: 'TTL', dataIndex: 'ttl', key: 'ttl', width: 80 },
            { title: '操作', key: 'actions', width: 220, render: (_: any, r: DomainInfo) => (
              <Space size="small">
                <Button type="link" size="small" onClick={() => enterDomain(r)}>解析</Button>
                <Button type="link" size="small" onClick={() => { setRemarkDomain(r); remarkForm.setFieldsValue({ remark: r.remark || '' }); setRemarkOpen(true); }}>备注</Button>
                <Button type="link" size="small" icon={<LockOutlined />} onClick={() => { setLockDomain(r); lockForm.resetFields(); setLockOpen(true); }}>锁定</Button>
                <Popconfirm title="确定删除此域名？" onConfirm={() => handleDeleteDomain(r)} okText="删除" cancelText="取消">
                  <Button type="link" size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            )},
          ]}
        />
        {/* Add Domain Modal */}
        <Modal title="添加域名" open={addDomainOpen} onOk={handleAddDomain} onCancel={() => setAddDomainOpen(false)} okText="添加" cancelText="取消" destroyOnClose>
          <Form form={addDomForm} layout="vertical">
            <Form.Item name="domain" label="域名" rules={[{ required: true, message: '请输入域名' }]}>
              <Input placeholder="如：example.com" />
            </Form.Item>
          </Form>
        </Modal>
        {/* Remark Modal */}
        <Modal title="修改备注" open={remarkOpen} onOk={handleRemark} onCancel={() => setRemarkOpen(false)} okText="保存" cancelText="取消" destroyOnClose>
          <Form form={remarkForm} layout="vertical">
            <Form.Item name="remark" label="备注">
              <Input.TextArea rows={3} placeholder="域名备注信息" />
            </Form.Item>
          </Form>
        </Modal>
        {/* Lock Modal */}
        <Modal title="锁定域名" open={lockOpen} onOk={handleLock} onCancel={() => setLockOpen(false)} okText="锁定" cancelText="取消" destroyOnClose>
          <Form form={lockForm} layout="vertical" initialValues={{ lockDays: 30 }}>
            <Form.Item name="lockDays" label="锁定天数" rules={[{ required: true }]}>
              <InputNumber min={1} max={3650} style={{ width: '100%' }} addonAfter="天" />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    );
  }

  // Record list
  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Breadcrumb items={[
          { title: <a onClick={() => { setSelectedDomain(null); setRecords([]); }}>域名列表</a> },
          { title: selectedDomain.domain },
        ]} />
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => fetchRecords(selectedDomain)}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>添加记录</Button>
        </Space>
      </div>
      <Table
        dataSource={records}
        rowKey="recordId"
        loading={recLoading}
        columns={[
          { title: '主机记录', dataIndex: 'name', key: 'name', width: 150 },
          { title: '类型', dataIndex: 'type', key: 'type', width: 80, render: (t: string) => <Tag color="blue">{t}</Tag> },
          { title: '记录值', dataIndex: 'value', key: 'value', width: 200, ellipsis: true },
          { title: '线路', dataIndex: 'line', key: 'line', width: 100 },
          { title: 'TTL', dataIndex: 'ttl', key: 'ttl', width: 70 },
          { title: 'MX', dataIndex: 'mx', key: 'mx', width: 60, render: (v: number) => v > 0 ? v : '-' },
          { title: '状态', dataIndex: 'status', key: 'status', width: 70, render: (s: string, record: DnsRecord) => (
            <Switch checked={s === 'ENABLE'} onChange={(c) => handleToggleRecord(record, c)} size="small" />
          )},
          { title: '操作', key: 'actions', width: 120, render: (_: any, record: DnsRecord) => (
            <Space size="small">
              <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>编辑</Button>
              <Popconfirm title="确定删除？" onConfirm={() => handleDelRecord(record)} okText="确定" cancelText="取消">
                <Button type="link" size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </Space>
          )},
        ]}
      />
      {/* Record Add/Edit Modal */}
      <Modal title={editingRecord ? '编辑解析记录' : '添加解析记录'} open={modalOpen} onOk={handleSubmit} onCancel={() => { setModalOpen(false); setEditingRecord(null); }} okText="保存" cancelText="取消" destroyOnClose width={480}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="主机记录" rules={[{ required: true }]}>
            <Input placeholder="如：www、@、*" />
          </Form.Item>
          <Form.Item name="type" label="记录类型" rules={[{ required: true }]}>
            <Select options={typeList.map((t) => ({ label: t, value: t }))} />
          </Form.Item>
          <Form.Item name="value" label="记录值" rules={[{ required: true }]}>
            <Input placeholder="如：192.168.1.1 或 cname.example.com." />
          </Form.Item>
          <Form.Item name="line" label="线路" rules={[{ required: true }]}>
            <Select showSearch options={lineList.map((l) => ({ label: l, value: l }))} />
          </Form.Item>
          <Space size="middle" style={{ width: '100%' }}>
            <Form.Item name="ttl" label="TTL (秒)" style={{ flex: 1 }}>
              <InputNumber min={1} max={604800} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="mx" label="MX 优先级" style={{ flex: 1 }}>
              <InputNumber min={0} max={50} style={{ width: '100%' }} />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  );
};

export default DomainPage;
