# Rise & Reel

Rise & Reel is a browser-local Solo Fishing game. Bind one desktop key, wait through a short preparation count, then fish without a time limit. Hold the key to lift the catch zone and release it to let gravity pull the zone down.

The current public candidate includes:

- an English and Chinese Tide Map interface;
- configurable one-key Solo Fishing;
- unlimited sessions with explicit pause, resume, and confirmed ending;
- a closing summary with active time, score, catches, escapes, and best streak;
- browser-local history for the latest 100 completed sessions;
- personal-best and lifetime scores that remain correct when old history is pruned.

Shared-Screen Fishing, 2D Fishing, mobile touch, session recovery, and background music are not part of this candidate.

## Local development

Node.js 22 or newer is required.

```bash
nvm use
npm install
npm run dev
```

The development URL is usually `http://localhost:5173`.

## Verification

```bash
npm test
npm run test:e2e
npm run build
npm run deploy:cloudflare:dry-run
```

The Playwright seam currently runs the desktop Solo critical path in Chromium. The release-candidate work expands this to the full browser matrix.

## Browser-local data

Rise & Reel has no account, backend, or cloud synchronization. It stores data under versioned keys in the current browser:

- `rise-and-reel.v1.preferences`
- `rise-and-reel.v1.solo-history`

On first load it removes only the known legacy keys `reel-rivals.preferences` and `reel-rivals.records`. It does not migrate their values or touch unrelated browser storage.

## Architecture

- `src/App.tsx` owns Tide Map navigation, translation, the keyboard adapter, and browser event orchestration.
- `src/game/config.ts` centralizes physics, catch rates, round timing, and fish tuning.
- `src/game/engine.ts` contains the UI-independent one-dimensional fishing simulation.
- `src/game/session.ts` defines preparation, active time, pauses, confirmed Group Exit, and summary eligibility.
- `src/game/input.ts` defines the logical held/released controls consumed by gameplay.
- `src/solo/game.ts` composes the Solo session and one-dimensional engine without React or storage.
- `src/solo/preferences.ts` validates and stores language and Solo key preferences.
- `src/solo/storage.ts` is the versioned Solo history repository and owns retention, personal-best, lifetime-score, and idempotent-save semantics.
- `e2e/solo.spec.ts` exercises the public Solo flow at the browser boundary.

Older multiplayer and timed modules remain in the repository temporarily, but they are not imported by the public application.

## Deployment

The site uses Cloudflare Workers Static Assets with SPA fallback. There is no Worker script, database, analytics binding, or secret in the repository. `npm run build` produces a portable `dist` directory that can be served by any static host with SPA fallback.

## Project policies

- [Contributing](CONTRIBUTING.md)
- [Privacy](PRIVACY.md)
- [MIT License](LICENSE)
