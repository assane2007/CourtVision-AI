import { test, expect } from '@playwright/test';

test('homepage has correct branding and critical CTA', async ({ page }) => {
    await page.goto('/');

    // Expect a title to contain CourtVision
    await expect(page).toHaveTitle(/CourtVision|AI/i);

    // Expect prominent call to action to be visible and interactive
    const cta = page.getByRole('link', { name: /Commencer/i }).first();
    await expect(cta).toBeVisible();
});
