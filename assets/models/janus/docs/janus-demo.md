# Janus illustration

The final built-in Space topic opens `assets/janus/demo.html` through the existing
media viewer. It is a separate interactive diagram using the existing solar GLB,
not a replacement for the normal solar scene.

The open hemisphere grids use Blender's Z-up convention: cut at Z=0, flatten Z,
and reflect through Z for the negative-sector diagram. The browser converts the
Y-up GLB into this Z-up diagram convention. Optional X180 + Y180 rotation changes
orientation; it is separate from reflection. Their combination is a proper
rotation, so cannot supply mirror parity by itself.

Spatial presets 1, 0.6, 0.1 and 0.01 are illustrative parameters. Flattening is a
presentation control, not part of that spatial ratio. The time-arrow rate control
changes playback only, independently of the spatial ratio. Opposite arrows do not
claim a universal proper-time coordinate or reverse physical planetary dynamics.
Ghost planets serve as coordinate references, not predicted twin worlds. The
hemispheres and their separation do not represent an embedding of physical space.

Blender generator: `tools/janus_metric_demo_blender.py`. Open it in Blender 4.2+
and set PROJECT_ROOT, or run:

```powershell
blender --background --python tools/janus_metric_demo_blender.py -- --project-root "C:\Users\bedes\OneDrive\SmDeltArt_Collection\__actual_vs\topic.earth" --ratio 0.6 --flatten 0.5
```

It creates a new scene and writes `assets/models/solar-system.janus-demo.blend`
and `.glb`. Existing scenes are kept; save your current work first. Output files
with these names are overwritten on rerun. The new scene freezes imported orbital
animation and adds separately animated time arrows. The Blender export uses the
chosen fixed ratio and equal arrow playback rates; the browser provides live ratio
and rate controls. The browser demo does not require the generated Blender files.

Reference: https://arxiv.org/abs/2412.04644 — Petit, Margnat & Zejli (2024).
This visual does not implement or solve the paper's field equations.
