import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requiereSesionApi } from '@/lib/private/sesion'
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
  return NextResponse.json({ ok: true })
}
