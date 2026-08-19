<div align="center">

# 🎣 Rise & Reel

### One key each. No clock. Your tide, your pace.

A calm fishing game for solo sessions, local 2–4 player showdowns, or two-player 2D cooperation.

[🌊 Play Rise & Reel](https://riseandreel.huggon1.com/) · [简体中文](README.zh-CN.md)

<img src="docs/media/rise-and-reel-key-art.png" alt="Rise & Reel pixel-art key art with a solo angler casting into a lively lake at sunset" width="100%">

</div>

## 🎬 Gameplay demo

https://github.com/user-attachments/assets/f779a675-283b-431c-a957-fca98b6c9b61

## 🌊 Settle in and keep the line moving

Rise & Reel turns fishing into a simple, satisfying rhythm:

- **Hold your chosen key** to lift the catch zone.
- **Release it** to let the zone fall.
- **Stay with the fish** long enough to reel it in.
- **Keep fishing without a timer**, then end the session whenever you are ready.

No frantic countdown. No account setup. Just you, the water, and the next catch.

## ✨ What is inside v0.1.0

- 🎮 A complete desktop Solo Fishing session.
- ⌨️ One configurable keyboard control.
- 👥 Local competitive Multiplayer for 2–4 players on one keyboard.
- 🧭 Two-player 2D Fishing with one shared catch zone and one keyboard control per axis.
- 🌍 English and Simplified Chinese interfaces.
- ⏸️ Pause, resume, restart confirmation, and a deliberate session ending.
- 📊 Session summaries with active time, score, catches, escapes, and best streak.
- 🏆 Personal bests, lifetime score, and the latest 100 sessions saved in your browser.
- 🧪 Automated coverage in Chromium, Firefox, and WebKit.

Multiplayer matches use independent lanes. 2D Fishing is a desktop-keyboard mode where one player steers the X axis and another steers the Y axis. Multiplayer and 2D results are not written to Solo History. Cloud sync, accounts, session recovery, and background music remain outside this release.

## 🕹️ Controls

| Action | Control |
| --- | --- |
| Raise the catch zone | Hold your selected key |
| Lower the catch zone | Release the key |
| Start a local match | Choose 2–4 players and bind a unique key for each |
| Steer the 2D zone horizontally | Player 1 holds to move right and releases to move left |
| Steer the 2D zone vertically | Player 2 holds to move up and releases to move down |
| Pause or continue | Use the on-screen control |
| Finish a session or match | Choose the on-screen end action and confirm |

## 🚀 Run it locally

Node.js 22 or newer is required.

```bash
npm install
npm run dev
```

Open `http://localhost:5173`, then choose **Solo Fishing**, **Multiplayer**, or **2D Fishing**. Multiplayer supports 2–4 people sharing one keyboard; 2D Fishing uses two unique keyboard controls on desktop.

## ✅ Verify the build

```bash
npm test
npm run test:e2e
npm run build
```

## 🧰 Built with

React 19 · TypeScript · Vite · Vitest · Playwright

## 📜 License

Rise & Reel is available under the [MIT License](LICENSE). Version 0.1.0 contains no background music or separately licensed audio assets.
