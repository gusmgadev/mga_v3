import { BRAND } from '@/lib/shared/brand'

/**
 * Tokens del dashboard (D-10): clases semánticas derivadas de `lib/shared/brand.ts`.
 * Los componentes usan estas clases; nunca colores hardcodeados (AGENTS §6).
 */
export const themePrivado = {
  marca: BRAND,
  /** Clases por grupo del árbol canónico (home, sidebar, badges). */
  grupos: {
    zoologic: { texto: 'text-grupo-zoologic', fondo: 'bg-grupo-zoologic/10', borde: 'border-grupo-zoologic/30' },
    prospectos: { texto: 'text-grupo-prospectos', fondo: 'bg-grupo-prospectos/10', borde: 'border-grupo-prospectos/30' },
    servicios: { texto: 'text-grupo-servicios', fondo: 'bg-grupo-servicios/10', borde: 'border-grupo-servicios/30' },
    altas: { texto: 'text-grupo-altas', fondo: 'bg-grupo-altas/10', borde: 'border-grupo-altas/30' },
    inventario: { texto: 'text-grupo-inventario', fondo: 'bg-grupo-inventario/10', borde: 'border-grupo-inventario/30' },
    fondos: { texto: 'text-grupo-fondos', fondo: 'bg-grupo-fondos/10', borde: 'border-grupo-fondos/30' },
    administracion: { texto: 'text-grupo-administracion', fondo: 'bg-grupo-administracion/10', borde: 'border-grupo-administracion/30' },
    landing_page: { texto: 'text-grupo-landing', fondo: 'bg-grupo-landing/10', borde: 'border-grupo-landing/30' },
  } satisfies Record<string, { texto: string; fondo: string; borde: string }>,
} as const

export type ClaveGrupo = keyof typeof themePrivado.grupos
