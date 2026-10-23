import type { Metadata } from 'next'
import { requiereVista } from '@/lib/private/sesion'
import { supabaseAdmin } from '@/lib/private/supabase-admin'
import {
  EmpresasClient,
  type DatoEmpresaResumen,
  type DatoModuloCatalogo,
  type DatoModuloEmpresa,
} from '@/components/private/EmpresasClient'

export const metadata: Metadata = {
  title: 'Empresas | MGA Informática',
  robots: { index: false, follow: false },
}

interface FilaEmpresa {
  id: string
  nombre: string
  codigo: string
  activo: boolean
  plan: string | null
  fecha_inicio: string | null
  fecha_vencimiento: string | null
  estado_implementacion: string | null
  empresa_modulos?: { modulo: string; activo: boolean }[] | null
}

export default async function EmpresasPage() {
  await requiereVista('administracion.empresas')

  const [empresas, catalogo] = await Promise.all([
    supabaseAdmin()
      .from('empresas')
      .select(
        'id, nombre, codigo, activo, plan, fecha_inicio, fecha_vencimiento, estado_implementacion, empresa_modulos ( modulo, activo )',
      )
      .order('nombre'),
    supabaseAdmin()
      .from('modulos')
      .select('id, nombre, descripcion, activo, orden')
      .order('orden'),
  ])

  const datos: DatoEmpresaResumen[] = ((empresas.data ?? []) as unknown as FilaEmpresa[]).map(
    (f) => ({
      id: f.id,
      nombre: f.nombre,
      codigo: f.codigo,
      activo: f.activo,
      plan: f.plan,
      fecha_inicio: f.fecha_inicio,
      fecha_vencimiento: f.fecha_vencimiento,
      estado_implementacion: f.estado_implementacion,
      modulos: ((f.empresa_modulos ?? []) as DatoModuloEmpresa[]).map((m) => ({
        modulo: m.modulo,
        activo: m.activo,
      })),
    }),
  )
  const listaCatalogo: DatoModuloCatalogo[] = (catalogo.data ?? []) as DatoModuloCatalogo[]

  return (
    <div className="mx-auto max-w-5xl">
      <EmpresasClient initialEmpresas={datos} initialCatalogo={listaCatalogo} />
    </div>
  )
}
