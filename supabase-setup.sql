create table if not exists public.trip_state (
  key text primary key,
  value jsonb not null default 'null'::jsonb,
  updated_at timestamptz not null default now(),
  constraint trip_state_key_length check (char_length(key) between 1 and 120)
);

alter table public.trip_state enable row level security;

-- 瀏覽器不能直接碰這張表；只有 Edge Function 使用伺服器端 secret key 存取。
revoke all on table public.trip_state from anon;
revoke all on table public.trip_state from authenticated;
