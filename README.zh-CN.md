# Rise & Reel

[English](README.md)

Rise & Reel 是一款仅在浏览器本地运行、面向桌面端的单人钓鱼游戏。选择一个键盘按键，等待短暂的准备倒计时后，即可不限时游玩。按住按键会抬升捕获区，松开后捕获区会下落。

![Rise & Reel 单人钓鱼首页](docs/screenshots/solo-home.jpg)

## 0.1.0 版本范围

- 英文与简体中文界面。
- 一个可配置的键盘控制键。
- 不限时单人会话，支持暂停、继续、重新开始确认与结束确认。
- 会话总结包含有效时长、分数、捕获数、逃脱数和最佳连击。
- 在当前浏览器保留最近 100 次已完成会话。
- 即使较早记录被清理，个人最佳与累计得分仍保持正确。

本版本仅支持桌面端键盘操作，不包含多人模式、2D 钓鱼、移动端触控、云同步、账号、数据分析、会话恢复或背景音乐。

## 本地运行

需要 Node.js 22 或更高版本。

```bash
npm install
npm run dev
```

开发服务器通常位于 `http://localhost:5173`。

## 验证候选版本

```bash
npm run verify
```

该命令会运行单元测试、Chromium / Firefox / WebKit 中的单人流程测试、生产构建，以及 Cloudflare 部署 dry run。

## 浏览器本地数据

Rise & Reel 没有账号、后端或云同步。偏好设置和已完成的单人会话仅保存在当前浏览器的版本化存储键中：

- `rise-and-reel.v1.preferences`
- `rise-and-reel.v1.solo-history`

首次加载时，应用只会移除已知旧键 `reel-rivals.preferences` 与 `reel-rivals.records`，不会迁移其中的数据，也不会改动其他浏览器存储。详情见[隐私说明](PRIVACY.md)。

## 部署候选

生产构建是配置为 Cloudflare Workers Static Assets 的静态单页应用。候选配置包含：

- SPA 回退路由；
- 规范地址 `https://riseandreel.huggon1.com/`；
- Cloudflare 预览地址；
- 默认 `workers.dev` 回退地址。

仓库中不包含 Worker 脚本、数据库、数据分析绑定或密钥。构建此候选版本不会执行部署、域名切换、创建标签或发布 GitHub Release。

## 许可证

源代码采用 [MIT License](LICENSE)。0.1.0 版本不包含背景音乐或需要单独授权的音频资源。
