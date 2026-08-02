import { GAME_CONFIG } from "./config";
import { advanceLane, createLane, type RandomSource } from "./engine";
import type {
  GameMode,
  MatchState,
  PlayerDefinition,
  PlayerResult,
} from "./types";

type PressedInput = ReadonlySet<string> | ((keyCode: string) => boolean);

const isPressed = (input: PressedInput, keyCode: string) =>
  typeof input === "function" ? input(keyCode) : input.has(keyCode);

export const createMatch = (
  mode: GameMode,
  players: PlayerDefinition[],
  random: RandomSource = Math.random,
): MatchState => ({
  mode,
  phase: mode === "timed" ? "countdown" : "playing",
  pausedFrom: null,
  countdownSeconds:
    mode === "timed" ? GAME_CONFIG.match.countdownSeconds : 0,
  remainingSeconds:
    mode === "timed" ? GAME_CONFIG.match.timedDurationSeconds : null,
  lanes: players.map((player) => createLane(player, random)),
});

const advancePlaying = (
  current: MatchState,
  input: PressedInput,
  elapsedSeconds: number,
  random: RandomSource,
) => {
  let match = current;
  let unprocessed = elapsedSeconds;

  while (unprocessed > 0 && match.phase === "playing") {
    const untilFinish = match.remainingSeconds ?? Number.POSITIVE_INFINITY;
    const step = Math.min(
      unprocessed,
      untilFinish,
      GAME_CONFIG.simulation.maxDeltaSeconds,
    );

    if (step <= 0) {
      return { ...match, phase: "finished" as const, remainingSeconds: 0 };
    }

    match = {
      ...match,
      remainingSeconds:
        match.remainingSeconds === null
          ? null
          : Math.max(0, match.remainingSeconds - step),
      lanes: match.lanes.map((lane) =>
        advanceLane(lane, isPressed(input, lane.keyCode), step, random),
      ),
    };
    unprocessed -= step;

    if (match.remainingSeconds === 0) {
      match = { ...match, phase: "finished" };
    }
  }

  return match;
};

export const advanceMatch = (
  current: MatchState,
  input: PressedInput,
  elapsedSeconds: number,
  random: RandomSource = Math.random,
): MatchState => {
  let elapsed = Math.max(0, elapsedSeconds);

  if (elapsed === 0 || current.phase === "paused" || current.phase === "finished") {
    return current;
  }

  let match = current;
  if (match.phase === "countdown") {
    const countdownStep = Math.min(elapsed, match.countdownSeconds);
    match = {
      ...match,
      countdownSeconds: Math.max(0, match.countdownSeconds - countdownStep),
    };
    elapsed -= countdownStep;

    if (match.countdownSeconds === 0) {
      match = { ...match, phase: "playing" };
    }
  }

  return match.phase === "playing"
    ? advancePlaying(match, input, elapsed, random)
    : match;
};

export const pauseMatch = (match: MatchState): MatchState => {
  if (match.phase !== "countdown" && match.phase !== "playing") {
    return match;
  }

  return { ...match, phase: "paused", pausedFrom: match.phase };
};

export const resumeMatch = (match: MatchState): MatchState => {
  if (match.phase !== "paused" || match.pausedFrom === null) {
    return match;
  }

  return { ...match, phase: match.pausedFrom, pausedFrom: null };
};

export const getMatchResults = (match: MatchState): PlayerResult[] => {
  const sorted = [...match.lanes].sort(
    (left, right) => right.score - left.score || left.id - right.id,
  );
  let previousScore: number | null = null;
  let previousRank = 0;

  return sorted.map((lane, index) => {
    const completedFish = lane.catches + lane.escapes;
    const rank = lane.score === previousScore ? previousRank : index + 1;
    previousScore = lane.score;
    previousRank = rank;

    return {
      playerId: lane.id,
      name: lane.name,
      rank,
      score: lane.score,
      catches: lane.catches,
      escapes: lane.escapes,
      maxStreak: lane.maxStreak,
      overlapRate:
        lane.activeSeconds === 0 ? 0 : lane.overlapSeconds / lane.activeSeconds,
      catchRate: completedFish === 0 ? 0 : lane.catches / completedFish,
    };
  });
};
