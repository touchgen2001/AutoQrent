# Security Guide

This project now includes a baseline security workflow for secret handling.

## 1) Fast risk checks

Run lightweight source scanning:

```bash
pnpm security:scan
```

This catches obvious hard-coded secrets before deploy.

Run production readiness checks (env + RLS + critical endpoints):

```bash
pnpm security:predeploy
```

Run encrypted-independent DB backup controls:

```bash
SUPABASE_DB_URL='postgres://...' pnpm security:backup:supabase
pnpm security:backup:verify
```

## 1.1) Local Git guard (pre-commit/pre-push)

Install repository hooks once:

```bash
pnpm hooks:install
```

This enables:

- `pre-commit`: `lint` + `security:scan`
- `pre-push`: `lint` + `build` + `security:scan`

## 2) Encrypt and store critical files

Set passphrase (do not commit this):

```bash
export SECURITY_VAULT_PASSPHRASE='replace-with-long-random-passphrase'
```

Encrypt files listed in `security/important-files.txt`:

```bash
pnpm security:vault:encrypt
```

Outputs:

- `security/vault/encrypted/**/*.enc`
- `security/vault/encrypted/manifest.sha256`
- `security/vault/encrypted/metadata.txt`

Optional (dangerous): remove source files after encrypt:

```bash
bash scripts/security/encrypt-important-files.sh --remove-source
```

## 3) Decrypt when needed

Default decrypt destination (safe):

```bash
pnpm security:vault:decrypt
```

This writes files under `security/vault/decrypted/` (gitignored).

Restore directly to original paths only when required:

```bash
bash scripts/security/decrypt-important-files.sh --restore
```

## 4) What should stay out of Git

Already ignored:

- `.env*` files
- private key and certificate files (`*.pem`, `*.key`, `*.p12`, `*.pfx`)
- service account and credential JSON patterns
- decrypted vault output

## 5) Recommended next hardening steps

1. Move production secrets to Vercel/Supabase secret managers only.
2. Enable branch protection + required checks (`lint`, `build`, `security:scan`).
3. Add CI secret scanner (`gitleaks`) for pull requests.
4. Rotate all existing integration tokens once this workflow is in place.
5. Keep Cloudflare WAF rules synced from `security/cloudflare-waf-rules.json`.

## 5.1) Production smoke and uptime monitor

Automations:

- `.github/workflows/prod-smoke-monitor.yml`
- post-deploy smoke validation
- scheduled uptime and latency checks

Required GitHub secrets:

- `PRODUCTION_BASE_URL`
- `SMOKE_TEST_EMAIL`
- `SMOKE_TEST_PASSWORD`
- `MONITOR_ALERT_WEBHOOK_URL` (optional for instant alert)
- `MONITOR_SHARED_KEY` (optional; protects `/api/health` with `x-monitor-key`)

Local commands:

```bash
pnpm smoke:prod:panel-api
pnpm monitor:prod:uptime
```

## 5.2) Sentry integration

Sentry runtime config files are present:

- `sentry.client.config.ts`
- `sentry.server.config.ts`
- `sentry.edge.config.ts`

Expected env vars on Vercel:

- `SENTRY_DSN`
- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_TRACES_SAMPLE_RATE`
- optional source map upload vars: `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`

## 5.3) Public endpoint abuse protection

Rate-limited endpoints:

- `/api/contact` (stricter lead-form limit)
- `/api/public/vehicle-events` (event ingestion limit)
- `/api/auth/login` (brute force protection)

Cloudflare template files:

- `security/cloudflare-waf-rules.json`
- `security/cloudflare-waf-rules.md`

## 5.4) Backup and restore operations

Scripts:

- `pnpm security:backup:supabase`: creates timestamped `.dump` backups + checksum metadata
- `pnpm security:backup:verify`: validates dump size, checksum and `pg_restore --list`
- `pnpm security:restore:supabase -- <file.dump>`: guarded restore (`SUPABASE_RESTORE_CONFIRM=YES` required)

Automation:

- `.github/workflows/monthly-supabase-backup.yml`
- monthly backup and verification with artifact retention

## 6) GitHub branch protection setup

After pushing this repository to GitHub, open:

- `Settings -> Branches -> Branch protection rules -> Add rule`

Use your default branch (`main` or `master`) and enable:

- `Require a pull request before merging`
- `Require status checks to pass before merging`

Mark these checks as required:

- `CI Security Gate / Lint + Build + Security Scan`
- `CI Security Gate / Gitleaks Scan`
