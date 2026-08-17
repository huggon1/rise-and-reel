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
import type { LaneState, PlayerDefinition } from "../game/types";

export interface MultiplayerGameState {
  session: FishingSession;
  lanes: LaneState[];
}

export const createMultiplayerGame = (
  players: readonly PlayerDefinition[],
  random: RandomSource = Math.random,
): MultiplayerGameState => {
  if (players.length < 2 || players.length > 4) {
    throw new RangeError("Multiplayer Fishing requires 2 to 4 players.");
  }

  return {
    session: startFishingSession(createFishingSession()),
    lanes: players.map((player) => createLane(player, random)),
  };
};

export const advanceMultiplayerGame = (
  game: MultiplayerGameState,
  input: LogicalInput,
  elapsedSeconds: number,
  random: RandomSource = Math.random,
): MultiplayerGameState => {
  const session = advanceFishingSession(game.session, elapsedSeconds);
  let activeElapsed = session.activeSeconds - game.session.activeSeconds;
  let lanes = game.lanes;

  while (activeElapsed > 0) {
    const step = Math.min(
      activeElapsed,
      GAME_CONFIG.simulation.maxDeltaSeconds,
    );
    lanes = lanes.map((lane) =>
      advanceLane(
        lane,
        isControlHeld(input, playerControlId(lane.id)),
        step,
        random,
      ),
    );
    activeElapsed -= step;
  }

  return { session, lanes };
};
