import { GAME_CONFIG } from "../game/config";
import { type RandomSource } from "../game/engine";
import { axisControlId, isControlHeld, type LogicalInput } from "../game/input";
import {
  advanceFishingSession,
  createFishingSession,
  startFishingSession,
  type FishingSession,
} from "../game/session";
import type { CooperativePlayerDefinition, CooperativeState } from "../game/types";
import { advanceCooperativeRound, createCooperativeRound } from "./engine";

export interface CooperativeGameState {
  session: FishingSession;
  round: CooperativeState;
}

const players: [CooperativePlayerDefinition, CooperativePlayerDefinition] = [
  { id: 1, name: "Player 1", axis: "x" },
  { id: 2, name: "Player 2", axis: "y" },
];

export const createCooperativeGame = (
  random: RandomSource = Math.random,
): CooperativeGameState => ({
  session: startFishingSession(createFishingSession()),
  round: createCooperativeRound(players, random),
});

export const advanceCooperativeGame = (
  game: CooperativeGameState,
  input: LogicalInput,
  elapsedSeconds: number,
  random: RandomSource = Math.random,
): CooperativeGameState => {
  const session = advanceFishingSession(game.session, elapsedSeconds);
  let activeElapsed = session.activeSeconds - game.session.activeSeconds;
  let round = game.round;

  while (activeElapsed > 0) {
    const step = Math.min(activeElapsed, GAME_CONFIG.simulation.maxDeltaSeconds);
    round = advanceCooperativeRound(
      round,
      {
        xPressed: isControlHeld(input, axisControlId("x")),
        yPressed: isControlHeld(input, axisControlId("y")),
      },
      step,
      random,
    );
    activeElapsed -= step;
  }

  return { session, round };
};
