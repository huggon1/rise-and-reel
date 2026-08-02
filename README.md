# Reel Rivals

Reel Rivals is a local fishing web game inspired by the tactile fishing loop in Stardew Valley. Players can compete in independent one-dimensional lanes or coordinate a shared two-dimensional catch zone from the same keyboard.

## Rivals gameplay

1. Choose a 60-second score match or endless practice.
2. Choose one, two, three, or four players.
3. Let each player press a unique keyboard key to bind their control. Solo games default to Space.
4. Hold the bound key to lift the catch bar and release it to let gravity pull the bar down.
5. Keep the moving fish inside the catch bar to fill the catch meter.
6. Catch fish to earn points. Escaped fish reset the current streak but do not remove existing points.
7. Timed matches freeze at 60 seconds and compare score, catches, escapes, best streak, overlap rate, and catch rate.

Finished timed Rivals matches are saved in the current browser. Solo history includes a personal best, retained-match summary, and switchable score/overlap/catch-rate trends for the latest 20 matches. Local multiplayer matches are stored as whole head-to-head results with P1–P4 standings and can be filtered by player count. Solo and multiplayer histories each retain their latest 100 matches; practice and cooperative sessions are not recorded.

Endless practice keeps generating fish without a timer or final standings. Practice scores are not treated as comparable match results.

## Cooperative gameplay

1. Choose Co-op from the home screen.
2. Bind one key for the X axis and one key for the Y axis.
3. Player 1 holds to move the shared catch zone right and releases to move it left.
4. Player 2 holds to move the shared catch zone up and releases to move it down.
5. Keep the moving fish inside the shared two-dimensional zone to fill one team catch meter.
6. Catches, escapes, score, streak, fish selection, and round transitions are shared by the team.

Each new fish starts with the catch meter at 50%. A perfect overlap catches it in about 2.3 seconds, while a completely missed fish takes about 4.5 seconds to escape.

The first version includes four fish:

| Fish | Difficulty | Reward |
| --- | --- | ---: |
| Carp | Easy | 10 |
| Bass | Medium | 25 |
| Catfish | Hard | 50 |
| Squid | Extreme | 100 |

Harder fish change targets more frequently, move faster, and struggle more unpredictably. Higher-difficulty fish become more common as a player or team catches more fish.

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

- `src/App.tsx` owns screen navigation, mode setup, keyboard bindings, and the animation loop.
- `src/game/config.ts` centralizes catch-bar physics, catch rates, round timing, cooperative controls, and fish tuning.
- `src/game/engine.ts` contains the UI-independent rivals simulation and round lifecycle.
- `src/game/match.ts` contains timed/practice match phases, countdowns, pausing, finishing, and rivals result calculation.
- `src/game/cooperativeEngine.ts` contains the UI-independent two-axis cooperative simulation and shared round lifecycle.
- `src/game/types.ts` defines the rivals, match, and cooperative state contracts.
- `src/records/repository.ts` defines the small storage interface used by the UI.
- `src/records/local-adapter.ts` provides versioned, fault-tolerant browser storage with separate solo and multiplayer limits.
- `src/records/analytics.ts` derives solo summaries and chart-ready trends from saved runs.
- `src/records/HistoryScreen.tsx` renders accessible local trends and match logs without coupling persistence to the game engine.
- `src/styles.css` provides replaceable first-version visual styling without coupling presentation to the game engines.

The game has no backend. Match history and recent Rivals controls stay in the current browser through local storage. All players use the same browser and keyboard. Rivals lanes update independently, while cooperative players intentionally share one arena and round state.
