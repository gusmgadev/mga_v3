import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const rpcMock = vi.hoisted(() =>
  vi.fn(
    async (): Promise<{ data: unknown; error: unknown }> => ({
      data: [{ ok: true, restante: 4, reset_ms: 1000 }],
      error: null,
    }),
  ),
)

vi.mock('@/lib/private/supabase-admin', () => ({
  supabaseAdmin: () => ({ rpc: rpcMock }),
}))

describe('rate limit (Postgres, P-02 decisión B)', () => {
  beforeEach(() => {
    rpcMock.mockClear()
    rpcMock.mockResolvedValue({
      data: [{ ok: true, restante: 4, reset_ms: 1000 }],
      error: null,
    })
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('consume el contador por IP con la RPC y mapea el resultado', async () => {
    const { rateLimitLoginPorIp } = await import('@/lib/private/rate-limit')
    const resultado = await rateLimitLoginPorIp('1.2.3.4')
    expect(resultado).toEqual({ ok: true, restante: 4, resetMs: 1000 })
    expect(rpcMock).toHaveBeenCalledWith('rate_limit_consumir', {
      p_prefix: 'login-ip',
      p_identificador: '1.2.3.4',
      p_limite: 10,
      p_ventana_ms: 5 * 60 * 1000,
    })
  })

  it('cuando la RPC responde bloqueo, el resultado es bloqueo', async () => {
    rpcMock.mockResolvedValue({
      data: [{ ok: false, restante: 0, reset_ms: 2000 }],
      error: null,
    })
    const { rateLimitLoginPorEmail } = await import('@/lib/private/rate-limit')
    const resultado = await rateLimitLoginPorEmail('persona@test.local')
    expect(resultado.ok).toBe(false)
    expect(resultado.restante).toBe(0)
    expect(rpcMock).toHaveBeenCalledWith('rate_limit_consumir', {
      p_prefix: 'login-email',
      p_identificador: 'persona@test.local',
      p_limite: 5,
      p_ventana_ms: 5 * 60 * 1000,
    })
  })

  it('error de la RPC: lanza (fail-closed, sin fallback)', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'relation missing' } })
    const { rateLimitLoginPorIp } = await import('@/lib/private/rate-limit')
    await expect(rateLimitLoginPorIp('1.2.3.4')).rejects.toThrow(/Rate limit no disponible/)
  })

  it('respuesta vacía de la RPC: lanza (fail-closed)', async () => {
    rpcMock.mockResolvedValue({ data: [], error: null })
    const { rateLimitLoginPorIp } = await import('@/lib/private/rate-limit')
    await expect(rateLimitLoginPorIp('1.2.3.4')).rejects.toThrow(/respuesta inválida/)
  })

  it('rateLimitOlvide usa prefijo y ventana propios', async () => {
    const { rateLimitOlvide } = await import('@/lib/private/rate-limit')
    await rateLimitOlvide('persona@test.local')
    expect(rpcMock).toHaveBeenCalledWith('rate_limit_consumir', {
      p_prefix: 'olvide-password',
      p_identificador: 'persona@test.local',
      p_limite: 3,
      p_ventana_ms: 15 * 60 * 1000,
    })
  })
})
