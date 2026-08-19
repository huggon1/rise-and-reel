import { describe, expect, it } from "vitest";
import { axisControlId, createLogicalInput } from "../game/input";
import { advanceCooperativeGame, createCooperativeGame } from "./game";

const steadyRandom = () => 0.5;

describe("2D cooperative session", () => {
  it("does not advance the shared round during the countdown", () => {
    const game = createCooperativeGame(steadyRandom);
    const next = advanceCooperativeGame(
      game,
      createLogicalInput([axisControlId("x"), axisControlId("y")]),
      1,
      steadyRandom,
    );

    expect(next.session.phase).toBe("countdown");
    expect(next.round).toEqual(game.round);
  });

  it("maps logical axis input into the shared round after countdown", () => {
    const game = createCooperativeGame(steadyRandom);
    const active = advanceCooperativeGame(
      game,
      createLogicalInput(),
      3,
      steadyRandom,
    );
    const moved = advanceCooperativeGame(
      active,
      createLogicalInput([axisControlId("x"), axisControlId("y")]),
      0.4,
      steadyRandom,
    );

    expect(moved.session.phase).toBe("active");
    expect(moved.round.zoneX).toBeGreaterThan(active.round.zoneX);
    expect(moved.round.zoneY).toBeLessThan(active.round.zoneY);
  });
});
