# Production Deploy Runbook

This runbook is designed for AutoQrent production releases on Vercel.

## 1) Pre-deploy checks

Run these locally before every release:

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm security:scan
pnpm security:predeploy
```

Expected result:
- `security:predeploy` returns `"ok": true`.

If predeploy fails with missing env keys, configure these in Vercel Project Settings -> Environment Variables:
- `SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL`)
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 2) QR UAT check (after env is ready)

Start local production server:

```bash
pnpm build
pnpm start --port 3010
```

In another terminal run:

```bash
node scripts/qa/verify-qr-flow.mjs
```

Expected result:
- JSON with `"ok": true`
- `afterScans` > `beforeScans`

## 3) Deploy

Preview deploy:

```bash
vercel deploy --yes
```

Production deploy:

```bash
vercel deploy --prod --yes
```

## 3.1) Backup gate (mandatory before prod deploy)

Before production deploy, take and verify a fresh database backup:

```bash
SUPABASE_DB_URL='postgres://...' pnpm security:backup:supabase
pnpm security:backup:verify
```

Expected result:
- backup file under `security/backups/supabase/*.dump`
- verify command returns `[verify] ok`

## 4) Post-deploy smoke checks

Automated in GitHub Actions:
- workflow: `Production Smoke And Monitor`
- deploy smoke: waits `/api/health`, then runs `scripts/qa/panel-api-smoke.mjs` against production
- uptime monitor: runs every 10 minutes and validates status + latency thresholds

Manual fallback:

```bash
BASE_URL=https://cebindegaleri.com node scripts/qa/panel-api-smoke.mjs
PRODUCTION_BASE_URL=https://cebindegaleri.com node scripts/monitor/prod-uptime-check.mjs
```

Primary health endpoint:
- `/api/health`

## 5) Monitoring checklist

During first 30 minutes after release, watch:
- Vercel Function error rate
- `5xx` responses on panel/public APIs
- QR scan increments in `/panel/qr-kodlar`
- `/api/health` -> `monitor.health.loginFailureSpike`
- Sentry issues for `api/auth/login`, `api/contact`, `api/public/vehicle-events`

### Required secrets for monitoring workflows

Configure these in GitHub repository secrets:
- `PRODUCTION_BASE_URL` (example: `https://cebindegaleri.com`)
- `SMOKE_TEST_EMAIL` (panel test user)
- `SMOKE_TEST_PASSWORD` (panel test user password)
- `MONITOR_ALERT_WEBHOOK_URL` (Slack/Discord/Teams optional webhook for instant alerts)
- `MONITOR_SHARED_KEY` (optional; if set, `/api/health` requires `x-monitor-key`)

Configure these in Vercel project env vars for Sentry:
- `SENTRY_DSN`
- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_TRACES_SAMPLE_RATE` (example: `0.1`)
- optional release upload keys: `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`

## 6) Rollback plan

List previous deploys:

```bash
vercel ls
```

Promote a known-good deployment back to production:

```bash
vercel promote <deployment-url-or-id>
```

Fast mitigation if runtime fails due secrets:
1. Pause marketing traffic to QR links if needed.
2. Restore previous stable deployment with `vercel promote`.
3. Fix missing env vars and re-run predeploy + QR UAT.

## 7) Database restore drill

Restore is intentionally guarded by confirmation flag:

```bash
export SUPABASE_DB_URL='postgres://...'
export SUPABASE_RESTORE_CONFIRM='YES'
pnpm security:restore:supabase -- security/backups/supabase/<backup-file>.dump
```

Run quarterly restore drills on staging to validate RPO/RTO:
- target RPO: 24h
- target RTO: 60m
