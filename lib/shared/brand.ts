/** Constantes de marca compartidas (SEP-3): fuente única de colores/identidad. */
export const BRAND = {
  nombre: 'MGA Informática',
  monograma: 'MGA',
  primario: '#0F4C81',
  primarioOscuro: '#0A3558',
  acento: '#2E9D8F',
  fondo: '#F6F7F9',
  superficie: '#FFFFFF',
  borde: '#E5E7EB',
  texto: '#1F2937',
  textoSuave: '#6B7280',
  peligro: '#B91C1C',
  exito: '#15803D',
  advertencia: '#B45309',
  grupos: {
    zoologic: '#7C3AED',
    prospectos: '#0F4C81',
    servicios: '#2E9D8F',
    altas: '#B45309',
    inventario: '#0E7490',
    fondos: '#15803D',
    administracion: '#4B5563',
    landing: '#BE185D',
  },
} as const

/** Variables CSS globales inyectadas por app/layout.tsx (una sola fuente: BRAND). */
export function cssDeMarca(): string {
  return `:root{${Object.entries({
    '--marca-primario': BRAND.primario,
    '--marca-primario-oscuro': BRAND.primarioOscuro,
    '--marca-acento': BRAND.acento,
    '--marca-fondo': BRAND.fondo,
    '--marca-superficie': BRAND.superficie,
    '--marca-borde': BRAND.borde,
    '--marca-texto': BRAND.texto,
    '--marca-texto-suave': BRAND.textoSuave,
    '--marca-peligro': BRAND.peligro,
    '--marca-exito': BRAND.exito,
    '--marca-advertencia': BRAND.advertencia,
    '--marca-grupo-zoologic': BRAND.grupos.zoologic,
    '--marca-grupo-prospectos': BRAND.grupos.prospectos,
    '--marca-grupo-servicios': BRAND.grupos.servicios,
    '--marca-grupo-altas': BRAND.grupos.altas,
    '--marca-grupo-inventario': BRAND.grupos.inventario,
    '--marca-grupo-fondos': BRAND.grupos.fondos,
    '--marca-grupo-administracion': BRAND.grupos.administracion,
    '--marca-grupo-landing': BRAND.grupos.landing,
  })
    .map(([k, v]) => `${k}:${v}`)
    .join(';')}}`
}
