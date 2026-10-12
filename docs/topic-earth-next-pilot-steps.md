# topic.earth — Next pilot steps

Prepared: 12 October 2026  
Source: *topic-earth-audit-commune-pilot.pdf*, 9 October 2026, especially pages 5–9.

> This is a summary of the PDF, not a new technical audit. Its findings must be rechecked before implementation. The tasks below are proposed and remain unchecked.

## Goal

Prepare a clear, trustworthy platform for citizen initiatives in one Belgian commune. Help neighbours discover projects, offer manageable contributions, meet and document results. Keep AI optional and use the global climate views as educational context.

Anthisnes is the candidate pilot commune. The audit did not confirm a municipal agreement, organiser, venue or active project.

## 1. Make the application reliable — days 1–14

- [ ] Repair API Settings scripts, stylesheet and branding dependencies that returned 500 or 404.
- [ ] Align API routes and origin configuration with the chosen operating mode; repair `/mcp` before promoting that integration.
- [ ] Resolve the translation/narration check and verify the intended Fever behaviour.
- [ ] Make the Regional list and 2D map work without WebGL or AI.
- [ ] Verify the intended offline experience; the existing cache only covers part of the app.
- [ ] Test local Ollama on Ben’s computer using an installed model and `http://localhost:11434`. Disable external AI fallbacks for local-only processing.
- [ ] Review recording coverage and keep the app/audio manifests consistent.

**Ready when:** the Regional experience works, evidence labels are honest, and the local AI flow has been tested on the intended computer.

## 2. Simplify the Regional experience

Use five understandable sections:

| Section | Visitor’s purpose |
|---|---|
| Commune overview | Find nearby initiatives, meetings and help requested |
| Initiatives | Browse by theme in a list or on the map |
| I can help | Offer time, skills, tools, land, transport or hosting |
| Learn & replicate | Find reviewed methods and educational material |
| Community & transparency | Understand ambassadors, decisions, funding and corrections |

Keep **place**, **initiative theme** and **participation roles** separate. Weather, terrain and cycle routes are contextual overlays. World and Fever explain the wider context; Space is optional for the pilot.

## 3. Prepare the commune launch — days 15–30

- [ ] Confirm the commune, a coordinator and local contacts willing to participate.
- [ ] Hold an accessible introductory meeting with residents.
- [ ] Prepare three clearly labelled proposals:
  - Shared garden and compost group.
  - Tool-sharing and repair group.
  - Shared journeys or carpooling.
- [ ] Agree permissions, ownership, maintenance, costs and fair sharing of benefits.
- [ ] Let people choose flexible contributions according to their time and abilities.
- [ ] Publish a short charter and an actual submission channel.

Collective solar, batteries, thermal storage and geothermal projects should begin as learning or feasibility proposals with competent partners.

**Ready when:** three proposals, a real coordinator, a meeting and a functioning submission route exist. Do not imply municipal endorsement without agreement.

## 4. Give each initiative a clear record

Include its locality, need, proposed action, organiser, contributions requested, accessibility, resources, costs, evidence, review date and next step.

Use explicit activity statuses: **idea → seeking help → pilot → active**, with **paused**, **completed** and **withdrawn** available. Keep activity status separate from evidence verification.

Publication workflow:

**Local draft → submitted package → triage → evidence and consent review → published proposal → updates → outcome review.**

Start with the existing export/import package workflow and a designated recipient. A browser-local draft is not automatically received by an ambassador; never label it “submitted” until transfer succeeds.

## 5. Establish trust and nonprofit stewardship

- [ ] Begin with one local ambassador, an alternate and independent reviewers.
- [ ] Define mandates, fixed terms, conflict disclosures, recusal and an appeal/removal process.
- [ ] Separate organising, moderation, technical administration and financial approval.
- [ ] Require independent review of a person’s own project or financial interests.
- [ ] Publish appropriate decision records and funding summaries while protecting participant information.
- [ ] Ensure donations do not purchase rankings, votes or verified labels.
- [ ] Confirm legal incorporation before presenting ASBL status as established.
- [ ] Keep topic.earth accounts, finances and communications distinct from CAD-AI-Support SPRL and personal SmDeltArt activities.

Add regional coordination after several communes are active. Country, continental and world representation should follow an actual participating network.

## 6. Run, measure and share — days 31–90

**Days 31–60:** run one small activity in each selected theme. Record participation, resources, time, costs, outcomes and feedback. Correct errors publicly.

**Days 61–90:** decide what should continue and share a reusable initiative package with one or two neighbouring communes, provided local capacity exists.

Measure completed activities, repeat participation, tool loans/repairs, garden outputs and accessible ways to help. Report carbon or water benefits only with a stated method and baseline.

## Content cleanup before promotion

Classify existing content as **KEEP / VERIFY / TEMPLATE / REMOVE**. Preserve runtime dependencies, fallback assets, licensing records and reviewed educational content. Label hypothetical examples clearly.

Do not delete all of `data/points.js`: it also contains tipping-boundary data and a sourced Thwaites topic. Check references and manifests before removing assets; retain a Git rollback point without adding another internal archive.

## First demonstration target

Show a working Regional view, one clearly labelled local proposal, a contribution option and the real submission/review process. Connect the coding, Inkscape and Blender tutorials to this practical purpose. Participation must remain possible without coding knowledge or AI.
