import { getClient } from './client';
import { getCredentials } from '../store/credentials';

export async function getBalance(accountId: string) {
  const creds = getCredentials(accountId);
  if (!creds) throw new Error('Account not found');
  const { billing } = getClient(creds.secretId, creds.secretKey);
  const result = await billing.DescribeAccountBalance({});
  return {
    balance: result.Balance ?? 0,
    creditBalance: result.CreditBalance ?? 0,
    realBalance: result.RealBalance ?? 0,
    currency: (result as any).Currency || 'CNY',
  };
}

export async function getBillSummary(accountId: string, month: string) {
  const creds = getCredentials(accountId);
  if (!creds) throw new Error('Account not found');
  const { billing } = getClient(creds.secretId, creds.secretKey);
  const result = await billing.DescribeBillSummaryByProduct({
    BeginTime: month,
    EndTime: month,
  });
  return (result.SummaryOverview || []).map((item: any) => ({
    productName: item.BusinessCodeName || item.ProductName || '未知产品',
    realTotalCost: item.RealTotalCost ?? 0,
    cashPayAmount: item.CashPayAmount ?? 0,
    incentivePayAmount: item.IncentivePayAmount ?? 0,
    voucherPayAmount: item.VoucherPayAmount ?? 0,
  }));
}
