export const RISE_AND_REEL_HISTORY_KEY = "rise-and-reel.v1.solo-history";
const HISTORY_SCHEMA_VERSION = 1;
const HISTORY_LIMIT = 100;

export interface BrowserStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface SoloSessionRecord {
  id: string;
  startedAt: string;
  endedAt: string;
  activeDurationMs: number;
  score: number;
  catches: number;
  escapes: number;
  maxStreak: number;
}

export interface SoloHistory {
  sessions: SoloSessionRecord[];
  bestScore: number;
  lifetimeScore: number;
}

interface StoredSoloHistory extends SoloHistory {
  schemaVersion: typeof HISTORY_SCHEMA_VERSION;
}

const emptyHistory = (): StoredSoloHistory => ({
  schemaVersion: HISTORY_SCHEMA_VERSION,
  sessions: [],
  bestScore: 0,
  lifetimeScore: 0,
});

const isFiniteNonNegative = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

const isSessionRecord = (value: unknown): value is SoloSessionRecord => {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.startedAt === "string" &&
    typeof item.endedAt === "string" &&
    isFiniteNonNegative(item.activeDurationMs) &&
    isFiniteNonNegative(item.score) &&
    isFiniteNonNegative(item.catches) &&
    isFiniteNonNegative(item.escapes) &&
    isFiniteNonNegative(item.maxStreak)
  );
};

const readStoredHistory = (storage: BrowserStorage): StoredSoloHistory => {
  try {
    const value = JSON.parse(
      storage.getItem(RISE_AND_REEL_HISTORY_KEY) ?? "null",
    ) as Record<string, unknown> | null;
    if (
      !value ||
      value.schemaVersion !== HISTORY_SCHEMA_VERSION ||
      !Array.isArray(value.sessions) ||
      !value.sessions.every(isSessionRecord) ||
      !isFiniteNonNegative(value.bestScore) ||
      !isFiniteNonNegative(value.lifetimeScore)
    ) {
      return emptyHistory();
    }
    return value as unknown as StoredSoloHistory;
  } catch {
    return emptyHistory();
  }
};

export const createSoloHistoryRepository = (storage: BrowserStorage) => ({
  async save(record: SoloSessionRecord): Promise<boolean> {
    const current = readStoredHistory(storage);
    if (current.sessions.some((session) => session.id === record.id)) {
      return false;
    }

    const next: StoredSoloHistory = {
      schemaVersion: HISTORY_SCHEMA_VERSION,
      sessions: [record, ...current.sessions].slice(0, HISTORY_LIMIT),
      bestScore: Math.max(current.bestScore, record.score),
      lifetimeScore: current.lifetimeScore + record.score,
    };
    storage.setItem(RISE_AND_REEL_HISTORY_KEY, JSON.stringify(next));
    return true;
  },

  async read(): Promise<SoloHistory> {
    const { sessions, bestScore, lifetimeScore } = readStoredHistory(storage);
    return { sessions, bestScore, lifetimeScore };
  },
});
