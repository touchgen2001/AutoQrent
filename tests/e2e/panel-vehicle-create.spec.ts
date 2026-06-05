import { expect, test } from '@playwright/test'

test('panel vehicle creation wizard completes and returns to vehicle list', async ({ page }) => {
  test.setTimeout(120_000)
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

  await page.route('**/api/panel/uploads/vehicle-images**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        source: 'supabase',
        items: [
          {
            path: 'panel/test-1.jpeg',
            publicUrl: 'https://example.com/panel/test-1.jpeg',
            name: 'test-1.jpeg',
            size: 128,
            mimeType: 'image/jpeg',
          },
          {
            path: 'panel/test-2.jpeg',
            publicUrl: 'https://example.com/panel/test-2.jpeg',
            name: 'test-2.jpeg',
            size: 128,
            mimeType: 'image/jpeg',
          },
          {
            path: 'panel/test-3.jpeg',
            publicUrl: 'https://example.com/panel/test-3.jpeg',
            name: 'test-3.jpeg',
            size: 128,
            mimeType: 'image/jpeg',
          },
        ],
      }),
    })
  })

  await page.route('**/api/panel/vehicles**', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          source: 'supabase',
          items: [],
        }),
      })
      return
    }

    if (route.request().method() !== 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        item: { id: 'veh-test-001' },
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

  await page.goto('/panel/araclar/ekle')
  await expect(page.getByRole('heading', { name: 'Yeni Araç Ekle' })).toBeVisible()

  await page.getByText('Marka *').locator('..').getByRole('combobox').click()
  await page.getByRole('option', { name: 'BMW' }).click()
  await page.locator('#model').fill('3 Serisi')
  await page.locator('#variant').fill('320i Test')
  await page.locator('#price').fill('2450000')
  await page.getByText('Model Yılı *').locator('..').getByRole('combobox').click()
  await page.getByRole('option', { name: '2024' }).click()

  await page.getByRole('button', { name: 'Devam Et' }).click()
  await expect(page.getByRole('heading', { name: 'Araç Detayları' })).toBeVisible()
  await page.locator('#mileage').fill('45000')
  const detailSelects = page.getByRole('combobox')
  await detailSelects.nth(0).click()
  await page.getByRole('option', { name: 'Benzin' }).click()
  await detailSelects.nth(1).click()
  await page.getByRole('option', { name: /^Otomatik$/ }).click()
  await page.getByRole('button', { name: 'Devam Et' }).click()
  await expect(page.getByRole('heading', { name: 'Araç Fotoğrafları' })).toBeVisible()

  await page.locator('input[type="file"]').setInputFiles([
    {
      name: 'test-1.jpeg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from([1, 2, 3]),
    },
    {
      name: 'test-2.jpeg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from([1, 2, 3, 4]),
    },
    {
      name: 'test-3.jpeg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from([1, 2, 3, 4, 5]),
    },
  ])

  await expect(page.getByText('Yüklenen: 3 / 30')).toBeVisible()
  await page.getByRole('button', { name: 'Devam Et' }).click()
  await expect(page.getByRole('heading', { name: 'Ekspertiz Bilgileri' })).toBeVisible()

  await page.getByRole('button', { name: 'Aracı Kaydet' }).click()
  await expect(page).toHaveURL(/\/panel\/araclar$/)
})
