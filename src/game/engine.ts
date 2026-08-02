import { FISH_DEFINITIONS, GAME_CONFIG } from "./config";
import type {
  FishDefinition,
  LaneState,
  PlayerDefinition,
} from "./types";

export type RandomSource = () => number;

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

const randomBetween = (
  minimum: number,
  maximum: number,
  random: RandomSource,
) => minimum + (maximum - minimum) * random();

const getFishWeight = (fish: FishDefinition, catches: number) => {
  const progression = Math.min(catches, 20) / 20;
  if (fish.id === "carp") {
    return Math.max(0.12, fish.baseWeight - progression * 0.24);
  }
  if (fish.id === "squid") {
    return fish.baseWeight + progression * 0.17;
  }
  if (fish.id === "catfish") {
    return fish.baseWeight + progression * 0.08;
  }
  return fish.baseWeight;
};

export const chooseFish = (
  catches: number,
  random: RandomSource = Math.random,
): FishDefinition => {
  const weighted = FISH_DEFINITIONS.map((fish) => ({
    fish,
    weight: getFishWeight(fish, catches),
  }));
  const total = weighted.reduce((sum, item) => sum + item.weight, 0);
  let cursor = random() * total;

  for (const item of weighted) {
    cursor -= item.weight;
    if (cursor <= 0) {
      return item.fish;
    }
  }

  return weighted[weighted.length - 1].fish;
};

const newRound = (
  player: PlayerDefinition,
  totals: Pick<
    LaneState,
    | "score"
    | "catches"
    | "escapes"
    | "streak"
    | "maxStreak"
    | "overlapSeconds"
    | "activeSeconds"
  >,
  random: RandomSource,
): LaneState => {
  const fish = chooseFish(totals.catches, random);
  const fishY = randomBetween(0.14, 0.86, random);

  return {
    ...player,
    ...totals,
    phase: "fishing",
    phaseTime: 0,
    fish,
    fishY,
    fishVelocity: 0,
    fishTargetY: randomBetween(0.1, 0.9, random),
    targetTime: randomBetween(
      fish.targetMinSeconds,
      fish.targetMaxSeconds,
      random,
    ),
    barY: 0.5 - GAME_CONFIG.bar.height / 2,
    barVelocity: 0,
    catchProgress: GAME_CONFIG.catch.initialProgress,
    lastReward: 0,
  };
};

export const createLane = (
  player: PlayerDefinition,
  random: RandomSource = Math.random,
): LaneState =>
  newRound(
    player,
    {
      score: 0,
      catches: 0,
      escapes: 0,
      streak: 0,
      maxStreak: 0,
      overlapSeconds: 0,
      activeSeconds: 0,
    },
    random,
  );

const updateBar = (lane: LaneState, pressed: boolean, delta: number) => {
  const bar = GAME_CONFIG.bar;
  const acceleration = pressed
    ? bar.gravity - bar.liftAcceleration
    : bar.gravity;

  lane.barVelocity += acceleration * delta;
  lane.barVelocity *= Math.exp(-bar.velocityDamping * delta);
  lane.barVelocity = clamp(
    lane.barVelocity,
    -bar.maxRiseSpeed,
    bar.maxFallSpeed,
  );
  lane.barY += lane.barVelocity * delta;

  const bottom = 1 - bar.height;
  if (lane.barY < 0) {
    lane.barY = 0;
    lane.barVelocity = Math.abs(lane.barVelocity) * bar.topBounce;
  } else if (lane.barY > bottom) {
    lane.barY = bottom;
    lane.barVelocity = -Math.abs(lane.barVelocity) * bar.bottomBounce;
  }
};

const updateFish = (
  lane: LaneState,
  delta: number,
  random: RandomSource,
) => {
  const fish = lane.fish;
  lane.targetTime -= delta;

  if (lane.targetTime <= 0) {
    lane.fishTargetY = randomBetween(0.06, 0.94, random);
    lane.targetTime = randomBetween(
      fish.targetMinSeconds,
      fish.targetMaxSeconds,
      random,
    );
  }

  const panic =
    lane.catchProgress >= GAME_CONFIG.catch.panicThreshold
      ? GAME_CONFIG.catch.panicMultiplier
      : 1;
  lane.fishVelocity +=
    (lane.fishTargetY - lane.fishY) * fish.agility * panic * delta;
  lane.fishVelocity +=
    randomBetween(-fish.jitter, fish.jitter, random) *
    panic *
    Math.sqrt(delta);

  if (random() < fish.dartRate * panic * delta) {
    const direction = random() < 0.5 ? -1 : 1;
    lane.fishVelocity += direction * fish.dartForce;
  }

  lane.fishVelocity *= Math.exp(-fish.damping * delta);
  lane.fishVelocity = clamp(
    lane.fishVelocity,
    -fish.maxSpeed * panic,
    fish.maxSpeed * panic,
  );
  lane.fishY += lane.fishVelocity * delta;

  const padding = GAME_CONFIG.simulation.fishEdgePadding;
  if (lane.fishY < padding) {
    lane.fishY = padding;
    lane.fishVelocity = Math.abs(lane.fishVelocity) * 0.72;
  } else if (lane.fishY > 1 - padding) {
    lane.fishY = 1 - padding;
    lane.fishVelocity = -Math.abs(lane.fishVelocity) * 0.72;
  }
};

export const isFishOverlappingBar = (lane: LaneState) =>
  lane.fishY >= lane.barY &&
  lane.fishY <= lane.barY + GAME_CONFIG.bar.height;

export const advanceLane = (
  current: LaneState,
  pressed: boolean,
  elapsedSeconds: number,
  random: RandomSource = Math.random,
): LaneState => {
  const delta = Math.min(
    Math.max(elapsedSeconds, 0),
    GAME_CONFIG.simulation.maxDeltaSeconds,
  );
  const lane = { ...current };
  lane.activeSeconds += delta;

  if (lane.phase !== "fishing") {
    lane.phaseTime -= delta;
    if (lane.phaseTime <= 0) {
      return newRound(
        { id: lane.id, name: lane.name, keyCode: lane.keyCode },
        lane,
        random,
      );
    }
    return lane;
  }

  updateBar(lane, pressed, delta);
  updateFish(lane, delta, random);

  if (isFishOverlappingBar(lane)) {
    lane.overlapSeconds += delta;
    lane.catchProgress = Math.min(
      1,
      lane.catchProgress + GAME_CONFIG.catch.gainPerSecond * delta,
    );
  } else {
    lane.catchProgress = Math.max(
      0,
      lane.catchProgress - GAME_CONFIG.catch.lossPerSecond * delta,
    );
  }

  if (lane.catchProgress >= 1) {
    lane.phase = "caught";
    lane.phaseTime = GAME_CONFIG.round.caughtDisplaySeconds;
    lane.score += lane.fish.score;
    lane.catches += 1;
    lane.streak += 1;
    lane.maxStreak = Math.max(lane.maxStreak, lane.streak);
    lane.lastReward = lane.fish.score;
  } else if (lane.catchProgress <= 0) {
    lane.phase = "escaped";
    lane.phaseTime = GAME_CONFIG.round.escapedDisplaySeconds;
    lane.escapes += 1;
    lane.streak = 0;
    lane.lastReward = 0;
  }

  return lane;
};
