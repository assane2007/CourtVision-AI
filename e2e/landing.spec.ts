import { test, expect } from '@playwright/test';
 test.describe('Landing Page', () => {
  test('page loads with 200 status', async ({ page }) => {
    const response = await page.goto('/')
    expect(response?.status()).toBe(200)
  })

  test('shows basketball or coaching content', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    // Landing page should have at least one of these keywords
    const body = await page.textContent('body')
    expect(body).toBeTruthy()
    const hasContent = body!.includes('Basketball') ||
                       body!.includes('basketball') ||
                       body!.includes('Coach') ||
                       body!.includes('CourtVision')
    expect(hasContent).toBeTruthy()
  })

  test('has a call-to-action button', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    // Should have at least one button
    const buttons = page.locator('button')
    const count = await buttons.count()
    expect(count).toBeGreaterThan(0)
  })
})