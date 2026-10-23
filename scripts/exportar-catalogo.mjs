#!/usr/bin/env node
/**
 * Exporta el catálogo de PostgreSQL de un proyecto Supabase vía Management API
 * (sin Docker ni psql). Uso:
 *   node scripts/exportar-catalogo.mjs <project-ref> <salida.json>
 * El token se lee de SUPA_TOKEN o de %LOCALAPPDATA%\Temp\opencode\sb-token.txt
 * (lo escribe el agente desde el Credential Manager; nunca se commitea).
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { tmpdir } from 'node:os'

function leerToken() {
  if (process.env.SUPA_TOKEN) return process.env.SUPA_TOKEN.trim()
  const candidatos = [
    process.env.LOCALAPPDATA && resolve(process.env.LOCALAPPDATA, 'Temp/opencode/sb-token.txt'),
    resolve(tmpdir(), 'opencode/sb-token.txt'),
  ].filter(Boolean)
  for (const ruta of candidatos) {
    if (existsSync(ruta)) return readFileSync(ruta, 'utf8').trim()
  }
  throw new Error('Sin token: exportá SUPA_TOKEN o creá el archivo sb-token.txt en Temp/opencode')
}

const [ref, salida] = process.argv.slice(2)
if (!ref || !salida) {
  console.error('Uso: node scripts/exportar-catalogo.mjs <project-ref> <salida.json>')
  process.exit(1)
}

const token = leerToken()

async function sql(query) {
  const respuesta = await fetch(
    `https://api.supabase.com/v1/projects/${ref}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    },
  )
  const texto = await respuesta.text()
  if (!respuesta.ok) {
    throw new Error(`Management API ${respuesta.status}: ${texto.slice(0, 500)}`)
  }
  const filas = JSON.parse(texto)
  return filas
}

const consultas = {
  columnas: `
    select c.table_name as tabla, c.column_name as columna, c.ordinal_position as orden,
           c.data_type, c.udt_name, c.character_maximum_length, c.numeric_precision, c.numeric_scale,
           c.is_nullable, c.column_default, c.is_identity, c.identity_generation
    from information_schema.columns c
    join information_schema.tables t on t.table_name = c.table_name and t.table_schema = 'public'
    where c.table_schema = 'public'
    order by c.table_name, c.ordinal_position`,
  constraints: `
    select kcu.table_name as tabla, tc.constraint_name, tc.constraint_type,
           kcu.column_name as columna, kcu.ordinal_position,
           rc.update_rule, rc.delete_rule,
           ccu.table_name as tabla_referenciada, ccu.column_name as columna_referenciada
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on kcu.constraint_name = tc.constraint_name and kcu.table_schema = tc.table_schema
    left join information_schema.referential_constraints rc
      on rc.constraint_name = tc.constraint_name and rc.constraint_schema = tc.table_schema
    left join information_schema.constraint_column_usage ccu
      on ccu.constraint_name = tc.constraint_name and ccu.constraint_schema = tc.table_schema
    where tc.table_schema = 'public'
    order by kcu.table_name, tc.constraint_name, kcu.ordinal_position`,
  checks: `
    select rel.relname as tabla, con.conname as constraint_name,
           pg_get_constraintdef(con.oid) as definicion
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public' and con.contype in ('c','u','p','f','x')
    order by rel.relname, con.conname`,
  indexes: `
    select tablename as tabla, indexname, indexdef
    from pg_indexes
    where schemaname = 'public'
    order by tablename, indexname`,
  politicas: `
    select schemaname, tablename as tabla, policyname as politica, permissive, roles, cmd, qual, with_check
    from pg_policies
    where schemaname = 'public'
    order by tablename, policyname`,
  grants: `
    select c.relname as tabla, pg_get_userbyid(c.relowner) as dueno,
           d.datname as base_datos
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    cross join pg_database d
    where n.nspname = 'public' and c.relkind = 'r' and d.datname = current_database()
    order by c.relname`,
  grants_columnas: `
    select table_name as tabla, column_name as columna, grantee, privilege_type
    from information_schema.column_privileges
    where table_schema = 'public'
    order by table_name, column_name, grantee, privilege_type`,
  funciones: `
    select p.proname as nombre, pg_get_function_arguments(p.oid) as argumentos,
           pg_get_function_result(p.oid) as resultado, l.lanname as lenguaje,
           p.prosecdef as security_definer, p.proacl as acl,
           p.proconfig as configuracion,
           case when p.prokind = 'p' then 'procedure'
                when p.prokind = 'f' then 'function' else p.prokind::text end as tipo,
           pg_get_functiondef(p.oid) as definicion
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    join pg_language l on l.oid = p.prolang
    where n.nspname = 'public'
    order by p.proname`,
  triggers: `
    select c.relname as tabla, t.tgname as nombre, pg_get_triggerdef(t.oid) as definicion,
           t.tgtype, t.tgenabled
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and not t.tgisinternal
    order by c.relname, t.tgname`,
  vistas: `
    select viewname as vista, definition
    from pg_views
    where schemaname = 'public'
    order by viewname`,
  secuencias: `
    select sequencename as secuencia, data_type, start_value, min_value, max_value,
           increment_by, cycle
    from pg_sequences
    where schemaname = 'public'
    order by sequencename`,
  tipos: `
    select t.typname as tipo, t.typtype,
           (select json_agg(json_build_object(
             'nombre', a.attname,
             'tipo', format_type(a.atttypid, a.atttypmod)
           )) from pg_attribute a
            where a.attrelid = t.typrelid and a.attnum > 0 and not a.attisdropped) as atributos
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typtype in ('c','e','r')
    order by t.typname`,
  extensiones: `
    select e.extname as nombre, e.extversion as version,
           n.nspname as esquema
    from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
    order by e.extname`,
  event_triggers: `
    select evtname as nombre, evtevent as evento, evtenabled as habilitado,
           evttags as etiquetas, evtfoid as oid_funcion
    from pg_event_trigger
    order by evtname`,
  triggers_auth: `
    select c.relname as tabla, n.nspname as esquema, t.tgname as nombre,
           pg_get_triggerdef(t.oid) as definicion
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'auth' and not t.tgisinternal
    order by c.relname, t.tgname`,
}

const catalogo = { origen: ref, exportado_en: new Date().toISOString() }
for (const [nombre, consulta] of Object.entries(consultas)) {
  process.stdout.write(`${nombre}... `)
  try {
    catalogo[nombre] = await sql(consulta)
    console.log(`${catalogo[nombre].length} filas`)
  } catch (e) {
    console.log(`ERROR: ${e.message}`)
    catalogo[nombre] = { error: e.message }
  }
}

const rutaSalida = resolve(salida)
mkdirSync(dirname(rutaSalida), { recursive: true })
writeFileSync(rutaSalida, JSON.stringify(catalogo, null, 2))
console.log(`\nCatálogo guardado en ${rutaSalida}`)
