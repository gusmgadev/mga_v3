-- 000004 — Rate limit en Postgres (P-02, decisión B).
-- Contador compartido por instancia/ventana, invocado por el service role
-- desde el servidor. Identificadores guardados como SHA-256 (no en claro).
-- Fail-closed: sin esta RPC operativa, el login responde 503.

create table if not exists public.rate_limit_contadores (
  prefix            text        not null,
  identificador_hash text       not null,
  ventana_inicio    timestamptz not null,
  contador          integer     not null default 1,
  primary key (prefix, identificador_hash, ventana_inicio)
);

-- RLS sin políticas: la tabla solo se usa vía la RPC (SECURITY DEFINER, owner).
alter table public.rate_limit_contadores enable row level security;
revoke all on table public.rate_limit_contadores from anon, authenticated;
revoke all on table public.rate_limit_contadores from public;

-- ============================================================
-- rate_limit_consumir: ventana fija por (prefix, hash, ventana_inicio).
-- Ventana fija: inicio = floor(epoch_ms / ventana_ms) * ventana_ms.
-- Incrementa salvo que el límite ya se haya alcanzado; devuelve
-- ok/restante/reset_ms y limpia ventanas de más de 24 h.
-- ============================================================
create or replace function public.rate_limit_consumir(
  p_prefix      text,
  p_identificador text,
  p_limite      integer,
  p_ventana_ms  integer
)
returns table (ok boolean, restante integer, reset_ms bigint)
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_hash      text := encode(sha256(convert_to(lower(p_identificador), 'UTF8')), 'hex');
  v_epoch_ms  bigint;
  v_ventana   timestamptz;
  v_contador  integer;
begin
  v_epoch_ms := floor(extract(epoch from now()) * 1000 / p_ventana_ms)::bigint * p_ventana_ms;
  v_ventana := to_timestamp(v_epoch_ms / 1000.0);

  insert into rate_limit_contadores (prefix, identificador_hash, ventana_inicio, contador)
  values (p_prefix, v_hash, v_ventana, 1)
  on conflict (prefix, identificador_hash, ventana_inicio)
  do update set contador = rate_limit_contadores.contador + 1
  where rate_limit_contadores.contador < p_limite
  returning contador into v_contador;

  if v_contador is null then
    -- Límite alcanzado: no se incrementa; se responde bloqueado.
    select contador into v_contador
    from rate_limit_contadores
    where prefix = p_prefix
      and identificador_hash = v_hash
      and ventana_inicio = v_ventana;
    ok := false;
    restante := 0;
  else
    ok := v_contador <= p_limite;
    restante := greatest(p_limite - v_contador, 0);
  end if;

  reset_ms := (v_epoch_ms + p_ventana_ms) - floor(extract(epoch from now()) * 1000)::bigint;

  delete from rate_limit_contadores
  where ventana_inicio < now() - interval '24 hours';

  return next;
end;
$function$;

-- Mínimo privilegio (AGENTS §4): solo service_role (el backend la invoca).
-- En una fase futura se podrá conceder a anon si la zona pública necesita
-- rate limit de contacto (§1.3/SEP-4); por ahora no.
revoke execute on function public.rate_limit_consumir(text, text, integer, integer) from public;
revoke execute on function public.rate_limit_consumir(text, text, integer, integer) from anon;
revoke execute on function public.rate_limit_consumir(text, text, integer, integer) from authenticated;
grant execute on function public.rate_limit_consumir(text, text, integer, integer) to service_role;
