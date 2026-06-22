-- Clínica Mário Zero — base Supabase
-- Execute no SQL Editor do Supabase antes de ativar a sincronização.
-- Esta é a base inicial. RLS avançado pode ser refinado depois.

create table if not exists pacientes (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists profissionais (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists usuarios (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists historico (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists receitas (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists atestados (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists laudos (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists exames_pedidos (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists exames_arquivos (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists sinais_vitais (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists atendimentos (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists auditoria (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- Proteção básica: ativar RLS.
alter table pacientes enable row level security;
alter table profissionais enable row level security;
alter table usuarios enable row level security;
alter table historico enable row level security;
alter table receitas enable row level security;
alter table atestados enable row level security;
alter table laudos enable row level security;
alter table exames_pedidos enable row level security;
alter table exames_arquivos enable row level security;
alter table sinais_vitais enable row level security;
alter table atendimentos enable row level security;
alter table auditoria enable row level security;

-- Durante a fase local/simple app, use políticas com autenticação.
-- Depois que migrarmos para Supabase Auth por usuário, refinamos por perfil.
