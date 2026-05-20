export interface Account {
  id: string;
  name: string;
  secretId: string;
  createdAt: number;
}

export interface AccountInput {
  name: string;
  secretId: string;
  secretKey: string;
}

export interface CVMInstance {
  instanceId: string;
  instanceName: string;
  instanceState: string;
  instanceType: string;
  cpu: number;
  memory: number;
  publicIpAddresses: string[];
  privateIpAddresses: string[];
  osName: string;
  createdTime: string;
  expiredTime: string;
  zone: string;
  systemDisk: { diskType: string; diskSize: number } | null;
  securityGroupIds?: string[];
  dataDisks?: { diskType: string; diskSize: number; diskId: string }[];
  vpcId?: string;
  subnetId?: string;
}

export interface BillingInfo {
  balance: number;
  creditBalance: number;
  realBalance: number;
  currency: string;
}

export interface COSBucket {
  name: string;
  location: string;
  creationDate: string;
}

export interface COSObject {
  key: string;
  size: number;
  lastModified: string;
  storageClass: string;
}

export interface Region {
  region: string;
  regionName: string;
  regionState: string;
}

export interface LighthouseInstance {
  instanceId: string;
  instanceName: string;
  instanceState: string;
  bundleId: string;
  blueprintId: string;
  cpu: number;
  memory: number;
  publicAddresses: string[];
  privateAddresses: string[];
  osName: string;
  platform: string;
  platformType: string;
  createdTime: string;
  expiredTime: string;
  zone: string;
  systemDisk: { diskType: string; diskSize: number } | null;
  internetAccessible: { internetMaxBandwidthOut: number; internetChargeType: string } | null;
}

export interface FirewallRule {
  protocol: string;
  port: string;
  cidrBlock: string;
  action: string;
  firewallRuleDescription: string;
}

export interface TrafficPackage {
  trafficPackageId: string;
  trafficPackageName: string;
  totalAmount: number;
  remainingAmount: number;
  usedAmount: number;
  status: string;
  deductType: string;
  createdTime: string;
  deadline: string;
}

export interface DomainInfo {
  domainId: number;
  domain: string;
  status: string;
  grade: string;
  ttl: number;
  dnsStatus: string;
  createdOn: string;
  updatedOn: string;
  recordCount: number;
  remark?: string;
}

export interface DnsRecord {
  recordId: number;
  name: string;
  type: string;
  value: string;
  line: string;
  ttl: number;
  status: string;
  mx: number;
  remark: string;
  updatedOn: string;
}

export type PageKey = 'dashboard' | 'cvm' | 'lh' | 'domain' | 'traffic' | 'billing' | 'cos' | 'accounts';
