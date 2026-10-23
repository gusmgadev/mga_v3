# MGA Informática — Plataforma web (zona pública + zona privada)

> Fuente de verdad funcional del proyecto: define QUÉ se construye y bajo qué reglas. El agente no escribe código que no esté descrito aquí o en la documentación enlazada.
> La documentación tiene cuatro piezas:
> - **`AGENTS.md`** (este archivo): reglas comunes, frontera público/privado, seguridad, calidad y proceso.
> - **`especificacion.md`**: funcionalidad — para qué sirve cada módulo y submódulo y qué operaciones tiene. Solo funcional, nada técnico.
> - **`specs/publico.md`**: landing, SEO, noticias públicas, formulario de contacto.
> - **`specs/privado.md`**: dashboard operativo, Radar de prospectos, panel superadmin.
> **Mantenimiento:** un cambio que altere operaciones, estados o la estructura de módulos debe reflejarse en `especificacion.md` (además de en la spec técnica correspondiente).

## Cómo leer esta documentación

| Tarea | Lee |
|---|---|
| Siempre, lo primero | `MAP.md` |
| Funcionalidad de un módulo o submódulo (qué hace y qué operaciones tiene) | `AGENTS.md` §10 + `especificacion.md` |
| Landing, SEO, noticias públicas, contacto | `AGENTS.md` + `specs/publico.md` |
| Dashboard, Radar, superadmin, login | `AGENTS.md` + `specs/privado.md` |
| Frontera entre zonas (noticias, clientes en landing, env, headers, auth) | `AGENTS.md` + ambas specs |

Precedencia ante conflicto: `AGENTS.md` > `especificacion.md` > specs > skills > `docs/referencia/MAP_old.md` (sistema anterior: solo consulta, no normativo; no lo cargues salvo que te lo pida).

## Rol del agente

Actúa como ingeniero de software senior. Sigue este documento, las specs y el plan de implementación sin replantearlos. No inventes requisitos: si algo es ambiguo, pregúntame antes de implementar.

## Descripción general

Reconstrucción desde cero de **mga-v2**, el sitio y sistema interno de MGA Informática (servicios IT: desarrollo web, sistemas de gestión Zoologic, consultoría y soporte). Tiene dos audiencias: visitantes y potenciales clientes → sitio público de marketing con SEO fuerte, noticias y formulario de contacto; personal interno → dashboard de gestión (clientes, servicios, presupuestos, stock, fondos, oportunidades), Radar de prospección comercial y panel superadmin del sistema POS. Objetivo: un sistema **sólido, seguro, consistente y amigable**. Principios: separación estricta entre zonas, seguro por defecto (lo no permitido está denegado), una sola fuente de verdad por dato o lista, verificación automática de lo crítico y reproducibilidad del esquema (migraciones + seed).

---

## 1. Zonas y frontera público/privado

### 1.1 Zonas

| Zona | Rutas | Spec | Autenticación | UI | Acceso a datos |
|---|---|---|---|---|---|
| **Pública** | `/`, 4 servicios, 3 sistemas, `/noticias`, `/api/public/*` | `specs/publico.md` | Ninguna | Tailwind v4 + Framer Motion, `lib/public/theme.ts` | Supabase **anon** sobre la superficie pública (§1.3). Sin service role |
| **Acceso** | `/auth/signin`, `/api/auth/*` | `specs/privado.md` §5 | NextAuth v5 (Credentials + JWT) | Estilos de la zona privada | Anon solo para `signInWithPassword` en servidor |
| **Dashboard** (incluye Radar) | `/dashboard/*`, `/api/dashboard/*` | `specs/privado.md` | Sesión + permisos por nodo (módulo/submódulo/función, §10.2) | Tailwind v4 con tokens propios (D-10), aislado por route group | Service role solo en servidor |
| **Superadmin** | `/superadmin/*`, `/api/superadmin/*` | `specs/privado.md` §5.4 y §7 | Cookie propia firmada | Ídem dashboard | Cliente `supabase-master` (BD del POS) |

### 1.2 Reglas de separación (innegociables)

- **SEP-1 · Una app, cuatro fronteras.** Un repo y un deploy (D-01), pero cada zona es una frontera con su route group (`(public)`, `(auth)`, `(dashboard)`, `(superadmin)`), su carpeta de `components/` y de `lib/`. Única excepción: la zona **Acceso** reutiliza las carpetas de `private` (p. ej. `lib/private/supabase-anon.ts` para `signInWithPassword` en servidor).
- **SEP-2 · Imports.** `public` no importa de `private`, `private` no importa de `public`, `shared` no importa de ninguna. Se hace cumplir con ESLint (`no-restricted-imports` por carpeta) y **rompe el CI**.
- **SEP-3 · `shared` es mínimo.** Solo utilidades puras (fechas, formateo, escape HTML, sanitizador de HTML por allowlist, helper de rate limit), constantes de marca (`brand.ts`) y tipos. Sin lógica de negocio, sin acceso a datos, sin componentes con estilo de zona.
- **SEP-4 · La zona pública no tiene privilegios.** No usa service role, NextAuth ni `supabase-admin`. Lee solo la superficie pública (§1.3). Los módulos con secretos (`supabase-admin`, `supabase-master`, `superadmin-auth`, Groq, Instagram, IMAP) importan `server-only` para que el build falle si llegan al cliente.
- **SEP-5 · Assets y scripts por zona.** Tailwind y Framer Motion solo se importan en `app/(public)/layout.tsx`. `SessionProvider`/NextAuth solo en `(auth)` y `(dashboard)`. **GA4 solo en la zona pública** (nunca en pantallas con datos de clientes). El `app/layout.tsx` raíz es mínimo: `<html lang="es-AR">` y fuentes.
- **SEP-6 · APIs por familia.** `/api/public/*`, `/api/auth/*`, `/api/dashboard/*`, `/api/superadmin/*`. No existe otra. Cada ruta declara su guarda: pública = Zod + rate limit; dashboard = sesión + permiso de módulo; superadmin = cookie firmada validada.
- **SEP-7 · Indexación.** Las zonas privadas (dashboard, superadmin) **y la zona de acceso (`/auth/signin`)** llevan `robots: noindex` en su layout **y** están bloqueadas en `robots.ts`. El sitemap solo incluye rutas públicas.
- **SEP-8 · Headers por zona.** Base global en producción (HTTPS forzado/HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors`). CSP propia: la pública permite solo GA4, Google Maps (iframe) y YouTube/Vimeo (video de noticias); la privada no permite terceros salvo Supabase. `Permissions-Policy`: micrófono `self` solo en el dashboard (voz de remitos), desactivado en la pública. El dashboard **no embebe mapas**: la ubicación del Radar se muestra como texto + enlace externo (si algún día hace falta un iframe, ampliar esta regla y pedirme autorización).
- **SEP-9 · Env por zona.** Cada variable tiene zona asignada (§9). Una secreta nunca lleva prefijo `NEXT_PUBLIC_`.
- **SEP-10 · Dueño de los datos.** El dashboard es dueño de las tablas; la landing solo consume la superficie pública. Un cambio en una tabla fuente que afecte esa superficie exige migración **y** actualizar `specs/publico.md`.

### 1.3 Superficie pública de datos (contrato público ↔ privado)

Es lo único que la zona pública puede leer de la BD.

| Superficie | Tabla fuente | Columnas permitidas | Filtro obligatorio | Consumidor |
|---|---|---|---|---|
| Noticias publicadas | `noticias` | `id, titulo, resumen, contenido, imagen_card, imagen_portada, video_url, fecha, created_at, orden` | `publicada = true` | `/noticias`, `/noticias/[id]`, sitemap |
| Clientes en landing | `clientes` | `id, nombre, rubro, imagen, pagina_web` (teléfono/dirección: ver P-04) | `mostrar_en_landing = true AND activo = true AND tipo <> 'PARTICULAR'` | Sección Clientes |

Implementación (la propone el agente y la documenta en la migración): preferido, **RLS con política `to anon` + `GRANT SELECT` por columna** sobre la tabla; alternativa, vista con `security_invoker`. En ambos casos:
- RLS habilitada en todas las tablas; `REVOKE` de `anon` y `authenticated` sobre el resto de las tablas base (sin política = sin acceso; el service role se usa solo desde la zona privada).
- Buckets públicos (solo lectura): `noticias-imagenes` y `clientes-logos`. Todo lo demás, privado con URL firmada. Esta regla es estricta: la alternativa "públicos o firmados" de `specs/privado.md` §9.5 no está permitida (ver P-12).
- **Test automático obligatorio** (§5): con la anon key, leer `clientes`, `servicios`, `users`, etc. falla; leer noticias no publicadas devuelve vacío; pedir una columna no permitida falla.

> **Glosario:**
> - **Oportunidad:** lead del módulo Oportunidades (pipeline de emails, Fase 3). El **Radar no crea oportunidades**: convierte prospectos en cliente / servicio / presupuesto (Fase 6). El test E2E "presupuesto aprobado → oportunidad ganada" (§5) se refiere al módulo Oportunidades.
> - **Zoologic:** en la zona **pública**, la marca de los sistemas (Lince, Dragonfish, Pantera); en la zona **privada**, el módulo del menú que agrupa Oportunidades (CRM de emails).
> - **Prospectos** y **Servicios:** nombre de un módulo (grupo del menú) y a la vez de uno de sus submódulos; las rutas canónicas de permisos los distinguen (ver P-14).
> - **Radar vs Prospectos:** *Radar* busca prospectos en internet (Google Places) y muestra las búsquedas y sus resultados; un resultado se **marca como "Prospecto"** para pasarlo a la lista de trabajo *Prospectos*, donde se registra el contacto y el historial de iteraciones. Ver P-17.

---

## 2. Stack tecnológico

- Lenguaje / framework: Next.js 16.x App Router, React 19, TypeScript strict (sin `any` sin justificación). `params`/`searchParams` son `Promise` → siempre `await`. Protección de rutas en `proxy.ts` (no `middleware.ts`).
- Base de datos / almacenamiento: Supabase (PostgreSQL + Storage + Auth). Proyecto separado para la BD del POS (superadmin).
- Autenticación: pública: ninguna. Dashboard: NextAuth v5 (Credentials + JWT sobre Supabase Auth). Superadmin: cookie propia firmada.
- Validación: Zod 4 en formularios (react-hook-form + `zodResolver`) **y** en toda API.
- UI: pública: Tailwind v4 + Framer Motion. Privada: ver D-10. Íconos: Lucide.
- Integraciones: Resend · Groq (Whisper + GPT-OSS 20B, por HTTP) · Gmail IMAP · Instagram Graph API v21.0 · Google Places y PageSpeed · GA4.
- Hosting / despliegue: Vercel (producción + previews) + Supabase.
- Dev: `next dev --webpack` (Turbopack tuvo panics en rutas de login: reprobar al actualizar Next).

Ante conflicto con una spec, manda este stack.

**Librerías autorizadas** (lista cerrada; cualquier otra requiere mi autorización):
`next`, `react`, `react-dom`, `typescript`, `next-auth` (v5, versión exacta fijada: `5.0.0-beta.32`), `@supabase/supabase-js`, `zod`, `react-hook-form`, `@hookform/resolvers`, `lucide-react`, `server-only`, `resend`, `imapflow`, `mailparser`, `eslint` + `eslint-config-next`, `vitest`, `@playwright/test`, `@axe-core/playwright`, `@lhci/cli`, `sanitize-html`, `supabase` (CLI, dev), `@upstash/ratelimit` + `@upstash/redis`.
Solo zona pública: `tailwindcss`, `@tailwindcss/postcss`, `framer-motion`, `@next/third-parties`. Solo noticias del dashboard: `@tiptap/*`.

---

## 3. Reglas innegociables

1. Lee siempre `MAP.md` antes de empezar; después, solo la spec de la zona que toca (ver "Cómo leer").
2. Declara la zona de cada tarea. No mezcles zonas en un cambio, salvo que toque la frontera (§1.3) y me lo avises.
3. Modularidad: lógica de negocio en `lib/<zona>/<dominio>/` (funciones puras y testeables); rutas API y componentes son finos. Separada de la interfaz y del acceso a datos.
4. No añadas librerías ni cambies el stack sin mi autorización.
5. Una sola fuente de verdad: listas de módulos, estados, permisos, env, catálogo POS y tema viven en una constante o en la BD, nunca copiadas en varios archivos. La URL base vive en `APP_URL` (§9): ninguna constante hardcodea el dominio.
6. Actualiza `MAP.md` después de cada cambio relevante.
7. Idioma: dominio de negocio en español (tablas, columnas, rutas, componentes de módulo); términos técnicos de infraestructura en inglés; comentarios y documentación en español; textos de interfaz en español rioplatense (es-AR).
8. **Verificación automática** (D-09; esta regla sustituye a la regla "no realices pruebas" de la plantilla): antes de avisarme, ejecuta lint, typecheck y los tests de lo que tocaste, y escribe tests junto con el código (§5). La validación funcional manual sigue siendo mía.
9. No me expliques nada: avísame cuando termines, con **una línea** del resultado de las verificaciones y qué debo probar; si la fase tocó datos, permisos, archivos o autenticación, añade qué puntos de §4 aplicaron.
10. Nada a medias: o la funcionalidad cumple la spec, o lo pendiente se registra en `fixes.md`. Sin enlaces muertos ni TODOs sueltos.
11. Ante conflicto entre este documento y una skill, manda este documento. Si una spec contradice a `AGENTS.md` en separación o seguridad, manda `AGENTS.md` y me lo avisas.

---

## 4. Seguridad

Base obligatoria en todas las fases y en ambas zonas. Lo específico de cada zona está en `specs/publico.md` §12 y `specs/privado.md` §9.

### Secretos y configuración
- Ninguna clave, contraseña ni token en el código ni en el repo. Todo en variables de entorno; `.env.example` completo (generado desde §9) y `.env*` en `.gitignore`.
- **El `.gitignore` (con `.env*`) debe existir antes de `git init` y del primer commit.** En la raíz ya hay un `.env.local` con valores reales: jamás commitearlo (Fase 0).
- Sin valores por defecto inseguros: si falta una variable requerida, el endpoint falla con error claro, nunca autentica con un fallback.
- Claves con permisos totales (service role, `SUPERADMIN_SECRET`) solo en servidor. Activar GitHub secret scanning y push protection; rotar cualquier clave expuesta.
- `check-env` (§5) valida además que `.env.example` cubra todas las variables de §9.

### Acceso y datos
- Autenticación y autorización **en el servidor**, nunca solo en la interfaz ni solo en el middleware.
- Mínimo privilegio: cada rol accede solo a lo que necesita; cada zona, solo a lo suyo (§1).
- **RPC:** las funciones SQL revocan `EXECUTE` a `PUBLIC` y `anon` salvo las que deban ser públicas; las `SECURITY DEFINER` fijan `search_path`.
- Toda entrada se valida en servidor (tipo, longitud, formato) con Zod; consultas siempre parametrizadas.
- Todo contenido de usuario o de terceros se sanea antes de mostrarse (XSS), **incluido el HTML de TipTap (`noticias.contenido`)** en cualquier zona que lo renderice: allowlist con librería (P-01); el sanitizador vive en `lib/shared` como utilidad pura (SEP-3). Todo input se escapa antes de interpolarse en HTML de email.
- **Cookies y sesiones:** toda cookie de sesión es `HttpOnly` + `Secure` (producción) + `SameSite`. Dashboard: `SameSite=Lax` (o Strict) y `maxAge` ≤ 24 h con renovación explícita; superadmin: `SameSite=Strict` y `Max-Age` ≤ 24 h (ver `specs/privado.md` §5.4). Las mutaciones `/api/dashboard/*` se autorizan con la cookie same-origin validada en servidor (CSRF cubierto por `SameSite`); si algún día se admite otro origen, exigir token CSRF.
- Errores genéricos hacia el usuario; los logs no contienen datos personales ni secretos.

### Autenticación y ciclo de vida de credenciales
- Sin registro público (D-06): el alta de usuarios es solo de un Administrador. La entrega de la contraseña inicial queda documentada: invitación de Supabase Auth o clave temporal forzada a cambio en el primer ingreso (el flujo exacto se especifica en `specs/privado.md` §5 — P-13).
- Debe existir el flujo "olvidé mi contraseña" para el dashboard.
- Mensajes de autenticación genéricos (no revelar si la cuenta existe). Contraseñas de mínimo 12 caracteres.
- MFA (P-08): antes de implementar, especificar el flujo MFA contra el flujo Credentials de NextAuth v5 (M-10). Sin ese diseño, no se implementa.

### Endpoints públicos y anti-bots
- Rate limit y protección anti-bots en: login del dashboard, login superadmin, `/api/public/contact`, voz y extracción de oportunidades. El almacén del contador debe ser compartido, no memoria del proceso (P-02).
- **Anti-bots mínimo obligatorio:** honeypot + rate limit. Cualquier captcha o servicio externo de verificación requiere mi autorización (§2).

### Archivos
- Validar tipo real (no solo extensión) y tamaño; nombres generados por el sistema. Privados (`presupuestos-docs`, `remitos-audio`) con URL firmada de corta duración.
- **SVG prohibido en toda subida** (logos: JPG/PNG/WEBP), sin excepción por saneado: el saneado de SVG no es fiable y puede ejecutar scripts.

### Aplicación
- Headers por zona (SEP-8). `npm audit` y revisión de los Security Advisors de Supabase antes de desplegar.
- SSRF bloqueado en cualquier fetch a URLs de terceros (Radar) — checklist en `specs/privado.md` §9.4.
- Nunca datos reales en desarrollo ni en pruebas (seed sintético).

### Datos personales (aplica)
- El sistema maneja datos de clientes (CUIT, email, teléfono, dirección), usuarios, prospectos comerciales (Radar), audios de dictado y contenido de emails que se procesa con un proveedor de IA.
- Marco: Ley 25.326 de Protección de Datos Personales (Argentina). Los textos legales (política de privacidad, consentimiento) los revisa un profesional; el sistema solo los muestra.
- Capacidades requeridas: **exportar y eliminar** los datos de una persona o empresa (cliente o prospecto) — implementación obligatoria en **Fase F** (§7); respetar `do_not_contact`; y una política de conservación de prospectos (P-09).
- A proveedores de IA se envía solo lo mínimo necesario.
- Copias de seguridad: documentar qué ofrece el plan de Supabase contratado, qué proceso propio hace falta, y **probar una restauración** antes del go-live.

---

## 5. Calidad y testing

El sistema anterior se probaba solo a mano. Ahora la prueba manual es la última capa, no la única.

| Capa | Herramienta | Qué cubre |
|---|---|---|
| Estática | `tsc --noEmit`, ESLint (con fronteras SEP-2), `npm audit` | Tipos, imports prohibidos entre zonas, dependencias |
| Unitaria | Vitest | Lógica pura de `lib/*`: scoring del Radar, deduplicación, normalización, guarda SSRF, sanitizador y escape HTML, resolución de permisos por niveles (herencia simple, D-12), transiciones de estado, totales/saldos, matching de voz (umbral 0.7), formateo de fechas sin desfase UTC, rate limit |
| Contrato/seguridad | Vitest + Supabase local | (a) **Inventario de rutas**: un test recorre todos los `app/api/**/route.ts` y verifica **según corresponda a la familia**: `dashboard` y `superadmin` → 401 sin sesión y 403 sin permiso; `public` y `auth` quedan **exentas del 401** y se validan por sus reglas (Zod, rate limit, rate limit de login). Verifica además que no existe ruta fuera de las 4 familias (SEP-6); (b) la anon key solo lee la superficie pública (§1.3); (c) buckets privados inaccesibles sin URL firmada; (d) superadmin sin secreto → rechazo; cookie con firma inválida → rechazo; (e) payload `<img onerror>` en contacto queda escapado; (f) SSRF bloquea rangos privados y redirects |
| E2E | Playwright | Login/logout y redirecciones; permisos por rol; cliente → servicio → tarea → pago; presupuesto aprobado → oportunidad ganada (módulo Oportunidades, ver glosario §1); remito confirmado → stock; publicar noticia → visible en `/noticias`; contacto (Resend mockeado); búsqueda Radar (Places mockeado) |
| Calidad pública | Lighthouse CI + axe | Mobile: performance ≥ 90, accesibilidad ≥ 90, SEO = 100; sin violaciones críticas de accesibilidad en público y en el home del dashboard |

Reglas:
- **Servicios externos siempre mockeados** en tests (Groq, Resend, Google, Instagram, IMAP). Cada integración vive detrás de una interfaz en `lib/<zona>/integraciones/`.
- **Datos de prueba sintéticos** (`supabase/seed.sql`); nunca datos reales.
- **Fixtures de permisos:** el inventario de rutas incluye roles de prueba con permisos parciales por nivel (ver, crear, solo función) para comprobar 403.
- **Entorno del POS:** los tests de contrato del superadmin necesitan un entorno definido de la BD del POS (segunda instancia local, seed mínimo o mock del cliente `supabase-master`); decidirlo en Fase 0 y fijarlo en Fase 8 (M-11).
- **Bug corregido = test de regresión.** Cada ítem cerrado de `fixes.md` referencia su test.
- **CI (GitHub Actions)** en cada PR: instalar, lint, typecheck, tests unitarios y de contrato, build, `npm audit --omit=dev` (falla con high/critical) y `scripts/check-env` (toda `process.env.X` usada está declarada en §9 **y** `.env.example` cubre §9).
- **Definición de "fase terminada":** spec cumplida · tests nuevos y existentes pasan · lint + tipos + build OK · checklist de §4 revisado (dime qué puntos aplicaron) · migraciones aplican desde cero · `MAP.md` actualizado · pendientes en `fixes.md` · mensaje de commit propuesto.

---

## 6. Preferencias de diseño y código

### Proceso de diseño
- **Tokens por zona:** `lib/public/theme.ts` y `lib/private/theme.ts`, ambos derivados de `lib/shared/brand.ts` (logo, color primario, tipografía de marca). Los componentes nunca hardcodean colores, tipografías, radios ni textos de contacto. `theme.site.url` deriva de `APP_URL` (§9): ningún archivo hardcodea el dominio.
- **Estilos del dashboard (D-10):** Tailwind v4 con tokens propios derivados de `lib/private/theme.ts`, **aislado por route group** (`(dashboard)`, `(auth)`) y nunca el Tailwind de `(public)`. El patrón de estilos del dashboard se especifica en `specs/privado.md` antes de codificar (P-11). Este camino es el que hace exigible la accesibilidad AA de la lista siguiente.
- **Diseño antes que código** para pantallas nuevas no triviales: referencia en `design/<zona>/<modulo>/` (imagen, export de Figma o wireframe). Si no hay, propón un wireframe y espera mi OK antes de codificar. Listas y formularios estándar siguen el patrón existente sin esta etapa.
- **Estados completos:** toda vista define vacío, cargando, error y éxito. Mensajes en es-AR, claros y accionables. Confirmación en acciones destructivas.
- **Accesibilidad AA** en ambas zonas: foco visible, navegación por teclado, `alt` y labels, contraste, `prefers-reduced-motion`.
- **Responsive:** público mobile-first; dashboard usable en tablet y móvil.
- Si hay conflicto entre una imagen de diseño y este documento, manda este documento.

### Convenciones de código
- Componentes de servidor por defecto; `"use client"` solo donde haga falta interactividad.
- Componentes en PascalCase; los de módulo del dashboard siguen el patrón `page.tsx` (server) + `XxxClient.tsx` (client) de `specs/privado.md` §3.2.
- Tablas y columnas en `snake_case` español (convención final de nombres: P-05).
- Fechas `date` se formatean con split `[y, m, d]`, nunca con `new Date()` (desfase UTC).
- Tipos: compartidos entre zonas → `lib/shared/types`; de una sola zona → junto a su dominio (`lib/<zona>/<dominio>/types.ts`); la carpeta `types/` de la raíz solo para tipos globales del proyecto.
- Reutiliza componentes. Evita duplicar código.

---

## 7. Fases de desarrollo

El plan completo está en `plan-implementacion.md` (fases con sub-tareas; lo genera `/01-crear-plan` a partir de este documento). Se ejecuta fase por fase, en orden. Cada fase termina con: probar, corregir (`fixes.md`), actualizar `MAP.md`, la "definición de fase terminada" de §5 y commit propuesto por el agente (lo ejecuto yo).

### Git y entornos
- Rama `main` protegida. Una rama por fase (`fase-N-nombre`); merge solo con CI verde. Commits convencionales (`feat:`, `fix:`…). El agente **propone** el commit; lo ejecuto yo.
- Tres entornos: **local** (Supabase local o proyecto dev), **staging** (preview de Vercel + proyecto Supabase de staging) y **producción**. Datos reales solo en producción.

### Migraciones
- Todo cambio de esquema es una migración nueva en `supabase/migrations/` (nunca editar una aplicada) y debes decirme cómo aplicarla. Cada migración incluye RLS y GRANTs.
- Prohibido el "ejecuta este ALTER en el editor SQL". El esquema completo se levanta desde cero con migraciones + `seed.sql`.

### Fases

| Fase | Zona | Contenido |
|---|---|---|
| 0 | Base | Repo (**`.gitignore` con `.env*` antes de `git init` y del primer commit**), Next 16 + TS strict, ESLint con fronteras, Vitest/Playwright, CI, `.env.example` + `check-env`, Supabase local, headers base, decisión del entorno de test de la BD del POS (§5) |
| 1 | Privada | Administración: identidad (roles con `is_admin`, users, permisos por nodos) + seed, NextAuth, `proxy.ts`, rate limit, **setup de Tailwind con tokens propios por route group (D-10/P-11)**, shell del dashboard con `lib/private/modulos.ts`, Usuarios/Roles/Permisos, test de inventario de rutas |
| 2 | Privada | Altas: Clientes (+ logo, `mostrar_en_landing`, superficie pública §1.3) y Activos |
| 3 | Privada | Servicios: Servicios (+ tareas, pagos) y Presupuestos (+ ítems, adjuntos, vínculos) |
| 4 | Privada | Fondos: Gastos (plantilla, pagos parciales) y Cobranzas (con edición, imputación) |
| 5 | Privada | Zoologic: Oportunidades (IMAP + Groq, pipeline, iteraciones) |
| 6 | Privada | Prospectos: Radar (SSRF, cuota, scoring, marcar Prospecto) y Prospectos (lista de trabajo, conversión) |
| 7 | Privada | Inventario: Productos, Remitos (+ voz, stock), Proveedores (entidad nueva — D-14) |
| 8 | Privada | LandingPage: Noticias (+ Instagram, superficie pública §1.3) |
| 9 | Privada | Superadmin (empresas, catálogo de módulos POS; entorno de test de la BD del POS fijado — §5) |
| P1 | Pública | Layout, tema, Home (10 secciones), páginas de servicios y sistemas. Paralelizable desde la Fase 1 |
| P2 | Pública | Noticias públicas, clientes (superficie pública), contacto, SEO. Usa seeds si las Fases 2 y 8 no están |
| F | Ambas | Endurecimiento y go-live: `/auditoria` (pantalla en `/dashboard/admin/auditoria`, nodo `administracion.auditoria`, APIs bajo `dashboard`), Lighthouse CI, backups probados, rotación de secretos, **secret scanning y push protection de GitHub**, **herramienta de exportación/borrado de datos personales (Ley 25.326)**, sitemap en Search Console |

---

## 8. Estructura de archivos del proyecto

```
AGENTS.md  especificacion.md  plan-implementacion.md  MAP.md  fixes.md
specs/{publico,privado}.md
docs/referencia/MAP_old.md          # sistema anterior; solo consulta (si existe)
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
proxy.ts  next.config.ts  .env.example  .gitignore
components/{public,private,shared}/
lib/{public,private,shared}/        # private: auth, permisos, modulos, supabase-admin/master, radar/…
types/                              # solo tipos globales (ver §6)
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
| `APP_URL` | todas | no | URL base (canonical, sitemap, enlaces). `theme.site.url` de la zona pública **deriva** de esta variable. Si Auth.js requiere `AUTH_URL`, verificarlo en su doc |
| `SUPERADMIN_SECRET` | S | sí | Sin valor por defecto; sin él, el login se rechaza |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | P, D | sí / no | Zona P: contacto público. Zona D: notificaciones internas (si la spec las usa) |
| `NEXT_PUBLIC_GA_ID` | P | no | Se embebe en build; si falta, GA4 no carga |
| `GROQ_API_KEY` | D | sí | |
| `GMAIL_IMAP_USER`, `GMAIL_IMAP_PASSWORD` | D | sí | App Password de Google |
| `INSTAGRAM_USER_ID`, `INSTAGRAM_ACCESS_TOKEN` | D | sí | Opcional |
| `GOOGLE_MAPS_API_KEY` | D | sí | Radar (Places), solo servidor, restringida por API |
| `GOOGLE_PAGESPEED_API_KEY` | D | sí | Radar |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | P, A, D | sí | Almacén compartido del rate limit (P-02); librerías `@upstash/*` |

`GEMINI_API_KEY` y `CEREBRAS_API_KEY` no se declaran hasta que exista una spec que las use (D-08).

---

## 10. Funcionalidades de la aplicación

### 10.1 Módulos del sistema (estructura del menú privado)

El árbol del menú del dashboard (D-11), en orden de render:

```
1. Zoologic
   └── Oportunidades
2. Prospectos
   ├── Radar
   └── Prospectos
3. Servicios
   ├── Servicios
   └── Presupuestos
4. Altas
   ├── Clientes
   └── Activos
5. Inventario
   ├── Productos
   ├── Remitos
   └── Proveedores
6. Fondos
   ├── Gastos
   └── Cobranzas
7. Administración
   ├── Usuarios
   ├── Roles
   └── Permisos
8. LandingPage
   └── Noticias
```

- **Árbol canónico:** los 8 módulos (grupos), sus submódulos y las funciones se definen **solo** en `lib/private/modulos.ts` (D-07/D-11). El sidebar, el home del dashboard, la matriz de permisos, el seed de `role_permissions` y los tests derivan de esa constante; nunca se copian listas en varios archivos (regla 5). Al agregar un nodo nuevo se agrega ahí una sola vez y se regeneran esas superficies.
- Cada nodo tiene una ruta estable para permisos: `inventario.remitos`; una función es una acción puntual bajo un submódulo: `inventario.remitos.nuevo` ("nuevo remito").
- **Semántica de Prospectos:** *Radar* muestra las búsquedas y sus resultados; desde un resultado se puede **marcarlo como "Prospecto"** para trabajarlo en la lista *Prospectos* (contacto + control de iteraciones). La configuración de servicios objetivo del scoring (antes ítem "Radar Servicios") deja de ser entrada de menú y se gestiona desde Radar (ver P-17).
- **Importar (Excel) quedó fuera de alcance (D-13):** no existe en el menú, la spec ni el plan (P-15); `xlsx` se quitó de las librerías autorizadas.
- La spec de cada módulo/submódulo vive en `specs/privado.md`; este árbol manda sobre la spec si discrepan los grupos (los grupos/ home / sidebar actuales de `specs/privado.md` §5.3 y §6.0 quedan obsoletos: P-14).

### 10.2 Modelo de permisos (roles → permisos por niveles)

- Los usuarios tienen roles; cada rol tiene permisos (tabla `role_permissions`).
- Un permiso se asigna sobre **cualquier nodo** del árbol de §10.1: **módulo** (grupo completo), **submódulo** o **función**. Ejemplos: `Inventario` (todo el grupo), `inventario.remitos` (submódulo), `inventario.remitos.nuevo` ("nuevo remito").
- Acciones: a nivel módulo/submódulo, `ver / crear / editar / eliminar` (asignables en cualquier combinación); a nivel función, la acción puntual (p. ej. "nuevo remito", "confirmar remito", "publicar noticia").
- **Herencia simple (D-12):** conceder un nodo concede todo su subárbol (módulo → submódulos → funciones). No hay denegaciones explícitas: para excluir un submódulo, no se concede el módulo y se conceden uno a uno los submódulos que interesen. También se puede conceder un nodo aislado (p. ej. solo una función) sin conceder su ancestro.
- **Herencia de acciones:** heredar un nodo extiende **solo la acción concedida** a todo el subárbol (`ver` no concede `crear`, etc.). Las funciones equivalentes a CRUD heredan de su acción (`nuevo` ← `crear`, `editar` ← `editar`, `eliminar` ← `eliminar`). Las funciones **no-CRUD** (`confirmar remito`, `anular remito`, `publicar noticia`) **no se heredan nunca**: requieren su nodo propio concedido explícitamente.
- **Administración:** el flag `is_admin` (P-07) concede implícitamente todos los nodos `administracion.*` y `landing_page.*`; los permisos por nodo permiten acceso parcial a cualquiera de esos grupos sin ser admin (p. ej. solo `inventario.remitos`).
- La resolución es **en servidor** y se pasa por props (D-05); toda ruta `/api/dashboard/*` verifica sesión + permiso del nodo (§4, §5). Las `/api/superadmin/*` usan cookie firmada (§1.1), sin permisos de rol.
- Esquema (nodos con `ruta` + acciones), seed, API de permisos y matriz de la UI de Administración: ver P-14 (migración nueva, nunca editar la aplicada).

### 10.3 Plantilla para nuevas funcionalidades

Las funcionalidades viven en `specs/publico.md` y `specs/privado.md`. Para añadir una nueva, agrégala a la spec de su zona con esta plantilla y usa `/nueva-funcionalidad`.

Estructura del bloque en la spec:
- `##` = área/bloque funcional de la spec (Autenticación, Blog, Pedidos, etc.; no confundir con los módulos del menú de §10.1)
- `###` = funcionalidad dentro del módulo
- viñetas = requisitos concretos

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
| D-10 | Estilos del dashboard: **Tailwind v4 con tokens propios, aislado por route group**, desde Fase 1 (antes: inline styles + `theme`). Resuelve el conflicto AA (§6) vs P-03; el patrón se especifica en la spec privada (P-11) |
| D-11 | Árbol de módulos del menú privado: los 8 módulos (Zoologic, Prospectos, Servicios, Altas, Inventario, Fondos, Administración, LandingPage) con sus submódulos (§10.1) se definen solo en `lib/private/modulos.ts`; el árbol manda sobre el sidebar/home de la spec (P-14) |
| D-12 | Permisos por niveles (módulo → submódulo → función) con **herencia simple**: conceder un nodo concede todo su subárbol; no hay denegaciones. Sustituye a la matriz plana de 11 módulos con `can_view/can_create/can_edit/can_delete` como única granularidad |
| D-13 | Importar (Excel) fuera de alcance: sin módulo en el menú, sin spec y sin `xlsx` en las librerías autorizadas (se quitó de §2) |
| D-14 | Proveedores: entidad nueva con ficha y CRUD propio; **absorbe** el catálogo `origenes_destinos` con tipo proveedor (el catálogo queda para sucursal/depósito/cliente/otro — ver P-16). Entra en Fase 4 con migración; campos y relación con remitos se especifican en la spec (P-16) |

### Pendientes que necesito que resuelvas

Semántica: "Debe resolverse en" indica la fase límite; si es el **inicio** de la fase, la bloquea (no se arranca esa fase sin resolverlo); si son varias fases, es exigible al cierre de cada una.

| ID | Tema | Recomendación | Debe resolverse en |
|---|---|---|---|
| ~~P-01~~ | ~~Aprobar librerías propuestas (§2)~~ **Resuelto:** aprobadas todas por el dueño; §2 actualizado | — | Fase 0 |
| P-02 | Almacén del rate limit | Upstash Redis: en Vercel serverless la memoria no se comparte. Alternativa: tabla en Postgres | Fase 1 (bloquea su inicio) |
| P-04 | Datos de clientes en landing | Publicar solo nombre, rubro, logo y web. Teléfono y dirección solo con consentimiento explícito y nunca de clientes `PARTICULAR` | P2 |
| P-05 | Nombres en BD | Las tablas del Radar están en inglés y el resto en español. Unificar; al renombrar, actualizar también `specs/privado.md` §4.5 | Fase 1 (bloquea su inicio) |
| P-06 | Env de la BD del POS | Las specs no nombran las variables del cliente `supabase-master`. Confirmar `POS_SUPABASE_*` | Fase 8 |
| P-07 | Administrador por nombre de rol | `role === 'Administrador'` se rompe si renombran el rol. Usar un flag `is_admin` y actualizar `specs/privado.md` §5.1 | Fase 1 (bloquea su inicio) |
| P-08 | MFA | TOTP (Supabase Auth MFA) para Administradores; el superadmin hoy es un único secreto compartido. Antes de implementar, especificar el flujo contra Credentials de NextAuth v5 (M-10) | Fase 1 y Fase 8 (exigible al cierre de cada una) |
| P-09 | Legal y proveedores | Revisión profesional (Ley 25.326); verificar los términos de Google Places sobre almacenar datos de lugares; plazo de conservación de prospectos | Fase 6 |
| ~~P-10~~ | ~~Dependencias frágiles~~ **Resuelto:** `next-auth@5.0.0-beta.32` fijado en §2 y `package.json` | — | Fase 0 |
| P-11 | Alinear specs con D-10 | `specs/privado.md` §2 y §6 siguen exigiendo inline styles; actualizarlas al patrón Tailwind con tokens y definir allí el patrón de estilos del dashboard | Fase 1 (bloquea su inicio) |
| P-12 | Buckets: alinear specs con §1.3 | `specs/privado.md` §9.5 permite "públicos o firmados" para `clientes-logos`/`noticias-imagenes`; aquí se exige solo lectura pública | Fase P2 |
| P-13 | Flujo de credenciales de usuario | Especificar en `specs/privado.md` §5: entrega de la contraseña inicial (invite o clave temporal forzada a cambio) y reset "olvidé mi contraseña" (H-4) | Fase 1 (bloquea su inicio) |
| P-14 | Menú y permisos: actualizar la spec | En `specs/privado.md`: §5.3 (11 módulos canónicos), §6.0 (home), sidebar y la matriz/API de permisos pasan al árbol de §10.1 y al modelo por niveles (D-11/D-12); nuevo esquema de `role_permissions` (nodos con `ruta` + acciones) y seed; **tabla cerrada de claves canónicas de nodos** (p. ej. `prospectos.prospectos`, `prospectos.radar`, `landing_page.noticias`); **permisos del rol por defecto** (`is_default`; recomendado: ninguno); migración nueva | Fase 1 (bloquea su inicio) |
| P-15 | Quitar Importar | En `specs/privado.md`: eliminar §6.12 (Importar/`xlsx`), la API `importar/servicios` y todo resto en planes y seeds (D-13) | Fase 7 |
| P-16 | Entidad Proveedores | Definir en `specs/privado.md`: campos de la ficha de `proveedores`, relación con `origenes_destinos` (absorbe tipo proveedor; el catálogo queda para sucursal/depósito/cliente/otro) y referencia desde los remitos; migración nueva | Fase 4 (bloquea su inicio) |
| P-17 | Radar → Prospectos | En `specs/privado.md`: eliminar "Radar Servicios" del menú (D-11/§10.1); especificar el marcado de un resultado de Radar como "Prospecto" (estado/flag y transición), la lista de trabajo de Prospectos con contacto e iteraciones, y dónde vive la config de servicios objetivo (antes Radar Servicios). Migración solo si cambia el esquema | Fase 6 (bloquea su inicio) |

---

## 12. Otras consideraciones

- Los errores y mejoras que detecte al probar estarán en `fixes.md`.
- Cada cambio en el esquema de datos es una migración nueva en `supabase/migrations/` (nunca editar una ya aplicada) y debo decirte cómo aplicarla (§7).
- Antes de dar por terminada una fase que toque datos, permisos, archivos o autenticación, revisa §4 y dime qué puntos aplican.
- Usa las skills de `.agents/skills/` que apliquen a cada tarea y dime cuáles usaste.
- `docs/referencia/MAP_old.md` describe el sistema anterior solo como contexto histórico. El `MAP.md` nuevo se genera desde cero a medida que avanzan las fases.
