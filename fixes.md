# Fixes

## Pendientes
- [ ] **Verificación manual del flujo MFA TOTP completo** (FASE 1, exigible P-08): enrolar desde `/dashboard/seguridad`, verificar primer código, login en dos pasos con y sin MFA. La BD `ensnfgucsfefrywacxzx` ya tiene el esquema y el usuario `gustavo.mgainformatica@gmail.com` (rol Superadmin, `password_changed_at NULL` → forzará cambio de clave en el primer ingreso).
- [ ] **E2E de login/logout y permisos por rol** (FASE 1): requieren usuarios de prueba creados en el proyecto remoto (datos reales no se usan en tests; usar seed sintético o usuarios de prueba dedicados).
- [ ] **Panel POS (FASE 9): verificación manual** con rol Superadmin: alta/edición de empresa, módulos write-only, CRUD del catálogo.
- [ ] **Commit pendiente** de todo el trabajo sin commitear (Fase 1 completa + fusión superadmin D-15/16/17 + migraciones 000000-000004 aplicadas + migración de datos/auth + rate limit en Postgres + docs alineadas).

## Resueltos
- [x] **Login roto: "El servicio de login no está disponible"** (503): el rate limit era fail-closed sobre Upstash y las env `UPSTASH_REDIS_REST_*` estaban vacías. Resuelto con **P-02 decisión B (del dueño):** rate limit en Postgres — migración `000004` (`rate_limit_contadores` + RPC `rate_limit_consumir`, SHA-256, solo service_role), `lib/private/rate-limit.ts` invoca la RPC; `@upstash/*` desinstalado; §9/`.env.example`/docs actualizados. Verificado contra la BD remota: 3 consumos ok y el 4º bloqueado (limite 3).
- [x] **Migración de identidad sin aplicar** (antes bloqueante de FASE 1): resuelto — esquema llevado al proyecto remoto `ensnfgucsfefrywacxzx` (migraciones `000000`–`000004` aplicadas) y datos migrados desde `wpbogwonvbcrcpkjxdvb` (clientes, servicios, prospectos, oportunidades, noticias, roles, role_permissions, auth user).
- [x] **`SUPERADMIN_SECRET` / `POS_SUPABASE_*` en `.env.local`:** retiradas (D-15/D-17); `.env.local` apunta ahora al proyecto `ensnfgucsfefrywacxzx` con claves nuevas.
- [x] `[Ejemplo: El botón Guardar no valida campos vacíos (FASE 3)]`
