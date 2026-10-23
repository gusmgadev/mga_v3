import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requierePermisoApi } from '@/lib/private/sesion'
import { supabaseAdmin } from '@/lib/private/supabase-admin'

type Params = { params: Promise<{ id: string }> }

const fechaISO = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (usá YYYY-MM-DD)')
  .nullable()
  .optional()

const EsquemaEdicion = z.object({
  nombre: z.string().trim().min(1).max(120).optional(),
  codigo: z.string().trim().min(1).max(40).optional(),
  razon_social: z.string().trim().max(160).nullable().optional(),
  cuit: z.string().trim().max(20).nullable().optional(),
  telefono: z.string().trim().max(40).nullable().optional(),
  email: z.string().trim().toLowerCase().email('Email inválido').max(254).nullable().optional(),
  direccion: z.string().trim().max(200).nullable().optional(),
  localidad: z.string().trim().max(120).nullable().optional(),
  plan: z.string().trim().max(40).nullable().optional(),
  fecha_inicio: fechaISO,
  fecha_vencimiento: fechaISO,
  estado_implementacion: z.string().trim().max(40).nullable().optional(),
  notas: z.string().trim().max(2000).nullable().optional(),
  activo: z.boolean().optional(),
  supabase_url: z.string().trim().url('URL inválida').max(300).optional(),
  supabase_anon_key: z.string().trim().min(1).max(500).optional(),
  /** Opcional y write-only: si llega vacía se conserva la clave actual. */
  supabase_service_key: z.string().trim().max(500).optional(),
})

interface FilaEmpresa {
  id: string
  nombre: string
  codigo: string
  activo: boolean
  razon_social: string | null
  cuit: string | null
  telefono: string | null
  email: string | null
  direccion: string | null
  localidad: string | null
  plan: string | null
  fecha_inicio: string | null
  fecha_vencimiento: string | null
  estado_implementacion: string | null
  notas: string | null
  supabase_url: string
  supabase_anon_key: string
  supabase_service_key: string | null
  empresa_modulos?: { modulo: string; activo: boolean }[] | null
}

function publicar(f: FilaEmpresa) {
  return {
    id: f.id,
    nombre: f.nombre,
    codigo: f.codigo,
    activo: f.activo,
    razon_social: f.razon_social,
    cuit: f.cuit,
    telefono: f.telefono,
    email: f.email,
    direccion: f.direccion,
    localidad: f.localidad,
    plan: f.plan,
    fecha_inicio: f.fecha_inicio,
    fecha_vencimiento: f.fecha_vencimiento,
    estado_implementacion: f.estado_implementacion,
    notas: f.notas,
    supabase_url: f.supabase_url,
    supabase_anon_key: f.supabase_anon_key,
    tiene_service_key: Boolean(f.supabase_service_key),
    modulos: (f.empresa_modulos ?? []).map((m) => ({ modulo: m.modulo, activo: m.activo })),
  }
}

export async function GET(_req: Request, { params }: Params): Promise<NextResponse> {
  const guardado = await requierePermisoApi('administracion.empresas', 'ver')
  if (!guardado.ok) return guardado.respuesta
  const { id } = await params

  const { data, error } = await supabaseAdmin()
    .from('empresas')
    .select(
      'id, nombre, codigo, activo, razon_social, cuit, telefono, email, direccion, localidad, plan, fecha_inicio, fecha_vencimiento, estado_implementacion, notas, supabase_url, supabase_anon_key, supabase_service_key, empresa_modulos ( modulo, activo )',
    )
    .eq('id', id)
    .single()
  if (error || !data) {
    return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 })
  }
  return NextResponse.json({ empresa: publicar(data as unknown as FilaEmpresa) })
}

export async function PUT(req: Request, { params }: Params): Promise<NextResponse> {
  const guardado = await requierePermisoApi('administracion.empresas', 'editar')
  if (!guardado.ok) return guardado.respuesta
  const { id } = await params

  let datos: z.infer<typeof EsquemaEdicion>
  try {
    datos = EsquemaEdicion.parse(await req.json())
  } catch (e) {
    const mensaje =
      e instanceof z.ZodError ? e.issues[0]?.message ?? 'Datos inválidos' : 'Datos inválidos'
    return NextResponse.json({ error: mensaje }, { status: 400 })
  }

  const actualizacion: Record<string, unknown> = {}
  const directos = [
    'nombre',
    'codigo',
    'razon_social',
    'cuit',
    'telefono',
    'email',
    'direccion',
    'localidad',
    'plan',
    'fecha_inicio',
    'fecha_vencimiento',
    'estado_implementacion',
    'notas',
    'activo',
    'supabase_url',
    'supabase_anon_key',
  ] as const
  for (const campo of directos) {
    const valor = datos[campo]
    if (valor !== undefined) actualizacion[campo] = valor
  }
  if (datos.supabase_service_key) {
    actualizacion.supabase_service_key = datos.supabase_service_key
  }
  actualizacion.updated_at = new Date().toISOString()

  const { data, error } = await supabaseAdmin()
    .from('empresas')
    .update(actualizacion)
    .eq('id', id)
    .select(
      'id, nombre, codigo, activo, razon_social, cuit, telefono, email, direccion, localidad, plan, fecha_inicio, fecha_vencimiento, estado_implementacion, notas, supabase_url, supabase_anon_key, supabase_service_key, empresa_modulos ( modulo, activo )',
    )
    .single()
  if (error || !data) {
    const existe = error?.code === '23505'
    if (existe) {
      return NextResponse.json({ error: 'Ya existe una empresa con ese código' }, { status: 409 })
    }
    if (error?.code === 'PGRST116') {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 })
    }
    return NextResponse.json({ error: 'No se pudo actualizar la empresa' }, { status: 500 })
  }
  return NextResponse.json({ empresa: publicar(data as unknown as FilaEmpresa) })
}
