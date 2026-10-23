import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requierePermisoApi } from '@/lib/private/sesion'
import { supabaseAdmin } from '@/lib/private/supabase-admin'
import { generarClaveTemporal } from '@/lib/private/claves'

const Esquema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  role_id: z.string().uuid().optional(),
  regenerar_clave: z.boolean().optional(),
})

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Params): Promise<NextResponse> {
  const guardado = await requierePermisoApi('administracion.usuarios', 'editar')
  if (!guardado.ok) return guardado.respuesta
  const session = guardado.session
  const { id } = await params

  let datos: z.infer<typeof Esquema>
  try {
    datos = Esquema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  if (id === session.user.id && typeof datos.role_id === 'string' && datos.role_id !== session.user.role_id) {
    return NextResponse.json({ error: 'No podés cambiar tu propio rol' }, { status: 400 })
  }

  const actualizacion: Record<string, unknown> = {}
  if (typeof datos.name === 'string') actualizacion.name = datos.name
  if (typeof datos.role_id === 'string') {
    const { data: rol } = await supabaseAdmin()
      .from('roles')
      .select('id')
      .eq('id', datos.role_id)
      .single()
    if (!rol) return NextResponse.json({ error: 'El rol seleccionado no existe' }, { status: 400 })
    actualizacion.role_id = datos.role_id
  }

  if (Object.keys(actualizacion).length > 0) {
    const { error } = await supabaseAdmin()
      .from('users')
      .update(actualizacion)
      .eq('id', id)
    if (error) {
      return NextResponse.json({ error: 'No se pudo actualizar el usuario' }, { status: 500 })
    }
  }

  let claveTemporal: string | null = null
  if (datos.regenerar_clave) {
    const clave = generarClaveTemporal()
    const { error } = await supabaseAdmin().auth.admin.updateUserById(id, { password: clave })
    if (error) {
      return NextResponse.json({ error: 'No se pudo regenerar la clave' }, { status: 500 })
    }
    await supabaseAdmin()
      .from('users')
      .update({ password_changed_at: null })
      .eq('id', id)
    claveTemporal = clave
  }

  return NextResponse.json({ ok: true, clave_temporal: claveTemporal })
}

export async function DELETE(_req: Request, { params }: Params): Promise<NextResponse> {
  const guardado = await requierePermisoApi('administracion.usuarios', 'eliminar')
  if (!guardado.ok) return guardado.respuesta
  const session = guardado.session
  const { id } = await params

  if (id === session.user.id) {
    return NextResponse.json({ error: 'No podés eliminar tu propia cuenta' }, { status: 400 })
  }

  const { error } = await supabaseAdmin().auth.admin.deleteUser(id)
  if (error) {
    return NextResponse.json({ error: 'No se pudo eliminar el usuario' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
