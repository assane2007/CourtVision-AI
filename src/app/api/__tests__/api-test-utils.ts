import { NextRequest } from 'next/server';

/**
 * Helper to create a mock NextRequest for testing API routes.
 */
export function createMockRequest(
  body?: object,
  searchParams?: Record<string, string>,
  headers?: Record<string, string>,
  method: string = 'GET',
): NextRequest {
  const url = new URL('http://localhost:3000/api/test')
  if (searchParams) {
    Object.entries(searchParams).forEach(([k, v]) => url.searchParams.set(k, v))
  }
  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  }
  if (body) {
    init.body = JSON.stringify(body)
  }
  return new NextRequest(url, init as ConstructorParameters<typeof NextRequest>[1])
}