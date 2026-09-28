# Fast Vercel deployment (with TiDB Marketplace)

The CareQueue code uses MySQL. Vercel itself does not include a MySQL server, so use the **TiDB Cloud Marketplace integration**. It can create/connect a MySQL-compatible TiDB cluster from the Vercel workflow and inject its connection fields into the project. The app and Drizzle migration config are set up to read those fields and require TLS.

## 1. Import the GitHub repo

In Vercel choose **Add New → Project** and import `nitishsj/HACKATHON`, branch `main`.

| Field | Value |
|---|---|
| Project Name | `hackathon` (if available) |
| Framework Preset | **Express** |
| Root Directory | `./` |
| Build Command (first deploy only) | `pnpm build` |
| Output Directory | Leave override off (`N/A`) |
| Install Command | `pnpm install --frozen-lockfile` or Vercel's detected pnpm command |

If the Environment Variables section contains a row with key `hackathon`, remove it: that's a project name, not an environment variable. Do not add a blank or placeholder `DATABASE_URL` for the TiDB path.

Add these app/auth values before the first deployment:

| Key | Value |
|---|---|
| `JWT_SECRET` | A new random value of at least 32 characters |
| `VITE_APP_ID` | Your OAuth application's App ID |
| `OAUTH_SERVER_URL` | `https://api.manus.im` |
| `VITE_OAUTH_PORTAL_URL` | `https://manus.im` |
| `OWNER_OPEN_ID` | Your authorized OAuth open ID (recommended; optional if owner-role promotion is unnecessary) |

Choose **Production** for these variables. Then click **Deploy**. The first deploy creates the Vercel project; database-backed pages will not be usable until you connect TiDB in the next step.

## 2. Create/connect TiDB from the Vercel dashboard

1. Open the new Vercel project and go to **Integrations / Marketplace**.
2. Find **TiDB Cloud** and click **Add Integration**.
3. Select your Vercel team and the `hackathon` project, approve the integration, and continue to TiDB Cloud.
4. In the TiDB setup, select the same Vercel project, your TiDB organization/project, and **Cluster** as the connection type.
5. If there is no cluster, use **Create Cluster** to create a TiDB Cloud Starter instance. Use **Create Database** if needed.
6. Choose **General** for the framework/variable format (not Prisma or TiDB Serverless Driver). Connect the resource to **Production**. Enable TiDB branching if you also want isolated Preview databases.
7. Finish **Add Integration**, return to Vercel, then check **Project → Settings → Environment Variables**. TiDB should have added:
   - `TIDB_HOST`
   - `TIDB_PORT`
   - `TIDB_USER`
   - `TIDB_PASSWORD`
   - `TIDB_DATABASE`

Don't copy these secrets into source code or chat. The app creates a verified-TLS MySQL pool from these variables; you don't need to compose a connection URL by hand. The marketplace connection steps are documented by [TiDB](https://docs.pingcap.com/tidbcloud/integrate-tidbcloud-with-vercel/).

## 3. Apply the existing schema migrations

After TiDB variables are present, go to **Project → Settings → Build & Development Settings** and change the Build Command to:

```text
pnpm drizzle-kit migrate && pnpm build
```

Save, then redeploy Production. Drizzle Kit reads the injected `TIDB_*` fields and applies the committed MySQL-compatible migrations before building the app. Don't use `drizzle-kit generate` during deployment.

For Preview deployments, only connect a separate TiDB branch or database if you enabled TiDB branching. Otherwise leave TiDB connected to Production only, so a Preview cannot migrate/use the production database unexpectedly.

## 4. Add Twilio after the production domain exists

Open **Project → Settings → Environment Variables** and add these server-only variables to Production (never use a `VITE_` prefix):

| Key | Value |
|---|---|
| `TWILIO_ACCOUNT_SID` | Your Twilio Account SID |
| `TWILIO_API_KEY` | Your Twilio API Key SID |
| `TWILIO_API_SECRET` | The matching API Key Secret |
| `TWILIO_FROM_NUMBER` | Your Twilio sender number in E.164 format |
| `TWILIO_AUTH_TOKEN` | Twilio Account Auth Token |
| `TWILIO_STATUS_CALLBACK_URL` | `https://<your-production-domain>/api/twilio/status` |

Also allow this OAuth callback in your OAuth application:

```text
https://<your-production-domain>/api/oauth/callback
```

Save the variables and redeploy. Twilio trial accounts may send only to verified recipients; carrier SMS can incur charges. The app sends only after patient opt-in.

## 5. Seed and verify the demo

1. Visit the Vercel site and open `/staff`; sign in.
2. Click **Load demo patients** to seed the new TiDB database.
3. Open `/display` to show the token-only waiting-room board.
4. Print the QR from Staff and scan it with a phone to open patient check-in.
5. Test one SMS using an explicitly opted-in, Twilio-permitted test number.

Render's managed Postgres is not interchangeable with this MySQL schema. The above TiDB path keeps the app's existing MySQL driver and table migrations.
