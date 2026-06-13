#!/usr/bin/env node

import { randomBytes } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const projectRoot = process.cwd()
const envFilePath = process.env.ROTATE_PUBLIC_ROUTE_SLUGS_ENV_FILE
  ? path.resolve(process.env.ROTATE_PUBLIC_ROUTE_SLUGS_ENV_FILE)
  : path.join(projectRoot, '.env.local')
const confirmRotation = process.env.ROTATE_PUBLIC_ROUTE_SLUGS_CONFIRM === 'YES'
const dryRun = process.env.ROTATE_PUBLIC_ROUTE_SLUGS_DRY_RUN === '1' || !confirmRotation
const pageSize = boundedInteger(process.env.ROTATE_PUBLIC_ROUTE_SLUGS_PAGE_SIZE, 200, 1000)
const actorEmail = process.env.ROTATE_PUBLIC_ROUTE_SLUGS_ACTOR_EMAIL || null

loadEnvFile(envFilePath)

const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '')
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const usedSlugs = new Set()

if (!supabaseUrl || !serviceRoleKey) {
  console.error('ERROR: SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.')
  process.exit(1)
}

if (serviceRoleKey === anonKey) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY must be different from NEXT_PUBLIC_SUPABASE_ANON_KEY.')
  process.exit(1)
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/)
  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const eq = line.indexOf('=')
    if (eq <= 0) continue

    const key = line.slice(0, eq).trim()
    if (process.env[key]) continue

    let value = line.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    process.env[key] = value
  }
}

function boundedInteger(value, fallback, max) {
  if (value === undefined || value === null || value === '') return fallback
  const parsed = Number.parseInt(String(value), 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.min(parsed, max)
}

function createPublicRouteToken(bytes = 16) {
  return randomBytes(bytes).toString('hex')
}

function slugifyPublicRouteBase(input, fallback = 'link') {
  const normalizedFallback = fallback
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'link'

  const normalized = String(input || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || normalizedFallback

  const maxBaseLength = 87
  const trimmed = normalized.slice(0, maxBaseLength).replace(/-+$/g, '')
  return trimmed || normalizedFallback.slice(0, maxBaseLength) || 'link'
}

function buildSecurePublicSlug(input, fallback = 'link') {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const slug = `${slugifyPublicRouteBase(input, fallback)}-${createPublicRouteToken()}`
    if (!usedSlugs.has(slug)) {
      usedSlugs.add(slug)
      return slug
    }
  }

  throw new Error(`Could not generate unique public slug for ${fallback}.`)
}

function hasSecurePublicRouteToken(value) {
  return /^[a-z0-9-]+-[a-f0-9]{32}$/.test(String(value || '').trim().toLowerCase())
}

async function supabaseFetch(apiPath, options = {}) {
  const url = new URL(`${supabaseUrl}${apiPath}`)
  for (const [key, value] of Object.entries(options.query || {})) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value))
    }
  }

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      'content-type': 'application/json',
      ...(options.prefer ? { prefer: options.prefer } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: 'no-store',
  })

  const text = await response.text()
  if (!response.ok) {
    throw new Error(text || `Supabase request failed: ${response.status}`)
  }

  return text ? JSON.parse(text) : null
}

async function fetchAllRows(table, select) {
  const rows = []

  while (true) {
    const page = await supabaseFetch(`/rest/v1/${table}`, {
      query: {
        select,
        order: 'id.asc',
        limit: pageSize,
        offset: rows.length,
      },
    })

    if (!Array.isArray(page) || page.length === 0) break
    rows.push(...page)
    if (page.length < pageSize) break
  }

  return rows
}

async function updateSlug(table, id, slug) {
  if (dryRun) return

  await supabaseFetch(`/rest/v1/${table}`, {
    method: 'PATCH',
    query: {
      id: `eq.${id}`,
    },
    body: { slug },
    prefer: 'return=minimal',
  })
}

async function insertAuditLog(result) {
  if (dryRun) return { ok: true, stored: false, reason: 'dry_run' }

  await supabaseFetch('/rest/v1/audit_logs', {
    method: 'POST',
    body: {
      action: 'public_slug_rotation',
      entity_type: 'system',
      entity_id: `rotate-public-slugs:${Date.now()}`,
      actor_email: actorEmail,
      actor_role: 'maintenance',
      source: 'rotate_public_slugs_script',
      user_agent: 'local-script',
      metadata: {
        dryRun: false,
        oldPublicLinksInvalidated: result.oldPublicLinksInvalidated,
        rotated: result.rotated,
        verification: result.verification,
      },
    },
    prefer: 'return=minimal',
  })

  return { ok: true, stored: true }
}

function vehicleSlugBase(vehicle) {
  return `${vehicle.brand || 'arac'}-${vehicle.model || 'arac'}-${vehicle.year || ''}`
}

async function rotateTable({ table, select, fallback, getBase }) {
  const rows = await fetchAllRows(table, select)
  let rotated = 0

  for (const row of rows) {
    const nextSlug = buildSecurePublicSlug(getBase(row), fallback)
    await updateSlug(table, row.id, nextSlug)
    rotated += 1
  }

  return { table, rows: rows.length, rotated }
}

async function verifySecureSlugs() {
  const galleries = await fetchAllRows('galleries', 'id,slug')
  const vehicles = await fetchAllRows('vehicles', 'id,slug')

  const insecureGalleryCount = galleries.filter((row) => !hasSecurePublicRouteToken(row.slug)).length
  const insecureVehicleCount = vehicles.filter((row) => !hasSecurePublicRouteToken(row.slug)).length

  if (insecureGalleryCount > 0 || insecureVehicleCount > 0) {
    throw new Error(`Insecure public slugs remain. galleries=${insecureGalleryCount}, vehicles=${insecureVehicleCount}`)
  }

  return {
    galleries: galleries.length,
    vehicles: vehicles.length,
  }
}

async function main() {
  const galleryResult = await rotateTable({
    table: 'galleries',
    select: 'id,name,slug',
    fallback: 'galeri',
    getBase: (gallery) => gallery.name || 'galeri',
  })

  const vehicleResult = await rotateTable({
    table: 'vehicles',
    select: 'id,brand,model,year,slug',
    fallback: 'arac',
    getBase: vehicleSlugBase,
  })

  const verification = dryRun
    ? null
    : await verifySecureSlugs()

  const result = {
    ok: true,
    dryRun,
    oldPublicLinksInvalidated: !dryRun,
    rotated: [galleryResult, vehicleResult],
    verification,
  }

  const audit = await insertAuditLog(result)

  console.log(JSON.stringify({
    ...result,
    audit,
  }, null, 2))

  if (dryRun) {
    console.warn('DRY RUN: Set ROTATE_PUBLIC_ROUTE_SLUGS_CONFIRM=YES to invalidate existing public links.')
  }
}

main().catch((error) => {
  console.error(`ERROR: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
