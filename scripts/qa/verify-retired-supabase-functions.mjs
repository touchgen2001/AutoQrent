#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const projectRoot = process.cwd()

const retiredFunctions = [
  'supabase/functions/create-vehicle/index.ts',
  'supabase/functions/create-b2b-request/index.ts',
  'supabase/functions/create-logistics-order/index.ts',
  'supabase/functions/qr-scan/index.ts',
]

const forbiddenPatterns = [
  'createClient',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_ANON_KEY',
  'user_metadata',
  'Number(year)',
  'Number(price)',
  'Number(km)',
  '.from("vehicles")',
  ".from('vehicles')",
  '.from("qr_scans")',
  ".from('qr_scans')",
]

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

const checked = []

for (const filePath of retiredFunctions) {
  const absolutePath = path.join(projectRoot, filePath)
  assert(fs.existsSync(absolutePath), `${filePath} must exist`)

  const source = fs.readFileSync(absolutePath, 'utf8')
  assert(source.includes('legacy_edge_function_retired'), `${filePath} must return retired marker`)
  assert(source.includes('status: 410'), `${filePath} must return HTTP 410`)
  assert(source.includes('serve(async (req)'), `${filePath} must keep a valid Edge Function handler`)

  for (const forbiddenPattern of forbiddenPatterns) {
    assert(!source.includes(forbiddenPattern), `${filePath} must not include ${forbiddenPattern}`)
  }

  checked.push(filePath)
}

console.log(
  JSON.stringify(
    {
      ok: true,
      retiredFunctions: checked,
      forbiddenPatterns,
    },
    null,
    2,
  ),
)
