# Deploy: Public Live Demo

How to publish Security OS as an always-on, shareable demo. Backend on **Railway**,
dashboard on **Vercel**, optional AI via **Ollama Cloud**. ~$10–25/mo.

> ⚠️ This is an **evaluation environment**, not the production deployment story.
> The pitch to ODH remains "100% on-premise — your server, your network." Use the
> public URL for evaluator demos and screenshares only.

---

## Architecture

```
┌──────────────────┐        ┌──────────────────┐
│   Vercel         │  HTTPS │   Railway        │
│   dashboard/     │ ─────► │   Fastify API    │
│   (Vite build)   │        │   + workers      │
└──────────────────┘        └────────┬─────────┘
                                     │
                            ┌────────┴─────────┐
                            ▼                  ▼
                    ┌──────────────┐   ┌──────────────┐
                    │ Railway PG   │   │ Railway      │
                    │ (PostGIS)    │   │ Redis        │
                    └──────────────┘   └──────────────┘
                                     │
                                     ▼
                            ┌──────────────────┐
                            │  Ollama Cloud    │
                            │  (optional)      │
                            └──────────────────┘
```

---

## Prerequisites

- GitHub repo connected (already at `github.com/sambawy01/Security-Ops-App`)
- Accounts: [Railway](https://railway.app), [Vercel](https://vercel.com), and
  optionally [Ollama Cloud](https://ollama.com/cloud)

---

## Step 1 — Backend on Railway

1. **New Project → Deploy from GitHub repo** → pick `Security-Ops-App` →
   Railway detects the `Dockerfile` and `railway.json` automatically.

2. **Add a PostgreSQL plugin** (`+ New → Database → PostgreSQL`).
   The Postgres image Railway provisions ships with the PostGIS extension
   available — the `init` migration enables it via `CREATE EXTENSION IF NOT
   EXISTS "postgis"`. If the migration fails with a permissions error, open
   Railway's Postgres console and run the `CREATE EXTENSION` statement once
   manually, then redeploy.

3. **Add a Redis plugin** (`+ New → Database → Redis`).

4. **Set environment variables** on the API service. Railway exposes plugin
   connection strings as `${{Postgres.DATABASE_URL}}` / `${{Redis.REDIS_URL}}` —
   reference them via Railway's variable picker so they update automatically.

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
   | `REDIS_URL` | `${{Redis.REDIS_URL}}` |
   | `JWT_SECRET` | a fresh 32+ char random string |
   | `JWT_REFRESH_SECRET` | a different 32+ char random string |
   | `PORT` | `3000` |
   | `OLLAMA_URL` | `https://ollama.com` *(or leave blank to disable AI)* |
   | `OLLAMA_API_KEY` | your Ollama Cloud key *(blank = AI disabled, app still works)* |
   | `AI_MODEL` | `qwen2.5:7b` |
   | `WHATSAPP_TOKEN` | leave blank for the demo |
   | `WHATSAPP_PHONE_ID` | leave blank for the demo |
   | `WHATSAPP_VERIFY_TOKEN` | any string |

5. **Generate a public domain** for the API service (Settings → Networking →
   Generate Domain). You'll get something like `secops-api.up.railway.app`.

6. **Trigger a deploy.** The container runs `scripts/bootstrap.ts`:
   - `prisma migrate deploy` — applies all migrations including PostGIS enable
   - schema seed — only on first boot (when officers table is empty)
   - `simulate-demo` + `spread-elgouna` — refreshes today's activity every restart

7. **Verify:** `curl https://<your-railway-domain>/health` →
   `{ "status": "ok", "services": { "database": true, "redis": true } }`.

---

## Step 2 — Dashboard on Vercel

1. **Import project** from GitHub → pick `Security-Ops-App`.

2. **Configure build** in the import wizard:
   - **Root Directory:** `dashboard`
   - Framework Preset: Vite (auto-detected)
   - Build Command: `npm run build` (default)
   - Output Directory: `dist` (default)

3. **Environment variable** (Project Settings → Environment Variables):
   - `VITE_API_URL` = `https://<your-railway-domain>` *(no trailing slash)*

4. **Deploy.** Vercel produces a URL like `security-ops-app.vercel.app`.

5. **Verify:** open the URL, log in with the demo credentials below.

The included `dashboard/vercel.json` handles SPA rewrites so direct visits to
`/incidents`, `/personnel`, etc. don't 404 on refresh.

---

## Step 3 — (Optional) Custom domains

- Vercel: Project → Domains → add `demo.security-os.app` (or similar).
- Railway: Service → Settings → Networking → add `api.security-os.app`.
- Then update Vercel's `VITE_API_URL` to the new API domain and redeploy.

---

## Step 4 — (Optional) Ollama Cloud for AI

Without `OLLAMA_API_KEY`, AI calls return empty strings — the dashboard's AI
panels will show fallback text but won't crash. Skip this step if you want a
free demo.

To enable AI:

1. Sign up at [ollama.com/cloud](https://ollama.com/cloud), pull `qwen2.5:7b`.
2. Set `OLLAMA_URL=https://ollama.com` and `OLLAMA_API_KEY=<key>` in Railway.
3. Redeploy. AI panels (OIB summary, dispatch explain, daily report) populate.

---

## Demo credentials

PIN for **all** demo accounts: `1234`

| Badge | Role | Name |
|---|---|---|
| `MGR-001` | manager | Ahmed ElSaeed |
| `AMGR-001` | assistant_manager | Mohamed Farouk |
| `SUP-001` | supervisor (Downtown) | Omar Hassan |
| `SUP-002` | supervisor (Marina) | Youssef Ibrahim |
| `OPS-001` | operator | Sara Ahmed |
| `HR-001` | hr_admin | Fatma Abdullah |
| `OFF-001` | officer (Downtown) | Ali Mahmoud |
| `OFF-003` | officer (Marina) | Ayman Tarek |

> Field officers (`OFF-*`) only get full feature parity inside the **mobile app**.
> The dashboard is built for `manager` / `assistant_manager` / `supervisor` /
> `operator` roles — log in as `MGR-001` for the broadest view.

Note: device binding kicks in on first mobile login. For the live demo, the
dashboard accepts logins from any browser without device binding.

---

## Refreshing demo activity manually

Bootstrap auto-refreshes "today's" demo activity on every container restart.
To force a refresh between restarts:

```bash
# from a terminal with railway CLI logged in
railway run npx tsx scripts/simulate-demo.ts
railway run npx tsx scripts/spread-elgouna.ts
```

To wipe and reseed everything (destroys all user-created data):

```bash
railway run npx tsx prisma/seed.ts
```

---

## Cost summary (monthly, USD)

| Service | Tier | Cost |
|---|---|---|
| Railway (API + Postgres + Redis) | Hobby | $5 base + ~$5–10 usage |
| Vercel (dashboard) | Hobby | $0 |
| Ollama Cloud | optional | ~$5–10 |
| **Total** | | **$10–25** |

---

## Troubleshooting

**`/health` returns `{database: false}`** — PostGIS extension blocked. Open
Railway's Postgres → Data tab → run `CREATE EXTENSION IF NOT EXISTS "postgis";`
manually, then redeploy.

**Login works but every other API call returns 401** — `JWT_SECRET` was rotated
between deploys. Set it once and don't change it (existing tokens are signed
with the old key). Or just clear localStorage and log in again.

**Dashboard loads but every page is blank** — `VITE_API_URL` not set on Vercel,
or pointing at `localhost`. Check Project → Settings → Environment Variables,
then redeploy.

**Map shows zones in wrong place** — bootstrap re-ran but PostGIS extension
wasn't enabled at seed time. Drop the database, enable PostGIS first, redeploy.

**AI panels empty** — expected without `OLLAMA_API_KEY`. See Step 4.

**Container keeps restarting** — check the deploy logs. Most common: `prisma
migrate deploy` failed because PostGIS isn't enabled (see first item).
