import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requierePermisoApi } from '@/lib/private/sesion'
import { supabaseAdmin } from '@/lib/private/supabase-admin'

interface FilaModulo {
  id: number
  nombre: string
  descripcion: string | null
  activo: boolean
  orden: number
  empresas_total?: number | null
}

export async function GET(): Promise<NextResponse> {
  const guardado = await requierePermisoApi('administracion.modulos_pos', 'ver')
  if (!guardado.ok) return guardado.respuesta

  const [catalogo, usos] = await Promise.all([
    supabaseAdmin().from('modulos').select('id, nombre, descripcion, activo, orden').order('orden'),
    supabaseAdmin().from('empresa_modulos').select('modulo, activo'),
  ])
  if (catalogo.error) {
    return NextResponse.json({ error: 'No se pudo leer el catálogo de módulos' }, { status: 500 })
  }

  const usosActivos = new Map<string, number>()
  for (const fila of (usos.data ?? []) as { modulo: string; activo: boolean }[]) {
    if (fila.activo) usosActivos.set(fila.modulo, (usosActivos.get(fila.modulo) ?? 0) + 1)
  }

  const modulos = ((catalogo.data ?? []) as unknown as FilaModulo[]).map((m) => ({
    id: m.id,
    nombre: m.nombre,
    descripcion: m.descripcion,
    activo: m.activo,
    orden: m.orden,
    empresas_activas: usosActivos.get(m.nombre) ?? 0,
  }))
  return NextResponse.json({ modulos })
}

export const EsquemaAlta = z.object({
  nombre: z.string().trim().min(1, 'Ingresá el nombre').max(60),
  descripcion: z.string().trim().max(300).nullable().optional(),
  orden: z.number().int().min(0).max(999).optional(),
  activo: z.boolean().optional(),
})

export async function POST(req: Request): Promise<NextResponse> {
  const guardado = await requierePermisoApi('administracion.modulos_pos', 'crear')
  if (!guardado.ok) return guardado.respuesta

  let datos: z.infer<typeof EsquemaAlta>
  try {
    datos = EsquemaAlta.parse(await req.json())
  } catch (e) {
    const mensaje =
      e instanceof z.ZodError ? e.issues[0]?.message ?? 'Datos inválidos' : 'Datos inválidos'
    return NextResponse.json({ error: mensaje }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin()
    .from('modulos')
    .insert({
      nombre: datos.nombre,
      descripcion: datos.descripcion ?? null,
      orden: datos.orden ?? 0,
      activo: datos.activo ?? true,
    })
    .select('id, nombre, descripcion, activo, orden')
    .single()
  if (error || !data) {
    const existe = error?.code === '23505'
    return NextResponse.json(
      { error: existe ? 'Ya existe un módulo con ese nombre' : 'No se pudo crear el módulo' },
      { status: existe ? 409 : 500 },
    )
  }
  return NextResponse.json({ modulo: { ...data, empresas_activas: 0 } }, { status: 201 })
}
