import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, ShieldCheck, TriangleAlert } from 'lucide-react'
import { auth } from '@/lib/private/auth'
import { factorVerificado } from '@/lib/private/auth/mfa'
import { permisosAsignados } from '@/lib/private/sesion'
import { mapaDePermisos } from '@/lib/private/permisos'
import { MODULOS } from '@/lib/private/modulos'
import { themePrivado, type ClaveGrupo } from '@/lib/private/theme'
import { ICONOS } from '@/components/private/iconos'

export const metadata: Metadata = {
  title: 'Dashboard | MGA Informática',
  robots: { index: false, follow: false },
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect('/auth/signin')

  const asignados = session.user.is_admin
    ? []
    : await permisosAsignados(session.user.role_id)
  const mapa = mapaDePermisos(
    { is_admin: session.user.is_admin },
    asignados,
    MODULOS.flatMap((g) => g.submodulos.map((s) => ({ clave: s.clave, tipo: 'submodulo' as const }))),
  )

  const grupos = MODULOS.map((g) => ({
    ...g,
    submodulos: g.submodulos.filter((s) => (mapa[s.clave] ?? []).includes('ver')),
  })).filter((g) => g.submodulos.length > 0)

  const sinMfa =
    session.user.is_admin && session.user.debeCambiarPassword === false
      ? !(await factorVerificado(session.user.id))
      : false

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-texto">
            Hola, {session.user.name ?? session.user.email}
          </h1>
          <p className="mt-1 text-sm text-texto-suave">
            Operativa del sistema. Elegí un módulo para empezar.
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            session.user.is_admin
              ? 'bg-grupo-administracion/15 text-grupo-administracion'
              : 'bg-primario/10 text-primario-oscuro'
          }`}
        >
          {session.user.is_admin ? 'Administrador' : session.user.role || 'Usuario'}
        </span>
      </header>

      {session.user.debeCambiarPassword && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-advertencia/30 bg-advertencia/10 p-4">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-advertencia" />
          <div className="text-sm">
            <p className="font-medium text-advertencia">Debés cambiar tu contraseña</p>
            <Link href="/dashboard/seguridad" className="mt-1 inline-flex items-center gap-1 text-advertencia underline">
              Ir a Seguridad <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {grupos.map((grupo) => {
          const Icono = ICONOS[grupo.icono] ?? ShieldCheck
          const color = themePrivado.grupos[grupo.clave as ClaveGrupo]
          return (
            <section
              key={grupo.clave}
              className={`rounded-xl border bg-superficie p-5 ${color?.borde ?? 'border-borde'}`}
            >
              <div className="mb-3 flex items-center gap-3">
                <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${color?.fondo ?? 'bg-primario/10'}`}>
                  <Icono className={`h-5 w-5 ${color?.texto ?? 'text-primario'}`} />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-texto">{grupo.titulo}</h2>
                  <p className="text-xs text-texto-suave">{grupo.descripcion}</p>
                </div>
              </div>
              <ul className="space-y-1">
                {grupo.submodulos.map((sub) => (
                  <li key={sub.clave}>
                    <Link
                      href={sub.ruta}
                      className="flex items-center justify-between rounded-md px-2 py-2 text-sm text-texto hover:bg-fondo"
                    >
                      <span>{sub.titulo}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-texto-suave" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}

        <section className="rounded-xl border border-borde bg-superficie p-5">
          <div className="mb-3 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primario/10">
              <ShieldCheck className="h-5 w-5 text-primario" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-texto">Seguridad</h2>
              <p className="text-xs text-texto-suave">Contraseña y verificación en dos pasos.</p>
            </div>
          </div>
          {sinMfa && (
            <p className="mb-2 rounded-md bg-advertencia/10 px-2 py-1.5 text-xs text-advertencia">
              Activá la verificación en dos pasos (obligatoria para administradores).
            </p>
          )}
          <Link
            href="/dashboard/seguridad"
            className="flex items-center justify-between rounded-md px-2 py-2 text-sm text-texto hover:bg-fondo"
          >
            <span>Ir a Seguridad</span>
            <ArrowRight className="h-3.5 w-3.5 text-texto-suave" />
          </Link>
        </section>
      </div>
    </div>
  )
}
