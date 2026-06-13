import { expect, test } from '@playwright/test'

test('selected QR rows can be exported from panel', async ({ page }) => {
  await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        session: {
          userId: 'test-user',
          email: 'owner@example.com',
          fullName: 'Test Owner',
          galleryId: 'gal_test',
          galleryName: 'Test Gallery',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
      }),
    })
  })

  await page.route('**/api/panel/qr-codes**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        vehicles: [
          {
            vehicleId: 'veh-001',
            routeId: 'bmw-320i-2024',
            vehicleTitle: 'BMW 320i M Sport',
            price: 2450000,
            qrCode: 'QR-001',
            scans: 12,
            lastScanAt: new Date().toISOString(),
          },
        ],
        recentScans: [],
      }),
    })
  })
  await page.route('**/api/panel/alerts**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        source: 'supabase',
        generatedAt: new Date().toISOString(),
        summary: { open: 0, critical: 0, high: 0, medium: 0, low: 0 },
        alerts: [],
      }),
    })
  })

  await page.goto('/panel/qr-kodlar')
  await page.waitForResponse((response) => response.url().includes('/api/panel/qr-codes') && response.ok())
  await expect(page.getByRole('heading', { name: 'QR Kodlar' })).toBeVisible()
  await expect(page.getByText('BMW 320i M Sport')).toBeVisible()
  await expect(page.getByRole('button', { name: 'İndir (0)' })).toBeVisible()

  await page.getByLabel('Tümünü Seç').click()
  await expect(page.getByRole('button', { name: 'İndir (1)' })).toBeVisible()
  await page.getByRole('button', { name: 'İndir (1)' }).click()

  await expect(page.getByText('1 QR kaydı indirildi.')).toBeVisible()
})
