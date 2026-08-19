<div align="center">

# 🎣 Rise & Reel

### 每人一个按键，没有时限。跟着自己的潮汐慢慢钓。

一款轻松的钓鱼游戏：既可独自游玩、进行 2–4 人本地对战，也可由两人协作控制 2D 捕获区。

[🌊 立即游玩 Rise & Reel](https://riseandreel.huggon1.com/) · [English](README.md)

<img src="docs/media/rise-and-reel-key-art.png" alt="Rise & Reel 像素风宣传图：夕阳下，一名钓手向充满鱼群的湖泊抛线" width="100%">

</div>

## 🎬 游玩演示

<video src="./docs/media/rise-and-reel-gameplay.mp4" controls preload="metadata" poster="./docs/media/rise-and-reel-key-art.png" width="100%">
  <a href="./docs/media/rise-and-reel-gameplay.mp4">观看 18 秒完整游玩演示。</a>
</video>

## 🌊 坐稳，抛线，跟上鱼的节奏

Rise & Reel 把钓鱼变成简单而有手感的节奏挑战：

- **按住你选择的按键**，捕获区向上移动。
- **松开按键**，捕获区自然下落。
- **持续跟住鱼的位置**，直到成功收线。
- **没有限时压力**，想钓多久就钓多久，准备好后再结束会话。

没有催促你的计时器，也不需要注册账号。这里只有你、水面和下一次捕获。

## ✨ v0.1.0 包含什么

- 🎮 完整的桌面端单人钓鱼会话。
- ⌨️ 一个可自由配置的键盘控制键。
- 👥 支持 2–4 人共用一个键盘的本地竞技多人模式。
- 🧭 双人 2D 模式：共享一个捕获区，每人分别控制一个轴。
- 🌍 英文与简体中文界面。
- ⏸️ 暂停、继续、重新开始确认和明确的结束流程。
- 📊 会话总结包含有效时长、分数、捕获数、逃脱数和最佳连击。
- 🏆 在当前浏览器保存个人最佳、累计得分和最近 100 次会话。
- 🧪 Chromium、Firefox 与 WebKit 自动化验证。

多人比赛使用各自独立的钓鱼赛道。2D 模式仅支持桌面端键盘，由一名玩家控制 X 轴、另一名玩家控制 Y 轴。多人和 2D 结果均不会写入单人历史。云同步、账号、会话恢复和背景音乐仍不在此版本范围内。

## 🕹️ 操作方式

| 动作 | 操作 |
| --- | --- |
| 抬升捕获区 | 按住已选择的按键 |
| 降低捕获区 | 松开按键 |
| 开始本地比赛 | 选择 2–4 名玩家，并为每人绑定不同按键 |
| 水平控制 2D 捕获区 | 玩家 1 按住向右、松开向左 |
| 垂直控制 2D 捕获区 | 玩家 2 按住向上、松开向下 |
| 暂停或继续 | 使用画面中的按钮 |
| 结束会话或比赛 | 选择画面中的结束操作并确认 |

## 🚀 本地运行

需要 Node.js 22 或更高版本。

```bash
npm install
npm run dev
```

打开 `http://localhost:5173`，选择 **单人钓鱼**、**多人模式** 或 **2D 模式**。多人模式支持 2–4 人共用一个键盘；2D 模式在桌面端使用两个不同的键盘按键。

## ✅ 验证构建

```bash
npm test
npm run test:e2e
npm run build
```

## 🧰 技术栈

React 19 · TypeScript · Vite · Vitest · Playwright

## 📜 许可证

Rise & Reel 采用 [MIT License](LICENSE)。v0.1.0 不包含背景音乐或需要单独授权的音频资源。
