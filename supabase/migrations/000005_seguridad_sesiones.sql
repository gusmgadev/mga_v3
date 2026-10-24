-- 000005 — Endurecimiento de sesiones.
-- - users.activo / users.auth_version para revocación y revalidación.
-- - step_tokens_usados para hacer el step_token de un solo uso.

alter table public.users
  add column if not exists activo boolean not null default true,
  add column if not exists auth_version integer not null default 0;

create table if not exists public.step_tokens_usados (
  token_hash text primary key,
  usado_at timestamptz not null default now()
);

alter table public.step_tokens_usados enable row level security;
revoke all on table public.step_tokens_usados from anon, authenticated, public;
