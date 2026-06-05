import { expect, test } from '@playwright/test'

async function seedPanelSession(page: import('@playwright/test').Page) {
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
}

test('header search shows vehicle and lead results', async ({ page }) => {
  await seedPanelSession(page)
  await page.route('**/api/panel/qr-codes', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        vehicles: [],
        recentScans: [],
      }),
    })
  })

  await page.route('**/api/panel/vehicles', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        items: [
          {
            id: 'veh-001',
            brand: 'BMW',
            model: '320i',
            variant: 'M Sport',
            year: 2024,
            price: 2450000,
            mileage: 12000,
            fuel: 'Benzin',
            transmission: 'Otomatik',
            color: 'Siyah',
            status: 'active',
            scans: 10,
            leads: 2,
            image: null,
            photos: [],
          },
        ],
      }),
    })
  })

  await page.route('**/api/panel/leads', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        items: [
          {
            id: 'lead-001',
            customerName: 'Ali Demir',
            customerPhone: '05301234567',
            customerEmail: 'ali@example.com',
            source: 'qr',
            status: 'yeni',
            notes: [],
            vehicleTitle: 'BMW 320i M Sport',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      }),
    })
  })

  await page.route('**/api/panel/alerts', async (route) => {
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
  await page.getByPlaceholder('Araç, müşteri veya QR kodu ara...').click()

  const commandInput = page.getByPlaceholder('Araç, müşteri veya telefon ara...')
  await expect(commandInput).toBeVisible()
  await commandInput.fill('BMW')

  await expect(page.getByText('BMW 320i M Sport')).toBeVisible()
  await expect(page.getByText('Ali Demir')).toBeVisible()
})

test('header notifications dropdown shows active alerts', async ({ page }) => {
  await seedPanelSession(page)
  await page.route('**/api/panel/qr-codes', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        vehicles: [],
        recentScans: [],
      }),
    })
  })

  await page.route('**/api/panel/alerts', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        source: 'supabase',
        generatedAt: new Date().toISOString(),
        summary: { open: 1, critical: 1, high: 0, medium: 0, low: 0 },
        alerts: [
          {
            id: 'alert-001',
            type: 'lead_drop',
            severity: 'critical',
            title: 'Lead düşüşü algılandı',
            description: 'Son 7 günde lead düşüşü var.',
            metricValue: '%-35',
            threshold: '%-20',
            actionLabel: 'Leadleri aç',
            actionHref: '/panel/leadler',
            createdAt: new Date().toISOString(),
          },
        ],
      }),
    })
  })

  await page.goto('/panel/qr-kodlar')
  await page.getByRole('button', { name: 'Bildirimler' }).click()

  await expect(page.getByText('Canlı Uyarılar')).toBeVisible()
  await expect(page.getByText('Lead düşüşü algılandı')).toBeVisible()
})
