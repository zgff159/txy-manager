interface ElectronAPI {
  accounts: {
    list: () => Promise<any[]>;
    add: (name: string, secretId: string, secretKey: string) => Promise<any>;
    update: (id: string, name: string, secretId: string, secretKey?: string, accountType?: string) => Promise<any>;
    delete: (id: string) => Promise<boolean>;
    checkEncryption: () => Promise<boolean>;
  };
  cvm: {
    describeInstances: (accountId: string, region: string) => Promise<any[]>;
    startInstances: (accountId: string, region: string, instanceIds: string[]) => Promise<any>;
    stopInstances: (accountId: string, region: string, instanceIds: string[]) => Promise<any>;
    rebootInstances: (accountId: string, region: string, instanceIds: string[]) => Promise<any>;
    describeRegions: (accountId: string) => Promise<any[]>;
    describeVncUrl: (accountId: string, region: string, instanceId: string) => Promise<{ vncUrl: string }>;
    describeSecurityGroups: (accountId: string, region: string, sgIds: string[]) => Promise<any[]>;
    describeSecurityGroupPolicies: (accountId: string, region: string, sgId: string) => Promise<{ version: string; policies: any[] }>;
    createSecurityGroupPolicy: (accountId: string, region: string, sgId: string, direction: string, protocol: string, port: string, cidrBlock: string, action: string, description: string) => Promise<any>;
    deleteSecurityGroupPolicy: (accountId: string, region: string, sgId: string, direction: string, policyIndex: number) => Promise<any>;
  };
  ssh: {
    connect: (connId: string, accountId: string, instanceId: string, region: string, username: string, password?: string, privateKey?: string) => Promise<void>;
    write: (connId: string, data: string) => Promise<void>;
    resize: (connId: string, cols: number, rows: number) => Promise<void>;
    disconnect: (connId: string) => Promise<void>;
    onData: (callback: (connId: string, data: string) => void) => () => void;
  };
  billing: {
    getBalance: (accountId: string) => Promise<any>;
    getBillSummary: (accountId: string, month: string) => Promise<any[]>;
  };
  cos: {
    listBuckets: (accountId: string) => Promise<any[]>;
    listObjects: (accountId: string, bucket: string, region: string, prefix: string) => Promise<any[]>;
    uploadFile: (accountId: string, bucket: string, region: string, prefix: string) => Promise<any>;
    getDownloadUrl: (accountId: string, bucket: string, region: string, key: string) => Promise<string>;
    deleteObjects: (accountId: string, bucket: string, region: string, keys: string[]) => Promise<any>;
    createFolder: (accountId: string, bucket: string, region: string, prefix: string, folderName: string) => Promise<any>;
  };
  lh: {
    describeInstances: (accountId: string, region: string) => Promise<any[]>;
    startInstances: (accountId: string, region: string, instanceIds: string[]) => Promise<any>;
    stopInstances: (accountId: string, region: string, instanceIds: string[]) => Promise<any>;
    rebootInstances: (accountId: string, region: string, instanceIds: string[]) => Promise<any>;
    describeFirewallRules: (accountId: string, region: string, instanceId: string) => Promise<{ firewallVersion: number; rules: any[] }>;
    createFirewallRule: (accountId: string, region: string, instanceId: string, protocol: string, port: string, cidrBlock: string, action: string, description: string, firewallVersion: number) => Promise<any>;
    deleteFirewallRule: (accountId: string, region: string, instanceId: string, protocol: string, port: string, cidrBlock: string, action: string, firewallVersion: number) => Promise<any>;
  };
  domain: {
    list: (accountId: string) => Promise<any[]>;
    create: (accountId: string, domain: string) => Promise<any>;
    delete: (accountId: string, domain: string) => Promise<any>;
    modifyStatus: (accountId: string, domain: string, status: string) => Promise<any>;
    modifyRemark: (accountId: string, domain: string, remark: string) => Promise<any>;
    modifyLock: (accountId: string, domain: string, lockDays: number) => Promise<any>;
    listRecords: (accountId: string, domain: string, domainId?: number) => Promise<any[]>;
    createRecord: (accountId: string, domain: string, recordType: string, recordLine: string, value: string, name: string, ttl: number, mx?: number) => Promise<any>;
    modifyRecord: (accountId: string, domain: string, recordId: number, recordType: string, recordLine: string, value: string, name: string, ttl: number, mx?: number) => Promise<any>;
    deleteRecord: (accountId: string, domain: string, recordId: number) => Promise<any>;
    modifyRecordStatus: (accountId: string, domain: string, recordId: number, status: string) => Promise<any>;
    listLines: (accountId: string, domain: string, domainGrade?: string) => Promise<any>;
    listTypes: (accountId: string, domainGrade?: string) => Promise<string[]>;
  };
  traffic: {
    describePackages: (accountId: string, region: string) => Promise<any[]>;
    createPackages: (accountId: string, region: string, trafficAmount: number, trafficPackageCount: number, deductType: string) => Promise<any>;
    deletePackages: (accountId: string, region: string, trafficPackageIds: string[]) => Promise<any>;
  };
  shell: {
    openExternal: (url: string) => Promise<void>;
  };
  client: {
    clearCache: () => Promise<void>;
  };
}

declare global {
  interface Window {
    api: ElectronAPI;
  }
}

export {};
