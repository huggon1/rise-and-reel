import type { CSSProperties } from "react";

/** Small, code-native tackle icons share the same 24-unit grid and rope weight. */
export function TackleIcon({
  kind,
  className = "",
}: {
  kind: "reel" | "fish" | "crew" | "net" | "book" | "sun" | "trophy";
  className?: string;
}) {
  return (
    <svg
      className={`tackle-icon ${className}`}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {kind === "reel" && (
        <>
          <path d="M6 28 23 5l4 2L10 30M23 5l-1-2M25 8v13q0 8-5 4v-3" />
          <circle cx="12" cy="21" r="5" />
          <circle cx="12" cy="21" r="2" />
          <path d="m8 18-3-2" />
        </>
      )}
      {kind === "fish" && (
        <>
          <path d="M7 16c6-10 15-10 21 0-6 10-15 10-21 0L2 9v14l5-7Z" />
          <path d="m14 9 4-5 3 5m-7 14 4 5 3-5M21 10q-5 6 0 12" />
          <circle cx="24" cy="15" r="1" fill="currentColor" />
        </>
      )}
      {kind === "crew" && (
        <>
          <path d="M3 22h26l-5 6H8l-5-6Zm7-2V9m12 11V9" />
          <circle cx="10" cy="6" r="3" />
          <circle cx="22" cy="6" r="3" />
          <path d="m5 15 5-3 5 3m2 0 5-3 5 3M3 31h26" />
        </>
      )}
      {kind === "net" && (
        <>
          <path d="M16 2v5M5 8h22v16l-4 5H9l-4-5V8Z" />
          <path d="m5 8 21 21M5 17l12 12M14 8l13 13M27 8 6 29m21-12L15 29m3-21L5 21" />
        </>
      )}
      {kind === "book" && (
        <>
          <path d="M7 3h19v26H7a3 3 0 0 1 0-6h19M7 3a3 3 0 0 0-3 3v20M10 3v20m3-14h8m-8 5h6" />
          <path d="M21 24v7l-3-2-3 2v-7" />
        </>
      )}
      {kind === "sun" && (
        <>
          <circle cx="16" cy="16" r="6" />
          <path d="M16 2v4m0 20v4M2 16h4m20 0h4M6 6l3 3m14 14 3 3M6 26l3-3M23 9l3-3" />
        </>
      )}
      {kind === "trophy" && (
        <>
          <path d="M9 3h14v10a7 7 0 0 1-14 0V3Zm0 3H4v5q0 6 6 6m13-11h5v5q0 6-6 6M16 20v7m-7 3h14M12 27h8" />
          <path d="m16 7 1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3Z" />
        </>
      )}
    </svg>
  );
}

export function LakeAtmosphere() {
  return (
    <div className="lake-atmosphere" aria-hidden="true">
      <span className="lake-reflection" />
      {Array.from({ length: 8 }, (_, i) => (
        <i
          key={i}
          className="firefly"
          style={{ "--i": i, "--row": i % 3 } as CSSProperties}
        />
      ))}
    </div>
  );
}

export function WaterHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="water-heading">
      <TackleIcon kind="sun" />
      <span>{title}</span>
      <small>{subtitle}</small>
    </div>
  );
}
