import COS = require('cos-nodejs-sdk-v5');
import { getCredentials } from '../store/credentials';
import { dialog, BrowserWindow } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

const cosInstances = new Map<string, COS>();

function getCosClient(secretId: string, secretKey: string): COS {
  const key = `${secretId}`;
  if (cosInstances.has(key)) {
    return cosInstances.get(key)!;
  }
  const cos = new COS({
    SecretId: secretId,
    SecretKey: secretKey,
  });
  cosInstances.set(key, cos);
  return cos;
}

export function clearCosCache(): void {
  cosInstances.clear();
}

export function listBuckets(accountId: string): Promise<any[]> {
  const creds = getCredentials(accountId);
  if (!creds) throw new Error('Account not found');
  const cos = getCosClient(creds.secretId, creds.secretKey);
  return new Promise((resolve, reject) => {
    cos.getService({}, (err: any, data: any) => {
      if (err) return reject(new Error(err.Message || err.message || '获取桶列表失败'));
      resolve((data.Buckets || []).map((b: any) => ({
        name: b.Name,
        location: b.Location,
        creationDate: b.CreationDate,
      })));
    });
  });
}

export function listObjects(accountId: string, bucket: string, region: string, prefix: string = ''): Promise<any[]> {
  const creds = getCredentials(accountId);
  if (!creds) throw new Error('Account not found');
  const cos = getCosClient(creds.secretId, creds.secretKey);
  return new Promise((resolve, reject) => {
    cos.getBucket({
      Bucket: bucket,
      Region: region,
      Prefix: prefix,
      Delimiter: '/',
      MaxKeys: 200,
    }, (err: any, data: any) => {
      if (err) return reject(new Error(err.Message || err.message || '获取文件列表失败'));
      const contents = (data.Contents || []).map((obj: any) => ({
        key: obj.Key,
        size: obj.Size ?? 0,
        lastModified: obj.LastModified,
        storageClass: obj.StorageClass,
      }));
      const commonPrefixes = (data.CommonPrefixes || []).map((p: any) => ({
        key: p.Prefix,
        size: 0,
        lastModified: '',
        storageClass: '',
      }));
      resolve([...commonPrefixes, ...contents]);
    });
  });
}

export async function uploadFile(accountId: string, bucket: string, region: string, prefix: string): Promise<any> {
  const creds = getCredentials(accountId);
  if (!creds) throw new Error('Account not found');

  const win = BrowserWindow.getFocusedWindow();
  if (!win) throw new Error('No window');

  const result = await dialog.showOpenDialog(win, {
    title: '选择要上传的文件',
    properties: ['openFile', 'multiSelections'],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true };
  }

  const cos = getCosClient(creds.secretId, creds.secretKey);
  const uploads = result.filePaths.map((filePath) => {
    const fileName = path.basename(filePath);
    const key = prefix ? `${prefix}${fileName}` : fileName;
    return new Promise((resolve, reject) => {
      cos.putObject({
        Bucket: bucket,
        Region: region,
        Key: key,
        Body: fs.createReadStream(filePath),
      }, (err: any, data: any) => {
        if (err) return reject(new Error(err.Message || err.message || '上传失败'));
        resolve({ key, etag: data.ETag });
      });
    });
  });

  const results = await Promise.all(uploads);
  return { canceled: false, uploaded: results };
}

export async function getDownloadUrl(accountId: string, bucket: string, region: string, key: string): Promise<string> {
  const creds = getCredentials(accountId);
  if (!creds) throw new Error('Account not found');
  const cos = getCosClient(creds.secretId, creds.secretKey);
  return new Promise((resolve, reject) => {
    cos.getObjectUrl({
      Bucket: bucket,
      Region: region,
      Key: key,
      Sign: true,
      Expires: 3600,
    }, (err: any, data: any) => {
      if (err) return reject(new Error(err.Message || err.message || '获取下载链接失败'));
      resolve(data.Url);
    });
  });
}

export async function deleteObjects(accountId: string, bucket: string, region: string, keys: string[]): Promise<any> {
  const creds = getCredentials(accountId);
  if (!creds) throw new Error('Account not found');
  const cos = getCosClient(creds.secretId, creds.secretKey);

  const objects = keys.map((key) => ({ Key: key }));
  return new Promise((resolve, reject) => {
    cos.deleteMultipleObject({
      Bucket: bucket,
      Region: region,
      Objects: objects,
    }, (err: any, data: any) => {
      if (err) return reject(new Error(err.Message || err.message || '删除失败'));
      resolve({ deleted: data.Deleted || [] });
    });
  });
}

export async function createFolder(accountId: string, bucket: string, region: string, prefix: string, folderName: string): Promise<any> {
  const creds = getCredentials(accountId);
  if (!creds) throw new Error('Account not found');
  const cos = getCosClient(creds.secretId, creds.secretKey);
  const key = prefix ? `${prefix}${folderName}/` : `${folderName}/`;
  return new Promise((resolve, reject) => {
    cos.putObject({
      Bucket: bucket,
      Region: region,
      Key: key,
      Body: '',
    }, (err: any, data: any) => {
      if (err) return reject(new Error(err.Message || err.message || '创建文件夹失败'));
      resolve({ key });
    });
  });
}
