import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requierePermisoApi } from '@/lib/private/sesion'
import { supabaseAdmin } from '@/lib/private/supabase-admin'
import { todosLosNodos, type Accion } from '@/lib/private/modulos'
import type { PermisoAsignado } from '@/lib/private/permisos'

const ACCIONES: Accion[] = ['ver', 'crear', 'editar', 'eliminar']

export async function GET(req: Request): Promise<NextResponse> {
  const guardado = await requierePermisoApi('administracion.permisos', 'ver')
  if (!guardado.ok) return guardado.respuesta

  const roleId = new URL(req.url).searchParams.get('roleId')
  if (!roleId) {
    return NextResponse.json({ error: 'Falta roleId' }, { status: 400 })
  }

  const [rol, filas] = await Promise.all([
    supabaseAdmin()
      .from('roles')
      .select('id, name, is_admin, is_default')
      .eq('id', roleId)
      .single(),
    supabaseAdmin()
      .from('role_permissions')
      .select('nodo, acciones')
      .eq('role_id', roleId),
  ])
  if (rol.error || !rol.data) {
    return NextResponse.json({ error: 'El rol no existe' }, { status: 404 })
  }

  const permisos = ((filas.data ?? []) as { nodo: string; acciones: string[] }[]).map((f) => ({
    nodo: f.nodo,
    acciones: f.acciones as Accion[],
  }))
  return NextResponse.json({ rol: rol.data, permisos })
}

const EsquemaPut = z.object({
  roleId: z.string().uuid(),
  permisos: z.record(
    z.string(),
    z.array(z.enum(['ver', 'crear', 'editar', 'eliminar'])),
  ),
})

/** Reemplaza los permisos de un rol por la matriz enviada (P-14). */
export async function PUT(req: Request): Promise<NextResponse> {
  const guardado = await requierePermisoApi('administracion.permisos', 'editar')
  if (!guardado.ok) return guardado.respuesta

  let datos: z.infer<typeof EsquemaPut>
  try {
    datos = EsquemaPut.parse(await req.json())
  } catch {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const nodos = new Map(todosLosNodos().map((n) => [n.clave, n]))
  for (const [clave, acciones] of Object.entries(datos.permisos)) {
    const nodo = nodos.get(clave)
    if (!nodo) {
      return NextResponse.json({ error: `Nodo inválido: ${clave}` }, { status: 400 })
    }
    if (acciones.length === 0) continue
    if (nodo.tipo === 'funcion') {
      const esperada = nodo.accion ?? 'ver'
      if (acciones.length !== 1 || acciones[0] !== esperada) {
        return NextResponse.json(
          { error: `Acción inválida para la función ${clave}` },
          { status: 400 },
        )
      }
    } else if (!acciones.every((a) => ACCIONES.includes(a))) {
      return NextResponse.json({ error: `Acción inválida en ${clave}` }, { status: 400 })
    }
  }

  const { data: rol } = await supabaseAdmin()
    .from('roles')
    .select('id, is_admin')
    .eq('id', datos.roleId)
    .single()
  if (!rol) {
    return NextResponse.json({ error: 'El rol no existe' }, { status: 404 })
  }

  const { error: falloBorrado } = await supabaseAdmin()
    .from('role_permissions')
    .delete()
    .eq('role_id', datos.roleId)
  if (falloBorrado) {
    return NextResponse.json({ error: 'No se pudieron actualizar los permisos' }, { status: 500 })
  }

  const filas = Object.entries(datos.permisos)
    .filter(([, acciones]) => acciones.length > 0)
    .map(([nodo, acciones]) => ({
      role_id: datos.roleId,
      nodo,
      acciones: Array.from(new Set(acciones)),
    }))
  if (filas.length > 0) {
    const { error: falloInsert } = await supabaseAdmin().from('role_permissions').insert(filas)
    if (falloInsert) {
      return NextResponse.json({ error: 'No se pudieron guardar los permisos' }, { status: 500 })
    }
  }

  const permisos: PermisoAsignado[] = filas.map((f) => ({ nodo: f.nodo, acciones: f.acciones }))
  return NextResponse.json({ ok: true, permisos })
}
