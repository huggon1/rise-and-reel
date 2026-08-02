import { describe, expect, it } from "vitest";
import { getTrendPoints, summarizeSingleRuns } from "./analytics";
import type { GameRun } from "./types";

const makeRun = (index: number): GameRun => ({
  id: `run-${index}`,
  mode: "timed",
  seed: null,
  gameVersion: "0.1.0",
  balanceVersion: "1",
  startedAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
  endedAt: new Date(Date.UTC(2026, 0, index + 1, 0, 1)).toISOString(),
  durationMs: 60_000,
  playerCount: 1,
  players: [
    {
      playerId: 1,
      name: "P1",
      rank: 1,
      score: index * 10,
      catches: index,
      escapes: 1,
      maxStreak: index,
      overlapRate: index / 10,
      catchRate: index / 20,
    },
  ],
});
describe("record analytics", () => {
  it("summarizes retained single runs", () => {
    const summary = summarizeSingleRuns([makeRun(1), makeRun(3)]);
    expect(summary).toEqual({
      savedRuns: 2,
      highScore: 30,
      averageScore: 20,
      averageOverlapRate: 0.2,
      averageCatchRate: 0.1,
      highestStreak: 3,
    });
  });

  it("returns the newest limited runs in chronological chart order", () => {
    const newestFirst = [makeRun(4), makeRun(3), makeRun(2), makeRun(1)];
    expect(getTrendPoints(newestFirst, "score", 3).map((point) => point.runId)).toEqual([
      "run-2",
      "run-3",
      "run-4",
    ]);
  });

  it("handles empty history", () => {
    expect(summarizeSingleRuns([])).toEqual({
      savedRuns: 0,
      highScore: 0,
      averageScore: 0,
      averageOverlapRate: 0,
      averageCatchRate: 0,
      highestStreak: 0,
    });
    expect(getTrendPoints([], "score")).toEqual([]);
  });
});
