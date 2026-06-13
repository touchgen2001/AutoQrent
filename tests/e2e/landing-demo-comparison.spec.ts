import { expect, test } from '@playwright/test'

test('personalized demo builder updates preview and registration link', async ({ page }) => {
  await page.goto('/demo')

  const galleryName = page.locator('#demoGalleryName')
  await galleryName.fill('Test Premium Otomotiv')

  await expect(page.getByText('Test Premium Otomotiv', { exact: true })).toBeVisible()

  const startLink = page.getByRole('link', { name: 'Bu Galeriyle Başla' })
  await expect(startLink).toHaveAttribute('href', /gallery=Test\+Premium\+Otomotiv/)
})

test('comparison and verified usage pages are reachable', async ({ page }) => {
  await page.goto('/karsilastir/galeri-yazilimi-mi-excel-mi')
  await expect(page.getByRole('heading', { name: 'Araç Galerisi İçin Yazılım mı, Excel mi?' })).toBeVisible()
  await expect(page.locator('main')).toContainText('Araç alanlarına göre yapılandırılmış kayıt')

  await page.goto('/basari-hikayeleri')
  await expect(page.getByRole('heading', { name: 'Yayındaki Galeri Vitrinlerini Doğrudan İnceleyin' })).toBeVisible()
  await expect(page.getByText(/Doğrulanamayan satış artışı/i)).toBeVisible()
})
