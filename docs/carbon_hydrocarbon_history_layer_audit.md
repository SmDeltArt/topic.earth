# Carbon And Hydrocarbon History Layer Audit

Date: 2026-05-15

Status: product/audit note after reviewing `FLOW.md`, `main_mode_3d_layers.md`, `regional_sustainability_hub.md`, and `topic_pathway_state_restore.md`.

## Question

Could topic.earth support a sensitive historical layer that retraces human carbon, fossil-fuel, hydrocarbon, and pollution history from topic chronology?

Short answer: yes, but it should be treated as a sourced historical chronology, not as a blame layer.

## Fit With Existing Docs

`FLOW.md` already points to topic chronology, transparent evidence, and human review before save/export. This layer should follow that model: every entry is a topic or topic-derived timeline event with visible dates, sources, and review status.

`main_mode_3d_layers.md` already describes markers, paths, heatmaps, surface rasters, and time-aware global systems. This layer fits best as:

- sparse milestone markers at first;
- timeline playback second;
- optional heatmap or surface-raster views only after the source model is stable.

`regional_sustainability_hub.md` keeps Regional focused on local action. This history layer should not dominate Regional by default. Regional can show local historical sites, industrial corridors, refinery/port contexts, remediation projects, and community health topics only when the user chooses that layer.

`topic_pathway_state_restore.md` gives the right privacy principle: save intentional topic context, not hidden user movement. The same rule applies here: chronology should preserve public historical evidence, not infer private behavior or target people.

## Recommended Layer Name

Use a neutral label:

```text
Carbon History
```

Possible sublabels:

- Fossil Carbon
- Hydrocarbons
- Industrial Emissions
- Petrochemicals
- Pollution And Remediation
- Policy And Accountability

Avoid making the first visible label accusatory. The content can still be honest and rigorous.

## Data Model Additions

Add optional fields to topics:

```js
carbonHistory: {
  role: 'extraction|combustion|transport|industry|petrochemical|pollution|policy|science|remediation|community-impact',
  chronologyType: 'milestone|site|dataset|event|policy|study',
  periodStart: ',
  periodEnd: '',
  confidence: 'high|medium|low',
  sensitivity: 'normal|sensitive|disputed',
  framingNote: '',
  sourcesRequired: true
}
```

Existing fields still matter:

- `date` for timeline ordering;
- `country`, `region`, `lat`, `lon` for map placement;
- `summary` for short public explanation;
- `insight` for carefully separated interpretation;
- `researchSources` / future `sources` for provenance.

## Chronology Rules

The layer should separate:

- measured data, such as atmospheric CO2, methane, production, extraction, spills, or emissions inventories;
- historical events, such as oil discoveries, pipeline openings, laws, accidents, treaties, and scientific publications;
- interpretation, such as responsibility, impacts, delayed policy, or contested claims.

A topic can appear on the timeline only if it has:

- a date or date range;
- at least one source;
- a clear category;
- a review state when the topic is sensitive or disputed.

## Sensitive Topic Treatment

This layer can become politically, economically, legally, and culturally sensitive. Handle it with these rules:

- prefer primary or high-quality secondary sources;
- distinguish company, state, sector, and consumer-system roles;
- avoid implying individual guilt from location alone;
- label uncertainty and contested evidence;
- include remediation, regulation, community action, and scientific discovery, not only damage;
- avoid sensational wording in titles;
- keep summaries factual and source-bound;
- make AI suggestions review-only, never auto-published.

## First Useful Version

Phase 1 should be a calm chronology layer:

```text
Carbon History
  -> timeline slider
  -> topic markers by date
  -> filters for extraction, combustion, pollution, policy, science, remediation
  -> detail panel shows sources and confidence
```

No heatmap yet. No automated blame scoring. No hidden inference.

## Later Versions

Phase 2:

- add topic-derived arcs for trade routes, shipping lanes, pipelines, and energy corridors;
- add country/region aggregation views;
- allow comparison between historical milestones and climate/scenario milestones.

Phase 3:

- add raster/heatmap overlays from reviewed datasets;
- add source-level uncertainty controls;
- add educational narratives that can be turned on/off by the user.

## Editorial Voice

Use language like:

```text
This topic documents a dated event in the industrial carbon record.
```

Avoid language like:

```text
This place caused climate change.
```

The layer should make history traceable, not reduce it to accusation.

## Decision

Build it only as a reviewed, source-led chronology. It is a strong fit for topic.earth if the app keeps the layer transparent, neutral in UI labels, explicit about uncertainty, and careful about the difference between evidence and interpretation.
