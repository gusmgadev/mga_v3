'use client'

import { useState, type FormEvent } from 'react'
import { Copy, KeyRound, Loader2, Pencil, Trash2, UserPlus } from 'lucide-react'
import { Modal } from './Modal'

export interface DatoUsuario {
  id: string
  email: string
  name: string
  role_id: string
  rol: string
  password_changed_at: string | null
  created_at: string
}

export interface DatoRol {
  id: string
  name: string
  is_admin: boolean
  is_default: boolean
}

interface Props {
  initialUsuarios: DatoUsuario[]
  initialRoles: DatoRol[]
  usuarioActualId: string
}

interface ClaveMostrada {
  email: string
  clave: string
}

export function UsuariosClient({ initialUsuarios, initialRoles, usuarioActualId }: Props) {
  const [usuarios, setUsuarios] = useState(initialUsuarios)
  const [roles] = useState(initialRoles)
  const [modal, setModal] = useState<'alta' | 'edicion' | null>(null)
  const [editando, setEditando] = useState<DatoUsuario | null>(null)
  const [form, setForm] = useState({ name: '', email: '', role_id: '' })
  const [regenerar, setRegenerar] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [claveMostrada, setClaveMostrada] = useState<ClaveMostrada | null>(null)
  const [eliminandoId, setEliminandoId] = useState<string | null>(null)

  function abrirAlta() {
    setForm({ name: '', email: '', role_id: roles[0]?.id ?? '' })
    setEditando(null)
    setError('')
    setModal('alta')
  }

  function abrirEdicion(usuario: DatoUsuario) {
    setForm({ name: usuario.name, email: usuario.email, role_id: usuario.role_id })
    setRegenerar(false)
    setEditando(usuario)
    setError('')
    setModal('edicion')
  }

  async function guardar(event: FormEvent) {
    event.preventDefault()
    setGuardando(true)
    setError('')
    try {
      if (modal === 'alta') {
        const respuesta = await fetch('/api/dashboard/admin/usuarios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: form.name, email: form.email, role_id: form.role_id }),
        })
        const cuerpo = (await respuesta.json()) as {
          usuario?: DatoUsuario
          clave_temporal?: string
          error?: string
        }
        if (!respuesta.ok || !cuerpo.usuario) {
          setError(cuerpo.error ?? 'No se pudo crear el usuario')
          return
        }
        const rol = roles.find((r) => r.id === cuerpo.usuario!.role_id)?.name ?? '—'
        setUsuarios((prev) =>
          [...prev, { ...cuerpo.usuario!, rol }].sort((a, b) => a.email.localeCompare(b.email)),
        )
        setModal(null)
        if (cuerpo.clave_temporal) {
          setClaveMostrada({ email: cuerpo.usuario.email, clave: cuerpo.clave_temporal })
        }
        return
      }

      if (modal === 'edicion' && editando) {
        const respuesta = await fetch(`/api/dashboard/admin/usuarios/${editando.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name,
            role_id: form.role_id,
            regenerar_clave: regenerar || undefined,
          }),
        })
        const cuerpo = (await respuesta.json()) as {
          clave_temporal?: string | null
          error?: string
        }
        if (!respuesta.ok) {
          setError(cuerpo.error ?? 'No se pudo actualizar el usuario')
          return
        }
        const rol = roles.find((r) => r.id === form.role_id)?.name ?? '—'
        setUsuarios((prev) =>
          prev.map((u) =>
            u.id === editando.id
              ? {
                  ...u,
                  name: form.name,
                  role_id: form.role_id,
                  rol,
                  password_changed_at: regenerar ? null : u.password_changed_at,
                }
              : u,
          ),
        )
        setModal(null)
        if (cuerpo.clave_temporal) {
          setClaveMostrada({ email: editando.email, clave: cuerpo.clave_temporal })
        }
      }
    } catch {
      setError('No se pudo guardar. Probá de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  async function eliminar(usuario: DatoUsuario) {
    if (!window.confirm(`¿Eliminar el usuario ${usuario.email}? Esta acción no se puede deshacer.`)) {
      return
    }
    setEliminandoId(usuario.id)
    try {
      const respuesta = await fetch(`/api/dashboard/admin/usuarios/${usuario.id}`, {
        method: 'DELETE',
      })
      const cuerpo = (await respuesta.json().catch(() => ({}))) as { error?: string }
      if (!respuesta.ok) {
        window.alert(cuerpo.error ?? 'No se pudo eliminar el usuario')
        return
      }
      setUsuarios((prev) => prev.filter((u) => u.id !== usuario.id))
    } finally {
      setEliminandoId(null)
    }
  }

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-texto">Usuarios</h1>
          <p className="mt-1 text-sm text-texto-suave">
            Altas y gestión de cuentas internas. La clave inicial se muestra una sola vez.
          </p>
        </div>
        <button
          type="button"
          onClick={abrirAlta}
          className="flex items-center gap-2 rounded-md bg-primario px-4 py-2 text-sm font-medium text-white hover:bg-primario-oscuro"
        >
          <UserPlus className="h-4 w-4" />
          Nuevo usuario
        </button>
      </header>

      {claveMostrada && (
        <div className="mb-6 rounded-lg border border-advertencia/40 bg-advertencia/10 p-4">
          <p className="mb-2 text-sm font-medium text-advertencia">
            Clave temporal de {claveMostrada.email} (se muestra una sola vez):
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="rounded-md bg-superficie px-3 py-1.5 font-mono text-sm text-texto">
              {claveMostrada.clave}
            </code>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(claveMostrada.clave)}
              className="flex items-center gap-1 rounded-md border border-borde px-2 py-1.5 text-xs text-texto hover:bg-superficie"
            >
              <Copy className="h-3.5 w-3.5" /> Copiar
            </button>
            <button
              type="button"
              onClick={() => setClaveMostrada(null)}
              className="text-xs text-advertencia underline"
            >
              Entendido, ocultar
            </button>
          </div>
          <p className="mt-2 text-xs text-advertencia">
            Entregala fuera de línea (WhatsApp, en persona). El usuario deberá cambiarla al ingresar.
          </p>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-borde bg-superficie">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-borde text-left text-xs uppercase tracking-wide text-texto-suave">
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Clave</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-texto-suave">
                  Todavía no hay usuarios. Creá el primero con “Nuevo usuario”.
                </td>
              </tr>
            )}
            {usuarios.map((u) => (
              <tr key={u.id} className="border-b border-borde last:border-0">
                <td className="px-4 py-3 font-medium text-texto">
                  {u.name}
                  {u.id === usuarioActualId && (
                    <span className="ml-2 rounded-full bg-primario/10 px-2 py-0.5 text-xs text-primario-oscuro">
                      vos
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-texto-suave">{u.email}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-grupo-administracion/15 px-2 py-0.5 text-xs font-medium text-grupo-administracion">
                    {u.rol}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {u.password_changed_at === null ? (
                    <span className="text-xs font-medium text-advertencia">temporal pendiente</span>
                  ) : (
                    <span className="text-xs text-texto-suave">ok</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => abrirEdicion(u)}
                      className="rounded-md p-1.5 text-texto-suave hover:bg-fondo"
                      aria-label={`Editar ${u.email}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => eliminar(u)}
                      disabled={eliminandoId === u.id || u.id === usuarioActualId}
                      className="rounded-md p-1.5 text-peligro hover:bg-peligro/10 disabled:opacity-40"
                      aria-label={`Eliminar ${u.email}`}
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
        titulo={modal === 'alta' ? 'Nuevo usuario' : 'Editar usuario'}
        formId="form-usuario"
        etiquetaGuardar="Guardar"
        onCerrar={() => setModal(null)}
      >
        <form id="form-usuario" onSubmit={guardar} className="space-y-4">
          <div>
            <label htmlFor="u-name" className="mb-1 block text-sm font-medium text-texto">
              Nombre
            </label>
            <input
              id="u-name"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-md border border-borde bg-fondo px-3 py-2 text-sm text-texto focus:border-primario"
            />
          </div>
          <div>
            <label htmlFor="u-email" className="mb-1 block text-sm font-medium text-texto">
              Email
            </label>
            <input
              id="u-email"
              type="email"
              required
              disabled={modal === 'edicion'}
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full rounded-md border border-borde bg-fondo px-3 py-2 text-sm text-texto focus:border-primario disabled:opacity-60"
            />
          </div>
          <div>
            <label htmlFor="u-rol" className="mb-1 block text-sm font-medium text-texto">
              Rol
            </label>
            <select
              id="u-rol"
              required
              value={form.role_id}
              onChange={(e) => setForm((f) => ({ ...f, role_id: e.target.value }))}
              className="w-full rounded-md border border-borde bg-fondo px-3 py-2 text-sm text-texto focus:border-primario"
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {modal === 'edicion' && (
            <label className="flex items-center gap-2 text-sm text-texto">
              <input
                type="checkbox"
                checked={regenerar}
                onChange={(e) => setRegenerar(e.target.checked)}
                className="h-4 w-4 accent-[var(--marca-primario)]"
              />
              Generar clave temporal nueva (fuerza el cambio al ingresar)
            </label>
          )}

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

      {modal === 'alta' && (
        <p className="mt-3 flex items-center gap-1 text-xs text-texto-suave">
          <KeyRound className="h-3.5 w-3.5" /> La clave temporal se genera en el servidor y solo se
          muestra al crear.
        </p>
      )}
    </div>
  )
}
