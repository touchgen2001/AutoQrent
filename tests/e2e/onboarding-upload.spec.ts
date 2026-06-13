import path from 'node:path'
import { expect, test } from '@playwright/test'

test('onboarding logo upload preview and map preview work', async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear())
  await page.goto('/onboarding')

  await page.getByLabel('Galeri Adı').fill('Test Galeri')

  const logoInput = page.locator('input[type="file"]').first()
  const logoFilePath = path.resolve(process.cwd(), 'public/logo-placeholder.png')
  await logoInput.setInputFiles(logoFilePath)

  await expect(page.getByAltText('Yüklenen galeri logosu')).toBeVisible()

  await page.getByRole('button', { name: 'Devam Et' }).click()
  await page.getByLabel('Telefon').fill('05309738240')

  await page.getByRole('button', { name: 'Devam Et' }).click()
  await page.getByLabel('İl', { exact: true }).fill('İstanbul')
  await page.getByLabel('İlçe').fill('Kadıköy')
  await page.getByLabel('Açık Adres').fill('Moda Caddesi No:10')
  await page.getByLabel('Enlem (Latitude)').fill('41.008240')
  await page.getByLabel('Boylam (Longitude)').fill('28.978359')

  const mapFrame = page.locator('iframe[title="Galeri konum haritası"]')
  await expect(mapFrame).toBeVisible({ timeout: 10000 })
})
