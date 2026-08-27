# Rise & Reel runtime art

This directory contains original, production-bound raster art for the playable lake. The images were generated with OpenAI's built-in image generation tool, reviewed visually, and converted to WebP for runtime use.

## Asset map

- `environments/lake-hero.webp`: responsive home hero derived from the repository key art.
- `environments/underwater.webp`: fish-free portrait scene for Solo and Multiplayer lanes.
- `environments/underwater-wide.webp`: fish-free landscape scene for 2D Fishing.
- `fish/*.webp`: transparent side-profile character art for the four configured species.

The presentation mapping lives in `src/game/presentation.ts`. Game physics and fish definitions intentionally do not reference these files.

## Art direction

The runtime direction is **Twilight Lake Diorama × Analog Tackle Box**. Pixel art belongs to the lake and its wildlife; controls and data remain crisp, restrained interface elements. A fishing tension line connects the home hero, catch zones, Multiplayer lanes, and the two axes in cooperative play.

All game art follows these constraints:

- upper-left sunset lighting;
- deep teal water, warm cream highlights, and species-specific accents;
- hard pixel edges and readable silhouettes at small sizes;
- no baked-in text, UI, fishing lines, or gameplay targets;
- no background fish in playable environments;
- quiet central water with detail concentrated at the surface, sides, and lake bed.

## Regeneration prompt set

Fish prompts use the repository key art as a style reference and request one complete animal in strict side profile, facing right, centered on a genuinely transparent background. Each prompt specifies the species anatomy and configured accent color, then requires crisp handcrafted 16-bit-inspired pixel art, limited color clusters, generous transparent padding, no scenery, no cast shadow, no glow, and readability at 48 CSS pixels.

Environment prompts request a fish-free freshwater cutaway from the sunset surface to the lake bed. The portrait prompt targets vertical lanes; the landscape prompt targets the 2D playfield. Both require low-detail central water, subtle particles and light shafts, reeds and stones limited to the outer edges and bottom, and no animals, hooks, bobbers, text, UI, or high-contrast false targets.

When regenerating, create species separately and use the approved earlier species as consistency references. Do not ask an image model to produce a combined sprite sheet.
