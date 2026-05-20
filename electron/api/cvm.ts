import { getClient } from './client';
import { getCredentials } from '../store/credentials';

export async function describeInstances(accountId: string, region: string) {
  const creds = getCredentials(accountId);
  if (!creds) throw new Error('Account not found');
  const { cvm } = getClient(creds.secretId, creds.secretKey, region);
  const result = await cvm.DescribeInstances({ Limit: 100 });
  return result.InstanceSet?.map((inst: any) => ({
    instanceId: inst.InstanceId,
    instanceName: inst.InstanceName,
    instanceState: inst.InstanceState,
    instanceType: inst.InstanceType,
    cpu: inst.CPU,
    memory: inst.Memory,
    publicIpAddresses: inst.PublicIpAddresses || [],
    privateIpAddresses: inst.PrivateIpAddresses || [],
    osName: inst.OsName,
    createdTime: inst.CreatedTime,
    expiredTime: inst.ExpiredTime,
    zone: inst.Placement?.Zone,
    systemDisk: inst.SystemDisk ? {
      diskType: inst.SystemDisk.DiskType,
      diskSize: inst.SystemDisk.DiskSize,
    } : null,
    securityGroupIds: inst.SecurityGroupIds || [],
    dataDisks: (inst.DataDisks || []).map((d: any) => ({
      diskType: d.DiskType,
      diskSize: d.DiskSize,
      diskId: d.DiskId,
    })),
    vpcId: inst.VirtualPrivateCloud?.VpcId || '',
    subnetId: inst.VirtualPrivateCloud?.SubnetId || '',
  })) || [];
}

export async function operateInstances(
  accountId: string,
  region: string,
  instanceIds: string[],
  operation: 'START' | 'STOP' | 'REBOOT'
) {
  const creds = getCredentials(accountId);
  if (!creds) throw new Error('Account not found');
  const { cvm } = getClient(creds.secretId, creds.secretKey, region);
  switch (operation) {
    case 'START':
      await cvm.StartInstances({ InstanceIds: instanceIds });
      break;
    case 'STOP':
      await cvm.StopInstances({ InstanceIds: instanceIds });
      break;
    case 'REBOOT':
      await cvm.RebootInstances({ InstanceIds: instanceIds });
      break;
  }
  return { success: true };
}

export async function resetInstance(accountId: string, region: string, instanceId: string, imageId?: string) {
  const creds = getCredentials(accountId);
  if (!creds) throw new Error('Account not found');
  const { cvm } = getClient(creds.secretId, creds.secretKey, region);
  const params: any = { InstanceId: instanceId };
  if (imageId) params.ImageId = imageId;
  await cvm.ResetInstance(params);
  return { success: true };
}

export async function describeRegions(accountId: string) {
  const creds = getCredentials(accountId);
  if (!creds) throw new Error('Account not found');
  const { region } = getClient(creds.secretId, creds.secretKey);
  const result = await region.DescribeRegions({ Product: 'cvm' });
  return (result.RegionSet || []).map((r: any) => ({
    region: r.Region,
    regionName: r.RegionName,
    regionState: r.RegionState,
  }));
}

export async function describeVncUrl(accountId: string, region: string, instanceId: string) {
  const creds = getCredentials(accountId);
  if (!creds) throw new Error('Account not found');
  const { cvm } = getClient(creds.secretId, creds.secretKey, region);
  const result = await cvm.DescribeInstanceVncUrl({ InstanceId: instanceId });
  return { vncUrl: result.InstanceVncUrl || '' };
}

export async function describeSecurityGroups(accountId: string, region: string, securityGroupIds: string[]) {
  if (!securityGroupIds.length) return [];
  const creds = getCredentials(accountId);
  if (!creds) throw new Error('Account not found');
  const { vpc } = require('tencentcloud-sdk-nodejs');
  const VpcClient = vpc.v20170312.Client;
  const client = new VpcClient({ credential: { secretId: creds.secretId, secretKey: creds.secretKey }, region });
  const result = await client.DescribeSecurityGroups({ SecurityGroupIds: securityGroupIds });
  return (result.SecurityGroupSet || []).map((sg: any) => ({
    securityGroupId: sg.SecurityGroupId,
    securityGroupName: sg.SecurityGroupName,
    securityGroupDesc: sg.SecurityGroupDesc,
  }));
}

function getVpcClient(accountId: string, region: string) {
  const creds = getCredentials(accountId);
  if (!creds) throw new Error('Account not found');
  const { vpc } = require('tencentcloud-sdk-nodejs');
  const VpcClient = vpc.v20170312.Client;
  return new VpcClient({ credential: { secretId: creds.secretId, secretKey: creds.secretKey }, region });
}

export async function describeSecurityGroupPolicies(accountId: string, region: string, securityGroupId: string) {
  const client = getVpcClient(accountId, region);
  const result = await client.DescribeSecurityGroupPolicies({ SecurityGroupId: securityGroupId });
  const set = result.SecurityGroupPolicySet || {};
  const ingress = (set.Ingress || []).map((p: any) => ({ ...p, direction: 'ingress' }));
  const egress = (set.Egress || []).map((p: any) => ({ ...p, direction: 'egress' }));
  return { version: set.Version || '0', policies: [...ingress, ...egress] };
}

export async function createSecurityGroupPolicy(
  accountId: string, region: string, securityGroupId: string,
  direction: string, protocol: string, port: string, cidrBlock: string, action: string, description: string
) {
  const client = getVpcClient(accountId, region);
  const policy: any = { Protocol: protocol, Port: port, CidrBlock: cidrBlock, Action: action, PolicyDescription: description };
  const policySet = direction === 'ingress' ? { Ingress: [policy] } : { Egress: [policy] };
  await client.CreateSecurityGroupPolicies({ SecurityGroupId: securityGroupId, SecurityGroupPolicySet: policySet });
  return { success: true };
}

export async function deleteSecurityGroupPolicy(
  accountId: string, region: string, securityGroupId: string,
  direction: string, policyIndex: number
) {
  const client = getVpcClient(accountId, region);
  const policy: any = { PolicyIndex: policyIndex };
  const policySet = direction === 'ingress' ? { Ingress: [policy] } : { Egress: [policy] };
  await client.DeleteSecurityGroupPolicies({ SecurityGroupId: securityGroupId, SecurityGroupPolicySet: policySet });
  return { success: true };
}
