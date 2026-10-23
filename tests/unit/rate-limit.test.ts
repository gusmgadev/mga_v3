import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const limitMock = vi.hoisted(() =>
  vi.fn(async () => ({ success: true, remaining: 4, reset: 1000 })),
)

vi.mock('@upstash/redis', () => ({ Redis: class Redis {} }))
vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: class Ratelimit {
    static slidingWindow = () => 'sliding-window'
    limit = limitMock
  },
}))

describe('rate limit (Upstash, P-02)', () => {
  beforeEach(() => {
    limitMock.mockClear()
    limitMock.mockResolvedValue({ success: true, remaining: 4, reset: 1000 })
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://redis.test.local')
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'token-de-prueba')
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('sin configuración clara: error explícito, nunca fallback', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '')
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '')
    const { rateLimitLoginPorIp } = await import('@/lib/shared/rate-limit')
    await expect(rateLimitLoginPorIp('1.2.3.4')).rejects.toThrow(
      /UPSTASH_REDIS_REST/,
    )
  })

  it('consume el contador por IP y devuelve el resultado', async () => {
    const { rateLimitLoginPorIp } = await import('@/lib/shared/rate-limit')
    const resultado = await rateLimitLoginPorIp('1.2.3.4')
    expect(resultado).toEqual({ ok: true, restante: 4, resetMs: 1000 })
    expect(limitMock).toHaveBeenCalledTimes(1)
  })

  it('cuando Upstash rechaza, el resultado es bloqueo', async () => {
    limitMock.mockResolvedValue({ success: false, remaining: 0, reset: 2000 })
    const { rateLimitLoginPorEmail } = await import('@/lib/shared/rate-limit')
    const resultado = await rateLimitLoginPorEmail('persona@test.local')
    expect(resultado.ok).toBe(false)
    expect(resultado.restante).toBe(0)
  })
})
