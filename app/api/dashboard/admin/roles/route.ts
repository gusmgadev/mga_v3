import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requierePermisoApi } from '@/lib/private/sesion'
import { supabaseAdmin } from '@/lib/private/supabase-admin'

interface FilaRol {
  id: string
  name: string
  description: string | null
  is_default: boolean
  is_admin: boolean
}

interface FilaUsuarioRol {
  role_id: string
}

export async function GET(): Promise<NextResponse> {
  const guardado = await requierePermisoApi('administracion.roles', 'ver')
  if (!guardado.ok) return guardado.respuesta

  const [roles, usuarios] = await Promise.all([
    supabaseAdmin()
      .from('roles')
      .select('id, name, description, is_default, is_admin')
      .order('name'),
    supabaseAdmin().from('users').select('role_id'),
  ])
  if (roles.error) {
    return NextResponse.json({ error: 'No se pudieron leer los roles' }, { status: 500 })
  }

  const conteo = new Map<string, number>()
  for (const u of (usuarios.data ?? []) as FilaUsuarioRol[]) {
    conteo.set(u.role_id, (conteo.get(u.role_id) ?? 0) + 1)
  }

  const lista = ((roles.data ?? []) as FilaRol[]).map((r) => ({
    ...r,
    usuarios: conteo.get(r.id) ?? 0,
  }))
  return NextResponse.json({ roles: lista })
}

const EsquemaAlta = z.object({
  name: z.string().trim().min(1, 'Ingresá el nombre').max(50),
  description: z.string().trim().max(200).optional().nullable(),
  is_default: z.boolean().optional(),
  is_admin: z.boolean().optional(),
})

export async function POST(req: Request): Promise<NextResponse> {
  const guardado = await requierePermisoApi('administracion.roles', 'crear')
  if (!guardado.ok) return guardado.respuesta

  let datos: z.infer<typeof EsquemaAlta>
  try {
    datos = EsquemaAlta.parse(await req.json())
  } catch (e) {
    const mensaje =
      e instanceof z.ZodError ? e.issues[0]?.message ?? 'Datos inválidos' : 'Datos inválidos'
    return NextResponse.json({ error: mensaje }, { status: 400 })
  }

  if (datos.is_default) {
    await supabaseAdmin().from('roles').update({ is_default: false }).neq('is_default', false)
  }

  const { data, error } = await supabaseAdmin()
    .from('roles')
    .insert({
      name: datos.name,
      description: datos.description ?? null,
      is_default: datos.is_default ?? false,
      is_admin: datos.is_admin ?? false,
    })
    .select('id, name, description, is_default, is_admin')
    .single()
  if (error) {
    const existe = error.code === '23505'
    return NextResponse.json(
      { error: existe ? 'Ya existe un rol con ese nombre' : 'No se pudo crear el rol' },
      { status: existe ? 409 : 500 },
    )
  }
  return NextResponse.json({ rol: { ...data, usuarios: 0 } })
}
