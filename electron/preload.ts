import { contextBridge, ipcRenderer } from 'electron';

const sshCallbacks: Array<(connId: string, data: string) => void> = [];

ipcRenderer.on('ssh:data', (_event, connId: string, data: string) => {
  sshCallbacks.forEach((cb) => cb(connId, data));
});

const api = {
  accounts: {
    list: () => ipcRenderer.invoke('accounts:list'),
    add: (name: string, secretId: string, secretKey: string, accountType?: string) =>
      ipcRenderer.invoke('accounts:add', name, secretId, secretKey, accountType),
    update: (id: string, name: string, secretId: string, secretKey?: string, accountType?: string) =>
      ipcRenderer.invoke('accounts:update', id, name, secretId, secretKey, accountType),
    delete: (id: string) => ipcRenderer.invoke('accounts:delete', id),
    checkEncryption: () => ipcRenderer.invoke('accounts:check-encryption'),
  },
  cvm: {
    describeInstances: (accountId: string, region: string) =>
      ipcRenderer.invoke('cvm:describeInstances', accountId, region),
    startInstances: (accountId: string, region: string, instanceIds: string[]) =>
      ipcRenderer.invoke('cvm:startInstances', accountId, region, instanceIds),
    stopInstances: (accountId: string, region: string, instanceIds: string[]) =>
      ipcRenderer.invoke('cvm:stopInstances', accountId, region, instanceIds),
    rebootInstances: (accountId: string, region: string, instanceIds: string[]) =>
      ipcRenderer.invoke('cvm:rebootInstances', accountId, region, instanceIds),
    resetInstance: (accountId: string, region: string, instanceId: string, imageId?: string) =>
      ipcRenderer.invoke('cvm:resetInstance', accountId, region, instanceId, imageId),
    describeRegions: (accountId: string) =>
      ipcRenderer.invoke('cvm:describeRegions', accountId),
    describeVncUrl: (accountId: string, region: string, instanceId: string) =>
      ipcRenderer.invoke('cvm:describeVncUrl', accountId, region, instanceId),
    describeSecurityGroups: (accountId: string, region: string, sgIds: string[]) =>
      ipcRenderer.invoke('cvm:describeSecurityGroups', accountId, region, sgIds),
    describeSecurityGroupPolicies: (accountId: string, region: string, sgId: string) =>
      ipcRenderer.invoke('cvm:describeSecurityGroupPolicies', accountId, region, sgId),
    createSecurityGroupPolicy: (accountId: string, region: string, sgId: string, direction: string, protocol: string, port: string, cidrBlock: string, action: string, description: string) =>
      ipcRenderer.invoke('cvm:createSecurityGroupPolicy', accountId, region, sgId, direction, protocol, port, cidrBlock, action, description),
    deleteSecurityGroupPolicy: (accountId: string, region: string, sgId: string, direction: string, policyIndex: number) =>
      ipcRenderer.invoke('cvm:deleteSecurityGroupPolicy', accountId, region, sgId, direction, policyIndex),
  },
  ssh: {
    connect: (connId: string, accountId: string, instanceId: string, region: string, username: string, password?: string, privateKey?: string) =>
      ipcRenderer.invoke('ssh:connect', connId, accountId, instanceId, region, username, password, privateKey),
    write: (connId: string, data: string) =>
      ipcRenderer.invoke('ssh:write', connId, data),
    resize: (connId: string, cols: number, rows: number) =>
      ipcRenderer.invoke('ssh:resize', connId, cols, rows),
    disconnect: (connId: string) =>
      ipcRenderer.invoke('ssh:disconnect', connId),
    onData: (callback: (connId: string, data: string) => void) => {
      sshCallbacks.push(callback);
      return () => {
        const idx = sshCallbacks.indexOf(callback);
        if (idx >= 0) sshCallbacks.splice(idx, 1);
      };
    },
  },
  billing: {
    getBalance: (accountId: string) =>
      ipcRenderer.invoke('billing:getBalance', accountId),
    getBillSummary: (accountId: string, month: string) =>
      ipcRenderer.invoke('billing:getBillSummary', accountId, month),
  },
  cos: {
    listBuckets: (accountId: string) =>
      ipcRenderer.invoke('cos:listBuckets', accountId),
    listObjects: (accountId: string, bucket: string, region: string, prefix: string) =>
      ipcRenderer.invoke('cos:listObjects', accountId, bucket, region, prefix),
    uploadFile: (accountId: string, bucket: string, region: string, prefix: string) =>
      ipcRenderer.invoke('cos:uploadFile', accountId, bucket, region, prefix),
    getDownloadUrl: (accountId: string, bucket: string, region: string, key: string) =>
      ipcRenderer.invoke('cos:getDownloadUrl', accountId, bucket, region, key),
    deleteObjects: (accountId: string, bucket: string, region: string, keys: string[]) =>
      ipcRenderer.invoke('cos:deleteObjects', accountId, bucket, region, keys),
    createFolder: (accountId: string, bucket: string, region: string, prefix: string, folderName: string) =>
      ipcRenderer.invoke('cos:createFolder', accountId, bucket, region, prefix, folderName),
  },
  lh: {
    describeInstances: (accountId: string, region: string) =>
      ipcRenderer.invoke('lh:describeInstances', accountId, region),
    startInstances: (accountId: string, region: string, instanceIds: string[]) =>
      ipcRenderer.invoke('lh:startInstances', accountId, region, instanceIds),
    stopInstances: (accountId: string, region: string, instanceIds: string[]) =>
      ipcRenderer.invoke('lh:stopInstances', accountId, region, instanceIds),
    rebootInstances: (accountId: string, region: string, instanceIds: string[]) =>
      ipcRenderer.invoke('lh:rebootInstances', accountId, region, instanceIds),
    describeFirewallRules: (accountId: string, region: string, instanceId: string) =>
      ipcRenderer.invoke('lh:describeFirewallRules', accountId, region, instanceId),
    createFirewallRule: (accountId: string, region: string, instanceId: string, protocol: string, port: string, cidrBlock: string, action: string, description: string, firewallVersion: number) =>
      ipcRenderer.invoke('lh:createFirewallRule', accountId, region, instanceId, protocol, port, cidrBlock, action, description, firewallVersion),
    deleteFirewallRule: (accountId: string, region: string, instanceId: string, protocol: string, port: string, cidrBlock: string, action: string, firewallVersion: number) =>
      ipcRenderer.invoke('lh:deleteFirewallRule', accountId, region, instanceId, protocol, port, cidrBlock, action, firewallVersion),
  },
  domain: {
    list: (accountId: string) =>
      ipcRenderer.invoke('domain:list', accountId),
    create: (accountId: string, domain: string) =>
      ipcRenderer.invoke('domain:create', accountId, domain),
    delete: (accountId: string, domain: string) =>
      ipcRenderer.invoke('domain:delete', accountId, domain),
    modifyStatus: (accountId: string, domain: string, status: string) =>
      ipcRenderer.invoke('domain:modifyStatus', accountId, domain, status),
    modifyRemark: (accountId: string, domain: string, remark: string) =>
      ipcRenderer.invoke('domain:modifyRemark', accountId, domain, remark),
    modifyLock: (accountId: string, domain: string, lockDays: number) =>
      ipcRenderer.invoke('domain:modifyLock', accountId, domain, lockDays),
    listRecords: (accountId: string, domain: string, domainId?: number) =>
      ipcRenderer.invoke('domain:listRecords', accountId, domain, domainId),
    createRecord: (accountId: string, domain: string, recordType: string, recordLine: string, value: string, name: string, ttl: number, mx?: number) =>
      ipcRenderer.invoke('domain:createRecord', accountId, domain, recordType, recordLine, value, name, ttl, mx),
    modifyRecord: (accountId: string, domain: string, recordId: number, recordType: string, recordLine: string, value: string, name: string, ttl: number, mx?: number) =>
      ipcRenderer.invoke('domain:modifyRecord', accountId, domain, recordId, recordType, recordLine, value, name, ttl, mx),
    deleteRecord: (accountId: string, domain: string, recordId: number) =>
      ipcRenderer.invoke('domain:deleteRecord', accountId, domain, recordId),
    modifyRecordStatus: (accountId: string, domain: string, recordId: number, status: string) =>
      ipcRenderer.invoke('domain:modifyRecordStatus', accountId, domain, recordId, status),
    listLines: (accountId: string, domain: string, domainGrade?: string) =>
      ipcRenderer.invoke('domain:listLines', accountId, domain, domainGrade),
    listTypes: (accountId: string, domainGrade?: string) =>
      ipcRenderer.invoke('domain:listTypes', accountId, domainGrade),
  },
  traffic: {
    describePackages: (accountId: string, region: string) =>
      ipcRenderer.invoke('traffic:describePackages', accountId, region),
    createPackages: (accountId: string, region: string, trafficAmount: number, trafficPackageCount: number, deductType: string) =>
      ipcRenderer.invoke('traffic:createPackages', accountId, region, trafficAmount, trafficPackageCount, deductType),
    deletePackages: (accountId: string, region: string, trafficPackageIds: string[]) =>
      ipcRenderer.invoke('traffic:deletePackages', accountId, region, trafficPackageIds),
  },
  shell: {
    openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
  },
  client: {
    clearCache: () => ipcRenderer.invoke('client:clearCache'),
  },
};

contextBridge.exposeInMainWorld('api', api);

export type ElectronAPI = typeof api;
