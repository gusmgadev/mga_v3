'use client'

import { useState, type FormEvent } from 'react'
import { Building2, Loader2, Pencil } from 'lucide-react'
import { Modal } from './Modal'

export interface DatoModuloEmpresa {
  modulo: string
  activo: boolean
}

export interface DatoEmpresaResumen {
  id: string
  nombre: string
  codigo: string
  activo: boolean
  plan: string | null
  fecha_inicio: string | null
  fecha_vencimiento: string | null
  estado_implementacion: string | null
  modulos: DatoModuloEmpresa[]
}

export interface DatoEmpresaDetalle extends DatoEmpresaResumen {
  razon_social: string | null
  cuit: string | null
  telefono: string | null
  email: string | null
  direccion: string | null
  localidad: string | null
  notas: string | null
  supabase_url: string
  supabase_anon_key: string
  tiene_service_key: boolean
}

export interface DatoModuloCatalogo {
  id: number
  nombre: string
  descripcion: string | null
  activo: boolean
  orden: number
  empresas_activas?: number
}

interface Props {
  initialEmpresas: DatoEmpresaResumen[]
  initialCatalogo: DatoModuloCatalogo[]
}

const VACIO = {
  nombre: '',
  codigo: '',
  razon_social: '',
  cuit: '',
  telefono: '',
  email: '',
  direccion: '',
  localidad: '',
  plan: 'basico',
  fecha_inicio: '',
  fecha_vencimiento: '',
  estado_implementacion: 'en_progreso',
  notas: '',
  supabase_url: '',
  supabase_anon_key: '',
  supabase_service_key: '',
}

type Formulario = typeof VACIO

/** date 'YYYY-MM-DD' → 'dd/mm/yyyy' sin pasar por Date (sin desfase UTC). */
function fechaCorta(iso: string | null): string {
  if (!iso) return '—'
  const [anio, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${anio}`
}

function aISO(valor: string): string | null {
  return valor.trim() === '' ? null : valor
}

function aTexto(valor: string | null): string {
  return valor ?? ''
}

export function EmpresasClient({ initialEmpresas, initialCatalogo }: Props) {
  const [empresas, setEmpresas] = useState(initialEmpresas)
  const [catalogo] = useState(initialCatalogo)
  const [modal, setModal] = useState<'alta' | 'edicion' | null>(null)
  const [editando, setEditando] = useState<DatoEmpresaDetalle | null>(null)
  const [form, setForm] = useState<Formulario>(VACIO)
  const [modulosForm, setModulosForm] = useState<DatoModuloEmpresa[]>([])
  const [modulosOriginales, setModulosOriginales] = useState<DatoModuloEmpresa[]>([])
  const [guardando, setGuardando] = useState(false)
  const [cargandoDetalle, setCargandoDetalle] = useState(false)
  const [error, setError] = useState('')

  function setCampo<K extends keyof Formulario>(campo: K, valor: Formulario[K]) {
    setForm((f) => ({ ...f, [campo]: valor }))
  }

  function alternarModulo(nombre: string) {
    setModulosForm((prev) => {
      const existe = prev.find((m) => m.modulo === nombre)
      if (existe) {
        return prev.map((m) => (m.modulo === nombre ? { ...m, activo: !m.activo } : m))
      }
      return [...prev, { modulo: nombre, activo: true }]
    })
  }

  /** Unión: catálogo + módulos asignados que ya no están en el catálogo (datos heredados). */
  function modulosUnidos(asignados: DatoModuloEmpresa[]): DatoModuloEmpresa[] {
    const nombres = new Set<string>()
    const resultado: DatoModuloEmpresa[] = []
    for (const m of asignados) {
      if (!nombres.has(m.modulo)) {
        nombres.add(m.modulo)
        resultado.push(m)
      }
    }
    for (const m of catalogo) {
      if (!nombres.has(m.nombre)) {
        nombres.add(m.nombre)
        resultado.push({ modulo: m.nombre, activo: m.activo })
      }
    }
    return resultado.sort((a, b) => a.modulo.localeCompare(b.modulo, 'es'))
  }

  function abrirAlta() {
    setForm(VACIO)
    setModulosForm(catalogo.filter((m) => m.activo).map((m) => ({ modulo: m.nombre, activo: true })))
    setModulosOriginales([])
    setError('')
    setModal('alta')
  }

  async function abrirEdicion(empresa: DatoEmpresaResumen) {
    setModal('edicion')
    setCargandoDetalle(true)
    setError('')
    setEditando(null)
    try {
      const respuesta = await fetch(`/api/superadmin/empresas/${empresa.id}`)
      const cuerpo = (await respuesta.json()) as {
        empresa?: DatoEmpresaDetalle
        error?: string
      }
      if (!respuesta.ok || !cuerpo.empresa) {
        setError(cuerpo.error ?? 'No se pudo cargar la empresa')
        setModal(null)
        return
      }
      const detalle = cuerpo.empresa
      setEditando(detalle)
      setForm({
        nombre: detalle.nombre,
        codigo: detalle.codigo,
        razon_social: aTexto(detalle.razon_social),
        cuit: aTexto(detalle.cuit),
        telefono: aTexto(detalle.telefono),
        email: aTexto(detalle.email),
        direccion: aTexto(detalle.direccion),
        localidad: aTexto(detalle.localidad),
        plan: aTexto(detalle.plan) || 'basico',
        fecha_inicio: aTexto(detalle.fecha_inicio),
        fecha_vencimiento: aTexto(detalle.fecha_vencimiento),
        estado_implementacion: aTexto(detalle.estado_implementacion) || 'en_progreso',
        notas: aTexto(detalle.notas),
        supabase_url: detalle.supabase_url,
        supabase_anon_key: detalle.supabase_anon_key,
        supabase_service_key: '',
      })
      const unidos = modulosUnidos(detalle.modulos)
      setModulosForm(unidos)
      setModulosOriginales(unidos)
    } catch {
      setError('No se pudo cargar la empresa')
      setModal(null)
    } finally {
      setCargandoDetalle(false)
    }
  }

  async function guardar(event: FormEvent) {
    event.preventDefault()
    setGuardando(true)
    setError('')
    try {
      if (modal === 'alta') {
        const respuesta = await fetch('/api/superadmin/empresas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: form.nombre,
            codigo: form.codigo,
            razon_social: aISO(form.razon_social),
            cuit: aISO(form.cuit),
            telefono: aISO(form.telefono),
            email: aISO(form.email),
            direccion: aISO(form.direccion),
            localidad: aISO(form.localidad),
            plan: aISO(form.plan),
            fecha_inicio: aISO(form.fecha_inicio),
            fecha_vencimiento: aISO(form.fecha_vencimiento),
            estado_implementacion: aISO(form.estado_implementacion),
            notas: aISO(form.notas),
            supabase_url: form.supabase_url,
            supabase_anon_key: form.supabase_anon_key,
            supabase_service_key: form.supabase_service_key,
            modulos: modulosForm.filter((m) => m.activo).map((m) => m.modulo),
          }),
        })
        const cuerpo = (await respuesta.json()) as {
          empresa?: DatoEmpresaResumen
          error?: string
        }
        if (!respuesta.ok || !cuerpo.empresa) {
          setError(cuerpo.error ?? 'No se pudo crear la empresa')
          return
        }
        setEmpresas((prev) =>
          [...prev, cuerpo.empresa!].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
        )
        setModal(null)
        return
      }

      if (modal === 'edicion' && editando) {
        const respuesta = await fetch(`/api/superadmin/empresas/${editando.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: form.nombre,
            codigo: form.codigo,
            razon_social: aISO(form.razon_social),
            cuit: aISO(form.cuit),
            telefono: aISO(form.telefono),
            email: aISO(form.email),
            direccion: aISO(form.direccion),
            localidad: aISO(form.localidad),
            plan: aISO(form.plan),
            fecha_inicio: aISO(form.fecha_inicio),
            fecha_vencimiento: aISO(form.fecha_vencimiento),
            estado_implementacion: aISO(form.estado_implementacion),
            notas: aISO(form.notas),
            supabase_url: form.supabase_url,
            supabase_anon_key: form.supabase_anon_key,
            ...(form.supabase_service_key
              ? { supabase_service_key: form.supabase_service_key }
              : {}),
          }),
        })
        const cuerpo = (await respuesta.json()) as {
          empresa?: DatoEmpresaResumen
          error?: string
        }
        if (!respuesta.ok || !cuerpo.empresa) {
          setError(cuerpo.error ?? 'No se pudo actualizar la empresa')
          return
        }

        const cambiodoModulos =
          JSON.stringify(modulosForm) !== JSON.stringify(modulosOriginales)
        if (cambiodoModulos) {
          const respModulos = await fetch(`/api/superadmin/empresas/${editando.id}/modulos`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ modulos: modulosForm }),
          })
          const cuerpoModulos = (await respModulos.json()) as {
            modulos?: DatoModuloEmpresa[]
            error?: string
          }
          if (!respModulos.ok) {
            setError(cuerpoModulos.error ?? 'Los datos se guardaron pero fallaron los módulos')
            return
          }
          cuerpo.empresa.modulos = cuerpoModulos.modulos ?? modulosForm
        }

        const actualizada = cuerpo.empresa
        setEmpresas((prev) =>
          prev
            .map((e) => (e.id === actualizada.id ? { ...e, ...actualizada } : e))
            .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
        )
        setModal(null)
      }
    } catch {
      setError('No se pudo guardar. Probá de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-texto">Empresas</h1>
          <p className="mt-1 text-sm text-texto-suave">
            Empresas clientes del sistema POS y sus módulos contratados.
          </p>
        </div>
        <button
          type="button"
          onClick={abrirAlta}
          className="flex items-center gap-2 rounded-md bg-primario px-4 py-2 text-sm font-medium text-white hover:bg-primario-oscuro"
        >
          <Building2 className="h-4 w-4" />
          Nueva empresa
        </button>
      </header>

      <div className="overflow-x-auto rounded-xl border border-borde bg-superficie">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-borde text-left text-xs uppercase tracking-wide text-texto-suave">
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Módulos</th>
              <th className="px-4 py-3">Vencimiento</th>
              <th className="px-4 py-3">Activa</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {empresas.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-texto-suave">
                  Todavía no hay empresas. Creá la primera con “Nueva empresa”.
                </td>
              </tr>
            )}
            {empresas.map((e) => {
              const activos = e.modulos.filter((m) => m.activo).length
              return (
                <tr key={e.id} className="border-b border-borde last:border-0">
                  <td className="px-4 py-3 font-medium text-texto">{e.nombre}</td>
                  <td className="px-4 py-3 font-mono text-xs text-texto-suave">{e.codigo}</td>
                  <td className="px-4 py-3 text-texto-suave">{e.plan ?? '—'}</td>
                  <td className="px-4 py-3 text-texto-suave">{e.estado_implementacion ?? '—'}</td>
                  <td className="px-4 py-3 text-texto-suave">
                    {activos}/{e.modulos.length}
                  </td>
                  <td className="px-4 py-3 text-texto-suave">{fechaCorta(e.fecha_vencimiento)}</td>
                  <td className="px-4 py-3">
                    {e.activo ? (
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
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => abrirEdicion(e)}
                        className="rounded-md p-1.5 text-texto-suave hover:bg-fondo"
                        aria-label={`Editar ${e.nombre}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Modal
        abierto={modal !== null}
        titulo={modal === 'alta' ? 'Nueva empresa' : 'Editar empresa'}
        formId="form-empresa"
        etiquetaGuardar="Guardar"
        ancho="ancha"
        onCerrar={() => setModal(null)}
      >
        <form id="form-empresa" onSubmit={guardar} className="space-y-4">
          {cargandoDetalle && (
            <p className="flex items-center gap-2 text-sm text-texto-suave">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando empresa…
            </p>
          )}
          <fieldset disabled={cargandoDetalle} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="e-nombre" className="mb-1 block text-sm font-medium text-texto">
                  Nombre *
                </label>
                <input
                  id="e-nombre"
                  required
                  value={form.nombre}
                  onChange={(ev) => setCampo('nombre', ev.target.value)}
                  className="w-full rounded-md border border-borde bg-fondo px-3 py-2 text-sm text-texto focus:border-primario"
                />
              </div>
              <div>
                <label htmlFor="e-codigo" className="mb-1 block text-sm font-medium text-texto">
                  Código * (único)
                </label>
                <input
                  id="e-codigo"
                  required
                  value={form.codigo}
                  onChange={(ev) => setCampo('codigo', ev.target.value)}
                  className="w-full rounded-md border border-borde bg-fondo px-3 py-2 font-mono text-sm text-texto focus:border-primario"
                />
              </div>
              <div>
                <label htmlFor="e-razon" className="mb-1 block text-sm font-medium text-texto">
                  Razón social
                </label>
                <input
                  id="e-razon"
                  value={form.razon_social}
                  onChange={(ev) => setCampo('razon_social', ev.target.value)}
                  className="w-full rounded-md border border-borde bg-fondo px-3 py-2 text-sm text-texto focus:border-primario"
                />
              </div>
              <div>
                <label htmlFor="e-cuit" className="mb-1 block text-sm font-medium text-texto">
                  CUIT
                </label>
                <input
                  id="e-cuit"
                  value={form.cuit}
                  onChange={(ev) => setCampo('cuit', ev.target.value)}
                  className="w-full rounded-md border border-borde bg-fondo px-3 py-2 text-sm text-texto focus:border-primario"
                />
              </div>
              <div>
                <label htmlFor="e-telefono" className="mb-1 block text-sm font-medium text-texto">
                  Teléfono
                </label>
                <input
                  id="e-telefono"
                  value={form.telefono}
                  onChange={(ev) => setCampo('telefono', ev.target.value)}
                  className="w-full rounded-md border border-borde bg-fondo px-3 py-2 text-sm text-texto focus:border-primario"
                />
              </div>
              <div>
                <label htmlFor="e-email" className="mb-1 block text-sm font-medium text-texto">
                  Email
                </label>
                <input
                  id="e-email"
                  type="email"
                  value={form.email}
                  onChange={(ev) => setCampo('email', ev.target.value)}
                  className="w-full rounded-md border border-borde bg-fondo px-3 py-2 text-sm text-texto focus:border-primario"
                />
              </div>
              <div>
                <label htmlFor="e-direccion" className="mb-1 block text-sm font-medium text-texto">
                  Dirección
                </label>
                <input
                  id="e-direccion"
                  value={form.direccion}
                  onChange={(ev) => setCampo('direccion', ev.target.value)}
                  className="w-full rounded-md border border-borde bg-fondo px-3 py-2 text-sm text-texto focus:border-primario"
                />
              </div>
              <div>
                <label htmlFor="e-localidad" className="mb-1 block text-sm font-medium text-texto">
                  Localidad
                </label>
                <input
                  id="e-localidad"
                  value={form.localidad}
                  onChange={(ev) => setCampo('localidad', ev.target.value)}
                  className="w-full rounded-md border border-borde bg-fondo px-3 py-2 text-sm text-texto focus:border-primario"
                />
              </div>
              <div>
                <label htmlFor="e-plan" className="mb-1 block text-sm font-medium text-texto">
                  Plan
                </label>
                <input
                  id="e-plan"
                  value={form.plan}
                  onChange={(ev) => setCampo('plan', ev.target.value)}
                  className="w-full rounded-md border border-borde bg-fondo px-3 py-2 text-sm text-texto focus:border-primario"
                />
              </div>
              <div>
                <label
                  htmlFor="e-estado"
                  className="mb-1 block text-sm font-medium text-texto"
                >
                  Estado de implementación
                </label>
                <input
                  id="e-estado"
                  value={form.estado_implementacion}
                  onChange={(ev) => setCampo('estado_implementacion', ev.target.value)}
                  className="w-full rounded-md border border-borde bg-fondo px-3 py-2 text-sm text-texto focus:border-primario"
                />
              </div>
              <div>
                <label htmlFor="e-inicio" className="mb-1 block text-sm font-medium text-texto">
                  Fecha de inicio
                </label>
                <input
                  id="e-inicio"
                  type="date"
                  value={form.fecha_inicio}
                  onChange={(ev) => setCampo('fecha_inicio', ev.target.value)}
                  className="w-full rounded-md border border-borde bg-fondo px-3 py-2 text-sm text-texto focus:border-primario"
                />
              </div>
              <div>
                <label htmlFor="e-venc" className="mb-1 block text-sm font-medium text-texto">
                  Fecha de vencimiento
                </label>
                <input
                  id="e-venc"
                  type="date"
                  value={form.fecha_vencimiento}
                  onChange={(ev) => setCampo('fecha_vencimiento', ev.target.value)}
                  className="w-full rounded-md border border-borde bg-fondo px-3 py-2 text-sm text-texto focus:border-primario"
                />
              </div>
            </div>

            <div>
              <label htmlFor="e-notas" className="mb-1 block text-sm font-medium text-texto">
                Notas
              </label>
              <textarea
                id="e-notas"
                rows={2}
                value={form.notas}
                onChange={(ev) => setCampo('notas', ev.target.value)}
                className="w-full rounded-md border border-borde bg-fondo px-3 py-2 text-sm text-texto focus:border-primario"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="e-url" className="mb-1 block text-sm font-medium text-texto">
                  URL de Supabase *
                </label>
                <input
                  id="e-url"
                  type="url"
                  required
                  placeholder="https://xxx.supabase.co"
                  value={form.supabase_url}
                  onChange={(ev) => setCampo('supabase_url', ev.target.value)}
                  className="w-full rounded-md border border-borde bg-fondo px-3 py-2 font-mono text-xs text-texto focus:border-primario"
                />
              </div>
              <div>
                <label htmlFor="e-anon" className="mb-1 block text-sm font-medium text-texto">
                  Anon key *
                </label>
                <input
                  id="e-anon"
                  required
                  value={form.supabase_anon_key}
                  onChange={(ev) => setCampo('supabase_anon_key', ev.target.value)}
                  className="w-full rounded-md border border-borde bg-fondo px-3 py-2 font-mono text-xs text-texto focus:border-primario"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="e-service" className="mb-1 block text-sm font-medium text-texto">
                  Service key {modal === 'alta' ? '*' : '(dejar en blanco para conservar)'}
                </label>
                <input
                  id="e-service"
                  required={modal === 'alta'}
                  type="password"
                  autoComplete="off"
                  value={form.supabase_service_key}
                  onChange={(ev) => setCampo('supabase_service_key', ev.target.value)}
                  className="w-full rounded-md border border-borde bg-fondo px-3 py-2 font-mono text-xs text-texto focus:border-primario"
                />
                {modal === 'edicion' && (
                  <p className="mt-1 text-xs text-texto-suave">
                    {editando?.tiene_service_key
                      ? 'Hay una service key guardada. Solo se reemplaza si ingresás una nueva.'
                      : 'Esta empresa no tiene service key guardada.'}
                  </p>
                )}
              </div>
            </div>

            <fieldset>
              <legend className="mb-2 text-sm font-medium text-texto">
                Módulos contratados
              </legend>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
                {modulosForm.map((m) => (
                  <label key={m.modulo} className="flex items-center gap-2 text-sm text-texto">
                    <input
                      type="checkbox"
                      checked={m.activo}
                      onChange={() => alternarModulo(m.modulo)}
                      className="h-4 w-4 accent-[var(--marca-primario)]"
                    />
                    {m.modulo}
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-texto-suave">
                Los módulos desactivados se conservan como históricos; nunca se borran filas.
              </p>
            </fieldset>

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
          </fieldset>
        </form>
      </Modal>
    </div>
  )
}
