import { describe, it, expect, vi } from 'vitest';
 vi.mock('z-ai-web-dev-sdk', () => ({ default: { create: vi.fn() } }))
vi.mock('@/lib/logger', () => ({ logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))

describe('createSSETransformStream', () => {
  it('creates a valid TransformStream', async () => {
    const { createSSETransformStream } = await import(
      '@/lib/ai/providers/language.provider'
    )
    const stream = createSSETransformStream()
    expect(stream.readable).toBeDefined()
    expect(stream.writable).toBeDefined()
  })

  it('parses SSE data lines into standardized format', async () => {
    const { createSSETransformStream } = await import(
      '@/lib/ai/providers/language.provider'
    )
    const enc = new TextEncoder()
    const dec = new TextDecoder()
    const ts = createSSETransformStream()
    const w = ts.writable.getWriter()
    const r = ts.readable.getReader()

    const readAll = async (): Promise<string> => {
      const parts: string[] = []
      for (;;) {
        const { done, value } = await r.read()
        if (done) break
        parts.push(dec.decode(value, { stream: true }))
      }
      return parts.join('')
    }

    const outputPromise = readAll()
    await w.write(enc.encode(`data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n`))
    await w.close()
    const output = await outputPromise
    expect(output).toContain('"content":"Hello"')
  })

  it('emits [DONE] on stream close', async () => {
    const { createSSETransformStream } = await import(
      '@/lib/ai/providers/language.provider'
    )
    const ts = createSSETransformStream()
    const w = ts.writable.getWriter()
    const r = ts.readable.getReader()
    const dec = new TextDecoder()

    const readAll = async (): Promise<string> => {
      const parts: string[] = []
      for (;;) {
        const { done, value } = await r.read()
        if (done) break
        parts.push(dec.decode(value, { stream: true }))
      }
      return parts.join('')
    }

    const outputPromise = readAll()
    await w.write(new TextEncoder().encode(''))
    await w.close()
    const output = await outputPromise
    expect(output).toContain('data: [DONE]')
  })
})