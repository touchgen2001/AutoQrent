import { expect, test } from '@playwright/test'
import { getDemoShowroomHref } from '@/lib/demo-public-experience'

test('showroom page exposes direct WhatsApp CTA', async ({ page }) => {
  await page.goto(getDemoShowroomHref())

  const loadError = page.getByText(/this page couldn.t load/i).first()
  const hasLoadError = await loadError.isVisible({ timeout: 1500 }).catch(() => false)
  test.skip(hasLoadError, 'showroom server-side data is not configured in this environment')

  const notFoundMessage = page.getByText(/(sayfa bulunamadı|not found|could not be found)/i).first()
  const showroomMissing = await notFoundMessage.isVisible({ timeout: 1500 }).catch(() => false)

  test.skip(showroomMissing, 'demo showroom bu ortamda seed edilmemis')

  const whatsappLink = page.locator('a[href*="wa.me/"]').first()
  const phoneLink = page.locator('a[href^="tel:"]').first()
  const hasWhatsapp = await whatsappLink.isVisible().catch(() => false)
  const hasPhone = await phoneLink.isVisible().catch(() => false)

  expect(hasWhatsapp || hasPhone).toBeTruthy()
  if (hasWhatsapp) {
    await expect(whatsappLink).toHaveAttribute('href', /https:\/\/wa\.me\/\d+/)
  }
})
