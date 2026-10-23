#!/usr/bin/env node
/**
 * Copia datos de mgaServiciosBD (origen) a mgaV3 (destino) vía Management API.
 * Maneja: renombrado de tablas/columnas del Radar, conversión de role_permissions,
 * inserción con IDs explícitos (OVERRIDING SYSTEM VALUE para identity ALWAYS).
 * Uso: node scripts/migrar-datos.mjs
 */
import { readFileSync } from 'node:fs'

const ORIGEN = 'wpbogwonvbcrcpkjxdvb'
const DESTINO = 'ensnfgucsfefrywacxzx'

function leerToken() {
  if (process.env.SUPA_TOKEN) return process.env.SUPA_TOKEN.trim()
  const ruta = process.env.LOCALAPPDATA + '/Temp/opencode/sb-token.txt'
  return readFileSync(ruta, 'utf8').trim()
}
const token = leerToken()

async function sql(ref, query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, apikey: token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  const texto = await r.text()
  if (!r.ok) throw new Error(`[${ref}] ${r.status}: ${texto.slice(0, 500)}`)
  return JSON.parse(texto)
}

// Mapeo de columnas: tabla destino → { columna_origen: columna_destino }
// Solo para tablas del Radar (las demás son idénticas)
const MAPA_RADAAR = {
  busquedas_radar: {
    usuario_id: 'user_id', servicio_id: 'service_id', provincia: 'province', ciudad: 'city',
    categoria: 'category', palabras_clave: 'keywords', radio_km: 'radius_km',
    max_resultados: 'max_results', con_sitio_web: 'website_filter', requiere_telefono: 'phone_required',
    requiere_email: 'email_required', rating_minimo: 'min_rating', min_reseñas: 'min_review_count',
    estado_negocio: 'business_status_filter', estado: 'status', total_encontrados: 'total_found',
    total_guardados: 'total_saved', total_analizados: 'total_analyzed', progreso: 'progress',
    mensaje_error: 'error_message', iniciado_at: 'started_at', completado_at: 'completed_at',
  },
  prospectos: {
    usuario_id: 'user_id', nombre: 'name', nombre_normalizado: 'normalized_name',
    categoria: 'category', categorias: 'categories', descripcion: 'description',
    pais: 'country', provincia: 'province', ciudad: 'city', direccion: 'address',
    codigo_postal: 'postal_code', latitud: 'latitude', longitud: 'longitude',
    telefono: 'phone', telefono_normalizado: 'normalized_phone', sitio_web: 'website',
    dominio_sitio: 'website_domain', url_google_maps: 'google_maps_url',
    cantidad_resenas: 'review_count', estado_negocio: 'business_status', horarios: 'opening_hours',
    puntaje_actividad_comercial: 'commercial_activity_score', puntaje_necesidad_digital: 'digital_need_score',
    puntaje_contactabilidad: 'contactability_score', puntaje_compatibilidad: 'service_fit_score',
    puntaje_oportunidad: 'opportunity_score', nivel_oportunidad: 'opportunity_level',
    servicio_recomendado_id: 'recommended_service_id', servicio_recomendado_nombre: 'recommended_service_name',
    resumen_oportunidad: 'opportunity_summary', motivos_oportunidad: 'opportunity_reasons',
    estado_analisis: 'analysis_status', estado_comercial: 'commercial_status',
    no_contactar: 'do_not_contact', motivo_exclusion: 'exclusion_reason', excluido_at: 'excluded_at',
    fuente: 'source', fuente_url: 'source_url', fuente_datos: 'source_data',
    ultima_verificacion_at: 'last_verified_at', analizado_at: 'analyzed_at',
  },
  resultados_busqueda: {
    busqueda_id: 'search_id', prospecto_id: 'prospect_id', posicion: 'position',
    consulta_coincidida: 'matched_query',
  },
  interacciones_prospecto: {
    prospecto_id: 'prospect_id', usuario_id: 'user_id', tipo_interaccion: 'interaction_type',
    canal: 'channel', notas: 'notes', fecha_interaccion: 'interaction_date',
    proximo_seguimiento_at: 'next_follow_up_at',
  },
  servicios_prospecto: {
    usuario_id: 'user_id', nombre: 'name', descripcion: 'description',
    categorias_objetivo: 'target_categories', palabras_clave_objetivo: 'target_keywords',
    problemas_resueltos: 'problems_solved', activo: 'is_active',
  },
  trabajos_radar: {
    usuario_id: 'user_id', busqueda_id: 'search_id', prospecto_id: 'prospect_id',
    tipo_trabajo: 'job_type', estado: 'status', intentos: 'attempts', max_intentos: 'max_attempts',
    carga: 'payload', resultado: 'result', mensaje_error: 'error_message',
    programado_at: 'scheduled_at', iniciado_at: 'started_at', completado_at: 'completed_at',
  },
  analisis_web: {
    prospecto_id: 'prospect_id', url_final: 'final_url', alcanzable: 'reachable',
    tiene_ssl: 'has_ssl', es_movil_amigable: 'is_mobile_friendly', tiene_comercio: 'has_ecommerce',
    tiene_catalogo: 'has_catalog', tiene_reservas: 'has_booking_system',
    tiene_formulario_contacto: 'has_contact_form', tiene_whatsapp: 'has_whatsapp',
    tiene_portal_cliente: 'has_customer_portal', tiene_chat_en_vivo: 'has_live_chat',
    emails_detectados: 'detected_emails', telefonos_detectados: 'detected_phones',
    redes_detectadas: 'detected_social_links', tecnologias_detectadas: 'detected_technologies',
    palabras_clave_detectadas: 'detected_keywords', puntuacion_performance: 'performance_score',
    puntuacion_accesibilidad: 'accessibility_score', puntuacion_seo: 'seo_score',
    puntuacion_mejores_practicas: 'best_practices_score', crux_disponible: 'crux_available',
    crux_datos: 'crux_data', resumen_analisis: 'analysis_summary', datos_crudos: 'raw_data',
  },
}

// Tabla origen para cada tabla destino (para las del Radar)
const TABLA_ORIGEN_RADAAR = {
  busquedas_radar: 'prospect_searches',
  prospectos: 'prospects',
  resultados_busqueda: 'prospect_search_results',
  interacciones_prospecto: 'prospect_interactions',
  servicios_prospecto: 'prospect_services',
  trabajos_radar: 'prospect_jobs',
  analisis_web: 'website_analyses',
}

// Orden de inserción respetando FKs (padres antes que hijos)
const ORDEN = [
  'roles', 'users', 'role_permissions',
  'clientes', 'activos', 'servicios', 'servicio_tareas',
  'presupuestos', 'presupuesto_items',
  'cobranzas', 'gastos_plantilla', 'tarjetas', 'gastos', 'gastos_pagos',
  'productos', 'aliases_productos', 'rubros', 'origenes_destinos',
  'remitos', 'remito_items', 'movimientos_stock',
  'oportunidades', 'oportunidad_iteraciones',
  'noticias', 'contacts',
  'empresas', 'modulos', 'empresa_modulos', 'tenants',
  'busquedas_radar', 'servicios_prospecto', 'prospectos',
  'resultados_busqueda', 'interacciones_prospecto', 'trabajos_radar', 'analisis_web',
]

function escapar(valor, tipoDestino) {
  if (valor === null || valor === undefined) return 'null'
  if (typeof valor === 'boolean') return valor ? 'true' : 'false'
  if (typeof valor === 'number') return String(valor)
  if (Array.isArray(valor)) {
    // text[] destino: array literal de PostgreSQL
    if (tipoDestino === 'ARRAY') {
      const items = valor.map((v) => (v === null ? 'null' : `'${String(v).replace(/'/g, "''")}'`))
      return `array[${items.join(',')}]::text[]`
    }
    return `'${JSON.stringify(valor).replace(/'/g, "''")}'::jsonb`
  }
  if (typeof valor === 'object') return `'${JSON.stringify(valor).replace(/'/g, "''")}'::jsonb`
  // String que el destino espera como array (viene como string json desde la API REST)
  if (tipoDestino === 'ARRAY' && typeof valor === 'string') {
    try {
      const arr = JSON.parse(valor)
      if (Array.isArray(arr)) {
        const items = arr.map((v) => (v === null ? 'null' : `'${String(v).replace(/'/g, "''")}'`))
        return `array[${items.join(',')}]::text[]`
      }
    } catch { /* no es json */ }
  }
  return `'${String(valor).replace(/'/g, "''")}'`
}

async function contar(ref, tabla) {
  const filas = await sql(ref, `select count(*) as n from public.${tabla}`)
  return Number(filas[0].n)
}

async function copiarTabla(tabla) {
  const tablaOrigen = TABLA_ORIGEN_RADAAR[tabla] || tabla
  const mapa = MAPA_RADAAR[tabla] || null

  // Determinar columnas destino con sus tipos
  const colsDestino = await sql(DESTINO, `
    select column_name, data_type from information_schema.columns
    where table_schema = 'public' and table_name = '${tabla}'
    order by ordinal_position
  `)
  const columnasDestino = colsDestino.map((c) => c.column_name)
  const tiposDestino = Object.fromEntries(colsDestino.map((c) => [c.column_name, c.data_type]))

  // Excluir columnas identity ALWAYS (se generan solas, pero necesitamos preservar IDs)
  // Usaremos OVERRIDING SYSTEM VALUE
  const nOrigen = await contar(ORIGEN, tablaOrigen)
  if (nOrigen === 0) {
    console.log(`  ${tabla}: 0 filas (origen)`)
    return
  }

  // Leer datos del origen en lotes de 500
  const LOTE = 500
  let insertadas = 0
  for (let offset = 0; offset < nOrigen; offset += LOTE) {
    const filas = await sql(ORIGEN, `select * from public.${tablaOrigen} limit ${LOTE} offset ${offset}`)
    if (!filas.length) break

    // Transformar cada fila al esquema destino
    const filasTransformadas = filas.map((fila) => {
      const resultado = {}
      for (const colDestino of columnasDestino) {
        if (mapa) {
          // Tabla del Radar: mapear columna destino → origen
          const colOrigen = mapa[colDestino] || colDestino
          resultado[colDestino] = fila[colOrigen]
        } else {
          resultado[colDestino] = fila[colDestino]
        }
      }
      return resultado
    })

    // Construir INSERT — siempre con OVERRIDING SYSTEM VALUE para preservar IDs
    // Quoteear identificadores (algunas columnas tienen ñ)
    const columnas = columnasDestino.map((c) => `"${c}"`).join(', ')
    const valores = filasTransformadas
      .map((fila) => `(${columnasDestino.map((c) => escapar(fila[c], tiposDestino[c])).join(', ')})`)
      .join(',\n')

    const query = `insert into public.${tabla} (${columnas}) overriding system value values ${valores} on conflict do nothing`
    try {
      await sql(DESTINO, query)
      insertadas += filasTransformadas.length
    } catch (e) {
      console.error(`\n  ERROR en ${tabla} lote offset=${offset}: ${e.message.slice(0, 300)}`)
      throw e
    }
    process.stdout.write(`\r  ${tabla}: ${insertadas}/${nOrigen}`)
  }
  console.log(`\r  ${tabla}: ${insertadas}/${nOrigen} ✓`)
}

// role_permissions: conversión de matriz plana a nodos
async function copiarRolePermissions() {
  const filas = await sql(ORIGEN, 'select * from public.role_permissions limit 200')
  if (!filas.length) {
    console.log('  role_permissions: 0 filas (origen)')
    return
  }

  const MAPA_MODULOS = {
    clientes: 'altas.clientes', activos: 'altas.activos',
    servicios: 'servicios.servicios', presupuestos: 'servicios.presupuestos',
    cobranzas: 'fondos.cobranzas', gastos: 'fondos.gastos',
    productos: 'inventario.productos', remitos: 'inventario.remitos',
    oportunidades: 'zoologic.oportunidades', radar: 'prospectos.radar',
    noticias: 'landing_page.noticias', admin: 'administracion',
  }

  const convertidas = []
  for (const fila of filas) {
    const nodo = MAPA_MODULOS[fila.module]
    if (!nodo) continue
    const acciones = []
    if (fila.can_view) acciones.push('ver')
    if (fila.can_create) acciones.push('crear')
    if (fila.can_edit) acciones.push('editar')
    if (fila.can_delete) acciones.push('eliminar')
    if (!acciones.length) continue
    convertidas.push({
      role_id: fila.role_id,
      nodo,
      acciones: `{${acciones.join(',')}}`,
    })
  }

  if (!convertidas.length) {
    console.log('  role_permissions: 0 filas convertidas')
    return
  }

  const valores = convertidas
    .map((f) => `(${f.role_id}, '${f.nodo}', '${f.acciones}'::text[])`)
    .join(',\n')

  const query = `insert into public.role_permissions (role_id, nodo, acciones) values ${valores} on conflict (role_id, nodo) do nothing`
  await sql(DESTINO, query)
  console.log(`  role_permissions: ${convertidas.length} filas convertidas ✓`)
}

// Copiar roles (con is_admin que no existe en origen)
async function copiarRoles() {
  const filas = await sql(ORIGEN, 'select * from public.roles limit 50')
  if (!filas.length) {
    console.log('  roles: 0 filas (origen)')
    return
  }
  const valores = filas
    .map((f) => `(${f.id}, '${f.name.replace(/'/g, "''")}', '${(f.description || '').replace(/'/g, "''")}', ${f.is_default}, ${f.name === 'Administrador'})`)
    .join(',\n')
  const query = `insert into public.roles (id, name, description, is_default, is_admin) overriding system value values ${valores} on conflict do nothing`
  await sql(DESTINO, query)
  console.log(`  roles: ${filas.length} filas ✓`)
}

// Copiar users (solo campos que existen en destino)
async function copiarUsers() {
  const filas = await sql(ORIGEN, 'select id, email, name, role_id, created_at, updated_at from public.users limit 100')
  if (!filas.length) {
    console.log('  users: 0 filas (origen)')
    return
  }
  const valores = filas
    .map((f) => `('${f.id}', '${f.email.replace(/'/g, "''")}', '${(f.name || '').replace(/'/g, "''")}', ${f.role_id}, '${f.created_at}', '${f.updated_at}')`)
    .join(',\n')
  const query = `insert into public.users (id, email, name, role_id, created_at, updated_at) values ${valores} on conflict (id) do nothing`
  await sql(DESTINO, query)
  console.log(`  users: ${filas.length} filas ✓`)
}

// Arreglar secuencias después de la copia
async function arreglarSecuencias() {
  // Buscar secuencias reales y su tabla dueña via information_schema
  const seqs = await sql(DESTINO, `
    select
      c.relname as secuencia,
      t.relname as tabla,
      a.attname as columna
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join pg_depend d on d.objid = c.oid and d.deptype = 'a'
    join pg_class t on t.oid = d.refobjid
    join pg_attribute a on a.attrelid = t.oid and a.attnum = d.refobjsubid
    where n.nspname = 'public' and c.relkind = 'S'
    order by c.relname
  `)
  for (const s of seqs) {
    const max = await sql(DESTINO, `select coalesce(max(${s.columna}), 0) as m from public.${s.tabla}`)
    const valor = Number(max[0].m)
    if (valor > 0) {
      await sql(DESTINO, `select setval('public.${s.secuencia}', ${valor})`)
    }
  }
  console.log(`  Secuencias ajustadas: ${seqs.length} ✓`)
}

// ============================================================
// Main
// ============================================================
console.log('=== Migración de datos: mgaServiciosBD → mgaV3 ===\n')

console.log('Conteos origen:')
for (const tabla of ['clientes', 'servicios', 'noticias', 'prospects', 'oportunidades']) {
  const origenTabla = TABLA_ORIGEN_RADAAR[tabla] || tabla
  const n = await contar(ORIGEN, origenTabla)
  console.log(`  ${origenTabla}: ${n}`)
}

console.log('\nCopiando tablas...')
for (const tabla of ORDEN) {
  if (tabla === 'roles') {
    await copiarRoles()
  } else if (tabla === 'role_permissions') {
    await copiarRolePermissions()
  } else if (tabla === 'users') {
    await copiarUsers()
  } else {
    await copiarTabla(tabla)
  }
}

console.log('\nAjustando secuencias...')
await arreglarSecuencias()

console.log('\nConteos destino:')
for (const tabla of ['clientes', 'servicios', 'noticias', 'prospectos', 'oportunidades']) {
  const n = await contar(DESTINO, tabla)
  console.log(`  ${tabla}: ${n}`)
}

console.log('\n=== Migración completada ===')
