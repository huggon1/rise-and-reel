# Changelog

All notable changes to Rise & Reel are documented here.

## [0.1.0] - Unreleased

### Added

- A cohesive Sunset Lake title screen and game UI with new pixel-art lake environments, self-hosted English/Chinese display fonts, tactile tackle controls, woven rope nets, and state-aware capture feedback.
- Reproducible art-review screenshots and a real-input gameplay recording via `playwright.review.config.ts`.

- Desktop Solo Fishing with one configurable keyboard control.
- Desktop two-player 2D Fishing with independent X/Y controls and a shared catch zone.
- A short preparation countdown followed by unlimited active play.
- Explicit pause, resume, restart confirmation, and confirmed session ending.
- English and Chinese game menus with browser-local preferences.
- Session summaries and the latest 100 browser-local completed sessions.
- Personal-best and lifetime Solo scores with idempotent saving.
- Chromium, Firefox, and WebKit browser automation.

### Deployment candidate

- Cloudflare Workers Static Assets with SPA fallback.
- Version previews, a workers.dev fallback, and the `riseandreel.huggon1.com` Custom Domain configuration.

No deployment, domain cutover, tag, or GitHub Release is performed by this candidate.
