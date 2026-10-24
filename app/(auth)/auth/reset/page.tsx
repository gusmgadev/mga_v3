'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { supabaseAuthBrowser } from '@/lib/private/supabase-auth-browser'

type Estado = 'cargando' | 'listo' | 'sin-sesion' | 'guardando' | 'ok' | 'error'

function parsearHash(hash: string): { accessToken?: string; refreshToken?: string } {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  return {
    accessToken: params.get('access_token') ?? undefined,
    refreshToken: params.get('refresh_token') ?? undefined,
  }
}

export default function ResetPasswordPage() {
  const [estado, setEstado] = useState<Estado>('cargando')
  const [password, setPassword] = useState('')
  const [repetir, setRepetir] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [accessToken, setAccessToken] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false
    async function iniciar() {
      const supabase = supabaseAuthBrowser()
      const url = new URL(window.location.href)
      const codigo = url.searchParams.get('code')
      const hash = parsearHash(window.location.hash)

      try {
        if (codigo) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(codigo)
          if (error) throw error
          if (!cancelado) setAccessToken(data.session?.access_token ?? null)
        } else if (hash.accessToken && hash.refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: hash.accessToken,
            refresh_token: hash.refreshToken,
          })
          if (error) throw error
          if (!cancelado) setAccessToken(data.session?.access_token ?? null)
        } else {
          const { data } = await supabase.auth.getSession()
          if (!data.session) throw new Error('sin sesión')
          if (!cancelado) setAccessToken(data.session.access_token)
        }
        if (!cancelado) setEstado('listo')
      } catch {
        if (!cancelado) {
          setEstado('sin-sesion')
          setMensaje('El link expiró o ya fue usado. Pedí uno nuevo.')
        }
      }
    }
    iniciar()
    return () => {
      cancelado = true
    }
  }, [])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (password.length < 12) {
      setMensaje('La contraseña debe tener al menos 12 caracteres.')
      return
    }
    if (password !== repetir) {
      setMensaje('Las contraseñas no coinciden.')
      return
    }
    if (!accessToken) {
      setEstado('sin-sesion')
      setMensaje('El link expiró o ya fue usado. Pedí uno nuevo.')
      return
    }

    setEstado('guardando')
    setMensaje('')
    try {
      const respuesta = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: accessToken, password }),
      })
      const cuerpo = (await respuesta.json().catch(() => ({}))) as { error?: string }
      if (!respuesta.ok) {
        throw new Error(cuerpo.error ?? 'No se pudo actualizar la contraseña')
      }

      const supabase = supabaseAuthBrowser()
      await supabase.auth.signOut({ scope: 'local' })

      window.history.replaceState({}, document.title, '/auth/signin?msg=password-ok')
      setEstado('ok')
    } catch (e) {
      setEstado('error')
      setMensaje(
        e instanceof Error
          ? e.message
          : 'No se pudo actualizar la contraseña. Probá de nuevo en unos minutos.',
      )
    }
  }

  if (estado === 'cargando') {
    return (
      <div className="flex w-full max-w-sm items-center justify-center rounded-xl border border-borde bg-superficie p-8">
        <Loader2 className="h-5 w-5 animate-spin text-primario" />
      </div>
    )
  }

  if (estado === 'sin-sesion') {
    return (
      <div className="w-full max-w-sm rounded-xl border border-borde bg-superficie p-6 shadow-sm">
        <p className="mb-4 text-sm text-peligro">{mensaje}</p>
        <Link href="/auth/olvide" className="text-sm text-primario hover:underline">
          Pedir un link nuevo
        </Link>
      </div>
    )
  }

  if (estado === 'ok') {
    return (
      <div className="w-full max-w-sm rounded-xl border border-borde bg-superficie p-6 shadow-sm">
        <p className="mb-4 text-sm text-exito" role="status">
          Contraseña actualizada. Ya podés ingresar con la nueva.
        </p>
        <Link href="/auth/signin" className="text-sm font-medium text-primario hover:underline">
          Ir al ingreso
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm rounded-xl border border-borde bg-superficie p-6 shadow-sm">
      <h1 className="mb-1 text-base font-semibold text-texto">Nueva contraseña</h1>
      <p className="mb-5 text-sm text-texto-suave">Mínimo 12 caracteres.</p>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-texto">
            Contraseña nueva
          </label>
          <input
            id="password"
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

        {mensaje && (
          <p role="alert" className="rounded-md bg-peligro/10 px-3 py-2 text-sm text-peligro">
            {mensaje}
          </p>
        )}

        <button
          type="submit"
          disabled={estado === 'guardando'}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-primario px-4 py-2 text-sm font-medium text-white hover:bg-primario-oscuro disabled:opacity-60"
        >
          {estado === 'guardando' && <Loader2 className="h-4 w-4 animate-spin" />}
          Guardar contraseña
        </button>
      </form>
    </div>
  )
}
