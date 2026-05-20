import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, Space, Popconfirm, message, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SafetyOutlined } from '@ant-design/icons';
import { useAccountStore } from '../store/accountStore';

const Accounts: React.FC = () => {
  const { accounts, loading, loadAccounts, addAccount, deleteAccount } = useAccountStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [encryptionOk, setEncryptionOk] = useState(true);
  const [form] = Form.useForm();

  useEffect(() => {
    loadAccounts();
    window.api.accounts.checkEncryption().then(setEncryptionOk);
  }, []);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (editingId) {
      await window.api.accounts.update(editingId, values.name, values.secretId, values.secretKey || undefined, values.accountType || 'main');
      message.success('账号已更新');
    } else {
      await addAccount(values.name, values.secretId, values.secretKey, values.accountType || 'main');
      message.success('账号添加成功');
    }
    setModalOpen(false);
    setEditingId(null);
    form.resetFields();
  };

  const openEdit = (record: any) => {
    setEditingId(record.id);
    form.setFieldsValue({
      name: record.name,
      secretId: record.secretId,
      secretKey: '',
      accountType: record.accountType || 'main',
    });
    setModalOpen(true);
  };

  const openAdd = () => {
    setEditingId(null);
    form.resetFields();
    form.setFieldsValue({ accountType: 'main' });
    setModalOpen(true);
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Tag color={encryptionOk ? 'green' : 'red'} icon={<SafetyOutlined />}>
            {encryptionOk ? 'DPAPI 加密可用' : '加密不可用'}
          </Tag>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>添加账号</Button>
      </div>
      <Table
        dataSource={accounts}
        rowKey="id"
        loading={loading}
        columns={[
          { title: '账号名称', dataIndex: 'name', key: 'name' },
          { title: 'SecretId', dataIndex: 'secretId', key: 'secretId', ellipsis: true },
          { title: '类型', dataIndex: 'accountType', key: 'type', width: 80,
            render: (v: string) => <Tag color={v === 'sub' ? 'default' : 'blue'}>{v === 'sub' ? '子账号' : '主账号'}</Tag> },
          { title: '添加时间', dataIndex: 'createdAt', key: 'createdAt',
            render: (v: number) => new Date(v).toLocaleString('zh-CN') },
          {
            title: '操作', key: 'actions', width: 150,
            render: (_: any, record: any) => (
              <Space size="small">
                <Button type="link" icon={<EditOutlined />} onClick={() => openEdit(record)}>编辑</Button>
                <Popconfirm title="确定删除此账号？" description="删除后无法恢复"
                  onConfirm={() => deleteAccount(record.id)} okText="确定" cancelText="取消">
                  <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />
      <Modal
        title={editingId ? '编辑账号' : '添加腾讯云账号'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => { setModalOpen(false); setEditingId(null); form.resetFields(); }}
        okText={editingId ? '保存' : '添加'}
        cancelText="取消"
        destroyOnClose
      >
        <Form form={form} layout="vertical" initialValues={{ accountType: 'main' }}>
          <Form.Item name="name" label="账号名称" rules={[{ required: true, message: '请输入账号名称' }]}>
            <Input placeholder="如：公司主账号" />
          </Form.Item>
          <Form.Item name="secretId" label="SecretId" rules={[{ required: true, message: '请输入 SecretId' }]}>
            <Input placeholder="腾讯云 API SecretId" />
          </Form.Item>
          <Form.Item name="secretKey" label="SecretKey" rules={[{ required: !editingId, message: '请输入 SecretKey' }]}
            extra={editingId ? '留空则不修改密钥' : undefined}>
            <Input.Password placeholder={editingId ? '留空不修改' : '腾讯云 API SecretKey'} />
          </Form.Item>
          <Form.Item name="accountType" label="账号类型">
            <Select options={[{ label: '主账号', value: 'main' }, { label: '子账号', value: 'sub' }]} />
          </Form.Item>
        </Form>
        <div style={{ color: '#999', fontSize: 12, marginTop: -8 }}>
          SecretKey 将通过 Windows DPAPI 加密后存储在本机
        </div>
      </Modal>
    </div>
  );
};

export default Accounts;
