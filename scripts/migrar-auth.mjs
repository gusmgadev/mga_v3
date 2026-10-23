#!/usr/bin/env node
/**
 * Crea el usuario de Auth en mgaV3 (destino) usando la Admin API.
 * Requiere: SUPA_TOKEN (Management API) para obtener la service_role key del destino.
 */
import { readFileSync } from 'node:fs'

const DESTINO = 'ensnfgucsfefrywacxzx'

function leerToken() {
  if (process.env.SUPA_TOKEN) return process.env.SUPA_TOKEN.trim()
  const ruta = process.env.LOCALAPPDATA + '/Temp/opencode/sb-token.txt'
  return readFileSync(ruta, 'utf8').trim()
}
const token = leerToken()

async function managementFetch(path) {
  const r = await fetch(`https://api.supabase.com/v1${path}`, {
    headers: { Authorization: `Bearer ${token}`, apikey: token },
  })
  const texto = await r.text()
  if (!r.ok) throw new Error(`Management API ${path}: ${r.status} ${texto.slice(0, 300)}`)
  return JSON.parse(texto)
}

async function managementPost(path, body) {
  const r = await fetch(`https://api.supabase.com/v1${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, apikey: token, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const texto = await r.text()
  if (!r.ok) throw new Error(`Management API ${path}: ${r.status} ${texto.slice(0, 300)}`)
  return JSON.parse(texto)
}

// 1. Obtener service_role key del destino
const keys = await managementFetch(`/projects/${DESTINO}/api-keys`)
const serviceKey = keys.find((k) => k.name === 'service_role')?.api_key
if (!serviceKey) throw new Error('No se encontró service_role key')
console.log('service_role key obtenida ✓')

// 2. Obtener la URL del destino
const proyecto = await managementFetch(`/projects/${DESTINO}`)
const urlDestino = `https://${proyecto.ref}.supabase.co`
console.log(`URL destino: ${urlDestino}`)

// 3. Obtener el usuario del ORIGEN para copiar sus datos
const ORIGEN = 'wpbogwonvbcrcpkjxdvb'
const origenKeys = await managementFetch(`/projects/${ORIGEN}/api-keys`)
const origenServiceKey = origenKeys.find((k) => k.name === 'service_role')?.api_key
const origenUrl = `https://${ORIGEN}.supabase.co`

// Leer users del origen
const usersResp = await fetch(`${origenUrl}/rest/v1/users?select=*`, {
  headers: { apikey: origenServiceKey, Authorization: `Bearer ${origenServiceKey}` },
})
const usersOrigen = await usersResp.json()
console.log(`Usuarios en origen: ${usersOrigen.length}`)

// También leer auth.users del origen (email, encrypted_password, etc.)
// La Management API puede hacer query directo
const authUsers = await managementPost(`/projects/${ORIGEN}/database/query`, {
  query: `select id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role from auth.users limit 10`,
})
console.log(`auth.users en origen: ${authUsers.length}`)
for (const u of authUsers) {
  console.log(`  - ${u.email} (${u.id}) confirmed: ${u.email_confirmed_at ? 'sí' : 'no'}`)
}

// 4. Recrear el usuario en auth.users del destino
for (const u of authUsers) {
  // Verificar si ya existe
  const existe = await managementPost(`/projects/${DESTINO}/database/query`, {
    query: `select id from auth.users where id = '${u.id}' limit 1`,
  })
  if (existe.length > 0) {
    console.log(`  Usuario ${u.email} ya existe en destino, omitiendo`)
    continue
  }

  // Insertar en auth.users del destino (columnas reales del proyecto)
  const insert = `
    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, is_sso_user, is_anonymous
    ) values (
      '${u.id}',
      '00000000-0000-0000-0000-000000000000',
      '${u.aud || 'authenticated'}',
      '${u.role || 'authenticated'}',
      '${u.email.replace(/'/g, "''")}',
      '${u.encrypted_password.replace(/'/g, "''")}',
      ${u.email_confirmed_at ? `'${u.email_confirmed_at}'` : 'null'},
      '${JSON.stringify(u.raw_app_meta_data || {}).replace(/'/g, "''")}'::jsonb,
      '${JSON.stringify(u.raw_user_meta_data || {}).replace(/'/g, "''")}'::jsonb,
      '${u.created_at}',
      '${u.updated_at}',
      false, false
    )
    on conflict (id) do nothing
    returning id
  `
  const result = await managementPost(`/projects/${DESTINO}/database/query`, { query: insert })
  console.log(`  Usuario ${u.email} recreado en destino ✓ (${result[0]?.id || 'ok'})`)
}

// 5. Verificar que public.users del destino tiene el usuario
const publicUsers = await managementPost(`/projects/${DESTINO}/database/query`, {
  query: `select id, email, name, role_id from public.users limit 10`,
})
console.log(`\npublic.users en destino: ${publicUsers.length}`)
for (const u of publicUsers) {
  console.log(`  - ${u.email} (${u.name}) rol: ${u.role_id}`)
}

console.log('\n=== Auth migrado ===')
