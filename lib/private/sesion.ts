import 'server-only'
import { NextResponse } from 'next/server'
import { redirect } from 'next/navigation'
import type { Session } from 'next-auth'
import { auth } from './auth'
import { supabaseAdmin } from './supabase-admin'
import { obtenerPerfil } from './auth/perfil'
import { permite, type PermisoAsignado, type RolContexto } from './permisos'
import type { Accion } from './modulos'

export function jsonNoAutorizado(): NextResponse {
  return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
}

export function jsonProhibido(mensaje = 'No tenés permiso para esta acción'): NextResponse {
  return NextResponse.json({ error: mensaje }, { status: 403 })
}

/**
 * Revalida la sesión contra la BD: usuario activo, rol e is_admin sin cambios,
 * y auth_version coincidente. Detecta usuarios desactivados, eliminados o con
 * credenciales regeneradas/cambiadas (AGENTS §4).
 */
export async function validarSesion(
  session: Session,
): Promise<{ ok: true; session: Session } | { ok: false; respuesta: NextResponse }> {
  const perfil = await obtenerPerfil(session.user.id)
  if (!perfil || !perfil.activo) {
    return { ok: false, respuesta: jsonNoAutorizado() }
  }
  if (
    perfil.role_id !== session.user.role_id ||
    perfil.is_admin !== session.user.is_admin ||
    perfil.auth_version !== session.user.auth_version
  ) {
    return { ok: false, respuesta: jsonNoAutorizado() }
  }
  return { ok: true, session }
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
  const validado = await validarSesion(session)
  if (!validado.ok) return { ok: false, respuesta: validado.respuesta }
  const sesion = validado.session
  if (sesion.user.debeCambiarPassword) {
    return {
      ok: false,
      respuesta: jsonProhibido('Debés cambiar tu contraseña antes de continuar'),
    }
  }
  const rol: RolContexto = { is_admin: sesion.user.is_admin }
  let asignados: PermisoAsignado[] = []
  if (!rol.is_admin && sesion.user.role_id) {
    asignados = await permisosAsignados(sesion.user.role_id)
  }
  if (!permite(rol, asignados, nodo, accion)) {
    return { ok: false, respuesta: jsonProhibido() }
  }
  return { ok: true, session: sesion }
}

/** Solo requiere sesión (para acciones propias del usuario, p. ej. cambio de contraseña y MFA). */
export async function requiereSesionApi(): Promise<
  { ok: true; session: Session } | { ok: false; respuesta: NextResponse }
> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, respuesta: jsonNoAutorizado() }
  const validado = await validarSesion(session)
  if (!validado.ok) return { ok: false, respuesta: validado.respuesta }
  return { ok: true, session: validado.session }
}

/** Guarda de vistas server del dashboard: sesión + permiso `ver` del nodo (spec §3.2). */
export async function requiereVista(nodo: string): Promise<Session> {
  const session = await auth()
  if (!session) redirect('/auth/signin')
  const guardado = await requierePermisoApi(nodo, 'ver')
  if (!guardado.ok) redirect('/dashboard')
  return guardado.session
}
