import { describe, expect, it } from "vitest";
import {
  cleanupKnownLegacyStorage,
  loadPreferences,
  RISE_AND_REEL_PREFERENCES_KEY,
  savePreferences,
} from "./preferences";
import { MemoryStorage } from "./testStorage";

describe("Rise & Reel preferences", () => {
  it("defaults to English and persists language and Solo binding", () => {
    const storage = new MemoryStorage();
    expect(loadPreferences(storage)).toEqual({ language: "en", keyCode: "Space" });

    savePreferences(storage, { language: "zh", keyCode: "KeyF" });
    expect(loadPreferences(storage)).toEqual({ language: "zh", keyCode: "KeyF" });
    expect(storage.values.has(RISE_AND_REEL_PREFERENCES_KEY)).toBe(true);
  });

  it("cleans only the two known legacy keys", () => {
    const storage = new MemoryStorage();
    storage.values.set("reel-rivals.records", "old");
    storage.values.set("reel-rivals.preferences", "old");
    storage.values.set("another-app.data", "keep");

    cleanupKnownLegacyStorage(storage);

    expect(storage.removed).toEqual([
      "reel-rivals.records",
      "reel-rivals.preferences",
    ]);
    expect(storage.values.get("another-app.data")).toBe("keep");
  });
});
