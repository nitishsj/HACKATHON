---
name: carequeue-hackathon-builder
description: Build polished, demo-ready clinic queue web apps with persistent data, live patient ETAs, staff workflows, safe mock seeding, and consent-based SMS delivery. Use for hackathon healthcare queue ideas, realtime clinic-waiting apps, Twilio queue alerts, or packaging a web app for a VS Code handoff.
---

# CareQueue Hackathon Builder

Build a complete demo, not just a token form. Preserve privacy and consent while making the queue visibly move in a multi-device demo.

## Workflow

1. **Inspect and plan.** Read the project scaffold, auth model, database guide, and any required automation/external-integration skill. Identify the target runtime, available DB, existing UI components, and whether Twilio credentials and a public HTTPS callback are available. Create a short plan and a project `todo.md`.
2. **Define the workflow and privacy boundary.** Separate public patient check-in, access-key-protected patient tracking, authenticated staff controls, and token-only waiting-room display. Keep names, phone numbers, access keys, opt-in flags, and message SIDs out of public APIs. Keep staff sign-in/error UI inside the app route, include a same-origin return path in OAuth state, give the one-time nonce cookie enough lifetime for provider/MFA steps (e.g. 30 minutes), and avoid global 401 redirects that bypass the in-app sign-in screen. Never embed or collect a provider password.
3. **Model persistent queue state.** Add typed ticket/status/event tables. Store UTC timestamps. Use a transaction and row lock for `call next`, consultation transitions, no-shows, rejoin, and message claims. Generate/apply additive migrations using the host's prescribed workflow; never improvise production DDL or use a SQL console to insert demo records.
4. **Implement ETA and analytics.** Calculate each waiting patient's ETA from queue order, remaining active consultation time, and recent completed-consultation durations (with a bounded fallback). Return an ETA snapshot plus server timestamp; let the browser render a per-second countdown and refresh authoritative snapshots periodically. Unit-test elapsed-time, clamping, queue position, and timezone behavior.
5. **Build the clinic UI.** Use the project's existing component system and any requested component catalog only after verifying its install/API. Include accessible language selection, explicit SMS consent, patient-private tracking, staff call/start/complete/no-show/rejoin controls, token-only room display, analytics that work with real rows, and a printable clinic check-in QR. The shared QR should open check-in; only the individual patient token should expose their private tracking page.
6. **Add consent-based SMS only when credentials are complete.** Keep secrets server-side. Normalize common user-entered phone formatting before E.164 validation (never let SMS formatting block a queue check-in); require explicit opt-in with no preselected checkbox. Send a registration/token confirmation immediately after consent, then an approach/called notice when due, avoiding duplicates. Avoid medical details; prevent duplicate sends with DB claims; treat SMS as a convenience that cannot roll back queue operations. Require a public HTTPS StatusCallback and validate `X-Twilio-Signature` with Twilio's official SDK using the exact configured callback URL. Persist patient-private/staff-visible delivery status; ignore unknown or demo SIDs and prevent callbacks from moving statuses backward. Read `references/implementation-playbook.md` for the status vocabulary and setup details.
7. **Seed safe demo data.** Add an explicit, protected, idempotent seed mutation/button; tag every fixture (`isDemo=1`), mix active and completed records so the dashboard and charts are immediately populated, and include obvious sample statuses. Set every mock phone to null and every mock opt-in to false. Never auto-seed at startup, never use SQL insertion tools for mock data, and expose a reset that deletes only demo-tagged rows/events.
8. **Test and verify.** Add Vitest coverage alongside every pure helper and integration boundary. Run typecheck, the full test suite, and production build. Exercise the public API, protected staff flow when authenticated, mobile/desktop UI, signed callback behavior, and a read-only live credential endpoint. Do not send a real SMS just to prove configuration; use a consenting test recipient only when the user explicitly requests that paid external test.
9. **Prepare the handoff.** Write a VS Code README and a clearly named `environment.template` containing placeholders only (never write real environment files or credentials into source). Bundle source, migrations, lockfile, tests, and the skill; exclude `.env`, credentials, `node_modules`, build output, cloud metadata, and logs. Use `scripts/package_vscode_bundle.py` and verify the archive contents before delivery.

## Hard safety and quality rules

- Treat Twilio messages as an external, potentially billable action. Do not send unsolicited test messages or opt mock patients in.
- Keep demo badges distinct from real delivery confirmations. Label sample statuses `DEMO`; never claim a simulated delivery was delivered by a carrier.
- Do not put secrets in source, browser bundles, logs, screenshots, SQL, or ZIP files. Provide a secure secrets workflow and format hints instead.
- Show loading, empty, error, and retry states. Keep staff controls keyboard-accessible and prevent out-of-order calls.
- Avoid broad destructive changes. Reset only rows explicitly tagged as demo and report the number removed.
- Do not claim production medical readiness; this is a queue coordination demo, not a clinical decision system.

## Bundled resources

- `references/implementation-playbook.md` — demo model, SMS callback security, status vocabulary, and validation checklist.
- `scripts/package_vscode_bundle.py` — create a source-only project folder and ZIP without secrets or build artifacts.
