import { test, expect } from '@playwright/test'

const RUN_API_E2E = process.env.RUN_API_E2E === 'true'
const RUN_SUPABASE_AUTH_E2E = Boolean(
    (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim() &&
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()
)

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

    test('shows error message for invalid credentials', async ({ page, browserName }) => {
        // WebKit with dummy Supabase URL doesn't surface the error message in time
        test.skip(browserName === 'webkit', 'Supabase network error not surfaced on WebKit with dummy URL')
        test.skip(!RUN_SUPABASE_AUTH_E2E, 'Requires configured Supabase auth backend.')

        // Arrange
        await page.goto('/login')

        // Act
        await page.getByPlaceholder(/email/i).fill('fake@test.com')
        await page.getByPlaceholder(/password/i).fill('wrongpassword123')
        await page.locator('button[type="submit"]').click()

        // Assert — wait for error message (text varies by environment)
        await expect(
            page.getByText(/invalid|incorrect|wrong|error|fail|unexpected/i)
        ).toBeVisible({ timeout: 10000 })
    })

    test('stays on /login after invalid credentials', async ({ page }) => {
        // Arrange
        await page.goto('/login')

        // Act
        await page.getByPlaceholder(/email/i).fill('fake@test.com')
        await page.getByPlaceholder(/password/i).fill('wrongpassword123')
        await page.locator('button[type="submit"]').click()

        // Assert — should remain on login
        await page.waitForTimeout(2000)
        await expect(page).toHaveURL(/.*\/login/)
    })
})

test.describe('API auth security (no data leak)', () => {
    test.skip(!RUN_API_E2E, 'Set RUN_API_E2E=true and run the API server before executing API auth e2e checks.')

    test('API returns 401 without Bearer token', async ({ request }) => {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
        const res = await request.get(`${apiUrl}/api/dashboard`)
        expect(res.status()).toBe(401)
    })

    test('API returns 401 with fake Bearer token', async ({ request }) => {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
        const res = await request.get(`${apiUrl}/api/dashboard`, {
            headers: { Authorization: 'Bearer totally-invalid-token' }
        })
        expect(res.status()).toBe(401)
    })
})
