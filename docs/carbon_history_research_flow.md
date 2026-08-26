# Carbon History Research Flow

Date: 2026-05-15

Status: implemented as a starter Main-mode `Carbon History` layer with reviewed seed topics.

## Product Frame

Use `Carbon History` as the public label. Keep `h2o_history` only as a temporary internal nickname if needed.

This layer should live in Main mode as a study layer, separate from Fever. Fever is a scenario/simulation loop. Carbon History is an evidence chronology loop:

```text
context before 1859
  -> 1859-08-27 petroleum-age anchor
  -> science understanding
  -> industrial expansion
  -> pollution and impacts
  -> policy and accountability
  -> today
```

The timeline should be open-ended through the current year, but entries should be reviewed before becoming part of the public layer.

## Two Loops

### Fever Loop

Purpose:

- climate scenario experience;
- milestone years;
- future-oriented risk and simulation;
- emotional/educational climate monitoring.

### Carbon History Loop

Purpose:

- historical record;
- source-led chronology;
- past-to-present understanding;
- why topics exist and how knowledge, industry, impacts, and policy evolved.

The two loops can connect later, but they should not share state. Carbon History can explain how we arrived at Fever conditions; Fever shows possible climate trajectories.

## Main Mode Placement

Main mode is the better home because it is the study/exploration globe.

Recommended behavior:

- add a `Carbon History` layer in Main;
- show a time slider from `1859-08-27` to today;
- allow earlier context entries behind an `Earlier context` toggle;
- show sparse markers first, not a heatmap;
- open topic detail cards with sources, confidence, and sensitivity labels.

Regional mode can later inherit local Carbon History entries, but only when the user enables that layer.

## Research Tracks

Every event should belong to one primary track.

| Track | Purpose | Example entries |
| --- | --- | --- |
| Fossil Carbon System | extraction, refining, transport, combustion | Drake Well, coal/oil/gas production, pipelines, shipping |
| Science Understanding | greenhouse science, measurements, attribution | Fourier/Tyndall/Arrhenius, Callendar, Keeling Curve, IPCC |
| Pollution And Impacts | spills, air pollution, petrochemicals, health/ecology | refinery pollution, oil spills, plastic/petrochemical sites |
| Policy And Accountability | treaties, regulation, disclosures, litigation | UNFCCC, Kyoto, Paris, company documents, court cases |
| Remediation And Transition | clean-up, repair, alternatives | remediation projects, phase-outs, renewable transitions |

## Research Intake Flow

```text
Question or candidate event
  -> classify track
  -> locate date or date range
  -> collect sources
  -> separate fact from interpretation
  -> assign confidence and sensitivity
  -> create topic/timeline draft
  -> human review
  -> publish to Carbon History layer
```

## Source Rules

Use this priority:

1. Primary source: agency, court, treaty, company document, dataset, original scientific paper.
2. Scholarly/history source: journal, university, historical institute.
3. High-quality investigative journalism: only when primary documents are linked or named.
4. Secondary summary: only for orientation, not final claims.

Do not publish a sensitive event with only a weak secondary source.

## Event Card Schema

```js
{
  id: 'carbon-history-drake-well-1859',
  layer: 'carbon-history',
  track: 'fossil-carbon-system',
  title: 'Drake Well strikes oil at Titusville',
  periodStart: '1859-08-27',
  periodEnd: '',
  lat: 41.626,
  lon: -79.673,
  summary: '',
  interpretation: '',
  confidence: 'high',
  sensitivity: 'normal',
  sources: [],
  review: {
    status: 'draft|reviewed|published|disputed',
    reviewerNote: ''
  }
}
```

## Starter Chronology Spine

This is not the full dataset. It is the first research scaffold.

### Earlier Context

- 1820s: Joseph Fourier helps frame the problem of planetary heat balance. Use as science context, not as the start of petroleum history. Good source family: American Institute of Physics climate-history timeline.
- 1859: John Tyndall studies heat absorption by gases, relevant to later greenhouse-gas science. NASA Earth Observatory has a usable historical profile.

### 1859 Petroleum Anchor

- 1859-08-27: Drake Well strikes oil in Titusville, Pennsylvania, a common anchor for the modern petroleum industry. The Drake Well Museum and Pennsylvania historical material are good source anchors.

### Science Understanding

- 1896: Svante Arrhenius publishes quantitative work on carbon dioxide and temperature. Use with an original-paper or AIP/NASA historical source.
- 1938: Guy Callendar revives the CO2 warming argument with observed temperature and CO2 data. Use science-history sources.
- 1958: Charles David Keeling begins precise atmospheric CO2 measurements that become the Keeling Curve. NASA and NOAA are strong sources.
- 1988: IPCC is established to provide regular scientific assessments for policymakers. Use IPCC history.

### Policy And Accountability

- 1992: UNFCCC opens for signature at the Rio Earth Summit.
- 1997: Kyoto Protocol is adopted.
- 2015: Paris Agreement is adopted.
- 1977-2003: Exxon/ExxonMobil climate projections and internal research can be treated as a sensitive accountability thread, using peer-reviewed and primary-document sources.
- 2013-present: Carbon Majors work traces producer-linked fossil fuel and cement emissions. Use the database/methodology carefully and distinguish producer attribution from full social responsibility.

## Sensitive Accountability Handling

For Exxon and similar topics:

- track them under `Policy And Accountability`, not as the whole layer;
- use source language like "documents and later studies report..." rather than overclaiming;
- keep company response/contested framing available when relevant;
- separate internal scientific knowledge, public statements, lobbying, production, and emissions attribution;
- label `sensitivity: sensitive` or `disputed` when claims involve intent, deception, liability, or legal matters.

## UI Flow

```text
Main -> Carbon History layer
  -> timeline slider
  -> track filters
  -> marker/topic selection
  -> detail panel:
       fact
       date
       track
       confidence
       sensitivity
       sources
       interpretation
       related topics
```

The first version should use markers and topic cards. Add heatmaps, arcs, and raster overlays later.

## User Contribution Flow

Let users propose events, but do not publish directly.

```text
Propose Carbon History event
  -> date/title/place/source required
  -> optional interpretation
  -> browser draft
  -> admin review
  -> published chronology entry
```

Required fields:

- title;
- date or date range;
- track;
- location or "global";
- at least one source URL or source note;
- sensitivity self-check.

## First Research Questions

Use these to build the first dataset:

1. What are the 20 strongest historical anchors between 1859 and today?
2. Which anchors are physical-system events, science-understanding events, pollution-impact events, and policy/accountability events?
3. Which entries have primary sources?
4. Which entries are sensitive or disputed?
5. Which entries should be global markers, and which should be regional/local topics?
6. Which entries should stay as contextual narrative rather than map markers?

## Initial Source Set

- Drake Well Museum site history: https://www.drakewell.org/about-us/site-history
- Pennsylvania Historical and Museum Commission Drake Well page: https://www.pa.gov/agencies/phmc/historic-sites-and-museums/pahistory2go/drake-well-museum
- NASA Earth Observatory on John Tyndall: https://earthobservatory.nasa.gov/features/Tyndall/index.php
- American Institute of Physics climate history: https://history.aip.org/climate/index.htm
- NASA Earth Observatory Keeling Curve: https://www.earthobservatory.nasa.gov/images/5620/the-keeling-curve
- NOAA Global Monitoring Laboratory CO2 trends: https://gml.noaa.gov/ccgg/trends/data.html
- IPCC history: https://www.ipcc.ch/about/history/
- UNFCCC Convention history: https://unfccc.int/ru/node/16644
- UNFCCC Paris Agreement: https://unfccc.int/process-and-meetings/the-paris-agreement
- Carbon Majors / Climate Accountability Institute: https://climateaccountability.org/carbon-majors/
- Carbon Majors FAQ: https://carbonmajors.org/EN/FAQ?lang=EN
- U.S. House Oversight fossil-fuel disinformation investigation page: https://oversightdemocrats.house.gov/news/press-releases/new-joint-bicameral-staff-report-reveals-big-oils-campaign-climate-denial
- Inside Climate News Exxon document series: https://insideclimatenews.org/project/exxon-the-road-not-taken/

## Decision

Proceed as a Main-mode `Carbon History` study layer with a separate chronology loop. Keep public publishing reviewed, source-led, and careful. Let user proposals exist as drafts, not direct public layer entries.

## Implementation

Starter layer:

- `data/layers.js` defines the built-in `carbon-history` Main layer.
- `data/carbon-history-topics.js` contains the first reviewed chronology markers.
- Each topic carries `carbonHistory.track`, `periodStart`, `confidence`, `sensitivity`, `reviewStatus`, and visible `researchSources`.
- High-value visual entries can also carry `mediaTokens` with a direct image URL, source page, source name, and watermark text for detail-panel banners.
