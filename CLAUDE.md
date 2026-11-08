# Scripture Universe — instructions for Claude Code

A 3D Bible app showing how the Old Testament points to Jesus in the New Testament. Live at https://scripture-universe.vercel.app. Vercel deploys `main` automatically; every PR gets a preview link.

## Read first
- Sections C (redesign: real app UI, simple for elders, design approved by Richard before code) and D (keep and label every connection) of the brief are top priority. Section A is done.
- `docs/NEXT_LEVEL_BRIEF.md` — the current spec and build order (all-ages modes, Evidence Centre, map, word study, search, JARVIS, offline/stores). Section 0 rules apply to every PR.
- `docs/RESOURCE_AUDIT.md` — which outside data sources may be used (Tier 1 only without asking).
- `docs/DATA.md`, `docs/EVIDENCE_CENTRE.md`, `docs/JARVIS.md` — data pipeline, evidence rules, JARVIS design.

## Commands
- `npm run dev` — local dev server
- `npm run build` — packs + typecheck + production build
- `npm test` — unit tests (vitest)
- `npm run test:e2e` — Playwright, including the v16 screen comparisons
- `npm run validate` — data pack and evidence validation
- `npm run test:db` — Postgres schema check

## Non-negotiable rules
1. Update the current app; never rewrite or remove working features. All existing tests must keep passing.
2. One feature per PR, small and green. Turn on auto-merge. Plain-English PR description with phone and desktop screenshots and the preview link.
3. Before asking for a merge, open the Vercel preview and check the wheel, every tab, the reader, Credits and any new screen at 360 px and desktop, with zero console errors.
4. After every merge, confirm the production deploy is READY and working; if not, roll back in Vercel first, then fix.
5. Data: pinned with checksum, licence recorded, credited on the Credits screen. No invented quotes, numbers, sources or testimonies.
6. Secrets only in Vercel environment variables (`ANTHROPIC_API_KEY` for `/api/jarvis`). Never in code, repo, logs or the browser.
7. Ask Richard before anything paid, deleting data, or using a source outside Tier 1.
8. Report to Richard in plain English: what changed, the live link, what he needs to click or decide.
9. Safety net (Section S of the brief): the wheel, threads and current screens stay live and untouched until a replacement is proven; `src/legacy/*`, the three.js scene and `pipeline/*` are read-only for UI work; never merge `proto/redesign` as it stands; `tests/e2e/wheel-safety.spec.ts` must pass on every PR; restore point is production commit `8e54aac`.

## Skills to use (Richard's account has these plugins; use them when the task fits)
- Plan and ship: `agent-engineering:plan-change`, `deliver-change`, `review-change`, `verify-change`; `zizi-skills:git-sync`; `zizi-skills:planning`.
- Anything users see: `ui-consistency` (finding-patterns → planning → implementing → verifying), `ui-consistency:accessibility`, `design-skills:accessibility-audit`, `design:accessibility-review`, `zizi-skills:frontend`, `zizi-skills:design-guide`, `design-skills:design-critique`, `modern-web-guidance`.
- Words for kids and elders: `zizi-skills:plain-language`, `design-skills:ux-writing`, `design:ux-copy`. Telugu UI: `zizi-skills:i18n`.
- Tests and review: `mattpocock-skills:tdd`, `agentic-council:craftsman-e2e-testing`, `mattpocock-skills:code-review`, `engineering:code-review`, `zizi-skills:debugging-and-error-recovery`.
- Speed: `agentic-council:tuner-performance-audit`.
- Data and back end: `zizi-skills:source-driven-development`, `zizi-skills:database-optimization`, `zizi-skills:security-and-hardening`, `agentic-council:skeptic-threat-model`.
- JARVIS: `agentic-council:oracle-rag-architecture`, `agentic-council:oracle-prompt-engineering`, `agentic-council:oracle-ai-evaluation`.
- Stores and web: `zizi-skills:app-store`, `agentic-council:pathfinder-platform-audit`, `searchfit-seo:technical-seo`, `searchfit-seo:schema-markup`, `aeotester:audit`.
- Also available and useful here:
  - `superpowers:writing-plans`, `superpowers:test-driven-development`, `superpowers:systematic-debugging`, `superpowers:verification-before-completion`
  - `backend-design:design`, `backend-design:security-discipline` and the `backend-design:security-reviewer` agent for `/api/jarvis`
  - the `fairmind-design` accessibility agents (WCAG, contrast, keyboard, screen reader) for the Easy and Kids modes
  - `ux-ui-audit:ux-ui-audit`
  - `geoai:cartography-geoviz` for the map
  - `huggingface-skills:huggingface-datasets` for the BibleNLP datasets
  - `writing-quality:claim-boundary-checker` for every evidence text
  - `claude-security:claude-security` before store submission
  - `ci-optimizer:ci-check`
- Big decisions: `agentic-council:brainstorm` (quick) or `agentic-council:council` (full).
Say in each PR which skills you used. If a skill is missing in your session, carry on without it and say so.

## Connectors
Use the Vercel connector for deploy status, build logs and environment variables (project `scripture-universe`). Use Supabase, Figma and Hugging Face only when a task needs them, and ask before creating anything paid. `.mcp.json` lists them for terminal sessions.
