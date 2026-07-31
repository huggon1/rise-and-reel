import { GAME_CONFIG } from "./config";
import { chooseFish, type RandomSource } from "./engine";
import type {
  CooperativePlayerDefinition,
  CooperativeState,
  FishDefinition,
} from "./types";

export interface CooperativeInput {
  xPressed: boolean;
  yPressed: boolean;
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

const randomBetween = (
  minimum: number,
  maximum: number,
  random: RandomSource,
) => minimum + (maximum - minimum) * random();

const createRound = (
  players: [CooperativePlayerDefinition, CooperativePlayerDefinition],
  score: number,
  catches: number,
  streak: number,
  random: RandomSource,
): CooperativeState => {
  const fish = chooseFish(catches, random);

  return {
    players,
    score,
    catches,
    streak,
    phase: "fishing",
    phaseTime: 0,
    fish,
    fishX: randomBetween(0.14, 0.86, random),
    fishY: randomBetween(0.14, 0.86, random),
    fishVelocityX: 0,
    fishVelocityY: 0,
    fishTargetX: randomBetween(0.1, 0.9, random),
    fishTargetY: randomBetween(0.1, 0.9, random),
    targetTime: randomBetween(
      fish.targetMinSeconds,
      fish.targetMaxSeconds,
      random,
    ),
    zoneX: 0.5,
    zoneY: 0.5,
    zoneVelocityX: 0,
    zoneVelocityY: 0,
    catchProgress: GAME_CONFIG.catch.initialProgress,
    lastReward: 0,
  };
};

export const createCooperativeGame = (
  players: [CooperativePlayerDefinition, CooperativePlayerDefinition],
  random: RandomSource = Math.random,
): CooperativeState => createRound(players, 0, 0, 0, random);

const updateBoundedAxis = (
  position: number,
  velocity: number,
  acceleration: number,
  damping: number,
  maximumSpeed: number,
  minimum: number,
  maximum: number,
  bounce: number,
  delta: number,
) => {
  let nextVelocity = velocity + acceleration * delta;
  nextVelocity *= Math.exp(-damping * delta);
  nextVelocity = clamp(nextVelocity, -maximumSpeed, maximumSpeed);
  let nextPosition = position + nextVelocity * delta;

  if (nextPosition < minimum) {
    nextPosition = minimum;
    nextVelocity = Math.abs(nextVelocity) * bounce;
  } else if (nextPosition > maximum) {
    nextPosition = maximum;
    nextVelocity = -Math.abs(nextVelocity) * bounce;
  }

  return [nextPosition, nextVelocity] as const;
};

const updateZone = (
  state: CooperativeState,
  input: CooperativeInput,
  delta: number,
) => {
  const horizontal = GAME_CONFIG.cooperative.horizontal;
  const zone = GAME_CONFIG.cooperative.zone;
  [state.zoneX, state.zoneVelocityX] = updateBoundedAxis(
    state.zoneX,
    state.zoneVelocityX,
    input.xPressed
      ? horizontal.heldAcceleration
      : horizontal.releasedAcceleration,
    horizontal.velocityDamping,
    horizontal.maxSpeed,
    zone.width / 2,
    1 - zone.width / 2,
    horizontal.edgeBounce,
    delta,
  );

  const bar = GAME_CONFIG.bar;
  [state.zoneY, state.zoneVelocityY] = updateBoundedAxis(
    state.zoneY,
    state.zoneVelocityY,
    input.yPressed ? bar.gravity - bar.liftAcceleration : bar.gravity,
    bar.velocityDamping,
    Math.max(bar.maxRiseSpeed, bar.maxFallSpeed),
    zone.height / 2,
    1 - zone.height / 2,
    bar.bottomBounce,
    delta,
  );
};

const updateFish = (
  state: CooperativeState,
  delta: number,
  random: RandomSource,
) => {
  const fish = state.fish;
  state.targetTime -= delta;

  if (state.targetTime <= 0) {
    state.fishTargetX = randomBetween(0.06, 0.94, random);
    state.fishTargetY = randomBetween(0.06, 0.94, random);
    state.targetTime = randomBetween(
      fish.targetMinSeconds,
      fish.targetMaxSeconds,
      random,
    );
  }

  const panic =
    state.catchProgress >= GAME_CONFIG.catch.panicThreshold
      ? GAME_CONFIG.catch.panicMultiplier
      : 1;
  state.fishVelocityX +=
    (state.fishTargetX - state.fishX) * fish.agility * panic * delta;
  state.fishVelocityY +=
    (state.fishTargetY - state.fishY) * fish.agility * panic * delta;
  state.fishVelocityX +=
    randomBetween(-fish.jitter, fish.jitter, random) *
    panic *
    Math.sqrt(delta);
  state.fishVelocityY +=
    randomBetween(-fish.jitter, fish.jitter, random) *
    panic *
    Math.sqrt(delta);

  if (random() < fish.dartRate * panic * delta) {
    const angle = random() * Math.PI * 2;
    state.fishVelocityX += Math.cos(angle) * fish.dartForce;
    state.fishVelocityY += Math.sin(angle) * fish.dartForce;
  }

  const damping = Math.exp(-fish.damping * delta);
  state.fishVelocityX = clamp(
    state.fishVelocityX * damping,
    -fish.maxSpeed * panic,
    fish.maxSpeed * panic,
  );
  state.fishVelocityY = clamp(
    state.fishVelocityY * damping,
    -fish.maxSpeed * panic,
    fish.maxSpeed * panic,
  );

  const padding = GAME_CONFIG.simulation.fishEdgePadding;
  [state.fishX, state.fishVelocityX] = updateBoundedAxis(
    state.fishX,
    state.fishVelocityX,
    0,
    0,
    fish.maxSpeed * panic,
    padding,
    1 - padding,
    0.72,
    delta,
  );
  [state.fishY, state.fishVelocityY] = updateBoundedAxis(
    state.fishY,
    state.fishVelocityY,
    0,
    0,
    fish.maxSpeed * panic,
    padding,
    1 - padding,
    0.72,
    delta,
  );
};

export const isFishInsideCooperativeZone = (state: CooperativeState) => {
  const zone = GAME_CONFIG.cooperative.zone;
  return (
    Math.abs(state.fishX - state.zoneX) <= zone.width / 2 &&
    Math.abs(state.fishY - state.zoneY) <= zone.height / 2
  );
};

export const advanceCooperativeGame = (
  current: CooperativeState,
  input: CooperativeInput,
  elapsedSeconds: number,
  random: RandomSource = Math.random,
): CooperativeState => {
  const delta = Math.min(
    Math.max(elapsedSeconds, 0),
    GAME_CONFIG.simulation.maxDeltaSeconds,
  );
  const state = { ...current };

  if (state.phase !== "fishing") {
    state.phaseTime -= delta;
    if (state.phaseTime <= 0) {
      return createRound(
        state.players,
        state.score,
        state.catches,
        state.streak,
        random,
      );
    }
    return state;
  }

  updateZone(state, input, delta);
  updateFish(state, delta, random);

  if (isFishInsideCooperativeZone(state)) {
    state.catchProgress = Math.min(
      1,
      state.catchProgress + GAME_CONFIG.catch.gainPerSecond * delta,
    );
  } else {
    state.catchProgress = Math.max(
      0,
      state.catchProgress - GAME_CONFIG.catch.lossPerSecond * delta,
    );
  }

  if (state.catchProgress >= 1) {
    state.phase = "caught";
    state.phaseTime = GAME_CONFIG.round.caughtDisplaySeconds;
    state.score += state.fish.score;
    state.catches += 1;
    state.streak += 1;
    state.lastReward = state.fish.score;
  } else if (state.catchProgress <= 0) {
    state.phase = "escaped";
    state.phaseTime = GAME_CONFIG.round.escapedDisplaySeconds;
    state.streak = 0;
    state.lastReward = 0;
  }

  return state;
};
