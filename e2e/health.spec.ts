import { test, expect } from '@playwright/test'

test.describe('API Health', () => {
  test('GET /api/health returns 200 with status', async ({ request }) => {
    const res = await request.get('/api/health')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('status')
  })

  test('GET /api/privacy returns HTML content', async ({ request }) => {
    const res = await request.get('/api/privacy')
    expect(res.status()).toBe(200)
    const contentType = res.headers()['content-type']
    expect(contentType).toContain('text/html')
  })
})