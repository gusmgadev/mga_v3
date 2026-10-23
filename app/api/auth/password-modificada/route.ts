import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/private/supabase-admin'
import { supabaseAnonConToken } from '@/lib/private/supabase-anon'

/**
 * Marca `users.password_changed_at` tras un reset por email (P-13).
 * Autentica con el access token de Supabase del propio usuario (no recibe datos del cliente).
 */
export async function POST(req: Request): Promise<NextResponse> {
  const autorizacion = req.headers.get('authorization') ?? ''
  const token = autorizacion.toLowerCase().startsWith('bearer ')
    ? autorizacion.slice(7).trim()
    : ''
  if (!token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { data, error } = await supabaseAnonConToken(token).auth.getUser()
  if (error || !data.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  await supabaseAdmin()
    .from('users')
    .update({ password_changed_at: new Date().toISOString() })
    .eq('id', data.user.id)

  return NextResponse.json({ ok: true })
}
