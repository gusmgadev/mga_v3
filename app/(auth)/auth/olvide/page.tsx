'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'

export default function OlvidePasswordPage() {
  const [email, setEmail] = useState('')
  const [cargando, setCargando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setCargando(true)
    setError('')
    try {
      const respuesta = await fetch('/api/auth/olvide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!respuesta.ok) {
        throw new Error('No se pudo procesar el pedido')
      }
      setEnviado(true)
    } catch {
      setError('No se pudo procesar el pedido. Probá de nuevo en unos minutos.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="w-full max-w-sm rounded-xl border border-borde bg-superficie p-6 shadow-sm">
      <h1 className="mb-1 text-base font-semibold text-texto">Recuperar contraseña</h1>
      <p className="mb-5 text-sm text-texto-suave">
        Te enviamos un link para elegir una contraseña nueva.
      </p>

      {enviado ? (
        <div className="rounded-md bg-exito/10 px-3 py-3 text-sm text-exito" role="status">
          Si el email existe en el sistema, recibirás un mensaje con las instrucciones.
          Revisá también la carpeta de spam.
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
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
            Enviar link
          </button>
        </form>
      )}

      <div className="mt-4 text-center">
        <Link href="/auth/signin" className="text-sm text-primario hover:underline">
          Volver al ingreso
        </Link>
      </div>
    </div>
  )
}
