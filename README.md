# CareQueue — Smart Clinic Waiting

A responsive clinic queue demo for patients, staff, and a token-only waiting-room screen. Patient ETAs use recent consultation duration and visibly count down between live snapshots. Staff can manage queue transitions, review patient flow and consult-time charts, and see per-patient SMS delivery states. Patient UI and messages support English, Hindi, Tamil, and Telugu.

## Features

- **Patient check-in and private tracking:** queue token and access-key-protected status; the public room board never exposes patient names, phone numbers, or access keys.
- **Live ETA:** computed from queue order, any active consultation, and the recent consultation average; a localized per-second countdown is refreshed from the server every four seconds.
- **Staff console:** call/start/complete/no-show/rejoin flows, queue position, hourly check-in/completion chart, consultation-duration trend, and delivery-status badges.
- **Printable patient QR:** staff can print or copy the clinic check-in link; patients scan to check in, then see their private live ETA on their phone.
- **Twilio SMS:** after explicit consent and a valid phone, send an immediate token/ETA confirmation and a later approach notice when the wait enters ten minutes or less (or a called-now fallback), unless the confirmation already served as that alert. Messages use duplicate-claim protection and signed real-time status callbacks. SMS failure never cancels a check-in.
- **Accessible check-in:** spaced `+91` numbers are accepted; a 10-digit local Indian number is normalized to `+91`. The SMS checkbox is optional and unchecked by default. Without a valid opted-in number, the patient still joins normally and no message is sent.
- **Hackathon demo data:** the protected staff control adds 25 tagged mock records: 12 active (10 waiting, one called, one in consultation), 12 completed, and one no-show. It populates queue and analytics without changing existing live tickets. All mock phone fields are empty and SMS opt-in is false; example delivery states are visibly labeled `DEMO` and are not carrier events. The reset control removes only records tagged as demo.

This is a queue-coordination prototype, not a clinical decision system.

## Open in VS Code

1. Extract `HACKATHON.zip` and open the `HACKATHON` folder in VS Code.
2. Install Node.js 22+ and pnpm 10+.
3. Copy `environment.template` to `.env` and enter your own database, OAuth/runtime, and Twilio settings where applicable. **The archive intentionally contains no live credentials.** Never commit `.env` or paste credentials into source code.
4. Install and run:

   ```bash
   pnpm install
   pnpm check
   pnpm test
   pnpm dev
   ```

5. For a production bundle, run `pnpm build`.

### Database

The app uses MySQL/TiDB with Drizzle ORM. Set `DATABASE_URL` to a database you control. To generate/apply migrations using the project tooling:

```bash
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

The hosted hackathon preview already has its managed database and migrations applied, and the protected staff API verified **25 tagged demo records** (12 active, 12 completed, one no-show). The ZIP includes schema, migrations, and seed code but **does not contain or export database credentials or patient rows**. In a fresh/local database, use the protected staff console’s demo seed button; do not insert mock data with an unrestricted SQL console.

### Runtime and OAuth

The template expects its configured OAuth/runtime values (see `environment.template` and `server/_core/env.ts`). To log into `/staff` outside the hosted Manus preview, configure an OAuth application and the correct callback URL for your local or tunnel URL. The staff login card is part of CareQueue; the browser briefly visits the official provider sign-in screen because Google passwords cannot safely be embedded in another site, then returns to the same `/staff` route in the same tab. The one-time login state is valid for 30 minutes to allow provider login/MFA. The patient check-in and display routes are public; staff mutation/query routes remain authenticated.

For Vercel hosting, see [VERCEL-DEPLOY.md](VERCEL-DEPLOY.md). The project requires a separate MySQL-compatible database and OAuth callback configuration; those services and secrets are not included in the GitHub repository.

### Twilio configuration

Set the following server-only environment variables:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_API_KEY` and `TWILIO_API_SECRET`
- `TWILIO_FROM_NUMBER` (E.164)
- `TWILIO_AUTH_TOKEN` (used only to validate signed callbacks)
- `TWILIO_STATUS_CALLBACK_URL` (public HTTPS URL ending exactly in `/api/twilio/status`)

Never prefix these values with `VITE_`. The hosted preview's callback URL is environment-specific; change it when using another domain. A local callback needs a public HTTPS tunnel. Real messages may incur Twilio charges and should only go to a patient/test recipient who explicitly opted in. Do not use mock fixture phone numbers (there are none).

## Demo script

1. Open `/staff` and sign in with the authorized staff account.
2. The hosted demo is already seeded. In a fresh environment, click **Load demo patients** once. Confirm the roster contains the tagged sample records, sample SMS statuses have a `DEMO` label, and the charts show completed visit history.
3. On `/staff`, print the QR card or copy its link. Scanning opens the check-in form; a patient's private tracking token appears after they submit.
4. Open `/display` on a room screen; verify it shows tokens, not names.
5. Open `/` on a phone, switch the language, check in a demo patient, and watch the ETA countdown tick. Check-in must work with SMS unchecked; only opt in with an explicitly consented test number.
6. Use staff controls to call, start, and complete visits; observe live queue/ETA and chart changes.
7. Remove sample data only with **Clear demo**; this removes tagged fixture rows only.

See [docs/DEMO-CHECKLIST.md](docs/DEMO-CHECKLIST.md) for a short rehearsal checklist.

## Quality checks

```bash
pnpm check
pnpm test
pnpm build
```

Tests cover ETA math/countdown, demo data privacy invariants, phone normalization, Twilio credentials/sender request shape, SDK callback signature validation, callback status progression, and read-only live Twilio authentication. Live credential/callback checks skip when private credentials are absent; no outbound SMS is sent by the test suite.
