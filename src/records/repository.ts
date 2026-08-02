import type { GameRun, PersonalBest } from "./types";

export type RunCategory = "single" | "multiplayer";

export interface RunQuery {
  category: RunCategory;
  playerCount?: 2 | 3 | 4;
}
export interface SaveRunResult {
  saved: boolean;
  isPersonalBest: boolean;
}

export interface RunRepository {
  saveRun(run: GameRun): Promise<SaveRunResult>;
  listRuns(query: RunQuery): Promise<GameRun[]>;
  getPersonalBest(): Promise<PersonalBest | null>;
  clear(category?: RunCategory): Promise<void>;
}
