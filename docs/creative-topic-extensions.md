# Creative Topic Extensions

This note collects candidate features that let topic.earth move from observing Earth signals toward explaining, imagining, and proposing practical futures. The goal is to add creative output without weakening the evidence-first character of the app.

## Recommendation

Build this in four layers, in this order:

1. **Topic story embed**: let a topic draft include one generated or pasted HTML/SVG story card that previews in a sandboxed frame and exports with the topic ZIP.
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
- Add an "Open in SVG Editor" or "Export for SVG Editor" bridge later.

This is not too much if it starts as one constrained story-card style. It becomes too much only if topic.earth tries to own the full animation editor inside the main dashboard.

## UI Placement

For the topic composer:

- Add a `Story` or `Live Card` tab after media/evidence.
- Show buttons: `Paste HTML`, `AI Create`, `Preview`, `Add to ZIP`.
- Add a style selector: `Croquis`, `Illustrated`, `Comic`, `Infographic`, `Presentation`, `Educational`.
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

## Best First Build

Implement the first version as:

- `Topic Story` attachment model.
- Sanitized iframe preview.
- AI structured story generator.
- HTML renderer with 3 templates: croquis, illustrated brief, comic strip.
- One educational template using the SVG editor's timeline/export concepts as a future bridge.
- ZIP export support.

Then add `Regenerative Visions` and `Regional Gardening` once the attachment flow is stable.
