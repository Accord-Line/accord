# Accord · 共识

**Keep intention and implementation in accord.**

Write clearly with AI, try the interactions, and keep every decision in one living product specification.

[Website](https://accord-line.github.io/) · [Open workspace](https://accord-line.github.io/accord/) · [中文](README.md) · [Apache-2.0](LICENSE)

A static, local-first Markdown PRD workspace. Write freely, ask your own model for a candidate, operate declarative previews, review and approve a revision, and export a Codex handoff. Four primary tabs: Document, Experience, Review, History. BYOK stays in the first content area; code, data and JSON protocols use corner icons.

The 2026-10-15 visual iteration adds a warm paper palette, locally hosted handwriting fonts, rounded SVG icons, a single edit/read view, change-focused review, on-demand connection settings and component properties, and transient rain/water feedback. Decorative motion can be paused and respects reduced-motion preferences. See [visual validation](docs/M5_VISUAL_VALIDATION.md) and [font provenance and licenses](public/fonts/README.md). This does not mark the full M5 lifecycle plan complete.

## Run and verify

Node 22.12+:

```sh
npm ci
npm run dev
npm run check
npx playwright install chromium firefox
npm run test:e2e
npm run build -- --base=/your-repository/
```

`dist/` is static. No application server, account, telemetry or official model proxy. The dev/preview servers only serve files. Already loaded pages work offline for manual editing, previews, approval and downloads; offline cold starts are not supported by a service worker.

## Core flow

Edit the Markdown body directly. Standard Chinese section headings can synchronize requirement indices on blur; arbitrary prose, tables and code remain intact. The full body is preserved, not reduced to fields. Read the optional in-app writing guide for supported headings. IndexedDB stores drafts independently of approved data. Approval is explicit and creates a new revision; rollback also creates a revision.

The Experience tab renders a finite whitelist of components and state actions. Change parameters, operate the preview and explicitly write them into a draft. Validation failure blocks later success actions. Component properties and bindings are editable; complete events/actions JSON is in the corner data tool. No imported or model-generated scripts run in the main page.

## BYOK and privacy

TokenDance is the first adapter, using [PKCE S256 authorization](https://tokendance.space/docs/api-key-oauth), a same-origin popup callback and direct code exchange. Popup/manual-code fallback is available. Temporary keys and the verifier exist only in page memory; reload or disconnect clears them. Keys never enter browser persistence, logs or exported packages. Keep credentials out of chat.

Select an actual model from the directory. The paid connection test sends only a short sentence, without your PRD. Before generation, inspect the exact context, destination and model, and confirm the fee. Confirmation is invalidated when context or settings change. Requests are non-streaming, use a configurable 180-second model timeout (15–600 seconds; directory 20 seconds and code exchange 30 seconds) and no automatic retries. HTTPS compatible endpoints require browser CORS; localhost HTTP is allowed for development.

As of 2026-10-15, actual unauthenticated Chromium/Firefox probes successfully read 106 directory models, a 401 invalid-key chat response and a 403 invalid-code exchange response. See `docs/BYOK_PUBLIC_PROBE.json`. **No valid-key generation, valid authorization, valid AI proposal or production-host CORS success has been verified.** Automated BYOK tests explicitly simulate responses.

Models return whitelisted proposals, never direct approval. Stale drafts, invalid references, unsupported operations and mismatched standard Markdown/requirement indices block acceptance. A valid candidate can be moved into an editable draft before manual review.

## Portability and delivery status

Full backups preserve drafts, proposals, undo and snapshots. Handoff ZIPs default to approved data only, including Markdown, JSON, experiences, changes, decisions, evidence, validation, AGENTS and CODEX_TASK. Optional drafts are clearly separate. Importing a handoff opens the approved version; import its optional `drafts/workspace.draft.json` separately to restore draft state.

The product schema remains 0.1.0. Proposal protocol v0.2 adds optional `updateDocument`; original v0.1 operations remain valid, with migration/regression tests. Existing M1 backups are accepted. Workspace and import limits are documented in `docs/WORKSPACE_FORMAT.md`.

`node scripts/verify-handoff.mjs` creates and round-trips a fixed-sample r2 handoff. Codex has read that actual artifact and inspected a read-only IntentKit checkout to produce an implementation/test plan. The original repository was not modified or deployed. GitHub Pages publishes the website and workspace; current release checks are recorded in docs/ACCORD_RELEASE.md. Original code uses Apache-2.0; runtime packages and fonts retain the licenses shipped in THIRD_PARTY_NOTICES.txt and public/fonts/.

See the Chinese [validation report](docs/M2_M4_VALIDATION.md), [security notes](SECURITY.md) and [contribution guide](CONTRIBUTING.md). Schema validity, local interaction behavior and external implementation evidence are reported separately. No Safari or independent user-study claims are made.

PSW is the former development name. Schema IDs, the IndexedDB database name and portable file prefixes remain unchanged for data compatibility. The public preview does not claim that the complete M5 lifecycle plan or real paid-model validation is finished.
