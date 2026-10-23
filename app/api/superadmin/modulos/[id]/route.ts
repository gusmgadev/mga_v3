import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requierePermisoApi } from '@/lib/private/sesion'
import { supabaseAdmin } from '@/lib/private/supabase-admin'

type Params = { params: Promise<{ id: string }> }

const Esquema = z.object({
  nombre: z.string().trim().min(1).max(60).optional(),
  descripcion: z.string().trim().max(300).nullable().optional(),
  orden: z.number().int().min(0).max(999).optional(),
  activo: z.boolean().optional(),
})

export async function GET(_req: Request, { params }: Params): Promise<NextResponse> {
  const guardado = await requierePermisoApi('administracion.modulos_pos', 'ver')
  if (!guardado.ok) return guardado.respuesta
  const { id } = await params

  const { data, error } = await supabaseAdmin()
    .from('modulos')
    .select('id, nombre, descripcion, activo, orden')
    .eq('id', Number(id))
    .single()
  if (error || !data) {
    return NextResponse.json({ error: 'Módulo no encontrado' }, { status: 404 })
  }
  return NextResponse.json({ modulo: data })
}

export async function PUT(req: Request, { params }: Params): Promise<NextResponse> {
  const guardado = await requierePermisoApi('administracion.modulos_pos', 'editar')
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

  const actualizacion: Record<string, unknown> = {}
  if (datos.nombre !== undefined) actualizacion.nombre = datos.nombre
  if (datos.descripcion !== undefined) actualizacion.descripcion = datos.descripcion
  if (datos.orden !== undefined) actualizacion.orden = datos.orden
  if (datos.activo !== undefined) actualizacion.activo = datos.activo

  const { data, error } = await supabaseAdmin()
    .from('modulos')
    .update(actualizacion)
    .eq('id', Number(id))
    .select('id, nombre, descripcion, activo, orden')
    .single()
  if (error || !data) {
    const existe = error?.code === '23505'
    if (existe) {
      return NextResponse.json({ error: 'Ya existe un módulo con ese nombre' }, { status: 409 })
    }
    return NextResponse.json({ error: 'No se pudo actualizar el módulo' }, { status: 500 })
  }
  return NextResponse.json({ modulo: data })
}

export async function DELETE(_req: Request, { params }: Params): Promise<NextResponse> {
  const guardado = await requierePermisoApi('administracion.modulos_pos', 'eliminar')
  if (!guardado.ok) return guardado.respuesta
  const { id } = await params

  const { data: modulo } = await supabaseAdmin()
    .from('modulos')
    .select('id, nombre')
    .eq('id', Number(id))
    .single()
  if (!modulo) {
    return NextResponse.json({ error: 'Módulo no encontrado' }, { status: 404 })
  }

  const { data: enUso } = await supabaseAdmin()
    .from('empresa_modulos')
    .select('empresa_id')
    .eq('modulo', modulo.nombre)
    .limit(1)
  if (enUso && enUso.length > 0) {
    return NextResponse.json(
      { error: 'No se puede eliminar: el módulo está asignado a empresas' },
      { status: 409 },
    )
  }

  const { error } = await supabaseAdmin().from('modulos').delete().eq('id', Number(id))
  if (error) {
    return NextResponse.json({ error: 'No se pudo eliminar el módulo' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
