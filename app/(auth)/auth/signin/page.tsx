'use client'

import { Suspense, useState, type FormEvent } from 'react'
import { useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { Loader2, ShieldCheck } from 'lucide-react'

export default function SigninPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-sm rounded-xl border border-borde bg-superficie p-8 text-center text-sm text-texto-suave">
          Cargando…
        </div>
      }
    >
      <SigninContenido />
    </Suspense>
  )
}

function SigninContenido() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [codigo, setCodigo] = useState('')
  const [paso, setPaso] = useState<'password' | 'mfa'>('password')
  const [stepToken, setStepToken] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const destino = searchParams.get('callbackUrl') ?? '/dashboard'
  const aviso =
    searchParams.get('msg') === 'password-ok'
      ? 'Contraseña actualizada. Ingresá con la nueva.'
      : null

  async function pedirPaso1(datos: {
    email: string
    password: string
  }): Promise<{ step_token: string; mfa_requerido: boolean }> {
    const respuesta = await fetch('/api/auth/paso1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos),
    })
    const cuerpo = (await respuesta.json().catch(() => ({}))) as {
      step_token?: string
      mfa_requerido?: boolean
      error?: string
    }
    if (!respuesta.ok || !cuerpo.step_token) {
      throw new Error(cuerpo.error ?? 'No se pudo iniciar sesión')
    }
    return { step_token: cuerpo.step_token, mfa_requerido: cuerpo.mfa_requerido === true }
  }

  async function finalizar(stepTokenFinal: string, mfaCode?: string) {
    const resultado = await signIn('credentials', {
      step_token: stepTokenFinal,
      mfa_code: mfaCode ?? '',
      redirect: false,
    })
    if (!resultado?.ok) {
      throw new Error(
        mfaCode ? 'Código de verificación incorrecto' : 'No se pudo iniciar sesión',
      )
    }
    window.location.assign(destino)
  }

  async function onSubmitPassword(event: FormEvent) {
    event.preventDefault()
    setError('')
    setCargando(true)
    try {
      const cuerpo = await pedirPaso1({ email, password })
      if (cuerpo.mfa_requerido) {
        setStepToken(cuerpo.step_token)
        setPaso('mfa')
      } else {
        await finalizar(cuerpo.step_token)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo iniciar sesión')
    } finally {
      setCargando(false)
    }
  }

  async function onSubmitMfa(event: FormEvent) {
    event.preventDefault()
    setError('')
    setCargando(true)
    try {
      await finalizar(stepToken, codigo)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo iniciar sesión')
      setCargando(false)
    }
  }

  return (
    <div className="w-full max-w-sm rounded-xl border border-borde bg-superficie p-6 shadow-sm">
      <div className="mb-6 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primario text-sm font-bold text-white">
          MGA
        </span>
        <div>
          <h1 className="text-base font-semibold text-texto">Dashboard</h1>
          <p className="text-xs text-texto-suave">Ingresá con tu cuenta interna</p>
        </div>
      </div>

      {aviso && (
        <p role="status" className="mb-4 rounded-md bg-exito/10 px-3 py-2 text-sm text-exito">
          {aviso}
        </p>
      )}

      {paso === 'password' ? (
        <form onSubmit={onSubmitPassword} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-texto">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-borde bg-fondo px-3 py-2 text-sm text-texto focus:border-primario"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-texto">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-borde bg-fondo px-3 py-2 text-sm text-texto focus:border-primario"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-md bg-peligro/10 px-3 py-2 text-sm text-peligro">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primario px-4 py-2 text-sm font-medium text-white hover:bg-primario-oscuro disabled:opacity-60"
          >
            {cargando && <Loader2 className="h-4 w-4 animate-spin" />}
            Ingresar
          </button>

          <div className="text-center">
            <Link href="/auth/olvide" className="text-sm text-primario hover:underline">
              Olvidé mi contraseña
            </Link>
          </div>
        </form>
      ) : (
        <form onSubmit={onSubmitMfa} className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-texto-suave">
            <ShieldCheck className="h-4 w-4 text-acento" />
            Ingresá el código de tu app de autenticación
          </div>
          <div>
            <label htmlFor="codigo" className="mb-1 block text-sm font-medium text-texto">
              Código de verificación
            </label>
            <input
              id="codigo"
              inputMode="numeric"
              pattern="[0-9]*"
              required
              autoFocus
              autoComplete="one-time-code"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              className="w-full rounded-md border border-borde bg-fondo px-3 py-2 text-center font-mono text-lg tracking-widest text-texto focus:border-primario"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-md bg-peligro/10 px-3 py-2 text-sm text-peligro">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primario px-4 py-2 text-sm font-medium text-white hover:bg-primario-oscuro disabled:opacity-60"
          >
            {cargando && <Loader2 className="h-4 w-4 animate-spin" />}
            Verificar
          </button>

          <button
            type="button"
            onClick={() => {
              setPaso('password')
              setCodigo('')
              setError('')
            }}
            className="w-full text-center text-sm text-texto-suave hover:underline"
          >
            Volver
          </button>
        </form>
      )}
    </div>
  )
}
