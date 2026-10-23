import type { Metadata } from 'next'
import { requiereVista } from '@/lib/private/sesion'
import { supabaseAdmin } from '@/lib/private/supabase-admin'
import { RolesClient, type DatoRolConConteo } from '@/components/private/RolesClient'

export const metadata: Metadata = {
  title: 'Roles | MGA Informática',
  robots: { index: false, follow: false },
}

interface FilaRol {
  id: string
  name: string
  description: string | null
  is_default: boolean
  is_admin: boolean
}

export default async function RolesPage() {
  await requiereVista('administracion.roles')

  const [roles, usuarios] = await Promise.all([
    supabaseAdmin()
      .from('roles')
      .select('id, name, description, is_default, is_admin')
      .order('name'),
    supabaseAdmin().from('users').select('role_id'),
  ])

  const conteo = new Map<string, number>()
  for (const u of (usuarios.data ?? []) as { role_id: string }[]) {
    conteo.set(u.role_id, (conteo.get(u.role_id) ?? 0) + 1)
  }

  const datos: DatoRolConConteo[] = ((roles.data ?? []) as FilaRol[]).map((r) => ({
    ...r,
    usuarios: conteo.get(r.id) ?? 0,
  }))

  return (
    <div className="mx-auto max-w-4xl">
      <RolesClient initialRoles={datos} />
    </div>
  )
}
