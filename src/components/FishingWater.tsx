import type { CSSProperties } from "react";
import { GAME_CONFIG } from "../game/config";
import { isFishOverlappingBar } from "../game/engine";
import type {
  CooperativeState,
  FishDefinition,
  LaneState,
  RoundPhase,
} from "../game/types";
import { FISH_ART } from "../game/presentation";
import { isFishInsideCooperativeZone } from "../cooperative/engine";

type WaterVariant = "solo" | "multiplayer";

interface LaneWaterProps {
  lane: LaneState;
  variant: WaterVariant;
  fishLabel: string;
  caughtMessage: string;
  escapedMessage: string;
  playerColor?: string;
  sceneIndex?: number;
}

interface CooperativeWaterProps {
  round: CooperativeState;
  fishLabel: string;
  caughtMessage: string;
  escapedMessage: string;
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

function UnderwaterScene({
  wide = false,
  sceneIndex = 0,
}: {
  wide?: boolean;
  sceneIndex?: number;
}) {
  return (
    <div
      className={`underwater-scene${wide ? " wide" : ""}`}
      style={{ "--scene-index": sceneIndex } as CSSProperties}
      aria-hidden="true"
    >
      <span className="surface-shimmer" />
      <span className="water-dust dust-a" />
      <span className="water-dust dust-b" />
      <span className="water-dust dust-c" />
      <span className="water-dust dust-d" />
      <span className="water-dust dust-e" />
      <span className="water-dust dust-f" />
    </div>
  );
}

function FishSprite({
  fish,
  phase,
  overlap,
  fishLabel,
  velocityX,
  velocityY,
}: {
  fish: FishDefinition;
  phase: RoundPhase;
  overlap: boolean;
  fishLabel: string;
  velocityX?: number;
  velocityY: number;
}) {
  const art = FISH_ART[fish.id];
  const isTwoDimensional = velocityX !== undefined;
  const facing = isTwoDimensional && velocityX < -0.015 ? -1 : 1;
  const pitch = isTwoDimensional
    ? clamp(Math.atan2(velocityY, Math.max(Math.abs(velocityX), 0.08)) * 180 / Math.PI, -24, 24)
    : clamp(velocityY * 38, -20, 20);
  const style = {
    "--fish-facing": facing,
    "--fish-pitch": `${pitch}deg`,
    "--fish-scale": art.visualScale,
    "--swim-duration": `${art.swimDurationSeconds}s`,
  } as CSSProperties;

  return (
    <div
      className={`fish-sprite phase-${phase}${overlap ? " is-hooked" : ""}`}
      style={style}
      role="img"
      aria-label={fishLabel}
      data-fish-id={fish.id}
      data-phase={phase}
      data-overlap={overlap}
    >
      <span className="fish-sprite-inner">
        <img src={art.src} alt="" draggable={false} aria-hidden="true" />
      </span>
      <span className="fish-bubble bubble-one" aria-hidden="true" />
      <span className="fish-bubble bubble-two" aria-hidden="true" />
      <span className="fish-bubble bubble-three" aria-hidden="true" />
    </div>
  );
}

function NetInterior() {
  return (
    <span className="net-interior" aria-hidden="true">
      <i className="net-knot start" />
      <i className="net-knot end" />
      <i className="net-glint" />
    </span>
  );
}

function RoundFeedback({
  phase,
  caughtMessage,
  escapedMessage,
  position,
}: {
  phase: RoundPhase;
  caughtMessage: string;
  escapedMessage: string;
  position: CSSProperties;
}) {
  if (phase === "fishing") return null;

  return (
    <div className={`round-callout ${phase}`} style={position} role="status">
      <span className="feedback-burst" aria-hidden="true" />
      <strong>{phase === "caught" ? caughtMessage : escapedMessage}</strong>
    </div>
  );
}

export function LaneWater({
  lane,
  variant,
  fishLabel,
  caughtMessage,
  escapedMessage,
  playerColor,
  sceneIndex = 0,
}: LaneWaterProps) {
  const overlap = isFishOverlappingBar(lane);
  const className = variant === "solo" ? "water-column" : "multiplayer-water";
  const waterStyle = {
    "--fish-color": lane.fish.color,
    ...(playerColor ? { "--player-color": playerColor } : {}),
  } as CSSProperties;

  return (
    <div className={className} style={waterStyle}>
      <UnderwaterScene sceneIndex={sceneIndex} />
      <div
        className="tension-line lane-tension-line"
        style={{ height: `${lane.barY * 100}%` }}
        aria-hidden="true"
      ><span /></div>
      <div
        className={`catch-zone ${overlap ? "overlap" : ""}`}
        style={{
          top: `${lane.barY * 100}%`,
          height: `${GAME_CONFIG.bar.height * 100}%`,
        }}
      ><NetInterior /></div>
      <div
        className="fish-marker"
        style={{ top: `${lane.fishY * 100}%` }}
      >
        <FishSprite
          fish={lane.fish}
          phase={lane.phase}
          overlap={overlap}
          fishLabel={fishLabel}
          velocityY={lane.fishVelocity}
        />
      </div>
      <RoundFeedback
        phase={lane.phase}
        caughtMessage={caughtMessage}
        escapedMessage={escapedMessage}
        position={{ top: `${lane.fishY * 100}%` }}
      />
    </div>
  );
}

export function CooperativeWater({
  round,
  fishLabel,
  caughtMessage,
  escapedMessage,
}: CooperativeWaterProps) {
  const overlap = isFishInsideCooperativeZone(round);
  const zone = GAME_CONFIG.cooperative.zone;

  return (
    <div
      className="cooperative-water"
      style={{ "--fish-color": round.fish.color } as CSSProperties}
    >
      <UnderwaterScene wide />
      <div
        className="tension-line axis-line x-axis-line"
        style={{ top: `${round.zoneY * 100}%`, width: `${round.zoneX * 100}%` }}
        aria-hidden="true"
      ><span /></div>
      <div
        className="tension-line axis-line y-axis-line"
        style={{ left: `${round.zoneX * 100}%`, height: `${round.zoneY * 100}%` }}
        aria-hidden="true"
      ><span /></div>
      <div
        className={`cooperative-zone ${overlap ? "overlap" : ""}`}
        style={{
          left: `${round.zoneX * 100}%`,
          top: `${round.zoneY * 100}%`,
          width: `${zone.width * 100}%`,
          height: `${zone.height * 100}%`,
        }}
      >
        <NetInterior />
        <span className="axis-handle x">X</span>
        <span className="axis-handle y">Y</span>
      </div>
      <div
        className="fish-marker cooperative-fish"
        style={{ left: `${round.fishX * 100}%`, top: `${round.fishY * 100}%` }}
      >
        <FishSprite
          fish={round.fish}
          phase={round.phase}
          overlap={overlap}
          fishLabel={fishLabel}
          velocityX={round.fishVelocityX}
          velocityY={round.fishVelocityY}
        />
      </div>
      <RoundFeedback
        phase={round.phase}
        caughtMessage={caughtMessage}
        escapedMessage={escapedMessage}
        position={{ left: `${round.fishX * 100}%`, top: `${round.fishY * 100}%` }}
      />
    </div>
  );
}
