export type FishId = "carp" | "bass" | "catfish" | "squid";

export type RoundPhase = "fishing" | "caught" | "escaped";

export type GameMode = "timed" | "practice";

export type MatchPhase = "countdown" | "playing" | "paused" | "finished";

export interface FishDefinition {
  id: FishId;
  name: string;
  symbol: string;
  difficulty: string;
  score: number;
  color: string;
  agility: number;
  jitter: number;
  damping: number;
  maxSpeed: number;
  targetMinSeconds: number;
  targetMaxSeconds: number;
  dartRate: number;
  dartForce: number;
  baseWeight: number;
}

export interface PlayerDefinition {
  id: number;
  name: string;
  keyCode: string;
}

export interface LaneState extends PlayerDefinition {
  score: number;
  catches: number;
  escapes: number;
  streak: number;
  maxStreak: number;
  overlapSeconds: number;
  activeSeconds: number;
  phase: RoundPhase;
  phaseTime: number;
  fish: FishDefinition;
  fishY: number;
  fishVelocity: number;
  fishTargetY: number;
  targetTime: number;
  barY: number;
  barVelocity: number;
  catchProgress: number;
  lastReward: number;
}

export interface MatchState {
  mode: GameMode;
  phase: MatchPhase;
  pausedFrom: Exclude<MatchPhase, "paused" | "finished"> | null;
  countdownSeconds: number;
  remainingSeconds: number | null;
  lanes: LaneState[];
}

export interface PlayerResult {
  playerId: number;
  name: string;
  rank: number;
  score: number;
  catches: number;
  escapes: number;
  maxStreak: number;
  overlapRate: number;
  catchRate: number;
}

export type ControlAxis = "x" | "y";

export interface CooperativePlayerDefinition extends PlayerDefinition {
  axis: ControlAxis;
}

export interface CooperativeState {
  players: [CooperativePlayerDefinition, CooperativePlayerDefinition];
  score: number;
  catches: number;
  streak: number;
  phase: RoundPhase;
  phaseTime: number;
  fish: FishDefinition;
  fishX: number;
  fishY: number;
  fishVelocityX: number;
  fishVelocityY: number;
  fishTargetX: number;
  fishTargetY: number;
  targetTime: number;
  zoneX: number;
  zoneY: number;
  zoneVelocityX: number;
  zoneVelocityY: number;
  catchProgress: number;
  lastReward: number;
}
