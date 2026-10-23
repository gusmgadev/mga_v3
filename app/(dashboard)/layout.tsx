import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/private/auth'
import { permisosAsignados } from '@/lib/private/sesion'
import { mapaDePermisos } from '@/lib/private/permisos'
import { todosLosNodos } from '@/lib/private/modulos'
import { Sidebar } from '@/components/private/Sidebar'
import './globals.css'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

// Todo el dashboard depende de sesión/cookies: render en runtime (cacheComponents), no prerender.
export const instant = false

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  if (!session) redirect('/auth/signin')

  const asignados = session.user.is_admin
    ? []
    : await permisosAsignados(session.user.role_id)
  const mapa = mapaDePermisos(
    { is_admin: session.user.is_admin },
    asignados,
    todosLosNodos(),
  )

  return (
    <div className="min-h-screen bg-fondo">
      <Sidebar
        usuario={{
          nombre: session.user.name ?? session.user.email ?? '',
          email: session.user.email ?? '',
          is_admin: session.user.is_admin,
          debeCambiarPassword: session.user.debeCambiarPassword,
        }}
        mapa={mapa}
      />
      <main className="min-h-screen p-4 lg:pl-68 lg:p-8">{children}</main>
    </div>
  )
}
