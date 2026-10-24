import 'server-only'
import { supabaseAdmin } from '../supabase-admin'

export interface PerfilUsuario {
  id: string
  email: string
  name: string
  role_id: string
  role: string
  is_admin: boolean
  is_default: boolean
  activo: boolean
  auth_version: number
  password_changed_at: string | null
}

interface FilaUsers {
  id: string
  email: string
  name: string
  role_id: string
  activo: boolean
  auth_version: number
  password_changed_at: string | null
  roles: {
    id: string
    name: string
    is_default: boolean
    is_admin: boolean
  } | null
}

export async function obtenerPerfil(userId: string): Promise<PerfilUsuario | null> {
  const { data, error } = await supabaseAdmin()
    .from('users')
    .select(
      'id, email, name, role_id, activo, auth_version, password_changed_at, roles ( id, name, is_default, is_admin )',
    )
    .eq('id', userId)
    .single()
  if (error || !data) return null
  const fila = data as unknown as FilaUsers
  if (!fila.roles) return null
  return {
    id: fila.id,
    email: fila.email,
    name: fila.name,
    role_id: fila.role_id,
    role: fila.roles.name,
    is_admin: fila.roles.is_admin,
    is_default: fila.roles.is_default,
    activo: fila.activo,
    auth_version: fila.auth_version,
    password_changed_at: fila.password_changed_at,
  }
}
