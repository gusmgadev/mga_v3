import 'server-only'
import { NextResponse } from 'next/server'
import { redirect } from 'next/navigation'
import type { Session } from 'next-auth'
import { auth } from './auth'
import { supabaseAdmin } from './supabase-admin'
import { permite, type PermisoAsignado, type RolContexto } from './permisos'
import type { Accion } from './modulos'

export function jsonNoAutorizado(): NextResponse {
  return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
}

export function jsonProhibido(mensaje = 'No tenés permiso para esta acción'): NextResponse {
  return NextResponse.json({ error: mensaje }, { status: 403 })
}

export async function permisosAsignados(roleId: string): Promise<PermisoAsignado[]> {
  const { data, error } = await supabaseAdmin()
    .from('role_permissions')
    .select('nodo, acciones')
    .eq('role_id', roleId)
  if (error || !data) return []
  return (data as { nodo: string; acciones: string[] }[]).map((f) => ({
    nodo: f.nodo,
    acciones: f.acciones as Accion[],
  }))
}

export type ResultadoApi =
  | { ok: true; session: Session }
  | { ok: false; respuesta: NextResponse }

/**
 * Guarda canónica de toda API /api/dashboard/*: sesión + permiso del nodo (AGENTS §4/§5).
 * Si la contraseña quedó pendiente de cambio, solo se autoriza el propio cambio de contraseña.
 */
export async function requierePermisoApi(nodo: string, accion: Accion): Promise<ResultadoApi> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, respuesta: jsonNoAutorizado() }
  if (session.user.debeCambiarPassword) {
    return {
      ok: false,
      respuesta: jsonProhibido('Debés cambiar tu contraseña antes de continuar'),
    }
  }
  const rol: RolContexto = { is_admin: session.user.is_admin }
  let asignados: PermisoAsignado[] = []
  if (!rol.is_admin && session.user.role_id) {
    asignados = await permisosAsignados(session.user.role_id)
  }
  if (!permite(rol, asignados, nodo, accion)) {
    return { ok: false, respuesta: jsonProhibido() }
  }
  return { ok: true, session }
}

/** Solo requiere sesión (para acciones propias del usuario, p. ej. cambio de contraseña y MFA). */
export async function requiereSesionApi(): Promise<
  { ok: true; session: Session } | { ok: false; respuesta: NextResponse }
> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, respuesta: jsonNoAutorizado() }
  return { ok: true, session }
}

/** Guarda de vistas server del dashboard: sesión + permiso `ver` del nodo (spec §3.2). */
export async function requiereVista(nodo: string): Promise<Session> {
  const session = await auth()
  if (!session) redirect('/auth/signin')
  const guardado = await requierePermisoApi(nodo, 'ver')
  if (!guardado.ok) redirect('/dashboard')
  return guardado.session
}
