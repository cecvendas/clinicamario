-- CLÍNICA MÁRIO — ZERO V8.2
-- Criar bucket no Supabase Storage: clinica

create table if not exists public.arquivos (
  id uuid primary key default gen_random_uuid(),
  paciente_id text not null,
  nome_arquivo text not null,
  caminho text not null,
  tipo text,
  tamanho bigint,
  categoria text,
  origem text,
  created_at timestamptz default now()
);

create index if not exists arquivos_paciente_id_idx
on public.arquivos (paciente_id);

-- IMPORTANTE:
-- Salvar no campo caminho apenas:
-- pacientes/10/exames/exame.pdf
-- NÃO salvar URL completa.
