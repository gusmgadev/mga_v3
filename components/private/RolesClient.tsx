'use client'

import { useState, type FormEvent } from 'react'
import { Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { Modal } from './Modal'

export interface DatoRolConConteo {
  id: string
  name: string
  description: string | null
  is_default: boolean
  is_admin: boolean
  usuarios: number
}

interface Props {
  initialRoles: DatoRolConConteo[]
}

export function RolesClient({ initialRoles }: Props) {
  const [roles, setRoles] = useState(initialRoles)
  const [modal, setModal] = useState<'alta' | 'edicion' | null>(null)
  const [editando, setEditando] = useState<DatoRolConConteo | null>(null)
  const [form, setForm] = useState({ name: '', description: '', is_default: false, is_admin: false })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  function abrirAlta() {
    setForm({ name: '', description: '', is_default: false, is_admin: false })
    setEditando(null)
    setError('')
    setModal('alta')
  }

  function abrirEdicion(rol: DatoRolConConteo) {
    setForm({
      name: rol.name,
      description: rol.description ?? '',
      is_default: rol.is_default,
      is_admin: rol.is_admin,
    })
    setEditando(rol)
    setError('')
    setModal('edicion')
  }

  async function guardar(event: FormEvent) {
    event.preventDefault()
    setGuardando(true)
    setError('')
    try {
      const esAlta = modal === 'alta'
      const url = esAlta ? '/api/dashboard/admin/roles' : `/api/dashboard/admin/roles/${editando!.id}`
      const respuesta = await fetch(url, {
        method: esAlta ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          description: form.description || null,
          is_default: form.is_default,
          is_admin: form.is_admin,
        }),
      })
      const cuerpo = (await respuesta.json()) as {
        rol?: DatoRolConConteo
        error?: string
      }
      if (!respuesta.ok) {
        setError(cuerpo.error ?? 'No se pudo guardar el rol')
        return
      }
      if (esAlta && cuerpo.rol) {
        setRoles((prev) => [...prev, { ...cuerpo.rol!, usuarios: 0 }].sort((a, b) => a.name.localeCompare(b.name)))
      } else if (editando) {
        setRoles((prev) => {
          const actualizado = prev.map((r) =>
            r.id === editando.id
              ? { ...r, name: form.name, description: form.description || null, is_default: form.is_default, is_admin: form.is_admin }
              : r,
          )
          if (form.is_default) {
            return actualizado.map((r) =>
              editando && r.id !== editando.id ? { ...r, is_default: false } : r,
            )
          }
          return actualizado
        })
      }
      setModal(null)
    } catch {
      setError('No se pudo guardar. Probá de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  async function eliminar(rol: DatoRolConConteo) {
    if (rol.usuarios > 0) {
      window.alert('No se puede eliminar un rol con usuarios asignados.')
      return
    }
    if (!window.confirm(`¿Eliminar el rol ${rol.name}?`)) return
    try {
      const respuesta = await fetch(`/api/dashboard/admin/roles/${rol.id}`, { method: 'DELETE' })
      const cuerpo = (await respuesta.json().catch(() => ({}))) as { error?: string }
      if (!respuesta.ok) {
        window.alert(cuerpo.error ?? 'No se pudo eliminar el rol')
        return
      }
      setRoles((prev) => prev.filter((r) => r.id !== rol.id))
    } catch {
      window.alert('No se pudo eliminar el rol')
    }
  }

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-texto">Roles</h1>
          <p className="mt-1 text-sm text-texto-suave">
            El rol por defecto no tiene permisos; los administradores acceden por <code>is_admin</code>.
          </p>
        </div>
        <button
          type="button"
          onClick={abrirAlta}
          className="flex items-center gap-2 rounded-md bg-primario px-4 py-2 text-sm font-medium text-white hover:bg-primario-oscuro"
        >
          <Plus className="h-4 w-4" />
          Nuevo rol
        </button>
      </header>

      <div className="space-y-3">
        {roles.map((rol) => (
          <article
            key={rol.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-borde bg-superficie p-4"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-grupo-administracion/15">
                <ShieldCheck className="h-4.5 w-4.5 text-grupo-administracion" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-semibold text-texto">{rol.name}</h2>
                  {rol.is_admin && (
                    <span className="rounded-full bg-grupo-administracion/15 px-2 py-0.5 text-xs font-medium text-grupo-administracion">
                      is_admin
                    </span>
                  )}
                  {rol.is_default && (
                    <span className="rounded-full bg-primario/10 px-2 py-0.5 text-xs font-medium text-primario-oscuro">
                      por defecto
                    </span>
                  )}
                  <span className="text-xs text-texto-suave">{rol.usuarios} usuario(s)</span>
                </div>
                {rol.description && (
                  <p className="text-xs text-texto-suave">{rol.description}</p>
                )}
              </div>
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => abrirEdicion(rol)}
                className="rounded-md p-1.5 text-texto-suave hover:bg-fondo"
                aria-label={`Editar ${rol.name}`}
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => eliminar(rol)}
                disabled={rol.usuarios > 0}
                className="rounded-md p-1.5 text-peligro hover:bg-peligro/10 disabled:opacity-40"
                aria-label={`Eliminar ${rol.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </article>
        ))}
      </div>

      <Modal
        abierto={modal !== null}
        titulo={modal === 'alta' ? 'Nuevo rol' : 'Editar rol'}
        formId="form-rol"
        onCerrar={() => setModal(null)}
      >
        <form id="form-rol" onSubmit={guardar} className="space-y-4">
          <div>
            <label htmlFor="r-name" className="mb-1 block text-sm font-medium text-texto">
              Nombre
            </label>
            <input
              id="r-name"
              required
              maxLength={50}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-md border border-borde bg-fondo px-3 py-2 text-sm text-texto focus:border-primario"
            />
          </div>
          <div>
            <label htmlFor="r-desc" className="mb-1 block text-sm font-medium text-texto">
              Descripción
            </label>
            <input
              id="r-desc"
              maxLength={200}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full rounded-md border border-borde bg-fondo px-3 py-2 text-sm text-texto focus:border-primario"
            />
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-texto">
              <input
                type="checkbox"
                checked={form.is_admin}
                onChange={(e) => setForm((f) => ({ ...f, is_admin: e.target.checked }))}
                className="h-4 w-4 accent-[var(--marca-primario)]"
              />
              Administrador (<code>is_admin</code>): acceso total
            </label>
            <label className="flex items-center gap-2 text-sm text-texto">
              <input
                type="checkbox"
                checked={form.is_default}
                onChange={(e) => setForm((f) => ({ ...f, is_default: e.target.checked }))}
                className="h-4 w-4 accent-[var(--marca-primario)]"
              />
              Rol por defecto para nuevas altas
            </label>
          </div>

          {error && (
            <p role="alert" className="rounded-md bg-peligro/10 px-3 py-2 text-sm text-peligro">
              {error}
            </p>
          )}
          <button type="submit" className="hidden" aria-hidden="true" />
          {guardando && <p className="text-sm text-texto-suave">Guardando…</p>}
        </form>
      </Modal>
    </div>
  )
}
