import React, { useEffect, useState, useCallback } from 'react';
import { Table, Button, Card, Empty, Alert, Breadcrumb, Space, message, Modal, Input, Popconfirm } from 'antd';
import {
  ReloadOutlined, FolderOpenOutlined, FileOutlined,
  UploadOutlined, DownloadOutlined, DeleteOutlined,
  FolderAddOutlined, RollbackOutlined,
} from '@ant-design/icons';
import { useAccountStore } from '../store/accountStore';
import type { COSBucket } from '../types';

interface ObjectItem {
  key: string;
  size: number;
  lastModified: string;
  storageClass: string;
}

const COS: React.FC = () => {
  const currentAccountId = useAccountStore((s) => s.currentAccountId);
  const [buckets, setBuckets] = useState<COSBucket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedBucket, setSelectedBucket] = useState<COSBucket | null>(null);
  const [prefix, setPrefix] = useState('');
  const [objects, setObjects] = useState<ObjectItem[]>([]);
  const [objLoading, setObjLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [folderName, setFolderName] = useState('');

  const fetchBuckets = useCallback(() => {
    if (!currentAccountId) return;
    setLoading(true);
    setError('');
    window.api.cos.listBuckets(currentAccountId)
      .then(setBuckets)
      .catch((e) => setError(e.message || '加载失败'))
      .finally(() => setLoading(false));
  }, [currentAccountId]);

  useEffect(() => { fetchBuckets(); }, [fetchBuckets]);

  const fetchObjects = useCallback((bucket: COSBucket, currentPrefix: string) => {
    if (!currentAccountId) return;
    setObjLoading(true);
    window.api.cos.listObjects(currentAccountId, bucket.name, bucket.location, currentPrefix)
      .then((list) => { setObjects(list); setSelectedRowKeys([]); })
      .catch((e) => message.error(e.message || '加载文件失败'))
      .finally(() => setObjLoading(false));
  }, [currentAccountId]);

  const enterBucket = (bucket: COSBucket) => {
    setSelectedBucket(bucket);
    setPrefix('');
    fetchObjects(bucket, '');
  };

  const enterPrefix = (p: string) => {
    setPrefix(p);
    if (selectedBucket) fetchObjects(selectedBucket, p);
  };

  const goBack = () => {
    if (prefix === '') {
      setSelectedBucket(null);
      setObjects([]);
      return;
    }
    const parts = prefix.split('/').filter(Boolean);
    parts.pop();
    const newPrefix = parts.length > 0 ? parts.join('/') + '/' : '';
    setPrefix(newPrefix);
    if (selectedBucket) fetchObjects(selectedBucket, newPrefix);
  };

  const handleUpload = async () => {
    if (!selectedBucket || !currentAccountId) return;
    try {
      const result = await window.api.cos.uploadFile(currentAccountId, selectedBucket.name, selectedBucket.location, prefix);
      if (!result.canceled) {
        message.success(`成功上传 ${result.uploaded.length} 个文件`);
        fetchObjects(selectedBucket, prefix);
      }
    } catch (e: any) {
      message.error(e.message || '上传失败');
    }
  };

  const handleDownload = async (key: string) => {
    if (!selectedBucket || !currentAccountId) return;
    try {
      const url = await window.api.cos.getDownloadUrl(currentAccountId, selectedBucket.name, selectedBucket.location, key);
      window.api.shell.openExternal(url);
      message.success('正在打开下载链接...');
    } catch (e: any) {
      message.error(e.message || '获取下载链接失败');
    }
  };

  const handleDelete = async () => {
    if (!selectedBucket || !currentAccountId || selectedRowKeys.length === 0) return;
    try {
      await window.api.cos.deleteObjects(currentAccountId, selectedBucket.name, selectedBucket.location, selectedRowKeys as string[]);
      message.success(`成功删除 ${selectedRowKeys.length} 个对象`);
      fetchObjects(selectedBucket, prefix);
    } catch (e: any) {
      message.error(e.message || '删除失败');
    }
  };

  const handleCreateFolder = async () => {
    if (!selectedBucket || !currentAccountId || !folderName.trim()) return;
    try {
      await window.api.cos.createFolder(currentAccountId, selectedBucket.name, selectedBucket.location, prefix, folderName.trim());
      message.success('文件夹创建成功');
      setFolderModalOpen(false);
      setFolderName('');
      fetchObjects(selectedBucket, prefix);
    } catch (e: any) {
      message.error(e.message || '创建失败');
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  };

  if (!currentAccountId) {
    return <Empty description="请先选择账号" />;
  }

  // Bucket list view
  if (!selectedBucket) {
    return (
      <div>
        {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} closable onClose={() => setError('')} />}
        <div style={{ marginBottom: 16 }}>
          <Button icon={<ReloadOutlined />} onClick={fetchBuckets}>刷新</Button>
        </div>
        <Table
          dataSource={buckets}
          rowKey="name"
          loading={loading}
          columns={[
            { title: '桶名称', dataIndex: 'name', key: 'name' },
            { title: '地域', dataIndex: 'location', key: 'location' },
            { title: '创建时间', dataIndex: 'creationDate', key: 'created' },
            {
              title: '操作', key: 'actions',
              render: (_: any, record: COSBucket) => (
                <Button type="link" onClick={() => enterBucket(record)}>浏览文件</Button>
              ),
            },
          ]}
        />
      </div>
    );
  }

  // Object list view
  return (
    <div>
      {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} closable onClose={() => setError('')} />}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Breadcrumb
          items={[
            { title: <a onClick={() => { setSelectedBucket(null); setObjects([]); }}>桶列表</a> },
            { title: selectedBucket.name },
            ...(prefix ? prefix.split('/').filter(Boolean).map((p, i, arr) => ({
              title: i === arr.length - 1 ? p : <a onClick={() => {
                const np = arr.slice(0, i + 1).join('/') + '/';
                enterPrefix(np);
              }}>{p}</a>,
            })) : []),
          ]}
        />
        <Space>
          <Button onClick={goBack} icon={<RollbackOutlined />} disabled={prefix === ''}>上级目录</Button>
          <Button icon={<ReloadOutlined />} onClick={() => selectedBucket && fetchObjects(selectedBucket, prefix)}>刷新</Button>
        </Space>
      </div>
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Button icon={<UploadOutlined />} onClick={handleUpload}>上传文件</Button>
          <Button icon={<FolderAddOutlined />} onClick={() => setFolderModalOpen(true)}>新建文件夹</Button>
          <Popconfirm
            title={`确定删除选中的 ${selectedRowKeys.length} 个对象？`}
            description="此操作不可恢复"
            onConfirm={handleDelete}
            okText="确定删除"
            cancelText="取消"
            disabled={selectedRowKeys.length === 0}
          >
            <Button danger icon={<DeleteOutlined />} disabled={selectedRowKeys.length === 0}>
              删除选中
            </Button>
          </Popconfirm>
        </Space>
      </div>
      <Table
        dataSource={objects}
        rowKey="key"
        loading={objLoading}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
          getCheckboxProps: (record: ObjectItem) => ({
            disabled: record.size === 0 && record.storageClass === '',
          }),
        }}
        columns={[
          {
            title: '名称', dataIndex: 'key', key: 'key',
            render: (k: string, record: ObjectItem) => {
              const isDir = record.size === 0 && record.storageClass === '';
              const name = prefix ? k.replace(prefix, '') : k;
              if (isDir) {
                return <a onClick={() => enterPrefix(k)}><FolderOpenOutlined style={{ marginRight: 8, color: '#faad14' }} />{name}</a>;
              }
              return <span><FileOutlined style={{ marginRight: 8 }} />{name}</span>;
            },
          },
          { title: '大小', dataIndex: 'size', key: 'size', width: 120, render: formatSize },
          { title: '修改时间', dataIndex: 'lastModified', key: 'modified', width: 180 },
          { title: '存储类型', dataIndex: 'storageClass', key: 'class', width: 110 },
          {
            title: '操作', key: 'actions', width: 100,
            render: (_: any, record: ObjectItem) => {
              const isDir = record.size === 0 && record.storageClass === '';
              if (isDir) return null;
              return (
                <Button type="link" size="small" icon={<DownloadOutlined />}
                  onClick={() => handleDownload(record.key)}>下载</Button>
              );
            },
          },
        ]}
      />
      <Modal
        title="新建文件夹"
        open={folderModalOpen}
        onOk={handleCreateFolder}
        onCancel={() => { setFolderModalOpen(false); setFolderName(''); }}
        okText="创建"
        cancelText="取消"
      >
        <Input
          placeholder="输入文件夹名称"
          value={folderName}
          onChange={(e) => setFolderName(e.target.value)}
          onPressEnter={handleCreateFolder}
        />
      </Modal>
    </div>
  );
};

export default COS;
