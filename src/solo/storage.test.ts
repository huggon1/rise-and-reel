import { describe, expect, it } from "vitest";
import {
  createSoloHistoryRepository,
  RISE_AND_REEL_HISTORY_KEY,
  type SoloSessionRecord,
} from "./storage";

class MemoryStorage {
  values = new Map<string, string>();
  removed: string[] = [];

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.removed.push(key);
    this.values.delete(key);
  }
}

const record = (id: string, score: number): SoloSessionRecord => ({
  id,
  startedAt: "2026-08-10T08:00:00.000Z",
  endedAt: "2026-08-10T08:05:00.000Z",
  activeDurationMs: 300_000,
  score,
  catches: score === 0 ? 0 : 2,
  escapes: 1,
  maxStreak: score === 0 ? 0 : 2,
});

describe("Rise & Reel Solo history", () => {
  it("retains 100 recent sessions while lifetime score includes every save", async () => {
    const storage = new MemoryStorage();
    const repository = createSoloHistoryRepository(storage);

    for (let index = 0; index < 105; index += 1) {
      await repository.save(record(`session-${index}`, index));
    }

    const history = await repository.read();
    expect(history.sessions).toHaveLength(100);
    expect(history.sessions[0].id).toBe("session-104");
    expect(history.sessions.at(-1)?.id).toBe("session-5");
    expect(history.bestScore).toBe(104);
    expect(history.lifetimeScore).toBe(5_460);
  });

  it("does not accumulate a session twice when save is retried", async () => {
    const storage = new MemoryStorage();
    const repository = createSoloHistoryRepository(storage);

    expect(await repository.save(record("stable-id", 40))).toBe(true);
    expect(await repository.save(record("stable-id", 40))).toBe(false);

    const history = await repository.read();
    expect(history.sessions).toHaveLength(1);
    expect(history.lifetimeScore).toBe(40);
  });

  it("uses its own versioned namespace", async () => {
    const storage = new MemoryStorage();
    const repository = createSoloHistoryRepository(storage);
    await repository.save(record("one", 10));

    expect(RISE_AND_REEL_HISTORY_KEY).toBe("rise-and-reel.v1.solo-history");
    expect(storage.values.has(RISE_AND_REEL_HISTORY_KEY)).toBe(true);
  });
});
