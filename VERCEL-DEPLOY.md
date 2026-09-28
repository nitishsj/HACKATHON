# Deploy CareQueue to Vercel

## 1. Import the GitHub project

In Vercel, select **Add New → Project**, import `nitishsj/HACKATHON`, and use:

| Vercel field | Value |
|---|---|
| Project Name | `hackathon` (or your preferred available name) |
| Framework Preset | **Express** |
| Root Directory | `./` |
| Build Command | `pnpm build` |
| Output Directory | Leave the override off / default. The build creates root `public/` for Vercel's static CDN. |
| Install Command | Automatic pnpm detection, or `pnpm install --frozen-lockfile` |
| Node.js Version | 22.x |

If Vercel still shows **Other**, refresh/re-import after the root `index.ts` commit has reached GitHub. Do not deploy it as a static-only site: the tRPC, OAuth, and Twilio endpoints need the Express Function.

## 2. Create a separate MySQL-compatible database

Vercel does not automatically provide the MySQL database used by this app. Create a MySQL/TiDB-compatible database reachable from Vercel and keep its connection URI private. The currently hosted Manus database and seeded rows do not move with the Git repository.

Before the first staff login, apply the committed migrations using your database URL from your own machine. In PowerShell, from the project root:

```powershell
$env:DATABASE_URL = "<your-private-mysql-compatible-connection-string>"
pnpm install
pnpm drizzle-kit migrate
Remove-Item Env:DATABASE_URL
```

Do not commit the URI or paste it into chat. After deployment, the staff console's protected **Load demo patients** control creates the mock demo records in this new database.

## 3. Add Vercel environment variables

Open **Project → Settings → Environment Variables** and add the variables below to **Production** and **Preview** as needed. Vercel applies changes only to new deployments, so redeploy after editing values.

Required for the app:

| Key | Value |
|---|---|
| `DATABASE_URL` | The private MySQL/TiDB-compatible connection URI from step 2 |
| `JWT_SECRET` | A fresh random secret of at least 32 characters; do not reuse a public/demo value |
| `VITE_APP_ID` | The App ID from the OAuth application configured for this app |
| `OAUTH_SERVER_URL` | `https://api.manus.im` |
| `VITE_OAUTH_PORTAL_URL` | `https://manus.im` |
| `OWNER_OPEN_ID` | Your authorized account's OAuth open ID (recommended to assign owner/admin role) |

`OWNER_OPEN_ID` may be left blank if owner/admin role promotion is not needed. `NODE_ENV` and `PORT` are provided by Vercel; do not add them manually. Manus Forge variables in `environment.template` are optional and not needed for the current queue, staff, display, and SMS flows.

## 4. Deploy once, then set callback URLs

After the first successful deployment, copy the exact production domain Vercel gives you (it may not be `hackathon.vercel.app`). In your OAuth application's allowed callback/redirect URLs, add:

```text
https://<your-production-domain>/api/oauth/callback
```

Then add the following server-only Twilio variables in Vercel. Select **Production** (and Preview only if you intend to test SMS from preview deployments):

| Key | Value |
|---|---|
| `TWILIO_ACCOUNT_SID` | Your Twilio Account SID |
| `TWILIO_API_KEY` | Your Twilio API Key SID |
| `TWILIO_API_SECRET` | The matching Twilio API Key Secret |
| `TWILIO_FROM_NUMBER` | Your Twilio sender number in E.164 format |
| `TWILIO_AUTH_TOKEN` | Twilio Account Auth Token (used to verify callbacks) |
| `TWILIO_STATUS_CALLBACK_URL` | `https://<your-production-domain>/api/twilio/status` |

Keep every Twilio key server-only; never name one with a `VITE_` prefix. Redeploy after saving the variables. Twilio trial accounts may only send to verified recipients; carrier SMS can incur charges. The app sends only after a patient explicitly opts in.

## 5. Verify the deployed app

1. Open `/` and submit a check-in; the patient should receive a private ticket page.
2. Open `/staff`, sign in, and load demo patients to seed the new database.
3. Open `/display` and verify that only tokens are shown.
4. In staff, confirm the dashboard loads and prints a working QR.
5. Test one SMS only with an explicitly opted-in, Twilio-permitted test number; follow its delivery badge and status callback.

If the UI loads but API requests fail, first verify `DATABASE_URL`, OAuth settings, and that the project uses the **Express** preset rather than static-only **Other**.