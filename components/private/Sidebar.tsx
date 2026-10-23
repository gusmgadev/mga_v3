'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { LogOut, Menu, ShieldCheck, X } from 'lucide-react'
import { MODULOS, type Grupo } from '@/lib/private/modulos'
import { themePrivado, type ClaveGrupo } from '@/lib/private/theme'
import type { Accion } from '@/lib/private/modulos'
import { ICONOS } from './iconos'

interface Props {
  usuario: {
    nombre: string
    email: string
    is_admin: boolean
    debeCambiarPassword: boolean
  }
  mapa: Record<string, Accion[]>
}

function submodulosVisibles(grupo: Grupo, mapa: Record<string, Accion[]>): Grupo {
  return {
    ...grupo,
    submodulos: grupo.submodulos.filter(
      (s) => (mapa[s.clave] ?? []).includes('ver'),
    ),
  }
}

export function Sidebar({ usuario, mapa }: Props) {
  const pathname = usePathname()
  const [abierto, setAbierto] = useState(false)

  const grupos = MODULOS.map((g) => submodulosVisibles(g, mapa)).filter(
    (g) => g.submodulos.length > 0,
  )

  const contenido = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 px-5 py-5">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primario text-sm font-bold text-white">
            MGA
          </span>
          <span className="text-sm font-semibold text-texto">Dashboard</span>
        </Link>
        <button
          type="button"
          className="rounded-md p-1 text-texto-suave lg:hidden"
          onClick={() => setAbierto(false)}
          aria-label="Cerrar menú"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="Módulos">
        <ul className="space-y-4">
          {grupos.map((grupo) => {
            const Icono = ICONOS[grupo.icono] ?? ShieldCheck
            const color = themePrivado.grupos[grupo.clave as ClaveGrupo]
            return (
              <li key={grupo.clave}>
                <div className="mb-1 flex items-center gap-2 px-2">
                  <Icono className={`h-4 w-4 ${color?.texto ?? 'text-primario'}`} />
                  <span className="text-xs font-semibold uppercase tracking-wide text-texto-suave">
                    {grupo.titulo}
                  </span>
                </div>
                <ul>
                  {grupo.submodulos.map((sub) => (
                    <li key={sub.clave}>
                      <Link
                        href={sub.ruta}
                        onClick={() => setAbierto(false)}
                        className={`block rounded-md px-4 py-2 text-sm transition-colors ${
                          pathname === sub.ruta || pathname.startsWith(`${sub.ruta}/`)
                            ? 'bg-primario/10 font-medium text-primario-oscuro'
                            : 'text-texto hover:bg-superficie hover:text-texto'
                        }`}
                        aria-current={
                          pathname === sub.ruta || pathname.startsWith(`${sub.ruta}/`)
                            ? 'page'
                            : undefined
                        }
                      >
                        {sub.titulo}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="border-t border-borde px-4 py-4">
        <Link
          href="/dashboard/seguridad"
          onClick={() => setAbierto(false)}
          className={`mb-3 block rounded-md px-2 py-2 text-sm ${
            pathname.startsWith('/dashboard/seguridad')
              ? 'bg-primario/10 font-medium text-primario-oscuro'
              : 'text-texto hover:bg-superficie'
          }`}
        >
          Seguridad
          {usuario.debeCambiarPassword && (
            <span className="ml-2 rounded-full bg-advertencia/15 px-2 py-0.5 text-xs font-medium text-advertencia">
              cambio pendiente
            </span>
          )}
        </Link>
        <div className="mb-2 truncate px-2 text-xs text-texto-suave" title={usuario.email}>
          {usuario.nombre}
          {usuario.is_admin && (
            <span className="ml-1 rounded-full bg-grupo-administracion/15 px-1.5 py-0.5 text-[10px] font-semibold text-grupo-administracion">
              admin
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: '/auth/signin' })}
          className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-peligro hover:bg-peligro/10"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </div>
    </div>
  )

  return (
    <>
      <button
        type="button"
        className="fixed left-3 top-3 z-40 rounded-md bg-superficie p-2 text-texto shadow lg:hidden"
        onClick={() => setAbierto(true)}
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5" />
      </button>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-borde bg-superficie lg:block">
        {contenido}
      </aside>

      {abierto && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-texto/40"
            onClick={() => setAbierto(false)}
            aria-hidden="true"
          />
          <aside className="absolute inset-y-0 left-0 w-64 bg-superficie shadow-xl">
            {contenido}
          </aside>
        </div>
      )}
    </>
  )
}
