import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requierePermisoApi } from '@/lib/private/sesion'
import { supabaseAdmin } from '@/lib/private/supabase-admin'

const Esquema = z.object({
  name: z.string().trim().min(1).max(50).optional(),
  description: z.string().trim().max(200).nullable().optional(),
  is_default: z.boolean().optional(),
  is_admin: z.boolean().optional(),
})

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Params): Promise<NextResponse> {
  const guardado = await requierePermisoApi('administracion.roles', 'editar')
  if (!guardado.ok) return guardado.respuesta
  const { id } = await params

  let datos: z.infer<typeof Esquema>
  try {
    datos = Esquema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  if (datos.is_admin === false) {
    const { data: otros } = await supabaseAdmin()
      .from('roles')
      .select('id')
      .eq('is_admin', true)
      .neq('id', id)
    if (!otros || otros.length === 0) {
      return NextResponse.json(
        { error: 'Debe existir al menos un rol administrador' },
        { status: 400 },
      )
    }
  }

  if (datos.is_default === true) {
    await supabaseAdmin()
      .from('roles')
      .update({ is_default: false })
      .neq('id', id)
  }

  const actualizacion: Record<string, unknown> = {}
  if (typeof datos.name === 'string') actualizacion.name = datos.name
  if (datos.description !== undefined) actualizacion.description = datos.description
  if (typeof datos.is_default === 'boolean') actualizacion.is_default = datos.is_default
  if (typeof datos.is_admin === 'boolean') actualizacion.is_admin = datos.is_admin

  const { data, error } = await supabaseAdmin()
    .from('roles')
    .update(actualizacion)
    .eq('id', id)
    .select('id, name, description, is_default, is_admin')
    .single()
  if (error) {
    const existe = error.code === '23505'
    return NextResponse.json(
      { error: existe ? 'Ya existe un rol con ese nombre' : 'No se pudo actualizar el rol' },
      { status: existe ? 409 : 500 },
    )
  }
  return NextResponse.json({ rol: data })
}

export async function DELETE(_req: Request, { params }: Params): Promise<NextResponse> {
  const guardado = await requierePermisoApi('administracion.roles', 'eliminar')
  if (!guardado.ok) return guardado.respuesta
  const { id } = await params

  const { data: usuarios } = await supabaseAdmin()
    .from('users')
    .select('id')
    .eq('role_id', id)
    .limit(1)
  if (usuarios && usuarios.length > 0) {
    return NextResponse.json(
      { error: 'No se puede eliminar un rol con usuarios asignados' },
      { status: 409 },
    )
  }

  const { error } = await supabaseAdmin().from('roles').delete().eq('id', id)
  if (error) {
    return NextResponse.json({ error: 'No se pudo eliminar el rol' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
