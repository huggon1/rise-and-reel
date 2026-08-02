import { describe, expect, it } from "vitest";
import { GAME_CONFIG } from "./config";
import {
  advanceCooperativeGame,
  createCooperativeGame,
  isFishInsideCooperativeZone,
} from "./cooperativeEngine";
import type {
  CooperativePlayerDefinition,
  CooperativeState,
} from "./types";

const steadyRandom = () => 0.5;
const players: [
  CooperativePlayerDefinition,
  CooperativePlayerDefinition,
] = [
  {
    id: 1,
    name: "Player 1",
    keyCode: "KeyF",
    axis: "x",
  },
  {
    id: 2,
    name: "Player 2",
    keyCode: "KeyJ",
    axis: "y",
  },
];

const makeSteadyGame = (): CooperativeState => {
  const game = createCooperativeGame(players, steadyRandom);
  return {
    ...game,
    fish: {
      ...game.fish,
      agility: 0,
      jitter: 0,
      dartRate: 0,
    },
    fishX: 0.5,
    fishY: 0.5,
    fishTargetX: 0.5,
    fishTargetY: 0.5,
    targetTime: 100,
    fishVelocityX: 0,
    fishVelocityY: 0,
  };
};

describe("cooperative controls", () => {
  it("lets each player influence only their assigned axis", () => {
    let held = makeSteadyGame();
    let released = makeSteadyGame();

    for (let frame = 0; frame < 12; frame += 1) {
      held = advanceCooperativeGame(
        held,
        { xPressed: true, yPressed: true },
        0.04,
        steadyRandom,
      );
      released = advanceCooperativeGame(
        released,
        { xPressed: false, yPressed: false },
        0.04,
        steadyRandom,
      );
    }

    expect(held.zoneX).toBeGreaterThan(released.zoneX);
    expect(held.zoneY).toBeLessThan(released.zoneY);
  });

  it("keeps the shared zone inside the water plane", () => {
    let game = makeSteadyGame();
    const zone = GAME_CONFIG.cooperative.zone;

    for (let frame = 0; frame < 300; frame += 1) {
      game = advanceCooperativeGame(
        game,
        { xPressed: true, yPressed: true },
        0.04,
        steadyRandom,
      );
    }
    for (let frame = 0; frame < 300; frame += 1) {
      game = advanceCooperativeGame(
        game,
        { xPressed: false, yPressed: false },
        0.04,
        steadyRandom,
      );
    }

    expect(game.zoneX).toBeGreaterThanOrEqual(zone.width / 2);
    expect(game.zoneX).toBeLessThanOrEqual(1 - zone.width / 2);
    expect(game.zoneY).toBeGreaterThanOrEqual(zone.height / 2);
    expect(game.zoneY).toBeLessThanOrEqual(1 - zone.height / 2);
  });
});

describe("cooperative overlap", () => {
  it("requires the fish to be inside both axes of the shared zone", () => {
    const game = makeSteadyGame();

    expect(isFishInsideCooperativeZone(game)).toBe(true);
    expect(
      isFishInsideCooperativeZone({
        ...game,
        fishX: game.zoneX + GAME_CONFIG.cooperative.zone.width,
      }),
    ).toBe(false);
    expect(
      isFishInsideCooperativeZone({
        ...game,
        fishY: game.zoneY + GAME_CONFIG.cooperative.zone.height,
      }),
    ).toBe(false);
  });
});

describe("cooperative round lifecycle", () => {
  it("awards one shared score after sustained overlap", () => {
    let game = makeSteadyGame();
    const reward = game.fish.score;

    for (let frame = 0; frame < 58 && game.phase === "fishing"; frame += 1) {
      game = {
        ...game,
        zoneX: 0.5,
        zoneY: 0.5,
        zoneVelocityX: 0,
        zoneVelocityY: 0,
      };
      game = advanceCooperativeGame(
        game,
        { xPressed: true, yPressed: false },
        0.04,
        steadyRandom,
      );
    }

    expect(game.phase).toBe("caught");
    expect(game.score).toBe(reward);
    expect(game.catches).toBe(1);
    expect(game.streak).toBe(1);
  });

  it("resets the shared streak without deducting score after an escape", () => {
    let game = {
      ...makeSteadyGame(),
      score: 75,
      streak: 3,
      catchProgress: 0.02,
      fishX: 0.95,
      fishY: 0.95,
      fishTargetX: 0.95,
      fishTargetY: 0.95,
      zoneX: 0.2,
      zoneY: 0.2,
    };

    for (let frame = 0; frame < 10; frame += 1) {
      game = {
        ...game,
        zoneX: 0.2,
        zoneY: 0.2,
        zoneVelocityX: 0,
        zoneVelocityY: 0,
      };
      game = advanceCooperativeGame(
        game,
        { xPressed: false, yPressed: true },
        0.04,
        steadyRandom,
      );
    }

    expect(game.phase).toBe("escaped");
    expect(game.score).toBe(75);
    expect(game.streak).toBe(0);
  });

  it("starts a new shared round while preserving team totals", () => {
    const game = advanceCooperativeGame(
      {
        ...makeSteadyGame(),
        phase: "caught",
        phaseTime: 0.02,
        score: 125,
        catches: 3,
        streak: 2,
      },
      { xPressed: false, yPressed: false },
      0.04,
      steadyRandom,
    );

    expect(game.phase).toBe("fishing");
    expect(game.score).toBe(125);
    expect(game.catches).toBe(3);
    expect(game.streak).toBe(2);
    expect(game.catchProgress).toBe(GAME_CONFIG.catch.initialProgress);
  });
});
