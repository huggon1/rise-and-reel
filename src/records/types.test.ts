import { describe, expect, it } from "vitest";
import { createMatch } from "../game/match";
import { createGameRun } from "./types";

const player = { id: 1, name: "P1", keyCode: "Space" };
const steadyRandom = () => 0.5;

describe("game run creation", () => {
  it("captures a finished timed match as a versioned immutable result", () => {
    const match = createMatch("timed", [player], steadyRandom);
    match.phase = "finished";
    match.remainingSeconds = 0;
    match.countdownSeconds = 0;
    match.lanes[0].score = 75;
    match.lanes[0].catches = 3;
    match.lanes[0].escapes = 1;
    match.lanes[0].maxStreak = 2;
    match.lanes[0].activeSeconds = 60;
    match.lanes[0].overlapSeconds = 42;

    const run = createGameRun(match, {
      id: "run-1",
      startedAt: new Date("2026-08-02T00:00:00Z"),
      endedAt: new Date("2026-08-02T00:01:03Z"),
    });

    expect(run).toMatchObject({
      id: "run-1",
      mode: "timed",
      seed: null,
      durationMs: 60_000,
      playerCount: 1,
    });
    expect(run.players[0]).toMatchObject({
      name: "P1",
      score: 75,
      catches: 3,
      escapes: 1,
      maxStreak: 2,
      overlapRate: 0.7,
      catchRate: 0.75,
    });
  });

  it("rejects practice and unfinished matches", () => {
    expect(() =>
      createGameRun(createMatch("practice", [player], steadyRandom), {
        id: "practice",
        startedAt: new Date(),
        endedAt: new Date(),
      }),
    ).toThrow("Only finished timed matches");

    expect(() =>
      createGameRun(createMatch("timed", [player], steadyRandom), {
        id: "unfinished",
        startedAt: new Date(),
        endedAt: new Date(),
      }),
    ).toThrow("Only finished timed matches");
  });
});
