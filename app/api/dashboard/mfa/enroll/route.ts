import { NextResponse } from 'next/server'
import { requiereSesionApi } from '@/lib/private/sesion'
import { enrolarFactor, factorVerificado } from '@/lib/private/auth/mfa'

/** Inicia el enrolamiento TOTP y devuelve el secreto para copiar (sin QR, §5.5). */
export async function POST(): Promise<NextResponse> {
  const guardado = await requiereSesionApi()
  if (!guardado.ok) return guardado.respuesta
  const session = guardado.session

  const existente = await factorVerificado(session.user.id)
  if (existente) {
    return NextResponse.json(
      { error: 'Ya tenés la verificación en dos pasos activa' },
      { status: 409 },
    )
  }

  const factor = await enrolarFactor(session.user.id)
  if (!factor) {
    return NextResponse.json(
      { error: 'No se pudo iniciar la configuración. Probá en unos minutos.' },
      { status: 500 },
    )
  }

  return NextResponse.json({
    factor_id: factor.id,
    secreto: factor.secret,
    uri: factor.uri,
  })
}
