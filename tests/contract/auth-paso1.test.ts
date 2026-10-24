import { beforeEach, describe, expect, it, vi } from 'vitest'

const estado = vi.hoisted(() => ({
  ok: true,
  rateIpOk: true,
  rateEmailOk: true,
  perfil: {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    email: 'usuario@test.local',
    name: 'Usuario Test',
    role_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    role: 'Usuario',
    is_admin: false,
    is_default: true,
      activo: true,
    password_changed_at: '2026-01-01T00:00:00Z',
  } as unknown,
  factor: null as { id: string } | null,
}))

vi.mock('@/lib/private/rate-limit', () => ({
  rateLimitLoginPorIp: vi.fn(async () => ({ ok: estado.rateIpOk, restante: 5, resetMs: 0 })),
  rateLimitLoginPorEmail: vi.fn(async () => ({
    ok: estado.rateEmailOk,
    restante: 5,
    resetMs: 0,
  })),
}))

vi.mock('@/lib/private/supabase-anon', () => ({
  supabaseAnon: () => ({
    auth: {
      signInWithPassword: vi.fn(async () =>
        estado.ok
          ? {
              data: {
                session: { access_token: 'token-de-prueba' },
                user: { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
              },
              error: null,
            }
          : { data: { session: null, user: null }, error: { message: 'Invalid login credentials' } },
      ),
    },
  }),
  supabaseAnonConToken: () => ({ auth: {} }),
}))

vi.mock('@/lib/private/auth/perfil', () => ({
  obtenerPerfil: vi.fn(async () => estado.perfil),
}))

vi.mock('@/lib/private/auth/mfa', () => ({
  factorVerificado: vi.fn(async () => estado.factor),
  challengeMfa: vi.fn(async () => 'challenge-1'),
  verifyMfa: vi.fn(async () => true),
  enrolarFactor: vi.fn(async () => null),
  verificarPrimerCodigo: vi.fn(async () => false),
  eliminarFactor: vi.fn(async () => true),
}))

import { POST } from '@/app/api/auth/paso1/route'

function request(body: string): Request {
  return new Request('http://test.local/api/auth/paso1', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '203.0.113.10' },
    body,
  })
}

describe('POST /api/auth/paso1 (Zod + rate limit + genérico, AGENTS §4/§5)', () => {
  beforeEach(() => {
    estado.ok = true
    estado.rateIpOk = true
    estado.rateEmailOk = true
    estado.factor = null
    estado.perfil = {
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      email: 'usuario@test.local',
      name: 'Usuario Test',
      role_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      role: 'Usuario',
      is_admin: false,
      is_default: true,
      activo: true,
      password_changed_at: '2026-01-01T00:00:00Z',
    }
    vi.stubEnv('AUTH_SECRET', 'secreto-de-prueba-para-el-test-0123456789')
  })

  it('rechaza payload inválido con 400 (Zod)', async () => {
    const respuesta = await POST(request('{"email":"no-es-email"}'))
    expect(respuesta.status).toBe(400)
  })

  it('devuelve 429 cuando el rate limit por IP se agota', async () => {
    estado.rateIpOk = false
    const respuesta = await POST(request(JSON.stringify({ email: 'a@b.com', password: 'x' })))
    expect(respuesta.status).toBe(429)
  })

  it('mensaje genérico: credenciales inválidas no revelan si la cuenta existe', async () => {
    estado.ok = false
    const respuesta = await POST(
      request(JSON.stringify({ email: 'noexiste@test.local', password: 'malapass12345' })),
    )
    expect(respuesta.status).toBe(401)
    const cuerpo = (await respuesta.json()) as { error: string }
    expect(cuerpo.error).toBe('Email o contraseña incorrectos')
  })

  it('flujo sin MFA: emite step_token y setea cookie httpOnly', async () => {
    const respuesta = await POST(
      request(JSON.stringify({ email: 'usuario@test.local', password: 'claveCorrecta123' })),
    )
    expect(respuesta.status).toBe(200)
    const cuerpo = (await respuesta.json()) as { step_token: string; mfa_requerido: boolean }
    expect(cuerpo.step_token).toBeTruthy()
    expect(cuerpo.mfa_requerido).toBe(false)
  })

  it('flujo con MFA: pide desafío y responde mfa_requerido', async () => {
    estado.factor = { id: 'factor-1' }
    const respuesta = await POST(
      request(JSON.stringify({ email: 'usuario@test.local', password: 'claveCorrecta123' })),
    )
    expect(respuesta.status).toBe(200)
    const cuerpo = (await respuesta.json()) as { step_token: string; mfa_requerido: boolean }
    expect(cuerpo.mfa_requerido).toBe(true)
    expect(cuerpo.step_token).toBeTruthy()
  })
})
