# Plan de implementación: MGA Informática — plataforma web v3

> Fuente de verdad: `AGENTS.md` (reglas, seguridad, §10.1) + `especificacion.md` (funcionalidad). Orden definido por el dueño: **Administración → Altas → Servicios → Fondos → Zoologic → Prospectos → Inventario → LandingPage → Superadmin → Landing pública → Seguridad y despliegue**. (El superadmin se fusionó en el dashboard — D-15/16/17 — y su contenido entra como Fase 9 bajo `/dashboard/admin/*`.)
> Después de cada fase: probar, anotar errores en `fixes.md`, cerrar con lint + typecheck + tests + build (§5), actualizar `MAP.md` y proponer commit (lo ejecuta el dueño). Al avisar al dueño, indicar qué puntos de §4 aplicaron.
> Cada sub-tarea se marca `[x]` al completarse. Un chat por fase.
> Skills: `seguridad-web` en toda fase que toque datos, permisos, auth o uploads; `fechas-y-zonas-horarias` donde se manejen fechas (mínimo Fases 4, 5 y 8).
> **Revisión:** plan generado y revisado en una sola pasada; mejoras aplicadas (ver "Optimizaciones propuestas").

## Optimizaciones propuestas (confirmar antes de empezar)

1. **Superadmin como Fase 9** (después de LandingPage, antes de la landing pública): tu orden no lo menciona; es necesario por AGENTS §7 y por P-06/P-08. Si preferís otra posición, decime. **Actualización (D-15/16/17):** el superadmin se fusionó en el dashboard (submódulos Empresas y Módulos POS de Administración, APIs `/api/superadmin/*` con sesión + permiso); P-06 quedó resuelta (una sola BD) y P-08 no aplica a un panel sin login propio.
2. **Superficie pública de datos en las fases del dashboard:** la política de datos para la landing (noticias publicadas, clientes `mostrar_en_landing`) se fija en Fase 2 y Fase 8, no en P2, para tocar la frontera una sola vez (SEP-10).
3. **Integraciones siempre tras una interfaz + mock** (Groq, IMAP, Places, PageSpeed, Instagram, Resend): los tests nunca dependen de servicios reales (§5).
4. **Cada fase lista sus bloqueantes P-xx:** no se arranca sin resolverlos.
5. **Fase 0 arranca tras P-01 (aprobar librerías) y P-10 (fijar versión de NextAuth v5).**
6. **P1 (landing pública) es paralelizable desde la Fase 1:** no depende del dashboard salvo por los seeds de datos (P2 usa seeds si Fases 2 y 8 no están).

---

## FASE 0: Base — repo, stack, CI [zona: base]

**Bloqueantes:** ~~P-01~~ y ~~P-10~~ resueltos. **Completada** (commit `3264e01`).

- [x] Aprobar librerías propuestas (P-01) y fijar versión exacta de `next-auth` v5 (P-10) — `next-auth@5.0.0-beta.32`; `@hookform/resolvers@5.9.2` por conflicto de peers de la 6.x
- [x] `.gitignore` (con `.env*` + `!.env.example`) **antes** de `git init`; `git init`; primer commit
- [x] Next 16.4.2 + React 19.3 + TypeScript strict; `params`/`searchParams` como `Promise`
- [x] ESLint con fronteras `no-restricted-imports` por zona (SEP-2)
- [x] `proxy.ts` de protecciones (no `middleware.ts`) — esqueleto con matcher; lógica en Fase 1
- [x] Instalar solo dependencias autorizadas (§2) — incluye `@tailwindcss/postcss` para el dev con webpack y `@types/node@^24` (requisito de vitest 5)
- [x] Vitest + Playwright (+ `@axe-core/playwright`); estructura `tests/{unit,contract,e2e}`; smoke unitario verde
- [x] `.env.example` completo desde §9 + script `scripts/check-env` (el rate limit no usa env: almacén en Postgres, P-02 decisión B)
- [x] Supabase local (CLI init) + esqueleto `supabase/migrations/` + `seed.sql` sintético
- [x] Headers base de producción en `next.config.ts` (SEP-8: nosniff, Referrer-Policy, `frame-ancestors`, HSTS; CSP por zona queda para Fases P1/1)
- [x] `app/layout.tsx` mínimo (`lang="es-AR"`) + página de prueba que compila
- [x] CI GitHub Actions: install, lint, typecheck, unit, build, `npm audit --omit=dev`, check-env
- [x] Decidir entorno de test de la BD del POS (M-11): resuelto por D-17 — **una sola BD**; sin `supabase-master` ni segunda instancia
- [x] Crear `MAP.md` real
- **Seguridad:** `.gitignore` con `.env*`; `.env.example` sin valores; `.env.local` ignorado y verificado (`git check-ignore`); ningún default inseguro; check-env en CI.
- **Cierre:** `lint ✓ · tsc ✓ · vitest ✓ · check-env ✓ · build ✓ · audit 0 vulns ✓ · dev --webpack HTTP 200 ✓` → MAP + commit `3264e01`.

## FASE 1: Administración — identidad, usuarios, roles, permisos, shell [zona privada]

**Bloqueantes:** P-02, P-05, P-07, P-11, P-13, P-14. **Exigible al cierre:** P-08 (MFA TOTP para Administradores, flujo contra Credentials de NextAuth v5).

- [x] Migración de identidad: `roles` (con `is_admin`, P-07), `users`, `role_permissions` por nodos (clave `ruta` + acciones, P-14); RLS + GRANTs; seed — hoy vive como `supabase/migrations/000001_identidad_normalizada.sql` (aplicada en el proyecto remoto; baseline `000000` = esquema de mgaServiciosBD)
- [x] RPC de la migración: `EXECUTE` revocado a `PUBLIC`/`anon` (salvo las públicas por diseño) y `SECURITY DEFINER` con `search_path` fijo (§4) — sin RPCs en esta migración; la regla aplica a las migraciones que las agreguen
- [x] P-05: unificar nombres de tablas (Radar en español) en migración/seed y en la futura spec — spec `specs/privado.md` §4.5 unificada; las tablas del Radar se crean en Fase 6 con esos nombres
- [x] `lib/private/modulos.ts`: árbol canónico de 8 módulos del §10.1 (D-11)
- [x] Resolución de permisos por niveles con herencia simple (D-12), server-only, con `is_admin` → `administracion.*` + `landing_page.*`; tests unitarios de herencia
- [x] NextAuth v5 Credentials + JWT sobre Supabase Auth (`signInWithPassword` con anon en servidor); `AUTH_SECRET`
- [x] Flujo de credenciales P-13: entrega de contraseña inicial (invite o clave temporal forzada a cambio) + reset "olvidé mi contraseña"
- [x] `proxy.ts`: `/dashboard/*` sin sesión → signin; forzar cambio de clave; `/dashboard/admin/*` sin gate is_admin (permiso por vista, D-15/D-16); signin con sesión → dashboard
- [x] Rate limit de login (P-02 decisión B: almacén en Postgres, tabla `rate_limit_contadores` + RPC `rate_limit_consumir` con SHA-256) por IP y por email; error genérico; mínimo 12 caracteres
- [x] Setup Tailwind v4 con tokens propios por route group desde `lib/private/theme.ts` (D-10/P-11; patrón definido en `specs/privado.md`)
- [x] Shell del dashboard: home con tarjetas y saludo, sidebar y rutas derivadas de `modulos.ts`
- [x] Usuarios: CRUD, alta solo por Administrador, solo admin cambia rol ajeno, nadie el propio
- [x] Roles: crear/eliminar; Permisos: matriz UI + API sobre nodos del árbol
- [x] Tests: inventario de rutas `app/api/**` (401/403 por familia, SEP-6), fixtures con permisos parciales por nivel, herencia, rate limit de login, MFA — 35 tests (unit + contract) verdes; E2E de login/permisos pendientes de BD (fixes.md)
- **Seguridad:** §4 autenticación (mensajes genéricos, servidor siempre), cookies `HttpOnly+Secure+SameSite`, rate limit, mínimo privilegio; puntos aplicados: secretos, acceso, datos, cookies, endpoints.
- **Cierre:** verificación completa §5 + MAP + fixes + commit.

## FASE 2: Altas — Clientes, Activos [zona privada]

- [ ] Migraciones `clientes`, `activos` (+ índices, RLS, GRANTs)
- [ ] Clientes: lista, crear, editar, eliminar, alta rápida reutilizable desde otros módulos
- [ ] Upload de logo (JPG/PNG/WEBP, máx. 5 MB, **SVG prohibido**, nombre generado, validación de tipo real); bucket `clientes-logos` público de solo lectura
- [ ] Flag `mostrar_en_landing`
- [ ] Activos: lista filtrable por cliente, CRUD, alta rápida (requiere cliente)
- [ ] Superficie pública de clientes (§1.3): RLS `to anon` + `GRANT SELECT` por columnas; test: anon falla en tablas privadas y en columnas no permitidas
- [ ] Tests unitarios de validación Zod de ambos módulos
- **Seguridad:** uploads (tipo/tamaño/nombre), RLS mínimo privilegio, superficie pública mínima.
- **Cierre:** verificación §5 + MAP + fixes + commit.

## FASE 3: Servicios — Servicios, Presupuestos [zona privada]

- [ ] Migraciones `servicios`, `servicio_tareas`, `presupuestos`, `presupuesto_items` (sin `valor`: total = Σ ítems)
- [ ] Servicios: CRUD, estados de servicio y de pago, detalle
- [ ] Tareas por servicio: CRUD; reglas auto-terminación (todas terminadas → TERMINADO) y auto-reinicio (tarea nueva a TERMINADO → EN PROCESO) con tests de transición
- [ ] Pagos: registro desde Cobranzas con `servicio_id` (D-04); saldo calculado; pago rápido desde grilla
- [ ] Presupuestos: CRUD con ítems, total calculado, `fecha` editable, adjunto PDF/DOC
- [ ] Upload de documento: bucket `presupuestos-docs` **privado** + URL firmada de corta duración
- [ ] Gancho de vínculos `servicio_id` / oportunidad (la transición automática se conecta en Fase 5)
- [ ] Generar servicio desde presupuesto aprobado (sin servicio asociado)
- [ ] Tests: totales, transiciones, validación de uploads
- **Seguridad:** buckets privados + URLs firmadas, validación de archivos.
- **Cierre:** verificación §5 + MAP + fixes + commit.

## FASE 4: Fondos — Gastos, Cobranzas [zona privada]

- [ ] Migraciones `gastos_plantilla`, `gastos`, `gastos_pagos`, `tarjetas`, `cobranzas`
- [ ] Gastos: navegación por mes, plantilla CRUD, inicializar mes idempotente, grilla agrupada por categoría, alta ad-hoc
- [ ] Pagos totales/parciales con método y tarjeta (alta inline); estados PENDIENTE/PAGO PARCIAL/PAGADO recalculados; KPIs del mes
- [ ] Cobranzas: CRUD **con edición (PUT)**, filtros, resumen cargos/pagado/saldo, tipos CARGO/PAGO/NOTA_CREDITO
- [ ] Imputar pago a cuenta a un servicio (parcial o total); recalcular estado de pago del servicio tras cada mutación
- [ ] Fechas `date` con split `[y,m,d]` (sin desfase UTC) — skill `fechas-y-zonas-horarias`
- [ ] Tests: recompute de estados, imputación parcial/total, totales
- **Seguridad:** autorización en servidor por acción; logs sin datos sensibles.
- **Cierre:** verificación §5 + MAP + fixes + commit.

## FASE 5: Zoologic — Oportunidades [zona privada]

- [ ] Migraciones `oportunidades`, `oportunidad_iteraciones`
- [ ] Interfaz `lib/private/integraciones/` para IMAP y Groq (implementación real + mock para tests)
- [ ] Búsqueda de emails (Gmail IMAP) y selección con tipo (OP_NUEVA / SEGUIMIENTO / CROSS_SELLING)
- [ ] Extracción asistida por IA en modo JSON; deduplicación por `email_message_id`; manejo de límites de cupo (abortar/espera/reintento); lotes pequeños
- [ ] Lista y detalle del pipeline (estados NUEVA → … → GANADA/NO_GANADA/NO_OP; filtro de activas)
- [ ] Iteraciones de contacto (CRUD) + botón WhatsApp con transiciones automáticas
- [ ] Generar presupuesto desde oportunidad (conecta con Fase 3: la oportunidad queda PRESUPUESTADA; aprobar/rechazar presupuesto cierra la oportunidad)
- [ ] Rate limit en `/buscar-emails` y `/extraer`; escape de HTML en cualquier email generado
- [ ] Tests: dedup, transiciones, manejo de cupo, endpoints con IMAP/Groq mockeados
- **Seguridad:** rate limit, IA recibe solo lo mínimo, sin secretos en cliente, cookies/sesión en API.
- **Cierre:** verificación §5 + MAP + fixes + commit.

## FASE 6: Prospectos — Radar, Prospectos [zona privada]

**Bloqueantes:** P-09, P-17.

- [ ] Migraciones del Radar (búsquedas, prospectos, resultados, análisis web, interacciones, trabajos en cola, uso de API, servicios objetivo, rubros) con nombres en español (P-05) y aislamiento por usuario
- [ ] Configuración de servicios objetivo (rubros/keywords), accesible desde Radar (P-17)
- [ ] Nueva búsqueda (ubicación, rubro/keywords, filtros) con progreso persistido y cuota de uso
- [ ] Consulta a Google Places + normalización + deduplicación en cascada
- [ ] Scoring: 4 puntajes + final con niveles y `opportunity_reasons` guardados; nunca número sin explicación
- [ ] Análisis web opcional (contactos, redes, tecnologías, rendimiento) con **guarda SSRF** (bloqueo de rangos privados y metadata, validación en cada redirect, timeout y tamaño máximo) + tests de la guarda
- [ ] Pipeline comercial de prospectos y **marcar un resultado como "Prospecto"** (P-17: estado/flag y transición) → lista de trabajo Prospectos con contacto e historial de iteraciones
- [ ] Conversión a cliente (y opcionalmente servicio o presupuesto); exclusiones `no contactar`
- [ ] Tests: scoring, dedup, SSRF, cuota, aislamiento por usuario, flujo completo con Places mockeado
- **Seguridad:** SSRF, rate limit/cuota, mínimo privilegio por usuario, sin datos reales en tests.
- **Cierre:** verificación §5 + MAP + fixes + commit.

## FASE 7: Inventario — Productos, Remitos, Proveedores [zona privada]

**Bloqueantes:** P-16.

- [ ] Migraciones `productos`, `marcas`, `rubros_productos`, `remitos`, `remito_items`, `movimientos_stock`, `origenes_destinos`, `proveedores` (campos según P-16)
- [ ] Productos: CRUD; `stock_actual` solo se modifica al confirmar remitos; alta inline de marcas/rubros
- [ ] Remitos: CRUD, ítems con producto o nombre detectado, estados borrador/confirmado/anulado
- [ ] Confirmar remito → movimientos de stock (entrada/salida/ajuste) + snapshot de stock antes/después; anular revierte; tests de stock
- [ ] Ingreso por voz: grabación en cliente, transcripción (Whisper) + extracción de productos (GPT) tras interfaz mockeable; matching en cascada con umbral 0.7 y panel de pendientes
- [ ] Audio en bucket `remitos-audio` **privado** con URL firmada; rate limit del endpoint de voz (cuota IA)
- [ ] Proveedores: CRUD; los remitos de entrada pueden referenciar un proveedor; el catálogo de orígenes/destinos queda para sucursal/depósito/cliente/otro (P-16)
- [ ] Auditoría: remito conserva usuario y momento de confirmación
- **Seguridad:** buckets privados, rate limit de voz, SSRF no aplica pero sí validación de archivos.
- **Cierre:** verificación §5 + MAP + fixes + commit.

## FASE 8: LandingPage — Noticias (edición desde el dashboard) [zona privada]

- [ ] Migración `noticias`
- [ ] CRUD con editor enriquecido (TipTap solo en esta zona); sanitizador de HTML con allowlist como utilidad compartida (`lib/shared`, P-01)
- [ ] Imágenes de tarjeta y portada: bucket `noticias-imagenes` público de solo lectura; validación de tipo/tamaño
- [ ] Campos: título, resumen, contenido, video (YouTube/Vimeo), fecha, orden, publicada
- [ ] Superficie pública de noticias (§1.3): RLS `to anon` + `GRANT` por columnas, filtro `publicada = true`; test con anon key
- [ ] Auto-post opcional a Instagram al publicar (interfaz mockeable; sin configuración → se omite y se loguea)
- [ ] Tests: sanitizado (payload `<img onerror>`), superficie pública, estados
- **Seguridad:** sanitización de HTML (XSS), uploads, superficie pública mínima.
- **Cierre:** verificación §5 + MAP + fixes + commit.

## FASE 9: Panel POS de empresas — Empresas y catálogo POS [zona privada; superadmin fusionado D-15]

**Bloqueantes:** ~~P-06~~ (resuelta por D-17), P-08 no aplica (sin login propio). **Código adelantado durante el trabajo de migración de la BD** (ver MAP): pantallas y APIs implementadas; queda cierre formal.

- [x] Nodos `administracion.empresas` y `administracion.modulos_pos` en `lib/private/modulos.ts` (empresas sin eliminar físico: baja lógica)
- [x] Rol `Superadmin` (D-16, no `is_admin`) con los dos nodos concedidos — seed en migración `000001`
- [x] Pantallas `/dashboard/admin/empresas` y `/dashboard/admin/modulos-pos` (server + `EmpresasClient` / `ModulosPosClient`)
- [x] APIs `/api/superadmin/{empresas,modulos}` con `requierePermisoApi` (sesión + nodo); service key write-only (`tiene_service_key`)
- [x] Alta de empresa inserta filas en `empresa_modulos`; edición de módulos upsert `onConflict`
- [x] Tests: inventario de rutas cubre superadmin (401/403/parciales); unit de modulos cubre los nodos
- [ ] Verificación manual: alta/edición de empresa y CRUD de catálogo con rol Superadmin
- **Seguridad:** mínimo privilegio (permisos por nodo, no is_admin), credenciales write-only, RLS/service role en servidor.
- **Cierre:** verificación §5 + MAP + fixes + commit.

## FASE P1: Landing pública — layout, home, servicios y sistemas [zona pública]

- [ ] Route group `(public)` con layout propio: Tailwind v4 + Framer Motion solo aquí; tema desde `lib/public/theme.ts` derivado de `lib/shared/brand.ts`; `theme.site.url` desde `APP_URL`
- [ ] GA4 solo en esta zona (si falta `NEXT_PUBLIC_GA_ID`, no carga); botón de WhatsApp
- [ ] Home con las 10 secciones (banner, navbar, hero, servicios, método, Zoologic, clientes, contacto, footer, JSON-LD)
- [ ] Páginas de los 4 servicios y los 3 sistemas con contenido estático tipado (D-03) y metadata/OG propios
- [ ] Estados completos (vacío/cargando/error), accesibilidad AA, `prefers-reduced-motion`, mobile-first
- [ ] CSP y `Permissions-Policy` de la zona pública (SEP-8); mapa del footer con iframe permitido y lazy
- [ ] Tests E2E básicos de navegación + axe en home
- **Seguridad:** sin privilegios (SEP-4), sin secretos, headers por zona.
- **Cierre:** verificación §5 + MAP + fixes + commit.

## FASE P2: Público — noticias, clientes de landing, contacto, SEO [zona pública]

**Bloqueantes:** P-04, P-12.

- [ ] `/noticias` y `/noticias/[id]` desde la superficie pública; HTML sanitizado con el sanitizador compartido; video desde `video_url` contra allowlist de hosts; 404 para no publicadas
- [ ] Sección de clientes desde la superficie pública; P-04: teléfono/dirección solo con consentimiento explícito y nunca de `PARTICULAR`
- [ ] Formulario de contacto: validación en cliente y servidor, escape de todo input, honeypot, rate limit por IP, envío por Resend (mock en tests), errores genéricos
- [ ] `sitemap.ts` (solo públicas), `robots.ts` (bloquea privadas y API), metadata canónica/OG/Twitter por página
- [ ] P-12: los buckets de la superficie pública quedan alineados con §1.3 (solo lectura pública) y se actualiza la spec
- [ ] Tests: anon solo lee superficie pública; contacto con payload malicioso escapado; robots/sitemap
- **Seguridad:** superficie pública mínima, rate limit, escape/XSS, sin datos privados.
- **Cierre:** verificación §5 + MAP + fixes + commit.

## FASE F: Seguridad y despliegue (go-live) [ambas zonas]

- [ ] Auditoría completa con prompt 07 (`/auditoria`)
- [ ] Pantalla y APIs de `/auditoria` (nodo `administracion.auditoria`, APIs bajo `dashboard`)
- [ ] Lighthouse CI + axe (mobile: performance ≥ 90, accesibilidad ≥ 90, SEO = 100; home del dashboard sin violaciones críticas)
- [ ] Copias de seguridad: documentar qué ofrece el plan de Supabase, proceso propio si hace falta y **probar una restauración**
- [ ] Rotación de secretos; secret scanning y push protection de GitHub activos
- [ ] Herramienta de exportación y borrado de datos personales (Ley 25.326)
- [ ] `npm audit --omit=dev` sin high/critical; revisar Security Advisors de Supabase; headers de producción verificados
- [ ] Desplegar (Vercel): variables de entorno por zona (§9), previews, dominio `APP_URL`
- [ ] Registrar sitemap en Google Search Console
- [ ] Prueba manual completa del flujo principal en producción (login → cliente → servicio → presupuesto → cobranza; oportunidad; radar → prospecto → conversión; remito con voz; publicar noticia → visible en la landing; contacto → email)
- [ ] Actualizar `fixes.md` y `MAP.md`; cierre final
- **Seguridad (checklist §4 completa):** secretos, acceso y autorización en servidor, validación, XSS/sanitizado, uploads, headers, rate limits, datos personales, backups.
- **Cierre:** todos los puntos de "fase terminada" de §5 + commit final propuesto.
