-- 000003 — Auditoría de RPCs (AGENTS §4). Revoke EXECUTE a PUBLIC/anon,
-- SECURITY DEFINER con search_path fijo, y eliminación de rls_auto_enable
-- si es el helper peligroso (se confirma con el cuerpo del origen).

-- ============================================================
-- 1. confirmar_remito: revocar EXECUTE a PUBLIC/anon/authenticated,
--    hacer SECURITY DEFINER con search_path fijo
-- ============================================================
revoke execute on function public.confirmar_remito(uuid) from public;
revoke execute on function public.confirmar_remito(uuid) from anon;
revoke execute on function public.confirmar_remito(uuid) from authenticated;

create or replace function public.confirmar_remito(p_remito_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_item          remito_items%rowtype;
  v_stock_antes   numeric;
  v_stock_despues numeric;
  v_tipo          text;
begin
  select tipo into v_tipo from remitos where id = p_remito_id;

  for v_item in select * from remito_items where remito_id = p_remito_id and producto_id is not null loop
    select stock_actual into v_stock_antes from productos where id = v_item.producto_id;
    if v_tipo = 'entrada' then
      v_stock_despues := v_stock_antes + v_item.cantidad;
    else
      v_stock_despues := v_stock_antes - v_item.cantidad;
    end if;
    update productos set
      stock_actual = v_stock_despues,
      costo        = coalesce(v_item.costo, costo),
      precio_venta = coalesce(v_item.precio_venta, precio_venta)
    where id = v_item.producto_id;
    insert into movimientos_stock (producto_id, remito_id, remito_item_id, tipo, cantidad, costo, stock_antes, stock_despues)
    values (v_item.producto_id, p_remito_id, v_item.id, v_tipo, v_item.cantidad, v_item.costo, v_stock_antes, v_stock_despues);
  end loop;

  update remitos set estado = 'confirmado', confirmado_at = now() where id = p_remito_id;
end;
$function$;

-- ============================================================
-- 2. buscar_productos_por_nombre: revocar EXECUTE a PUBLIC/anon,
--    SECURITY DEFINER con search_path fijo
-- ============================================================
revoke execute on function public.buscar_productos_por_nombre(text, integer) from public;
revoke execute on function public.buscar_productos_por_nombre(text, integer) from anon;
revoke execute on function public.buscar_productos_por_nombre(text, integer) from authenticated;

create or replace function public.buscar_productos_por_nombre(p_nombre text, p_limit integer default 5)
returns table(id uuid, nombre text, codigo text, marca text, unidad text, stock_actual numeric, costo numeric, precio_venta numeric, confianza double precision)
language plpgsql
security definer
set search_path = public
as $function$
begin
  return query
  select
    p.id, p.nombre, p.codigo, p.marca, p.unidad,
    p.stock_actual, p.costo, p.precio_venta,
    greatest(
      similarity(p.nombre, p_nombre),
      coalesce(similarity(p.marca, p_nombre), 0),
      coalesce(similarity(p.codigo, p_nombre), 0)
    )::double precision as confianza
  from productos p
  where p.activo = true
    and (
      similarity(p.nombre, p_nombre) > 0.1
      or p.nombre ilike '%' || p_nombre || '%'
      or p.codigo ilike '%' || p_nombre || '%'
      or coalesce(similarity(p.codigo, p_nombre), 0) > 0.3
    )
  order by confianza desc
  limit p_limit;
end;
$function$;

-- ============================================================
-- 3. rls_auto_enable: revocar EXECUTE a PUBLIC/anon/authenticated
--    (el event trigger la ejecuta como el rol DDL, no necesita EXECUTE
--    de roles de aplicación; la función se conserva por seguridad)
-- ============================================================
revoke execute on function public.rls_auto_enable() from public;
revoke execute on function public.rls_auto_enable() from anon;
revoke execute on function public.rls_auto_enable() from authenticated;

-- ============================================================
-- 4. handle_new_user: revocar EXECUTE a PUBLIC/anon/authenticated
--    (solo la necesita el trigger sobre auth.users)
-- ============================================================
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;
