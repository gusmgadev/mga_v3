import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requiereSesionApi } from '@/lib/private/sesion'
import { supabaseAdmin } from '@/lib/private/supabase-admin'
import { supabaseAnon } from '@/lib/private/supabase-anon'

const Esquema = z.object({
  password: z.string().min(12, 'Mínimo 12 caracteres').max(200),
  password_actual: z.string().min(1).max(200).optional(),
})

/** Cambio de contraseña con sesión de dashboard (forzado u opcional, §5.5). */
export async function POST(req: Request): Promise<NextResponse> {
  const guardado = await requiereSesionApi()
  if (!guardado.ok) return guardado.respuesta
  const session = guardado.session

  let datos: z.infer<typeof Esquema>
  try {
    datos = Esquema.parse(await req.json())
  } catch (e) {
    const mensaje =
      e instanceof z.ZodError ? e.issues[0]?.message ?? 'Datos inválidos' : 'Datos inválidos'
    return NextResponse.json({ error: mensaje }, { status: 400 })
  }

  if (!session.user.debeCambiarPassword) {
    if (!datos.password_actual) {
      return NextResponse.json(
        { error: 'Ingresá tu contraseña actual' },
        { status: 400 },
      )
    }
    const { error } = await supabaseAnon().auth.signInWithPassword({
      email: session.user.email ?? '',
      password: datos.password_actual,
    })
    if (error) {
      return NextResponse.json({ error: 'Contraseña actual incorrecta' }, { status: 400 })
    }
  }

  const { error: fallo } = await supabaseAdmin().auth.admin.updateUserById(
    session.user.id,
    { password: datos.password },
  )
  if (fallo) {
    console.error('[seguridad/cambiar-password] updateUserById:', fallo.message)
    return NextResponse.json(
      { error: 'No se pudo actualizar la contraseña' },
      { status: 500 },
    )
  }

  const { data: perfil } = await supabaseAdmin()
    .from('users')
    .select('auth_version')
    .eq('id', session.user.id)
    .single()
  const { error: marcaError } = await supabaseAdmin()
    .from('users')
    .update({
      password_changed_at: new Date().toISOString(),
      auth_version: (perfil?.auth_version ?? 0) + 1,
    })
    .eq('id', session.user.id)
  if (marcaError) {
    console.error('[seguridad/cambiar-password] marca users:', marcaError.message)
    return NextResponse.json(
      { error: 'No se pudo completar el cambio' },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true, requiere_relogin: true })
}
