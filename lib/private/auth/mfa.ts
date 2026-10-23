import 'server-only'
import { supabaseAdmin } from '../supabase-admin'
import { supabaseAnon, supabaseAnonConToken } from '../supabase-anon'

export interface FactorMfa {
  id: string
}

/** Factor TOTP verificado del usuario (service role). */
export async function factorVerificado(userId: string): Promise<FactorMfa | null> {
  const { data, error } = await supabaseAdmin().auth.admin.mfa.listFactors({ userId })
  if (error || !data) return null
  const factor = (data.factors ?? []).find((f) => f.status === 'verified')
  return factor ? { id: factor.id } : null
}

/** Crea el challenge TOTP con la sesión (access token) del usuario. */
export async function challengeMfa(
  accessToken: string,
  factorId: string,
): Promise<string | null> {
  const { data, error } = await supabaseAnonConToken(accessToken).auth.mfa.challenge({
    factorId,
  })
  if (error || !data) return null
  return data.id
}

/** Verifica el código TOTP del login contra el challenge. Éxito = nueva sesión. */
export async function verifyMfa(
  accessToken: string,
  factorId: string,
  challengeId: string,
  code: string,
): Promise<boolean> {
  const { data, error } = await supabaseAnonConToken(accessToken).auth.mfa.verify({
    factorId,
    challengeId,
    code,
  })
  return !error && Boolean(data?.access_token)
}

export interface FactorEnrolado {
  id: string
  secret: string
  uri: string
}

/**
 * Enrola un factor TOTP para el usuario. auth-js 2.118 no expone el enrolamiento admin,
 * se usa el endpoint REST de GoTrue con service role.
 */
export async function enrolarFactor(userId: string): Promise<FactorEnrolado | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRole) return null
  const respuesta = await fetch(`${url}/auth/v1/admin/users/${userId}/factors`, {
    method: 'POST',
    headers: {
      apikey: serviceRole,
      Authorization: `Bearer ${serviceRole}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ factor_type: 'totp', friendly_name: 'TOTP' }),
  })
  if (!respuesta.ok) return null
  const data = (await respuesta.json()) as {
    id?: string
    totp?: { secret?: string; uri?: string }
  }
  if (!data.id || !data.totp?.secret) return null
  return { id: data.id, secret: data.totp.secret, uri: data.totp.uri ?? '' }
}

/**
 * Completa el enrolamiento verificando el primer código.
 * El dashboard no tiene sesión de Supabase del usuario, por lo que se emite una sesión
 * efímera (generateLink recovery → verifyOtp), se verifica el TOTP y se descartan los tokens.
 */
export async function verificarPrimerCodigo(
  email: string,
  factorId: string,
  code: string,
): Promise<boolean> {
  const enlace = await supabaseAdmin().auth.admin.generateLink({
    type: 'recovery',
    email,
  })
  const hash = enlace.data?.properties?.hashed_token
  if (enlace.error || !hash) return false

  const sesion = await supabaseAnon().auth.verifyOtp({ token_hash: hash, type: 'recovery' })
  const accessToken = sesion.data?.session?.access_token
  if (sesion.error || !accessToken) return false

  const cliente = supabaseAnonConToken(accessToken)
  const challenge = await cliente.auth.mfa.challenge({ factorId })
  if (challenge.error || !challenge.data) return false
  const verificado = await cliente.auth.mfa.verify({
    factorId,
    challengeId: challenge.data.id,
    code,
  })
  return !verificado.error && Boolean(verificado.data?.access_token)
}

export async function eliminarFactor(userId: string, factorId: string): Promise<boolean> {
  const { error } = await supabaseAdmin().auth.admin.mfa.deleteFactor({
    id: factorId,
    userId,
  })
  return !error
}
