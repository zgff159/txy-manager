import React, { useEffect, useState } from 'react';
import { Card, Col, Row, Statistic, Table, Spin, Empty, Alert, Button, Space, message } from 'antd';
import { DollarOutlined, WalletOutlined, CreditCardOutlined } from '@ant-design/icons';
import { useAccountStore } from '../store/accountStore';
import type { BillingInfo } from '../types';
import dayjs from 'dayjs';

const toYuan = (v: any): number => {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};

const Billing: React.FC = () => {
  const currentAccountId = useAccountStore((s) => s.currentAccountId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [balance, setBalance] = useState<BillingInfo | null>(null);
  const [billSummary, setBillSummary] = useState<any[]>([]);

  useEffect(() => {
    if (!currentAccountId) return;
    setLoading(true);
    setError('');
    const month = dayjs().format('YYYY-MM');
    Promise.all([
      window.api.billing.getBalance(currentAccountId),
      window.api.billing.getBillSummary(currentAccountId, month),
    ]).then(([bal, summary]) => {
      setBalance(bal);
      setBillSummary(summary);
    }).catch((e) => {
      setError(e.message || '加载失败');
    }).finally(() => {
      setLoading(false);
    });
  }, [currentAccountId]);

  if (!currentAccountId) {
    return <Empty description="请先选择账号" />;
  }

  const totalCost = billSummary.reduce((sum: number, item: any) => sum + toYuan(item.realTotalCost), 0);

  return (
    <div>
      {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} closable onClose={() => setError('')} />}
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Button type="primary" icon={<WalletOutlined />} onClick={() => {
            window.api.shell.openExternal('https://console.cloud.tencent.com/expense/recharge');
            message.info('正在打开腾讯云充值页面...');
          }}>
            账户充值
          </Button>
          <Button icon={<CreditCardOutlined />} onClick={() => {
            window.api.shell.openExternal('https://console.cloud.tencent.com/expense/overview');
          }}>
            费用中心
          </Button>
        </Space>
      </div>
      <Spin spinning={loading}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="账户余额"
                value={balance ? balance.realBalance / 100 : 0}
                precision={2}
                prefix={<DollarOutlined />}
                suffix="元"
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="本月预估消费"
                value={totalCost}
                precision={2}
                prefix={<DollarOutlined />}
                suffix="元"
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="信用额度"
                value={balance ? balance.creditBalance / 100 : 0}
                precision={2}
                prefix={<DollarOutlined />}
                suffix="元"
              />
            </Card>
          </Col>
        </Row>
        <Card title={`${dayjs().format('YYYY年MM月')} 账单概览`} style={{ marginTop: 16 }}>
          <Table
            dataSource={billSummary}
            rowKey="productName"
            pagination={false}
            columns={[
              { title: '产品', dataIndex: 'productName', key: 'product' },
              { title: '现金支付', dataIndex: 'cashPayAmount', key: 'cash',
                render: (v: any) => `${toYuan(v).toFixed(2)} 元` },
              { title: '赠送金支付', dataIndex: 'incentivePayAmount', key: 'incentive',
                render: (v: any) => `${toYuan(v).toFixed(2)} 元` },
              { title: '代金券支付', dataIndex: 'voucherPayAmount', key: 'voucher',
                render: (v: any) => `${toYuan(v).toFixed(2)} 元` },
              { title: '总费用', dataIndex: 'realTotalCost', key: 'total',
                render: (v: any) => `${toYuan(v).toFixed(2)} 元` },
            ]}
          />
        </Card>
      </Spin>
    </div>
  );
};

export default Billing;
