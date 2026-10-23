#!/usr/bin/env node
/**
 * Genera la migración baseline (000000) a partir de supabase/catalogo-origen.json.
 * Uso: node scripts/generar-baseline.mjs
 * Salida: supabase/migrations/000000_baseline_mgaServiciosBD.sql
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const catalogo = JSON.parse(readFileSync(resolve(raiz, 'supabase/catalogo-origen.json'), 'utf8'))

const FUNCS_PROPIAS = new Set([
  'buscar_productos_por_nombre',
  'confirmar_remito',
  'handle_new_user',
  'rls_auto_enable',
])

function tipoDe(col) {
  const base = {
    int2: 'smallint',
    int4: 'integer',
    int8: 'bigint',
    text: 'text',
    uuid: 'uuid',
    timestamptz: 'timestamp with time zone',
    timestamp: 'timestamp without time zone',
    date: 'date',
    time: 'time',
    bool: 'boolean',
    jsonb: 'jsonb',
    json: 'json',
    float8: 'double precision',
    float4: 'real',
    inet: 'inet',
    numeric: 'numeric',
    varchar: 'character varying',
    bpchar: 'character',
    _text: 'text[]',
    _int4: 'integer[]',
    _int8: 'bigint[]',
    _varchar: 'character varying[]',
  }[col.udt_name]
  if (!base) throw new Error(`Tipo sin mapear: ${col.udt_name} (${col.tabla}.${col.columna})`)
  if (col.udt_name === 'varchar' || col.udt_name === 'bpchar') {
    return col.character_maximum_length ? `${base}(${col.character_maximum_length})` : base
  }
  if (col.udt_name === 'numeric' && col.numeric_precision != null) {
    return col.numeric_scale != null
      ? `numeric(${col.numeric_precision},${col.numeric_scale})`
      : `numeric(${col.numeric_precision})`
  }
  return base
}

const lineas = []
const push = (...ls) => lineas.push(...ls)

push(
  '-- ============================================================',
  '-- BASELINE: estructura de mgaServiciosBD (wpbogwonvbcrcpkjxdvb)',
  '-- Generado desde supabase/catalogo-origen.json por scripts/generar-baseline.mjs',
  '-- NO editar a mano: cualquier cambio va en una migración nueva.',
  `-- Exportado: ${catalogo.exportado_en}`,
  '-- ============================================================',
  '',
)

push('-- Extensiones', "create extension if not exists pg_trgm with schema public;", '')

// Tablas
const columnasPorTabla = new Map()
for (const col of catalogo.columnas) {
  if (!columnasPorTabla.has(col.tabla)) columnasPorTabla.set(col.tabla, [])
  columnasPorTabla.get(col.tabla).push(col)
}
const tablas = [...columnasPorTabla.keys()].sort()

push('-- Secuencias (requeridas por defaults nextval)', 'begin;')
for (const s of catalogo.secuencias) {
  push(`create sequence if not exists public.${s.secuencia} as ${s.data_type};`)
}
push('commit;', '')

push('-- Tablas', 'begin;')
for (const tabla of tablas) {
  push(`create table public.${tabla} (`)
  const defs = columnasPorTabla
    .get(tabla)
    .map((col) => {
      const partes = [`  ${col.columna} ${tipoDe(col)}`]
      if (col.is_identity === 'YES') {
        partes.push(`generated ${col.identity_generation || 'BY DEFAULT'} as identity`)
      } else if (col.column_default) {
        partes.push(`default ${col.column_default}`)
      }
      if (col.is_nullable === 'NO') partes.push('not null')
      return partes.join(' ')
    })
  push(defs.join(',\n'))
  push(');')
  push(`alter table public.${tabla} enable row level security;`)
  push('')
}
push('commit;', '')

// Restricciones (PK/FK/UNIQUE/CHECK) — pg_get_constraintdef es verbatim
// Orden: PK y UNIQUE primero (las FK las referencian), después FK y CHECK
const nombresUnicas = new Set(
  catalogo.checks.filter((c) => c.definicion.startsWith('UNIQUE')).map((c) => c.constraint_name),
)
const esPkOUnique = (c) => c.definicion.startsWith('PRIMARY KEY') || c.definicion.startsWith('UNIQUE')
push('-- Restricciones', 'begin;')
const vistos = new Set()
const ordenadas = [...catalogo.checks].sort((a, b) => {
  const pa = esPkOUnique(a) ? 0 : 1
  const pb = esPkOUnique(b) ? 0 : 1
  if (pa !== pb) return pa - pb
  return a.tabla.localeCompare(b.tabla) || a.constraint_name.localeCompare(b.constraint_name)
})
for (const c of ordenadas) {
  const clave = `${c.tabla}.${c.constraint_name}`
  if (vistos.has(clave)) continue
  vistos.add(clave)
  push(`alter table public.${c.tabla} add constraint ${c.constraint_name} ${c.definicion};`)
}
push('commit;', '')

// Índices no cubiertos por restricciones
push('-- Índices', 'begin;')
for (const idx of catalogo.indexes) {
  if (nombresUnicas.has(idx.indexname) || idx.indexname.endsWith('_pkey')) continue
  push(`${idx.indexdef};`)
}
push('commit;', '')

// Funciones propias (las de pg_trgm ya vienen con la extensión)
push('-- Funciones propias', 'begin;')
for (const f of catalogo.funciones) {
  if (!FUNCS_PROPIAS.has(f.nombre)) continue
  let def = f.definicion.trim()
  if (!def.endsWith(';')) def += ';'
  push(def)
  push('')
}
push('commit;', '')

// Event trigger ensure_rls + trigger de auth.users
push('-- Triggers', 'begin;')
push('create event trigger ensure_rls on ddl_command_end')
push("  when tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')")
push('  execute function public.rls_auto_enable();')
push('')
push(catalogo.triggers_auth[0].definicion.trim().replace(/;$/, '') + ';')
push('commit;', '')

// Políticas RLS (verbatim desde pg_policies)
push('-- Políticas RLS del origen (se normalizan en migraciones posteriores)', 'begin;')
for (const p of catalogo.politicas) {
  const permissive = (p.permissive || 'PERMISSIVE').toUpperCase()
  // roles viene como literal de array de Postgres: "{public}" o "{anon,authenticated}"
  const rolesBrutos = Array.isArray(p.roles) ? p.roles.join(',') : String(p.roles || 'public')
  const roles = rolesBrutos.replace(/[{}]/g, '').split(',').map((r) => r.trim()).filter(Boolean).join(', ')
  const partes = [
    `create policy "${p.politica}"`,
    `  on public.${p.tabla}`,
    `  as ${permissive}`,
    `  for ${p.cmd}`,
    `  to ${roles}`,
  ]
  if (p.qual) partes.push(`  using (${p.qual})`)
  if (p.with_check) partes.push(`  with check (${p.with_check})`)
  push(`${partes.join('\n')};`)
  push('')
}
push('commit;')

const salida = resolve(raiz, 'supabase/migrations/000000_baseline_mgaServiciosBD.sql')
mkdirSync(dirname(salida), { recursive: true })
writeFileSync(salida, lineas.join('\n'))
console.log(`Baseline generado: ${salida}`)
console.log(`Tablas: ${tablas.length} · Restricciones: ${vistos.size} · Políticas: ${catalogo.politicas.length}`)
