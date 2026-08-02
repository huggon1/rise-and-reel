import { TREND_RUN_LIMIT, type GameRun } from "./types";

export type TrendMetric = "score" | "overlapRate" | "catchRate";

export interface SingleSummary {
  savedRuns: number;
  highScore: number;
  averageScore: number;
  averageOverlapRate: number;
  averageCatchRate: number;
  highestStreak: number;
}

export interface TrendPoint {
  runId: string;
  endedAt: string;
  value: number;
}

const average = (values: number[]) =>
  values.length === 0
    ? 0
    : values.reduce((total, value) => total + value, 0) / values.length;

export const summarizeSingleRuns = (runs: GameRun[]): SingleSummary => {
  const results = runs.map((run) => run.players[0]);
  return {
    savedRuns: runs.length,
    highScore: Math.max(0, ...results.map((result) => result.score)),
    averageScore: average(results.map((result) => result.score)),
    averageOverlapRate: average(results.map((result) => result.overlapRate)),
    averageCatchRate: average(results.map((result) => result.catchRate)),
    highestStreak: Math.max(0, ...results.map((result) => result.maxStreak)),
  };
};

export const getTrendPoints = (
  runs: GameRun[],
  metric: TrendMetric,
  limit = TREND_RUN_LIMIT,
): TrendPoint[] =>
  runs
    .slice(0, Math.max(0, limit))
    .reverse()
    .map((run) => ({
      runId: run.id,
      endedAt: run.endedAt,
      value: run.players[0][metric],
    }));
