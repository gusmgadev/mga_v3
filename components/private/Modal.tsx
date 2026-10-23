'use client'

import { useSyncExternalStore, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

const suscriptorVacio = () => () => {}
const enServidor = () => false
const enCliente = () => true

interface Props {
  abierto: boolean
  titulo: string
  /** id del <form> externo cuyo botón "Guardar" cierra/header-submit. */
  formId?: string
  etiquetaGuardar?: string
  /** 'ancha' para formularios con muchos campos (p. ej. ficha de empresa). */
  ancho?: 'normal' | 'ancha'
  onCerrar: () => void
  children: ReactNode
}

/** Modal según specs/privado.md §3.2: fuera no cierra; guardar en header vía formId; portal. */
export function Modal({ abierto, titulo, formId, etiquetaGuardar = 'Guardar', ancho = 'normal', onCerrar, children }: Props) {
  const montado = useSyncExternalStore(suscriptorVacio, enCliente, enServidor)
  if (!montado || !abierto) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-texto/40" aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className={`relative w-full ${
          ancho === 'ancha' ? 'max-w-2xl' : 'max-w-md'
        } max-h-[90vh] overflow-y-auto rounded-xl border border-borde bg-superficie p-5 shadow-xl`}
        style={{ zIndex: 60 }}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-texto">{titulo}</h2>
          <div className="flex items-center gap-2">
            {formId && (
              <button
                type="submit"
                form={formId}
                className="rounded-md bg-primario px-3 py-1.5 text-sm font-medium text-white hover:bg-primario-oscuro"
              >
                {etiquetaGuardar}
              </button>
            )}
            <button
              type="button"
              onClick={onCerrar}
              className="rounded-md p-1 text-texto-suave hover:bg-fondo"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}
