# Tissue appearance asset

The built-in image-generation tool produced `src/assets/tissue-atlas.png` on September 5, 2026. The user-supplied operative photograph was an appearance reference. The resulting atlas is a synthetic material asset, not a photograph of the modeled patient, an anatomical reconstruction, or validated tissue data. The original reference attachment is not included in this repository.

The generated file is 1254 × 1254 pixels and is saved unmodified. Four source regions provide liver, adipose, peritoneal and serosal coloration on interactive meshes. At runtime each region is sampled into a separate 512 × 512 GPU texture, preventing color bleed between tissue types in mipmaps. Procedural bump and roughness maps control lighting independently. The atlas is bundled inside the portable HTML. The requested output dimensions in the prompt below differ from the delivered image dimensions.

## Generation prompt

Use case: scientific-educational.
Asset type: an original tissue color texture atlas for an interactive 3D surgical simulator.
Input image 1 is a VISUAL APPEARANCE REFERENCE for living intra-abdominal tissues, not a scene to reproduce.
Transform its material appearance into a square 2048 by 2048 pixel atlas, EXACTLY FOUR edge-to-edge square quadrants, equal sized, no gutters, labels, grid lines or borders. Each quadrant is a flat close-up surface sample, orthographic, filling its complete square with detailed organic material:
TOP LEFT: pink burgundy liver capsule, fine irregular mauve/red capillary branching, mottled rosy pink patches, extremely fine fibrous glistening serosal grain, natural subtle tonal variation. No whole organ silhouette.
TOP RIGHT: warm golden yellow-orange omental adipose, tightly packed irregular soft fat lobules and fine bright red vascular branches between lobules; soft low-relief texture, not deep valleys, not food.
BOTTOM LEFT: translucent pale pearly pink peritoneal connective tissue, very fine stretched criss-cross white collagen threads, sparse fine branching purple-red capillaries, cloudy translucent blush areas, wet silk-like fibrous surface.
BOTTOM RIGHT: pale gray-pink gallbladder serosa, delicate mauve vascular marbling and wispy collagen fibers with patches of muted rose, ivory and slight olive gray; organic uneven coloration, no whole gallbladder silhouette.
Photographic microtexture, realistic surgical tissue coloration informed by the reference. Flat even diffuse white illumination so 3D lights can supply highlights later, minimal baked shadow, fine high-frequency detail throughout. All samples flat and frontal with no perspective or outer edges. Only tissue texture; no instruments, hands, text, organs as whole objects, dissection scenes, open wounds or black background. Maintain exact quadrant order and equal sizes.
