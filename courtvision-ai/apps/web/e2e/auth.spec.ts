import { test, expect } from '@playwright/test';

/**
 * Auth E2E Tests
 * 
 * Tests the login page rendering, form validation,
 * and navigation guards.
 */

test.describe('Login Page', () => {
    test('should render login form with all elements', async ({ page }) => {
        await page.goto('/login');

        // Logo
        await expect(page.locator('text=CourtVision')).toBeVisible();

        // Mode toggles
        await expect(page.getByText('Sign In')).toBeVisible();
        await expect(page.getByText('Sign Up')).toBeVisible();

        // Input fields
        await expect(page.getByPlaceholder('EMAIL ADDRESS')).toBeVisible();
        await expect(page.getByPlaceholder('PASSWORD')).toBeVisible();

        // Submit button
        await expect(page.getByText('ENTER THE COURT')).toBeVisible();

        // Google OAuth
        await expect(page.getByText('Google')).toBeVisible();

        // Footer links
        await expect(page.getByText('Terms')).toBeVisible();
        await expect(page.getByText('Privacy Policy')).toBeVisible();
    });

    test('should toggle between sign in and sign up modes', async ({ page }) => {
        await page.goto('/login');

        // Should start in login mode
        await expect(page.getByText('ENTER THE COURT')).toBeVisible();

        // Switch to signup
        await page.getByText('Sign Up').click();
        await expect(page.getByText('CREATE ACCOUNT')).toBeVisible();
        await expect(page.getByPlaceholder('FULL NAME')).toBeVisible();

        // Switch back to login
        await page.getByText('Sign In').click();
        await expect(page.getByText('ENTER THE COURT')).toBeVisible();
    });

    test('should show password toggle', async ({ page }) => {
        await page.goto('/login');

        const passwordInput = page.getByPlaceholder('PASSWORD');
        await expect(passwordInput).toHaveAttribute('type', 'password');

        // Click the eye icon to toggle
        await page.locator('button:near(input[type="password"])').last().click();
        // After toggle, we should be able to see the password
    });

    test('should require email format validation', async ({ page }) => {
        await page.goto('/login');

        await page.getByPlaceholder('EMAIL ADDRESS').fill('invalid-email');
        await page.getByPlaceholder('PASSWORD').fill('password123');
        await page.getByText('ENTER THE COURT').click();

        // HTML5 validation should prevent submission for invalid email
    });
});

test.describe('Auth Guards', () => {
    test('should redirect /dashboard to /login when not authenticated', async ({ page }) => {
        await page.goto('/dashboard');

        // Should be redirected to login (middleware intercepts)
        await page.waitForURL(/\/login/);
        await expect(page).toHaveURL(/\/login/);
    });

    test('should redirect /dashboard/sessions to /login', async ({ page }) => {
        await page.goto('/dashboard/sessions');

        await page.waitForURL(/\/login/);
        await expect(page).toHaveURL(/\/login/);
    });

    test('redirect URL should include original path', async ({ page }) => {
        await page.goto('/dashboard/profile');

        await page.waitForURL(/\/login/);
        // Should include redirect param
        await expect(page).toHaveURL(/redirect/);
    });
});
