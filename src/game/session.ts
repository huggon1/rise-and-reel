import { GAME_CONFIG } from "./config";

export type FishingSessionPhase =
  | "setup"
  | "countdown"
  | "active"
  | "paused"
  | "confirming-exit"
  | "ended";

export type SessionPauseReason = "manual" | "page-hidden" | "window-blur";

type ResumablePhase = Extract<FishingSessionPhase, "countdown" | "active">;
type ExitSourcePhase = Extract<
  FishingSessionPhase,
  "countdown" | "active" | "paused"
>;

export interface FishingSession {
  phase: FishingSessionPhase;
  countdownSeconds: number;
  activeSeconds: number;
  hasStartedActivePlay: boolean;
  pauseReason: SessionPauseReason | null;
  resumePhase: ResumablePhase | null;
  exitSourcePhase: ExitSourcePhase | null;
}

export const createFishingSession = (): FishingSession => ({
  phase: "setup",
  countdownSeconds: GAME_CONFIG.match.countdownSeconds,
  activeSeconds: 0,
  hasStartedActivePlay: false,
  pauseReason: null,
  resumePhase: null,
  exitSourcePhase: null,
});

export const startFishingSession = (
  session: FishingSession,
): FishingSession =>
  session.phase === "setup"
    ? { ...session, phase: "countdown" }
    : session;

export const advanceFishingSession = (
  session: FishingSession,
  elapsedSeconds: number,
): FishingSession => {
  let elapsed = Math.max(0, elapsedSeconds);
  if (elapsed === 0) {
    return session;
  }

  let next = session;
  if (next.phase === "countdown") {
    const countdownStep = Math.min(elapsed, next.countdownSeconds);
    const countdownSeconds = Math.max(
      0,
      next.countdownSeconds - countdownStep,
    );
    elapsed -= countdownStep;
    next = { ...next, countdownSeconds };

    if (countdownSeconds === 0) {
      next = {
        ...next,
        phase: "active",
        hasStartedActivePlay: true,
      };
    }
  }

  return next.phase === "active"
    ? { ...next, activeSeconds: next.activeSeconds + elapsed }
    : next;
};

export const pauseFishingSession = (
  session: FishingSession,
  reason: SessionPauseReason = "manual",
): FishingSession => {
  if (session.phase !== "countdown" && session.phase !== "active") {
    return session;
  }

  return {
    ...session,
    phase: "paused",
    pauseReason: reason,
    resumePhase: session.phase,
  };
};

export const resumeFishingSession = (
  session: FishingSession,
): FishingSession => {
  if (session.phase !== "paused" || session.resumePhase === null) {
    return session;
  }

  return {
    ...session,
    phase: session.resumePhase,
    pauseReason: null,
    resumePhase: null,
  };
};

export const requestGroupExit = (
  session: FishingSession,
): FishingSession => {
  if (
    session.phase !== "countdown" &&
    session.phase !== "active" &&
    session.phase !== "paused"
  ) {
    return session;
  }

  return {
    ...session,
    phase: "confirming-exit",
    exitSourcePhase: session.phase,
  };
};

export const confirmGroupExit = (
  session: FishingSession,
): FishingSession =>
  session.phase === "confirming-exit"
    ? {
        ...session,
        phase: "ended",
        pauseReason: null,
        resumePhase: null,
        exitSourcePhase: null,
      }
    : session;

export const cancelGroupExit = (
  session: FishingSession,
): FishingSession => {
  if (
    session.phase !== "confirming-exit" ||
    session.exitSourcePhase === null
  ) {
    return session;
  }

  return {
    ...session,
    phase: session.exitSourcePhase,
    exitSourcePhase: null,
  };
};

export const isSessionSummaryEligible = (session: FishingSession) =>
  session.phase === "ended" && session.hasStartedActivePlay;
