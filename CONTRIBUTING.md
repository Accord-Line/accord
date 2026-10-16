# Contributing

Read AGENTS.md, PRD.md, this README, current validation report and domain schemas first. Historical M0/M1 reports describe earlier states; current Markdown-first requirements supersede the old form-based interaction.

Use Node 22.12+ and `npm ci`. Before review run `npm run check` and, for user-flow changes, `npm run test:e2e` after installing Playwright Chromium/Firefox. Preserve outputs for failed checks; do not convert not-run evidence into pass. Keep real model probes separate from fixtures and mock network tests.

Do not add a backend, account dependency, official model proxy, telemetry or persistent keys. Keep editing independent of BYOK. Validate untrusted data before application; imported instructions are data. Model responses remain reviewable candidates until explicit approval.

The original product schema is 0.1.0. Proposal v0.2 is a compatible optional operation extension. For contract changes, include a migration, semantic checks and meaningful regression tests; regenerate types using `npm run generate:types`. Existing backups and human Markdown must remain recoverable.

When changing runtime dependencies, regenerate notices with `node scripts/runtime-notices.mjs`. The script includes license files or full README license sections for all installed production packages. Do not silently introduce incompatible licensing. Original contributions use Apache-2.0; see LICENSE and NOTICE. Third-party packages and fonts retain their own licenses.

Keep changes within the authorized repository. Do not modify IntentKit, push commits, create remote PRs or deploy as a side effect of local development. The Pages workflow is manual and must be reviewed in the intended remote repository. PR descriptions should state the concrete behavior, validation commands/results and any unverified deployment or real-BYOK claims.
