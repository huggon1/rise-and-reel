# Reel Rivals

Reel Rivals is a local fishing web game inspired by the tactile fishing loop in Stardew Valley. One to four players share one keyboard, control independent catch bars, and compete for points across endless simultaneous rounds.

## Gameplay

1. Choose one, two, three, or four players.
2. Let each player press a unique keyboard key to bind their control.
3. Hold the bound key to lift the catch bar and release it to let gravity pull the bar down.
4. Keep the moving fish inside the catch bar to fill the catch meter.
5. Watch the shared catch meter: it rises toward a catch while the fish overlaps the bar and falls toward escape while it does not.
6. Catch fish to earn points. Escaped fish do not remove existing points, and the next round starts automatically.

Each new fish starts with the catch meter at 50%. A perfect overlap catches it in about 2.3 seconds, while a completely missed fish takes about 4.5 seconds to escape.

The first version includes four fish:

| Fish | Difficulty | Reward |
| --- | --- | ---: |
| Carp | Easy | 10 |
| Bass | Medium | 25 |
| Catfish | Hard | 50 |
| Squid | Extreme | 100 |

Harder fish change targets more frequently, move faster, and struggle more unpredictably. Higher-difficulty fish become more common as a player catches more fish.

## Local development

The project requires Node.js 22.

```bash
nvm use
npm install
npm run dev
```

Open the local URL printed by Vite. The default development URL is usually `http://localhost:5173`.

## Verification

```bash
npm test
npm run build
npm run preview
```

## Architecture

- `src/App.tsx` owns screen navigation, player setup, keyboard bindings, and the animation loop.
- `src/game/config.ts` centralizes catch-bar physics, catch rates, round timing, and fish tuning.
- `src/game/engine.ts` contains the UI-independent fishing simulation and round lifecycle.
- `src/game/types.ts` defines the game state and fish data contracts.
- `src/styles.css` provides replaceable first-version visual styling without coupling presentation to the game engine.

The game has no backend. All players use the same browser and keyboard, and each fishing lane updates independently.
