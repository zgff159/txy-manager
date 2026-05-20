import { safeStorage, app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface StoredAccount {
  id: string;
  name: string;
  secretId: string;
  secretKeyEncrypted: string;
  accountType: 'main' | 'sub';
  createdAt: number;
}

interface AccountData {
  accounts: StoredAccount[];
}

const DATA_DIR = path.join(app.getPath('userData'), 'data');
const ACCOUNTS_FILE = path.join(DATA_DIR, 'accounts.json');

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readAccounts(): AccountData {
  ensureDataDir();
  if (!fs.existsSync(ACCOUNTS_FILE)) {
    return { accounts: [] };
  }
  const raw = fs.readFileSync(ACCOUNTS_FILE, 'utf-8');
  return JSON.parse(raw);
}

function writeAccounts(data: AccountData): void {
  ensureDataDir();
  fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function encrypt(key: string): string {
  if (safeStorage.isEncryptionAvailable()) {
    return safeStorage.encryptString(key).toString('base64');
  }
  throw new Error('DPAPI encryption is not available on this system');
}

function decrypt(encrypted: string): string {
  if (safeStorage.isEncryptionAvailable()) {
    return safeStorage.decryptString(Buffer.from(encrypted, 'base64'));
  }
  throw new Error('DPAPI encryption is not available on this system');
}

export function listAccounts(): Omit<StoredAccount, 'secretKeyEncrypted'>[] {
  const data = readAccounts();
  return data.accounts.map(({ secretKeyEncrypted, ...rest }) => rest);
}

export function addAccount(name: string, secretId: string, secretKey: string, accountType: 'main' | 'sub' = 'main'): StoredAccount {
  const data = readAccounts();
  const account: StoredAccount = {
    id: crypto.randomUUID(),
    name,
    secretId,
    secretKeyEncrypted: encrypt(secretKey),
    accountType,
    createdAt: Date.now(),
  };
  data.accounts.push(account);
  writeAccounts(data);
  const { secretKeyEncrypted, ...rest } = account;
  return account;
}

export function updateAccount(id: string, name: string, secretId: string, secretKey?: string, accountType?: 'main' | 'sub'): StoredAccount | null {
  const data = readAccounts();
  const idx = data.accounts.findIndex((a) => a.id === id);
  if (idx === -1) return null;

  data.accounts[idx].name = name;
  data.accounts[idx].secretId = secretId;
  if (secretKey) {
    data.accounts[idx].secretKeyEncrypted = encrypt(secretKey);
  }
  if (accountType) {
    data.accounts[idx].accountType = accountType;
  }
  writeAccounts(data);
  const { secretKeyEncrypted, ...rest } = data.accounts[idx];
  return data.accounts[idx];
}

export function deleteAccount(id: string): boolean {
  const data = readAccounts();
  const len = data.accounts.length;
  data.accounts = data.accounts.filter((a) => a.id !== id);
  if (data.accounts.length === len) return false;
  writeAccounts(data);
  return true;
}

export function getCredentials(id: string): { secretId: string; secretKey: string } | null {
  const data = readAccounts();
  const account = data.accounts.find((a) => a.id === id);
  if (!account) return null;
  try {
    return {
      secretId: account.secretId,
      secretKey: decrypt(account.secretKeyEncrypted),
    };
  } catch (e: any) {
    throw new Error(`解密账号「${account.name}」的密钥失败: ${e.message || e}`);
  }
}

export function isEncryptionAvailable(): boolean {
  return safeStorage.isEncryptionAvailable();
}
