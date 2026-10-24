import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAnon } from '@/lib/private/supabase-anon'
import { rateLimitOlvide } from '@/lib/private/rate-limit'

const Esquema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
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
    const limite = await rateLimitOlvide(datos.email)
    if (!limite.ok) {
      return NextResponse.json(
        { error: 'Demasiados intentos. Probá de nuevo en unos minutos.' },
        { status: 429 },
      )
    }
  } catch (error) {
    console.error('[auth/olvide] rate limit no disponible:', error)
    return NextResponse.json(
      { error: 'El servicio no está disponible. Probá en unos minutos.' },
      { status: 503 },
    )
  }

  const { error } = await supabaseAnon().auth.resetPasswordForEmail(datos.email, {
    redirectTo: `${process.env.APP_URL}/auth/reset`,
  })

  if (error) {
    // No revelar si la cuenta existe.
    console.error('[auth/olvide] resetPasswordForEmail:', error.message)
  }

  return NextResponse.json({
    ok: true,
    mensaje:
      'Si el email existe en el sistema, recibirás un mensaje con las instrucciones. Revisá también la carpeta de spam.',
  })
}
