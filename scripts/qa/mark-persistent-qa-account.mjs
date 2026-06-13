#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    if (!line || line.trimStart().startsWith('#') || !line.includes('=')) continue
    const separator = line.indexOf('=')
    const key = line.slice(0, separator).trim()
    let value = line.slice(separator + 1).trim()
    if (!key || process.env[key] !== undefined) continue
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    process.env[key] = value
  }
}

loadEnvFile(path.join(process.cwd(), '.env.local'))

const email = (process.env.SMOKE_TEST_EMAIL || '').trim().toLowerCase()
const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '')
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

function fail(message) {
  throw new Error(message)
}

async function adminFetch(apiPath, init = {}) {
  const response = await fetch(`${url}${apiPath}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      'content-type': 'application/json',
      ...(init.headers || {}),
    },
    cache: 'no-store',
  })
  const text = await response.text()
  if (!response.ok) fail(`Supabase QA işaretleme isteği başarısız: HTTP ${response.status}`)
  return text ? JSON.parse(text) : undefined
}

async function main() {
  if (!email || !url || !serviceRoleKey) {
    fail('SMOKE_TEST_EMAIL, SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli.')
  }
  if (serviceRoleKey === process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    fail('Service role anahtarı anon anahtarıyla aynı olamaz.')
  }

  const galleries = await adminFetch(`/rest/v1/galleries?select=id,owner_email,is_qa_account&owner_email=eq.${encodeURIComponent(email)}&limit=2`)
  if (!Array.isArray(galleries) || galleries.length !== 1) {
    fail('Kalıcı smoke hesabı tam olarak bir galeriye bağlı olmalı.')
  }

  await adminFetch(`/rest/v1/galleries?id=eq.${encodeURIComponent(galleries[0].id)}`, {
    method: 'PATCH',
    headers: { prefer: 'return=minimal' },
    body: JSON.stringify({ is_qa_account: true }),
  })

  const authResponse = await adminFetch(`/auth/v1/admin/users?page=1&per_page=100&filter=${encodeURIComponent(email)}`)
  const authUsers = Array.isArray(authResponse) ? authResponse : authResponse?.users || []
  const user = authUsers.find((item) => (item.email || '').trim().toLowerCase() === email)
  if (!user?.id) fail('Kalıcı smoke Auth kullanıcısı bulunamadı.')

  await adminFetch(`/auth/v1/admin/users/${encodeURIComponent(user.id)}`, {
    method: 'PUT',
    body: JSON.stringify({
      app_metadata: {
        ...(user.app_metadata || {}),
        isQaAccount: true,
      },
    }),
  })

  console.log(JSON.stringify({
    ok: true,
    galleryMarked: true,
    authMetadataMarked: true,
  }, null, 2))
}

main().catch((error) => {
  console.error(`FAIL: ${error instanceof Error ? error.message : 'Kalıcı QA hesabı işaretlenemedi.'}`)
  process.exit(1)
})
