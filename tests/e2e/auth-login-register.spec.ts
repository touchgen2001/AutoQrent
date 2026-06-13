import { expect, test } from '@playwright/test'

const AUTH_SESSION = {
  userId: 'usr_test_1',
  email: 'test@galeri.com',
  fullName: 'Test Kullanici',
  galleryId: 'gal_test_1',
  galleryName: 'Test Galeri',
  expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
}

test('register flow redirects to onboarding when form is valid', async ({ page }) => {
  await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ ok: false, message: 'Oturum bulunamadi.' }),
    })
  })

  await page.route('**/api/auth/register', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, session: AUTH_SESSION }),
    })
  })

  await page.goto('/kayit')

  await page.getByLabel('Galeri Adı').fill('Test Galeri')
  await page.getByLabel('Ad Soyad').fill('Test Kullanici')
  await page.getByLabel('E-posta').fill('test@galeri.com')
  await page.getByLabel('Telefon').fill('05301234567')
  await page.getByLabel('Şifre').fill('StrongPass123')
  await page.getByLabel(/Kullanım Koşulları/).click()

  await page.getByRole('button', { name: 'Ücretsiz Başla' }).click()
  await expect(page).toHaveURL(/\/onboarding$/)
})

test('login shows error for invalid credentials', async ({ page }) => {
  await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ ok: false, message: 'Oturum bulunamadi.' }),
    })
  })

  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ ok: false, message: 'E-posta veya sifre hatali.' }),
    })
  })

  await page.goto('/giris')
  await page.getByLabel('E-posta').fill('yanlis@galeri.com')
  await page.getByLabel('Şifre').fill('WrongPass123')
  await page.getByRole('button', { name: 'Giriş Yap' }).click()

  await expect(page.getByText('E-posta veya sifre hatali.')).toBeVisible()
})

test('login succeeds and opens requested panel page', async ({ page }) => {
  let isLoggedIn = false

  await page.route('**/api/auth/session', async (route) => {
    if (isLoggedIn) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, session: AUTH_SESSION }),
      })
      return
    }

    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ ok: false, message: 'Oturum bulunamadi.' }),
    })
  })

  await page.route('**/api/auth/login', async (route) => {
    isLoggedIn = true
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, session: AUTH_SESSION }),
    })
  })

  await page.route('**/api/panel/qr-codes**', async (route) => {
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

  await page.goto('/giris?next=/panel/qr-kodlar')
  await page.getByLabel('E-posta').fill('test@galeri.com')
  await page.getByLabel('Şifre').fill('StrongPass123')
  await page.getByRole('button', { name: 'Giriş Yap' }).click()

  await expect(page).toHaveURL(/\/panel\/qr-kodlar$/)
  await expect(page.getByRole('heading', { name: 'QR Kodlar' })).toBeVisible()
})

test('forgot password sends reset request', async ({ page }) => {
  await page.route('**/api/auth/forgot-password', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, message: 'Sifre sifirlama baglantisi e-posta adresinize gonderildi.' }),
    })
  })

  await page.goto('/sifremi-unuttum')
  await page.getByLabel('E-posta').fill('reset@galeri.com')
  await page.getByRole('button', { name: 'Sifre Yenileme Baglantisi Gonder' }).click()
  await expect(page.getByText('Sifre sifirlama baglantisi e-posta adresinize gonderildi.')).toBeVisible()
})
