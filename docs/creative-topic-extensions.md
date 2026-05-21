# Creative Topic Extensions

This note collects candidate features that let topic.earth move from observing Earth signals toward explaining, imagining, and proposing practical futures. The goal is to add creative output without weakening the evidence-first character of the app.

## Recommendation

Build this in four layers, in this order:

1. **Topic story embed / hosted HTML card**: let a topic draft include one generated, pasted, or linked HTML/SVG card that previews in a sandboxed frame and exports with the topic ZIP.
2. **Regenerative Visions layer**: add a fourth creative proposal lane inside the existing mode structure, focused on plausible sustainable futures tied to a real topic, place, or evidence set.
3. **Regional Gardening layer**: add a practical local layer for gardens, food resilience, biodiversity corridors, compost loops, water capture, meteo timing, and annotated croquis.
4. **Educational Animator profile**: connect a constrained kid/adult learning story profile to the existing Smart SVG Editor timeline format, without making topic.earth itself a full animation studio.

This keeps the first step small and useful, then gives user imagination a clearly bounded home.

## Topic Story Embed

The strongest first move is a topic-level HTML/SVG attachment, not a full new publishing system.

Users could:

- Paste custom HTML into a sandboxed preview frame.
- Ask linked AI to create HTML from the current topic.
- Choose a visual style such as croquis, illustrated, comic, field note, infographic, or presentation panel.
- Use the app's regional settings as the default location context.
- Attach the generated HTML to the topic ZIP as `story/index.html`.
- Link the story to evidence, images, source URLs, or a presentation file.
- Optionally link a hosted card from `widgets.smdeltart.com` or another trusted app origin when the story needs a richer tool.

The preview should use a sandboxed iframe with no scripts by default. If animated SVG is needed, prefer inline SVG/CSS animation over JavaScript. Any future script mode should be admin-only and clearly labeled.

Suggested export structure:

```text
topic-package.zip
  topic.json
  sources.json
  media/
  story/
    index.html
    assets/
  presentation/
```

## AI Generation

The AI action should generate structured output first, then render HTML from that structure. This keeps the app from accepting arbitrary model HTML as the source of truth.

Recommended AI output shape:

```json
{
  "style": "croquis",
  "title": "Urban shade garden corridor",
  "summary": "A practical local planting plan for heat reduction and biodiversity.",
  "locationContext": {
    "source": "settings",
    "label": "Current Regional default",
    "precision": "region"
  },
  "sections": [
    {
      "label": "Context",
      "body": "Why this topic matters here."
    }
  ],
  "visuals": [
    {
      "type": "annotated-svg",
      "caption": "Garden corridor sketch",
      "svgPlan": {
        "layers": ["trees", "water", "paths", "pollinator beds"]
      }
    }
  ],
  "evidenceLinks": []
}
```

The renderer can then create a consistent HTML card using trusted templates. This is safer than asking the model to directly own all markup.

## Hosted HTML Multiverse

This can become a personal topic multiverse, but the first version should keep each universe as a bounded attachment. A topic can host a narrative card, an educational animation, an interactive SVG, or even a small game-like experience, as long as it is packaged with metadata, evidence context, and sandbox limits.

Suggested attachment types:

- `story-card`: static or lightly animated HTML/SVG.
- `educational-scene`: guided lesson with character, expression, TTS, and short exercise.
- `interactive-croquis`: annotated SVG plan with clickable notes.
- `micro-game`: small game or simulation connected to a topic objective.
- `external-widget`: trusted hosted app opened through a bridge.

For a game such as `TetrAIs-3d.html`, do not treat it like ordinary pasted HTML. It should use a stricter profile:

- Sandboxed iframe.
- No access to API keys or vault state.
- No parent storage writes unless explicitly bridged.
- Fixed dimensions and mobile fallback.
- Clear topic objective, for example puzzle, energy balance, adaptation planning, or resource tradeoff.
- Export as `story/game/index.html` with a plain `story/game/manifest.json`.

This lets users post playful or interactive material without weakening the main evidence workflow.

## SVG / Widget Bridge Contract

The bridge should be true JSON first, then rendered HTML/SVG. This allows topic.earth, `widgets.smdeltart.com`, and the private SVG editor to exchange intent without copying unsafe raw markup between apps.

Recommended bridge shape:

```json
{
  "bridge": true,
  "bridgeVersion": "topic-story-1",
  "origin": "topic.earth",
  "target": "smart-svg-editor",
  "sourceTopicId": "topic-123",
  "style": "educational-scene",
  "preset": "kid-9-12",
  "locationContext": {
    "source": "settings",
    "label": "Regional default"
  },
  "scene": {
    "title": "Why a rain garden helps after storms",
    "objective": "Explain runoff and soil absorption",
    "character": {
      "type": "robot",
      "expression": "curious",
      "focus": "eye-contact",
      "movement": "point-and-wave"
    },
    "timeline": [
      {
        "time": 0,
        "action": "speak",
        "text": "Rain gardens slow water and help soil drink."
      }
    ],
    "svg": {
      "mode": "inline-svg",
      "expressions": ["curious", "happy", "thinking"],
      "rasterParts": [
        {
          "role": "face-texture",
          "source": "embedded-data-uri",
          "animatedBy": "svg-bone"
        }
      ]
    }
  },
  "limits": {
    "allowScripts": false,
    "maxDurationSeconds": 45,
    "maxTokens": 1200
  }
}
```

Default generation should start from a simple preset, then let advanced users open it in the SVG editor. SVG remains a strong base because it can animate expressions, cursor/eye focus, bones, labels, and layered raster pieces while staying inspectable. If AI raster parts are needed, embed or package them as assets inside the SVG/story folder and animate them with SVG transforms rather than making the whole scene a flat video.

## Regenerative Visions Layer

`Imagine` is understandable, but it may sound too detached from evidence. A better layer name for this app is:

- **Regenerative Visions**

Other possible names:

- **Future Commons**
- **Better Futures**
- **Living Futures**
- **Adaptation Ideas**

Recommended meaning: user-submitted proposals for a better sustainable world, still anchored to a real topic, location, source, or known constraint.

Rules of the layer:

- Must connect to at least one existing topic, place, source, or regional context.
- Can be imagined, but must state what is assumed versus known.
- Should include expected benefits, risks, maintenance needs, and who could act.
- Should be local-first when possible, then reusable globally as patterns.

This makes creative work feel welcome without turning the dashboard into unconstrained fiction.

## Regional Gardening Layer

This should probably live under Regional first. It fits topic.earth especially well because gardening connects climate adaptation, food, water, biodiversity, soil, and community action.

Candidate layer name:

- **Regional Gardening**

Possible topic types:

- Pollinator corridor
- Urban shade planting
- Food garden
- Rain garden
- Compost loop
- School garden
- Soil restoration
- Community orchard
- Native hedge
- Heat island cooling route

The croquis/annotated SVG style is a strong match here. Users can sketch a plan, then AI can convert it into a clean annotated panel with labels, simple symbols, and source-linked recommendations.

Meteo should be part of this layer. The app can use the selected regional location plus live or forecast weather to suggest timing windows for planting, harvest, watering, mulching, seed starting, and frost/heat risk. Phrase these as guidance, not agricultural certainty.

Useful meteo fields:

- Recent and forecast temperature.
- Rainfall and dry days.
- Frost risk.
- Heatwave risk.
- Wind exposure.
- Soil moisture proxy where available.

Example outputs:

- "Best planting window: from March 18 to April 2 if no frost alert appears."
- "Harvest likely: from late June to mid-July, adjust for rain and heat."
- "Delay transplanting during a heat spike; water early morning."

This makes Regional Gardening practical rather than only illustrative.

## Educational Animator Profile

There is a real opportunity here, but it should be scoped carefully. The existing private `smart-svg-editor.html` already appears to contain many pieces that topic.earth should not rebuild from scratch: SVG metadata tools, an AI generation wizard, animation presets, a timeline section, TTS actions, expression presets, and skeleton presets for human, robot, dog, cat, bird, fish, and more.

The best move is to create an **Educational Animator** profile for topic story cards. It would generate a constrained learning scene that can be opened or refined in the SVG editor, then embedded back into the topic ZIP/story card.

Good use cases:

- Explain a climate topic to a child.
- Explain the same topic to an adult beginner.
- Build a short exercise after the explanation.
- Use a simple guide character, such as human, robot, or animal, to speak, point, and react.
- Export a transparent animated SVG or HTML card.
- Start from a default preset, then bridge to the SVG editor when deeper expression, movement, or timeline editing is needed.

Suggested profiles:

- `kid-6-8`: simple words, one idea per scene, friendly guide, no scary framing.
- `kid-9-12`: cause/effect, small quiz, local action.
- `teen`: systems thinking, tradeoffs, evidence links.
- `adult-simple`: clear vulgarization, no childish tone.
- `adult-deep`: source-linked explanation with optional technical sidebar.

Guardrails:

- The user or parent chooses the age level.
- AI must state the learning objective and vocabulary level.
- No open-ended persuasive manipulation toward children.
- Climate risk should be honest but not frightening for young children.
- Keep generated exercises short and reviewable.
- Use fixed token/cost limits and show the estimated AI usage before generation.

Recommended first implementation:

- Add `Educational` as one style inside Topic Story, not a new app mode.
- Generate structured lesson data first.
- Render with one safe template.
- Add an "Open in SVG Editor" or "Export for SVG Editor" bridge using the JSON contract above.

This is not too much if it starts as one constrained story-card style. It becomes too much only if topic.earth tries to own the full animation editor inside the main dashboard.

## UI Placement

For the topic composer:

- Add a `Story` or `Live Card` tab after media/evidence.
- Show buttons: `Paste HTML`, `AI Create`, `Preview`, `Add to ZIP`.
- Add a style selector: `Croquis`, `Illustrated`, `Comic`, `Infographic`, `Presentation`, `Educational`.
- Add an advanced attachment selector: `Story`, `SVG Scene`, `Micro-game`, `External Widget`.
- Pre-fill place from Settings and Regional context when available.
- Keep the preview in a constrained iframe with reset/clear controls.

For Regional:

- Add `Regional Gardening` as a layer or sublayer.
- Reuse existing path/point tools for garden corridors and site plans.
- Let a topic store map geometry plus a story card.
- Add meteo-aware timing suggestions for seed, plant, water, harvest, and protect actions.

For exports:

- Include the story card in admin review packages.
- Include a plain fallback summary for review tools that do not render HTML.
- Include bridge JSON and manifests next to generated HTML so future tools can re-open and modify the attachment.

## Safety And Quality

The core risk is letting generated HTML become a security or quality problem. Keep these boundaries:

- Sandbox iframe previews.
- No JavaScript for user story cards in the first version.
- Sanitize pasted HTML.
- Store generated story content as a structured topic attachment, not only raw HTML.
- Always keep evidence links separate from imaginative claims.
- Label generated visuals as drafts until reviewed.
- For child-facing content, require an age profile, learning objective, and adult review state.
- For meteo/gardening guidance, include uncertainty and avoid medical, legal, or professional farming claims.
- For games and widgets, keep them separated from API settings, vault, storage sync, and admin state unless a reviewed bridge permission explicitly allows one action.

## Best First Build

Implement the first version as:

- `Topic Story` attachment model.
- Sanitized iframe preview.
- AI structured story generator.
- HTML renderer with 3 templates: croquis, illustrated brief, comic strip.
- One educational template using the SVG editor's timeline/export concepts with the JSON bridge contract.
- One `micro-game` profile with strict iframe and manifest support.
- ZIP export support.

Then add `Regenerative Visions` and `Regional Gardening` once the attachment flow is stable.
