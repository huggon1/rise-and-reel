import type { StorageAdapter } from "./local-adapter";

export const PREFERENCES_STORAGE_KEY = "reel-rivals.preferences";
const PREFERENCES_SCHEMA_VERSION = 1;

export interface LocalPreferences {
  playerCount: number;
  bindings: (string | null)[];
}

const DEFAULT_PREFERENCES: LocalPreferences = {
  playerCount: 2,
  bindings: [null, null],
};

export const loadLocalPreferences = (
  storage: StorageAdapter,
): LocalPreferences => {
  try {
    const value = JSON.parse(
      storage.getItem(PREFERENCES_STORAGE_KEY) ?? "null",
    ) as Record<string, unknown> | null;
    if (
      !value ||
      value.schemaVersion !== PREFERENCES_SCHEMA_VERSION ||
      typeof value.playerCount !== "number" ||
      value.playerCount < 1 ||
      value.playerCount > 4 ||
      !Number.isInteger(value.playerCount) ||
      !Array.isArray(value.bindings) ||
      value.bindings.length !== value.playerCount ||
      !value.bindings.every(
        (binding) => binding === null || typeof binding === "string",
      ) ||
      new Set(value.bindings.filter((binding) => binding !== null)).size !==
        value.bindings.filter((binding) => binding !== null).length
    ) {
      return DEFAULT_PREFERENCES;
    }
    return {
      playerCount: value.playerCount,
      bindings: value.bindings as (string | null)[],
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
};

export const saveLocalPreferences = (
  storage: StorageAdapter,
  preferences: LocalPreferences,
) => {
  storage.setItem(
    PREFERENCES_STORAGE_KEY,
    JSON.stringify({
      schemaVersion: PREFERENCES_SCHEMA_VERSION,
      ...preferences,
    }),
  );
};
