# 🎭 Animated Presenter & Avatar Ideas — Feasibility / Difficulty Analysis

> **Date:** June 19, 2026
> **Scope:** smart-svg-editor · smart-editor · smart-3d-editor · avatar-creator · streaming-studio
> **Companion to:** [`streaming-studio_bridge_fixed.md`](./streaming-studio_bridge_fixed.md)
> **Status:** 🧭 Analysis only — no code written. Phased roadmap below.

---

## 🎯 Guiding principle — keep streaming-studio lean

Streaming-studio is **already heavy** (camera, recording, mixing, overlays,
voice, AI redactor, image gen). The new presenter/avatar capabilities should
live in **smaller, focused widgets** and connect to the studio through the
existing **api-settings bridge** and a thin **postMessage choreography
channel** — _not_ by growing the studio bundle.

```
smart-editor (shell)
 ├── smart-svg-editor      → 2D animated presenter / hands / mouth-sync
 └── smart-3d-editor       → 3D avatar (GLB) viewport + bone control
                                   ▲
avatar-creator (MakeHuman) │ exports rigged GLB
                                   │
streaming-studio  ◀── postMessage choreography + api-settings bridge ──▶ widgets
```

Difficulty legend: 🟢 easy · 🟡 moderate · 🟠 hard · 🔴 very hard / research.

---

## 0. What already exists today (baseline)

| Capability                             | Where                                                   | State                          |
| -------------------------------------- | ------------------------------------------------------- | ------------------------------ |
| Timeline + keyframe choreography       | `private/widgets/src/smart-svg-editor.js`               | ✅ working                     |
| TTS layer (browser speechSynthesis)    | smart-svg-editor                                        | ✅ playback only               |
| AI-driven SVG movement (NL → motion)   | smart-svg-editor (via `websim.chat`)                    | ✅ prototype                   |
| WebM export (MediaRecorder)            | smart-svg-editor                                        | ✅ working                     |
| api-settings bridge (OpenAI keys)      | `api-settings-reader.js` (studio)                       | ✅ fixed (June 19)             |
| MakeHuman avatar + 36 poses + bone rig | `_10_Avatar_creator/_actual_vs_10`                      | ✅ poses; ⚠️ GLB export broken |
| Bone keyframe animation plan           | avatar-creator `docs/FEATURE_ROADMAP_BONE_ANIMATION.md` | 📋 designed, not built         |

**Known hard limit:** browser `speechSynthesis` **cannot** be captured by
`MediaRecorder` (documented at `smart-svg-editor.js` ~line 23226). Any video
export with embedded narration audio requires a **real audio stream** — i.e.
OpenAI TTS (or any fetch-able audio file), not the Web Speech API.

---

## A. OpenAI TTS inside the SVG editor (Phase 1) — 🟢🟡

**Why first:** unlocks two things at once — better voice quality **and**
narration audio that can be muxed into the exported WebM.

| Aspect       | Detail                                                                                                                                                                     |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Status today | Browser TTS only; no audio in exports                                                                                                                                      |
| Difficulty   | 🟢 wiring (reuse `api-settings-reader.js`) · 🟡 audio mux into MediaRecorder                                                                                               |
| Approach     | `getTtsSettings()` → if `provider==="openai"` fetch MP3 → `decodeAudioData` → route through `AudioContext` → `MediaStreamDestination` → add track to the recorder's stream |
| Sync         | Schedule audio start on the same timeline clock that drives SVG keyframes                                                                                                  |
| Risk         | Aligning TTS duration with keyframe timing (TTS length is variable) — mitigate by fetching audio first, reading its real duration, then time-scaling the choreography      |

**Verdict:** highest value-to-effort. Reuses the bridge already fixed today.

---

## B. Animated SVG presenter + mouth-sync + commentator bridge — 🟡🟠

A 2D "presenter" (talking head / mascot) that lip-syncs to narration and can be
driven live from streaming-studio.

| Aspect                        | Detail                                                                                                                                                                           |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Status today                  | Choreography + AI motion exist; no mouth-sync; no live bridge                                                                                                                    |
| Mouth-sync (offline)          | 🟡 Use viseme/amplitude envelope. Cheap path: analyse the OpenAI MP3 amplitude (`AnalyserNode`) → map RMS to a few mouth-open frames. Good-enough cartoon sync                   |
| Mouth-sync (phoneme-accurate) | 🟠 needs phoneme timestamps (OpenAI TTS does not return these) → would need a forced-aligner or third-party viseme API                                                           |
| Live commentator bridge       | 🟠 studio posts `{type:"smart-widget", action:"presenter-say", text}` → SVG widget (iframe overlay) speaks + animates. Reuses the postMessage pattern already in `ui-manager.js` |
| Risk                          | Live latency (TTS fetch ~0.5–2 s). Acceptable for commentary, not for real-time conversation                                                                                     |

**Verdict:** Build amplitude-based mouth-sync first (🟡). Phoneme accuracy is a
later, optional upgrade (🟠). The commentator bridge is a thin message contract,
not studio bloat.

---

## C. Avatar Creator remake — AI-controlled 3D avatar via smart-3d-editor — 🟠🔴

**User intent:** rebuild the avatar creator so an AI can pose/animate a rigged
3D avatar inside **smart-editor's embedded smart-3d-editor**, _before_
eventually bridging it into streaming-studio. Explicitly **kept out** of the
studio bundle.

| Aspect                   | Detail                                                                                                                                                                     |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Status today             | MakeHuman avatar + 36 poses + bone rig load in `_actual_vs_10`; **GLB export is broken**; no animation timeline; no AI control                                             |
| Fix GLB export           | 🟠 prerequisite — a clean **rigged GLB** (skin + skeleton + weights) is the hand-off format to smart-3d-editor. Current exporters: OBJ ok, GLB broken, skeleton-JSON ok    |
| Bone keyframe animation  | 🟡 already designed in `FEATURE_ROADMAP_BONE_ANIMATION.md` (SLERP between pose quaternions). Port the 36 poses as keyframes                                                |
| AI control layer         | 🟠 NL → pose/gesture selection. Map intents ("wave", "point left", "nod") to bone keyframe sets via the api-settings AI key. Constrained vocabulary first, free-form later |
| Embed in smart-3d-editor | 🟠 smart-3d-editor must host a `THREE.SkinnedMesh` + `AnimationMixer`; load the rigged GLB; expose a small control API                                                     |
| Full studio bridge       | 🔴 later — live-driven avatar in a recording. Defer until B + C stand alone                                                                                                |
| Risk                     | MakeHuman-js uses old Three.js (r82); smart-3d-editor likely a newer Three — **version/material/skeleton mismatch** is the main research risk                              |

**Phased path:**

1. 🟠 Fix rigged-GLB export from avatar-creator (blocker).
2. 🟡 Pose keyframe timeline (port the bone-animation design).
3. 🟠 Load GLB + `AnimationMixer` in smart-3d-editor.
4. 🟠 AI intent → gesture mapping (constrained vocabulary).
5. 🔴 Optional live bridge into streaming-studio.

**Verdict:** the most ambitious track. Gate everything behind a **working
rigged GLB export** — without it, steps 2–5 cannot start.

---

## D. 2D SVG / 3D GLB hand gestures — 🟢🟡🟠

Expressive hands to direct viewer attention (point, thumbs-up, wave, "look
here") — boosts originality and clarity.

| Variant                              | Difficulty | Notes                                                                                                                                                            |
| ------------------------------------ | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **2D SVG hand** (separate layer)     | 🟢🟡       | Reuse the SVG choreography timeline. A small library of hand poses as SVG paths; tween position + swap pose. Cheapest, ships fastest, records natively into WebM |
| **2D hand synced to narration**      | 🟡         | Trigger gestures on keywords ("here", "this", "big") parsed from the narration text by the AI key                                                                |
| **3D GLB hand** (in smart-3d-editor) | 🟠         | A rigged hand GLB with finger bones; nice for depth/parallax but heavier; same Three-version risk as track C                                                     |
| **Hand attached to avatar**          | 🟠         | Only meaningful once track C exists (shares the skeleton)                                                                                                        |

**Verdict:** Start with the **2D SVG hand library** (🟢🟡) — independent of the
avatar work, immediately useful as an overlay in both the SVG editor and (via
the bridge) the studio. Promote to 3D only after smart-3d-editor hosts a rig.

---

## 🗺️ Recommended build order (value ÷ effort)

| #   | Track                                               | Difficulty | Depends on    | Payoff                            |
| --- | --------------------------------------------------- | ---------- | ------------- | --------------------------------- |
| 1   | **A** — OpenAI TTS in SVG editor                    | 🟢🟡       | bridge (done) | Voice quality + audio-in-export   |
| 2   | **D1** — 2D SVG hand library                        | 🟢🟡       | —             | Originality, attention cues       |
| 3   | **B** — amplitude mouth-sync presenter              | 🟡         | A             | Talking presenter                 |
| 4   | **B** — commentator postMessage bridge              | 🟠         | B             | Live studio-driven captions/voice |
| 5   | **C1** — fix rigged-GLB export                      | 🟠         | —             | Unblocks all 3D avatar work       |
| 6   | **C2–C4** — 3D avatar in smart-3d-editor + AI poses | 🟠         | C1            | AI-controlled 3D presenter        |
| 7   | **C5 / D3** — live avatar + 3D hands in studio      | 🔴         | C, B          | Full virtual host (long-term)     |

---

## 🧱 Architecture rules (so the studio stays lean)

- New presenter/avatar logic lives in **widgets**, not in streaming-studio `src/`.
- Cross-widget control = **postMessage** (`{type:"smart-widget", action, data}`),
  the same contract `ui-manager.js` already handles.
- AI + TTS keys come **only** through `api-settings-reader.js` — never hard-coded,
  never a second key store.
- Any narration that must appear in an exported video uses **OpenAI TTS audio**
  (fetchable stream), never browser `speechSynthesis`.
- 3D hand-off format between avatar-creator and smart-3d-editor = **rigged GLB**.

---

## 🔗 References

- [`streaming-studio_bridge_fixed.md`](./streaming-studio_bridge_fixed.md) — bridge architecture & fixes
- `private/widgets/src/smart-svg-editor.js` — timeline, TTS, WebM export
- `private/widgets/smart-editor.html` · `private/widgets/smart-svg-editor.html`
- `_10_Avatar_creator/_actual_vs_10/docs/FEATURE_ROADMAP_BONE_ANIMATION.md`
- `_10_Avatar_creator/_actual_vs_10/docs/AVATAR_PROJECT_AUDIT.md`
- `_10_Avatar_creator/_actual_vs_10/docs/GLB_EXPORT_GUIDE.md`
