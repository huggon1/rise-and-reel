import { describe, expect, it } from "vitest";
import { GAME_CONFIG } from "./config";
import { createLogicalInput, playerControlId } from "./input";
import {
  advanceMatch,
  createMatch,
  getMatchResults,
  pauseMatch,
  resumeMatch,
} from "./match";
import type { MatchState, PlayerDefinition } from "./types";

const steadyRandom = () => 0.5;
const players: PlayerDefinition[] = [
  { id: 1, name: "Player 1", keyCode: "KeyF" },
  { id: 2, name: "Player 2", keyCode: "KeyJ" },
];
const noInput = createLogicalInput();

describe("timed matches", () => {
  it("counts down before advancing the lanes and match clock", () => {
    let match = createMatch("timed", players, steadyRandom);

    match = advanceMatch(match, noInput, 2, steadyRandom);
    expect(match.phase).toBe("countdown");
    expect(match.countdownSeconds).toBe(1);
    expect(match.remainingSeconds).toBe(
      GAME_CONFIG.match.timedDurationSeconds,
    );
    expect(match.lanes[0].activeSeconds).toBe(0);

    match = advanceMatch(match, noInput, 1.25, steadyRandom);
    expect(match.phase).toBe("playing");
    expect(match.countdownSeconds).toBe(0);
    expect(match.remainingSeconds).toBeCloseTo(59.75, 8);
    expect(match.lanes[0].activeSeconds).toBeCloseTo(0.25, 8);
  });

  it("finishes once after exactly sixty seconds of active play", () => {
    let match = createMatch("timed", players, steadyRandom);
    match = advanceMatch(match, noInput, 63, steadyRandom);

    expect(match.phase).toBe("finished");
    expect(match.remainingSeconds).toBe(0);
    expect(match.lanes[0].activeSeconds).toBeCloseTo(60, 6);

    const frozen = advanceMatch(
      match,
      createLogicalInput([playerControlId(1)]),
      10,
      steadyRandom,
    );
    expect(frozen).toBe(match);
  });

  it("produces the same timer result for one large or many small updates", () => {
    const initial = createMatch("timed", players, steadyRandom);
    const oneUpdate = advanceMatch(initial, noInput, 4.6, steadyRandom);
    let manyUpdates = initial;

    for (let index = 0; index < 46; index += 1) {
      manyUpdates = advanceMatch(manyUpdates, noInput, 0.1, steadyRandom);
    }

    expect(oneUpdate.phase).toBe("playing");
    expect(manyUpdates.phase).toBe("playing");
    expect(oneUpdate.remainingSeconds).toBeCloseTo(
      manyUpdates.remainingSeconds ?? 0,
      8,
    );
    expect(oneUpdate.lanes[0].activeSeconds).toBeCloseTo(
      manyUpdates.lanes[0].activeSeconds,
      8,
    );
  });

  it("does not advance countdowns or active matches while paused", () => {
    const countdown = createMatch("timed", players, steadyRandom);
    const pausedCountdown = pauseMatch(countdown);
    const unchangedCountdown = advanceMatch(
      pausedCountdown,
      noInput,
      20,
      steadyRandom,
    );

    expect(unchangedCountdown).toBe(pausedCountdown);
    expect(resumeMatch(unchangedCountdown).phase).toBe("countdown");

    const playing = advanceMatch(countdown, noInput, 3, steadyRandom);
    const pausedPlaying = pauseMatch(playing);
    const unchangedPlaying = advanceMatch(
      pausedPlaying,
      noInput,
      20,
      steadyRandom,
    );

    expect(unchangedPlaying.remainingSeconds).toBe(60);
    expect(resumeMatch(unchangedPlaying).phase).toBe("playing");
  });
});

describe("practice matches", () => {
  it("starts immediately and never creates a timed finish", () => {
    let match = createMatch("practice", players, steadyRandom);

    expect(match.phase).toBe("playing");
    expect(match.remainingSeconds).toBeNull();

    match = advanceMatch(match, noInput, 10, steadyRandom);
    expect(match.phase).toBe("playing");
    expect(match.remainingSeconds).toBeNull();
    expect(match.lanes[0].activeSeconds).toBeCloseTo(10, 8);
  });
});

describe("match logical input", () => {
  it("drives a player lane by logical control rather than its keyboard binding", () => {
    const initial = createMatch("practice", players, steadyRandom);
    const released = advanceMatch(initial, noInput, 0.04, steadyRandom);
    const held = advanceMatch(
      initial,
      createLogicalInput([playerControlId(1)]),
      0.04,
      steadyRandom,
    );

    expect(held.lanes[0].barVelocity).toBeLessThan(
      released.lanes[0].barVelocity,
    );
    expect(held.lanes[1].barVelocity).toBe(released.lanes[1].barVelocity);
  });
});

describe("match results", () => {
  it("ranks ties together and calculates both result rates", () => {
    const match: MatchState = {
      ...createMatch("timed", players, steadyRandom),
      phase: "finished",
      countdownSeconds: 0,
      remainingSeconds: 0,
      lanes: createMatch("timed", players, steadyRandom).lanes.map(
        (lane, index) => ({
          ...lane,
          score: 50,
          catches: index === 0 ? 2 : 0,
          escapes: index === 0 ? 2 : 0,
          maxStreak: index === 0 ? 2 : 0,
          activeSeconds: 60,
          overlapSeconds: index === 0 ? 30 : 0,
        }),
      ),
    };

    const results = getMatchResults(match);

    expect(results.map((result) => result.rank)).toEqual([1, 1]);
    expect(results[0].overlapRate).toBe(0.5);
    expect(results[0].catchRate).toBe(0.5);
    expect(results[1].catchRate).toBe(0);
    expect(Number.isNaN(results[1].catchRate)).toBe(false);
  });

  it("uses competition ranking after a tie", () => {
    const extraPlayer: PlayerDefinition = {
      id: 3,
      name: "Player 3",
      keyCode: "KeyK",
    };
    const match = createMatch("timed", [...players, extraPlayer], steadyRandom);
    match.phase = "finished";
    match.lanes[0].score = 100;
    match.lanes[1].score = 100;
    match.lanes[2].score = 50;

    expect(getMatchResults(match).map((result) => result.rank)).toEqual([
      1, 1, 3,
    ]);
  });
});
