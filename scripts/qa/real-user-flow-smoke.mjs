#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

function loadDotEnvLocal() {
  const envPath = path.join(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) return

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    if (!line || line.trimStart().startsWith('#')) continue

    const separatorIndex = line.indexOf('=')
    if (separatorIndex <= 0) continue

    const key = line.slice(0, separatorIndex).trim()
    let value = line.slice(separatorIndex + 1).trim()
    if (!key || process.env[key] !== undefined) continue

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }

    process.env[key] = value
  }
}

loadDotEnvLocal()

const baseUrl = (process.env.BASE_URL || 'https://cebindegaleri.com').replace(/\/$/, '')
const allowTestData = process.env.REAL_FLOW_ALLOW_TEST_DATA === 'YES'
const useExistingAccount = process.env.REAL_FLOW_USE_EXISTING_ACCOUNT === '1'
const cleanupVehicle = process.env.REAL_FLOW_CLEANUP_VEHICLE !== '0'
const cleanupQaData = !useExistingAccount && process.env.REAL_FLOW_CLEANUP_QA_DATA !== '0'
const sessionCookieName = process.env.SMOKE_SESSION_COOKIE_NAME || 'autoqrent_panel_session'
const safeQaEmailRe = /^akis-\d{14}@cebindegaleri\.com$/i

const runStamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14)
const email = useExistingAccount
  ? process.env.SMOKE_TEST_EMAIL || process.env.REAL_FLOW_EMAIL || ''
  : process.env.REAL_FLOW_EMAIL || `akis-${runStamp}@cebindegaleri.com`
const password = useExistingAccount
  ? process.env.SMOKE_TEST_PASSWORD || process.env.REAL_FLOW_PASSWORD || ''
  : process.env.REAL_FLOW_PASSWORD || `Cg-${runStamp}-Akis!`
const phone = process.env.REAL_FLOW_PHONE || '05309738240'

function fail(message) {
  throw new Error(message)
}

function assert(condition, message) {
  if (!condition) fail(message)
}

function clip(value, length = 260) {
  if (value.length <= length) return value
  return `${value.slice(0, length)}...`
}

function headersToObject(headers) {
  const out = {}
  for (const [key, value] of headers.entries()) out[key] = value
  return out
}

function extractSessionCookie(rawSetCookie) {
  if (!rawSetCookie) return ''
  const escaped = sessionCookieName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = rawSetCookie.match(new RegExp(`${escaped}=[^;]+`))
  return match ? match[0] : ''
}

async function requestJson(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      accept: 'application/json',
      ...(init.headers || {}),
    },
  })
  const text = await response.text()
  let data = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    fail(`${path} JSON donmedi: ${clip(text)}`)
  }

  return {
    status: response.status,
    ok: response.ok,
    data,
    headers: headersToObject(response.headers),
  }
}

function assertJsonOk(label, response, expectedStatus = 200) {
  assert(response.status === expectedStatus, `${label} HTTP ${expectedStatus} bekleniyordu, gelen=${response.status}, payload=${clip(JSON.stringify(response.data))}`)
  assert(response.data?.ok === true, `${label} ok=true bekleniyordu, payload=${clip(JSON.stringify(response.data))}`)
}

function tinyPngFile(nameSuffix = 'tekil') {
  const bytes = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
    'base64',
  )
  return new File([bytes], `akdeniz-oto-${runStamp}-${nameSuffix}.png`, { type: 'image/png' })
}

function isSafeQaEmail(value) {
  return safeQaEmailRe.test(value || '')
}

function getSupabaseAdminConfig() {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '')
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  if (!url || !serviceRoleKey) {
    fail('Tam QA temizligi icin SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli.')
  }

  if (serviceRoleKey === anonKey) {
    fail('SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_ANON_KEY ile ayni olamaz.')
  }

  return { url, serviceRoleKey }
}

function buildSupabaseUrl(config, apiPath, query = {}) {
  const url = new URL(`${config.url}${apiPath.startsWith('/') ? apiPath : `/${apiPath}`}`)
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue
    url.searchParams.set(key, String(value))
  }
  return url
}

async function supabaseAdminFetch(label, input) {
  const config = getSupabaseAdminConfig()
  const response = await fetch(buildSupabaseUrl(config, input.path, input.query), {
    method: input.method || 'GET',
    headers: {
      apikey: config.serviceRoleKey,
      authorization: `Bearer ${config.serviceRoleKey}`,
      'content-type': 'application/json',
      ...(input.prefer ? { prefer: input.prefer } : {}),
    },
    body: input.body === undefined ? undefined : JSON.stringify(input.body),
    cache: 'no-store',
  })
  const text = await response.text()

  if (!response.ok) {
    fail(`${label} Supabase istegi basarisiz: HTTP ${response.status}, payload=${clip(text)}`)
  }

  if (!text) return undefined

  try {
    return JSON.parse(text)
  } catch {
    fail(`${label} Supabase JSON donmedi: ${clip(text)}`)
  }
}

function objectPathFromStoragePublicUrl(publicUrl) {
  try {
    const parsed = new URL(publicUrl)
    const marker = '/storage/v1/object/public/vehicle-images/'
    const markerIndex = parsed.pathname.indexOf(marker)
    if (markerIndex < 0) return null

    return decodeURIComponent(parsed.pathname.slice(markerIndex + marker.length))
  } catch {
    return null
  }
}

function safeVehicleImagePath(galleryId, pathValue, publicUrl) {
  const rawPath = pathValue || (publicUrl ? objectPathFromStoragePublicUrl(publicUrl) : null)
  if (!rawPath) return null

  const normalized = rawPath.replace(/^\/+/, '')
  if (!normalized.startsWith(`panel/${galleryId}/vehicle-images/`)) return null

  return normalized
}

async function listQaGalleriesByEmail(targetEmail) {
  const rows = await supabaseAdminFetch('qa gallery list', {
    path: '/rest/v1/galleries',
    query: {
      select: 'id,name,slug,owner_email',
      owner_email: `eq.${targetEmail}`,
      limit: 20,
    },
  })

  return Array.isArray(rows) ? rows.filter((row) => row.owner_email === targetEmail) : []
}

async function listUploadedAssets(galleryId) {
  const rows = await supabaseAdminFetch('qa uploaded asset list', {
    path: '/rest/v1/uploaded_assets',
    query: {
      select: 'id,gallery_id,bucket,object_path,public_url,status',
      gallery_id: `eq.${galleryId}`,
      limit: 200,
    },
  })

  return Array.isArray(rows) ? rows : []
}

async function listGalleryAuditLogs(galleryId) {
  const rows = await supabaseAdminFetch('qa audit log list', {
    path: '/rest/v1/audit_logs',
    query: {
      select: 'id',
      'metadata->>galleryId': `eq.${galleryId}`,
      limit: 500,
    },
  })

  return Array.isArray(rows) ? rows : []
}

async function deleteGalleryAuditLogs(galleryId) {
  await supabaseAdminFetch('qa audit log delete', {
    method: 'DELETE',
    path: '/rest/v1/audit_logs',
    query: {
      'metadata->>galleryId': `eq.${galleryId}`,
    },
    prefer: 'return=minimal',
  })
}

async function deleteStorageObjects(galleryId, assets, photoUrl) {
  const paths = new Set()

  for (const asset of assets) {
    const normalized = safeVehicleImagePath(galleryId, asset.object_path, asset.public_url)
    if (normalized) paths.add(normalized)
  }

  const fallbackPath = safeVehicleImagePath(galleryId, null, photoUrl)
  if (fallbackPath) paths.add(fallbackPath)

  if (paths.size === 0) {
    return { deleted: 0, paths: [] }
  }

  const config = getSupabaseAdminConfig()
  const response = await fetch(`${config.url}/storage/v1/object/vehicle-images`, {
    method: 'DELETE',
    headers: {
      apikey: config.serviceRoleKey,
      authorization: `Bearer ${config.serviceRoleKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ prefixes: [...paths] }),
    cache: 'no-store',
  })

  if (!response.ok) {
    const text = await response.text()
    fail(`qa storage cleanup basarisiz: HTTP ${response.status}, payload=${clip(text)}`)
  }

  return { deleted: paths.size, paths: [...paths] }
}

async function deleteGalleryRow(gallery) {
  if (!isSafeQaEmail(gallery.owner_email)) {
    fail(`Guvenli olmayan QA galeri silme engellendi: ${gallery.owner_email || 'email yok'}`)
  }

  await supabaseAdminFetch('qa gallery delete', {
    method: 'DELETE',
    path: '/rest/v1/galleries',
    query: {
      id: `eq.${gallery.id}`,
    },
    prefer: 'return=minimal',
  })
}

async function listQaAuthUsersByEmail(targetEmail) {
  const response = await supabaseAdminFetch('qa auth user list', {
    path: '/auth/v1/admin/users',
    query: {
      page: 1,
      per_page: 100,
      filter: targetEmail,
    },
  })
  const users = Array.isArray(response) ? response : response?.users || []

  return users.filter((user) => user.email === targetEmail && isSafeQaEmail(user.email))
}

async function deleteAuthUser(user) {
  if (!isSafeQaEmail(user.email)) {
    fail(`Guvenli olmayan QA auth kullanici silme engellendi: ${user.email || 'email yok'}`)
  }

  await supabaseAdminFetch('qa auth user delete', {
    method: 'DELETE',
    path: `/auth/v1/admin/users/${encodeURIComponent(user.id)}`,
    query: {
      should_soft_delete: false,
    },
  })
}

async function cleanupQaTestAccount(photoUrl) {
  if (!cleanupQaData) {
    return { enabled: false, reason: 'REAL_FLOW_CLEANUP_QA_DATA=0' }
  }

  if (!isSafeQaEmail(email)) {
    fail(`Tam QA temizligi guvenli e-posta deseni disinda calismaz: ${email}`)
  }

  const galleries = await listQaGalleriesByEmail(email)
  let storageObjectsDeleted = 0
  let uploadedAssetsSeen = 0
  let auditLogsSeen = 0

  for (const gallery of galleries) {
    const assets = await listUploadedAssets(gallery.id)
    const auditLogs = await listGalleryAuditLogs(gallery.id)
    uploadedAssetsSeen += assets.length
    auditLogsSeen += auditLogs.length
    const storage = await deleteStorageObjects(gallery.id, assets, photoUrl)
    storageObjectsDeleted += storage.deleted
    await deleteGalleryAuditLogs(gallery.id)
    await deleteGalleryRow(gallery)
  }

  const authUsers = await listQaAuthUsersByEmail(email)
  for (const user of authUsers) {
    await deleteAuthUser(user)
  }

  const remainingGalleries = await listQaGalleriesByEmail(email)
  const remainingAuthUsers = await listQaAuthUsersByEmail(email)

  assert(remainingGalleries.length === 0, 'QA galeri temizligi sonrasi kayit kaldi')
  assert(remainingAuthUsers.length === 0, 'QA auth kullanici temizligi sonrasi kayit kaldi')

  return {
    enabled: true,
    safePattern: safeQaEmailRe.source,
    galleriesDeleted: galleries.length,
    authUsersDeleted: authUsers.length,
    uploadedAssetsSeen,
    auditLogsSeen,
    storageObjectsDeleted,
    remainingGalleryCount: remainingGalleries.length,
    remainingAuthUserCount: remainingAuthUsers.length,
  }
}

async function register() {
  const response = await requestJson('/api/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      galleryName: `Akdeniz Oto Galeri ${runStamp}`,
      fullName: 'Ruzgar Akis Kontrol',
      email,
      phone,
      password,
    }),
  })
  assertJsonOk('register', response)

  const cookie = extractSessionCookie(response.headers['set-cookie'] || '')
  assert(cookie, 'register session cookie donmedi')
  return cookie
}

async function loginExistingAccount() {
  assert(email && password, 'Kalıcı QA hesabı için SMOKE_TEST_EMAIL ve SMOKE_TEST_PASSWORD gerekli.')

  const response = await requestJson('/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  assertJsonOk('persistent qa login', response)

  const cookie = extractSessionCookie(response.headers['set-cookie'] || '')
  assert(cookie, 'persistent qa login session cookie donmedi')
  return cookie
}

async function getSettings(cookie) {
  const response = await requestJson('/api/panel/settings', {
    headers: { cookie },
  })
  assertJsonOk('settings read', response)
  assert(/-[a-f0-9]{32}$/.test(response.data.settings?.slug || ''), 'settings slug guvenli token suffix tasimiyor')
  return response.data.settings
}

async function patchSettings(cookie) {
  const response = await requestJson('/api/panel/settings', {
    method: 'PATCH',
    headers: {
      cookie,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      name: `Akdeniz Oto Galeri ${runStamp}`,
      slug: `akdeniz-oto-galeri-${runStamp}`,
      phone,
      whatsapp: phone,
      email,
      address: 'Maslak Ataturk Oto Sanayi Sitesi No 1',
      city: 'Istanbul',
      district: 'Sariyer',
      latitude: 41.112,
      longitude: 29.016,
      googleMapsUrl: 'https://www.google.com/maps?q=41.112,29.016',
      workingHours: {
        weekdays: '09:00 - 19:00',
        saturday: '10:00 - 18:00',
        sunday: 'Kapali',
      },
      socialMedia: {
        instagram: '',
        facebook: '',
        youtube: '',
        twitter: '',
      },
    }),
  })
  assertJsonOk('settings patch', response)
  assert(/-[a-f0-9]{32}$/.test(response.data.settings?.slug || ''), 'settings slug guvenli token suffix tasimiyor')
  return response.data.settings
}

async function uploadImage(cookie) {
  const formData = new FormData()
  formData.append('files', tinyPngFile('kopya-1'))
  formData.append('files', tinyPngFile('kopya-2'))

  const response = await requestJson('/api/panel/uploads/vehicle-images', {
    method: 'POST',
    headers: { cookie },
    body: formData,
  })
  assertJsonOk('vehicle image upload', response)
  assert(response.data.items?.length === 2, 'aynı görsel iki kez yüklendiğinde iki upload item dönmeli')
  const item = response.data.items?.[0]
  const duplicateItem = response.data.items?.[1]
  assert(item?.publicUrl, 'upload publicUrl donmedi')
  assert(duplicateItem?.publicUrl, 'duplicate upload publicUrl donmedi')
  assert(item.securityScan?.kind === 'png', 'upload guvenlik taramasi PNG sonucu donmedi')
  assert(duplicateItem.securityScan?.kind === 'png', 'duplicate upload guvenlik taramasi PNG sonucu donmedi')
  return response.data.items.map((uploadItem) => uploadItem.publicUrl).filter(Boolean)
}

async function createVehicle(cookie, photoUrls) {
  const response = await requestJson('/api/panel/vehicles', {
    method: 'POST',
    headers: {
      cookie,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      brand: 'Toyota',
      model: 'Corolla',
      variant: '1.5 Vision Multidrive S',
      year: 2021,
      price: 1245000,
      mileage: 42800,
      fuel: 'Benzin',
      transmission: 'Otomatik',
      color: 'Beyaz',
      bodyType: 'Sedan',
      engineSize: '1.5',
      horsePower: '123',
      plateNumber: '',
      hasDamage: 'no',
      previousOwners: '1',
      serviceHistory: 'yes',
      warrantyStatus: 'no',
      description: 'Bakimlari duzenli yapilmis, sehir ici kullanima uygun aile araci.',
      photos: [photoUrls[0]],
    }),
  })
  assertJsonOk('vehicle create', response)
  assert(response.data.item?.id, 'vehicle id donmedi')
  return response.data.item
}

async function findQrVehicle(cookie, vehicleId) {
  const response = await requestJson('/api/panel/qr-codes', {
    headers: { cookie },
  })
  assertJsonOk('qr list', response)
  const vehicle = (response.data.vehicles || []).find((item) => item.vehicleId === vehicleId)
  assert(vehicle?.routeId, 'olusturulan arac QR listesinde routeId ile bulunamadi')
  assert(/-[a-f0-9]{32}$/.test(vehicle.routeId), 'arac routeId guvenli token suffix tasimiyor')
  return vehicle
}

async function verifyPublicPages(settings, qrVehicle) {
  const vehiclePage = await fetch(`${baseUrl}/arac/${encodeURIComponent(qrVehicle.routeId)}?src=qr`)
  assert(vehiclePage.ok, `public arac sayfasi acilmadi: HTTP ${vehiclePage.status}`)

  const showroomPage = await fetch(`${baseUrl}/showroom/${encodeURIComponent(settings.slug)}`)
  assert(showroomPage.ok, `public showroom acilmadi: HTTP ${showroomPage.status}`)
}

async function createQrEvent(qrVehicle) {
  const response = await requestJson('/api/public/vehicle-events', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      vehicleRouteId: qrVehicle.routeId,
      source: 'qr',
    }),
  })
  assertJsonOk('qr event', response)
}

async function createPublicCtaEvent(qrVehicle) {
  const response = await requestJson('/api/public/vehicle-events', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      vehicleRouteId: qrVehicle.routeId,
      source: 'qr',
      eventType: 'whatsapp_click',
    }),
  })
  assertJsonOk('public vehicle CTA event', response)
}

async function createPublicShowroomCtaEvent(settings) {
  const response = await requestJson('/api/public/showroom-events', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      dealerSlug: settings.slug,
      eventType: 'whatsapp_click',
      target: 'real_flow_showroom_whatsapp',
    }),
  })
  assertJsonOk('public showroom CTA event', response)
}

async function createLead(settings, qrVehicle) {
  await new Promise((resolve) => setTimeout(resolve, 2100))
  const response = await requestJson('/api/vehicle-lead', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'accept-language': 'tr-TR,tr;q=0.9',
      'sec-fetch-site': 'same-origin',
      'sec-ch-ua': '"Chromium";v="120"',
      'user-agent': 'Mozilla/5.0 CebindegaleriRealFlowSmoke/1.0',
    },
    body: JSON.stringify({
      name: 'Ruzgar Galeri Musterisi',
      phone,
      email: '',
      message: 'Toyota Corolla araci icin detayli bilgi almak istiyorum.',
      vehicleId: qrVehicle.routeId,
      vehicleTitle: qrVehicle.vehicleTitle,
      galleryWhatsapp: settings.whatsapp || phone,
      source: 'qr',
      referrerSlug: settings.slug,
      formStartedAt: Date.now() - 3500,
    }),
  })
  assertJsonOk('vehicle lead', response)
}

async function verifyPanelState(cookie, vehicleId, qrVehicle, settings) {
  const qrResponse = await requestJson('/api/panel/qr-codes', {
    headers: { cookie },
  })
  assertJsonOk('qr list after event', qrResponse)
  const panelQrVehicle = (qrResponse.data.vehicles || []).find((item) => item.vehicleId === vehicleId)
  assert(Number(panelQrVehicle?.scans || 0) >= 1, 'QR scan panelde artmadi')

  const leadsResponse = await requestJson('/api/panel/leads', {
    headers: { cookie },
  })
  assertJsonOk('panel leads', leadsResponse)
  const lead = (leadsResponse.data.items || []).find((item) => item.vehicleId === vehicleId)
  assert(lead, 'lead panelde olusturulan araca bagli gorunmedi')
  assert(lead.source === 'qr', `QR kaynakli lead panelde qr olarak gorunmedi: ${lead.source}`)

  const analyticsResponse = await requestJson('/api/panel/analytics/overview?range=7days', {
    headers: { cookie },
  })
  assertJsonOk('analytics overview', analyticsResponse)
  assert(Number(analyticsResponse.data.metrics?.totalScans || 0) >= 1, 'analytics totalScans artmadi')
  assert(Number(analyticsResponse.data.metrics?.totalLeads || 0) >= 1, 'analytics totalLeads artmadi')

  const auditResponse = await requestJson('/api/panel/audit-logs?action=public_vehicle_cta_click&source=public_vehicle_event_api&limit=20', {
    headers: { cookie },
  })
  assertJsonOk('panel public CTA audit logs', auditResponse)
  const ctaAuditLog = (auditResponse.data.items || []).find((item) => {
    return item?.metadata?.vehicleRouteId === qrVehicle.routeId
      && item?.metadata?.eventType === 'whatsapp_click'
  })
  assert(ctaAuditLog, 'Public arac CTA eventi panel audit logda gorunmedi')

  const showroomAuditResponse = await requestJson('/api/panel/audit-logs?action=public_showroom_cta_click&source=public_showroom_event_api&limit=20', {
    headers: { cookie },
  })
  assertJsonOk('panel public showroom CTA audit logs', showroomAuditResponse)
  const showroomCtaAuditLog = (showroomAuditResponse.data.items || []).find((item) => {
    return item?.metadata?.dealerSlug === settings.slug
      && item?.metadata?.eventType === 'whatsapp_click'
      && item?.metadata?.target === 'real_flow_showroom_whatsapp'
  })
  assert(showroomCtaAuditLog, 'Public showroom CTA eventi panel audit logda gorunmedi')

  return {
    scans: Number(panelQrVehicle?.scans || 0),
    leadCount: (leadsResponse.data.items || []).length,
    publicCtaAuditLogged: Boolean(ctaAuditLog),
    publicShowroomCtaAuditLogged: Boolean(showroomCtaAuditLog),
    analytics: analyticsResponse.data.metrics,
  }
}

async function assertPersistentQaGallery() {
  const rows = await supabaseAdminFetch('persistent qa gallery verify', {
    path: '/rest/v1/galleries',
    query: {
      select: 'id,owner_email,is_qa_account',
      owner_email: `eq.${email}`,
      limit: 2,
    },
  })
  const gallery = Array.isArray(rows) ? rows[0] : null
  assert(gallery?.id, 'Kalıcı QA galerisi bulunamadı.')
  assert(rows.length === 1, 'Kalıcı QA hesabı yalnızca bir galeriye bağlı olmalı.')
  assert(gallery.owner_email === email, 'Kalıcı QA galeri sahibi eşleşmiyor.')
  assert(gallery.is_qa_account === true, 'Kalıcı QA galerisi is_qa_account=true olarak işaretlenmeli.')
  return gallery
}

async function hardDeletePersistentQaArtifacts(vehicleId) {
  if (!useExistingAccount) return { enabled: false }

  const gallery = await assertPersistentQaGallery()

  await supabaseAdminFetch('persistent qa lead cleanup', {
    method: 'DELETE',
    path: '/rest/v1/leads',
    query: {
      gallery_id: `eq.${gallery.id}`,
      vehicle_id: `eq.${vehicleId}`,
    },
    prefer: 'return=minimal',
  })
  await supabaseAdminFetch('persistent qa vehicle hard cleanup', {
    method: 'DELETE',
    path: '/rest/v1/vehicles',
    query: {
      id: `eq.${vehicleId}`,
      gallery_id: `eq.${gallery.id}`,
    },
    prefer: 'return=minimal',
  })
  await supabaseAdminFetch('persistent qa audit cleanup', {
    method: 'DELETE',
    path: '/rest/v1/audit_logs',
    query: {
      'metadata->>galleryId': `eq.${gallery.id}`,
    },
    prefer: 'return=minimal',
  })
  await supabaseAdminFetch('persistent qa uploaded asset row cleanup', {
    method: 'DELETE',
    path: '/rest/v1/uploaded_assets',
    query: {
      gallery_id: `eq.${gallery.id}`,
      status: 'eq.deleted',
    },
    prefer: 'return=minimal',
  })

  const remainingVehicles = await supabaseAdminFetch('persistent qa vehicle cleanup verify', {
    path: '/rest/v1/vehicles',
    query: {
      select: 'id',
      id: `eq.${vehicleId}`,
      gallery_id: `eq.${gallery.id}`,
      limit: 1,
    },
  })
  const remainingLeads = await supabaseAdminFetch('persistent qa lead cleanup verify', {
    path: '/rest/v1/leads',
    query: {
      select: 'id',
      gallery_id: `eq.${gallery.id}`,
      vehicle_id: `eq.${vehicleId}`,
      limit: 1,
    },
  })
  assert(Array.isArray(remainingVehicles) && remainingVehicles.length === 0, 'Kalıcı QA araç kaydı temizlenemedi.')
  assert(Array.isArray(remainingLeads) && remainingLeads.length === 0, 'Kalıcı QA lead kaydı temizlenemedi.')

  return {
    enabled: true,
    galleryId: gallery.id,
    vehicleHardDeleted: true,
    leadDeleted: true,
  }
}

async function cleanup(cookie, vehicleId, photoUrls) {
  if (!cleanupVehicle) return { vehicleDeleted: false, imageDeleted: false }

  const vehicleDelete = await requestJson(`/api/panel/vehicles/${encodeURIComponent(vehicleId)}`, {
    method: 'DELETE',
    headers: { cookie },
  })
  assertJsonOk('vehicle cleanup delete', vehicleDelete)

  const imageDelete = await requestJson('/api/panel/uploads/vehicle-images', {
    method: 'DELETE',
    headers: {
      cookie,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      publicUrls: photoUrls,
    }),
  })
  assertJsonOk('image cleanup delete', imageDelete)

  const hardCleanup = await hardDeletePersistentQaArtifacts(vehicleId)

  return { vehicleDeleted: true, imageDeleted: true, hardCleanup }
}

async function main() {
  if (!allowTestData) {
    fail('Bu script gercek kayit/arac/lead verisi olusturur. Calistirmak icin REAL_FLOW_ALLOW_TEST_DATA=YES verin.')
  }

  console.log(`[real-user-flow-smoke] baseUrl=${baseUrl}`)
  let cookie = ''
  let settings = null
  let photoUrls = []
  let vehicle = null
  let qrVehicle = null
  let panelState = null
  let panelCleanupState = { vehicleDeleted: false, imageDeleted: false, reason: 'not_started' }
  let qaCleanupState = { enabled: false, reason: 'not_started' }
  let flowError = null
  const cleanupErrors = []

  try {
    cookie = useExistingAccount ? await loginExistingAccount() : await register()
    const session = await requestJson('/api/auth/session', { headers: { cookie } })
    assertJsonOk(useExistingAccount ? 'session after login' : 'session after register', session)

    settings = useExistingAccount ? await getSettings(cookie) : await patchSettings(cookie)
    photoUrls = await uploadImage(cookie)
    vehicle = await createVehicle(cookie, photoUrls)
    qrVehicle = await findQrVehicle(cookie, vehicle.id)
    await verifyPublicPages(settings, qrVehicle)
    await createQrEvent(qrVehicle)
    await createPublicCtaEvent(qrVehicle)
    await createPublicShowroomCtaEvent(settings)
    await createLead(settings, qrVehicle)
    panelState = await verifyPanelState(cookie, vehicle.id, qrVehicle, settings)
  } catch (error) {
    flowError = error
  } finally {
    if (cookie && vehicle?.id && photoUrls.length > 0 && cleanupVehicle) {
      try {
        panelCleanupState = await cleanup(cookie, vehicle.id, photoUrls)
      } catch (error) {
        cleanupErrors.push(error instanceof Error ? error.message : 'panel cleanup failed')
      }
    }

    if (cleanupQaData) {
      try {
        qaCleanupState = await cleanupQaTestAccount(photoUrls[0] || '')
      } catch (error) {
        cleanupErrors.push(error instanceof Error ? error.message : 'qa account cleanup failed')
      }
    }
  }

  if (flowError || cleanupErrors.length > 0) {
    const details = [
      flowError instanceof Error ? flowError.message : flowError ? 'Bilinmeyen gercek akis hatasi' : '',
      ...cleanupErrors,
    ].filter(Boolean)
    fail(details.join(' | '))
  }

  console.log(JSON.stringify({
    ok: true,
    baseUrl,
    accountMode: useExistingAccount ? 'persistent_qa' : 'ephemeral_qa',
    gallerySlug: settings.slug,
    vehicleId: vehicle.id,
    vehicleRouteId: qrVehicle.routeId,
    cleanup: {
      panel: panelCleanupState,
      qa: qaCleanupState,
    },
    panelState,
  }, null, 2))
}

main().catch((error) => {
  console.error(`FAIL: ${error instanceof Error ? error.message : 'Bilinmeyen gercek akis hatasi'}`)
  process.exit(1)
})
