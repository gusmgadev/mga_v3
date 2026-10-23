# specs/privado.md — Especificación de la Zona Privada

> **Proyecto:** MGA Informática — Sistema interno de gestión (dashboard operativo + Radar de Oportunidades + Panel Superadmin)
> **Tipo de documento:** Especificación normativa para construir un proyecto nuevo.
> **Origen:** Revisión QA completa del sistema de referencia (mga-v2). Este documento ya incorpora las correcciones de contradicciones, vacíos de seguridad y requisitos incompletos detectados (ver Apéndice A).
> **Reglas comunes:** `AGENTS.md` manda ante conflicto (frontera público/privado §1, seguridad base §4, calidad y testing §5, env §9). Zona pública: `specs/publico.md`.

---

## 1. Propósito y alcance

Sistema privado de gestión interna para una empresa de servicios IT. Tres subsistemas en un mismo repo Next.js:

| Subsistema | Ruta | Auth | Audiencia |
|---|---|---|---|
| **Dashboard operativo** | `/dashboard/*` | NextAuth v5 (JWT) + roles/permisos | Personal interno |
| **Radar de Oportunidades** | `/dashboard/radar/*` | Ídem dashboard + aislamiento por `user_id` | Comercial |
| **Panel Superadmin** | `/superadmin/*` | Cookie de sesión propia (independiente de NextAuth) | Dueño/admin del SaaS POS |

**Fuera de alcance de este documento:** landing pública, noticias públicas, formulario de contacto y SEO (ver `specs/publico.md`).

---

## 2. Stack técnico y decisiones unificadas

| Capa | Tecnología | Nota |
|---|---|---|
| Framework | Next.js 16.x App Router | `params`/`searchParams` son `Promise` → **siempre** `await params` |
| Lenguaje | TypeScript strict | Sin `any` sin justificación |
| Auth dashboard | NextAuth v5 (Credentials + JWT) | **Variable canónica: `AUTH_SECRET`** (no `NEXTAUTH_SECRET`) |
| BD / Auth auxiliar | Supabase PostgreSQL + Supabase Auth | |
| Validación | Zod 4.x | Forms (react-hook-form + zodResolver) **y** API routes |
| Estilos dashboard | Inline styles + `lib/private/theme.ts` | **Sin Tailwind en el dashboard** (ver `AGENTS.md` P-03) |
| Íconos | Lucide React | |
| IA / voz | Groq: Whisper STT + GPT-OSS 20B | Cupo diario limitado → ver §8 |
| Rich text | TipTap (Bold/Italic/Highlight) | Solo noticias; sanitizado al renderizar (§9) |
| Email | Resend | |
| Instagram | Graph API v21.0 | Auto-post opcional |
| Editor Excel | `xlsx` (lectura en memoria) | Importación admin |
| Dev server | `next dev --webpack` | Turbopack deshabilitado por bugs en rutas de login |

**Variables de entorno:** la tabla canónica (con zona y secreta) vive en `AGENTS.md` §9; esta spec no la duplica.

> **Regla:** ninguna secret puede tener valor por defecto inseguro. Si falta una variable requerida, el endpoint debe fallar con error claro, nunca autenticar con un fallback.

---

## 3. Arquitectura general

### 3.1 Estructura de carpetas (zona privada)

```
app/
├── (auth)/auth/signin/
├── (dashboard)/dashboard/
│   ├── page.tsx                # Home operativo (tarjetas por grupo)
│   ├── clientes/  activos/  servicios/  presupuestos/
│   ├── oportunidades/  radar/  productos/  remitos/
│   ├── cobranzas/  gastos/  noticias/
│   └── admin/{usuarios,roles,permisos,importar}/
├── (superadmin)/superadmin/{login,empresas,modulos}/
└── api/
    ├── auth/[...nextauth]/
    ├── dashboard/…             # APIs del dashboard (ver módulos), incluye upload/*
    └── superadmin/{auth,empresas,modulos}/
proxy.ts                        # Protección de rutas (no middleware.ts)
lib/private/                    # theme, auth, permisos, modulos (constante única), supabase-anon,
                                # supabase-admin, supabase-master, superadmin-auth, instagram, groq, radar/*
components/private/             # shell, sidebar, modales, comboboxes, VoiceRecorder, …
types/  supabase/migrations/
```

> **Frontera:** la landing, las páginas de servicios y sistemas, las noticias públicas y `/api/public/contact` pertenecen a `specs/publico.md` y viven en `(public)`. Esta zona no importa nada de `lib/public` ni `components/public`, ni al revés (`AGENTS.md` §1.2).

### 3.2 Patrones obligatorios

**Página del dashboard:**
```ts
// Server Component
export default async function XxxPage() {
  const session = await auth()
  if (!session) redirect('/auth/signin')
  const permisos = await getModulePermisos(session.user.role_id, session.user.role, 'modulo')
  if (!permisos.can_view) redirect('/dashboard')
  const data = await fetch…(supabaseAdmin)
  return <XxxClient initialData={data} permisos={permisos} />
}
```

**Client component (`*Client.tsx`):** recibe data + permisos por props (sin loading inicial), maneja estado local/optimistic updates y llama a `/api/dashboard/*` para mutaciones.

**API route:**
```ts
export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  // 2) verificar permiso del módulo (can_create / can_edit / can_delete)
  // 3) validar body con Zod
  // 4) operar con supabaseAdmin
}
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params   // Next.js 16: params es Promise
}
```

**Modales:** click fuera NO cierra; botón guardar en el header vía prop `formId` (submit externo); modales internos usan `createPortal(jsx, document.body)` con `zIndex` superior (evita `<form>` anidados).

**Supabase:** `lib/private/supabase-anon.ts` (anon; solo `signInWithPassword` en servidor) y `lib/private/supabase-admin.ts` (service role, **solo server**, `server-only`, bypass RLS). El superadmin usa un cliente propio (`lib/private/supabase-master.ts`) apuntando a la BD del POS.

---

## 4. Modelo de datos (resumen por dominio)

Todas las tablas habilitan RLS (sin política = sin acceso salvo service role). El acceso desde el server usa service role como bypass deliberado (los checks de permisos viven en la capa de API — §6 y §9). La zona pública no accede a estas tablas: solo a la superficie pública definida en `AGENTS.md` §1.3.

### 4.1 Identidad y permisos
| Tabla | Campos clave |
|---|---|
| `roles` | `id, name (unique), description, is_default` — solo un `is_default` (índice unique parcial) |
| `users` | `id (uuid FK auth.users), email, name, role_id FK roles` |
| `role_permissions` | `role_id, module, can_view, can_create, can_edit, can_delete` — `UNIQUE(role_id, module)` |

### 4.2 Clientes y activos
| Tabla | Campos clave |
|---|---|
| `clientes` | `nombre, tipo (PARTICULAR/EMPRESA/COMERCIO), email, telefono, direccion, localidad, cuit, rubro, notas, activo, imagen (URL Storage), pagina_web, mostrar_en_landing` |
| `activos` | `nombre, tipo, marca, modelo, serie, cliente_id FK, activo` — `tipo` es texto sin constraint; catálogo: PC, NOTEBOOK, SERVIDOR, IMPRESORA, SISTEMA, DESARROLLO, SERVICIO, DISPOSITIVO, OTRO, PANTERA, LINCE, DRAGONFISH |

### 4.3 Servicios y presupuestos
| Tabla | Campos clave |
|---|---|
| `servicios` | `cliente_id FK, activo_id FK?, titulo, descripcion, fecha (date), estado, estado_pago, valor, presupuesto_id FK?` |
| `servicio_tareas` | `servicio_id FK cascade, descripcion, estado, fecha (date?)` |
| `presupuestos` | `cliente_id FK, activo_id FK?, titulo, descripcion, estado, fecha, fecha_vencimiento?, nro_tarea?, archivo_url?, servicio_id FK?` — **no tiene `valor`** (total = suma de ítems) |
| `presupuesto_items` | `presupuesto_id FK cascade, descripcion, cantidad numeric, precio_unitario numeric, orden` |

### 4.4 Comercial: oportunidades
| Tabla | Campos clave |
|---|---|
| `oportunidades` | `titulo, registrada_por, fechas, tipo_tarea, cliente_codigo/nombre, origen, tipo_oportunidad, zona_gestion, datos contacto, email_subject/from/fecha, email_message_id (unique → dedup), estado, tipo_op, notas, motivo_cierre, servicio_id FK?, presupuesto_id FK?, fecha_ultimo_estado_final` |
| `oportunidad_iteraciones` | `oportunidad_id FK cascade, tipo_contacto, contacto, detalle, fecha` |

### 4.5 Radar de Oportunidades
| Tabla | Campos clave |
|---|---|
| `prospect_services` | Servicios ofrecidos: `user_id, name, target_categories[], target_keywords[], problems_solved[], is_active` |
| `prospect_searches` | `user_id, service_id?, province, city, category, keywords[], radius_km, max_results, filtros (website_filter, phone_required, email_required, min_rating, min_review_count, business_status_filter), status, total_found/saved/analyzed, progress, last_pagetoken, error_message, started_at/completed_at` |
| `prospects` | Identidad + contacto + geo; `rating, review_count, business_status, opening_hours`; **scoring:** `commercial_activity_score, digital_need_score, contactability_score, service_fit_score, opportunity_score, opportunity_level, opportunity_summary, opportunity_reasons (jsonb)`; **pipeline:** `analysis_status, commercial_status`; **exclusión:** `do_not_contact, exclusion_reason, excluded_at`; **trazabilidad:** `source, source_url, source_data (jsonb crudo), last_verified_at, analyzed_at`; **conversión:** `existing_client_id FK?, existing_servicio_id FK?, existing_client_notes, closed_at` |
| `prospect_search_results` | `search_id, prospect_id, position, matched_query` — `UNIQUE(search_id, prospect_id)` |
| `website_analyses` | `prospect_id, url, reachable, http_status, has_ssl, is_mobile_friendly, has_ecommerce/has_catalog/has_booking_system/has_contact_form/has_whatsapp, detected_emails[], detected_phones[], detected_social_links, detected_technologies[], scores (performance/accessibility/seo/best_practices), crux_available, crux_data, analysis_summary, raw_data` |
| `prospect_interactions` | `prospect_id, user_id, interaction_type, channel, notes, interaction_date, next_follow_up_at` |
| `prospect_jobs` | Cola de trabajos: `job_type, status, attempts, max_attempts, payload, result, error_message, scheduled/started/completed_at` |
| `radar_api_usage` | Control de cuota: `user_id, search_id?, (métrica de consumo)` |
| `rubros` | Catálogo global de rubros para búsquedas |

Índices únicos/filtrados: `prospects_user_google_place_unique (user_id, google_place_id) WHERE google_place_id IS NOT NULL`; índices por `city`, `category`, `opportunity_score DESC`, `commercial_status`, `existing_client_id`.

### 4.6 Stock
| Tabla | Campos clave |
|---|---|
| `origenes_destinos` | `tipo (proveedor/sucursal/deposito/cliente/otro), nombre, activo` |
| `remitos` | `usuario_id?, numero_tipo (automatico/manual/proveedor), numero, tipo (entrada/salida), fecha, origen_destino_id?, origen_destino_texto?, observaciones, audio_url?, transcripcion?, estado (borrador/confirmado/anulado), confirmado_at` |
| `remito_items` | `remito_id FK cascade, producto_id?, nombre_detectado?, cantidad, cantidad_asumida, unidad?, costo?, precio_venta?, confianza (0-1), es_producto_nuevo, orden` |
| `movimientos_stock` | `producto_id, remito_id, remito_item_id, tipo (entrada/salida/ajuste), cantidad, costo?, stock_antes, stock_despues` |
| `productos` | `codigo?, nombre, marca?, rubro?, subrubro?, unidad, stock_actual, costo?, precio_venta?, activo` |
| `marcas` / `rubros_productos` | `nombre, activo` |

### 4.7 Fondos
| Tabla | Campos clave |
|---|---|
| `cobranzas` | `cliente_id FK, servicio_id FK?, tipo (CARGO/PAGO/NOTA_CREDITO), concepto, monto, fecha, metodo_pago? (EFECTIVO/TRANSFERENCIA/TARJETA/CHEQUE/OTRO), notas` |
| `gastos_plantilla` | `categoria, descripcion, monto_estimado?, activo, orden` |
| `gastos` | `plantilla_id?, mes, anio, categoria, descripcion, monto_estimado?, monto_real?, monto_pagado?, pagado, fecha_pago?, metodo_pago?, tarjeta_id FK?, notas` + derivados `PENDIENTE / PAGO PARCIAL / PAGADO` |
| `gastos_pagos` | `gasto_id FK cascade, monto, fecha_pago?, metodo_pago?, tarjeta_id?, notas` — pagos parciales; `recomputeGasto()` recalcula `monto_pagado/pagado` |
| `tarjetas` | `nombre, tipo, banco?, activo` |

### 4.8 Contenido y superadmin
| Tabla | Campos clave |
|---|---|
| `noticias` | `titulo, resumen, contenido (HTML TipTap), imagen_card?, imagen_portada?, video_url?, publicada, orden, fecha` |
| `empresas` (BD POS) | `nombre, codigo (unique), activo, supabase_url/keys, datos fiscales, plan (basico/profesional/enterprise), fechas, estado_implementacion, notas` |
| `empresa_modulos` | `empresa_id FK, modulo, activo` — `UNIQUE(empresa_id, modulo)` |
| `modulos` (catálogo POS) | Catálogo **en BD** de módulos POS disponibles (ventas, inventario, caja, contactos, finanzas, administracion, optica, …) — centralizado, sin listas hardcodeadas |

---

## 5. Autenticación, roles y permisos

### 5.1 Dashboard
1. `/auth/signin` → NextAuth Credentials valida contra Supabase Auth (`signInWithPassword`).
2. Se carga perfil `users JOIN roles` → JWT con `{ id, email, name, role (name), role_id }`.
3. `proxy.ts` (matcher sobre todas las rutas salvo estáticos) protege:
   - `/dashboard/*` sin sesión → redirect `/auth/signin`
   - `/dashboard/admin/*` requiere `role === 'Administrador'`
   - `/auth/signin` con sesión → redirect `/dashboard`
   - `/superadmin/*` (excepto login) → cookie de superadmin
4. **Toda API `/api/dashboard/*` verifica sesión propia** (el middleware no reemplaza este check) y además el **permiso del módulo** correspondiente a la acción.
5. **Login protegido:** rate limit por IP y por email, mensaje de error genérico (no revela si la cuenta existe) y contraseña de mínimo 12 caracteres (`AGENTS.md` §4).

### 5.2 Roles y permisos
- Roles dinámicos en BD. Iniciales: `Administrador` (acceso total) y `Usuario` (default, `is_default = true`).
- Permisos por módulo y rol: `can_view / can_create / can_edit / can_delete`.
- `getModulePermisos(roleId, role, module)`: shortcircuit TOTAL para Administrador (sin query).
- **Alta de usuarios:** solo por un **Administrador** desde `/dashboard/admin/usuarios`. No existe registro público ni `/auth/registro` (`AGENTS.md` D-06).
- Reglas: solo un Administrador cambia roles de otros; nadie cambia su propio rol.

### 5.3 Módulos canónicos de permisos (11)
`clientes, activos, servicios, presupuestos, cobranzas, productos, remitos, noticias, oportunidades, gastos, radar`

> **Regla de mantenimiento:** al agregar un módulo nuevo actualizar **siempre** (a) seed `role_permissions`, (b) `sidebar.tsx` navGroups, (c) array de `permissions/route.ts`, (d) tarjetas del home. Los cuatro puntos viven en una única constante compartida en el proyecto nuevo.

### 5.4 Superadmin (independiente)
- Login `POST /api/superadmin/auth { password }` contra `SUPERADMIN_SECRET`.
- **Cookie corregida:** valor = **token de sesión aleatorio firmado** (HMAC del nonce + `iat` con `SUPERADMIN_SECRET`), **no** la contraseña. Atributos: `HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400`.
- Rate limit en intentos de login (p. ej. 5/min por IP) + respuesta genérica (sin diferenciar password incorrecta de secreto ausente).
- `proxy.ts` valida la firma de la cookie en `/superadmin/*` (excepto `/superadmin/login`); cada API route superadmin revalida con `isSuperadminAuthenticated()`.
- Logout (`DELETE`) limpia la cookie. **Sin secreto configurado → login rechazado**, nunca fallback.

---

## 6. Módulos funcionales del dashboard

Permisos indicados por defecto: Administrador = CRUD total; Usuario según fila en `role_permissions`.

### 6.0 Home operativo (`/dashboard`)
- Tarjetas por grupo con ícono, descripción y color, reflejando **exactamente** los módulos del sidebar:
  - **Servicios:** Oportunidades, Radar, Prospectos, Radar Servicios, Servicios, Presupuestos, Activos
  - **Altas:** Clientes, Productos
  - **Stock:** Remitos
  - **Fondos:** Cobranzas, Gastos
  - **Administración** (solo admin): Noticias, Usuarios, Roles, Permisos, Importar
- Saludo con nombre de usuario y badge de admin.

### 6.1 Clientes (`/dashboard/clientes`) — grupo Altas
- **Funcional:** lista, crear, editar, eliminar; subida de logo (`POST /api/dashboard/upload/logo`, bucket `clientes-logos`, formatos JPG/PNG/WEBP, máx. 5 MB; **SVG no se acepta** salvo que se sanee, porque puede ejecutar scripts).
- **Quick-create:** `QuickCreateClienteModal` reutilizable desde activos/servicios/presupuestos/oportunidades (portal, `zIndex` superior, pre-carga de datos de contacto desde oportunidades).
- `mostrar_en_landing` decide si aparece en la sección de clientes pública.
- **API:** `GET|POST /api/dashboard/clientes`, `GET|PUT|DELETE /api/dashboard/clientes/[id]`.
- Columnas en español; joins usan `clientes(nombre)`.

### 6.2 Activos (`/dashboard/activos`) — grupo Servicios
- Lista filtrable por cliente, crear, editar, eliminar.
- **Quick-create** `QuickCreateActivoModal` (requiere `cliente_id` seleccionado; botón `+` deshabilitado sin cliente).
- **API:** `GET|POST /api/dashboard/activos` (filtro `cliente_id`), `GET|PUT|DELETE /api/dashboard/activos/[id]`.

### 6.3 Servicios (`/dashboard/servicios`) — grupo Servicios
- Órdenes de trabajo: lista, detalle, crear, editar, eliminar.
- **Estados:** `INGRESADO | EN PROCESO | CANCELADO | RECHAZADO | TERMINADO | PRESUPUESTADO`.
- **Estados de pago:** `PENDIENTE | SIN CARGO | GARANTIA | PAGO PARCIAL | PAGADO`.
- **Tareas:** CRUD por servicio con `fecha` de realización. Reglas:
  - Al marcar tarea `TERMINADA`, si TODAS están terminadas → servicio `TERMINADO` (auto-terminación).
  - Agregar tarea a servicio `TERMINADO` → vuelve a `EN PROCESO` (auto-reinicio).
- **Pagos:** cobranzas con `servicio_id` vinculado; saldo = `max(0, valor − Σ pagos)` calculado en cliente. Los pagos de un servicio son filas de `cobranzas` tipo `PAGO` con `servicio_id`; no existe tabla `servicio_pagos` (`AGENTS.md` D-04).
- **Pago rápido desde grilla** (si `can_create`): modal con monto pre-cargado con el saldo, método por defecto `TRANSFERENCIA`, chips Valor/Pagado/Saldo, actualización optimista preservando `SIN CARGO`/`GARANTIA`.
- **Generar servicio desde presupuesto APROBADO** (sin servicio asociado).
- **API:** `/api/dashboard/servicios` (GET+POST), `/[id]` (GET+PUT+DELETE), `/[id]/tareas` (+ `/[tareaId]` PUT+DELETE), `/[id]/pagos` (+ `/[pagoId]` DELETE).

### 6.4 Presupuestos (`/dashboard/presupuestos`) — grupo Servicios
- Lista con filtros (`cliente_id`, `estado`), detalle con ítems, crear/editar/eliminar.
- **Estados:** `BORRADOR | ENVIADO | APROBADO | RECHAZADO | VENCIDO`.
- **Total siempre calculado** desde ítems (`Σ cantidad × precio_unitario`); sin columna `valor`.
- Ítems CRUD con `orden`; `fecha` editable (default hoy); `archivo_url` → documento PDF/DOC en Storage.
- **Adjunto:** `POST /api/dashboard/upload/presupuesto-doc` (tipos PDF/DOC permitidos, tamaño máximo).
- **Vínculos:** `oportunidad_id` (payload → actualiza `oportunidades.presupuesto_id`, no es columna) y `servicio_id`.
- **Transiciones automáticas:** presupuesto → `APROBADO` ⇒ oportunidad vinculada `GANADA`; → `RECHAZADO` ⇒ `NO_GANADA` (ambas setean `fecha_ultimo_estado_final`).
- **API:** `/api/dashboard/presupuestos` (GET+POST), `/[id]` (GET+PUT+DELETE), `/[id]/items` (+ `/[itemId]` PUT+DELETE).

### 6.5 Oportunidades (`/dashboard/oportunidades`) — grupo Servicios
- Pipeline comercial de leads extraídos de email (Zoologic CRM).
- **Estados:** `NUEVA | PRIMER_CONTACTO_WS | EN_PROCESO | PRESUPUESTADA | GANADA | NO_GANADA | NO_OP`. Finales: `GANADA | NO_GANADA | NO_OP` (setean `fecha_ultimo_estado_final`). Filtro "activas": NUEVA + PRIMER_CONTACTO_WS + EN_PROCESO + PRESUPUESTADA.
- **Extracción por email:**
  1. `POST /api/dashboard/oportunidades/buscar-emails` — ImapFlow + Gmail IMAP.
  2. Usuario selecciona emails y tipo (`OP_NUEVA | SEGUIMIENTO | CROSS_SELLING`).
  3. `POST …/extraer` — Groq GPT-OSS 20B en modo JSON. Deduplicación por `email_message_id`.
  4. Manejo de rate limits: TPD (tokens/día) → abortar loop inmediato; TPM → espera ≤ 30 s y un reintento; delay 1.200 ms entre llamadas; lotes ≤ 10-12 emails.
- **Iteraciones (historial de contacto):** CRUD por oportunidad; tipos `telefono/whatsapp/mail/presencial/otro`.
- **Botón WhatsApp:** si estado `NUEVA` → abre `wa.me` con mensaje pre-cargado, crea iteración ("Primer contacto por whatsapp") y transiciona a `PRIMER_CONTACTO_WS`; si no, abre `wa.me` limpio sin efectos.
- **Auto-transición al guardar iteración:** whatsapp con detalle "primer contacto por whatsapp" → `PRIMER_CONTACTO_WS`; caso contrario NUEVA → `EN_PROCESO`.
- **Generar presupuesto desde oportunidad:** modal con quick-create de cliente (pre-carga de datos), `POST /presupuestos` con `oportunidad_id`, luego `PATCH` de la oportunidad a `PRESUPUESTADA`, redirect al detalle.
- **API:** `/api/dashboard/oportunidades` (GET+POST), `/[id]` (PATCH+DELETE), `/[id]/iteraciones` (+ `/[iteracionId]` PUT+DELETE), `/buscar-emails`, `/extraer`.

### 6.6 Radar de Oportunidades (`/dashboard/radar`) — grupo Servicios
Prospección comercial masiva con Google Places + análisis web + scoring explicable.

**Páginas:**
| Ruta | UI |
|---|---|
| `/dashboard/radar` | Home: nueva búsqueda, búsquedas recientes con progreso, KPIs (prospectos, oportunidades altas, pendientes) |
| `/dashboard/radar/nueva-busqueda` | Formulario: ubicación, rubro/palabras clave, servicio a ofrecer, filtros (web/teléfono/email/rating/reseñas/estado), `max_results` |
| `/dashboard/radar/prospectos` | Grilla ordenable por puntajes con filtros rápidos (oportunidad alta, sin web, con teléfono/WhatsApp/email, pendientes) y acciones (estado comercial, WA, detalle) |
| `/dashboard/radar/prospectos/[id]` | Detalle: información, contacto (WhatsApp editable + link wa.me), ubicación, análisis digital, 4 puntajes + final, motivos (jsonb), servicio recomendado, interacciones, fuentes/datos crudos |
| `/dashboard/radar/servicios` | CRUD de `prospect_services` (rubros/keywords objetivo) |

**Flujo de búsqueda (síncrono con progreso persistido):**
1. Validar sesión + cuota (`radar_api_usage`) → crear `prospect_searches` (`status: searching`).
2. Generar consultas (rubro + localidad + keywords) → `textSearch`/`nearbySearch` con paginación (`last_pagetoken`).
3. Por lugar: `getPlaceDetails` → normalizar → **deduplicar** (`google_place_id` → teléfono → dominio → nombre+localidad → dirección) → guardar `prospects` (`analysis_status: ready` para los enriquecidos).
4. Actualizar `progress`/`total_found` en cada tanda; finalizar `status: completed | partial | failed` con `progress: 100`.
5. Análisis web opcional (si tiene sitio): extracción de emails/teléfonos/WhatsApp/redes/tecnologías → `website_analyses`.

**Scoring (4 puntajes 0-100 + final):**
```
opportunity_score = round(
  comercial × 0.30 + necesidad_digital × 0.35 + contacto × 0.15 + compatibilidad × 0.20)
```
- Actividad comercial: reseñas, rating, estado operativo, web, horarios, CrUX.
- Necesidad digital: sin web → 90; sin SSL/mobile/catálogo/turnos/formulario, performance baja.
- Contacto: WhatsApp 30, teléfono 25, email 25, formulario 10, dirección 10.
- Compatibilidad: overlap entre rubro del prospecto y `target_categories` del servicio.
- Niveles: `very_high ≥ 80 · high ≥ 65 · medium ≥ 45 · low ≥ 25 · very_low`.
- **Siempre guardar `opportunity_reasons`** (código, etiqueta, impacto, categoría): nunca mostrar un número sin explicación. Pesos configurables.

**Pipeline comercial (`commercial_status`):** `new, reviewed, to_contact, contacted, interested, meeting, proposal_sent, won, lost, discarded, do_not_contact, existing_customer` + campos de exclusión (`do_not_contact`, `exclusion_reason`, `excluded_at`).

**Conversión a cliente:** `POST /api/dashboard/radar/prospects/[id]/convert` — crea/vincula cliente existente y opcionalmente un servicio (`INGRESADO`) o presupuesto (`BORRADOR`); cierra el prospect (`closed_at`, `commercial_status: existing_customer`).

**Interacciones:** CRUD por prospecto (`prospect_interactions`) con seguimiento (`next_follow_up_at`).

**API:** `/api/dashboard/radar/{searches, prospects, prospects/[id], prospects/[id]/status, prospects/[id]/convert, prospects/[id]/interactions, interactions/[id], servicios, servicios/[id], usage}`. Todas con sesión + scope `user_id`.

### 6.7 Productos (`/dashboard/productos`) — grupo Altas
- Catálogo con `codigo?`, marca/rubro/subrubro (combobox `CatalogoCombobox` con alta inline), unidad, stock, costo, precio de venta.
- **Regla:** `stock_actual` **solo** se modifica al confirmar remitos (movimientos_stock); nunca a mano.
- **API:** `/productos` (GET+POST), `/productos/[id]` (GET+PUT+DELETE), `/marcas` (GET+POST), `/rubros-productos` (GET+POST).

### 6.8 Remitos (`/dashboard/remitos`) — grupo Stock
- Ingreso/egreso de stock: lista, detalle, crear, editar, **confirmar** (aplica `movimientos_stock` y actualiza stock), anular.
- **Ítems:** producto vinculado o nombre detectado; `confianza ≥ 0.7` auto-inserta, por debajo → panel de pendientes (usar coincidencia / crear producto / descartar).
- **Ingreso por voz:** `VoiceRecorder` (MediaRecorder, `.webm`) → `POST /api/dashboard/voz/transcribir`:
  1. Audio → Storage `remitos-audio` (**bucket privado**, URL firmada — §9).
  2. Groq Whisper (español) → texto.
  3. GPT-OSS 20B → productos JSON.
  4. Matching en cascada: `codigo` exacto (1.0) → RPC `buscar_productos_por_nombre` pg_trgm (confianza real) → fallback `ilike` nombre (0.5) / código (0.8).
  5. Respuesta `{ audio_url, transcripcion, items[] }`.
- Keywords del dictado: `cantidad N`, `codigo X`, `costo N`, `venta N` (separadores).
- **Catálogo `origenes_destinos`:** CRUD (`GET|POST /api/dashboard/origenes-destinos`, PUT/DELETE en `/[id]`).
- **API:** `/remitos`, `/remitos/[id]`, `/remitos/[id]/confirmar`, `/remitos/[id]/items` (+ `/[itemId]`), `/voz/transcribir`.

### 6.9 Cobranzas (`/dashboard/cobranzas`) — grupo Fondos
- Movimientos unificados: `CARGO | PAGO | NOTA_CREDITO`, vinculados a cliente y opcionalmente a servicio (`servicio_id NULL` = pago a cuenta).
- Lista con filtros (`cliente_id`, `tipo`, rango de fechas) y resumen cargos/pagado/saldo.
- `recalcularEstadoPago(servicio_id)` recalcula `servicios.estado_pago` tras cada mutación (reutilizada en todas las rutas).
- **Imputar pago a cuenta:** `POST /cobranzas/[id]/imputar { servicio_id, monto }` — parcial (divide) o total (re-vincula).
- **Requisito (corrección):** incluir **edición (PUT)** de cobranzas; no exigir borrar y recrear para corregir un monto.
- **API:** `GET|POST /cobranzas`, `GET|PUT|DELETE /cobranzas/[id]`, `POST /cobranzas/[id]/imputar`.

### 6.10 Gastos (`/dashboard/gastos`) — grupo Fondos
- Control mensual con navegación prev/next por mes (`?mes=&anio=`).
- **Plantilla fija** (`gastos_plantilla`, CRUD con categoría/descripción/monto/orden/activo) → **inicializar mes** (`POST /gastos/inicializar`, idempotente: si ya hay gastos, no hace nada).
- Grilla agrupada por categoría (orden de plantilla). Gastos ad-hoc con datalist de categorías.
- **Pago total o parcial:** modal con `monto_real`, `fecha_pago`, `metodo_pago`, `tarjeta_id` (catálogo `tarjetas` con alta inline, normalización `toUpperCase`); pagos parciales en `gastos_pagos` → `recomputeGasto()` marca `PENDIENTE / PAGO PARCIAL / PAGADO`.
- **KPIs:** total estimado, total pagado, pendiente, cantidad sin pagar.
- **API:** `/gastos` (GET+POST), `/gastos/[id]` (PUT+DELETE), `/gastos/pagos` (POST) y `/gastos/pagos/[id]`, `/gastos/inicializar`, `/gastos/plantilla` (+ `/[id]`), `/gastos/tarjetas` (+ `/[id]`).

### 6.11 Noticias (`/dashboard/noticias`) — grupo Administración
- CRUD con `RichTextEditor` (TipTap, `next/dynamic ssr:false`), imágenes card/portada (`POST /api/dashboard/upload/imagen`, bucket `noticias-imagenes`), `video_url` (YouTube/Vimeo con preview por thumbnail), `fecha` editable, `orden`, `publicada`.
- **Publicación:** al pasar `publicada: false → true` → auto-post a Instagram (`lib/private/instagram.ts`) si hay `imagen_card` y env vars; si faltan, se omite el auto-post y se registra en el log.
- **API:** `/noticias` (GET+POST), `/noticias/[id]` (GET+PUT+DELETE), `/upload/imagen`.

### 6.12 Administración (`/dashboard/admin`) — solo Administrador
- **Usuarios:** CRUD; alta solo desde aquí (§5.2); solo admin cambia roles ajenos.
- **Roles:** crear/eliminar roles dinámicos (el `name` viaja en el JWT).
- **Permisos:** edición de `role_permissions` por rol × módulo (11 módulos).
- **Importar:** upload `.xlsx` (hojas `clientes` y `servicios`) → `POST /api/dashboard/importar/servicios`:
  - Lee el buffer en memoria (`xlsx.read`, sin archivo en disco).
  - Fase 1: mapa `Cod_Cliente_Excel → cliente_id` por `ilike` de `Razon_Social`.
  - Fase 2: upsert por `id` (preservar IDs originales requiere `id GENERATED BY DEFAULT` + `setval` post-import).
  - Pagos: borra cobranzas previas `concepto = 'Pago importado desde Excel'` (idempotente) e inserta `tipo PAGO`.
  - Respuesta `{ total, importados, sinCliente[], errores[] }`.

---

## 7. Panel Superadmin (`/superadmin`)

Gestión de empresas clientes del sistema POS (`mga-ptoventa`) — BD separada (`lib/private/supabase-master.ts`, variables `POS_SUPABASE_*`: `AGENTS.md` P-06).

| Página | Función |
|---|---|
| `/superadmin/login` | Login por contraseña → cookie de sesión (§5.4) |
| `/superadmin` | Redirect → `/superadmin/empresas` |
| `/superadmin/empresas` | Lista con plan, estado de implementación, módulos activos `N/total`, vencimiento |
| `/superadmin/empresas/nueva` | Alta con todos los módulos pre-seleccionados; inserta filas en `empresa_modulos` |
| `/superadmin/empresas/[id]` | Edición de datos + checkboxes de módulos (PUT separado solo si hubo cambios) |
| `/superadmin/modulos` | **CRUD del catálogo de módulos POS** (tabla `modulos`) — única fuente de verdad |

- **Sin NextAuth:** páginas cliente con fetch manual; `401 → router.push('/superadmin/login')`.
- **Alta de empresa:** inserta empresa + una fila por módulo del catálogo.
- **Edición de módulos:** upsert `onConflict: 'empresa_id,modulo'` (nunca DELETE; solo toggle `activo`); upsert crea filas faltantes.
- `updated_at` se setea manualmente (sin trigger).
- **API:** `/api/superadmin/auth` (POST+DELETE), `/api/superadmin/empresas` (GET+POST), `/api/superadmin/empresas/[id]` (GET+PUT), `/api/superadmin/empresas/[id]/modulos` (PUT), `/api/superadmin/modulos` (+ `/[id]`).
- **Decisión de diseño (corrección):** el catálogo de módulos vive en BD; prohibido hardcodear la lista en N archivos.

---

## 8. Integraciones externas

| Integración | Uso | Manejo de errores / cuota |
|---|---|---|
| **Groq Whisper** | Transcripción de remitos (español) | Reintentos con backoff; error → 502 con mensaje claro |
| **Groq GPT-OSS 20B** | Extracción de productos (voz) y de oportunidades (email) | TPD → abortar lote; TPM → espera ≤ 30 s, 1 reintento; delay 1.2 s; lotes ≤ 10-12; **jamás commitear la API key** |
| **Gmail IMAP (ImapFlow)** | Búsqueda de emails de oportunidades | App Password; timeouts; errores → mensaje accionable |
| **Resend** | Email de contacto público (y notificaciones internas si aplica) | Rate limit en el endpoint (`specs/publico.md` §9.2) |
| **Instagram Graph API v21.0** | Auto-post de noticias publicadas | Token de 60 días o System User permanente; sin env vars → skip + log |
| **Google Places** | Radar: textSearch/nearbySearch/placeDetails | Costo por llamada → cuota (`radar_api_usage`), cache de detalles, solo campos necesarios |
| **PageSpeed Insights / CrUX** | Radar: rendimiento del sitio | Solo sitios con web; no inferir tráfico sin CrUX |
| **Supabase Storage** | Logos, imágenes noticias, docs presupuestos, audio remitos | Ver §9 (políticas de bucket) |

---

## 9. Requisitos de seguridad (normativos — hallazgos QA convertidos en requisitos)

1. **Autenticación en toda API privada:** cada endpoint `/api/dashboard/*` verifica sesión **y** el permiso de módulo correspondiente a la acción (`can_view/can_create/can_edit/can_delete`). El middleware no es la única barrera.
2. **Sin registro abierto:** no existe registro público; el alta de usuarios es exclusiva de Administradores (`AGENTS.md` D-06).
3. **Superadmin:** cookie con token aleatorio firmado (nunca el secreto como valor), flags `HttpOnly + Secure + SameSite=Strict`, rate limit de login, sin secretos por defecto, cookie con `Max-Age` ≤ 24 h.
4. **Protección SSRF obligatoria** en cualquier fetch de URL de terceros (análisis web del Radar): bloquear `localhost`, `127.0.0.1`, rangos privados (10/8, 172.16/12, 192.168/16), link-local `169.254/16` y metadata de cloud (`169.254.169.254`); solo `http/https`; validar DNS e IP **antes** de conectar y **en cada redirect**; timeout y límite de tamaño de respuesta.
5. **Storage:** buckets `presupuestos-docs` y `remitos-audio` **privados**, con acceso mediante URLs firmadas de corta duración. Públicos (o también firmados) solo `clientes-logos` y `noticias-imagenes` (contenido no sensible). Nunca exponer documentos de clientes ni audio de dictados.
6. **Sanitización de HTML:** el contenido TipTap se sanitiza con allowlist al renderizar (`dangerouslySetInnerHTML` solo con HTML limpio). Retrocompatibilidad con plain text: detectar `/<[a-z]/i` y convertir `\n → <br />`.
7. **Validación e inyección en email:** el formulario de contacto pertenece a la zona pública (`specs/publico.md` §9.2: Zod + escape de HTML + rate limit). Todo email que genere esta zona aplica el mismo escape de HTML.
8. **Rate limiting:** obligatorio en el login del dashboard (por IP y por email), login superadmin, `/api/public/contact`, `/api/dashboard/voz/transcribir` (cuota Groq) y endpoints de extracción de oportunidades. El contador usa un almacén compartido (`AGENTS.md` P-02).
9. **Secretos:** nunca en el repo (ni en `.docx`, historial ni archivos ignorados); rotación ante exposición (GitHub secret scanning revoca keys de Groq); `.env.example` completo y canónico (`AUTH_SECRET`, no `NEXTAUTH_SECRET`).
10. **RLS como defensa en profundidad:** todas las tablas con RLS y políticas por `auth.uid()`/rol; el service role solo en server. Las tablas del Radar aíslan por `user_id` además del check de sesión.
11. **Auditoría mínima:** `remitos` conserva `usuario_id` y `confirmado_at`; se recomienda extender `created_by/updated_at` en entidades sensibles.
12. **Guarda explícita por ruta:** cada `route.ts` declara su guarda (sesión + permiso, o cookie superadmin); un test automático recorre todas las rutas de `app/api/**` y falla si alguna responde sin ella (`AGENTS.md` §5).
13. **Datos a proveedores de IA:** solo los campos mínimos necesarios (texto del email, audio del dictado); nunca credenciales ni datos de otros clientes.

---

## 10. Requisitos no funcionales

- **Consistencia de docs:** `AGENTS.md` + `specs/*.md` son la única fuente normativa (ya no existen `context/modulos/*.md`); `MAP.md` refleja el estado real; las tablas de permisos/sidebar/home/api se derivan de una constante compartida (`lib/private/modulos.ts`).
- **Migraciones versionadas** en `supabase/migrations/` (nada de ALTERs manuales sueltos como paso de "recuerda ejecutar en el editor SQL").
- **Rendimiento:** listados con paginación/filtros server-side cuando crezcan; fetch de listas grandes paginado (patrón `fetchAll*`).
- **Feedback UX:** errores de API en `<ErrorBox>` de modal; updates optimistas en grillas; sin flash de carga inicial en `*Client.tsx`.
- **Fechas:** columnas `date` se formatean con split (`[y,m,d]`) para evitar desfase UTC.
- **Dev:** webpack (no Turbopack) para evitar panics en rutas de login; build de producción sin cambios.
- **Mobile:** hooks `useIsMobile` para layouts adaptativos en grillas/modales.

---

## 11. Criterios de aceptación globales

1. Ninguna ruta `/dashboard/*` ni API `dashboard` responde sin sesión válida y permiso aplicado.
2. Los 11 módulos figuran de forma consistente en: seeds de permisos, sidebar, endpoint de permisos y home.
3. CRUD completo (incluida edición) en Clientes, Activos, Servicios, Presupuestos, Productos, Remitos, **Cobranzas**, Gastos, Noticias, Oportunidades (iteraciones), Radar y Admin.
4. Transiciones de estado automáticas verificadas: tareas→servicio, presupuesto→oportunidad, iteración→estado de oportunidad, remito→stock, pago→estado de cobro/servicio, pago parcial de gasto.
5. Voz de remitos: transcripción + matching con umbral 0.7 y panel de pendientes.
6. Radar: búsqueda con progreso persistido, deduplicación, 4 puntajes + final con motivos, filtros, detalle, conversión a cliente, aislamiento por usuario, cuota de uso y SSRF bloqueado (testeado).
7. Superadmin: sin secreto configurado no se puede entrar; cookie firmada con `Secure`; catálogo de módulos en BD.
8. Ningún documento de cliente ni audio es accesible públicamente por URL.
9. Migraciones SQL aplicables desde cero en una BD nueva (setup inicial reproducible).
10. Un test automático recorre todas las rutas `app/api/**` y confirma 401 sin sesión y 403 sin permiso, según corresponda.
11. Los tests de seguridad (SSRF, firma de cookie superadmin, buckets privados) corren en CI.

---

## Apéndice A — Correcciones aplicadas respecto del sistema de referencia

| # | Hallazgo QA (sistema de referencia) | Corrección en esta spec |
|---|---|---|
| 1 | CLAUDE.md ubicaba las páginas de servicios dentro de `app/(public)/`, pero están en la raíz de `app/`; `(public)` casi vacía | §3.1 — estructura unificada bajo `(public)` |
| 2 | Docs no mencionan el módulo **Radar** ni `/superadmin/modulos` pese a existir en código | §6.6 y §7 — incluidos y especificados |
| 3 | Env var `NEXTAUTH_SECRET` en docs vs `AUTH_SECRET` en `.env.example`/NextAuth v5; faltaban `GEMINI/CEREBRAS/GOOGLE_MAPS` | §2 — tabla canónica única |
| 4 | Secret del superadmin: docs decían default `mga-superadmin-2025`, código usaba `change-me-in-env` | §5.4 — sin default; login falla si falta |
| 5 | Cookie superadmin = la contraseña en claro y sin `Secure` | §5.4 — token firmado aleatorio + flags |
| 6 | Rutas de upload duplicadas/inconsistentes (`/api/upload/logo` vs `/api/dashboard/upload/…`) | §6 — se unifican bajo `/api/dashboard/upload/*` |
| 7 | Seeds de permisos listaban 7 módulos; el código maneja 11 | §5.3 — lista canónica de 11 + constante compartida |
| 8 | Cobranzas sin edición (solo DELETE) | §6.9 — PUT obligatorio |
| 9 | `/api/contact` sin Zod, sin rate limit y con input interpolado en HTML del email | §9.6-9.8 — validación, escape y rate limit |
| 10 | Analizador web del Radar sin protección SSRF (la spec original la exigía) | §9.4 — requisito obligatorio con checklist |
| 11 | Buckets `presupuestos-docs` y `remitos-audio` Public (datos sensibles expuestos) | §9.5 — privados + URLs firmadas |
| 12 | Registro abierto en `/auth/registro` | §5.2 / §9.2 — alta solo por admin o invitación |
| 13 | Gastos: soporte de pagos parciales (`gastos_pagos`, `monto_pagado`) no documentado | §6.10 — especificado |
| 14 | Rutas nuevas sin docs: `origenes-destinos`, `rubros`, `gastos/pagos` | §6.8, §6.10, §4.5 — incorporadas |
| 15 | Pendientes "manuales" (ALTERs en el editor SQL) mezclados con migraciones en repo | §10 — migraciones versionadas desde cero |
| 16 | Home del dashboard no mostraba tarjeta de Gastos pese a existir el módulo | §6.0 — home = sidebar exacto |
