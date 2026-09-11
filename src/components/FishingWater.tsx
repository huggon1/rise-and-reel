import { memo, useId, type CSSProperties } from "react";
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
    ? clamp(
        (Math.atan2(velocityY, Math.max(Math.abs(velocityX), 0.08)) * 180) /
          Math.PI,
        -24,
        24,
      )
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

// The frame stays exactly on the simulation bounds; only the loose weave moves.
const NetInterior = memo(function NetInterior() {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      className="net-interior"
      viewBox="0 0 240 120"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <pattern
          id={`${id}-weave`}
          width="24"
          height="24"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="m0 0 24 24M24 0 0 24"
            fill="none"
            stroke="#d2bc81"
            strokeOpacity=".46"
            strokeWidth="1.5"
          />
          <path
            d="m0 1 23 23M24 1 1 24"
            fill="none"
            stroke="#243e36"
            strokeOpacity=".4"
            strokeWidth="1"
          />
          <rect
            x="10.5"
            y="10.5"
            width="3"
            height="3"
            rx=".8"
            fill="#e1c98c"
            fillOpacity=".7"
          />
        </pattern>
        <linearGradient id={`${id}-rim`} x2="0" y2="1">
          <stop stopColor="#ffe5a2" />
          <stop offset=".3" stopColor="#c79749" />
          <stop offset=".65" stopColor="#f3d38d" />
          <stop offset="1" stopColor="#98703b" />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <path d="M5 5H235V106L226 115H14L5 106Z" />
        </clipPath>
      </defs>
      <path
        className="net-water-fill"
        d="M5 5H235V106L226 115H14L5 106Z"
        fill="#ecd58f"
        fillOpacity=".06"
      />
      <g clipPath={`url(#${id}-clip)`}>
        <rect
          className="net-weave"
          x="0"
          y="-12"
          width="252"
          height="156"
          fill={`url(#${id}-weave)`}
        />
      </g>
      <path
        d="M5 5H235V106L226 115H14L5 106Z"
        fill="none"
        stroke="#172e2a"
        strokeWidth="10"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d="M5 5H235V106L226 115H14L5 106Z"
        fill="none"
        stroke={`url(#${id}-rim)`}
        strokeWidth="6"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d="M5 5H235V106L226 115H14L5 106Z"
        fill="none"
        stroke="#80613a"
        strokeWidth="5"
        strokeDasharray="1 5"
        vectorEffect="non-scaling-stroke"
        opacity=".65"
      />
      <path
        d="M8 8H232M8 11V103M16 112H224"
        fill="none"
        stroke="#fff0b5"
        strokeWidth="1"
        opacity=".7"
        vectorEffect="non-scaling-stroke"
      />
      {[14, 76, 164, 226].map((x) => (
        <g key={x} transform={`translate(${x} 5)`}>
          <rect
            x="-5"
            y="-4"
            width="10"
            height="9"
            rx="2"
            fill="#765432"
            stroke="#302e21"
            strokeWidth="1"
          />
          <path d="M-3-3v7M0-3v7M3-3v7" stroke="#f4dba0" strokeWidth="1.6" />
        </g>
      ))}
      <path d="m114 1 6-6 6 6" stroke="#f3dda4" strokeWidth="3" fill="none" />
    </svg>
  );
});

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
      <span className="feedback-burst" aria-hidden="true">
        {Array.from({ length: 8 }, (_, i) => (
          <i key={i} style={{ "--ray": i } as CSSProperties} />
        ))}
      </span>
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
    <div
      className={className}
      style={waterStyle}
      data-round-phase={lane.phase}
      data-net-motion={lane.barVelocity < -0.03 ? "rising" : "falling"}
    >
      <UnderwaterScene sceneIndex={sceneIndex} />
      <div
        className="tension-line lane-tension-line"
        style={{ height: `${lane.barY * 100}%` }}
        aria-hidden="true"
      >
        <span />
      </div>
      <div
        className={`catch-zone ${overlap ? "overlap" : ""}`}
        style={{
          top: `${lane.barY * 100}%`,
          height: `${GAME_CONFIG.bar.height * 100}%`,
        }}
      >
        <NetInterior />
      </div>
      <div className="fish-marker" style={{ top: `${lane.fishY * 100}%` }}>
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
        position={{ top: `${clamp(lane.fishY * 100, 22, 90)}%` }}
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
      data-round-phase={round.phase}
      data-net-motion={round.zoneVelocityY < -0.03 ? "rising" : "falling"}
      style={{ "--fish-color": round.fish.color } as CSSProperties}
    >
      <UnderwaterScene wide />
      <div
        className="tension-line axis-line x-axis-line"
        style={{ top: `${round.zoneY * 100}%`, width: `${round.zoneX * 100}%` }}
        aria-hidden="true"
      >
        <span />
      </div>
      <div
        className="tension-line axis-line y-axis-line"
        style={{
          left: `${round.zoneX * 100}%`,
          height: `${round.zoneY * 100}%`,
        }}
        aria-hidden="true"
      >
        <span />
      </div>
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
        position={{
          left: `${clamp(round.fishX * 100, 22, 78)}%`,
          top: `${clamp(round.fishY * 100, 22, 90)}%`,
        }}
      />
    </div>
  );
}
