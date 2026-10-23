import { NextResponse } from 'next/server'
import { z } from 'zod'
import { firmarStepToken } from '@/lib/private/auth/step-token'
import { obtenerPerfil } from '@/lib/private/auth/perfil'
import { challengeMfa, factorVerificado } from '@/lib/private/auth/mfa'
import { COOKIE_ACCESO_MFA, OPCIONES_COOKIE_ACCESO_MFA } from '@/lib/private/auth/cookies'
import { supabaseAnon } from '@/lib/private/supabase-anon'
import { rateLimitLoginPorEmail, rateLimitLoginPorIp } from '@/lib/shared/rate-limit'

const Esquema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(200),
})

export async function POST(req: Request): Promise<NextResponse> {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? ''

  let datos: z.infer<typeof Esquema>
  try {
    datos = Esquema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  try {
    const [porIp, porEmail] = await Promise.all([
      rateLimitLoginPorIp(ip),
      rateLimitLoginPorEmail(datos.email),
    ])
    if (!porIp.ok || !porEmail.ok) {
      return NextResponse.json(
        { error: 'Demasiados intentos. Probá de nuevo en unos minutos.' },
        { status: 429 },
      )
    }
  } catch (error) {
    console.error('[auth/paso1] rate limit no disponible:', error)
    return NextResponse.json(
      { error: 'El servicio de login no está disponible. Probá en unos minutos.' },
      { status: 503 },
    )
  }

  const secreto = process.env.AUTH_SECRET
  if (!secreto) {
    return NextResponse.json({ error: 'Configuración incompleta del servidor' }, { status: 500 })
  }

  const { data, error } = await supabaseAnon().auth.signInWithPassword({
    email: datos.email,
    password: datos.password,
  })
  if (error || !data.session) {
    return NextResponse.json({ error: 'Email o contraseña incorrectos' }, { status: 401 })
  }

  const perfil = await obtenerPerfil(data.user.id)
  if (!perfil) {
    return NextResponse.json({ error: 'Email o contraseña incorrectos' }, { status: 401 })
  }

  const factor = await factorVerificado(perfil.id)
  let hasMfa = false
  let factorId: string | undefined
  let challengeId: string | undefined
  if (factor) {
    const challenge = await challengeMfa(data.session.access_token, factor.id)
    if (!challenge) {
      return NextResponse.json(
        { error: 'No se pudo iniciar la verificación. Probá en unos minutos.' },
        { status: 500 },
      )
    }
    hasMfa = true
    factorId = factor.id
    challengeId = challenge
  }

  const stepToken = firmarStepToken(
    { sub: perfil.id, has_mfa: hasMfa, factorId, challengeId },
    secreto,
  )

  const respuesta = NextResponse.json({ step_token: stepToken, mfa_requerido: hasMfa })
  respuesta.cookies.set(COOKIE_ACCESO_MFA, data.session.access_token, OPCIONES_COOKIE_ACCESO_MFA)
  return respuesta
}
