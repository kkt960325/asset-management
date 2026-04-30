-- Assets table for per-user portfolio data
create table if not exists assets (
  id          text        not null,
  user_id     text        not null,
  data        jsonb       not null,
  updated_at  timestamptz not null default now(),
  primary key (id, user_id)
);

create index if not exists assets_user_id_idx on assets (user_id);
