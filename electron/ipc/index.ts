import { ipcMain, shell } from 'electron';
import * as credentials from '../store/credentials';
import * as cvmApi from '../api/cvm';
import * as billingApi from '../api/billing';
import * as cosApi from '../api/cos';
import { clearClientCache } from '../api/client';
import { clearCosCache } from '../api/cos';
import * as lhApi from '../api/lighthouse';
import * as trafficApi from '../api/traffic';
import * as sshApi from '../api/ssh';
import * as domainApi from '../api/domain';

export function registerIpcHandlers(): void {

  // ---- Accounts ----
  ipcMain.handle('accounts:list', () => credentials.listAccounts());
  ipcMain.handle('accounts:add', (_e, name: string, secretId: string, secretKey: string, accountType?: string) =>
    credentials.addAccount(name, secretId, secretKey, accountType as 'main' | 'sub'));
  ipcMain.handle('accounts:update', (_e, id: string, name: string, secretId: string, secretKey?: string, accountType?: string) =>
    credentials.updateAccount(id, name, secretId, secretKey, accountType as 'main' | 'sub'));
  ipcMain.handle('accounts:delete', (_e, id: string) => credentials.deleteAccount(id));
  ipcMain.handle('accounts:check-encryption', () => credentials.isEncryptionAvailable());

  // ---- CVM ----
  ipcMain.handle('cvm:describeInstances', (_e, accountId: string, region: string) =>
    cvmApi.describeInstances(accountId, region));
  ipcMain.handle('cvm:startInstances', (_e, accountId: string, region: string, instanceIds: string[]) =>
    cvmApi.operateInstances(accountId, region, instanceIds, 'START'));
  ipcMain.handle('cvm:stopInstances', (_e, accountId: string, region: string, instanceIds: string[]) =>
    cvmApi.operateInstances(accountId, region, instanceIds, 'STOP'));
  ipcMain.handle('cvm:rebootInstances', (_e, accountId: string, region: string, instanceIds: string[]) =>
    cvmApi.operateInstances(accountId, region, instanceIds, 'REBOOT'));
  ipcMain.handle('cvm:resetInstance', (_e, accountId: string, region: string, instanceId: string, imageId?: string) =>
    cvmApi.resetInstance(accountId, region, instanceId, imageId));
  ipcMain.handle('cvm:describeRegions', (_e, accountId: string) =>
    cvmApi.describeRegions(accountId));
  ipcMain.handle('cvm:describeVncUrl', (_e, accountId: string, region: string, instanceId: string) =>
    cvmApi.describeVncUrl(accountId, region, instanceId));
  ipcMain.handle('cvm:describeSecurityGroups', (_e, accountId: string, region: string, sgIds: string[]) =>
    cvmApi.describeSecurityGroups(accountId, region, sgIds));
  ipcMain.handle('cvm:describeSecurityGroupPolicies', (_e, accountId: string, region: string, sgId: string) =>
    cvmApi.describeSecurityGroupPolicies(accountId, region, sgId));
  ipcMain.handle('cvm:createSecurityGroupPolicy', (_e, accountId: string, region: string, sgId: string, direction: string, protocol: string, port: string, cidrBlock: string, action: string, description: string) =>
    cvmApi.createSecurityGroupPolicy(accountId, region, sgId, direction, protocol, port, cidrBlock, action, description));
  ipcMain.handle('cvm:deleteSecurityGroupPolicy', (_e, accountId: string, region: string, sgId: string, direction: string, policyIndex: number) =>
    cvmApi.deleteSecurityGroupPolicy(accountId, region, sgId, direction, policyIndex));

  // ---- SSH ----
  ipcMain.handle('ssh:connect', (_e, connId: string, accountId: string, instanceId: string, region: string, username: string, password?: string, privateKey?: string) => {
    sshApi.sshConnect(connId, accountId, instanceId, region, username, password, privateKey);
  });
  ipcMain.handle('ssh:write', (_e, connId: string, data: string) => sshApi.sshWrite(connId, data));
  ipcMain.handle('ssh:resize', (_e, connId: string, cols: number, rows: number) => sshApi.sshResize(connId, cols, rows));
  ipcMain.handle('ssh:disconnect', (_e, connId: string) => sshApi.sshDisconnect(connId));

  // ---- Billing ----
  ipcMain.handle('billing:getBalance', (_e, accountId: string) => billingApi.getBalance(accountId));
  ipcMain.handle('billing:getBillSummary', (_e, accountId: string, month: string) =>
    billingApi.getBillSummary(accountId, month));

  // ---- COS ----
  ipcMain.handle('cos:listBuckets', (_e, accountId: string) => cosApi.listBuckets(accountId));
  ipcMain.handle('cos:listObjects', (_e, accountId: string, bucket: string, region: string, prefix: string) =>
    cosApi.listObjects(accountId, bucket, region, prefix));
  ipcMain.handle('cos:uploadFile', (_e, accountId: string, bucket: string, region: string, prefix: string) =>
    cosApi.uploadFile(accountId, bucket, region, prefix));
  ipcMain.handle('cos:getDownloadUrl', (_e, accountId: string, bucket: string, region: string, key: string) =>
    cosApi.getDownloadUrl(accountId, bucket, region, key));
  ipcMain.handle('cos:deleteObjects', (_e, accountId: string, bucket: string, region: string, keys: string[]) =>
    cosApi.deleteObjects(accountId, bucket, region, keys));
  ipcMain.handle('cos:createFolder', (_e, accountId: string, bucket: string, region: string, prefix: string, folderName: string) =>
    cosApi.createFolder(accountId, bucket, region, prefix, folderName));

  // ---- Lighthouse ----
  ipcMain.handle('lh:describeInstances', (_e, accountId: string, region: string) =>
    lhApi.describeInstances(accountId, region));
  ipcMain.handle('lh:startInstances', (_e, accountId: string, region: string, instanceIds: string[]) =>
    lhApi.operateInstances(accountId, region, instanceIds, 'START'));
  ipcMain.handle('lh:stopInstances', (_e, accountId: string, region: string, instanceIds: string[]) =>
    lhApi.operateInstances(accountId, region, instanceIds, 'STOP'));
  ipcMain.handle('lh:rebootInstances', (_e, accountId: string, region: string, instanceIds: string[]) =>
    lhApi.operateInstances(accountId, region, instanceIds, 'REBOOT'));
  ipcMain.handle('lh:describeFirewallRules', (_e, accountId: string, region: string, instanceId: string) =>
    lhApi.describeFirewallRules(accountId, region, instanceId));
  ipcMain.handle('lh:createFirewallRule', (_e, accountId: string, region: string, instanceId: string, protocol: string, port: string, cidrBlock: string, action: string, description: string, firewallVersion: number) =>
    lhApi.createFirewallRule(accountId, region, instanceId, protocol, port, cidrBlock, action, description, firewallVersion));
  ipcMain.handle('lh:deleteFirewallRule', (_e, accountId: string, region: string, instanceId: string, protocol: string, port: string, cidrBlock: string, action: string, firewallVersion: number) =>
    lhApi.deleteFirewallRule(accountId, region, instanceId, protocol, port, cidrBlock, action, firewallVersion));

  // ---- Traffic Packages ----
  ipcMain.handle('traffic:describePackages', (_e, accountId: string, region: string) =>
    trafficApi.describeTrafficPackages(accountId, region));
  ipcMain.handle('traffic:createPackages', (_e, accountId: string, region: string, trafficAmount: number, trafficPackageCount: number, deductType: string) =>
    trafficApi.createTrafficPackages(accountId, region, trafficAmount, trafficPackageCount, deductType));
  ipcMain.handle('traffic:deletePackages', (_e, accountId: string, region: string, trafficPackageIds: string[]) =>
    trafficApi.deleteTrafficPackages(accountId, region, trafficPackageIds));

  // ---- Domain / DNSPod ----
  ipcMain.handle('domain:list', (_e, accountId: string) =>
    domainApi.describeDomainList(accountId));
  ipcMain.handle('domain:create', (_e, accountId: string, domain: string) =>
    domainApi.createDomain(accountId, domain));
  ipcMain.handle('domain:delete', (_e, accountId: string, domain: string) =>
    domainApi.deleteDomain(accountId, domain));
  ipcMain.handle('domain:modifyStatus', (_e, accountId: string, domain: string, status: string) =>
    domainApi.modifyDomainStatus(accountId, domain, status));
  ipcMain.handle('domain:modifyRemark', (_e, accountId: string, domain: string, remark: string) =>
    domainApi.modifyDomainRemark(accountId, domain, remark));
  ipcMain.handle('domain:modifyLock', (_e, accountId: string, domain: string, lockDays: number) =>
    domainApi.modifyDomainLock(accountId, domain, lockDays));
  ipcMain.handle('domain:listRecords', (_e, accountId: string, domain: string, domainId?: number) =>
    domainApi.describeRecordList(accountId, domain, domainId));
  ipcMain.handle('domain:createRecord', (_e, accountId: string, domain: string, recordType: string, recordLine: string, value: string, name: string, ttl: number, mx?: number) =>
    domainApi.createRecord(accountId, domain, recordType, recordLine, value, name, ttl, mx));
  ipcMain.handle('domain:modifyRecord', (_e, accountId: string, domain: string, recordId: number, recordType: string, recordLine: string, value: string, name: string, ttl: number, mx?: number) =>
    domainApi.modifyRecord(accountId, domain, recordId, recordType, recordLine, value, name, ttl, mx));
  ipcMain.handle('domain:deleteRecord', (_e, accountId: string, domain: string, recordId: number) =>
    domainApi.deleteRecord(accountId, domain, recordId));
  ipcMain.handle('domain:modifyRecordStatus', (_e, accountId: string, domain: string, recordId: number, status: string) =>
    domainApi.modifyRecordStatus(accountId, domain, recordId, status));
  ipcMain.handle('domain:listLines', (_e, accountId: string, domain: string, domainGrade?: string) =>
    domainApi.describeRecordLineList(accountId, domain, domainGrade));
  ipcMain.handle('domain:listTypes', (_e, accountId: string, domainGrade?: string) =>
    domainApi.describeRecordType(accountId, domainGrade));

  // ---- Shell / External ----
  ipcMain.handle('shell:openExternal', (_e, url: string) => shell.openExternal(url));

  // ---- Client cache ----
  ipcMain.handle('client:clearCache', () => {
    clearClientCache();
    clearCosCache();
    lhApi.clearLhCache();
    trafficApi.clearTrafficCache();
    domainApi.clearDpCache();
  });
}
