# AGENTS.local.md — CAD-DELTAI API (api/)

**Product:** `cad-ai-support`
**Canonical profile:** `_A_Agents-Global/agents/projects/cad-ai-support.md`
**Registry:** `_A_Agents-Global/registry/projects.registry.json`

This is a **pointer** file. Edit the canonical profile instead.

## Scope of this folder

`__actual_vs/private/api/` is the **CAD-DELTAI API product home**:
api-settings widget, llama31 install guide, src/, docs/, brand/.
Public surface: `api.caddeltai.com`.

## Critical rules

- Do not change encryption format or localStorage keys
  (`cadAiApiSettings`, `smdeltartApiSettings`).
- Sibling files (`llama31-install-guide.html`, `src/*.js`) move _with_
  this folder — keep their links relative.
- Cross-references from outside `api/` must use absolute `/api/...`.
- Any new entry or route → update `manifest.json` _and_
  `_A_Agents-Global/registry/projects.registry.json`.
- Treat `cad-ai-support` and the existing storage keys as compatibility
  identifiers; do not rename them during visible-brand cleanup.
- Keep paid provider routes under `api/` and require server-side proxy
  authorization. Hidden frontend controls and `dev=1` never grant access.

## First reads for any agent

1. `_A_Agents-Global/AGENTS.md`
2. `_A_Agents-Global/agents/projects/cad-ai-support.md`
3. `manifest.json` (this folder)
