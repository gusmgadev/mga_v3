import type { Metadata } from 'next'
import { requiereVista } from '@/lib/private/sesion'
import { supabaseAdmin } from '@/lib/private/supabase-admin'
import { UsuariosClient, type DatoUsuario, type DatoRol } from '@/components/private/UsuariosClient'

export const metadata: Metadata = {
  title: 'Usuarios | MGA Informática',
  robots: { index: false, follow: false },
}

interface FilaUsuario {
  id: string
  email: string
  name: string
  role_id: string
  password_changed_at: string | null
  created_at: string
  roles: { name: string } | null
}

export default async function UsuariosPage() {
  const session = await requiereVista('administracion.usuarios')

  const [usuarios, roles] = await Promise.all([
    supabaseAdmin()
      .from('users')
      .select('id, email, name, role_id, password_changed_at, created_at, roles ( name )')
      .order('email'),
    supabaseAdmin().from('roles').select('id, name, is_admin, is_default').order('name'),
  ])

  const datos: DatoUsuario[] = ((usuarios.data ?? []) as unknown as FilaUsuario[]).map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role_id: u.role_id,
    rol: u.roles?.name ?? '—',
    password_changed_at: u.password_changed_at,
    created_at: u.created_at,
  }))
  const listaRoles: DatoRol[] = (roles.data ?? []) as DatoRol[]

  return (
    <div className="mx-auto max-w-5xl">
      <UsuariosClient initialUsuarios={datos} initialRoles={listaRoles} usuarioActualId={session.user.id} />
    </div>
  )
}
