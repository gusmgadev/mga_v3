# MAP del proyecto: MGA Informática — plataforma web v3

> Fuente de verdad del estado real. Si el código y este mapa no coinciden, gana el código y se corrige el mapa.

## Estado actual
- Fase en curso: ninguna (siguiente: FASE 2 — Altas: Clientes, Activos)
- Última fase completada: FASE 1 (Administración) — código completo, sin commitear.
- FASE 0 completada (commit `326401` + `d93dc67`)
- **Trabajo de migración de la BD (hoy):** esquema de `mgaServiciosBD` (`wpbogwonvbcrcpkjxdvb`) llevado al proyecto nuevo `mgaV3` (`ensnfgucsfefrywacxzx`) con migraciones `000000`–`000003` **aplicadas** y datos copiados (4463 clientes, 165 servicios, 222 prospectos, 81 oportunidades, 6 noticias; auth user con rol `Superadmin`). Superadmin fusionado en el dashboard (D-15/D-16/D-17). **Nada de esto está commiteado.**

## Stack (real, instalado)
- Next.js 16.4.2 (App Router) + React 19.3 + TypeScript 5 strict
- Tailwind 4 (`@tailwindcss/postcss` para dev webpack; regla turbopack en `next.config.ts`)
- Dev: `next dev --webpack` · Build: `next build` (turbopack) ✓ verificados
- `cacheComponents: true` (Next 16): páginas dependientes de sesión usan `export const instant = false` (no `force-dynamic`); `useSearchParams` va dentro de `<Suspense>`
- Deps clave: `next-auth@5.0.0-beta.32`, `@supabase/supabase-js@2.118.0`, `zod`, `react-hook-form`, `@hookform/resolvers@5.9.2`, `resend`, `imapflow`, `mailparser`, `sanitize-html`, `@upstash/*`, `framer-motion`, `@next/third-parties`, `server-only`
- Dev deps: `vitest` (36 tests unit+contract ✓), `@playwright/test`, `@axe-core/playwright`, `@lhci/cli`, `supabase` (CLI)
- Node 24.20 / npm 11.19

## Estructura
- `AGENTS.md`: normativa fuente (4 piezas doc, precedencia `AGENTS > especificacion > specs`). D-15/16/17 documentados.
- `especificacion.md`: funcionalidad (pública, dashboard 8 módulos; §4 = administración de empresas POS dentro del dashboard).
- `specs/{publico,privado}.md`: specs técnicas por zona. `privado.md` §5.5 = credenciales/reset/MFA; §5.3 = árbol canónico; §4.5 = Radar en español; §5.4/§7 = panel POS fusionado (D-15).
- `plan-implementacion.md`: 12 fases (0-9, P1, P2, F); Fases 0 y 1 completadas; Fase 9 (panel POS) código adelantado.
- `app/`: route groups `(public)` aún no creado (P1), `(auth)` signin/olvide/reset, `(dashboard)` shell + admin {usuarios, roles, permisos, empresas, modulos-pos} + seguridad; `api/{auth,dashboard,superadmin}/*` (4 familias SEP-6; superadmin fusionado con guarda sesión+permiso).
- `proxy.ts`: sin sesión → signin; forzar cambio de clave (`/dashboard/seguridad`); sin gate is_admin en `/dashboard/admin/*` (permiso por vista, D-15/D-16); signin con sesión → dashboard.
- `scripts/check-env.mjs`: valida process.env usadas ⊆ §9 ⊆ `.env.example` ✓ (omite scripts one-off de migración de BD).
- `.github/workflows/ci.yml`: lint, typecheck, test, check-env, build, audit.
- `supabase/migrations/`: `000000_baseline_mgaServiciosBD.sql` (esquema origen), `000001_identidad_normalizada.sql` (+`is_admin`, `password_changed_at`, `role_permissions` por nodos, rol Superadmin D-16, fix RLS 42P17), `000002_radar_en_espanol.sql` (P-05), `000003_auditoria_rpcs.sql` — **las 4 aplicadas en `ensnfgucsfefrywacxzx`**. `seed.sql` placeholder.
- `scripts/`: `generar-baseline.mjs`, `migrar-datos.mjs`, `migrar-auth.mjs`, `exportar-catalogo.mjs` (one-off de la migración de datos; check-env los omite).
- `tests/`: `unit/` (modulos, permisos, step-token, rate-limit, smoke) + `contract/` (inventario-rutas: familias/401/403/parciales/is_admin/superadmin-fusionado; auth-paso1) = 36 ✓. `e2e/` vacío.
- Docs del kit: LEEME, prompts, .opencode, .agents/skills, plantillas, presets. `AGENTS_bk.md` = backup ignorado.

## Datos (tablas, entidades, funciones, permisos)
- **BD destino:** proyecto Supabase `ensnfgucsfefrywacxzx` (mgaV3). Origen: `wpbogwonvbcrcpkjxdvb` (mgaServiciosBD, sistema actual en producción).
- Identidad: `roles` (id, name, is_admin, is_default), `users` (FK auth.users, role_id, password_changed_at), `role_permissions` (role_id, nodo, acciones text[]) — RLS + REVOKE total; service role únicamente.
- Roles sembrados en destino: `Superadmin` (D-16: permisos sobre `administracion.empresas`/`administracion.modulos_pos` + otros nodos heredados del origen; no is_admin), `Usuario` (is_default), `Supervisor`.
- Datos migrados: clientes 4463, servicios 165, noticias 6, prospectos 222, oportunidades 81, role_permissions 22, auth.users 1 (`gustavo.mgainformatica@gmail.com`, confirmado).
- POS (D-17, misma BD): `empresas` (credenciales Supabase write-only), `empresa_modulos`, `modulos` (catálogo).
- Fuente única del árbol: `lib/private/modulos.ts` — 8 grupos con submódulos (incluye `administracion.empresas` y `administracion.modulos_pos`); acciones `ver/crear/editar/eliminar`; CRUD heredan (`nuevo`←`crear`), no-CRUD no heredan (D-12).
- Permisos: `lib/private/permisos.ts` (`server-only`) — herencia simple por nodo, `is_admin` = todo; resueltos en servidor (D-05) y pasados por props; guardas vía `lib/private/sesion.ts` (`requiereVista` / `requierePermisoApi`).

## Rutas / endpoints
- Públicos: `/` placeholder.
- Acceso: `/auth/signin` (login 2 pasos: paso1 + TOTP), `/auth/olvide`, `/auth/reset`.
- Dashboard: `/dashboard` (home), `/dashboard/seguridad` (cambio clave + MFA TOTP), `/dashboard/admin/{usuarios,roles,permisos,empresas,modulos-pos}`.
- APIs auth: `POST /api/auth/paso1`, `POST /api/auth/password-modificada`, `POST /api/auth/[...nextauth]`.
- APIs dashboard: `POST /api/dashboard/seguridad/cambiar-password`, `GET|POST /api/dashboard/mfa`, `/mfa/enroll`, `/mfa/verify`, `GET|POST|PUT /api/dashboard/admin/usuarios` (+ `[id]`), `roles` (+ `[id]`), `GET|PUT /api/dashboard/admin/permisos`.
- APIs panel POS (familia superadmin fusionada, D-15): `GET|POST /api/superadmin/empresas`, `GET|PUT /api/superadmin/empresas/[id]`, `PUT /api/superadmin/empresas/[id]/modulos`, `GET|POST /api/superadmin/modulos`, `GET|PUT|DELETE /api/superadmin/modulos/[id]` — todas con `requierePermisoApi`.

## Decisiones técnicas
- P-01/P-02/P-05/P-06/D-17/P-07/P-08 (diseño)/P-11/P-13/P-14 resueltas (AGENTS §11 tachados; specs alineadas).
- **D-15/D-16/D-17 (nuevas):** superadmin fusionado en dashboard (sin zona `/superadmin/*`, sin cookie propia, sin `SUPERADMIN_SECRET`, sin `supabase-master` ni `POS_SUPABASE_*`); rol `Superadmin` con permisos por nodo (no is_admin); una sola BD con credenciales de empresa write-only en `empresas`.
- Login a dos pasos: `paso1` (Supabase `signInWithPassword` con anon en servidor + rate limit por IP/email) emite `step_token` HMAC-SHA256 (`AUTH_SECRET`) + cookie `mga_acceso_mfa` (httpOnly, path `/api/auth`, 5 min); NextAuth Credentials solo valida el step_token.
- MFA TOTP: enrolamiento vía REST admin (`POST /auth/v1/admin/users/{id}/factors`); primer código con sesión efímera `generateLink('recovery')` + `verifyOtp`; sin QR (librería no autorizada).
- Reset "olvidé" en el mismo navegador (PKCE): `resetPasswordForEmail` → `/auth/reset` intercambia `?code=` → `updateUser` → `POST /api/auth/password-modificada` (Bearer validado con `getUser()`).
- Cambio de clave obligatorio si `password_changed_at IS NULL` (proxy). Tras cambiar: `signOut` + signin.
- Migración de datos: scripts one-off (`migrar-datos.mjs` con mapeo de columnas Radar EN→ES, `OVERRIDING SYSTEM VALUE` + ajuste de secuencias; `migrar-auth.mjs` copia `auth.users` incluyendo `encrypted_password`).
- Tokens: `lib/shared/brand.ts` inyecta `--marca-*` vía `<style>` en `app/layout.tsx`; `globals.css` del route group (dashboard) los expone como utilidades Tailwind; `lib/private/theme.ts` traduce a clases TS por grupo (D-10).
- Tests de inventario: excepciones "acción propia" (`/api/dashboard/mfa*`, `/api/dashboard/seguridad/*`) validan sesión sin permiso de nodo; alias de vitest stubifica `server-only`.
- `@hookform/resolvers` fijado en 5.9.2 (la 6.x tiene conflicto de peers con `effect`).
- Scaffold sin `src/`; alias `@/*` a raíz; `.gitignore` con `.env*` + `!.env.example` (también ignora `AGENTS_bk.md`).

## Historial de cambios
- Fase 0: repo inicializado (commits `326401`, `d93dc67`): stack, ESLint con fronteras SEP-2, proxy esqueleto, CI, check-env, Supabase CLI init, tests base.
- Fase 1: identidad + auth + shell + Usuarios/Roles/Permisos (specs P-05/07/08/11/13/14 resueltas; 36 tests; lint ✓ tsc ✓ build ✓). E2E pendientes (fixes.md).
- Migración BD (hoy, sin commit): baseline + migraciones 000001-000003 aplicadas al proyecto `ensnfgucsfefrywacxzx`; datos y auth migrados desde `wpbogwonvbcrcpkjxdvb`; superadmin fusionado (D-15/16/17) con pantallas/APIs/tests; docs (AGENTS, specs, plan, especificacion) alineadas.
