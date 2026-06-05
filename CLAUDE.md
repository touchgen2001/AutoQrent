# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

**CebindeGaleri** (internal name AutoQrent) — a multi-tenant SaaS for Turkish car
dealerships. Each dealer gets a public QR-code showroom; visitors scan a vehicle's
QR code, view its detail page, and submit leads. Dealers manage inventory, leads,
QR codes, and analytics from a panel. A separate super-admin app manages the
platform (tenants, finance, operations).

**Turkish-first.** Routes (`/araclar`, `/giris`, `/ayarlar`), enum values, DB
labels, and all user-facing copy are Turkish. Keep new user-facing strings in
Turkish; code identifiers stay English.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript 5.7.3**
- **TailwindCSS 4** + **Radix UI** (shadcn/ui pattern; primitives in `components/ui`)
- **Supabase** — Postgres + RLS + Edge Functions (`supabase/functions`) + Storage
- **Sentry** (`sentry.*.config.ts`, `instrumentation.ts`), **Vercel** deploy + cron
- **pnpm workspace**: root app + `apps/super-admin` (separate **Vite** + React 19 SPA,
  built into `public/super-admin/` and served by the Next app)

## Commands

```bash
pnpm dev          # build + next start on 127.0.0.1:3000 (CI=1, production-like)
pnpm dev:hot      # next dev (webpack HMR) on 127.0.0.1:3000
pnpm build        # next build
pnpm lint         # eslint (flat config: eslint.config.mjs)
pnpm typecheck    # tsc --noEmit
pnpm test:unit    # vitest run (tests/unit/**/*.test.ts)
pnpm verify       # full local gate: lint + typecheck + test:unit + build + security/contract scans
pnpm e2e:safe     # Playwright e2e
```

`pnpm verify` is the authoritative local quality gate and mirrors what CI runs.
Run it (or at least `lint` + `typecheck` + `test:unit`) before committing
substantial changes.

## Layout

- `app/` — Next App Router. Public pages at root (`arac`, `blog`, `showroom`,
  `fiyatlar`, …), dealer panel under `app/panel/`, super-admin host under
  `app/admin/`, API routes under `app/api/`.
- `app/api/` — grouped by audience: `auth/` (dealer login/register/session),
  `panel/` (authenticated dealer APIs), `admin/` (super-admin APIs),
  `public/` (unauthenticated showroom/lead events), `cron/` (Vercel cron jobs).
- `lib/` — **pure, importable logic** lives at the top level (e.g.
  `subscription-plans.ts`, `vehicle-limits.ts`, `seo.ts`) and is the easiest to
  unit-test. Subfolders narrow the runtime:
  - `lib/server/` — server-only (repositories, auth guards, Supabase admin client,
    input schemas). Never import these into client components.
  - `lib/client/` — browser-side auth helpers.
  - `lib/security/` — audit, rate limits, route tokens, ops monitoring.
- `components/` — `ui/` (shadcn primitives), `landing/`, `dashboard/`, `shared/`.
- `scripts/qa/` — contract/smoke verifiers (`verify-*.mjs`) wired into `verify`.
- `scripts/security/` — secret scan, backups, predeploy checks, slug rotation.
- `supabase/` — `migrations/`, `functions/` (Edge), `config.toml`.
- `tests/unit/` — vitest specs (target the pure `lib/*.ts` modules).

## Conventions & gotchas

- **Auth is two-tier.** Dealer panel uses `lib/server/panel-auth*`; platform
  super-admin uses `lib/server/admin-auth*`. They are distinct sessions — don't
  cross the guards.
- **TS errors are ignored in `next build`** (`next.config.mjs:
  typescript.ignoreBuildErrors`) for build speed. Type safety is enforced
  *separately* by `pnpm typecheck`, which runs in CI `verify` and in Vercel's
  `buildCommand`. If you add a deploy path, run `typecheck` on it.
- **Git hooks** (`core.hooksPath=.githooks`): pre-commit runs `lint` +
  `security:scan`; pre-push runs `lint` + `build` + `security:scan`. They must
  pass — don't bypass with `--no-verify`.
- **Secret scanner** (`scripts/security/check-secrets.sh`) greps for credential
  patterns. For a legitimate constant that trips it (e.g. a Turkish UI label whose
  key contains `SECRET`/`TOKEN`), append `// pragma: allowlist secret` on that line.
- **ESLint flat config** ignores all `**/dist/**` (including
  `apps/super-admin/dist/`). Don't lint built bundles.
- **Keep logic in `lib/` pure** when you can — it's what the unit tests exercise.
  Side-effecting/server code belongs in `lib/server`.
- **Super-admin is a separate build.** Changes under `apps/super-admin` need
  `pnpm super-admin:build` (or `super-admin:prepare-public`) to reflect in the
  served app; it has its own `tsconfig` and `pnpm super-admin:typecheck`.
