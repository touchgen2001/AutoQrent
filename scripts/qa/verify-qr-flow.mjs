#!/usr/bin/env node

const baseUrl = process.env.BASE_URL || 'http://localhost:3010'

function fail(message) {
  console.error(`FAIL: ${message}`)
  process.exit(1)
}

async function getJson(path, init) {
  const response = await fetch(`${baseUrl}${path}`, init)
  const text = await response.text()

  let data
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    fail(`Non-JSON response from ${path}: ${text.slice(0, 200)}`)
  }

  if (!response.ok) {
    fail(`${path} -> HTTP ${response.status}: ${data?.message || text}`)
  }

  return data
}

async function main() {
  const panelDataBefore = await getJson('/api/panel/qr-codes')
  if (!panelDataBefore?.ok) fail('QR panel endpoint returned !ok')

  const vehicles = panelDataBefore.vehicles || []
  if (!Array.isArray(vehicles) || vehicles.length === 0) {
    fail('No vehicles returned from /api/panel/qr-codes. Add at least one vehicle before QR UAT.')
  }

  const target = vehicles.find((item) => item.vehicleId && item.routeId) || vehicles[0]
  if (!target?.vehicleId || !target?.routeId) {
    fail('Target vehicle does not include vehicleId/routeId')
  }

  const beforeScans = Number(target.scans || 0)

  const vehiclePage = await fetch(`${baseUrl}/arac/${encodeURIComponent(target.routeId)}?src=qr`, {
    method: 'GET',
  })
  if (!vehiclePage.ok) {
    fail(`Vehicle page is not reachable: HTTP ${vehiclePage.status}`)
  }

  const eventPayload = {
    vehicleRouteId: target.routeId,
    source: 'qr',
  }

  const eventResponse = await getJson('/api/public/vehicle-events', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(eventPayload),
  })

  if (!eventResponse?.ok) {
    fail('Vehicle events endpoint returned !ok')
  }

  let afterScans = beforeScans
  for (let attempt = 0; attempt < 8; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 350))
    const panelDataAfter = await getJson('/api/panel/qr-codes')
    const refreshed = (panelDataAfter.vehicles || []).find((item) => item.vehicleId === target.vehicleId)
    afterScans = Number(refreshed?.scans || 0)
    if (afterScans > beforeScans) {
      break
    }
  }

  if (afterScans <= beforeScans) {
    fail(`QR scan count did not increase (before=${beforeScans}, after=${afterScans})`)
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        vehicleId: target.vehicleId,
        routeId: target.routeId,
        beforeScans,
        afterScans,
        increment: afterScans - beforeScans,
      },
      null,
      2,
    ),
  )
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : 'Unknown error')
})
