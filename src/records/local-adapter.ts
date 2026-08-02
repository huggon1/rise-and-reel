import type {
  RunCategory,
  RunQuery,
  RunRepository,
  SaveRunResult,
} from "./repository";
import {
  createEmptyRecords,
  RECORDS_SCHEMA_VERSION,
  RUNS_PER_CATEGORY_LIMIT,
  type GameRun,
  type PersonalBest,
  type RunPlayerResult,
  type StoredRecords,
} from "./types";

export const RECORDS_STORAGE_KEY = "reel-rivals.records";

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isPlayerResult = (value: unknown): value is RunPlayerResult => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const result = value as Record<string, unknown>;
  return (
    isFiniteNumber(result.playerId) &&
    typeof result.name === "string" &&
    isFiniteNumber(result.rank) &&
    isFiniteNumber(result.score) &&
    isFiniteNumber(result.catches) &&
    isFiniteNumber(result.escapes) &&
    isFiniteNumber(result.maxStreak) &&
    isFiniteNumber(result.overlapRate) &&
    isFiniteNumber(result.catchRate)
  );
};

const isGameRun = (value: unknown): value is GameRun => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const run = value as Record<string, unknown>;
  return (
    typeof run.id === "string" &&
    run.mode === "timed" &&
    (typeof run.seed === "string" || run.seed === null) &&
    typeof run.gameVersion === "string" &&
    typeof run.balanceVersion === "string" &&
    typeof run.startedAt === "string" &&
    typeof run.endedAt === "string" &&
    isFiniteNumber(run.durationMs) &&
    isFiniteNumber(run.playerCount) &&
    Number.isInteger(run.playerCount) &&
    run.playerCount >= 1 &&
    run.playerCount <= 4 &&
    Array.isArray(run.players) &&
    run.players.length === run.playerCount &&
    run.players.every(isPlayerResult)
  );
};

const isPersonalBest = (value: unknown): value is PersonalBest => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const best = value as Record<string, unknown>;
  return (
    typeof best.runId === "string" &&
    isFiniteNumber(best.score) &&
    typeof best.achievedAt === "string" &&
    isPlayerResult(best.result)
  );
};

const parseRecords = (serialized: string | null): StoredRecords => {
  if (!serialized) {
    return createEmptyRecords();
  }

  try {
    const value = JSON.parse(serialized) as Record<string, unknown>;
    if (
      value.schemaVersion !== RECORDS_SCHEMA_VERSION ||
      !Array.isArray(value.singleRuns) ||
      !value.singleRuns.every(isGameRun) ||
      !value.singleRuns.every((run) => run.playerCount === 1) ||
      !Array.isArray(value.multiplayerRuns) ||
      !value.multiplayerRuns.every(isGameRun) ||
      !value.multiplayerRuns.every((run) => run.playerCount >= 2) ||
      !(value.singleBest === null || isPersonalBest(value.singleBest))
    ) {
      return createEmptyRecords();
    }

    return value as unknown as StoredRecords;
  } catch {
    return createEmptyRecords();
  }
};

const newestFirst = (left: GameRun, right: GameRun) =>
  Date.parse(right.endedAt) - Date.parse(left.endedAt);

const categoryForRun = (run: GameRun): RunCategory =>
  run.playerCount === 1 ? "single" : "multiplayer";

const personalBestFromRun = (run: GameRun): PersonalBest => ({
  runId: run.id,
  score: run.players[0].score,
  achievedAt: run.endedAt,
  result: run.players[0],
});

export const createLocalRunRepository = (
  storage: StorageAdapter,
): RunRepository => {
  const read = () => {
    try {
      return parseRecords(storage.getItem(RECORDS_STORAGE_KEY));
    } catch {
      return createEmptyRecords();
    }
  };
  const write = (records: StoredRecords) =>
    storage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(records));

  return {
    async saveRun(run): Promise<SaveRunResult> {
      const records = read();
      const alreadySaved = [...records.singleRuns, ...records.multiplayerRuns]
        .some((savedRun) => savedRun.id === run.id);

      if (alreadySaved) {
        return { saved: false, isPersonalBest: false };
      }

      const category = categoryForRun(run);
      let isPersonalBest = false;
      if (category === "single") {
        records.singleRuns = [...records.singleRuns, run]
          .sort(newestFirst)
          .slice(0, RUNS_PER_CATEGORY_LIMIT);
        const score = run.players[0].score;
        if (!records.singleBest || score > records.singleBest.score) {
          records.singleBest = personalBestFromRun(run);
          isPersonalBest = true;
        }
      } else {
        records.multiplayerRuns = [...records.multiplayerRuns, run]
          .sort(newestFirst)
          .slice(0, RUNS_PER_CATEGORY_LIMIT);
      }

      write(records);
      return { saved: true, isPersonalBest };
    },

    async listRuns(query: RunQuery): Promise<GameRun[]> {
      const records = read();
      const runs =
        query.category === "single"
          ? records.singleRuns
          : records.multiplayerRuns;
      return runs
        .filter(
          (run) =>
            query.category === "single" ||
            query.playerCount === undefined ||
            run.playerCount === query.playerCount,
        )
        .sort(newestFirst);
    },

    async getPersonalBest(): Promise<PersonalBest | null> {
      return read().singleBest;
    },

    async clear(category?: RunCategory): Promise<void> {
      if (!category) {
        write(createEmptyRecords());
        return;
      }

      const records = read();
      if (category === "single") {
        records.singleRuns = [];
        records.singleBest = null;
      } else {
        records.multiplayerRuns = [];
      }
      write(records);
    },
  };
};
