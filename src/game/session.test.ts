import { describe, expect, it } from "vitest";
import { GAME_CONFIG } from "./config";
import {
  advanceFishingSession,
  cancelGroupExit,
  confirmGroupExit,
  createFishingSession,
  isSessionSummaryEligible,
  pauseFishingSession,
  requestGroupExit,
  resumeFishingSession,
  startFishingSession,
} from "./session";

describe("fishing session lifecycle", () => {
  it("uses the countdown only as preparation before unlimited active play", () => {
    let session = createFishingSession();

    expect(session.phase).toBe("setup");

    session = startFishingSession(session);
    expect(session.phase).toBe("countdown");
    expect(session.countdownSeconds).toBe(GAME_CONFIG.session.countdownSeconds);

    session = advanceFishingSession(session, 2);
    expect(session.phase).toBe("countdown");
    expect(session.countdownSeconds).toBe(1);
    expect(session.activeSeconds).toBe(0);

    session = advanceFishingSession(session, 1.25);
    expect(session.phase).toBe("active");
    expect(session.countdownSeconds).toBe(0);
    expect(session.activeSeconds).toBeCloseTo(0.25, 8);

    session = advanceFishingSession(session, 60 * 60);
    expect(session.phase).toBe("active");
    expect(session.activeSeconds).toBeCloseTo(3600.25, 8);
  });

  it.each(["manual", "page-hidden", "window-blur"] as const)(
    "excludes %s pauses from active time",
    (reason) => {
      let session = startFishingSession(createFishingSession());
      session = advanceFishingSession(
        session,
        GAME_CONFIG.session.countdownSeconds + 5,
      );
      session = pauseFishingSession(session, reason);

      const paused = advanceFishingSession(session, 30);
      expect(paused).toBe(session);
      expect(paused.activeSeconds).toBe(5);
      expect(paused.pauseReason).toBe(reason);

      session = resumeFishingSession(paused);
      session = advanceFishingSession(session, 2);
      expect(session.phase).toBe("active");
      expect(session.activeSeconds).toBe(7);
    },
  );

  it("makes a confirmed group exit summary-eligible only after active play", () => {
    const countdownExit = confirmGroupExit(
      requestGroupExit(startFishingSession(createFishingSession())),
    );
    expect(countdownExit.phase).toBe("ended");
    expect(isSessionSummaryEligible(countdownExit)).toBe(false);

    let completed = startFishingSession(createFishingSession());
    completed = advanceFishingSession(
      completed,
      GAME_CONFIG.session.countdownSeconds,
    );
    completed = confirmGroupExit(requestGroupExit(completed));

    expect(completed.phase).toBe("ended");
    expect(isSessionSummaryEligible(completed)).toBe(true);
  });

  it("returns to the exact prior state when group exit is canceled", () => {
    let session = startFishingSession(createFishingSession());
    session = advanceFishingSession(
      session,
      GAME_CONFIG.session.countdownSeconds,
    );
    const paused = pauseFishingSession(session, "manual");

    const confirming = requestGroupExit(paused);
    expect(confirming.phase).toBe("confirming-exit");

    const restored = cancelGroupExit(confirming);
    expect(restored.phase).toBe("paused");
    expect(restored.pauseReason).toBe("manual");
    expect(restored.resumePhase).toBe("active");
    expect(restored.exitSourcePhase).toBeNull();
  });
});
