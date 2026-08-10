import type { BrowserStorage } from "./storage";

export const RISE_AND_REEL_PREFERENCES_KEY =
  "rise-and-reel.v1.preferences";

const PREFERENCES_SCHEMA_VERSION = 1;
const LEGACY_KEYS = [
  "reel-rivals.records",
  "reel-rivals.preferences",
] as const;

export type Language = "en" | "zh";

export interface SoloPreferences {
  language: Language;
  keyCode: string;
}

const DEFAULT_PREFERENCES: SoloPreferences = {
  language: "en",
  keyCode: "Space",
};

export const loadPreferences = (storage: BrowserStorage): SoloPreferences => {
  try {
    const value = JSON.parse(
      storage.getItem(RISE_AND_REEL_PREFERENCES_KEY) ?? "null",
    ) as Record<string, unknown> | null;
    if (
      !value ||
      value.schemaVersion !== PREFERENCES_SCHEMA_VERSION ||
      (value.language !== "en" && value.language !== "zh") ||
      typeof value.keyCode !== "string" ||
      value.keyCode.length === 0
    ) {
      return DEFAULT_PREFERENCES;
    }
    return { language: value.language, keyCode: value.keyCode };
  } catch {
    return DEFAULT_PREFERENCES;
  }
};

export const savePreferences = (
  storage: BrowserStorage,
  preferences: SoloPreferences,
) => {
  storage.setItem(
    RISE_AND_REEL_PREFERENCES_KEY,
    JSON.stringify({
      schemaVersion: PREFERENCES_SCHEMA_VERSION,
      ...preferences,
    }),
  );
};

export const cleanupKnownLegacyStorage = (storage: BrowserStorage) => {
  for (const key of LEGACY_KEYS) {
    try {
      storage.removeItem(key);
    } catch {
      // Legacy cleanup is best-effort and must not block the game.
    }
  }
};
