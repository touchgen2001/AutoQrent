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
          role: 'owner',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
      }),
    })
  })
  await page.route('**/api/panel/settings', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: false }) })
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
}

test('vehicles page shows stock aging and bulk import workflow', async ({ page }) => {
  await seedPanelSession(page)
  await page.route('**/api/panel/gallery-identity', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, gallery: null }) })
  })
  await page.route('**/api/panel/vehicles', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        items: [{
          id: 'vehicle-1',
          brand: 'BMW',
          model: '320i',
          variant: 'M Sport',
          year: 2022,
          price: 2200000,
          mileage: 45000,
          fuel: 'Benzin',
          transmission: 'Otomatik',
          color: 'Siyah',
          status: 'active',
          scans: 12,
          leads: 3,
          image: null,
          photos: [],
          createdAt: new Date(Date.now() - 95 * 24 * 60 * 60 * 1000).toISOString(),
        }],
      }),
    })
  })

  await page.goto('/panel/araclar')
  await expect(page.getByText('90+ gün')).toBeVisible()
  await expect(page.getByText('95 gün')).toBeVisible()
  await expect(page.getByText('Fiyat Revizyon Adayı')).toBeVisible()
  await expect(page.getByText('Referans eksik')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Araçları CSV İndir' })).toBeVisible()
  await page.getByRole('button', { name: 'Excel / CSV Aktar' }).click()
  await expect(page.getByRole('heading', { name: 'Toplu Araç Aktarımı' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Excel Şablonunu İndir' })).toBeVisible()
})

test('leads page filters daily work and displays activity timeline', async ({ page }) => {
  await seedPanelSession(page)
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date())
  await page.route('**/api/panel/leads/lead-1/activity', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        items: [{
          id: 'created-lead-1',
          type: 'created',
          title: 'Müşteri talebi oluşturuldu',
          description: 'BMW 320i',
          createdAt: new Date().toISOString(),
        }],
      }),
    })
  })
  await page.route('**/api/panel/leads', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        items: [{
          id: 'lead-1',
          customerName: 'Ali Demir',
          customerPhone: '05301234567',
          source: 'qr',
          status: 'yeni',
          notes: [],
          vehicleTitle: 'BMW 320i',
          followUpDate: today,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }],
      }),
    })
  })

  await page.goto('/panel/leadler?view=today')
  await expect(page.getByText('Bugün aranacak müşteriler')).toBeVisible()
  await expect(page.getByText('Atanmamış lead')).toBeVisible()
  await expect(page.getByText('Ali Demir')).toBeVisible()
  await expect(page.getByText(/(?:Sıcak|Ilık|Soğuk) · \d+/)).toBeVisible()
  await page.getByText('Ali Demir').click()
  await expect(page.getByText('Lead Atama')).toBeVisible()
  await expect(page.getByText('Müşteri Kartı / CRM Geçmişi')).toBeVisible()
  await expect(page.getByText(/Risk puanı:/)).toBeVisible()
  await expect(page.getByText('Müşteri Aktivite Zaman Çizelgesi')).toBeVisible()
  await expect(page.getByText('Müşteri talebi oluşturuldu')).toBeVisible()
})

test('calendar page manages appointments and post-sale follow-ups', async ({ page }) => {
  await seedPanelSession(page)
  await page.route('**/api/panel/tasks', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        items: [{
          id: 'task-1',
          type: 'appointment',
          status: 'open',
          title: 'BMW 320i test sürüşü',
          scheduledAt: '2099-06-18T10:00:00.000Z',
          customerName: 'Ali Demir',
          customerPhone: '05301234567',
          vehicleTitle: 'BMW 320i',
          createdAt: new Date().toISOString(),
        }],
      }),
    })
  })
  await page.route('**/api/panel/leads', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, items: [] }) })
  })

  await page.goto('/panel/takvim')
  await expect(page.getByRole('heading', { name: 'Takvim & Takip' })).toBeVisible()
  await expect(page.getByText('BMW 320i test sürüşü')).toBeVisible()
  await expect(page.getByText('Yaklaşanlar (1)')).toBeVisible()
  await page.getByRole('button', { name: 'Yeni Kayıt' }).click()
  await expect(page.getByRole('heading', { name: 'Randevu veya Takip Oluştur' })).toBeVisible()
  await page.getByRole('combobox').first().click()
  await expect(page.getByRole('option', { name: 'Satış Sonrası Takip' })).toBeVisible()
})

test('vehicle offer page prepares a printable customer offer', async ({ page }) => {
  await seedPanelSession(page)
  await page.route('**/api/panel/vehicles/vehicle-1', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        item: {
          id: 'vehicle-1',
          brand: 'BMW',
          model: '320i',
          variant: 'M Sport',
          year: 2022,
          price: 2200000,
          mileage: 45000,
          fuel: 'Benzin',
          transmission: 'Otomatik',
          color: 'Siyah',
          status: 'active',
          scans: 12,
          leads: 3,
          image: null,
          photos: [],
          createdAt: new Date().toISOString(),
        },
      }),
    })
  })
  await page.route('**/api/panel/gallery-identity', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        gallery: {
          name: 'Test Gallery',
          logo: null,
          phone: '05301234567',
          city: 'İstanbul',
          showroomUrl: 'https://test.cebindegaleri.com',
        },
      }),
    })
  })

  await page.goto('/panel/araclar/vehicle-1/teklif')
  await expect(page.getByRole('heading', { name: /2022 BMW 320i M Sport/ })).toBeVisible()
  await expect(page.getByText('Araç Satış Teklifi')).toBeVisible()
  await expect(page.getByRole('button', { name: 'PDF Olarak Yazdır' })).toBeVisible()
  await page.getByLabel('Müşteri Adı').fill('Ayşe Yılmaz')
  await page.getByLabel('İndirim (TL)').fill('50000')
  await expect(page.getByText('Ayşe Yılmaz')).toBeVisible()
  await expect(page.getByText('₺2.150.000')).toBeVisible()
})

test('settings location picker resolves address without coordinate inputs', async ({ page }) => {
  await seedPanelSession(page)
  await page.route('**/api/panel/settings', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        settings: {
          galleryId: 'gal_test',
          name: 'Test Gallery',
          slug: 'test-gallery-secure',
          phone: '05301234567',
          whatsapp: '905301234567',
          email: 'owner@example.com',
          logoUrl: '',
          address: 'Caferağa Mahallesi Moda Caddesi No 10',
          city: 'İstanbul',
          district: 'Kadıköy',
          latitude: null,
          longitude: null,
          googleMapsUrl: '',
          workingHours: { weekdays: '09:00 - 19:00', saturday: '09:00 - 17:00', sunday: 'Kapalı' },
          websiteUrl: '',
          socialMedia: { instagram: '', facebook: '', youtube: '', twitter: '' },
          publicThemeStorageReady: false,
          vehicleCount: 0,
          activeVehicleCount: 0,
        },
      }),
    })
  })
  await page.route('**/api/panel/subscription', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        subscription: {
          galleryId: 'gal_test',
          planCode: 'pro',
          planName: 'Pro',
          status: 'active',
          effectiveStatus: 'active',
          billingInterval: 'monthly',
          trialStartedAt: null,
          trialEndsAt: null,
          currentPeriodStart: null,
          currentPeriodEnd: null,
          paymentStatus: 'not_connected',
          provider: 'manual',
          isTrialActive: false,
          isTrialExpired: false,
          isMutationAllowed: true,
          requiresPlanSelection: false,
          usage: {
            vehicles: { used: 0, limit: 75, remaining: 75 },
            users: { used: 1, limit: 3, remaining: 2 },
          },
          features: { 'team.manage': false },
        },
        catalog: {
          plans: {},
        },
      }),
    })
  })
  await page.route('**/api/public/geocode', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        item: {
          latitude: 40.9876,
          longitude: 29.0264,
          displayName: 'Moda, Kadıköy, İstanbul',
        },
      }),
    })
  })

  await page.goto('/panel/ayarlar?tab=profile')
  await expect(page.getByText('Dükkan Konumu')).toBeVisible()
  await expect(page.getByLabel('Enlem (Latitude)')).toHaveCount(0)
  await expect(page.getByLabel('Boylam (Longitude)')).toHaveCount(0)
  await page.getByRole('button', { name: 'Adresten Bul' }).click()
  await expect(page.getByText('Adres haritada bulundu. Noktayı kontrol edip kaydedin.')).toBeVisible()
  await expect(page.getByText('Seçilen nokta: 40.98760, 29.02640')).toBeVisible()
})

test('reservation, review, and vehicle recovery pages expose their management actions', async ({ page }) => {
  await seedPanelSession(page)
  const now = new Date().toISOString()

  await page.route('**/api/panel/reservations', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        items: [{
          id: 'reservation-1',
          galleryId: 'gal_test',
          vehicleId: 'vehicle-1',
          vehicleTitle: '2022 BMW 320i M Sport',
          customerName: 'Ali Demir',
          customerPhone: '05301234567',
          customerEmail: null,
          note: 'Hafta sonu görmek istiyorum.',
          status: 'pending',
          depositAmount: 0,
          paymentStatus: 'unpaid',
          handledByEmail: null,
          createdAt: now,
          updatedAt: now,
        }],
      }),
    })
  })
  await page.route('**/api/panel/reviews', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        items: [{
          id: 'review-1',
          galleryId: 'gal_test',
          customerName: 'Ayşe Yılmaz',
          customerEmail: null,
          rating: 5,
          comment: 'Araç teslimatı hızlı ve şeffaftı.',
          status: 'pending',
          moderatedByEmail: null,
          createdAt: now,
          updatedAt: now,
        }],
      }),
    })
  })
  await page.route('**/api/panel/vehicles/trash', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        items: [{
          id: 'vehicle-2',
          title: '2021 Audi A4',
          deletedAt: now,
          deletedByEmail: 'owner@example.com',
        }],
      }),
    })
  })

  await page.goto('/panel/rezervasyonlar')
  await expect(page.getByRole('heading', { name: 'Online Rezervasyonlar' })).toBeVisible()
  await expect(page.getByText('2022 BMW 320i M Sport')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Onayla' })).toBeVisible()

  await page.goto('/panel/yorumlar')
  await expect(page.getByRole('heading', { name: 'Galeri Yorumları' })).toBeVisible()
  await expect(page.getByText('Araç teslimatı hızlı ve şeffaftı.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Yayınla' })).toBeVisible()

  await page.goto('/panel/arsiv')
  await expect(page.getByRole('heading', { name: 'Araç Çöp Kutusu' })).toBeVisible()
  await expect(page.getByText('2021 Audi A4')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Geri Al' })).toBeVisible()
})
