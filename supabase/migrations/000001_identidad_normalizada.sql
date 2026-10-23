-- 000001 — Identidad normalizada sobre baseline mgaServiciosBD.
-- Roles: + is_admin. Users: + password_changed_at. role_permissions: conversión
-- de matriz plana (module + can_view/create/edit/delete) a modelo por nodos (D-12/P-14).
-- Arregla recursión RLS en users (42P17). Requiere 000000.

-- ============================================================
-- 1. roles: agregar is_admin
-- ============================================================
alter table public.roles add column if not exists is_admin boolean not null default false;

-- El rol Administrador (id 1 en el origen) queda como is_admin
update public.roles set is_admin = true where name = 'Administrador';

-- Índice parcial: solo un rol puede ser is_default
create unique index if not exists roles_uniq_is_default on public.roles (id) where is_default;

-- ============================================================
-- 2. users: agregar password_changed_at
-- ============================================================
alter table public.users add column if not exists password_changed_at timestamptz;

-- Backfill: usuarios existentes ya usan el sistema; no forzar cambio de clave
update public.users set password_changed_at = created_at where password_changed_at is null;

-- ============================================================
-- 3. role_permissions: conversión al modelo por nodos (D-12)
-- ============================================================

-- 3a. Crear tabla nueva con el esquema destino
create table public.role_permissions_nodo (
  role_id bigint not null references public.roles (id) on delete cascade,
  nodo text not null,
  acciones text[] not null default '{}',
  primary key (role_id, nodo),
  constraint role_permissions_acciones_validas
    check (acciones <@ array['ver', 'crear', 'editar', 'eliminar']::text[])
);

create index if not exists role_permissions_nodo_idx on public.role_permissions_nodo (nodo);

-- 3b. Migrar datos: mapeo de módulos viejos a nodos del árbol canónico
insert into public.role_permissions_nodo (role_id, nodo, acciones)
select
  rp.role_id,
  mapa.nodo,
  array_remove(array[
    case when rp.can_view   then 'ver'     end,
    case when rp.can_create then 'crear'   end,
    case when rp.can_edit   then 'editar'  end,
    case when rp.can_delete then 'eliminar' end
  ], null) as acciones
from public.role_permissions rp
cross join lateral (
  select case rp.module
    when 'clientes'       then 'altas.clientes'
    when 'activos'        then 'altas.activos'
    when 'servicios'      then 'servicios.servicios'
    when 'presupuestos'   then 'servicios.presupuestos'
    when 'cobranzas'      then 'fondos.cobranzas'
    when 'gastos'         then 'fondos.gastos'
    when 'productos'      then 'inventario.productos'
    when 'remitos'        then 'inventario.remitos'
    when 'oportunidades'  then 'zoologic.oportunidades'
    when 'radar'          then 'prospectos.radar'
    when 'noticias'       then 'landing_page.noticias'
    when 'admin'          then 'administracion'
    else null
  end as nodo
) mapa
where mapa.nodo is not null
  and (rp.can_view or rp.can_create or rp.can_edit or rp.can_delete)
on conflict (role_id, nodo) do update set
  acciones = array(
    select distinct unnest(role_permissions_nodo.acciones || excluded.acciones)
  );

-- 3c. Reemplazar tabla vieja por la nueva
drop table if exists public.role_permissions;
alter table public.role_permissions_nodo rename to role_permissions;

-- ============================================================
-- 4. RLS: arreglar recursión en users (42P17) y endurecer
-- ============================================================

-- Eliminar políticas viejas de users (causan recursión)
drop policy if exists "admin ve todos" on public.users;
drop policy if exists "admin puede actualizar cualquier user" on public.users;
drop policy if exists "usuario ve su propio perfil" on public.users;

-- Política sin recursión: authenticated solo ve su propio perfil
create policy "usuario ve su propio perfil"
  on public.users
  for select
  to authenticated
  using (auth.uid() = id);

-- Eliminar políticas viejas de roles y role_permissions
drop policy if exists "admin can manage roles" on public.roles;
drop policy if exists "anyone can read roles" on public.roles;
drop policy if exists "admin can modify permissions" on public.role_permissions;
drop policy if exists "anyone can read permissions" on public.role_permissions;

-- Nuevas políticas: solo authenticated (service_role bypasea RLS)
create policy "authenticated puede leer roles"
  on public.roles for select to authenticated using (true);

create policy "authenticated puede leer permisos"
  on public.role_permissions for select to authenticated using (true);

-- ============================================================
-- 5. REVOKE mínimo privilegio (anon y authenticated no tocan identidad)
-- ============================================================
revoke all on table public.roles from anon;
revoke all on table public.users from anon;
revoke all on table public.role_permissions from anon;

revoke all on table public.roles from authenticated;
revoke all on table public.users from authenticated;
revoke all on table public.role_permissions from authenticated;

-- authenticated necesita SELECT mínimo para resolver permisos en cliente (sidebar)
grant select on table public.roles to authenticated;
grant select on table public.role_permissions to authenticated;

-- ============================================================
-- 6. Rol Superadmin (D-16): acceso a administracion.empresas y modulos_pos
-- ============================================================
insert into public.roles (name, description, is_default, is_admin)
values ('Superadmin', 'Acceso al panel de empresas y módulos POS', false, false)
on conflict (name) do nothing;

-- Conceder nodos de superadmin al rol Superadmin
insert into public.role_permissions (role_id, nodo, acciones)
select r.id, n.nodo, n.acciones
from public.roles r
cross join (values
  ('administracion.empresas', array['ver','crear','editar','eliminar']),
  ('administracion.modulos_pos', array['ver','crear','editar','eliminar'])
) as n(nodo, acciones)
where r.name = 'Superadmin'
on conflict (role_id, nodo) do nothing;
