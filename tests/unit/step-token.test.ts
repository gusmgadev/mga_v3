import { describe, expect, it } from 'vitest'
import { firmarStepToken, verificarStepToken } from '@/lib/private/auth/step-token'

const secreto = 'secreto-de-prueba-1234567890'

describe('step-token (login MFA a dos pasos)', () => {
  it('firma y verifica correctamente', () => {
    const token = firmarStepToken({ sub: 'user-1', has_mfa: false }, secreto)
    const payload = verificarStepToken(token, secreto)
    expect(payload).toEqual({ sub: 'user-1', has_mfa: false, factorId: undefined, challengeId: undefined })
  })

  it('rechaza firma inválida', () => {
    const token = firmarStepToken({ sub: 'user-1', has_mfa: true, factorId: 'f1' }, secreto)
    const [body] = token.split('.')
    const alterado = `${body}.${'a'.repeat(64)}`
    expect(verificarStepToken(alterado, secreto)).toBeNull()
  })

  it('rechaza otro secreto', () => {
    const token = firmarStepToken({ sub: 'user-1', has_mfa: false }, secreto)
    expect(verificarStepToken(token, 'otro-secreto')).toBeNull()
  })

  it('rechaza token expirado', () => {
    const ahora = Date.now()
    const token = firmarStepToken({ sub: 'user-1', has_mfa: false }, secreto, ahora - 6 * 60 * 1000)
    expect(verificarStepToken(token, secreto, ahora)).toBeNull()
  })

  it('rechaza tokens malformados', () => {
    expect(verificarStepToken('', secreto)).toBeNull()
    expect(verificarStepToken('solo-una-partes', secreto)).toBeNull()
    expect(verificarStepToken('..', secreto)).toBeNull()
    expect(verificarStepToken('no-base64.xxx', secreto)).toBeNull()
  })

  it('preserva factorId y challengeId para MFA', () => {
    const token = firmarStepToken(
      { sub: 'u', has_mfa: true, factorId: 'factor-1', challengeId: 'challenge-1' },
      secreto,
    )
    expect(verificarStepToken(token, secreto)).toEqual({
      sub: 'u',
      has_mfa: true,
      factorId: 'factor-1',
      challengeId: 'challenge-1',
    })
  })
})
