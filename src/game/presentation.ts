import bassSprite from "../assets/game/fish/bass.webp";
import carpSprite from "../assets/game/fish/carp.webp";
import catfishSprite from "../assets/game/fish/catfish.webp";
import squidSprite from "../assets/game/fish/squid.webp";
import type { FishId } from "./types";

export interface FishArtDefinition {
  src: string;
  swimDurationSeconds: number;
  visualScale: number;
}

export const FISH_ART = {
  carp: {
    src: carpSprite,
    swimDurationSeconds: 1.9,
    visualScale: 0.96,
  },
  bass: {
    src: bassSprite,
    swimDurationSeconds: 1.45,
    visualScale: 1,
  },
  catfish: {
    src: catfishSprite,
    swimDurationSeconds: 1.12,
    visualScale: 1.02,
  },
  squid: {
    src: squidSprite,
    swimDurationSeconds: 0.78,
    visualScale: 0.92,
  },
} satisfies Record<FishId, FishArtDefinition>;

export const FISH_ASSET_URLS = Object.values(FISH_ART).map(({ src }) => src);
