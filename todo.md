# CareQueue implementation status

## Complete

- [x] Printable, vector-quality clinic check-in QR in the staff dashboard, plus copy-link action and print-only layout.
- [x] Patient ETA countdown refreshes each second between authoritative queue snapshots.
- [x] Seeded hosted database contains 25 tagged mock tickets (12 active, 12 completed, one no-show); mock patients have no phone/consent, and fixture SMS states are visibly marked DEMO.
- [x] Localized patient experience and queue texts in English, Hindi, Tamil, and Telugu.
- [x] Accept spaced `+91` phone entry and normalize 10-digit Indian numbers to `+91`.
- [x] Keep SMS opt-in unchecked by default and optional. Check-in works without opt-in; malformed numbers show a warning but do not prevent ticket creation (the ticket is created without SMS).
- [x] Send an immediate localized check-in/token/current-ETA SMS only after explicit consent and a valid normalized phone; continue later near-turn/called alerts without a duplicate in the same window.
- [x] Show SMS delivery state privately to the ticket holder and live status badges to staff; Twilio callback authentication is configured and tested.
- [x] Fix staff same-tab OAuth return path and retain a CareQueue-branded in-app sign-in/error view.
- [x] Create/validate reusable `carequeue-hackathon-builder` skill and include it in the VS Code source bundle.
- [x] Produce a source-only `HACKATHON/` folder and `HACKATHON.zip` with no hosted credentials, database rows, logs, dependencies, build output, or runtime project metadata.
- [x] `pnpm check`, all 36 Vitest tests, production `pnpm build`, desktop/mobile screenshots, and live database/UI checks pass.

## Deliberate SMS test boundary

No real SMS was sent during verification. Twilio credentials/callback were checked with read-only/auth-only calls and signed synthetic callback data; a carrier-delivery test requires an explicitly opted-in test recipient and may incur provider charges. SMS errors never cancel a queue check-in.
