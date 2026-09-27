# AI for learning and local action

## A topic.earth presentation note

topic.earth uses the globe, Fever Loop and local initiatives to help people understand environmental change and act where they live. AI can support that learning: explain a concept in plain language, translate a draft, suggest questions to investigate, or help organize a proposal. It does not decide whether a scientific claim is true or whether a commune should adopt an initiative.

The educational content should remain accessible without an account, an AI subscription or an API key. AI is an optional assistant that people can choose with a clear understanding of privacy and cost.

## Start locally, then share what works

An inhabitant can explore a global issue, look at its regional context, and propose a practical action in a commune. Other people can improve the proposal with sources and local experience. Ideas that work locally may inspire a region, a country or a wider community. Elected representatives and public services keep their responsibilities; citizens can bring them better prepared initiatives.

For active participation we propose a starting age of 16, with specific safeguards for 16- and 17-year-olds. Younger visitors can still read the educational material. The separate [participation notes](README.md) explain local Ambassadors, moderation and the distinction between a verified inhabitant and an official municipal representative.

## Four ways to learn with AI

| Choice | What it means | Who pays or operates it |
| --- | --- | --- |
| Browser tools | Use built-in reading or speech features where available. | The visitor's device and browser. |
| Local Ollama | Run a downloaded AI model on one's own computer for experiments, explanations and private drafts. | The visitor supplies the computer, electricity and model storage. |
| Personal BYOK | Use a personal, restricted key with a chosen cloud AI provider. | The visitor pays that provider under their own account. |
| BYORG or ASBL assistance | An approved organization or topic.earth funds specific tasks under a controlled policy. | **Proposed future modes:** separate organizational or ASBL budgets. |

**BYORG** here means *bring your own organization*: for example, a school or association chooses to fund approved members' AI use. It is a planning term, not a feature already deployed. An organization's master provider key must stay on its server, outside the visitor's browser. The topic.earth ASBL and CAD-DELTAI professional product remain financially and legally separate even when they reuse an API Settings component.

## Why local Ollama matters

Ollama lets a learner compare prompts and model answers without a paid cloud API key. It can be useful for a classroom experiment or an early draft. Using a model does not automatically train it: learning happens when people question the response, check evidence, and improve their own reasoning.

“Local” is a real condition. The model must run on the visitor's device, and the app must avoid sending the same prompt to an external fallback when Ollama cannot answer. A model on somebody else's server is a remote service, even if it uses Ollama software. topic.earth should make that distinction visible before people enter sensitive information.

## Human responsibility and public trust

- AI-generated explanations can contain errors. A public environmental claim needs traceable sources and human review.
- Exact home addresses, identity documents and young people's private details should not be sent to a model just to explain a general topic.
- Moderators and local participants remain accountable for what appears in public. An AI response is never an official commune position.
- Any funded AI route needs a visible provider choice, a defined budget and the ability to stop spending.

## What exists and what is planned

topic.earth already contains an AI bridge and opens the CAD-DELTAI API Settings interface. Its local copy offers an Ollama quick start. The separately maintained central API Settings product contains fuller Ollama, BYOK and proxy controls. We have not verified that the centrally deployed iframe already includes the newer portable quick start. Personal Ollama and BYOK options therefore need a live end-to-end check before being presented as ready for all visitors.

Public BYORG accounts and an ASBL-funded, per-user AI proxy are **proposals**, not current login or billing capabilities. The [API Settings and local Ollama implementation note](ai-api-settings-local-ollama.md) records the source difference and the controls needed before such modes can be offered.
