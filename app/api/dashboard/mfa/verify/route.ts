import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requiereSesionApi } from '@/lib/private/sesion'
import { supabaseAdmin } from '@/lib/private/supabase-admin'
import { verificarPrimerCodigo } from '@/lib/private/auth/mfa'

const Esquema = z.object({
  factor_id: z.string().min(1),
  code: z.string().regex(/^\d{6}$/, 'Código de 6 dígitos'),
})

/** Completa el enrolamiento TOTP verificando el primer código (§5.5). */
export async function POST(req: Request): Promise<NextResponse> {
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
