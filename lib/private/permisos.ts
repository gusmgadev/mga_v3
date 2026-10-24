import 'server-only'
import { buscarNodo, type Accion, type Funcion } from './modulos'

export interface PermisoAsignado {
  nodo: string
  acciones: Accion[]
}

export interface RolContexto {
  is_admin: boolean
}

/** True si `clave` es el nodo asignado o un nodo hijo de él (herencia simple, D-12). */
function esSelfODescendiente(asignado: string, clave: string): boolean {
  return clave === asignado || clave.startsWith(`${asignado}.`)
}

export function permiteNodo(asignados: PermisoAsignado[], clave: string, accion: Accion): boolean {
  return asignados.some(
    (p) => esSelfODescendiente(p.nodo, clave) && p.acciones.includes(accion),
  )
}

function permiteExacto(asignados: PermisoAsignado[], clave: string, accion: Accion): boolean {
  return asignados.some((p) => p.nodo === clave && p.acciones.includes(accion))
}

const NODOS_ADMIN = ['administracion', 'landing_page']
function isAdminImplicito(clave: string): boolean {
  return NODOS_ADMIN.some((n) => clave === n || clave.startsWith(`${n}.`))
}

/**
 * Resolución de permisos por niveles (AGENTS §10.2, D-12, spec §5.3).
 * - `is_admin` = acceso implícito solo a `administracion.*` y `landing_page.*`.
 * - Grupo/submódulo: la acción se hereda a todo el subárbol.
 * - Función CRUD: hereda de la acción equivalente del subárbol (`nuevo` ← `crear`…).
 * - Función no-CRUD: requiere fila exacta en su propio nodo (nunca se hereda).
 */
export function permite(
  rol: RolContexto,
  asignados: PermisoAsignado[],
  clave: string,
  accion: Accion,
): boolean {
  if (rol.is_admin && isAdminImplicito(clave)) return true
  const encontrado = buscarNodo(clave)
  if (!encontrado) return false
  const { nodo } = encontrado
  if (nodo.tipo === 'funcion') {
    const funcion = nodo as Funcion
    if (funcion.heredaDe !== null) {
      return permiteNodo(asignados, clave, funcion.heredaDe)
    }
    return permiteExacto(asignados, clave, funcion.accion)
  }
  return permiteNodo(asignados, clave, accion)
}

/** Mapa completo nodo → acciones concedidas para la matriz de permisos (UI/API). */
export function mapaDePermisos(
  rol: RolContexto,
  asignados: PermisoAsignado[],
  nodos: { clave: string; tipo: string }[],
): Record<string, Accion[]> {
  const mapa: Record<string, Accion[]> = {}
  for (const nodo of nodos) {
    if (nodo.tipo === 'funcion') {
      const encontrado = buscarNodo(nodo.clave)?.nodo
      const accion: Accion =
        encontrado && encontrado.tipo === 'funcion'
          ? (encontrado.heredaDe ?? encontrado.accion)
          : 'ver'
      mapa[nodo.clave] = permite(rol, asignados, nodo.clave, accion) ? [accion] : []
    } else {
      mapa[nodo.clave] = (['ver', 'crear', 'editar', 'eliminar'] as Accion[]).filter((a) =>
        permite(rol, asignados, nodo.clave, a),
      )
    }
  }
  return mapa
}
