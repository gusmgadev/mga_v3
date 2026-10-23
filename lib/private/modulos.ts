export type Accion = 'ver' | 'crear' | 'editar' | 'eliminar'

export type TipoNodo = 'grupo' | 'submodulo' | 'funcion'

export interface Funcion {
  tipo: 'funcion'
  clave: string
  titulo: string
  /** Acción que concede la función. Para no-CRUD es 'ver' (almacenamiento) con heredaDe = null. */
  accion: Accion
  /** Si la función hereda de la acción equivalente del submódulo (CRUD). null = requiere nodo propio. */
  heredaDe: Accion | null
  descripcion?: string
}

export interface Submodulo {
  tipo: 'submodulo'
  clave: string
  titulo: string
  ruta: string
  descripcion?: string
  funciones: Funcion[]
}

export interface Grupo {
  tipo: 'grupo'
  clave: string
  titulo: string
  descripcion: string
  /** Clave del ícono Lucide (mapeada en components/private). */
  icono: string
  /** Clave de color del tema del dashboard. */
  color: string
  submodulos: Submodulo[]
}

const CRUD = (padre: string, nombre: string, tituloNombre: string): Funcion[] => [
  {
    tipo: 'funcion',
    clave: `${padre}.nuevo`,
    titulo: `Nuevo ${tituloNombre}`,
    accion: 'crear',
    heredaDe: 'crear',
  },
  {
    tipo: 'funcion',
    clave: `${padre}.editar`,
    titulo: `Editar ${tituloNombre}`,
    accion: 'editar',
    heredaDe: 'editar',
  },
  {
    tipo: 'funcion',
    clave: `${padre}.eliminar`,
    titulo: `Eliminar ${tituloNombre}`,
    accion: 'eliminar',
    heredaDe: 'eliminar',
  },
]

const propia = (padre: string, sufijo: string, titulo: string, descripcion?: string): Funcion => ({
  tipo: 'funcion',
  clave: `${padre}.${sufijo}`,
  titulo,
  accion: 'ver',
  heredaDe: null,
  descripcion,
})

/**
 * Árbol canónico del dashboard (AGENTS.md §10.1 / D-11, spec §5.3).
 * Fuente única: sidebar, home, matriz de permisos, seed e inventario de rutas derivan de aquí.
 */
export const MODULOS: Grupo[] = [
  {
    tipo: 'grupo',
    clave: 'zoologic',
    titulo: 'Zoologic',
    descripcion: 'CRM de emails: pipeline de oportunidades con IMAP + Groq.',
    icono: 'Grape',
    color: 'zoologic',
    submodulos: [
      {
        tipo: 'submodulo',
        clave: 'zoologic.oportunidades',
        titulo: 'Oportunidades',
        ruta: '/dashboard/oportunidades',
        descripcion: 'Pipeline de oportunidades con iteraciones de contacto.',
        funciones: CRUD('zoologic.oportunidades', 'oportunidad', 'oportunidad'),
      },
    ],
  },
  {
    tipo: 'grupo',
    clave: 'prospectos',
    titulo: 'Prospectos',
    descripcion: 'Prospección comercial: Radar de Google Places y lista de trabajo.',
    icono: 'Radar',
    color: 'prospectos',
    submodulos: [
      {
        tipo: 'submodulo',
        clave: 'prospectos.radar',
        titulo: 'Radar',
        ruta: '/dashboard/radar',
        descripcion: 'Búsquedas de prospectos en internet con scoring explicable.',
        funciones: [],
      },
      {
        tipo: 'submodulo',
        clave: 'prospectos.prospectos',
        titulo: 'Prospectos',
        ruta: '/dashboard/prospectos',
        descripcion: 'Lista de trabajo de prospectos marcados desde el Radar.',
        funciones: CRUD('prospectos.prospectos', 'prospecto', 'prospecto'),
      },
    ],
  },
  {
    tipo: 'grupo',
    clave: 'servicios',
    titulo: 'Servicios',
    descripcion: 'Gestión de servicios técnicos y presupuestos.',
    icono: 'Wrench',
    color: 'servicios',
    submodulos: [
      {
        tipo: 'submodulo',
        clave: 'servicios.servicios',
        titulo: 'Servicios',
        ruta: '/dashboard/servicios',
        descripcion: 'Órdenes de servicio con tareas y cobros.',
        funciones: CRUD('servicios.servicios', 'servicio', 'servicio'),
      },
      {
        tipo: 'submodulo',
        clave: 'servicios.presupuestos',
        titulo: 'Presupuestos',
        ruta: '/dashboard/presupuestos',
        descripcion: 'Presupuestos con ítems, adjuntos y vínculo a servicio.',
        funciones: CRUD('servicios.presupuestos', 'presupuesto', 'presupuesto'),
      },
    ],
  },
  {
    tipo: 'grupo',
    clave: 'altas',
    titulo: 'Altas',
    descripcion: 'Alta maestra de clientes y activos.',
    icono: 'FolderPlus',
    color: 'altas',
    submodulos: [
      {
        tipo: 'submodulo',
        clave: 'altas.clientes',
        titulo: 'Clientes',
        ruta: '/dashboard/clientes',
        descripcion: 'Clientes con datos fiscales, contacto y visibilidad en landing.',
        funciones: CRUD('altas.clientes', 'cliente', 'cliente'),
      },
      {
        tipo: 'submodulo',
        clave: 'altas.activos',
        titulo: 'Activos',
        ruta: '/dashboard/activos',
        descripcion: 'Activos de clientes (equipos, sistemas, servicios).',
        funciones: CRUD('altas.activos', 'activo', 'activo'),
      },
    ],
  },
  {
    tipo: 'grupo',
    clave: 'inventario',
    titulo: 'Inventario',
    descripcion: 'Productos, remitos y proveedores.',
    icono: 'Boxes',
    color: 'inventario',
    submodulos: [
      {
        tipo: 'submodulo',
        clave: 'inventario.productos',
        titulo: 'Productos',
        ruta: '/dashboard/productos',
        descripcion: 'Catálogo de productos con stock y precios.',
        funciones: CRUD('inventario.productos', 'producto', 'producto'),
      },
      {
        tipo: 'submodulo',
        clave: 'inventario.remitos',
        titulo: 'Remitos',
        ruta: '/dashboard/remitos',
        descripcion: 'Ingreso y egreso de stock (con ingreso por voz).',
        funciones: [
          ...CRUD('inventario.remitos', 'remito', 'remito'),
          propia('inventario.remitos', 'confirmar', 'Confirmar remito', 'Aplica movimientos de stock'),
          propia('inventario.remitos', 'anular', 'Anular remito'),
          propia('inventario.remitos', 'voz', 'Ingreso por voz', 'Transcripción y matching de productos'),
        ],
      },
      {
        tipo: 'submodulo',
        clave: 'inventario.proveedores',
        titulo: 'Proveedores',
        ruta: '/dashboard/proveedores',
        descripcion: 'Fichas de proveedores (absorbe el catálogo de proveedores).',
        funciones: CRUD('inventario.proveedores', 'proveedor', 'proveedor'),
      },
    ],
  },
  {
    tipo: 'grupo',
    clave: 'fondos',
    titulo: 'Fondos',
    descripcion: 'Gastos y cobranzas.',
    icono: 'Wallet',
    color: 'fondos',
    submodulos: [
      {
        tipo: 'submodulo',
        clave: 'fondos.gastos',
        titulo: 'Gastos',
        ruta: '/dashboard/gastos',
        descripcion: 'Gastos mensuales con pagos parciales.',
        funciones: CRUD('fondos.gastos', 'gasto', 'gasto'),
      },
      {
        tipo: 'submodulo',
        clave: 'fondos.cobranzas',
        titulo: 'Cobranzas',
        ruta: '/dashboard/cobranzas',
        descripcion: 'Cargos, pagos y notas de crédito imputados a servicios.',
        funciones: CRUD('fondos.cobranzas', 'cobranza', 'cobranza'),
      },
    ],
  },
  {
    tipo: 'grupo',
    clave: 'administracion',
    titulo: 'Administración',
    descripcion: 'Identidad y permisos del sistema.',
    icono: 'ShieldCheck',
    color: 'administracion',
    submodulos: [
      {
        tipo: 'submodulo',
        clave: 'administracion.usuarios',
        titulo: 'Usuarios',
        ruta: '/dashboard/admin/usuarios',
        descripcion: 'Alta y gestión de usuarios internos.',
        funciones: CRUD('administracion.usuarios', 'usuario', 'usuario'),
      },
      {
        tipo: 'submodulo',
        clave: 'administracion.roles',
        titulo: 'Roles',
        ruta: '/dashboard/admin/roles',
        descripcion: 'Roles del sistema (is_admin, is_default).',
        funciones: CRUD('administracion.roles', 'rol', 'rol'),
      },
      {
        tipo: 'submodulo',
        clave: 'administracion.permisos',
        titulo: 'Permisos',
        ruta: '/dashboard/admin/permisos',
        descripcion: 'Concesión de permisos por rol sobre el árbol de nodos.',
        funciones: [],
      },
      {
        tipo: 'submodulo',
        clave: 'administracion.empresas',
        titulo: 'Empresas',
        ruta: '/dashboard/admin/empresas',
        descripcion: 'Empresas clientes del sistema POS y sus módulos contratados.',
        // Sin eliminar físico: la baja es activo=false (specs/privado.md §7, API GET+PUT).
        funciones: CRUD('administracion.empresas', 'empresa', 'empresa').filter(
          (f) => f.clave !== 'administracion.empresas.eliminar',
        ),
      },
      {
        tipo: 'submodulo',
        clave: 'administracion.modulos_pos',
        titulo: 'Módulos POS',
        ruta: '/dashboard/admin/modulos-pos',
        descripcion: 'Catálogo de módulos del sistema POS (fuente única en BD).',
        funciones: CRUD('administracion.modulos_pos', 'módulo', 'módulo'),
      },
    ],
  },
  {
    tipo: 'grupo',
    clave: 'landing_page',
    titulo: 'LandingPage',
    descripcion: 'Contenido del sitio público.',
    icono: 'Globe',
    color: 'landing',
    submodulos: [
      {
        tipo: 'submodulo',
        clave: 'landing_page.noticias',
        titulo: 'Noticias',
        ruta: '/dashboard/noticias',
        descripcion: 'Noticias del blog público.',
        funciones: [
          ...CRUD('landing_page.noticias', 'noticia', 'noticia'),
          propia('landing_page.noticias', 'publicar', 'Publicar noticia', 'Visible en la zona pública'),
        ],
      },
    ],
  },
]

export interface NodoEncontrado {
  nodo: Grupo | Submodulo | Funcion
  submodulo: Submodulo | null
  grupo: Grupo
}

export function buscarNodo(clave: string): NodoEncontrado | null {
  for (const grupo of MODULOS) {
    if (grupo.clave === clave) {
      return { nodo: grupo, submodulo: null, grupo }
    }
    for (const submodulo of grupo.submodulos) {
      if (submodulo.clave === clave) {
        return { nodo: submodulo, submodulo: null, grupo }
      }
      for (const funcion of submodulo.funciones) {
        if (funcion.clave === clave) {
          return { nodo: funcion, submodulo, grupo }
        }
      }
    }
  }
  return null
}

export function buscarGrupo(clave: string): Grupo | null {
  return MODULOS.find((g) => g.clave === clave) ?? null
}

export interface NodoPlano {
  clave: string
  titulo: string
  tipo: TipoNodo
  grupo: string
  submodulo: string | null
  accion: Accion | null
  heredaDe: Accion | null
}

export function todosLosNodos(): NodoPlano[] {
  const nodos: NodoPlano[] = []
  for (const grupo of MODULOS) {
    for (const submodulo of grupo.submodulos) {
      nodos.push({
        clave: submodulo.clave,
        titulo: submodulo.titulo,
        tipo: 'submodulo',
        grupo: grupo.clave,
        submodulo: null,
        accion: null,
        heredaDe: null,
      })
      for (const funcion of submodulo.funciones) {
        nodos.push({
          clave: funcion.clave,
          titulo: funcion.titulo,
          tipo: 'funcion',
          grupo: grupo.clave,
          submodulo: submodulo.clave,
          accion: funcion.accion,
          heredaDe: funcion.heredaDe,
        })
      }
    }
  }
  return nodos
}

export function clavesDeSubarbol(clave: string): string[] {
  return todosLosNodos()
    .map((n) => n.clave)
    .filter((c) => c === clave || c.startsWith(`${clave}.`))
}
