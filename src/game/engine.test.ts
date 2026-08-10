import { describe, expect, it } from "vitest";
import { FISH_DEFINITIONS, GAME_CONFIG } from "./config";
import { advanceLane, chooseFish, createLane } from "./engine";
import type { LaneState } from "./types";

const steadyRandom = () => 0.5;
const player = {
  id: 1,
  name: "Player 1",
};

const makeSteadyLane = (): LaneState => {
  const lane = createLane(player, steadyRandom);
  return {
    ...lane,
    fish: {
      ...lane.fish,
      agility: 0,
      jitter: 0,
      dartRate: 0,
    },
    fishY: 0.5,
    fishTargetY: 0.5,
    targetTime: 100,
    fishVelocity: 0,
  };
};

describe("fish selection", () => {
  it("provides four fish with increasing rewards", () => {
    expect(FISH_DEFINITIONS).toHaveLength(4);
    expect(FISH_DEFINITIONS.map((fish) => fish.score)).toEqual([
      10, 25, 50, 100,
    ]);
  });

  it("can select the easiest and hardest fish", () => {
    expect(chooseFish(0, () => 0).id).toBe("carp");
    expect(chooseFish(20, () => 0.9999).id).toBe("squid");
  });
});

describe("catch bar physics", () => {
  it("rises while held and falls after release", () => {
    let lane = makeSteadyLane();
    const initialY = lane.barY;

    for (let frame = 0; frame < 18; frame += 1) {
      lane = advanceLane(lane, true, 0.04, steadyRandom);
    }
    const liftedY = lane.barY;

    for (let frame = 0; frame < 28; frame += 1) {
      lane = advanceLane(lane, false, 0.04, steadyRandom);
    }

    expect(liftedY).toBeLessThan(initialY);
    expect(lane.barY).toBeGreaterThan(liftedY);
  });

  it("keeps the catch bar inside the fishing lane", () => {
    let lane = makeSteadyLane();

    for (let frame = 0; frame < 300; frame += 1) {
      lane = advanceLane(lane, frame < 150, 0.04, steadyRandom);
    }

    expect(lane.barY).toBeGreaterThanOrEqual(0);
    expect(lane.barY).toBeLessThanOrEqual(1 - GAME_CONFIG.bar.height);
  });
});

describe("round lifecycle", () => {
  it("awards the fish score after sustained overlap", () => {
    let lane = makeSteadyLane();
    const reward = lane.fish.score;

    for (let frame = 0; frame < 58 && lane.phase === "fishing"; frame += 1) {
      lane = {
        ...lane,
        barY: 0.5 - GAME_CONFIG.bar.height / 2,
        barVelocity: 0,
      };
      lane = advanceLane(lane, false, 0.04, steadyRandom);
    }

    expect(lane.phase).toBe("caught");
    expect(lane.score).toBe(reward);
    expect(lane.catches).toBe(1);
    expect(lane.streak).toBe(1);
    expect(lane.maxStreak).toBe(1);
  });

  it("does not deduct score when a fish escapes", () => {
    let lane = {
      ...makeSteadyLane(),
      score: 75,
      catchProgress: 0.08,
      fishY: 0.95,
      fishTargetY: 0.95,
      barY: 0,
    };

    for (let frame = 0; frame < 20 && lane.phase === "fishing"; frame += 1) {
      lane = {
        ...lane,
        barY: 0,
        barVelocity: 0,
      };
      lane = advanceLane(lane, true, 0.04, steadyRandom);
    }

    expect(lane.phase).toBe("escaped");
    expect(lane.score).toBe(75);
    expect(lane.catches).toBe(0);
    expect(lane.escapes).toBe(1);
    expect(lane.streak).toBe(0);
  });

  it("uses the catch meter reaching zero as the escape condition", () => {
    let lane = {
      ...makeSteadyLane(),
      catchProgress: 0.02,
      fishY: 0.95,
      fishTargetY: 0.95,
      barY: 0,
    };

    for (let frame = 0; frame < 10; frame += 1) {
      lane = {
        ...lane,
        barY: 0,
        barVelocity: 0,
      };
      lane = advanceLane(lane, true, 0.04, steadyRandom);
    }

    expect(lane.catchProgress).toBe(0);
    expect(lane.phase).toBe("escaped");
  });

  it("gives a player time to reach the fish at the start of a round", () => {
    let lane = {
      ...makeSteadyLane(),
      fishY: 0.95,
      fishTargetY: 0.95,
      barY: 0,
    };

    for (let frame = 0; frame < 100; frame += 1) {
      lane = {
        ...lane,
        barY: 0,
        barVelocity: 0,
      };
      lane = advanceLane(lane, true, 0.04, steadyRandom);
    }

    expect(lane.phase).toBe("fishing");
    expect(lane.catchProgress).toBeCloseTo(0.06, 5);

    for (let frame = 0; frame < 15; frame += 1) {
      lane = {
        ...lane,
        barY: 0,
        barVelocity: 0,
      };
      lane = advanceLane(lane, true, 0.04, steadyRandom);
    }

    expect(lane.phase).toBe("escaped");
  });

  it("recovers the shared meter after the player regains overlap", () => {
    let lane = {
      ...makeSteadyLane(),
      catchProgress: 0.3,
    };
    const initialCatchProgress = lane.catchProgress;

    lane = {
      ...lane,
      barY: 0.5 - GAME_CONFIG.bar.height / 2,
      barVelocity: 0,
    };
    lane = advanceLane(lane, false, 0.04, steadyRandom);

    expect(lane.catchProgress).toBeGreaterThan(initialCatchProgress);
  });

  it("does not award unattended play under steady conditions", () => {
    let lane = makeSteadyLane();

    for (let frame = 0; frame < 750; frame += 1) {
      lane = advanceLane(lane, false, 0.04, steadyRandom);
    }

    expect(lane.score).toBe(0);
    expect(lane.catches).toBe(0);
  });

  it("starts another round while preserving accumulated totals", () => {
    let lane: LaneState = {
      ...makeSteadyLane(),
      phase: "caught",
      phaseTime: 0.02,
      score: 125,
      catches: 3,
    };

    lane = advanceLane(lane, false, 0.04, steadyRandom);

    expect(lane.phase).toBe("fishing");
    expect(lane.score).toBe(125);
    expect(lane.catches).toBe(3);
    expect(lane.escapes).toBe(0);
    expect(lane.catchProgress).toBe(GAME_CONFIG.catch.initialProgress);
  });
});
