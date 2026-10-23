import 'server-only'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

export interface LimiteResultado {
  ok: boolean
  restante: number
  resetMs: number
}

let redis: Redis | null = null

function obtenerRedis(): Redis {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    throw new Error(
      'Rate limit no configurado: faltan UPSTASH_REDIS_REST_URL y/o UPSTASH_REDIS_REST_TOKEN',
    )
  }
  if (!redis) redis = new Redis({ url, token })
  return redis
}

const limitadores = new Map<string, Ratelimit>()

function obtenerLimitador(prefix: string, limite: number, ventanaMs: number): Ratelimit {
  const clave = `${prefix}:${limite}:${ventanaMs}`
  let limitador = limitadores.get(clave)
  if (!limitador) {
    limitador = new Ratelimit({
      redis: obtenerRedis(),
      limiter: Ratelimit.slidingWindow(limite, `${ventanaMs} ms`),
      prefix: `mga:${prefix}`,
      analytics: false,
    })
    limitadores.set(clave, limitador)
  }
  return limitador
}

async function consumir(
  prefix: string,
  identificador: string,
  limite: number,
  ventanaMs: number,
): Promise<LimiteResultado> {
  const resultado = await obtenerLimitador(prefix, limite, ventanaMs).limit(identificador)
  return {
    ok: resultado.success,
    restante: resultado.remaining,
    resetMs: resultado.reset,
  }
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
