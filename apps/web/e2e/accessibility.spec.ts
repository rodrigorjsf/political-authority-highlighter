import { test, expect, type Page, type TestInfo } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

async function checkA11y(page: Page, testInfo: TestInfo): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  await testInfo.attach('a11y-results', {
    body: JSON.stringify(results, null, 2),
    contentType: 'application/json',
  })
  const fingerprint = results.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    targets: v.nodes.map((n) => n.target),
  }))
  expect(fingerprint, `Violations on ${page.url()}`).toEqual([])
}

test.describe('Accessibility — WCAG 2.1 AA', () => {
  test('listagem de políticos', async ({ page }, testInfo) => {
    await page.goto('/politicos')
    await checkA11y(page, testInfo)
  })

  test('página de metodologia', async ({ page }, testInfo) => {
    await page.goto('/metodologia')
    await checkA11y(page, testInfo)
  })

  test('página de fontes de dados', async ({ page }, testInfo) => {
    await page.goto('/fontes')
    await checkA11y(page, testInfo)
  })

  test.skip('perfil de político — requer DB populado', async ({ page }, testInfo) => {
    await page.goto('/politicos/joao-silva-sp')
    await checkA11y(page, testInfo)
  })
})
