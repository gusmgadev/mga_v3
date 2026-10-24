import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi, beforeEach } from 'vitest'

const estado = vi.hoisted(() => ({
  sesion: null as unknown,
  permisos: [] as { nodo: string; acciones: string[] }[],
}))

vi.mock('@/lib/private/auth', () => ({
  auth: vi.fn(async () => estado.sesion),
  handlers: { GET: vi.fn(), POST: vi.fn() },
  signIn: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock('@/lib/private/supabase-admin', () => {
  const cadena = {
    select: () => cadena,
    order: () => cadena,
    eq: () => cadena,
    neq: () => cadena,
    limit: () => cadena,
    insert: () => Promise.resolve({ data: null, error: null }),
    update: () => cadena,
    delete: () => cadena,
    single: () => {
      const u = (estado.sesion as { user?: Record<string, unknown> } | null)?.user
      if (!u) return Promise.resolve({ data: null, error: null })
      return Promise.resolve({
        data: {
          id: u.id,
          email: u.email,
          name: u.name,
          role_id: u.role_id,
          activo: true,
          auth_version: 0,
          password_changed_at: null,
          roles: { id: u.role_id, name: u.role, is_default: false, is_admin: u.is_admin },
        },
        error: null,
      })
    },
    then: (
      resolveFn: (v: { data: unknown; error: null }) => unknown,
    ) => resolveFn({ data: estado.permisos, error: null }),
  }
  return {
    supabaseAdmin: () => ({
      from: () => cadena,
      auth: {
        admin: {
          mfa: {
            listFactors: async () => ({ data: { factors: [] }, error: null }),
            deleteFactor: async () => ({ error: null }),
          },
          updateUserById: async () => ({ error: null }),
          createUser: async () => ({ data: { user: null }, error: { message: 'x' } }),
          deleteUser: async () => ({ error: null }),
          generateLink: async () => ({
            data: { properties: { hashed_token: 'x' } },
            error: null,
          }),
        },
      },
    }),
  }
})

const FAMILIAS = ['public', 'auth', 'dashboard', 'superadmin'] as const
const METODOS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const

/** Excepciones: acciones propias del usuario con sesión (sin permiso de nodo, spec §5.5). */
const EXCEPCIONES_PROPIAS = [/\/api\/dashboard\/mfa/, /\/api\/dashboard\/seguridad\//]

const RAIZ = fileURLToPath(new URL('../..', import.meta.url)).replace(/[\\/]+$/, '')

function listarRutas(dir: string): string[] {
  const resultados: string[] = []
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    const ruta = join(dir, entrada.name)
    if (entrada.isDirectory()) resultados.push(...listarRutas(ruta))
    else if (entrada.name === 'route.ts') resultados.push(ruta)
  }
  return resultados
}

function familiaDe(rel: string): string | null {
  const limpio = rel.replace(/\\/g, '/')
  const coincide = FAMILIAS.find((f) => limpio.startsWith(`app/api/${f}/`))
  return coincide ?? null
}

function construirRequest(rel: string, metodo: string): Request {
  const url = `http://test.local/${rel.replace(/\\/g, '/').replace(/\/route\.ts$/, '')}`
  const init: RequestInit = { method: metodo, headers: { 'Content-Type': 'application/json' } }
  if (metodo !== 'GET') init.body = '{}'
  return new Request(url, init)
}

const contextos = {
  sinParams: undefined as unknown,
  conParams: { params: Promise.resolve({ id: '00000000-0000-0000-0000-000000000000' }) },
}

async function cargarRuta(rel: string): Promise<Record<string, unknown>> {
  const relPosix = rel.replace(/\\/g, '/')
  return (await import(/* @vite-ignore */ `../../${relPosix}`)) as Record<string, unknown>
}

async function invocar(modulo: Record<string, unknown>, metodo: string, rel: string) {
  const handler = modulo[metodo]
  if (typeof handler !== 'function') return null
  const respuesta = await (
    handler as (r: Request, c?: unknown) => Promise<Response>
  )(construirRequest(rel, metodo), contextos.conParams)
  return respuesta
}

const rutas = listarRutas(join(RAIZ, 'app', 'api'))

describe('inventario de rutas (AGENTS §5, SEP-6)', () => {
  beforeEach(() => {
    estado.sesion = null
    estado.permisos = []
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
  })

  it('toda ruta app/api/** pertenece a una de las 4 familias', () => {
    expect(rutas.length).toBeGreaterThan(0)
    for (const ruta of rutas) {
      const rel = ruta.slice(RAIZ.length + 1)
      expect(familiaDe(rel), `Ruta fuera de las familias permitidas: ${rel}`).not.toBeNull()
    }
  })

  it('toda ruta dashboard/superadmin responde 401 sin sesión', async () => {
    estado.sesion = null
    let probadas = 0
    for (const ruta of rutas) {
      const rel = ruta.slice(RAIZ.length + 1)
      const familia = familiaDe(rel)
      if (familia !== 'dashboard' && familia !== 'superadmin') continue
      const modulo = await cargarRuta(rel)
      for (const metodo of METODOS) {
        const respuesta = await invocar(modulo, metodo, rel)
        if (!respuesta) continue
        probadas++
        expect(
          respuesta.status,
          `${metodo} ${rel} sin sesión → ${respuesta.status}`,
        ).toBe(401)
      }
    }
    expect(probadas).toBeGreaterThan(0)
  }, 30000)

  it('toda ruta dashboard/superadmin responde 403 con sesión pero sin permisos', async () => {
    estado.sesion = {
      user: {
        id: '11111111-1111-1111-1111-111111111111',
        email: 'sin-permisos@test.local',
        name: 'Sin Permisos',
        role: 'Usuario',
        role_id: '22222222-2222-2222-2222-222222222222',
        is_admin: false,
        debeCambiarPassword: false,
        auth_version: 0,
        auth_version: 0,
      },
    }
    estado.permisos = []
    let probadas = 0
    for (const ruta of rutas) {
      const rel = ruta.slice(RAIZ.length + 1)
      const familia = familiaDe(rel)
      if (familia !== 'dashboard' && familia !== 'superadmin') continue
      const propia = EXCEPCIONES_PROPIAS.some((r) => r.test(rel.replace(/\\/g, '/')))
      const modulo = await cargarRuta(rel)
      for (const metodo of METODOS) {
        const respuesta = await invocar(modulo, metodo, rel)
        if (!respuesta) continue
        probadas++
        if (propia) {
          expect(
            [401, 403],
            `${metodo} ${rel} (acción propia) no debe dar ${respuesta.status}`,
          ).not.toContain(respuesta.status)
        } else {
          expect(respuesta.status, `${metodo} ${rel} sin permiso → ${respuesta.status}`).toBe(403)
        }
      }
    }
    expect(probadas).toBeGreaterThan(0)
  }, 30000)

  it('permisos parciales: solo ver en inventario.remitos no autoriza administración', async () => {
    estado.sesion = {
      user: {
        id: '11111111-1111-1111-1111-111111111111',
        email: 'parcial@test.local',
        name: 'Parcial',
        role: 'Usuario',
        role_id: '33333333-3333-3333-3333-333333333333',
        is_admin: false,
        debeCambiarPassword: false,
        auth_version: 0,
      },
    }
    estado.permisos = [{ nodo: 'inventario.remitos', acciones: ['ver'] }]

    const get = (await cargarRuta('app/api/dashboard/admin/usuarios/route.ts')) as Record<string, unknown>
    const crear = (await cargarRuta('app/api/dashboard/admin/usuarios/route.ts')) as Record<string, unknown>

    const respuestaGet = await invocar(get, 'GET', 'app/api/dashboard/admin/usuarios/route.ts')
    const respuestaPost = await invocar(crear, 'POST', 'app/api/dashboard/admin/usuarios/route.ts')
    expect(respuestaGet?.status).toBe(403)
    expect(respuestaPost?.status).toBe(403)

    // Rutas superadmin: solo ver en inventario.remitos tampoco autoriza empresas/modulos_pos
    const rutaEmpresas = 'app/api/superadmin/empresas/route.ts'
    const rutaModulos = 'app/api/superadmin/modulos/route.ts'
    const empresas = (await cargarRuta(rutaEmpresas)) as Record<string, unknown>
    const modulos = (await cargarRuta(rutaModulos)) as Record<string, unknown>
    const rtaEmpresas = await invocar(empresas, 'GET', rutaEmpresas)
    const rtaModulos = await invocar(modulos, 'GET', rutaModulos)
    expect(rtaEmpresas?.status).toBe(403)
    expect(rtaModulos?.status).toBe(403)
  })

  it('is_admin sí autoriza (sin filas de permisos)', async () => {
    estado.sesion = {
      user: {
        id: '44444444-4444-4444-4444-444444444444',
        email: 'admin@test.local',
        name: 'Admin',
        role: 'Administrador',
        role_id: '55555555-5555-5555-5555-555555555555',
        is_admin: true,
        debeCambiarPassword: false,
        auth_version: 0,
      },
    }
    estado.permisos = []

    const modulo = (await cargarRuta('app/api/dashboard/admin/roles/route.ts')) as Record<string, unknown>
    const respuesta = await invocar(modulo, 'GET', 'app/api/dashboard/admin/roles/route.ts')
    expect(respuesta?.status).not.toBe(401)
    expect(respuesta?.status).not.toBe(403)
  })
})

