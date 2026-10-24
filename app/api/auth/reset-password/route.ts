import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAnonConToken } from '@/lib/private/supabase-anon'
import { supabaseAdmin } from '@/lib/private/supabase-admin'
import { rateLimitResetPorIp, rateLimitResetPorToken } from '@/lib/private/rate-limit'

const Esquema = z.object({
  token: z.string().min(1),
  password: z.string().min(12, 'Mínimo 12 caracteres').max(200),
})

export async function POST(req: Request): Promise<NextResponse> {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? ''

  let datos: z.infer<typeof Esquema>
  try {
    datos = Esquema.parse(await req.json())
  } catch (e) {
    const mensaje =
      e instanceof z.ZodError ? e.issues[0]?.message ?? 'Datos inválidos' : 'Datos inválidos'
    return NextResponse.json({ error: mensaje }, { status: 400 })
  }

  const tokenHash = createHash('sha256').update(datos.token).digest('hex')

  try {
    const [limiteToken, limiteIp] = await Promise.all([
      rateLimitResetPorToken(tokenHash),
      rateLimitResetPorIp(ip),
    ])
    if (!limiteToken.ok || !limiteIp.ok) {
      return NextResponse.json(
        { error: 'Demasiados intentos. Probá de nuevo en unos minutos.' },
        { status: 429 },
      )
    }
  } catch (error) {
    console.error('[auth/reset-password] rate limit no disponible:', error)
    return NextResponse.json(
      { error: 'El servicio no está disponible. Probá en unos minutos.' },
      { status: 503 },
    )
  }

  // Validar el token de recuperación y obtener el usuario.
  const cliente = supabaseAnonConToken(datos.token)
  const { data: userData, error: userError } = await cliente.auth.getUser()
  if (userError || !userData.user) {
    return NextResponse.json({ error: 'El link expiró o ya fue usado.' }, { status: 401 })
  }

  // Cambiar la contraseña con el mismo token de sesión.
  const { error: updateError } = await cliente.auth.updateUser({ password: datos.password })
  if (updateError) {
    console.error('[auth/reset-password] updateUser:', updateError.message)
    return NextResponse.json(
      { error: 'No se pudo actualizar la contraseña. Probá de nuevo en unos minutos.' },
      { status: 500 },
    )
  }

  // Marcar cambio y forzar revalidación de sesiones anteriores.
  const { data: perfil } = await supabaseAdmin()
    .from('users')
    .select('auth_version')
    .eq('id', userData.user.id)
    .single()
  const nuevaVersion = (perfil?.auth_version ?? 0) + 1

  const { error: marcaError } = await supabaseAdmin()
    .from('users')
    .update({ password_changed_at: new Date().toISOString(), auth_version: nuevaVersion })
    .eq('id', userData.user.id)

  if (marcaError) {
    console.error('[auth/reset-password] marca users:', marcaError.message)
    return NextResponse.json(
      { error: 'No se pudo completar el cambio. Probá de nuevo en unos minutos.' },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true })
}
