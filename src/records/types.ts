import type { MatchState, PlayerResult } from "../game/types";
import { getMatchResults } from "../game/match";

export const RECORDS_SCHEMA_VERSION = 1;
export const RUNS_PER_CATEGORY_LIMIT = 100;
export const TREND_RUN_LIMIT = 20;
export const GAME_VERSION = "0.1.0";
export const BALANCE_VERSION = "1";

export type RunPlayerResult = PlayerResult;

export interface GameRun {
  id: string;
  mode: "timed";
  seed: string | null;
  gameVersion: string;
  balanceVersion: string;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  playerCount: number;
  players: RunPlayerResult[];
}

export interface PersonalBest {
  runId: string;
  score: number;
  achievedAt: string;
  result: RunPlayerResult;
}

export interface StoredRecords {
  schemaVersion: typeof RECORDS_SCHEMA_VERSION;
  singleRuns: GameRun[];
  multiplayerRuns: GameRun[];
  singleBest: PersonalBest | null;
}

export interface CreateGameRunOptions {
  id: string;
  startedAt: Date;
  endedAt: Date;
  seed?: string | null;
}

export const createGameRun = (
  match: MatchState,
  options: CreateGameRunOptions,
): GameRun => {
  if (match.mode !== "timed" || match.phase !== "finished") {
    throw new Error("Only finished timed matches can become saved runs.");
  }

  const players = getMatchResults(match);
  const durationMs = Math.round(
    Math.max(...match.lanes.map((lane) => lane.activeSeconds), 0) * 1000,
  );

  return {
    id: options.id,
    mode: "timed",
    seed: options.seed ?? null,
    gameVersion: GAME_VERSION,
    balanceVersion: BALANCE_VERSION,
    startedAt: options.startedAt.toISOString(),
    endedAt: options.endedAt.toISOString(),
    durationMs,
    playerCount: players.length,
    players,
  };
};

export const createEmptyRecords = (): StoredRecords => ({
  schemaVersion: RECORDS_SCHEMA_VERSION,
  singleRuns: [],
  multiplayerRuns: [],
  singleBest: null,
});
