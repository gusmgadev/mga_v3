-- 000006 — Frontera RLS/GRANT para aplicaciones (AGENTS §1.3, §4).
-- Revoca todo acceso directo de anon/authenticated al esquema public y elimina
-- las políticas que permitían leer/mutar tablas privadas desde authenticated.
-- El backend usa únicamente service_role; la superficie pública se habilitará
-- por columna en las fases correspondientes.

revoke all privileges on all tables in schema public from anon;
revoke all privileges on all sequences in schema public from anon;
revoke all privileges on all functions in schema public from anon;

revoke all privileges on all tables in schema public from authenticated;
revoke all privileges on all sequences in schema public from authenticated;
revoke all privileges on all functions in schema public from authenticated;

-- Políticas de Radar (migración 000002) que abrían tablas a authenticated
-- filtrando solo por usuario_id, sin evaluar permisos de nodo del dashboard.
drop policy if exists "usuario gestiona sus interacciones" on public.interacciones_prospecto;
drop policy if exists "usuario gestiona sus trabajos" on public.trabajos_radar;
drop policy if exists "usuario gestiona sus resultados" on public.resultados_busqueda;
drop policy if exists "usuario gestiona sus busquedas" on public.busquedas_radar;
drop policy if exists "usuario gestiona sus servicios prospecto" on public.servicios_prospecto;
drop policy if exists "usuario gestiona sus prospectos" on public.prospectos;
drop policy if exists "usuario gestiona sus analisis web" on public.analisis_web;
drop policy if exists "usuario gestiona su uso de api" on public.uso_api_radar;

-- Políticas de identidad que exponían roles/permisos a authenticated.
drop policy if exists "authenticated puede leer roles" on public.roles;
drop policy if exists "authenticated puede leer permisos" on public.role_permissions;
drop policy if exists "usuario ve su propio perfil" on public.users;

-- Políticas heredadas del baseline (por si no fueron eliminadas).
drop policy if exists "admin can modify permissions" on public.role_permissions;
drop policy if exists "anyone can read permissions" on public.role_permissions;
drop policy if exists "admin can manage roles" on public.roles;
drop policy if exists "anyone can read roles" on public.roles;
