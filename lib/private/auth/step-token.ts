import { createHmac, timingSafeEqual } from 'node:crypto'

export interface PayloadStepToken {
  sub: string
  has_mfa: boolean
  factorId?: string
  challengeId?: string
  exp: number
}

const TTL_MS = 5 * 60 * 1000

function firma(body: string, secreto: string): string {
  return createHmac('sha256', secreto).update(body).digest('hex')
}

export function firmarStepToken(
  payload: Omit<PayloadStepToken, 'exp'>,
  secreto: string,
  ahora = Date.now(),
  ttlMs = TTL_MS,
): string {
  const body = Buffer.from(
    JSON.stringify({ ...payload, exp: ahora + ttlMs } satisfies PayloadStepToken),
  ).toString('base64url')
  return `${body}.${firma(body, secreto)}`
}

export function verificarStepToken(
  token: string,
  secreto: string,
  ahora = Date.now(),
): Omit<PayloadStepToken, 'exp'> | null {
  const separado = token.split('.')
  if (separado.length !== 2) return null
  const [body, recibida] = separado
  if (!body || !recibida) return null
  const esperada = firma(body, secreto)
  const a = Buffer.from(recibida)
  const b = Buffer.from(esperada)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  let payload: PayloadStepToken
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as PayloadStepToken
  } catch {
    return null
  }
  if (typeof payload.exp !== 'number' || payload.exp < ahora) return null
  if (typeof payload.sub !== 'string' || payload.sub.length === 0) return null
  return {
    sub: payload.sub,
    has_mfa: payload.has_mfa === true,
    factorId: typeof payload.factorId === 'string' ? payload.factorId : undefined,
    challengeId: typeof payload.challengeId === 'string' ? payload.challengeId : undefined,
  }
}
