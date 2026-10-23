import { describe, expect, it } from 'vitest'
import { mapaDePermisos, permite, type PermisoAsignado } from '@/lib/private/permisos'
import { todosLosNodos } from '@/lib/private/modulos'

const sinAdmin = { is_admin: false }
const admin = { is_admin: true }

describe('permisos (herencia simple, D-12)', () => {
  it('is_admin permite todo sin permisos asignados', () => {
    expect(permite(admin, [], 'inventario.remitos', 'crear')).toBe(true)
    expect(permite(admin, [], 'landing_page.noticias.publicar', 'ver')).toBe(true)
  })

  it('sin asignaciones no hay acceso', () => {
    expect(permite(sinAdmin, [], 'altas.clientes', 'ver')).toBe(false)
    expect(permite(sinAdmin, [], 'altas.clientes.nuevo', 'crear')).toBe(false)
  })

  it('conceder submódulo con ver no concede crear (solo la acción concedida)', () => {
    const asignados: PermisoAsignado[] = [{ nodo: 'altas.clientes', acciones: ['ver'] }]
    expect(permite(sinAdmin, asignados, 'altas.clientes', 'ver')).toBe(true)
    expect(permite(sinAdmin, asignados, 'altas.clientes', 'crear')).toBe(false)
    expect(permite(sinAdmin, asignados, 'altas.clientes.editar', 'editar')).toBe(false)
  })

  it('conceder el grupo concede todo su subárbol con la misma acción', () => {
    const asignados: PermisoAsignado[] = [{ nodo: 'inventario', acciones: ['ver', 'editar'] }]
    expect(permite(sinAdmin, asignados, 'inventario.productos', 'ver')).toBe(true)
    expect(permite(sinAdmin, asignados, 'inventario.remitos', 'editar')).toBe(true)
    expect(permite(sinAdmin, asignados, 'inventario.remitos.editar', 'editar')).toBe(true)
    expect(permite(sinAdmin, asignados, 'inventario.remitos', 'crear')).toBe(false)
  })

  it('función CRUD hereda del ancestro (nuevo ← crear) pero editar no concede nuevo', () => {
    const asignados: PermisoAsignado[] = [{ nodo: 'servicios.presupuestos', acciones: ['crear'] }]
    expect(permite(sinAdmin, asignados, 'servicios.presupuestos.nuevo', 'crear')).toBe(true)
    expect(permite(sinAdmin, asignados, 'servicios.presupuestos.editar', 'editar')).toBe(false)
  })

  it('función no-CRUD exige nodo propio: no se hereda del módulo ni del submódulo', () => {
    const mulo: PermisoAsignado[] = [
      { nodo: 'inventario', acciones: ['ver', 'crear', 'editar', 'eliminar'] },
    ]
    expect(permite(sinAdmin, mulo, 'inventario.remitos.confirmar', 'ver')).toBe(false)
    const soloConfirmar: PermisoAsignado[] = [
      { nodo: 'inventario.remitos.confirmar', acciones: ['ver'] },
    ]
    expect(permite(sinAdmin, soloConfirmar, 'inventario.remitos.confirmar', 'ver')).toBe(true)
    expect(permite(sinAdmin, soloConfirmar, 'inventario.remitos.anular', 'ver')).toBe(false)
    expect(permite(sinAdmin, soloConfirmar, 'inventario.remitos', 'ver')).toBe(false)
  })

  it('se puede conceder una función aislada sin su ancestro', () => {
    const asignados: PermisoAsignado[] = [
      { nodo: 'landing_page.noticias.publicar', acciones: ['ver'] },
    ]
    expect(permite(sinAdmin, asignados, 'landing_page.noticias.publicar', 'ver')).toBe(true)
    expect(permite(sinAdmin, asignados, 'landing_page.noticias', 'ver')).toBe(false)
  })

  it('nodos desconocidos se deniegan', () => {
    expect(permite(sinAdmin, [{ nodo: 'inventario', acciones: ['ver'] }], 'inexistente.x', 'ver')).toBe(false)
  })

  it('mapaDePermisos refleja herencia y funciones', () => {
    const asignados: PermisoAsignado[] = [{ nodo: 'altas.clientes', acciones: ['ver', 'crear'] }]
    const mapa = mapaDePermisos(
      sinAdmin,
      asignados,
      todosLosNodos().map((n) => ({ clave: n.clave, tipo: n.tipo })),
    )
    expect(mapa['altas.clientes']).toEqual(['ver', 'crear'])
    expect(mapa['altas.clientes.nuevo']).toEqual(['crear'])
    expect(mapa['altas.clientes.editar']).toEqual([])
    expect(mapa['altas.activos']).toEqual([])
    expect(mapa['altas.clientes']).not.toContain('editar')
  })
})
