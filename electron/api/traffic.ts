import { vpc } from 'tencentcloud-sdk-nodejs';
import { getCredentials } from '../store/credentials';

const VpcClient = vpc.v20170312.Client;
const vpcCache = new Map<string, InstanceType<typeof VpcClient>>();

function getVpcClient(secretId: string, secretKey: string, region: string): InstanceType<typeof VpcClient> {
  const key = `${secretId}__${region}`;
  if (vpcCache.has(key)) return vpcCache.get(key)!;
  const client = new VpcClient({ credential: { secretId, secretKey }, region });
  vpcCache.set(key, client);
  return client;
}

export function clearTrafficCache(): void { vpcCache.clear(); }

export async function describeTrafficPackages(accountId: string, region: string) {
  const creds = getCredentials(accountId);
  if (!creds) throw new Error('Account not found');
  const client = getVpcClient(creds.secretId, creds.secretKey, region);
  const result = await client.DescribeTrafficPackages({ Limit: 100 });
  return (result.TrafficPackageSet || []).map((pkg: any) => ({
    trafficPackageId: pkg.TrafficPackageId,
    trafficPackageName: pkg.TrafficPackageName,
    totalAmount: pkg.TotalAmount,
    remainingAmount: pkg.RemainingAmount,
    usedAmount: pkg.UsedAmount,
    status: pkg.Status,
    deductType: pkg.DeductType,
    createdTime: pkg.CreatedTime,
    deadline: pkg.Deadline,
  }));
}

export async function createTrafficPackages(
  accountId: string, region: string,
  trafficAmount: number, trafficPackageCount: number, deductType: string = 'FULL_TIME'
) {
  const creds = getCredentials(accountId);
  if (!creds) throw new Error('Account not found');
  const client = getVpcClient(creds.secretId, creds.secretKey, region);
  const result = await client.CreateTrafficPackages({
    TrafficAmount: trafficAmount,
    TrafficPackageCount: trafficPackageCount,
    DeductType: deductType,
  });
  return { success: true, requestId: result.RequestId };
}

export async function deleteTrafficPackages(accountId: string, region: string, trafficPackageIds: string[]) {
  const creds = getCredentials(accountId);
  if (!creds) throw new Error('Account not found');
  const client = getVpcClient(creds.secretId, creds.secretKey, region);
  const result = await client.DeleteTrafficPackages({ TrafficPackageIds: trafficPackageIds });
  return { success: true, requestId: result.RequestId };
}
