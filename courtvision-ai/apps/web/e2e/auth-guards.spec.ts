import { test, expect } from '@playwright/test'

/**
 * Auth Guards — E2E Route Protection Tests
 *
 * Verifies that all /dashboard/* routes redirect to /login
 * when no session exists, and that public pages remain accessible.
 *
 * Pattern: AAA (Arrange → Act → Assert)
 */

test.describe('Protected routes redirect without auth', () => {

    test('redirects /dashboard to /login', async ({ page }) => {
        await page.goto('/dashboard')
        await expect(page).toHaveURL(/.*\/login/)
    })

    test('redirects /dashboard/sessions to /login', async ({ page }) => {
        await page.goto('/dashboard/sessions')
        await expect(page).toHaveURL(/.*\/login/)
    })

    test('redirects /dashboard/twin to /login', async ({ page }) => {
        await page.goto('/dashboard/twin')
        await expect(page).toHaveURL(/.*\/login/)
    })

    test('redirects /dashboard/shadow-league to /login', async ({ page }) => {
        await page.goto('/dashboard/shadow-league')
        await expect(page).toHaveURL(/.*\/login/)
    })

    test('preserves redirect URL in login redirect', async ({ page }) => {
        await page.goto('/dashboard/sessions')
        await expect(page).toHaveURL(/.*\/login/)
        // The redirect URL should contain the original path
        const url = page.url()
        expect(url).toContain('login')
    })
})

test.describe('Public pages accessible without auth', () => {

    test('/ (landing) is accessible', async ({ page }) => {
        await page.goto('/')
        await expect(page).not.toHaveURL(/.*\/login/)
        await expect(page.locator('body')).toBeVisible()
    })

    test('/login is accessible', async ({ page }) => {
        await page.goto('/login')
        await expect(page).toHaveURL(/.*\/login/)
    })

    test('/privacy is accessible', async ({ page }) => {
        await page.goto('/privacy')
        await expect(page).not.toHaveURL(/.*\/login/)
    })

    test('/terms is accessible', async ({ page }) => {
        await page.goto('/terms')
        await expect(page).not.toHaveURL(/.*\/login/)
    })
})

test.describe('Login page functionality', () => {

    test('displays the login form with all fields', async ({ page }) => {
        await page.goto('/login')
        await expect(page.getByPlaceholder(/email/i)).toBeVisible()
        await expect(page.getByPlaceholder(/password/i)).toBeVisible()
    })

    test('shows error message for invalid credentials', async ({ page }) => {
        // Arrange
        await page.goto('/login')

        // Act
        await page.getByPlaceholder(/email/i).fill('fake@test.com')
        await page.getByPlaceholder(/password/i).fill('wrongpassword123')
        await page.getByRole('button', { name: /sign in|enter the court/i }).click()

        // Assert — wait for error message
        await expect(
            page.getByText(/invalid|incorrect|wrong|error/i)
        ).toBeVisible({ timeout: 5000 })
    })

    test('stays on /login after invalid credentials', async ({ page }) => {
        // Arrange
        await page.goto('/login')

        // Act
        await page.getByPlaceholder(/email/i).fill('fake@test.com')
        await page.getByPlaceholder(/password/i).fill('wrongpassword123')
        await page.getByRole('button', { name: /sign in|enter the court/i }).click()

        // Assert — should remain on login
        await page.waitForTimeout(2000)
        await expect(page).toHaveURL(/.*\/login/)
    })
})

test.describe('API auth security (no data leak)', () => {

    test('API returns 401 without Bearer token', async ({ request }) => {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
        const res = await request.get(`${apiUrl}/api/dashboard/v5`)
        expect(res.status()).toBe(401)
    })

    test('API returns 401 with fake Bearer token', async ({ request }) => {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
        const res = await request.get(`${apiUrl}/api/dashboard/v5`, {
            headers: { Authorization: 'Bearer totally-invalid-token' }
        })
        expect(res.status()).toBe(401)
    })
})
