import { Client, ClientChannel } from 'ssh2';
import { BrowserWindow } from 'electron';
import { getCredentials } from '../store/credentials';
import { getClient } from './client';

interface SshSession {
  client: Client;
  stream: ClientChannel | null;
  win: BrowserWindow;
}

const sessions = new Map<string, SshSession>();

function getPublicIp(accountId: string, instanceId: string, region: string): Promise<string> {
  const creds = getCredentials(accountId);
  if (!creds) return Promise.reject(new Error('Account not found'));
  const { cvm } = getClient(creds.secretId, creds.secretKey, region);
  return cvm.DescribeInstances({ InstanceIds: [instanceId] }).then((result) => {
    const inst = result.InstanceSet?.[0] as any;
    const ip = inst?.PublicIpAddresses?.[0];
    if (!ip) throw new Error('实例没有公网 IP，无法 SSH 连接');
    return ip;
  });
}

export function sshConnect(
  connId: string,
  accountId: string,
  instanceId: string,
  region: string,
  username: string,
  password?: string,
  privateKey?: string
): void {
  const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
  if (!win) return;

  getPublicIp(accountId, instanceId, region).then((host) => {
    const client = new Client();
    const session: SshSession = { client, stream: null, win };

    client.on('ready', () => {
      client.shell({ term: 'xterm-256color', cols: 80, rows: 24 }, (err: Error | undefined, stream: ClientChannel) => {
        if (err) {
          win.webContents.send('ssh:data', connId, `\r\n*** SSH Shell 错误: ${err.message} ***\r\n`);
          return;
        }
        session.stream = stream;
        stream.on('data', (data: Buffer) => {
          win.webContents.send('ssh:data', connId, data.toString('utf-8'));
        });
        stream.on('close', () => {
          win.webContents.send('ssh:data', connId, '\r\n*** 连接已关闭 ***\r\n');
          sessions.delete(connId);
        });
        stream.stderr?.on('data', (data: Buffer) => {
          win.webContents.send('ssh:data', connId, data.toString('utf-8'));
        });
        win.webContents.send('ssh:data', connId, `\r\n*** 已连接到 ${host} ***\r\n`);
      });
    });

    client.on('error', (err: Error) => {
      win.webContents.send('ssh:data', connId, `\r\n*** SSH 错误: ${err.message} ***\r\n`);
      sessions.delete(connId);
    });

    client.on('close', () => {
      win.webContents.send('ssh:data', connId, '\r\n*** SSH 连接已断开 ***\r\n');
      sessions.delete(connId);
    });

    const connectConfig: any = { host, port: 22, username, readyTimeout: 15000 };
    if (privateKey) {
      connectConfig.privateKey = privateKey;
      if (password) connectConfig.passphrase = password;
    } else if (password) {
      connectConfig.password = password;
    }

    client.connect(connectConfig);
    sessions.set(connId, session);
  }).catch((err: Error) => {
    win.webContents.send('ssh:data', connId, `\r\n*** 获取实例 IP 失败: ${err.message} ***\r\n`);
  });
}

export function sshWrite(connId: string, data: string): void {
  const session = sessions.get(connId);
  if (session?.stream) {
    session.stream.write(data);
  }
}

export function sshResize(connId: string, cols: number, rows: number): void {
  const session = sessions.get(connId);
  if (session?.stream) {
    session.stream.setWindow(rows, cols, 0, 0);
  }
}

export function sshDisconnect(connId: string): void {
  const session = sessions.get(connId);
  if (session) {
    session.client.end();
    sessions.delete(connId);
  }
}
