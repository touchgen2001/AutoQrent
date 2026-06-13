import { expect, test } from '@playwright/test'

test('pricing switches between monthly and yearly billing', async ({ page }) => {
  await page.goto('/fiyatlar')

  await expect(page.getByText('₺999', { exact: true }).first()).toBeVisible()

  await page.getByRole('button', { name: /Yıllık/ }).click()

  await expect(page.getByText('₺9.990', { exact: true })).toBeVisible()
  await expect(page.getByText('Aylığa göre 2 ay avantaj').first()).toBeVisible()

  const starterLink = page.locator('#fiyatlar').getByRole('link', { name: '14 Gün Ücretsiz Başla' }).first()
  await expect(starterLink).toHaveAttribute('href', /billing=yearly/)
})
