import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requiereSesionApi } from '@/lib/private/sesion'
import { eliminarFactor, verificarPrimerCodigo } from '@/lib/private/auth/mfa'
import { supabaseAdmin } from '@/lib/private/supabase-admin'

const Esquema = z.object({
  factor_id: z.string().min(1),
  code: z.string().regex(/^\d{6}$/, 'Código de 6 dígitos'),
})

/** Desactiva la verificación en dos pasos; exige código vigente (§5.5). */
export async function DELETE(req: Request): Promise<NextResponse> {
  const guardado = await requiereSesionApi()
  if (!guardado.ok) return guardado.respuesta
  const session = guardado.session

  let datos: z.infer<typeof Esquema>
  try {
    datos = Esquema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const ok = await verificarPrimerCodigo(
    session.user.email ?? '',
    datos.factor_id,
    datos.code,
  )
  if (!ok) {
    return NextResponse.json({ error: 'Código incorrecto' }, { status: 400 })
  }

  const eliminado = await eliminarFactor(session.user.id, datos.factor_id)
  if (!eliminado) {
    return NextResponse.json(
      { error: 'No se pudo desactivar. Probá en unos minutos.' },
      { status: 500 },
    )
  }

  const { data: perfil } = await supabaseAdmin()
    .from('users')
    .select('auth_version')
    .eq('id', session.user.id)
    .single()
  await supabaseAdmin()
    .from('users')
    .update({ auth_version: (perfil?.auth_version ?? 0) + 1 })
    .eq('id', session.user.id)

  return NextResponse.json({ ok: true })
}
