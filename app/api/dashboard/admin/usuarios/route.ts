import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requierePermisoApi } from '@/lib/private/sesion'
import { supabaseAdmin } from '@/lib/private/supabase-admin'
import { generarClaveTemporal } from '@/lib/private/claves'

interface FilaUsuario {
  id: string
  email: string
  name: string
  role_id: string
  password_changed_at: string | null
  created_at: string
  roles: { name: string } | null
}

export async function GET(): Promise<NextResponse> {
  const guardado = await requierePermisoApi('administracion.usuarios', 'ver')
  if (!guardado.ok) return guardado.respuesta

  const { data, error } = await supabaseAdmin()
    .from('users')
    .select('id, email, name, role_id, password_changed_at, created_at, roles ( name )')
    .order('email')
  if (error) {
    return NextResponse.json({ error: 'No se pudieron leer los usuarios' }, { status: 500 })
  }

  const usuarios = ((data ?? []) as unknown as FilaUsuario[]).map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role_id: u.role_id,
    rol: u.roles?.name ?? '—',
    password_changed_at: u.password_changed_at,
    created_at: u.created_at,
  }))
  return NextResponse.json({ usuarios })
}

const EsquemaAlta = z.object({
  name: z.string().trim().min(1, 'Ingresá el nombre').max(120),
  email: z.string().trim().toLowerCase().email('Email inválido').max(254),
  role_id: z.string().uuid('Rol inválido'),
})

export async function POST(req: Request): Promise<NextResponse> {
  const guardado = await requierePermisoApi('administracion.usuarios', 'crear')
  if (!guardado.ok) return guardado.respuesta

  let datos: z.infer<typeof EsquemaAlta>
  try {
    datos = EsquemaAlta.parse(await req.json())
  } catch (e) {
    const mensaje =
      e instanceof z.ZodError ? e.issues[0]?.message ?? 'Datos inválidos' : 'Datos inválidos'
    return NextResponse.json({ error: mensaje }, { status: 400 })
  }

  const { data: rol } = await supabaseAdmin()
    .from('roles')
    .select('id')
    .eq('id', datos.role_id)
    .single()
  if (!rol) {
    return NextResponse.json({ error: 'El rol seleccionado no existe' }, { status: 400 })
  }

  const clave = generarClaveTemporal()
  const creado = await supabaseAdmin().auth.admin.createUser({
    email: datos.email,
    password: clave,
    email_confirm: true,
  })
  if (creado.error || !creado.data.user) {
    const existe = /already/i.test(creado.error?.message ?? '')
    return NextResponse.json(
      { error: existe ? 'Ya existe un usuario con ese email' : 'No se pudo crear el usuario' },
      { status: existe ? 409 : 500 },
    )
  }

  const { error: falloFila } = await supabaseAdmin().from('users').insert({
    id: creado.data.user.id,
    email: datos.email,
    name: datos.name,
    role_id: datos.role_id,
    password_changed_at: null,
  })
  if (falloFila) {
    await supabaseAdmin().auth.admin.deleteUser(creado.data.user.id)
    return NextResponse.json({ error: 'No se pudo crear el usuario' }, { status: 500 })
  }

  return NextResponse.json({
    usuario: {
      id: creado.data.user.id,
      email: datos.email,
      name: datos.name,
      role_id: datos.role_id,
      password_changed_at: null,
    },
    clave_temporal: clave,
  })
}
