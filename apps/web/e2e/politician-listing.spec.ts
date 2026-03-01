import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Politician Listing Page', () => {
  test('loads the listing page with politician cards', async ({ page }) => {
    await page.goto('/politicos')
    await expect(page.getByRole('heading', { name: 'Políticos' })).toBeVisible()
    // At least one card should be present (requires seeded DB)
    const cards = page.getByRole('article')
    await expect(cards.first()).toBeVisible()
  })

  test('each card displays required fields', async ({ page }) => {
    await page.goto('/politicos')
    const firstCard = page.getByRole('article').first()
    // Score in XX/100 format
    await expect(firstCard.getByText(/\d+\/100/)).toBeVisible()
    // Has a link to profile
    await expect(firstCard.getByRole('link')).toBeVisible()
  })

  test('pagination: next page link appears and works', async ({ page }) => {
    await page.goto('/politicos')
    const nextLink = page.getByRole('link', { name: /próxima/i })
    if (await nextLink.isVisible()) {
      await nextLink.click()
      await expect(page).toHaveURL(/cursor=/)
      await expect(page.getByRole('article').first()).toBeVisible()
    }
  })

  test('has no accessibility violations', async ({ page }) => {
    await page.goto('/politicos')
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })
})
