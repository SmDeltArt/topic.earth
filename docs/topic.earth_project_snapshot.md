# topic.earth â€” App Overview, Architecture, Purpose, Current Stage, and Latest Prompt Direction

## 1. Project identity

**topic.earth** is an interactive globe-based climate and knowledge experience designed to combine:
- a beautiful, explorable main Earth
- an **Earthâ€™s Fever** simulation mode with 25-year milestones
- a **Tipping Points** overlay
- an **AMOC Watch** overlay
- topic and layer navigation
- a right-side monitoring / explanation workflow
- future AI-assisted topic, layer, and research extensions

The project is not just a visual globe. It is becoming a **data-linked climate storytelling and monitoring interface**.

---

## 2. Core purpose

The app aims to:

1. **Show Earth in multiple modes**
   - calm main exploration mode
   - climate simulation mode
   - data/topic-driven monitoring mode

2. **Make climate change understandable**
   - year progression
   - scenario comparison
   - visible tipping pressure
   - AMOC behavior
   - simplified educational explanations

3. **Stay transparent**
   - scenarios should be visible and editable in structured data
   - visual states should be linked to values, not only to baked textures
   - future updates should be possible without rebuilding everything

4. **Stay expandable**
   - new topics
   - new layers
   - AI-assisted research
   - future climate / transport / emissions / region layers

---

## 3. Main app modes

### A. Main mode
The beautiful base Earth:
- normal exploration
- topic markers / presets
- optional country or location interaction
- higher-quality material rendering
- intended to feel attractive and stable

### B. Earthâ€™s Fever mode
The simulation mode:
- 25-year loop milestones:
  - 1950
  - 1975
  - 2000
  - 2025
  - 2050
  - 2075
  - 2100
  - 2125
- scenario switching
- forward / reverse / pause behavior
- warning logic
- year display
- monitoring panel

### C. Tipping Points overlay
A front-facing overlay that should:
- stay centered on the Fever globe
- follow the same milestone years as the Fever loop
- interpolate smoothly between milestones
- expose editable tipping topics in admin mode

### D. AMOC Watch overlay
A second Fever-focused overlay that should:
- stay centered like Tipping
- synchronize with its own values across the loop
- visually match label colors to animated branches / bars
- integrate into the monitoring system cleanly

### E. Monitoring workflow
The right-side panel in Fever mode should act as the educational/control layer:
- cardio / heartbeat monitoring
- warning summary
- climate chart
- tabs for:
  - Earthâ€™s Fever
  - AMOC Watch
  - Tipping Points
  - Interactions

---

## 4. Current architecture (high level)

### Main runtime files
The project currently revolves around these core areas:

- **`lib/globe.js`**
  - globe creation
  - Earth materials
  - Fever loop texture loading
  - Tipping overlay load / centering / animation
  - AMOC overlay load / centering / animation
  - year overlay behavior
  - scene and mode transitions

- **`app.js`**
  - global app orchestration
  - mode changes
  - layer filter coordination
  - panel interactions
  - UI/state glue

- **`components/DetailPanel.js`**
  - right-side panel
  - monitoring display
  - warning content
  - chart area
  - tab logic
  - close / hide behavior
  - sound toggle wiring

- **`components/LayerPanel.js`**
  - layer list
  - layer toggles
  - Fever-related visibility routing

- **`lib/settings.js`**
  - saved settings
  - defaults
  - upcoming resolution controls

- **data files**
  - layer definitions
  - topics
  - new scenario JSON direction

### Asset structure
The app uses:
- main Earth textures
- Fever loop milestone textures
- GLB overlays for:
  - Tipping
  - AMOC

### Rendering split
There is currently a visual split between:
- **Main mode**, which uses a nicer material pipeline
- **Fever mode**, which uses a more custom simulation material / shader path

This is one reason why the Fever globe can currently look darker than the main Earth.

---

## 5. Current file naming direction

### Main Earth texture direction
Desired naming:
- `Material.001_baseColor_1k.jpeg`
- `Material.001_baseColor_4k.jpeg`
- `Material.001_baseColor_8k.jpeg`

Optional supporting maps:
- `Material.001_normal_1k.jpeg`
- `Material.001_normal_4k.jpeg`
- `Material.001_metallicRoughness_1k.png`
- `Material.001_metallicRoughness_4k.png`

### Fever loop texture direction
Desired naming:
- `earth_1950_1k.png`
- `earth_1950_4k.png`
- ...
- `earth_2125_1k.png`
- `earth_2125_4k.png`

Important current design decision:
- **8k is for main mode only**
- **Fever mode should use only 1k or 4k**

---

## 6. Current stage of the project

The app is currently in an **advanced prototype / integration and refinement stage**.

That means:

### What is already strong
- the globe concept is real and already visually rich
- Fever loop exists
- Tipping overlay exists
- AMOC overlay exists
- scenario logic exists
- monitoring panel exists
- admin-editable direction is real
- layer/topic architecture is already meaningful

### What is still being stabilized
- consistent texture routing between main and Fever
- resolution settings
- cached scene switching
- matching brightness/light between main and Fever
- better linkage between scenario data and visuals
- monitoring panel clarity
- final event wiring for toggles and close behavior
- elimination of legacy or duplicated logic

### Best description of current stage
**Not a concept anymore, not fully production-clean yet.**
It is a working interactive climate interface that is now entering a **cleanup, data-linking, and architecture-hardening phase**.

---

## 7. Current known pain points

### A. Texture routing confusion
Recent evolution exposed that:
- main mode and Fever mode were too easy to mix by filename
- some 1k / 4k main textures could accidentally look like Fever 1950
- main 8k routing needed explicit handling
- Fever should not request 8k at all

### B. Scene swap latency
Switching between main and Fever can feel slower than necessary because:
- textures are reloaded too often
- materials are rebuilt too often
- caching is not yet used aggressively enough

### C. Main vs Fever light mismatch
Fever Earth can appear too dark compared with main mode because:
- it uses a different material logic
- the shader darkening is too strong
- the overall light family is not yet close enough

### D. Monitoring panel architecture
The right panel has improved a lot, but some areas still need cleanup:
- old and new render paths can overlap
- warning / AMOC / tipping content must stay separated
- tab-driven logic should be the clear source of truth

### E. Data transparency
The project is moving toward structured scenario data, but the app still needs stronger linkage between:
- scenario values
- warning text
- chart content
- color logic
- texture selection
- overlay severity

---

## 8. Scenario transparency direction

A major current direction is to make the simulation more transparent and updatable.

### Target idea
Instead of only relying on baked textures, the project should expose:
- scenario names
- milestone values
- warnings
- AMOC values
- tipping severity
- color logic
- texture file names

### JSON direction
A scenario JSON has now been introduced as the future source of truth.

It should become the central place for:
- available scenarios
- milestone years
- texture sets by resolution
- warning titles / text
- climate values
- AMOC indicators
- tipping risk values
- visual color states

### Why this matters
This allows:
- easier updates
- better scientific transparency
- clearer future editing
- fewer hidden hardcoded rules
- stronger user trust

---

## 9. Latest prompt direction

The most recent implementation direction focuses on:

### 1. Clean texture separation
- main mode = 1k / 4k / 8k
- Fever mode = 1k / 4k only
- Fever 8k removed
- clearer filename resolution
- no accidental cross-loading between main and Fever families

### 2. Settings-based resolution control
Planned settings:
- **Main Texture Resolution**
  - Auto / 1k / 4k / 8k
- **Fever Loop Resolution**
  - Auto / 1k / 4k

Auto logic should:
- prefer 1k on weaker devices, mobile, and non-Chromium browsers
- prefer 4k on stronger desktop devices
- keep 8k as main-only premium/manual use

### 3. JSON-driven Fever evolution
The app should begin using the scenario JSON for:
- texture sets
- scenario keys
- warning text
- color states
- future chart and monitoring logic

### 4. Cache-first mode switching
Main and Fever should reuse cached textures/materials instead of reloading every time.

### 5. Fever brightness alignment
Fever should keep nearly the same light family as main mode:
- brighter Earth
- less muddy darkening
- better ocean readability
- same visual family during scene swap

### 6. Monitoring clarity
The monitoring panel should become:
- educational
- stable
- separated by tabs
- easier to understand across user age and knowledge levels

---

## 10. Recommended next implementation order

### Phase 1 â€” Stability
1. fix main texture routing
2. remove Fever 8k support
3. add 1k/4k Fever selection
4. implement texture caching
5. brighten Fever Earth

### Phase 2 â€” Transparency
6. wire `fever-scenarios.json` into runtime
7. read texture sets from JSON
8. read warning text and color states from JSON
9. move more chart logic to structured data

### Phase 3 â€” Monitoring cleanup
10. ensure panel tabs are the only live monitoring render path
11. separate Earth / AMOC / Tipping / Interactions cleanly
12. remove dead legacy panel logic

### Phase 4 â€” Deeper climate coherence
13. better value-to-visual linkage
14. smoother scenario interpolation
15. improved educational wording and explanations
16. stronger admin editability for scenario content

---

## 11. Current project status in one sentence

**topic.earth is now a real interactive climate-globe prototype with strong visual foundations, and the current work is about making it cleaner, faster, brighter, more transparent, and more tightly linked to editable scenario data.**

---

## 12. Practical note for future contributors

When editing this project, prefer these principles:
- do not rebuild what already works
- patch the current architecture cleanly
- avoid duplicate logic paths
- make data the source of truth where possible
- keep main and Fever texture systems clearly separated
- preserve the shared overlay architecture for Tipping / AMOC / year display
- keep the educational monitoring workflow stable

---

## 13. Suggested future companion files

Good next files to maintain alongside this document:
- `fever-scenarios.json`
- `ARCHITECTURE_NOTES.md`
- `TEXTURE_NAMING_MAP.md`
- `FEVER_MONITORING_CONTENT.md`
- `KNOWN_ISSUES.md`
- `PROMPT_HISTORY.md`

---

Prepared as a project snapshot and handoff note for the latest topic.earth evolution.
