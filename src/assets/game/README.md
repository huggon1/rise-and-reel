# Rise & Reel runtime art

The runtime art direction is **Sunset Lake: a handcrafted fishing club**. Deep jade water, peach sunset, honey-colored rope and brass, and weathered timber belong to one continuous pixel-art environment. The title screen, menus, HUD, nets, and results use the same palette.

## Runtime assets

- `environments/lakeside.webp` — 1536 × 1024 lakeside scene with a quiet center, dock, lantern, forest, and sunset. Used across the title screen and menus/playfields.
- `environments/underwater-lake.webp` — 1536 × 1024 fish-free underwater plate, matching the lake reference. Its center crops into solo/multiplayer lanes; the full landscape supports cooperative play.
- `fish/*.webp` — existing transparent side-profile sprites for the four species. Retained after checking their silhouettes against the new water.

Both environment plates were generated with the built-in OpenAI image generation tool, visually inspected, and encoded as WebP at quality 90 with `cwebp`. Original source images are not needed at runtime. The previous three environment images were superseded. No generated asset contains UI text.

## UI and animation

`GameOrnaments.tsx` supplies a shared 32-unit tackle-icon family. `FishingWater.tsx` draws the net with instance-specific SVG weave/clip/gradient IDs, layered rope strokes, lashings, and knots. The simulation container stays fixed to the original bounds; only its interior weave responds to vertical movement and overlap. All decoration ignores pointer input. Gameplay coordinates and rules remain in the existing engines.

Titles and score digits use self-hosted **Lilita One**; Chinese display glyphs use **ZCOOL KuaiLe**; body copy uses **Nunito** with platform Chinese sans-serif fallbacks. Fonts are distributed via Fontsource packages under their upstream licenses. No remote font service is required.

Environment motion is slow and peripheral. The net responds to motion and overlap, and catches use a reward plaque, radial sparks, bubbles, and the fish's reel-in animation. Gameplay animations pause with the session. Reduced-motion preferences disable decorative animation and transitions.

## Generation prompts

The built-in tool was used for both images; no API/CLI generation fallback was used.

### Lakeside

> Use case: stylized-concept. Create a production game background asset for Rise & Reel, a cozy freshwater fishing game. Wide landscape 1536x1024 or wider. High quality handcrafted 16-bit pixel art with visible intentional pixel clusters, limited coherent palette, absolutely not a photograph or blurry digital painting. Twilight lakeside at golden sunset, still deep teal lake occupying center and lower two thirds, warm peach sky upper quarter, layers of dark pine forest and distant blue mountains on horizon, small warm golden sun upper center-right. Frame the edges with dark reeds on left, a wooden fishing dock entering from bottom right, coiled rope and old brass lantern on dock, small weathered boathouse near far right shore. Subtle sunset reflection across the water. Large central and left-center area must remain quiet, low-detail dark teal water, so game UI overlays stay readable. Rich crafted atmosphere, nostalgic charming indie game, warm honey highlights against deep emerald shadows. View across lake, no underwater cutaway. No characters, no fish, no UI, no letters, no text, no logos, no watermark. This is a finished runtime scene plate, edge-to-edge.

### Underwater

Input: the generated lakeside image as a palette/style reference.

> Use case: stylized-concept. Input image is only a style and palette reference. Generate a NEW matching underwater game environment asset for that same cozy pixel-art fishing lake, 1536x1024 landscape. Entire image is beneath the surface: top 5% thin bright rippling golden-teal water surface, rays of amber sunlight from upper left softly broken into intentional pixel clusters. Bottom 15% rounded dark river stones, small moss patches and aquatic plants, edge framing of reeds and pondweed only far left/right. Central 70% must be clean open deep teal water, quiet and evenly legible for small moving fish and a gold rope net. Strong depth gradient from turquoise upper third to dark forest-green lakebed, muted indigo distant underwater rocks. Handcrafted detailed 16-bit pixel art with chunky readable clusters and a limited coherent palette matching the reference, not photographic, no painterly smudges. Rich but restrained, warm sunlight vs cool jade shadows. No fish or creatures, no hooks, no net, no lines, no text, no UI, no frames, no lettering. Edge-to-edge actual runtime game background, also suitable to crop the middle to a portrait vertical lane.
