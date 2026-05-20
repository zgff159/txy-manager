import { lighthouse } from 'tencentcloud-sdk-nodejs';
import { getCredentials } from '../store/credentials';

const LhClient = lighthouse.v20200324.Client;
const lhCache = new Map<string, InstanceType<typeof LhClient>>();

function getLhClient(secretId: string, secretKey: string, region: string): InstanceType<typeof LhClient> {
  const key = `${secretId}__${region}`;
  if (lhCache.has(key)) return lhCache.get(key)!;
  const client = new LhClient({ credential: { secretId, secretKey }, region });
  lhCache.set(key, client);
  return client;
}

export function clearLhCache(): void { lhCache.clear(); }

export async function describeInstances(accountId: string, region: string) {
  const creds = getCredentials(accountId);
  if (!creds) throw new Error('Account not found');
  const client = getLhClient(creds.secretId, creds.secretKey, region);
  const result = await client.DescribeInstances({ Limit: 100 });
  return (result.InstanceSet || []).map((inst: any) => ({
    instanceId: inst.InstanceId,
    instanceName: inst.InstanceName,
    instanceState: inst.InstanceState,
    bundleId: inst.BundleId,
    blueprintId: inst.BlueprintId,
    cpu: inst.CPU,
    memory: inst.Memory,
    publicAddresses: inst.PublicAddresses || [],
    privateAddresses: inst.PrivateAddresses || [],
    osName: inst.OsName,
    platform: inst.Platform,
    platformType: inst.PlatformType,
    createdTime: inst.CreatedTime,
    expiredTime: inst.ExpiredTime,
    zone: inst.Zone,
    systemDisk: inst.SystemDisk ? { diskType: inst.SystemDisk.DiskType, diskSize: inst.SystemDisk.DiskSize } : null,
    internetAccessible: inst.InternetAccessible ? { internetMaxBandwidthOut: inst.InternetAccessible.InternetMaxBandwidthOut, internetChargeType: inst.InternetAccessible.InternetChargeType } : null,
  }));
}

export async function operateInstances(accountId: string, region: string, instanceIds: string[], operation: 'START' | 'STOP' | 'REBOOT') {
  const creds = getCredentials(accountId);
  if (!creds) throw new Error('Account not found');
  const client = getLhClient(creds.secretId, creds.secretKey, region);
  switch (operation) {
    case 'START': await client.StartInstances({ InstanceIds: instanceIds }); break;
    case 'STOP': await client.StopInstances({ InstanceIds: instanceIds }); break;
    case 'REBOOT': await client.RebootInstances({ InstanceIds: instanceIds }); break;
  }
  return { success: true };
}

export async function describeFirewallRules(accountId: string, region: string, instanceId: string) {
  const creds = getCredentials(accountId);
  if (!creds) throw new Error('Account not found');
  const client = getLhClient(creds.secretId, creds.secretKey, region);
  const result = await client.DescribeFirewallRules({ InstanceId: instanceId });
  return {
    firewallVersion: result.FirewallVersion || 0,
    rules: (result.FirewallRuleSet || []).map((rule: any) => ({
      protocol: rule.Protocol,
      port: rule.Port || '',
      cidrBlock: rule.CidrBlock || '',
      action: rule.Action || '',
      firewallRuleDescription: rule.FirewallRuleDescription || '',
    })),
  };
}

export async function createFirewallRule(
  accountId: string, region: string, instanceId: string,
  protocol: string, port: string, cidrBlock: string, action: string, description: string, firewallVersion: number
) {
  const creds = getCredentials(accountId);
  if (!creds) throw new Error('Account not found');
  const client = getLhClient(creds.secretId, creds.secretKey, region);
  await client.CreateFirewallRules({
    InstanceId: instanceId,
    FirewallRules: [{ Protocol: protocol, Port: port, CidrBlock: cidrBlock, Action: action, FirewallRuleDescription: description }],
    FirewallVersion: firewallVersion,
  });
  return { success: true };
}

export async function deleteFirewallRule(
  accountId: string, region: string, instanceId: string,
  protocol: string, port: string, cidrBlock: string, action: string, firewallVersion: number
) {
  const creds = getCredentials(accountId);
  if (!creds) throw new Error('Account not found');
  const client = getLhClient(creds.secretId, creds.secretKey, region);
  await client.DeleteFirewallRules({
    InstanceId: instanceId,
    FirewallRules: [{ Protocol: protocol, Port: port, CidrBlock: cidrBlock, Action: action }],
    FirewallVersion: firewallVersion,
  });
  return { success: true };
}
