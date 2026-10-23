import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requierePermisoApi } from '@/lib/private/sesion'
import { supabaseAdmin } from '@/lib/private/supabase-admin'

type Params = { params: Promise<{ id: string }> }

const Esquema = z.object({
  modulos: z
    .array(
      z.object({
        modulo: z.string().trim().min(1).max(60),
        activo: z.boolean(),
      }),
    )
    .min(1, 'Elegí al menos un módulo')
    .max(100),
})

/**
 * Sincroniza los módulos de una empresa: upsert por (empresa_id, modulo).
 * Nunca borra filas (historial de contrataciones); solo alterna `activo`.
 */
export async function PUT(req: Request, { params }: Params): Promise<NextResponse> {
  const guardado = await requierePermisoApi('administracion.empresas', 'editar')
  if (!guardado.ok) return guardado.respuesta
  const { id } = await params

  let datos: z.infer<typeof Esquema>
  try {
    datos = Esquema.parse(await req.json())
  } catch (e) {
    const mensaje =
      e instanceof z.ZodError ? e.issues[0]?.message ?? 'Datos inválidos' : 'Datos inválidos'
    return NextResponse.json({ error: mensaje }, { status: 400 })
  }

  const { data: existe } = await supabaseAdmin()
    .from('empresas')
    .select('id')
    .eq('id', id)
    .single()
  if (!existe) {
    return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 })
  }

  const filas = datos.modulos.map((m) => ({
    empresa_id: id,
    modulo: m.modulo,
    activo: m.activo,
  }))
  const { error } = await supabaseAdmin()
    .from('empresa_modulos')
    .upsert(filas, { onConflict: 'empresa_id,modulo' })
  if (error) {
    return NextResponse.json({ error: 'No se pudieron actualizar los módulos' }, { status: 500 })
  }

  const { data: modulos } = await supabaseAdmin()
    .from('empresa_modulos')
    .select('modulo, activo')
    .eq('empresa_id', id)
    .order('modulo')
  return NextResponse.json({ modulos: modulos ?? [] })
}
