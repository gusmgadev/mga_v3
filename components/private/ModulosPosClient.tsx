'use client'

import { useState, type FormEvent } from 'react'
import { Boxes, Loader2, Pencil, Trash2 } from 'lucide-react'
import { Modal } from './Modal'

export interface DatoModuloPos {
  id: number
  nombre: string
  descripcion: string | null
  activo: boolean
  orden: number
  empresas_activas: number
}

interface Props {
  initialModulos: DatoModuloPos[]
}

export function ModulosPosClient({ initialModulos }: Props) {
  const [modulos, setModulos] = useState(initialModulos)
  const [modal, setModal] = useState<'alta' | 'edicion' | null>(null)
  const [editando, setEditando] = useState<DatoModuloPos | null>(null)
  const [form, setForm] = useState({ nombre: '', descripcion: '', orden: 0, activo: true })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [eliminandoId, setEliminandoId] = useState<number | null>(null)

  function abrirAlta() {
    setForm({
      nombre: '',
      descripcion: '',
      orden: (modulos.at(-1)?.orden ?? 0) + 1,
      activo: true,
    })
    setEditando(null)
    setError('')
    setModal('alta')
  }

  function abrirEdicion(modulo: DatoModuloPos) {
    setForm({
      nombre: modulo.nombre,
      descripcion: modulo.descripcion ?? '',
      orden: modulo.orden,
      activo: modulo.activo,
    })
    setEditando(modulo)
    setError('')
    setModal('edicion')
  }

  async function guardar(event: FormEvent) {
    event.preventDefault()
    setGuardando(true)
    setError('')
    try {
      const esAlta = modal === 'alta'
      const url = esAlta ? '/api/superadmin/modulos' : `/api/superadmin/modulos/${editando!.id}`
      const respuesta = await fetch(url, {
        method: esAlta ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: form.nombre,
          descripcion: form.descripcion.trim() === '' ? null : form.descripcion,
          orden: form.orden,
          activo: form.activo,
        }),
      })
      const cuerpo = (await respuesta.json()) as {
        modulo?: DatoModuloPos
        error?: string
      }
      if (!respuesta.ok || !cuerpo.modulo) {
        setError(cuerpo.error ?? 'No se pudo guardar el módulo')
        return
      }
      setModulos((prev) =>
        esAlta
          ? [...prev, cuerpo.modulo!].sort((a, b) => a.orden - b.orden)
          : prev.map((m) => (m.id === cuerpo.modulo!.id ? cuerpo.modulo! : m)),
      )
      setModal(null)
    } catch {
      setError('No se pudo guardar. Probá de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  async function eliminar(modulo: DatoModuloPos) {
    if (
      !window.confirm(
        `¿Eliminar el módulo “${modulo.nombre}”? Solo se puede si ninguna empresa lo tiene asignado.`,
      )
    ) {
      return
    }
    setEliminandoId(modulo.id)
    try {
      const respuesta = await fetch(`/api/superadmin/modulos/${modulo.id}`, {
        method: 'DELETE',
      })
      const cuerpo = (await respuesta.json().catch(() => ({}))) as { error?: string }
      if (!respuesta.ok) {
        window.alert(cuerpo.error ?? 'No se pudo eliminar el módulo')
        return
      }
      setModulos((prev) => prev.filter((m) => m.id !== modulo.id))
    } finally {
      setEliminandoId(null)
    }
  }

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-texto">Módulos POS</h1>
          <p className="mt-1 text-sm text-texto-suave">
            Catálogo de módulos del sistema POS. Las empresas lo referencian por nombre.
          </p>
        </div>
        <button
          type="button"
          onClick={abrirAlta}
          className="flex items-center gap-2 rounded-md bg-primario px-4 py-2 text-sm font-medium text-white hover:bg-primario-oscuro"
        >
          <Boxes className="h-4 w-4" />
          Nuevo módulo
        </button>
      </header>

      <div className="overflow-x-auto rounded-xl border border-borde bg-superficie">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-borde text-left text-xs uppercase tracking-wide text-texto-suave">
              <th className="px-4 py-3">Orden</th>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Descripción</th>
              <th className="px-4 py-3">Empresas activas</th>
              <th className="px-4 py-3">Activo</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {modulos.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-texto-suave">
                  El catálogo está vacío. Creá el primer módulo.
                </td>
              </tr>
            )}
            {modulos.map((m) => (
              <tr key={m.id} className="border-b border-borde last:border-0">
                <td className="px-4 py-3 font-mono text-xs text-texto-suave">{m.orden}</td>
                <td className="px-4 py-3 font-medium text-texto">{m.nombre}</td>
                <td className="px-4 py-3 text-texto-suave">{m.descripcion ?? '—'}</td>
                <td className="px-4 py-3 text-texto-suave">{m.empresas_activas}</td>
                <td className="px-4 py-3">
                  {m.activo ? (
                    <span className="rounded-full bg-exito/15 px-2 py-0.5 text-xs font-medium text-exito">
                      sí
                    </span>
                  ) : (
                    <span className="rounded-full bg-peligro/15 px-2 py-0.5 text-xs font-medium text-peligro">
                      no
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => abrirEdicion(m)}
                      className="rounded-md p-1.5 text-texto-suave hover:bg-fondo"
                      aria-label={`Editar ${m.nombre}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => eliminar(m)}
                      disabled={eliminandoId === m.id}
                      className="rounded-md p-1.5 text-peligro hover:bg-peligro/10 disabled:opacity-40"
                      aria-label={`Eliminar ${m.nombre}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        abierto={modal !== null}
        titulo={modal === 'alta' ? 'Nuevo módulo' : 'Editar módulo'}
        formId="form-modulo-pos"
        etiquetaGuardar="Guardar"
        onCerrar={() => setModal(null)}
      >
        <form id="form-modulo-pos" onSubmit={guardar} className="space-y-4">
          <div>
            <label htmlFor="m-nombre" className="mb-1 block text-sm font-medium text-texto">
              Nombre * (único; las empresas lo referencian por este valor)
            </label>
            <input
              id="m-nombre"
              required
              value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              className="w-full rounded-md border border-borde bg-fondo px-3 py-2 text-sm text-texto focus:border-primario"
            />
          </div>
          <div>
            <label htmlFor="m-desc" className="mb-1 block text-sm font-medium text-texto">
              Descripción
            </label>
            <textarea
              id="m-desc"
              rows={2}
              value={form.descripcion}
              onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
              className="w-full rounded-md border border-borde bg-fondo px-3 py-2 text-sm text-texto focus:border-primario"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="m-orden" className="mb-1 block text-sm font-medium text-texto">
                Orden
              </label>
              <input
                id="m-orden"
                type="number"
                min={0}
                max={999}
                value={form.orden}
                onChange={(e) =>
                  setForm((f) => ({ ...f, orden: Number(e.target.value) || 0 }))
                }
                className="w-full rounded-md border border-borde bg-fondo px-3 py-2 text-sm text-texto focus:border-primario"
              />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm text-texto">
                <input
                  type="checkbox"
                  checked={form.activo}
                  onChange={(e) => setForm((f) => ({ ...f, activo: e.target.checked }))}
                  className="h-4 w-4 accent-[var(--marca-primario)]"
                />
                Activo (disponible para nuevas altas)
              </label>
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-md bg-peligro/10 px-3 py-2 text-sm text-peligro">
              {error}
            </p>
          )}

          <button type="submit" className="hidden" aria-hidden="true" />
          {guardando && (
            <p className="flex items-center gap-2 text-sm text-texto-suave">
              <Loader2 className="h-4 w-4 animate-spin" /> Guardando…
            </p>
          )}
        </form>
      </Modal>
    </div>
  )
}
