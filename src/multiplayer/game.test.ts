import { describe, expect, it } from "vitest";
import { GAME_CONFIG } from "../game/config";
import { createLogicalInput, playerControlId } from "../game/input";
import { advanceMultiplayerGame, createMultiplayerGame } from "./game";

const steadyRandom = () => 0.5;
const players = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    name: `Player ${index + 1}`,
  }));

describe("Multiplayer Fishing", () => {
  it.each([2, 3, 4])("creates an independent lane for %i players", (count) => {
    const game = createMultiplayerGame(players(count), steadyRandom);

    expect(game.session.phase).toBe("countdown");
    expect(game.lanes).toHaveLength(count);
    expect(game.lanes.map((lane) => lane.id)).toEqual(
      players(count).map((player) => player.id),
    );
  });

  it.each([1, 5])("rejects an unsupported player count of %i", (count) => {
    expect(() => createMultiplayerGame(players(count), steadyRandom)).toThrow(
      "requires 2 to 4 players",
    );
  });

  it("applies each player's logical control only to their lane", () => {
    let game = createMultiplayerGame(players(2), steadyRandom);
    game = advanceMultiplayerGame(
      game,
      createLogicalInput([playerControlId(2)]),
      GAME_CONFIG.session.countdownSeconds + 0.25,
      steadyRandom,
    );

    expect(game.session.phase).toBe("active");
    expect(game.lanes[0].barVelocity).toBeGreaterThan(0);
    expect(game.lanes[1].barVelocity).toBeLessThan(0);
    expect(game.lanes[0].activeSeconds).toBeCloseTo(0.25, 8);
    expect(game.lanes[1].activeSeconds).toBeCloseTo(0.25, 8);
  });
});
