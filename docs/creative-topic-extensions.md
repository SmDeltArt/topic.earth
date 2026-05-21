# Creative Topic Extensions

This note collects candidate features that let topic.earth move from observing Earth signals toward explaining, imagining, and proposing practical futures. The goal is to add creative output without weakening the evidence-first character of the app.

## Recommendation

Build this in three layers, in this order:

1. **Topic story embed**: let a topic draft include one generated or pasted HTML/SVG story card that previews in a sandboxed frame and exports with the topic ZIP.
2. **Regenerative Visions layer**: add a fourth creative proposal lane inside the existing mode structure, focused on plausible sustainable futures tied to a real topic, place, or evidence set.
3. **Regional Gardening layer**: add a practical local layer for gardens, food resilience, biodiversity corridors, compost loops, water capture, and annotated croquis.

This keeps the first step small and useful, then gives user imagination a clearly bounded home.

## Topic Story Embed

The strongest first move is a topic-level HTML/SVG attachment, not a full new publishing system.

Users could:

- Paste custom HTML into a sandboxed preview frame.
- Ask linked AI to create HTML from the current topic.
- Choose a visual style such as croquis, illustrated, comic, field note, infographic, or presentation panel.
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

## UI Placement

For the topic composer:

- Add a `Story` or `Live Card` tab after media/evidence.
- Show buttons: `Paste HTML`, `AI Create`, `Preview`, `Add to ZIP`.
- Add a style selector: `Croquis`, `Illustrated`, `Comic`, `Infographic`, `Presentation`.
- Keep the preview in a constrained iframe with reset/clear controls.

For Regional:

- Add `Regional Gardening` as a layer or sublayer.
- Reuse existing path/point tools for garden corridors and site plans.
- Let a topic store map geometry plus a story card.

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

## Best First Build

Implement the first version as:

- `Topic Story` attachment model.
- Sanitized iframe preview.
- AI structured story generator.
- HTML renderer with 3 templates: croquis, illustrated brief, comic strip.
- ZIP export support.

Then add `Regenerative Visions` and `Regional Gardening` once the attachment flow is stable.

