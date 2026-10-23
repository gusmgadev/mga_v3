/** Cookie httpOnly que transporta el access token de Supabase solo entre paso1 y authorize. */
export const COOKIE_ACCESO_MFA = 'mga_acceso_mfa'

export const OPCIONES_COOKIE_ACCESO_MFA = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/api/auth',
  maxAge: 600,
}
