'use client'

import { Fragment, useEffect, useState, type FormEvent } from 'react'
import { Check, Loader2, ShieldCheck } from 'lucide-react'
import { MODULOS, type Accion, type Funcion } from '@/lib/private/modulos'

export interface DatoRol {
  id: string
  name: string
  is_admin: boolean
  is_default: boolean
}

interface Props {
  initialRoles: DatoRol[]
}

const ACCIONES: { clave: Accion; etiqueta: string }[] = [
  { clave: 'ver', etiqueta: 'ver' },
  { clave: 'crear', etiqueta: 'crear' },
  { clave: 'editar', etiqueta: 'editar' },
  { clave: 'eliminar', etiqueta: 'eliminar' },
]

function accionDeFuncion(funcion: Funcion): Accion {
  return funcion.heredaDe ?? funcion.accion
}

export function PermisosClient({ initialRoles }: Props) {
  const [roles] = useState(initialRoles)
  const [roleId, setRoleId] = useState<string>(initialRoles[0]?.id ?? '')
  const [rol, setRol] = useState<DatoRol | null>(initialRoles[0] ?? null)
  const [matriz, setMatriz] = useState<Record<string, Accion[]>>({})
  const [cargando, setCargando] = useState(initialRoles.length > 0)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  useEffect(() => {
    if (!roleId) return
    fetch(`/api/dashboard/admin/permisos?roleId=${roleId}`)
      .then(async (r) => {
        const cuerpo = (await r.json()) as {
          rol?: DatoRol
          permisos?: { nodo: string; acciones: Accion[] }[]
          error?: string
        }
        if (!r.ok) throw new Error(cuerpo.error ?? 'Error')
        setRol(cuerpo.rol ?? null)
        const mapa: Record<string, Accion[]> = {}
        for (const p of cuerpo.permisos ?? []) mapa[p.nodo] = p.acciones
        setMatriz(mapa)
      })
      .catch(() => {
        setMensaje({ tipo: 'error', texto: 'No se pudieron leer los permisos del rol.' })
      })
      .finally(() => setCargando(false))
  }, [roleId])

  function alternar(nodo: string, accion: Accion) {
    setMatriz((prev) => {
      const actuales = prev[nodo] ?? []
      const siguiente = actuales.includes(accion)
        ? actuales.filter((a) => a !== accion)
        : [...actuales, accion]
      const copia = { ...prev }
      if (siguiente.length === 0) delete copia[nodo]
      else copia[nodo] = siguiente
      return copia
    })
  }

  async function guardar(event: FormEvent) {
    event.preventDefault()
    setGuardando(true)
    setMensaje(null)
    try {
      const respuesta = await fetch('/api/dashboard/admin/permisos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId, permisos: matriz }),
      })
      const cuerpo = (await respuesta.json()) as { error?: string }
      if (!respuesta.ok) {
        setMensaje({ tipo: 'error', texto: cuerpo.error ?? 'No se pudieron guardar' })
        return
      }
      setMensaje({ tipo: 'ok', texto: 'Permisos guardados.' })
    } catch {
      setMensaje({ tipo: 'error', texto: 'No se pudieron guardar los permisos.' })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-texto">Permisos</h1>
        <p className="mt-1 text-sm text-texto-suave">
          Conceder un nodo otorga su subárbol con solo la acción marcada. Las funciones no-CRUD
          (confirmar, anular, publicar) nunca se heredan.
        </p>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label htmlFor="sel-rol" className="text-sm font-medium text-texto">
          Rol:
        </label>
        <select
          id="sel-rol"
          value={roleId}
          onChange={(e) => {
            setRoleId(e.target.value)
            setCargando(true)
            setMensaje(null)
          }}
          className="rounded-md border border-borde bg-superficie px-3 py-2 text-sm text-texto focus:border-primario"
        >
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        {rol?.is_admin && (
          <span className="flex items-center gap-1 rounded-full bg-grupo-administracion/15 px-3 py-1 text-xs font-medium text-grupo-administracion">
            <ShieldCheck className="h-3.5 w-3.5" /> Acceso total implícito (is_admin)
          </span>
        )}
        {rol?.is_default && (
          <span className="rounded-full bg-primario/10 px-3 py-1 text-xs font-medium text-primario-oscuro">
            rol por defecto
          </span>
        )}
      </div>

      {mensaje && (
        <p
          role="alert"
          className={`mb-4 rounded-md px-3 py-2 text-sm ${
            mensaje.tipo === 'ok' ? 'bg-exito/10 text-exito' : 'bg-peligro/10 text-peligro'
          }`}
        >
          {mensaje.texto}
        </p>
      )}

      {cargando ? (
        <p className="flex items-center gap-2 text-sm text-texto-suave">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando permisos…
        </p>
      ) : (
        <form onSubmit={guardar} className="space-y-6">
          <div className="overflow-x-auto rounded-xl border border-borde bg-superficie">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-borde text-left text-xs uppercase tracking-wide text-texto-suave">
                  <th className="px-4 py-3">Nodo</th>
                  {ACCIONES.map((a) => (
                    <th key={a.clave} className="w-20 px-2 py-3 text-center">
                      {a.etiqueta}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MODULOS.map((grupo) => (
                  <Fragment key={grupo.clave}>
                    <tr className="border-b border-borde bg-fondo/60">
                      <td className="px-4 py-2.5 font-semibold text-texto" colSpan={5}>
                        {grupo.titulo}
                      </td>
                    </tr>
                    {grupo.submodulos.map((sub) => (
                      <Fragment key={sub.clave}>
                        <tr className="border-b border-borde">
                          <td className="px-4 py-2.5 pl-8 text-texto">{sub.titulo}</td>
                          {ACCIONES.map((a) => (
                            <td key={a.clave} className="px-2 py-2.5 text-center">
                              <input
                                type="checkbox"
                                aria-label={`${a.etiqueta} ${sub.titulo}`}
                                checked={(matriz[sub.clave] ?? []).includes(a.clave)}
                                onChange={() => alternar(sub.clave, a.clave)}
                                disabled={rol?.is_admin}
                                className="h-4 w-4 accent-[var(--marca-primario)]"
                              />
                            </td>
                          ))}
                        </tr>
                        {sub.funciones.map((funcion) => (
                          <tr key={funcion.clave} className="border-b border-borde last:border-0">
                            <td className="px-4 py-2 pl-14 text-xs text-texto-suave">
                              {funcion.titulo}
                              {funcion.heredaDe === null && (
                                <span className="ml-2 rounded bg-advertencia/15 px-1.5 py-0.5 text-[10px] font-medium text-advertencia">
                                  sin herencia
                                </span>
                              )}
                            </td>
                            <td colSpan={4} className="px-2 py-2 text-center">
                              <input
                                type="checkbox"
                                aria-label={funcion.titulo}
                                checked={(matriz[funcion.clave] ?? []).length > 0}
                                onChange={() => alternar(funcion.clave, accionDeFuncion(funcion))}
                                disabled={rol?.is_admin}
                                className="h-4 w-4 accent-[var(--marca-primario)]"
                              />
                            </td>
                          </tr>
                        ))}
                      </Fragment>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="submit"
            disabled={guardando || cargando || rol?.is_admin}
            className="flex items-center gap-2 rounded-md bg-primario px-4 py-2 text-sm font-medium text-white hover:bg-primario-oscuro disabled:opacity-60"
          >
            {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Guardar permisos
          </button>
        </form>
      )}
    </div>
  )
}
