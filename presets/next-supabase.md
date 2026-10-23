# Preset de stack: Next.js + Supabase

Copia este bloque en la sección "Stack tecnológico" de AGENTS.md y ajústalo.

## Stack
- Framework: Next.js (última versión estable, App Router) con React y TypeScript estricto
- CSS: [nativo + CSS Modules / el que elijas]
- Backend: Supabase (PostgreSQL, Auth, Storage, RLS, funciones RPC)
- Lógica de servidor: Server Actions y Route Handlers de Next
- Clientes de Supabase: `@supabase/supabase-js` y `@supabase/ssr` (navegador, servidor y admin)
- Despliegue: Vercel (u otro hosting compatible con Next)
- Librerías autorizadas: [lista cerrada]

## Reglas específicas (añádelas a Reglas innegociables y a Seguridad)
- La clave `service_role` solo existe en el servidor: variable sin prefijo `NEXT_PUBLIC_` y módulo con `import 'server-only'`. Nunca en componentes de cliente.
- Toda Server Action y Route Handler protegidos verifican la sesión con `getUser()`; el middleware no basta.
- RLS activado en TODAS las tablas. El rol `anon` nunca accede a tablas privadas.
- Las funciones RPC revocan `EXECUTE` a `PUBLIC` y `anon` salvo las que deban ser públicas, y las `SECURITY DEFINER` fijan `search_path`.
- Si hay un único usuario dueño del sistema, crea una función `is_owner()` y úsala en todas las políticas del rol `authenticated`.
- Cada cambio de esquema es una migración nueva en `supabase/migrations/`; nunca se edita una ya aplicada.
- Componentes de servidor por defecto; `"use client"` solo donde haga falta interactividad.
- Acceso a datos en `src/services/`, mutaciones en `src/actions/`; los componentes no llaman a Supabase directamente.
- Buckets de Storage con límites de tipo y tamaño; archivos privados con URLs firmadas de corta duración.
- Registro público de usuarios desactivado si el sistema es de un solo usuario.

## Estructura de carpetas sugerida
- `supabase/migrations/`
- `src/app/`, `src/lib/supabase/` (cliente, servidor, admin), `src/services/`, `src/actions/`, `src/components/ui/`
- `middleware.ts` (o `proxy.ts` según la versión de Next), `.env.local`, `.env.example`

## Desarrollo local (opcional)
La CLI de Supabase permite desarrollar con una base local (necesita Docker): `supabase init`, `supabase start`, `supabase migration new <nombre>`, `supabase db reset` y, para enviar a la nube, `supabase link` y `supabase db push`. Confirma los comandos actuales en la documentación oficial.
