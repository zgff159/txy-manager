import { cvm } from 'tencentcloud-sdk-nodejs';
import { billing } from 'tencentcloud-sdk-nodejs';
import { region } from 'tencentcloud-sdk-nodejs';

const CvmClient = cvm.v20170312.Client;
const BillingClient = billing.v20180709.Client;
const RegionClient = region.v20220627.Client;

export interface ClientSet {
  cvm: InstanceType<typeof CvmClient>;
  billing: InstanceType<typeof BillingClient>;
  region: InstanceType<typeof RegionClient>;
}

const clientCache = new Map<string, ClientSet>();

export function getClient(secretId: string, secretKey: string, regionName: string = 'ap-guangzhou'): ClientSet {
  const key = `${secretId}__${regionName}`;
  if (clientCache.has(key)) {
    return clientCache.get(key)!;
  }
  const credential = { secretId, secretKey };
  const set: ClientSet = {
    cvm: new CvmClient({ credential, region: regionName }),
    billing: new BillingClient({ credential, region: 'ap-guangzhou' }),
    region: new RegionClient({ credential, region: 'ap-guangzhou' }),
  };
  clientCache.set(key, set);
  return set;
}

export function clearClientCache(): void {
  clientCache.clear();
}
