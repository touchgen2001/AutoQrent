import { expect, test } from '@playwright/test'

test('landing to contact form flow works', async ({ page }) => {
  await page.route('**/api/contact', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        message: 'Mesajınız alındı. En kısa sürede size dönüş yapacağız.',
      }),
    })
  })

  await page.goto('/')

  await page.getByRole('link', { name: 'İletişim' }).first().click()
  await expect(page).toHaveURL(/\/iletisim$/)

  await page.locator('#name').fill('Test Kullanici')
  await page.locator('#email').fill('test@example.com')
  await page.locator('#phone').fill('05300000000')
  await page.locator('#subject').fill('Demo talebi')
  await page.locator('#message').fill('Bu bir otomasyon test mesajıdır ve form akışını doğrular.')

  // Contact API rejects near-instant submits to reduce bot abuse.
  await page.waitForTimeout(2600)
  await page.getByRole('button', { name: 'Mesajı Gönder' }).click()

  await expect(page.getByText(/Mesajınız/i)).toBeVisible()
})
