import { dnspod } from 'tencentcloud-sdk-nodejs';
import { getCredentials } from '../store/credentials';

const DpClient = dnspod.v20210323.Client;
const dpCache = new Map<string, InstanceType<typeof DpClient>>();

function getDpClient(secretId: string, secretKey: string): InstanceType<typeof DpClient> {
  const key = `${secretId}`;
  if (dpCache.has(key)) return dpCache.get(key)!;
  const client = new DpClient({ credential: { secretId, secretKey }, region: 'ap-guangzhou' });
  dpCache.set(key, client);
  return client;
}

export function clearDpCache(): void { dpCache.clear(); }

// ---- Domain CRUD ----

export async function describeDomainList(accountId: string) {
  const creds = getCredentials(accountId);
  if (!creds) throw new Error('Account not found');
  const client = getDpClient(creds.secretId, creds.secretKey);
  // First try DescribeDomainFilterList (has CreatedOn/RecordCount), fallback to DescribeDomainList
  let list: any[] = [];
  try {
    const result = await client.DescribeDomainFilterList({ Type: 'ALL', Limit: 200 });
    list = (result.DomainList || []).map((d: any) => ({
      domainId: d.DomainId,
      domain: d.Domain || d.Name,
      status: d.Status,
      grade: d.Grade || '',
      ttl: d.TTL || 0,
      dnsStatus: d.DnsStatus || '',
      createdOn: d.CreatedOn || '',
      updatedOn: d.UpdatedOn || '',
      recordCount: d.RecordCount || 0,
    }));
  } catch (e1: any) {
    try {
      const result = await client.DescribeDomainList({});
      list = (result.DomainList || []).map((d: any) => ({
        domainId: d.DomainId,
        domain: d.Name || d.Domain,
        status: d.Status,
        grade: d.Grade || '',
        ttl: d.TTL || 0,
        dnsStatus: d.DNSStatus || d.DnsStatus || '',
        createdOn: '',
        updatedOn: '',
        recordCount: 0,
      }));
    } catch (e2: any) {
      throw new Error(`获取域名列表失败: ${e1.message}; fallback: ${e2.message}`);
    }
  }
  return list;
}

export async function createDomain(accountId: string, domain: string) {
  const creds = getCredentials(accountId);
  if (!creds) throw new Error('Account not found');
  const client = getDpClient(creds.secretId, creds.secretKey);
  const result = await client.CreateDomain({ Domain: domain });
  return { domainId: result.DomainInfo?.Id || 0 };
}

export async function deleteDomain(accountId: string, domain: string) {
  const creds = getCredentials(accountId);
  if (!creds) throw new Error('Account not found');
  const client = getDpClient(creds.secretId, creds.secretKey);
  await client.DeleteDomain({ Domain: domain });
  return { success: true };
}

export async function modifyDomainStatus(accountId: string, domain: string, status: string) {
  const creds = getCredentials(accountId);
  if (!creds) throw new Error('Account not found');
  const client = getDpClient(creds.secretId, creds.secretKey);
  await client.ModifyDomainStatus({ Domain: domain, Status: status });
  return { success: true };
}

export async function modifyDomainRemark(accountId: string, domain: string, remark: string) {
  const creds = getCredentials(accountId);
  if (!creds) throw new Error('Account not found');
  const client = getDpClient(creds.secretId, creds.secretKey);
  await client.ModifyDomainRemark({ Domain: domain, Remark: remark });
  return { success: true };
}

export async function modifyDomainLock(accountId: string, domain: string, lockDays: number) {
  const creds = getCredentials(accountId);
  if (!creds) throw new Error('Account not found');
  const client = getDpClient(creds.secretId, creds.secretKey);
  await client.ModifyDomainLock({ Domain: domain, LockDays: lockDays });
  return { success: true };
}

// ---- Record CRUD ----

export async function describeRecordList(accountId: string, domain: string, domainId?: number) {
  const creds = getCredentials(accountId);
  if (!creds) throw new Error('Account not found');
  const client = getDpClient(creds.secretId, creds.secretKey);
  const params: any = { Domain: domain, Limit: 500 };
  if (domainId) params.DomainId = domainId;
  const result = await client.DescribeRecordList(params);
  return (result.RecordList || []).map((r: any) => ({
    recordId: r.RecordId,
    name: r.Name,
    type: r.Type,
    value: r.Value,
    line: r.Line,
    ttl: r.TTL,
    status: r.Status,
    mx: r.MX,
    remark: r.Remark || '',
    updatedOn: r.UpdatedOn,
    locked: r.Locked,
  }));
}

export async function createRecord(
  accountId: string, domain: string, recordType: string,
  recordLine: string, value: string, name: string = '@', ttl: number = 600, mx?: number
) {
  const creds = getCredentials(accountId);
  if (!creds) throw new Error('Account not found');
  const client = getDpClient(creds.secretId, creds.secretKey);
  const params: any = { Domain: domain, RecordType: recordType, RecordLine: recordLine, Value: value, SubDomain: name, TTL: ttl };
  if (mx !== undefined) params.MX = mx;
  const result = await client.CreateRecord(params);
  return { recordId: result.RecordId };
}

export async function modifyRecord(
  accountId: string, domain: string, recordId: number,
  recordType: string, recordLine: string, value: string, name: string = '@', ttl: number = 600, mx?: number
) {
  const creds = getCredentials(accountId);
  if (!creds) throw new Error('Account not found');
  const client = getDpClient(creds.secretId, creds.secretKey);
  const params: any = { Domain: domain, RecordId: recordId, RecordType: recordType, RecordLine: recordLine, Value: value, SubDomain: name, TTL: ttl };
  if (mx !== undefined) params.MX = mx;
  await client.ModifyRecord(params);
  return { success: true };
}

export async function deleteRecord(accountId: string, domain: string, recordId: number) {
  const creds = getCredentials(accountId);
  if (!creds) throw new Error('Account not found');
  const client = getDpClient(creds.secretId, creds.secretKey);
  await client.DeleteRecord({ Domain: domain, RecordId: recordId });
  return { success: true };
}

export async function modifyRecordStatus(accountId: string, domain: string, recordId: number, status: string) {
  const creds = getCredentials(accountId);
  if (!creds) throw new Error('Account not found');
  const client = getDpClient(creds.secretId, creds.secretKey);
  await client.ModifyRecordStatus({ Domain: domain, RecordId: recordId, Status: status });
  return { success: true };
}

// ---- Record Lines & Types ----

export async function describeRecordLineList(accountId: string, domain: string, domainGrade?: string) {
  const creds = getCredentials(accountId);
  if (!creds) throw new Error('Account not found');
  const client = getDpClient(creds.secretId, creds.secretKey);
  const params: any = { Domain: domain };
  if (domainGrade) params.DomainGrade = domainGrade;
  const result = await client.DescribeRecordLineList(params);
  return {
    lineList: (result.LineList || []).map((l: any) => ({
      lineName: l.LineName,
      fatherId: l.FatherId,
    })),
    lineGroupList: (result.LineGroupList || []).map((g: any) => ({
      lineName: g.LineName,
      lineList: (g.LineList || []).map((l: any) => l.LineName),
    })),
  };
}

export async function describeRecordType(accountId: string, domainGrade?: string) {
  const creds = getCredentials(accountId);
  if (!creds) throw new Error('Account not found');
  const client = getDpClient(creds.secretId, creds.secretKey);
  const result = await client.DescribeRecordType({ DomainGrade: domainGrade || 'DP_Free' });
  return (result.TypeList || []).map((t: string) => t);
}
