# CLAUDE.md — txy-manager

腾讯云多账号管理桌面应用。

## 架构

```
Electron 主进程 (electron/)
  ├── main.ts          # 窗口 1280x840, 菜单, 开发/生产模式加载
  ├── preload.ts       # contextIsolation contextBridge
  ├── ipc/index.ts     # IPC handlers 注册中心
  ├── api/             # 腾讯云 API 封装 (CVM/Lighthouse/Domain/COS/Billing/Traffic/SSH)
  └── store/credentials.ts  # safeStorage 加密存储账户凭证
Vite + React 渲染进程 (src/)
  ├── pages/           # 页面组件: Dashboard/CVM/Lighthouse/Domain/Traffic/Billing/COS/Accounts
  ├── store/           # Zustand: accountStore + appStore
  ├── types/           # TypeScript 接口定义
  └── components/      # Layout, SSHTerminal, AccountSwitcher, RegionSelector
```

## 技术栈

- Electron 33 + contextIsolation (no nodeIntegration)
- React 18 + TypeScript 5.6 + Vite 6
- Ant Design 5 (中文 zhCN locale, 主色 #0052d9)
- Zustand 5 状态管理
- xterm.js 6 + ssh2 1.17 终端
- tencentcloud-sdk-nodejs 4 + cos-nodejs-sdk-v5 2
- electron-builder 25 打包 (NSIS, Windows x64 only)

## 命令

```bash
npm run dev              # Vite 5173 + Electron 并行
npm run build            # 构建 + 打包安装程序
npm run build:renderer   # 仅 Vite 构建到 dist/
npm run build:electron   # 仅 tsc 编译 electron/ → dist-electron/
```

## 账户凭证

- 密钥通过 Electron `safeStorage` (DPAPI/Keychain) 加密存于 `%APPDATA%/txy-manager/data/accounts.json`
- secretId 明文存储，secretKey 加密存储
- IPC 通道 `accounts:list/add/update/delete` + `accounts:check-encryption`
- 凭证获取走 `getCredentials(id)` → `credentials.ts:104`

## IPC 通道清单

所有 IPC handle 在 `electron/ipc/index.ts` 注册，模式为 `<domain>:<action>`：
- `accounts:*` `cvm:*` `lh:*` `domain:*` `cos:*` `billing:*` `traffic:*` `ssh:*`
- `shell:openExternal` — 浏览器打开链接
- `client:clearCache` — 清除所有 API client 缓存

## API 缓存

各 API 模块独立维护 Map 缓存（key = `secretId__region`），切换账号或区域时调用 `client:clearCache` 清除。

## 注意事项

- 开发模式 Electron 连接 `http://localhost:5173`，生产模式加载 `dist/index.html`
- 生产构建依赖 `dist-electron/main.js` 作为入口
- 仅支持 Windows x64 打包（electron-builder.yml:12）
- `vite.config.ts` 中 `base: './'` 确保 Electron file:// 加载资源路径正确
