import React from 'react';
import { Select, Button, Tooltip, Avatar } from 'antd';
import { PlusOutlined, UserOutlined, SwapOutlined } from '@ant-design/icons';
import { useAccountStore } from '../store/accountStore';
import { useAppStore } from '../store/appStore';

interface Props {
  collapsed: boolean;
}

// 从名字生成一个确定性颜色
const getAvatarColor = (name: string): string => {
  const colors = ['#0052d9', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const AccountSwitcher: React.FC<Props> = ({ collapsed }) => {
  const accounts = useAccountStore((s) => s.accounts);
  const currentAccountId = useAccountStore((s) => s.currentAccountId);
  const setCurrentAccount = useAccountStore((s) => s.setCurrentAccount);
  const setCurrentPage = useAppStore((s) => s.setCurrentPage);

  const currentAccount = accounts.find((a) => a.id === currentAccountId);
  const currentName = currentAccount?.name || '';

  if (collapsed) {
    return (
      <div style={{ padding: '8px 4px', display: 'flex', justifyContent: 'center' }}>
        {currentName ? (
          <Tooltip title={currentName} placement="right">
            <Avatar
              size={32}
              style={{
                background: getAvatarColor(currentName),
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
              }}
              onClick={() => setCurrentPage('accounts')}
            >
              {currentName.slice(0, 2)}
            </Avatar>
          </Tooltip>
        ) : (
          <Tooltip title="添加账号" placement="right">
            <Button
              type="text"
              icon={<PlusOutlined />}
              onClick={() => setCurrentPage('accounts')}
              style={{ color: 'rgba(255,255,255,0.5)', width: 32, height: 32, padding: 0 }}
            />
          </Tooltip>
        )}
      </div>
    );
  }

  return (
    <div style={{
      margin: '8px 12px 4px',
      background: 'rgba(255,255,255,0.06)',
      borderRadius: 10,
      padding: '10px 12px',
      border: '1px solid rgba(255,255,255,0.08)',
    }}>
      {/* 标签行 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
      }}>
        <div style={{
          color: 'rgba(255,255,255,0.4)',
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.8px',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}>
          <SwapOutlined style={{ fontSize: 9 }} />
          切换账号
        </div>
        <Tooltip title="管理账号">
          <Button
            type="text"
            icon={<PlusOutlined style={{ fontSize: 11 }} />}
            onClick={() => setCurrentPage('accounts')}
            style={{
              color: 'rgba(255,255,255,0.4)',
              height: 20,
              width: 20,
              minWidth: 20,
              padding: 0,
              borderRadius: 4,
            }}
          />
        </Tooltip>
      </div>

      {/* 当前账号展示 + 下拉 */}
      {currentName && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 8,
          padding: '4px 0',
        }}>
          <Avatar
            size={24}
            style={{
              background: getAvatarColor(currentName),
              fontSize: 10,
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {currentName.slice(0, 2)}
          </Avatar>
          <span style={{
            color: 'rgba(255,255,255,0.85)',
            fontSize: 12,
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
          }}>
            {currentName}
          </span>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: '#52c41a',
            flexShrink: 0,
          }} />
        </div>
      )}

      <Select
        value={currentAccountId || undefined}
        onSelect={(val) => setCurrentAccount(val)}
        onChange={(val) => setCurrentAccount(val)}
        placeholder={
          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>
            <UserOutlined style={{ marginRight: 4 }} />
            选择账号...
          </span>
        }
        style={{ width: '100%' }}
        size="small"
        options={accounts.map((a) => ({ value: a.id, label: a.name }))}
        notFoundContent={
          <div style={{ padding: '8px', textAlign: 'center', color: '#999', fontSize: 12 }}>
            暂无账号，点击 + 添加
          </div>
        }
        variant="borderless"
        className="account-switcher-select"
        dropdownStyle={{ borderRadius: 8 }}
      />
    </div>
  );
};

export default AccountSwitcher;
