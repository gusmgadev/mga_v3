'use client'

import { useState, type FormEvent } from 'react'
import { signOut } from 'next-auth/react'
import { KeyRound, Loader2, ShieldCheck, ShieldOff, TriangleAlert } from 'lucide-react'

interface Props {
  email: string
  debeCambiarPassword: boolean
  esAdmin: boolean
  tieneMfa: boolean
  factorId: string | null
}

interface Enrolamiento {
  factor_id: string
  secreto: string
  uri: string
}

export function SeguridadClient({
  email,
  debeCambiarPassword,
  esAdmin,
  tieneMfa,
  factorId: factorInicial,
}: Props) {
  const [password, setPassword] = useState('')
  const [repetir, setRepetir] = useState('')
  const [passwordActual, setPasswordActual] = useState('')
  const [guardandoPassword, setGuardandoPassword] = useState(false)
  const [mensajePassword, setMensajePassword] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  const [tieneMfaEstado, setTieneMfa] = useState(tieneMfa)
  const [factorId, setFactorId] = useState(factorInicial)
  const [enrolamiento, setEnrolamiento] = useState<Enrolamiento | null>(null)
  const [codigo, setCodigo] = useState('')
  const [codigoBaja, setCodigoBaja] = useState('')
  const [mostrarBaja, setMostrarBaja] = useState(false)
  const [accionMfa, setAccionMfa] = useState('')
  const [mensajeMfa, setMensajeMfa] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  async function cambiarPassword(event: FormEvent) {
    event.preventDefault()
    setMensajePassword(null)
    if (password.length < 12) {
      setMensajePassword({ tipo: 'error', texto: 'La contraseña debe tener al menos 12 caracteres.' })
      return
    }
    if (password !== repetir) {
      setMensajePassword({ tipo: 'error', texto: 'Las contraseñas no coinciden.' })
      return
    }
    setGuardandoPassword(true)
    try {
      const respuesta = await fetch('/api/dashboard/seguridad/cambiar-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, password_actual: passwordActual || undefined }),
      })
      const cuerpo = (await respuesta.json()) as { error?: string; requiere_relogin?: boolean }
      if (!respuesta.ok) {
        setMensajePassword({ tipo: 'error', texto: cuerpo.error ?? 'No se pudo actualizar' })
        return
      }
      await signOut({ callbackUrl: '/auth/signin?msg=password-ok' })
    } catch {
      setMensajePassword({ tipo: 'error', texto: 'No se pudo actualizar la contraseña.' })
      setGuardandoPassword(false)
    }
  }

  async function iniciarEnrolamiento() {
    setMensajeMfa(null)
    setAccionMfa('iniciar')
    try {
      const respuesta = await fetch('/api/dashboard/mfa/enroll', { method: 'POST' })
      const cuerpo = (await respuesta.json()) as Enrolamiento & { error?: string }
      if (!respuesta.ok) {
        setMensajeMfa({ tipo: 'error', texto: cuerpo.error ?? 'No se pudo iniciar' })
        return
      }
      setEnrolamiento({ factor_id: cuerpo.factor_id, secreto: cuerpo.secreto, uri: cuerpo.uri })
      setFactorId(cuerpo.factor_id)
    } catch {
      setMensajeMfa({ tipo: 'error', texto: 'No se pudo iniciar la configuración.' })
    } finally {
      setAccionMfa('')
    }
  }

  async function verificarCodigo(event: FormEvent) {
    event.preventDefault()
    if (!enrolamiento) return
    setMensajeMfa(null)
    setAccionMfa('verificar')
    try {
      const respuesta = await fetch('/api/dashboard/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factor_id: enrolamiento.factor_id, code: codigo }),
      })
      const cuerpo = (await respuesta.json()) as { error?: string }
      if (!respuesta.ok) {
        setMensajeMfa({ tipo: 'error', texto: cuerpo.error ?? 'Código incorrecto' })
        return
      }
      setTieneMfa(true)
      setEnrolamiento(null)
      setCodigo('')
      setMensajeMfa({ tipo: 'ok', texto: 'Verificación en dos pasos activada.' })
    } catch {
      setMensajeMfa({ tipo: 'error', texto: 'No se pudo verificar el código.' })
    } finally {
      setAccionMfa('')
    }
  }

  async function desactivarMfa(event: FormEvent) {
    event.preventDefault()
    if (!factorId) return
    setMensajeMfa(null)
    setAccionMfa('desactivar')
    try {
      const respuesta = await fetch('/api/dashboard/mfa', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factor_id: factorId, code: codigoBaja }),
      })
      const cuerpo = (await respuesta.json()) as { error?: string }
      if (!respuesta.ok) {
        setMensajeMfa({ tipo: 'error', texto: cuerpo.error ?? 'No se pudo desactivar' })
        return
      }
      setTieneMfa(false)
      setFactorId(null)
      setMostrarBaja(false)
      setCodigoBaja('')
      setMensajeMfa({ tipo: 'ok', texto: 'Verificación en dos pasos desactivada.' })
    } catch {
      setMensajeMfa({ tipo: 'error', texto: 'No se pudo desactivar.' })
    } finally {
      setAccionMfa('')
    }
  }

  return (
    <div className="space-y-6">
      {debeCambiarPassword && (
        <div className="flex items-start gap-3 rounded-lg border border-advertencia/30 bg-advertencia/10 p-4">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-advertencia" />
          <p className="text-sm text-advertencia">
            Tu contraseña es temporal: debés cambiarla antes de usar el sistema.
          </p>
        </div>
      )}

      <section className="rounded-xl border border-borde bg-superficie p-6">
        <div className="mb-4 flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primario" />
          <h2 className="text-base font-semibold text-texto">Contraseña</h2>
        </div>
        <form onSubmit={cambiarPassword} className="space-y-4">
          {!debeCambiarPassword && (
            <div>
              <label htmlFor="actual" className="mb-1 block text-sm font-medium text-texto">
                Contraseña actual
              </label>
              <input
                id="actual"
                type="password"
                required
                autoComplete="current-password"
                value={passwordActual}
                onChange={(e) => setPasswordActual(e.target.value)}
                className="w-full rounded-md border border-borde bg-fondo px-3 py-2 text-sm text-texto focus:border-primario"
              />
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="nueva" className="mb-1 block text-sm font-medium text-texto">
                Contraseña nueva
              </label>
              <input
                id="nueva"
                type="password"
                required
                minLength={12}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-borde bg-fondo px-3 py-2 text-sm text-texto focus:border-primario"
              />
            </div>
            <div>
              <label htmlFor="repetir" className="mb-1 block text-sm font-medium text-texto">
                Repetir contraseña
              </label>
              <input
                id="repetir"
                type="password"
                required
                minLength={12}
                autoComplete="new-password"
                value={repetir}
                onChange={(e) => setRepetir(e.target.value)}
                className="w-full rounded-md border border-borde bg-fondo px-3 py-2 text-sm text-texto focus:border-primario"
              />
            </div>
          </div>

          {mensajePassword && (
            <p
              role="alert"
              className={`rounded-md px-3 py-2 text-sm ${
                mensajePassword.tipo === 'ok'
                  ? 'bg-exito/10 text-exito'
                  : 'bg-peligro/10 text-peligro'
              }`}
            >
              {mensajePassword.texto}
            </p>
          )}

          <button
            type="submit"
            disabled={guardandoPassword}
            className="flex items-center gap-2 rounded-md bg-primario px-4 py-2 text-sm font-medium text-white hover:bg-primario-oscuro disabled:opacity-60"
          >
            {guardandoPassword && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar contraseña
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-borde bg-superficie p-6">
        <div className="mb-4 flex items-center gap-2">
          {tieneMfaEstado ? (
            <ShieldCheck className="h-5 w-5 text-exito" />
          ) : (
            <ShieldOff className="h-5 w-5 text-advertencia" />
          )}
          <h2 className="text-base font-semibold text-texto">Verificación en dos pasos</h2>
        </div>

        {esAdmin && !tieneMfaEstado && (
          <p className="mb-4 rounded-md bg-advertencia/10 px-3 py-2 text-sm text-advertencia">
            Es obligatoria para administradores: activala para seguir operando con normalidad.
          </p>
        )}

        {mensajeMfa && (
          <p
            role="alert"
            className={`mb-4 rounded-md px-3 py-2 text-sm ${
              mensajeMfa.tipo === 'ok' ? 'bg-exito/10 text-exito' : 'bg-peligro/10 text-peligro'
            }`}
          >
            {mensajeMfa.texto}
          </p>
        )}

        {tieneMfaEstado ? (
          mostrarBaja ? (
            <form onSubmit={desactivarMfa} className="space-y-3">
              <label htmlFor="codigo-baja" className="block text-sm font-medium text-texto">
                Ingresá un código vigente para desactivar
              </label>
              <div className="flex gap-2">
                <input
                  id="codigo-baja"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  maxLength={6}
                  value={codigoBaja}
                  onChange={(e) => setCodigoBaja(e.target.value)}
                  className="w-36 rounded-md border border-borde bg-fondo px-3 py-2 text-center font-mono text-sm tracking-widest text-texto focus:border-primario"
                />
                <button
                  type="submit"
                  disabled={accionMfa !== ''}
                  className="rounded-md bg-peligro px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
                >
                  {accionMfa === 'desactivar' ? 'Desactivando…' : 'Desactivar'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMostrarBaja(false)
                    setCodigoBaja('')
                  }}
                  className="rounded-md border border-borde px-4 py-2 text-sm text-texto hover:bg-fondo"
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-texto-suave">
                Activa. Se te pedirá un código de tu app al ingresar.
              </p>
              <button
                type="button"
                onClick={() => setMostrarBaja(true)}
                className="rounded-md border border-peligro/40 px-3 py-1.5 text-sm text-peligro hover:bg-peligro/10"
              >
                Desactivar
              </button>
            </div>
          )
        ) : enrolamiento ? (
          <div className="space-y-4">
            <ol className="list-decimal space-y-1 pl-5 text-sm text-texto">
              <li>Agregá la cuenta en tu app de autenticación (Google Authenticator, Authy, 1Password…) con este secreto:</li>
            </ol>
            <code className="block break-all rounded-md bg-fondo px-3 py-3 font-mono text-sm text-texto">
              {enrolamiento.secreto}
            </code>
            <form onSubmit={verificarCodigo} className="flex flex-wrap items-end gap-2">
              <div>
                <label htmlFor="codigo-mfa" className="mb-1 block text-sm font-medium text-texto">
                  Código de 6 dígitos
                </label>
                <input
                  id="codigo-mfa"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  maxLength={6}
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  className="w-36 rounded-md border border-borde bg-fondo px-3 py-2 text-center font-mono text-sm tracking-widest text-texto focus:border-primario"
                />
              </div>
              <button
                type="submit"
                disabled={accionMfa !== ''}
                className="rounded-md bg-primario px-4 py-2 text-sm font-medium text-white hover:bg-primario-oscuro disabled:opacity-60"
              >
                {accionMfa === 'verificar' ? 'Verificando…' : 'Activar'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEnrolamiento(null)
                  setCodigo('')
                }}
                className="rounded-md border border-borde px-4 py-2 text-sm text-texto hover:bg-fondo"
              >
                Cancelar
              </button>
            </form>
          </div>
        ) : (
          <div>
            <p className="mb-3 text-sm text-texto-suave">
              Protege tu cuenta con un código de tu app de autenticación cada vez que ingresás.
            </p>
            <button
              type="button"
              onClick={iniciarEnrolamiento}
              disabled={accionMfa !== ''}
              className="flex items-center gap-2 rounded-md bg-primario px-4 py-2 text-sm font-medium text-white hover:bg-primario-oscuro disabled:opacity-60"
            >
              {accionMfa === 'iniciar' && <Loader2 className="h-4 w-4 animate-spin" />}
              Activar verificación
            </button>
          </div>
        )}
      </section>

      <p className="text-xs text-texto-suave">Cuenta: {email}</p>
    </div>
  )
}
