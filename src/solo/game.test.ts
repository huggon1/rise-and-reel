import { describe, expect, it } from "vitest";
import { GAME_CONFIG } from "../game/config";
import { createLogicalInput, playerControlId } from "../game/input";
import { advanceSoloGame, createSoloGame } from "./game";

const steadyRandom = () => 0.5;

describe("Solo Fishing", () => {
  it("starts after preparation and continues without a time limit", () => {
    let game = createSoloGame("KeyF", steadyRandom);
    expect(game.session.phase).toBe("countdown");

    game = advanceSoloGame(
      game,
      createLogicalInput([playerControlId(1)]),
      GAME_CONFIG.match.countdownSeconds + 0.25,
      steadyRandom,
    );
    expect(game.session.phase).toBe("active");
    expect(game.session.activeSeconds).toBeCloseTo(0.25, 8);
    expect(game.lane.activeSeconds).toBeCloseTo(0.25, 8);

    game = advanceSoloGame(game, createLogicalInput(), 3_600, steadyRandom);
    expect(game.session.phase).toBe("active");
    expect(game.session.activeSeconds).toBeCloseTo(3_600.25, 8);
  });
});
