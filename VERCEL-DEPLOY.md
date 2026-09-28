# Deploying CareQueue to Vercel

This repo deploys to Vercel as a **serverless API + static frontend**:

- `vercel.json` builds the client with `vite build` into `dist/public` (served by Vercel's CDN) and rewrites `/api/*` and `/manus-storage/*` to the single serverless function in `api/index.ts`.
- `api/index.ts` wraps the shared Express app from `server/_core/app.ts`. Do **not** import `server/_core/index.ts` on Vercel — it calls `server.listen()` and is only for local dev.
- Server code must use **relative imports** (no `@shared/*` path aliases); Vercel's function bundler cannot resolve tsconfig paths.

## 1. Import the GitHub repo

In Vercel choose **Add New → Project** and import `nitishsj/HACKATHON`, branch `main`. Framework preset: **Other**. The build command and output directory come from `vercel.json` — leave them alone.

## 2. Environment variables

Add these (Production):

| Key | Value |
|---|---|
| `JWT_SECRET` | A new random value of at least 32 characters |
| `VITE_APP_ID` | Your OAuth application's App ID |
| `OAUTH_SERVER_URL` | `https://api.manus.im` |
| `VITE_OAUTH_PORTAL_URL` | `https://manus.im` |
| `OWNER_OPEN_ID` | Your authorized OAuth open ID (optional; needed for owner-role promotion) |

Twilio (optional, enables SMS): `TWILIO_ACCOUNT_SID`, `TWILIO_API_KEY`, `TWILIO_API_SECRET`, `TWILIO_FROM_NUMBER`, `TWILIO_AUTH_TOKEN`, and `TWILIO_STATUS_CALLBACK_URL` (public HTTPS URL ending exactly in `/api/twilio/status`).

## 3. Database (TiDB Cloud Marketplace)

The app uses MySQL. Vercel has no built-in MySQL, so use the **TiDB Cloud Marketplace integration**:

1. Open the Vercel project → **Integrations / Marketplace** → **TiDB Cloud** → **Add Integration**.
2. Connect it to this project; create a TiDB Cloud Starter cluster if you don't have one.
3. Choose the **General** variable format and connect to **Production**.
4. The integration injects `TIDB_HOST`, `TIDB_PORT`, `TIDB_USER`, `TIDB_PASSWORD`, `TIDB_DATABASE`.

The app resolves the database in this order (see `server/databaseConfig.ts`):

1. `DATABASE_URL` (a plain MySQL URL, e.g. for local dev), otherwise
2. the `TIDB_*` variables injected by the integration, with TLS enabled automatically.

### Apply migrations

Run once locally against the production database (or change the Vercel build command temporarily to `pnpm drizzle-kit migrate && pnpm build`):

```bash
pnpm drizzle-kit migrate
```

Drizzle Kit reads the same config resolution as the app.

## 4. Redeploy

Push to `main` (or click **Redeploy** in Vercel). After the deploy, check:

- `/` renders the patient check-in page
- `/api/trpc/health` responds
- `/staff` OAuth login works (the OAuth callback URL must match the Vercel domain)
