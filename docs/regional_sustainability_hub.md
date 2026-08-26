# Regional Sustainability Hub

## Intent

Regional should orient the user toward nearby sustainability action, not only nearby map points.

The mode should answer:
- What is happening near me?
- Which local initiatives can I join, learn from, support, or replicate?
- Which topic threads matter at my current location scope?
- How can this become a community exchange space later?

## Product Direction

Regional should be treated as a local sustainability hub with three layers of value:

1. Context
   - IP location or browser geolocation sets the default focus.
   - OpenMap search and topic focus update the same Regional context.
   - The selected precision (`Continental`, `Country`, `Regional`, `City`, `Precise address`) controls the default map scale.

2. Discovery
   - Weather and live context remain useful, but they should not dominate the mode.
   - Nearby sustainable initiatives should be surfaced first.
   - The left panel should feel like a local action feed, not a generic taxonomy.

3. Participation
   - Topic detail should later support comments, local updates, meetups, and peer exchange.
   - Registered users should be able to post at topic level, not only globally.
   - Moderation and admin/user roles should stay explicit.

## Recommended Information Architecture

Current direction:

- `Meteo`
- `Clouds`
- `Live Meteo`
- `Regional News`
- `Community Projects`
- `Bike Ways`
- `EV Charging`
- `Hydrogen H2`

Rationale:
- Regional stays flat for now because nested sublayer UX is brittle in the current panel.
- Each Regional layer should keep its own normal topic expand/collapse behavior.
- `Community Projects` is the first clear home for initiatives that users may one day discuss or join.

## Topic Data Model

Regional topics should gradually standardize around these optional fields:

- `regionalScope`
  - `continent`, `country`, `region`, `city`, `address`
- `initiativeType`
  - examples: `Mobility`, `Energy`, `Circularity`, `Urban Nature`, `Resilience`
- `engagementTypes`
  - examples: `join`, `volunteer`, `learn`, `invest`, `replicate`, `monitor`
- `communityStatus`
  - examples: `open`, `active`, `pilot`, `planned`

These fields let the UI say more than "here is a point".
They support ranking, filtering, AI summarization, and future community actions.

## Location and Ranking Rules

Regional should rank local-action items by:

1. current Regional context distance
2. matching precision scope
3. freshness
4. actionability

Examples:
- If the user is focused on Brussels at city precision, Brussels and nearby Flanders initiatives should outrank country-level Europe items.
- If the user searches a precise address, city and neighborhood-scale topics should move to the top.
- If the current context is broad, regional and country-level initiative summaries are acceptable.

## AI Role

AI should help Regional feel useful, but not vague.

Suggested AI jobs:
- summarize why a nearby initiative matters locally
- cluster similar nearby efforts into one digest
- suggest related topics the user may care about next
- later: transform comments/posts into concise thread summaries

Suggested AI jobs to avoid for now:
- inventing local initiatives
- over-confident geolocation claims beyond the known precision
- auto-posting on behalf of users

## Community Roadmap

### Phase 1: discoverable local action
- improve topic metadata and ranking
- show distance and initiative tags in the left panel
- keep map focus, search, and auto-location synchronized

### Phase 2: topic-level participation
- add registered-user identity
- add per-topic comments and lightweight replies
- add admin moderation tools
- add local event/update posts attached to topics

### Phase 3: real exchange layer
- follow topics by place and initiative type
- notify users about nearby updates
- let users propose new local initiatives for review
- add AI summaries over topic discussions

## Recode Guidance

If Regional is recoded more deeply later, the safe architecture is:

- keep `RegionalMap` focused on map state and location context
- move local-action ranking logic into a small Regional service/module
- keep topic/community state separate from raw map rendering
- treat topic discussion as a future data domain, not as ad hoc fields in map code

That way Regional can evolve from a map mode into a local sustainability network without rewriting everything again.