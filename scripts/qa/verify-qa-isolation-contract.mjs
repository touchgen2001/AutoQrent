#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')
const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const migration = read('supabase/migrations/20260613181747_add_qa_account_isolation.sql')
const marker = read('scripts/qa/mark-persistent-qa-account.mjs')
const dashboard = read('lib/server/admin-dashboard-repository.ts')
const users = read('lib/server/admin-users-repository.ts')
const finance = read('lib/server/admin-finance-repository.ts')
const qaHelper = read('lib/server/qa-account.ts')

const checks = [
  ['migration adds QA tenant flag', migration.includes('is_qa_account boolean not null default false')],
  ['marker sets gallery and auth QA flags', marker.includes('is_qa_account: true') && marker.includes('isQaAccount: true')],
  ['QA auth metadata helper is strict boolean', qaHelper.includes('metadata?.isQaAccount === true')],
  ['platform dashboard excludes QA galleries and auth', dashboard.includes("is_qa_account: 'eq.false'") && dashboard.includes('isQaAuthMetadata')],
  ['admin users exclude QA galleries and auth', users.includes("is_qa_account: 'eq.false'") && users.includes('isQaAuthMetadata')],
  ['admin finance excludes QA galleries and auth', finance.includes("is_qa_account: 'eq.false'") && finance.includes('isQaAuthMetadata')],
]

for (const [label, ok] of checks) assert(ok, label)

console.log(JSON.stringify({ ok: true, checks: checks.map(([label]) => label) }, null, 2))
