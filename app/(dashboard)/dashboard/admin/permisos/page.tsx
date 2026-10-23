import type { Metadata } from 'next'
import { requiereVista } from '@/lib/private/sesion'
import { supabaseAdmin } from '@/lib/private/supabase-admin'
import { PermisosClient, type DatoRol } from '@/components/private/PermisosClient'

export const metadata: Metadata = {
  title: 'Permisos | MGA Informática',
  robots: { index: false, follow: false },
}

export default async function PermisosPage() {
  await requiereVista('administracion.permisos')

  const roles = await supabaseAdmin()
    .from('roles')
    .select('id, name, is_admin, is_default')
    .order('name')

  return (
    <div className="mx-auto max-w-5xl">
      <PermisosClient initialRoles={(roles.data ?? []) as DatoRol[]} />
    </div>
  )
}
