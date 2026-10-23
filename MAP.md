# MAP del proyecto: MGA Informática — plataforma web v3

> Fuente de verdad del estado real. Si el código y este mapa no coinciden, gana el código y se corrige el mapa.

## Estado actual
- Fase en curso: ninguna (siguiente: FASE 1 — Administración)
- Última fase completada: FASE 0 (commit `3264e01`)

## Stack (real, instalado)
- Next.js 16.4.2 (App Router) + React 19.3 + TypeScript 5 strict
- Tailwind 4 (`@tailwindcss/postcss` para dev webpack; regla turbopack en `next.config.ts`)
- Dev: `next dev --webpack` · Build: `next build` (turbopack) ✓ verificados
- Deps clave: `next-auth@5.0.0-beta.32`, `@supabase/supabase-js`, `zod`, `react-hook-form`, `@hookform/resolvers@5.9.2`, `resend`, `imapflow`, `mailparser`, `sanitize-html`, `@upstash/*`, `framer-motion`, `@next/third-parties`, `server-only`
- Dev deps: `vitest` (+smoke verde), `@playwright/test`, `@axe-core/playwright`, `@lhci/cli`, `supabase` (CLI)
- Node 24.20 / npm 11.19

## Estructura
- `AGENTS.md`: normativa fuente (4 piezas doc, precedencia `AGENTS > especificacion > specs`).
- `especificacion.md`: funcionalidad (pública, dashboard 8 módulos, superadmin).
- `specs/{publico,privado}.md`: specs técnicas por zona.
- `plan-implementacion.md`: 12 fases (0-9, P1, P2, F); Fase 0 completada.
- `app/`: `layout.tsx` (es-AR, fuentes), `page.tsx` placeholder; route groups aún no creados (Fases 1/P1).
- `proxy.ts`: esqueleto con matcher (lógica en Fase 1; reconocido por Next 16 ✓).
- `scripts/check-env.mjs`: valida process.env usadas ⊆ §9 ⊆ `.env.example` ✓.
- `.github/workflows/ci.yml`: lint, typecheck, test, check-env, build, audit.
- `supabase/`: `config.toml` (init CLI), `migrations/` vacío, `seed.sql` placeholder.
- `tests/{unit,contract,e2e}`: unit con smoke; contract/e2e vacíos (hasta Fase 1).
- Docs del kit: LEEME, prompts, .opencode, .agents/skills, plantillas, presets.

## Datos (tablas, entidades, funciones, permisos)
- (pendiente — Fase 1: roles/users/role_permissions + `lib/private/modulos.ts`)

## Rutas / endpoints
- Públicos: `/` placeholder
- Privados: ninguno aún (Fase 1)

## Decisiones técnicas
- P-01 resuelta: librerías propuestas aprobadas (§2).
- P-10 resuelta: `next-auth@5.0.0-beta.32` fijado.
- P-02 resuelta: rate limit con Upstash (env `UPSTASH_REDIS_REST_*` en §9 + `.env.example`).
- `@hookform/resolvers` fijado en 5.9.2 (la 6.x tiene conflicto de peers con `effect`).
- M-11: entorno de test de la BD del POS = **mock del cliente `supabase-master`** (sin segunda instancia local).
- Scaffold sin `src/`; alias `@/*` a raíz; `.gitignore` con `.env*` + `!.env.example`.

## Historial de cambios
- Fase 0: repo inicializado (commit `3264e01`): stack, ESLint con fronteras SEP-2, proxy esqueleto, CI, check-env, Supabase CLI init, tests base. Verificación: lint ✓ typecheck ✓ vitest ✓ check-env ✓ build ✓ audit 0 vulns ✓ dev webpack ✓.
- Docs: creado `especificacion.md`; LandingPage módulo 8; plan de 12 fases generado y alineado en §7.
