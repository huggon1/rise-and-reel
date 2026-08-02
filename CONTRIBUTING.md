# Contributing to Reel Rivals

Thanks for helping improve Reel Rivals. Please keep changes focused and preserve the game's hold-to-rise, release-to-fall fishing loop.

## Set up the project

Reel Rivals requires Node.js 22.

```bash
nvm use
npm ci
npm run dev
```

## Before opening a pull request

Run the same checks used by CI:

```bash
npm test
npm run build
npm run deploy:cloudflare:dry-run
```

Keep gameplay and physics values in `src/game/config.ts`. Keep game simulation independent from React, browser storage, and hosting providers. Add tests for changes to simulation, match lifecycle, persistence, or derived statistics.

## Pull requests

- Explain the player-facing behavior and the reason for the change.
- Keep unrelated refactors out of feature pull requests.
- Include screenshots for visible UI changes when practical.
- Do not commit credentials, `.dev.vars`, Wrangler OAuth files, or service tokens.

## Deployment portability

The official site uses Cloudflare Workers Static Assets, but `npm run build` produces a standard `dist` directory that can be served by any static host with single-page application fallback support.
