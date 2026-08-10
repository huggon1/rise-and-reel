import { GAME_CONFIG } from "../game/config";
import { advanceLane, createLane, type RandomSource } from "../game/engine";
import {
  isControlHeld,
  playerControlId,
  type LogicalInput,
} from "../game/input";
import {
  advanceFishingSession,
  createFishingSession,
  startFishingSession,
  type FishingSession,
} from "../game/session";
import type { LaneState } from "../game/types";

export interface SoloGameState {
  session: FishingSession;
  lane: LaneState;
}

export const createSoloGame = (
  keyCode: string,
  random: RandomSource = Math.random,
): SoloGameState => ({
  session: startFishingSession(createFishingSession()),
  lane: createLane({ id: 1, name: "Angler", keyCode }, random),
});

export const advanceSoloGame = (
  game: SoloGameState,
  input: LogicalInput,
  elapsedSeconds: number,
  random: RandomSource = Math.random,
): SoloGameState => {
  const session = advanceFishingSession(game.session, elapsedSeconds);
  let activeElapsed = session.activeSeconds - game.session.activeSeconds;
  let lane = game.lane;

  while (activeElapsed > 0) {
    const step = Math.min(
      activeElapsed,
      GAME_CONFIG.simulation.maxDeltaSeconds,
    );
    lane = advanceLane(
      lane,
      isControlHeld(input, playerControlId(1)),
      step,
      random,
    );
    activeElapsed -= step;
  }

  return { session, lane };
};
