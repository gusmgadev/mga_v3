# OBSOLETO — superseded by AGENTS.md (v3)

> **No usar como referencia.** Este archivo es el histórico de la versión anterior de la normativa (v2). La fuente de verdad vigente es `AGENTS.md`.

# MGA Informática — Plataforma web (zona pública + zona privada)

> Fuente de verdad funcional del proyecto: define QUÉ se construye y bajo qué reglas. El agente no escribe código que no esté descrito aquí o en las specs enlazadas.
> La documentación tiene tres piezas:
> - **`AGENTS.md`** (este archivo): reglas comunes, frontera público/privado, seguridad, calidad y proceso.
> - **`specs/publico.md`**: landing, SEO, noticias públicas, formulario de contacto.
> - **`specs/privado.md`**: dashboard operativo, Radar de Oportunidades, panel superadmin.

## Cómo leer esta documentación

| Tarea | Lee |
|---|---|
| Siempre, lo primero | `MAP.md` |
| Landing, SEO, noticias públicas, contacto | `AGENTS.md` + `specs/publico.md` |
| Dashboard, Radar, superadmin, login | `AGENTS.md` + `specs/privado.md` |
| Frontera entre zonas (noticias, clientes en landing, env, headers, auth) | `AGENTS.md` + ambas specs |

Precedencia ante conflicto: `AGENTS.md` > specs > skills > `docs/referencia/` (sistema anterior: solo consulta, no normativo; no lo cargues salvo que te lo pida).

## Rol del agente
Actúa como ingeniero de software senior. Sigue este documento, las specs y el plan de implementación sin replantearlos. No inventes requisitos: si algo es ambiguo, pregúntame antes de implementar.

## Descripción general
Reconstrucción desde cero de **mga-v2**, el sitio y sistema interno de MGA Informática (servicios IT: desarrollo web, sistemas de gestión Zoologic, consultoría y soporte). Tiene dos audiencias:

- **Visitantes y potenciales clientes** → sitio público de marketing con SEO fuerte, noticias y formulario de contacto.
- **Personal interno** → dashboard de gestión (clientes, servicios, presupuestos, stock, fondos, oportunidades), Radar de prospección comercial y panel superadmin del sistema POS.

Objetivo de la reconstrucción: un sistema **sólido, seguro, consistente y amigable**. Principios:
1. **Separación estricta** entre zona pública y privada (§1).
2. **Seguro por defecto**: lo no permitido explícitamente está denegado.
3. **Una sola fuente de verdad** por dato o lista (módulos, estados, permisos, env, tema).
4. **Verificable**: lo crítico tiene test automático, no solo prueba manual (§5).
5. **Reproducible**: la BD se levanta desde cero con migraciones + seed (§7).

---

## 1. Zonas y frontera público/privado

### 1.1 Zonas

| Zona | Rutas | Spec | Autenticación | UI | Acceso a datos |
|---|---|---|---|---|---|
| **Pública** | `/`, 4 servicios, 3 sistemas, `/noticias`, `/api/public/*` | `specs/publico.md` | Ninguna | Tailwind v4 + Framer Motion, `lib/public/theme.ts` | Supabase **anon** sobre la superficie pública (§1.3). Sin service role |
| **Acceso** | `/auth/signin`, `/api/auth/*` | `specs/privado.md` §5 | NextAuth v5 (Credentials + JWT) | Estilos de la zona privada | Anon solo para `signInWithPassword` en servidor |
| **Dashboard** (incluye Radar) | `/dashboard/*`, `/api/dashboard/*` | `specs/privado.md` | Sesión + permisos por módulo | Inline + `lib/private/theme.ts` | Service role solo en servidor |
| **Superadmin** | `/superadmin/*`, `/api/superadmin/*` | `specs/privado.md` §5.4 y §7 | Cookie propia firmada | Ídem dashboard | Cliente `supabase-master` (BD del POS) |

### 1.2 Reglas de separación (innegociables)

- **SEP-1 · Una app, tres fronteras.** Un repo y un deploy (D-01), pero cada zona vive en su route group (`(public)`, `(auth)`, `(dashboard)`, `(superadmin)`), su carpeta de `components/` y de `lib/`.
- **SEP-2 · Imports.** `public` no importa de `private`, `private` no importa de `public`, `shared` no importa de ninguna. Se hace cumplir con ESLint (`no-restricted-imports` por carpeta) y **rompe el CI**.
- **SEP-3 · `shared` es mínimo.** Solo utilidades puras (fechas, formateo, escape HTML, helper de rate limit), constantes de marca (`brand.ts`) y tipos. Sin lógica de negocio, sin acceso a datos, sin componentes con estilo de zona.
- **SEP-4 · La zona pública no tiene privilegios.** No usa service role, NextAuth ni `supabase-admin`. Lee solo la superficie pública (§1.3). Los módulos con secretos (`supabase-admin`, `supabase-master`, `superadmin-auth`, Groq, Instagram, IMAP) importan `server-only` para que el build falle si llegan al cliente.
- **SEP-5 · Assets y scripts por zona.** Tailwind y Framer Motion solo se importan en `app/(public)/layout.tsx`. `SessionProvider`/NextAuth solo en `(auth)` y `(dashboard)`. **GA4 solo en la zona pública** (nunca en pantallas con datos de clientes). El `app/layout.tsx` raíz es mínimo: `<html lang="es-AR">` y fuentes.
- **SEP-6 · APIs por familia.** `/api/public/*`, `/api/auth/*`, `/api/dashboard/*`, `/api/superadmin/*`. No existe otra. Cada ruta declara su guarda: pública = Zod + rate limit; dashboard = sesión + permiso de módulo; superadmin = cookie firmada validada.
- **SEP-7 · Indexación.** Las zonas privadas llevan `robots: noindex` en su layout **y** están bloqueadas en `robots.ts`. El sitemap solo incluye rutas públicas.
- **SEP-8 · Headers por zona.** Base global en producción (HTTPS forzado/HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors`). CSP propia: la pública permite solo GA4, Google Maps (iframe) y YouTube/Vimeo (video de noticias); la privada no permite terceros salvo Supabase. `Permissions-Policy`: micrófono `self` solo en el dashboard (voz de remitos), desactivado en la pública.
- **SEP-9 · Env por zona.** Cada variable tiene zona asignada (§9). Una secreta nunca lleva prefijo `NEXT_PUBLIC_`.
- **SEP-10 · Dueño de los datos.** El dashboard es dueño de las tablas; la landing solo consume la superficie pública. Un cambio en una tabla fuente que afecte esa superficie exige migración **y** actualizar `specs/publico.md`.

### 1.3 Superficie pública de datos (contrato público ↔ privado)

Es lo único que la zona pública puede leer de la BD.

| Superficie | Tabla fuente | Columnas permitidas | Filtro obligatorio | Consumidor |
|---|---|---|---|---|
| Noticias publicadas | `noticias` | `id, titulo, resumen, contenido, imagen_card, imagen_portada, video_url, fecha, created_at, orden` | `publicada = true` | `/noticias`, `/noticias/[id]`, sitemap |
| Clientes en landing | `clientes` | `id, nombre, rubro, imagen, pagina_web` (teléfono/dirección: ver P-04) | `mostrar_en_landing = true AND activo = true AND tipo <> 'PARTICULAR'` | Sección Clientes |

Implementación (la propone el agente y la documenta en la migración): preferido, **RLS con política `to anon` + `GRANT SELECT` por columna** sobre la tabla; alternativa, vista con `security_invoker`. En ambos casos:
- RLS habilitada en todas las tablas; `REVOKE` de `anon` y `authenticated` sobre el resto de las tablas base (sin política = sin acceso; el servidor usa service role).
- Buckets públicos (solo lectura): `noticias-imagenes` y `clientes-logos`. Todo lo demás, privado con URL firmada.
- **Test automático obligatorio** (§5): con la anon key, leer `clientes`, `servicios`, `users`, etc. falla; leer noticias no publicadas devuelve vacío; pedir una columna no permitida falla.

---

## 2. Stack tecnológico

| Capa | Decisión |
|---|---|
| Framework | Next.js 16.x App Router, React 19, TypeScript strict (sin `any` sin justificación). `params`/`searchParams` son `Promise` → siempre `await`. Protección de rutas en `proxy.ts` (no `middleware.ts`) |
| Datos | Supabase (PostgreSQL + Storage + Auth). Proyecto separado para la BD del POS (superadmin) |
| Autenticación | Pública: ninguna. Dashboard: NextAuth v5 (Credentials + JWT sobre Supabase Auth). Superadmin: cookie propia firmada |
| Validación | Zod 4 en formularios (react-hook-form + `zodResolver`) **y** en toda API |
| UI | Pública: Tailwind v4 + Framer Motion. Privada: estilos inline + `theme` (ver P-03). Íconos: Lucide |
| Integraciones | Resend · Groq (Whisper + GPT-OSS 20B, por HTTP) · Gmail IMAP · Instagram Graph API v21.0 · Google Places y PageSpeed · GA4 |
| Hosting | Vercel (producción + previews) + Supabase |
| Dev | `next dev --webpack` (Turbopack tuvo panics en rutas de login: reprobar al actualizar Next) |

**Librerías autorizadas** (lista cerrada; cualquier otra requiere mi autorización):
`next`, `react`, `react-dom`, `typescript`, `next-auth` (v5, versión exacta fijada), `@supabase/supabase-js`, `zod`, `react-hook-form`, `@hookform/resolvers`, `lucide-react`, `server-only`, `resend`, `imapflow`, `mailparser`, `xlsx` (ver P-10), `eslint` + `eslint-config-next`.
Solo zona pública: `tailwindcss`, `@tailwindcss/postcss`, `framer-motion`, `@next/third-parties`. Solo noticias del dashboard: `@tiptap/*`.

**Librerías propuestas** (⚠ NO instalar hasta que las pase a la lista anterior; ver P-01 y P-02): `vitest`, `@playwright/test`, `@axe-core/playwright`, `@lhci/cli`, `sanitize-html`, `supabase` (CLI, dev), `@upstash/ratelimit` + `@upstash/redis`.

---

## 3. Reglas innegociables
1. Lee siempre `MAP.md` antes de empezar; después, solo la spec de la zona que toca (ver "Cómo leer").
2. Declara la zona de cada tarea. No mezcles zonas en un cambio, salvo que toque la frontera (§1.3) y me lo avises.
3. Modularidad: lógica de negocio en `lib/<zona>/<dominio>/` (funciones puras y testeables); rutas API y componentes son finos. Separada de la interfaz y del acceso a datos.
4. No añadas librerías ni cambies el stack sin mi autorización.
5. Una sola fuente de verdad: listas de módulos, estados, permisos, env, catálogo POS y tema viven en una constante o en la BD, nunca copiadas en varios archivos.
6. Actualiza `MAP.md` después de cada cambio relevante.
7. Idioma: dominio de negocio en español (tablas, columnas, rutas, componentes de módulo); términos técnicos de infraestructura en inglés; comentarios y documentación en español; textos de interfaz en español rioplatense (es-AR).
8. **Verificación automática:** antes de avisarme, ejecuta lint, typecheck y los tests de lo que tocaste, y escribe tests junto con el código (§5). La validación funcional manual sigue siendo mía.
9. No me expliques nada: avísame cuando termines, con **una línea** del resultado de las verificaciones y qué debo probar.
10. Nada a medias: o la funcionalidad cumple la spec, o lo pendiente se registra en `fixes.md`. Sin enlaces muertos ni TODOs sueltos.
11. Ante conflicto entre este documento y una skill, manda este documento. Si una spec contradice a `AGENTS.md` en separación o seguridad, manda `AGENTS.md` y me lo avisas.

---

## 4. Seguridad
Base obligatoria en todas las fases y en ambas zonas. Lo específico de cada zona está en `specs/publico.md` §12 y `specs/privado.md` §9.

### Secretos y configuración
- Ninguna clave, contraseña ni token en el código ni en el repo. Todo en variables de entorno; `.env.example` completo (generado desde §9) y `.env*` en `.gitignore`.
- Sin valores por defecto inseguros: si falta una variable requerida, el endpoint falla con error claro, nunca autentica con un fallback.
- Claves con permisos totales (service role, `SUPERADMIN_SECRET`) solo en servidor. Activar GitHub secret scanning y push protection; rotar cualquier clave expuesta.

### Acceso y datos
- Autenticación y autorización **en el servidor**, nunca solo en la interfaz ni solo en el middleware.
- Mínimo privilegio: cada rol accede solo a lo que necesita; cada zona, solo a lo suyo (§1).
- Toda entrada se valida en servidor (tipo, longitud, formato) con Zod; consultas siempre parametrizadas.
- Todo contenido de usuario o de terceros se sanea antes de mostrarse (XSS). Todo input se escapa antes de interpolarse en HTML de email.
- Errores genéricos hacia el usuario; los logs no contienen datos personales ni secretos.

### Autenticación y endpoints públicos
- Rate limit y protección anti-bots en: login del dashboard, login superadmin, `/api/public/contact`, voz y extracción de oportunidades. El almacén del contador debe ser compartido, no memoria del proceso (P-02).
- Mensajes de autenticación genéricos (no revelar si la cuenta existe). Contraseñas de mínimo 12 caracteres.
- Sin registro público (D-06).

### Archivos
- Validar tipo real (no solo extensión) y tamaño; nombres generados por el sistema. Privados (`presupuestos-docs`, `remitos-audio`) con URL firmada de corta duración.
- **SVG no se acepta** como logo salvo que se sanee (puede ejecutar scripts).

### Aplicación
- Headers por zona (SEP-8). `npm audit` y revisión de los Security Advisors de Supabase antes de desplegar.
- SSRF bloqueado en cualquier fetch a URLs de terceros (Radar) — checklist en `specs/privado.md` §9.4.
- Nunca datos reales en desarrollo ni en pruebas (seed sintético).

### Datos personales (aplica)
- El sistema maneja datos de clientes (CUIT, email, teléfono, dirección), usuarios, prospectos comerciales (Radar), audios de dictado y contenido de emails que se procesa con un proveedor de IA.
- Marco: Ley 25.326 de Protección de Datos Personales (Argentina). Los textos legales (política de privacidad, consentimiento) los revisa un profesional; el sistema solo los muestra.
- Capacidades requeridas: exportar y eliminar los datos de una persona o empresa (cliente o prospecto), respetar `do_not_contact`, y una política de conservación de prospectos (P-09).
- A proveedores de IA se envía solo lo mínimo necesario.
- Copias de seguridad: documentar qué ofrece el plan de Supabase contratado, qué proceso propio hace falta, y **probar una restauración** antes del go-live.

---

## 5. Calidad y testing

El sistema anterior se probaba solo a mano. Ahora la prueba manual es la última capa, no la única.

| Capa | Herramienta | Qué cubre |
|---|---|---|
| Estática | `tsc --noEmit`, ESLint (con fronteras SEP-2), `npm audit` | Tipos, imports prohibidos entre zonas, dependencias |
| Unitaria | Vitest | Lógica pura de `lib/*`: scoring del Radar, deduplicación, normalización, guarda SSRF, sanitizador y escape HTML, `getModulePermisos`, transiciones de estado, totales/saldos, matching de voz (umbral 0.7), formateo de fechas sin desfase UTC, rate limit |
| Contrato/seguridad | Vitest + Supabase local | (a) **Inventario de rutas**: un test recorre todos los `app/api/**/route.ts` y verifica 401 sin sesión, 403 sin permiso, y que no existe ruta fuera de las 4 familias (SEP-6); (b) la anon key solo lee la superficie pública (§1.3); (c) buckets privados inaccesibles sin URL firmada; (d) superadmin sin secreto → rechazo; cookie con firma inválida → rechazo; (e) payload `<img onerror>` en contacto queda escapado; (f) SSRF bloquea rangos privados y redirects |
| E2E | Playwright | Login/logout y redirecciones; permisos por rol; cliente → servicio → tarea → pago; presupuesto aprobado → oportunidad ganada; remito confirmado → stock; publicar noticia → visible en `/noticias`; contacto (Resend mockeado); búsqueda Radar (Places mockeado) |
| Calidad pública | Lighthouse CI + axe | Mobile: performance ≥ 90, accesibilidad ≥ 90, SEO = 100; sin violaciones críticas de accesibilidad en público y en el home del dashboard |

Reglas:
- **Servicios externos siempre mockeados** en tests (Groq, Resend, Google, Instagram, IMAP). Cada integración vive detrás de una interfaz en `lib/<zona>/integraciones/`.
- **Datos de prueba sintéticos** (`supabase/seed.sql`); nunca datos reales.
- **Bug corregido = test de regresión.** Cada ítem cerrado de `fixes.md` referencia su test.
- **CI (GitHub Actions)** en cada PR: instalar, lint, typecheck, tests unitarios y de contrato, build, `npm audit --omit=dev` (falla con high/critical) y `scripts/check-env` (toda `process.env.X` usada está declarada en §9).
- **Definición de "fase terminada":** spec cumplida · tests nuevos y existentes pasan · lint + tipos + build OK · checklist de §4 revisado (dime qué puntos aplicaron) · migraciones aplican desde cero · `MAP.md` actualizado · pendientes en `fixes.md` · mensaje de commit propuesto.

---

## 6. Diseño y convenciones de código

### Proceso de diseño
- **Tokens por zona:** `lib/public/theme.ts` y `lib/private/theme.ts`, ambos derivados de `lib/shared/brand.ts` (logo, color primario, tipografía de marca). Los componentes nunca hardcodean colores, tipografías, radios ni textos de contacto.
- **Diseño antes que código** para pantallas nuevas no triviales: referencia en `design/<zona>/<modulo>/` (imagen, export de Figma o wireframe). Si no hay, propón un wireframe y espera mi OK antes de codificar. Listas y formularios estándar siguen el patrón existente sin esta etapa.
- **Estados completos:** toda vista define vacío, cargando, error y éxito. Mensajes en es-AR, claros y accionables. Confirmación en acciones destructivas.
- **Accesibilidad AA** en ambas zonas: foco visible, navegación por teclado, `alt` y labels, contraste, `prefers-reduced-motion`.
- **Responsive:** público mobile-first; dashboard usable en tablet y móvil.
- Si hay conflicto entre una imagen de diseño y este documento, manda este documento.

### Convenciones de código
- Componentes en PascalCase; los de módulo del dashboard siguen el patrón `page.tsx` (server) + `XxxClient.tsx` (client) de `specs/privado.md` §3.2.
- Tablas y columnas en `snake_case` español (convención final de nombres: P-05).
- Fechas `date` se formatean con split `[y, m, d]`, nunca con `new Date()` (desfase UTC).
- Reutiliza componentes. Evita duplicar código.

---

## 7. Desarrollo, entornos y fases

### Git y entornos
- Rama `main` protegida. Una rama por fase (`fase-N-nombre`); merge solo con CI verde. Commits convencionales (`feat:`, `fix:`…). El agente **propone** el commit; lo ejecuto yo.
- Tres entornos: **local** (Supabase local o proyecto dev), **staging** (preview de Vercel + proyecto Supabase de staging) y **producción**. Datos reales solo en producción.

### Migraciones
- Todo cambio de esquema es una migración nueva en `supabase/migrations/` (nunca editar una aplicada) y debes decirme cómo aplicarla. Cada migración incluye RLS y GRANTs.
- Prohibido el "ejecuta este ALTER en el editor SQL". El esquema completo se levanta desde cero con migraciones + `seed.sql`.

### Fases
Plan completo y subtareas en `plan-implementacion.md` (lo genera `/01-crear-plan` a partir de este documento). Se ejecuta fase por fase; cada una termina con la "definición de fase terminada" (§5).

| Fase | Zona | Contenido |
|---|---|---|
| 0 | Base | Repo, Next 16 + TS strict, ESLint con fronteras, Vitest/Playwright, CI, `.env.example` + `check-env`, Supabase local, headers base |
| 1 | Privada | Identidad (roles, users, permisos) + seed, NextAuth, `proxy.ts`, rate limit, shell del dashboard con `lib/private/modulos.ts`, administración de usuarios/roles/permisos, test de inventario de rutas |
| 2 | Privada | Clientes, Activos, Servicios + tareas, Presupuestos, Cobranzas (con edición) |
| 3 | Privada | Oportunidades (IMAP + Groq) |
| 4 | Privada | Productos, Remitos, ingreso por voz |
| 5 | Privada | Gastos |
| 6 | Privada | Radar (SSRF, cuota, scoring, conversión) |
| 7 | Privada | Noticias (+ Instagram), Importar |
| 8 | Privada | Superadmin (empresas, catálogo de módulos POS) |
| P1 | Pública | Layout, tema, Home (10 secciones), páginas de servicios y sistemas. Paralelizable desde la Fase 1 |
| P2 | Pública | Noticias públicas, clientes (superficie pública), contacto, SEO. Usa seeds si las Fases 2 y 7 no están |
| F | Ambas | Endurecimiento y go-live: `/auditoria`, Lighthouse CI, backups probados, rotación de secretos, sitemap en Search Console |

---

## 8. Estructura de archivos del proyecto

```
AGENTS.md  plan-implementacion.md  MAP.md  fixes.md
specs/{publico,privado}.md
docs/referencia/MAP_old.md          # sistema anterior; solo consulta
design/{shared,public,private}/
.agents/skills/  .opencode/commands/  prompts/
.github/workflows/ci.yml
app/
├── layout.tsx                      # mínimo: html lang="es-AR", fuentes
├── sitemap.ts  robots.ts  not-found.tsx
├── (public)/                       # layout.tsx (Tailwind, GA4, WhatsApp) + páginas públicas
├── (auth)/auth/signin/
├── (dashboard)/dashboard/…         # módulos + admin/ + radar/
├── (superadmin)/superadmin/{login,empresas,modulos}/
└── api/{public,auth,dashboard,superadmin}/
proxy.ts  next.config.ts  .env.example
components/{public,private,shared}/
lib/{public,private,shared}/        # private: auth, permisos, modulos, supabase-admin/master, radar/…
types/
supabase/{migrations,seed.sql}
tests/{unit,contract,e2e}/
scripts/                            # check-env y utilidades puntuales
```

---

## 9. Variables de entorno (canónica)
Zonas: **P** pública · **A** acceso · **D** dashboard · **S** superadmin. `.env.example` se genera desde esta tabla.

| Variable | Zonas | Secreta | Nota |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | P, A, D | no | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | P, A | no | Expuesta por diseño; protegida por RLS + GRANT por columna (§1.3) |
| `SUPABASE_SERVICE_ROLE_KEY` | D | sí | Solo en `lib/private/supabase-admin.ts` (`server-only`). Nunca en la zona pública |
| `POS_SUPABASE_URL`, `POS_SUPABASE_SERVICE_ROLE_KEY` | S | sí | BD del POS. Nombres a confirmar (P-06) |
| `AUTH_SECRET` | A, D | sí | Canónica. No usar `NEXTAUTH_SECRET` |
| `APP_URL` | todas | no | URL base (canonical, sitemap, enlaces). Si Auth.js requiere `AUTH_URL`, verificarlo en su doc |
| `SUPERADMIN_SECRET` | S | sí | Sin valor por defecto; sin él, el login se rechaza |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | P | sí / no | |
| `NEXT_PUBLIC_GA_ID` | P | no | Se embebe en build; si falta, GA4 no carga |
| `GROQ_API_KEY` | D | sí | |
| `GMAIL_IMAP_USER`, `GMAIL_IMAP_PASSWORD` | D | sí | App Password de Google |
| `INSTAGRAM_USER_ID`, `INSTAGRAM_ACCESS_TOKEN` | D | sí | Opcional |
| `GOOGLE_MAPS_API_KEY` | D | sí | Radar (Places), solo servidor, restringida por API |
| `GOOGLE_PAGESPEED_API_KEY` | D | sí | Radar |

`GEMINI_API_KEY` y `CEREBRAS_API_KEY` no se declaran hasta que exista una spec que las use (D-08).

---

## 10. Funcionalidades de la aplicación
Las funcionalidades viven en `specs/publico.md` y `specs/privado.md`. Para añadir una nueva, agrégala a la spec de su zona con esta plantilla y usa `/nueva-funcionalidad`:

```
### Funcionalidad: [Nombre]
#### Objetivo      — qué problema resuelve
#### Entradas      — campos
#### Salidas       — resultado esperado
#### Reglas        — restricciones y validaciones
#### Comportamiento — pasos
#### Seguridad y tests — guarda de la ruta, permiso de módulo, tests que la cubren
```

---

## 11. Decisiones y pendientes

### Decisiones tomadas (cámbialas diciéndomelo)
| ID | Decisión |
|---|---|
| D-01 | Una app, un repo, un deploy, con fronteras impuestas por route groups, carpetas, lint y tests. Alternativa (dos apps/deploys): más aislamiento, más costo de mantenimiento; reevaluar si el sistema crece |
| D-02 | La zona pública no usa service role: lee con anon sobre la superficie pública (§1.3) |
| D-03 | Contenido de páginas de servicios y sistemas: estático y tipado en `lib/public/content/`, sin CMS |
| D-04 | Los pagos de un servicio son filas de `cobranzas` tipo `PAGO`; no existe `servicio_pagos` |
| D-05 | Los permisos se resuelven en servidor y se pasan por props; no hay hook `usePermissions` |
| D-06 | Sin registro público: el alta de usuarios es solo de un Administrador. No existen `/auth/registro` ni `/api/auth/registro` |
| D-07 | Catálogos únicos: módulos del dashboard en `lib/private/modulos.ts`; módulos del POS en la tabla `modulos` |
| D-08 | `GEMINI_API_KEY` y `CEREBRAS_API_KEY` quedan fuera hasta que haya spec que las use |
| D-09 | La regla del kit "no ejecutes pruebas" se reemplaza por verificación automática obligatoria (regla 8) |

### Pendientes que necesito que resuelvas
| ID | Tema | Recomendación | Bloquea |
|---|---|---|---|
| P-01 | Aprobar librerías propuestas (§2) | Aprobar `vitest`, `@playwright/test`, `@axe-core/playwright`, `@lhci/cli`, `sanitize-html`, `supabase` CLI | Fase 0 |
| P-02 | Almacén del rate limit | Upstash Redis: en Vercel serverless la memoria no se comparte. Alternativa: tabla en Postgres | Fase 1 |
| P-03 | Estilos del dashboard | Hoy: inline + `theme` (heredado). Limita `:hover`, `:focus-visible` y media queries sin JS. Alternativa: Tailwind con tokens propios, aislado por route group | Fase 1 |
| P-04 | Datos de clientes en landing | Publicar solo nombre, rubro, logo y web. Teléfono y dirección solo con consentimiento explícito y nunca de clientes `PARTICULAR` | P2 |
| P-05 | Nombres en BD | Las tablas del Radar están en inglés y el resto en español. Unificar | Fase 1 |
| P-06 | Env de la BD del POS | Las specs no nombran las variables del cliente `supabase-master`. Confirmar `POS_SUPABASE_*` | Fase 8 |
| P-07 | Administrador por nombre de rol | `role === 'Administrador'` se rompe si renombran el rol. Usar un flag `is_admin` | Fase 1 |
| P-08 | MFA | TOTP (Supabase Auth MFA) para Administradores; el superadmin hoy es un único secreto compartido | Fase 1 / 8 |
| P-09 | Legal y proveedores | Revisión profesional (Ley 25.326); verificar los términos de Google Places sobre almacenar datos de lugares; plazo de conservación de prospectos | Fase 6 |
| P-10 | Dependencias frágiles | NextAuth v5 sigue en beta (fijar versión exacta). El paquete `xlsx` de npm está desactualizado y con avisos conocidos: usar el build oficial de SheetJS o una alternativa | Fase 0 / 7 |

---

## 12. Otras consideraciones
- Los errores y mejoras que detecte al probar estarán en `fixes.md`.
- Antes de dar por terminada una fase que toque datos, permisos, archivos o autenticación, revisa §4 y dime qué puntos aplican.
- Usa las skills de `.agents/skills/` que apliquen a cada tarea y dime cuáles usaste.
- `docs/referencia/MAP_old.md` describe el sistema anterior solo como contexto histórico. El `MAP.md` nuevo se genera desde cero a medida que avanzan las fases.
