import { describe, expect, it } from "vitest";
import { createLocalRunRepository, RECORDS_STORAGE_KEY } from "./local-adapter";
import { PREFERENCES_STORAGE_KEY, loadLocalPreferences, saveLocalPreferences } from "./preferences";
import type { GameRun } from "./types";

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

const makeRun = (
  id: string,
  playerCount = 1,
  score = 10,
  endedAt = "2026-08-02T00:00:00.000Z",
): GameRun => ({
  id,
  mode: "timed",
  seed: null,
  gameVersion: "0.1.0",
  balanceVersion: "1",
  startedAt: "2026-08-01T23:58:57.000Z",
  endedAt,
  durationMs: 60_000,
  playerCount,
  players: Array.from({ length: playerCount }, (_, index) => ({
    playerId: index + 1,
    name: `P${index + 1}`,
    rank: index + 1,
    score: score - index,
    catches: 2,
    escapes: 1,
    maxStreak: 2,
    overlapRate: 0.5,
    catchRate: 2 / 3,
  })),
});

describe("local run repository", () => {
  it("stores single and multiplayer runs independently in newest-first order", async () => {
    const repository = createLocalRunRepository(new MemoryStorage());
    await repository.saveRun(makeRun("single-old", 1, 10, "2026-08-01T00:00:00Z"));
    await repository.saveRun(makeRun("multi", 2, 20));
    await repository.saveRun(makeRun("single-new", 1, 30, "2026-08-03T00:00:00Z"));

    expect((await repository.listRuns({ category: "single" })).map((run) => run.id)).toEqual([
      "single-new",
      "single-old",
    ]);
    expect((await repository.listRuns({ category: "multiplayer" })).map((run) => run.id)).toEqual([
      "multi",
    ]);
  });

  it("does not save the same run twice", async () => {
    const repository = createLocalRunRepository(new MemoryStorage());
    const run = makeRun("same");

    expect(await repository.saveRun(run)).toEqual({ saved: true, isPersonalBest: true });
    expect(await repository.saveRun(run)).toEqual({ saved: false, isPersonalBest: false });
    expect(await repository.listRuns({ category: "single" })).toHaveLength(1);
  });

  it("keeps separate one-hundred-run limits and protects the personal best summary", async () => {
    const repository = createLocalRunRepository(new MemoryStorage());
    await repository.saveRun(makeRun("best", 1, 999, "2026-01-01T00:00:00Z"));

    for (let index = 0; index < 100; index += 1) {
      const date = new Date(Date.UTC(2026, 1, 1, 0, index)).toISOString();
      await repository.saveRun(makeRun(`single-${index}`, 1, index, date));
      await repository.saveRun(makeRun(`multi-${index}`, 2, index, date));
    }

    const singleRuns = await repository.listRuns({ category: "single" });
    const multiplayerRuns = await repository.listRuns({ category: "multiplayer" });
    expect(singleRuns).toHaveLength(100);
    expect(multiplayerRuns).toHaveLength(100);
    expect(singleRuns.some((run) => run.id === "best")).toBe(false);
    expect((await repository.getPersonalBest())?.runId).toBe("best");
  });

  it("filters multiplayer history by player count", async () => {
    const repository = createLocalRunRepository(new MemoryStorage());
    await repository.saveRun(makeRun("two", 2));
    await repository.saveRun(makeRun("three", 3));

    expect(
      (await repository.listRuns({ category: "multiplayer", playerCount: 2 })).map(
        (run) => run.id,
      ),
    ).toEqual(["two"]);
  });

  it("clears each category without touching the other", async () => {
    const repository = createLocalRunRepository(new MemoryStorage());
    await repository.saveRun(makeRun("single"));
    await repository.saveRun(makeRun("multi", 2));

    await repository.clear("multiplayer");
    expect(await repository.listRuns({ category: "multiplayer" })).toEqual([]);
    expect(await repository.listRuns({ category: "single" })).toHaveLength(1);
    expect(await repository.getPersonalBest()).not.toBeNull();

    await repository.clear("single");
    expect(await repository.listRuns({ category: "single" })).toEqual([]);
    expect(await repository.getPersonalBest()).toBeNull();
  });

  it("recovers safely from corrupt or incompatible storage", async () => {
    const storage = new MemoryStorage();
    storage.setItem(RECORDS_STORAGE_KEY, "not-json");
    const repository = createLocalRunRepository(storage);
    expect(await repository.listRuns({ category: "single" })).toEqual([]);

    storage.setItem(RECORDS_STORAGE_KEY, JSON.stringify({ schemaVersion: 999 }));
    expect(await repository.listRuns({ category: "multiplayer" })).toEqual([]);
    expect(await repository.saveRun(makeRun("recovered"))).toEqual({
      saved: true,
      isPersonalBest: true,
    });
  });

  it("treats an unavailable storage read as empty history", async () => {
    const repository = createLocalRunRepository({
      getItem() {
        throw new Error("storage disabled");
      },
      setItem() {
        throw new Error("storage disabled");
      },
    });

    expect(await repository.listRuns({ category: "single" })).toEqual([]);
    await expect(repository.saveRun(makeRun("blocked"))).rejects.toThrow(
      "storage disabled",
    );
  });
});

describe("local preferences", () => {
  it("round trips recent rivals bindings separately from records", () => {
    const storage = new MemoryStorage();
    saveLocalPreferences(storage, {
      playerCount: 2,
      bindings: ["KeyF", "KeyJ"],
    });

    expect(loadLocalPreferences(storage)).toEqual({
      playerCount: 2,
      bindings: ["KeyF", "KeyJ"],
    });
    expect(storage.getItem(PREFERENCES_STORAGE_KEY)).not.toBeNull();
    expect(storage.getItem(RECORDS_STORAGE_KEY)).toBeNull();
  });

  it("keeps preferences when all match records are cleared", async () => {
    const storage = new MemoryStorage();
    saveLocalPreferences(storage, {
      playerCount: 1,
      bindings: ["Space"],
    });
    const repository = createLocalRunRepository(storage);
    await repository.saveRun(makeRun("single"));

    await repository.clear();

    expect(loadLocalPreferences(storage)).toEqual({
      playerCount: 1,
      bindings: ["Space"],
    });
    expect(await repository.listRuns({ category: "single" })).toEqual([]);
  });

  it("uses safe defaults for corrupt preferences", () => {
    const storage = new MemoryStorage();
    storage.setItem(PREFERENCES_STORAGE_KEY, "not-json");
    expect(loadLocalPreferences(storage)).toEqual({
      playerCount: 2,
      bindings: [null, null],
    });

    storage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        playerCount: 2,
        bindings: ["KeyF", "KeyF"],
      }),
    );
    expect(loadLocalPreferences(storage)).toEqual({
      playerCount: 2,
      bindings: [null, null],
    });
  });
});
