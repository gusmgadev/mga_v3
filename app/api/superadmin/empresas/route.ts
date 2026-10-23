import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requierePermisoApi } from '@/lib/private/sesion'
import { supabaseAdmin } from '@/lib/private/supabase-admin'

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

/** Nunca se devuelve `supabase_service_key` (write-only; riesgo si la BD se filtra). */
function publicarEmpresa(f: FilaEmpresa, modulos: { modulo: string; activo: boolean }[]) {
  return {
    id: f.id,
    nombre: f.nombre,
    codigo: f.codigo,
    activo: f.activo,
    plan: f.plan,
    fecha_inicio: f.fecha_inicio,
    fecha_vencimiento: f.fecha_vencimiento,
    estado_implementacion: f.estado_implementacion,
    modulos,
  }
}

export async function GET(): Promise<NextResponse> {
  const guardado = await requierePermisoApi('administracion.empresas', 'ver')
  if (!guardado.ok) return guardado.respuesta

  const { data, error } = await supabaseAdmin()
    .from('empresas')
    .select(
      'id, nombre, codigo, activo, plan, fecha_inicio, fecha_vencimiento, estado_implementacion, empresa_modulos ( modulo, activo )',
    )
    .order('nombre')
  if (error) {
    return NextResponse.json({ error: 'No se pudieron leer las empresas' }, { status: 500 })
  }

  const empresas = ((data ?? []) as unknown as FilaEmpresa[]).map((f) =>
    publicarEmpresa(
      f,
      (f.empresa_modulos ?? []).map((m) => ({ modulo: m.modulo, activo: m.activo })),
    ),
  )
  return NextResponse.json({ empresas })
}

const fechaISO = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (usá YYYY-MM-DD)')
  .nullable()
  .optional()

export const EsquemaAlta = z.object({
  nombre: z.string().trim().min(1, 'Ingresá el nombre').max(120),
  codigo: z.string().trim().min(1, 'Ingresá el código').max(40),
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
  supabase_url: z.string().trim().url('URL inválida').max(300),
  supabase_anon_key: z.string().trim().min(1, 'Falta la anon key').max(500),
  supabase_service_key: z.string().trim().min(1, 'Falta la service key').max(500),
  modulos: z.array(z.string().trim().min(1).max(60)).max(100).optional(),
})

function filasModulos(datos: { modulos?: string[] }, empresaId: string, catalogo: string[]) {
  const elegidos = new Set(datos.modulos ?? catalogo)
  const nombres = new Set([...catalogo, ...elegidos])
  return [...nombres].map((modulo) => ({
    empresa_id: empresaId,
    modulo,
    activo: elegidos.has(modulo),
  }))
}

export async function POST(req: Request): Promise<NextResponse> {
  const guardado = await requierePermisoApi('administracion.empresas', 'crear')
  if (!guardado.ok) return guardado.respuesta

  let datos: z.infer<typeof EsquemaAlta>
  try {
    datos = EsquemaAlta.parse(await req.json())
  } catch (e) {
    const mensaje =
      e instanceof z.ZodError ? e.issues[0]?.message ?? 'Datos inválidos' : 'Datos inválidos'
    return NextResponse.json({ error: mensaje }, { status: 400 })
  }

  const { data: catalogo, error: falloCatalogo } = await supabaseAdmin()
    .from('modulos')
    .select('nombre')
    .eq('activo', true)
  if (falloCatalogo) {
    return NextResponse.json({ error: 'No se pudo leer el catálogo de módulos' }, { status: 500 })
  }
  const nombresCatalogo = ((catalogo ?? []) as { nombre: string }[]).map((m) => m.nombre)

  const { data: creado, error: falloInsert } = await supabaseAdmin()
    .from('empresas')
    .insert({
      nombre: datos.nombre,
      codigo: datos.codigo,
      razon_social: datos.razon_social ?? null,
      cuit: datos.cuit ?? null,
      telefono: datos.telefono ?? null,
      email: datos.email ?? null,
      direccion: datos.direccion ?? null,
      localidad: datos.localidad ?? null,
      plan: datos.plan ?? 'basico',
      fecha_inicio: datos.fecha_inicio ?? null,
      fecha_vencimiento: datos.fecha_vencimiento ?? null,
      estado_implementacion: datos.estado_implementacion ?? 'en_progreso',
      notas: datos.notas ?? null,
      activo: datos.activo ?? true,
      supabase_url: datos.supabase_url,
      supabase_anon_key: datos.supabase_anon_key,
      supabase_service_key: datos.supabase_service_key,
    })
    .select('id, nombre, codigo, activo, plan, fecha_inicio, fecha_vencimiento, estado_implementacion')
    .single()
  if (falloInsert || !creado) {
    const existe = falloInsert?.code === '23505'
    return NextResponse.json(
      { error: existe ? 'Ya existe una empresa con ese código' : 'No se pudo crear la empresa' },
      { status: existe ? 409 : 500 },
    )
  }

  const filas = filasModulos(datos, creado.id, nombresCatalogo)
  let modulos: { modulo: string; activo: boolean }[] = []
  if (filas.length > 0) {
    const { error: falloModulos } = await supabaseAdmin().from('empresa_modulos').insert(filas)
    if (falloModulos) {
      await supabaseAdmin().from('empresas').delete().eq('id', creado.id)
      return NextResponse.json({ error: 'No se pudieron asignar los módulos' }, { status: 500 })
    }
    modulos = filas.map((f) => ({ modulo: f.modulo, activo: f.activo }))
  }

  return NextResponse.json({ empresa: publicarEmpresa(creado, modulos) }, { status: 201 })
}
