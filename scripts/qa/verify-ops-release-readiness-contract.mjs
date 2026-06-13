#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const projectRoot = process.cwd()

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), 'utf8')
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const ciWorkflow = read('.github/workflows/ci-security.yml')
const prodWorkflow = read('.github/workflows/prod-smoke-monitor.yml')
const backupWorkflow = read('.github/workflows/monthly-supabase-backup.yml')
const operationsMigration = read('supabase/migrations/20260613194133_admin_operations_live_tables.sql')
const operationsRepo = read('lib/server/admin-operations-repository.ts')
const adminUsersRepo = read('lib/server/admin-users-repository.ts')
const billingProvider = read('lib/server/billing-provider.ts')
const subscriptionRoute = read('app/api/panel/subscription/route.ts')
const envExample = read('.env.example')
const packageJson = read('package.json')

const checks = [
  ['github workflows use stable checkout v4', ciWorkflow.includes('actions/checkout@v4') && prodWorkflow.includes('actions/checkout@v4') && !ciWorkflow.includes('checkout@v6') && !prodWorkflow.includes('checkout@v6')],
  ['backup workflow skips db backup when SUPABASE_DB_URL is missing', backupWorkflow.includes('db_ready=0') && backupWorkflow.includes('skipped_missing_SUPABASE_DB_URL') && backupWorkflow.includes("if: steps.backup_config.outputs.db_ready == '1'")],
  ['backup workflow still supports storage-only backup', backupWorkflow.includes('storage_ready=1') && backupWorkflow.includes("if: steps.backup_config.outputs.storage_ready == '1'")],
  ['admin operations migration creates support ticket tables', operationsMigration.includes('create table if not exists public.support_tickets') && operationsMigration.includes('public.support_ticket_notes') && operationsMigration.includes('public.support_ticket_attachments') && operationsMigration.includes('public.support_ticket_events')],
  ['admin operations migration creates moderation and broadcast tables', operationsMigration.includes('create table if not exists public.moderation_reports') && operationsMigration.includes('public.moderation_report_events') && operationsMigration.includes('create table if not exists public.admin_broadcasts')],
  ['admin operations migration forces RLS and service role only policies', operationsMigration.includes('force row level security') && operationsMigration.includes('to service_role') && !operationsMigration.includes('to anon') && !operationsMigration.includes('to authenticated')],
  ['admin operations repository reads live support tables without fake rows', operationsRepo.includes('/rest/v1/support_tickets') && operationsRepo.includes('buildSupportTickets') && operationsRepo.includes('sahte destek talebi gösterilmiyor')],
  ['admin operations repository persists moderation report actions when real report exists', operationsRepo.includes('/rest/v1/moderation_reports') && operationsRepo.includes('/rest/v1/moderation_report_events') && operationsRepo.includes('looksLikeUuid(input.reportId)')],
  ['admin broadcast requests persist to live table and audit log', adminUsersRepo.includes('/rest/v1/admin_broadcasts') && adminUsersRepo.includes('admin_notification_send') && adminUsersRepo.includes('delivery_status')],
  ['billing provider readiness does not fake checkout when env is missing', billingProvider.includes('getBillingProviderStatus') && billingProvider.includes('checkoutEnabled: false') && billingProvider.includes('otomatik tahsilat yapılmaz')],
  ['subscription route exposes live payment provider readiness', subscriptionRoute.includes('getBillingProviderStatus()') && !subscriptionRoute.includes('provider: null,\n        message:')],
  ['env example documents observability, backup and Stripe readiness env', envExample.includes('SUPABASE_DB_URL=') && envExample.includes('SENTRY_DSN=') && envExample.includes('STRIPE_SECRET_KEY=') && envExample.includes('STRIPE_PRICE_PREMIUM_YEARLY=')], // pragma: allowlist secret
  ['package exposes ops release readiness quality contract', packageJson.includes('quality:ops-release') && packageJson.includes('verify-ops-release-readiness-contract.mjs')],
]

for (const [label, ok] of checks) {
  assert(ok, label)
}

console.log(JSON.stringify({ ok: true, checks: checks.map(([label]) => label) }, null, 2))
