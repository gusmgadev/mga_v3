import { describe, expect, it } from 'vitest'
import { MODULOS, buscarNodo, buscarGrupo, todosLosNodos } from '@/lib/private/modulos'

describe('modulos (árbol canónico)', () => {
  it('tiene exactamente los 8 grupos de AGENTS §10.1, en orden', () => {
    expect(MODULOS.map((g) => g.clave)).toEqual([
      'zoologic',
      'prospectos',
      'servicios',
      'altas',
      'inventario',
      'fondos',
      'administracion',
      'landing_page',
    ])
  })

  it('las claves de nodo son únicas en todo el árbol', () => {
    const claves = todosLosNodos().map((n) => n.clave)
    expect(new Set(claves).size).toBe(claves.length)
  })

  it('toda clave de submódulo/función empieza con la clave de su grupo y subárbol', () => {
    for (const grupo of MODULOS) {
      for (const sub of grupo.submodulos) {
        expect(sub.clave.startsWith(`${grupo.clave}.`)).toBe(true)
        expect(buscarNodo(sub.clave)?.grupo.clave).toBe(grupo.clave)
        for (const func of sub.funciones) {
          expect(func.clave.startsWith(`${sub.clave}.`)).toBe(true)
        }
      }
    }
  })

  it('los CRUD tienen nuevo/editar/eliminar heredando de su acción', () => {
    const sub = buscarNodo('altas.clientes')?.nodo
    expect(sub?.tipo).toBe('submodulo')
    const funciones = MODULOS.find((g) => g.clave === 'altas')!.submodulos[0].funciones
    const nueva = funciones.find((f) => f.clave === 'altas.clientes.nuevo')
    const editar = funciones.find((f) => f.clave === 'altas.clientes.editar')
    const eliminar = funciones.find((f) => f.clave === 'altas.clientes.eliminar')
    expect(nueva?.heredaDe).toBe('crear')
    expect(editar?.heredaDe).toBe('editar')
    expect(eliminar?.heredaDe).toBe('eliminar')
  })

  it('las funciones no-CRUD no heredan (remitos.confirmar, noticias.publicar)', () => {
    const confirmar = buscarNodo('inventario.remitos.confirmar')?.nodo
    const publicar = buscarNodo('landing_page.noticias.publicar')?.nodo
    expect(confirmar?.tipo === 'funcion' && confirmar.heredaDe).toBeNull()
    expect(publicar?.tipo === 'funcion' && publicar.heredaDe).toBeNull()
  })

  it('buscarNodo resuelve grupos, submódulos y funciones; desconocidos dan null', () => {
    expect(buscarGrupo('inventario')?.titulo).toBe('Inventario')
    expect(buscarNodo('inventario')?.nodo.tipo).toBe('grupo')
    expect(buscarNodo('prospectos.radar')?.nodo.tipo).toBe('submodulo')
    expect(buscarNodo('fondos.gastos.nuevo')?.nodo.tipo).toBe('funcion')
    expect(buscarNodo('no.existe')).toBeNull()
  })

  it('incluye los submódulos del superadmin fusionado bajo administracion (D-15)', () => {
    const administracion = buscarGrupo('administracion')
    expect(administracion?.submodulos.map((s) => s.clave)).toContain('administracion.empresas')
    expect(administracion?.submodulos.map((s) => s.clave)).toContain('administracion.modulos_pos')

    expect(buscarNodo('administracion.empresas')?.nodo).toMatchObject({
      tipo: 'submodulo',
      ruta: '/dashboard/admin/empresas',
    })
    expect(buscarNodo('administracion.modulos_pos')?.nodo).toMatchObject({
      tipo: 'submodulo',
      ruta: '/dashboard/admin/modulos-pos',
    })

    // empresas: sin eliminar físico (baja lógica activo=false); modulos_pos: CRUD completo
    expect(
      todosLosNodos()
        .filter((n) => n.tipo === 'funcion' && n.submodulo === 'administracion.empresas')
        .map((f) => f.clave)
        .sort(),
    ).toEqual(['administracion.empresas.editar', 'administracion.empresas.nuevo'])
    expect(
      todosLosNodos()
        .filter((n) => n.tipo === 'funcion' && n.submodulo === 'administracion.modulos_pos')
        .map((f) => f.clave)
        .sort(),
    ).toEqual([
      'administracion.modulos_pos.editar',
      'administracion.modulos_pos.eliminar',
      'administracion.modulos_pos.nuevo',
    ])
  })
})
