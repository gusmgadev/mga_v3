import 'server-only'
import { supabaseAdmin } from '@/lib/private/supabase-admin'

export interface LimiteResultado {
  ok: boolean
  restante: number
  resetMs: number
}

async function consumir(
  prefix: string,
  identificador: string,
  limite: number,
  ventanaMs: number,
): Promise<LimiteResultado> {
  const { data, error } = await supabaseAdmin().rpc('rate_limit_consumir', {
    p_prefix: prefix,
    p_identificador: identificador,
    p_limite: limite,
    p_ventana_ms: ventanaMs,
  })
  if (error) {
    throw new Error(`Rate limit no disponible: ${error.message}`)
  }
  const fila = Array.isArray(data) ? data[0] : data
  if (!fila || typeof fila.ok !== 'boolean') {
    throw new Error('Rate limit no disponible: respuesta inválida de la RPC')
  }
  return { ok: fila.ok, restante: fila.restante, resetMs: Number(fila.reset_ms) }
}

/** Login del dashboard: por IP y por email (specs/privado.md §5.1, AGENTS §4). */
export function rateLimitLoginPorIp(ip: string): Promise<LimiteResultado> {
  return consumir('login-ip', ip || 'sin-ip', 10, 5 * 60 * 1000)
}

export function rateLimitLoginPorEmail(email: string): Promise<LimiteResultado> {
  return consumir('login-email', email.toLowerCase(), 5, 5 * 60 * 1000)
}

/** Reset de contraseña: limita abusos del formulario olvidé. */
export function rateLimitOlvide(email: string): Promise<LimiteResultado> {
  return consumir('olvide-password', email.toLowerCase(), 3, 15 * 60 * 1000)
}

/** Recuperación con token: límite por token (hash) e IP. */
export function rateLimitResetPorToken(tokenHash: string): Promise<LimiteResultado> {
  return consumir('reset-token', tokenHash, 5, 15 * 60 * 1000)
}

export function rateLimitResetPorIp(ip: string): Promise<LimiteResultado> {
  return consumir('reset-ip', ip || 'sin-ip', 10, 15 * 60 * 1000)
}

/** Verificación TOTP: límite por usuario e IP. */
export function rateLimitMfaPorUsuario(userId: string): Promise<LimiteResultado> {
  return consumir('mfa-usuario', userId.toLowerCase(), 5, 5 * 60 * 1000)
}

export function rateLimitMfaPorIp(ip: string): Promise<LimiteResultado> {
  return consumir('mfa-ip', ip || 'sin-ip', 10, 5 * 60 * 1000)
}
