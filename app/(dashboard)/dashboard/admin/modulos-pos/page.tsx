import type { Metadata } from 'next'
import { requiereVista } from '@/lib/private/sesion'
import { supabaseAdmin } from '@/lib/private/supabase-admin'
import { ModulosPosClient, type DatoModuloPos } from '@/components/private/ModulosPosClient'

export const metadata: Metadata = {
  title: 'Módulos POS | MGA Informática',
  robots: { index: false, follow: false },
}

interface FilaModulo {
  id: number
  nombre: string
  descripcion: string | null
  activo: boolean
  orden: number
}

export default async function ModulosPosPage() {
  await requiereVista('administracion.modulos_pos')

  const [catalogo, usos] = await Promise.all([
    supabaseAdmin()
      .from('modulos')
      .select('id, nombre, descripcion, activo, orden')
      .order('orden'),
    supabaseAdmin().from('empresa_modulos').select('modulo, activo'),
  ])

  const usosActivos = new Map<string, number>()
  for (const fila of (usos.data ?? []) as { modulo: string; activo: boolean }[]) {
    if (fila.activo) usosActivos.set(fila.modulo, (usosActivos.get(fila.modulo) ?? 0) + 1)
  }

  const datos: DatoModuloPos[] = ((catalogo.data ?? []) as unknown as FilaModulo[]).map((m) => ({
    id: m.id,
    nombre: m.nombre,
    descripcion: m.descripcion,
    activo: m.activo,
    orden: m.orden,
    empresas_activas: usosActivos.get(m.nombre) ?? 0,
  }))

  return (
    <div className="mx-auto max-w-5xl">
      <ModulosPosClient initialModulos={datos} />
    </div>
  )
}
