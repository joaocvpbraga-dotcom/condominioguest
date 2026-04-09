-- ============================================================
-- CondoGest - Supabase Schema
-- Corre este SQL no SQL Editor do Supabase
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- CONDOMINIOS
-- ============================================================
create table condominios (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  morada text not null,
  nif text,
  created_at timestamptz default now()
);

-- ============================================================
-- PROFILES (estende auth.users)
-- ============================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  email text not null,
  telefone text,
  role text not null default 'morador' check (role in ('admin', 'morador', 'funcionario')),
  condominio_id uuid references condominios(id),
  created_at timestamptz default now()
);

-- Trigger: cria profile automaticamente ao registar
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, nome, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- FRACOES
-- ============================================================
create table fracoes (
  id uuid primary key default uuid_generate_v4(),
  condominio_id uuid not null references condominios(id) on delete cascade,
  numero text not null,
  andar text,
  tipo text not null default 'apartamento',
  area numeric(8,2),
  permilagem numeric(8,4) not null default 0,
  proprietario_id uuid references profiles(id),
  created_at timestamptz default now()
);

-- ============================================================
-- QUOTAS
-- ============================================================
create table quotas (
  id uuid primary key default uuid_generate_v4(),
  condominio_id uuid not null references condominios(id) on delete cascade,
  fracao_id uuid not null references fracoes(id) on delete cascade,
  descricao text not null,
  valor numeric(10,2) not null,
  data_vencimento date not null,
  estado text not null default 'pendente' check (estado in ('pendente', 'pago', 'em_atraso')),
  data_pagamento date,
  created_at timestamptz default now()
);

-- ============================================================
-- OCORRENCIAS
-- ============================================================
create table ocorrencias (
  id uuid primary key default uuid_generate_v4(),
  condominio_id uuid not null references condominios(id) on delete cascade,
  titulo text not null,
  descricao text not null,
  tipo text not null default 'avaria' check (tipo in ('reclamacao', 'avaria', 'sugestao', 'outro')),
  estado text not null default 'aberta' check (estado in ('aberta', 'em_analise', 'resolvida', 'fechada')),
  prioridade text not null default 'media' check (prioridade in ('baixa', 'media', 'alta', 'urgente')),
  autor_id uuid not null references profiles(id),
  created_at timestamptz default now()
);

-- ============================================================
-- ESPACOS COMUNS
-- ============================================================
create table espacos_comuns (
  id uuid primary key default uuid_generate_v4(),
  condominio_id uuid not null references condominios(id) on delete cascade,
  nome text not null,
  descricao text,
  capacidade integer,
  ativo boolean not null default true
);

-- ============================================================
-- RESERVAS
-- ============================================================
create table reservas (
  id uuid primary key default uuid_generate_v4(),
  espaco_id uuid not null references espacos_comuns(id) on delete cascade,
  morador_id uuid not null references profiles(id),
  data_inicio timestamptz not null,
  data_fim timestamptz not null,
  estado text not null default 'pendente' check (estado in ('pendente', 'aprovada', 'rejeitada', 'cancelada')),
  notas text,
  created_at timestamptz default now(),
  constraint reservas_datas_check check (data_fim > data_inicio)
);

-- ============================================================
-- COMUNICADOS
-- ============================================================
create table comunicados (
  id uuid primary key default uuid_generate_v4(),
  condominio_id uuid not null references condominios(id) on delete cascade,
  titulo text not null,
  conteudo text not null,
  autor_id uuid not null references profiles(id),
  importante boolean not null default false,
  created_at timestamptz default now()
);

-- ============================================================
-- DOCUMENTOS
-- ============================================================
create table documentos (
  id uuid primary key default uuid_generate_v4(),
  condominio_id uuid not null references condominios(id) on delete cascade,
  nome text not null,
  descricao text,
  categoria text not null default 'outro' check (categoria in ('ata', 'regulamento', 'contrato', 'outro')),
  url text not null,
  tamanho bigint,
  autor_id uuid not null references profiles(id),
  created_at timestamptz default now()
);

-- ============================================================
-- ORCAMENTOS
-- ============================================================
create table orcamentos (
  id uuid primary key default uuid_generate_v4(),
  condominio_id uuid not null references condominios(id) on delete cascade,
  ano integer not null,
  rubrica text not null,
  descricao text,
  valor_previsto numeric(12,2) not null,
  valor_real numeric(12,2),
  tipo text not null check (tipo in ('receita', 'despesa')),
  created_at timestamptz default now()
);

-- ============================================================
-- FORNECEDORES
-- ============================================================
create table fornecedores (
  id uuid primary key default uuid_generate_v4(),
  condominio_id uuid not null references condominios(id) on delete cascade,
  nome text not null,
  servico text not null,
  contacto text,
  email text,
  nif text,
  ativo boolean not null default true,
  created_at timestamptz default now()
);

-- ============================================================
-- MANUTENCOES
-- ============================================================
create table manutencoes (
  id uuid primary key default uuid_generate_v4(),
  condominio_id uuid not null references condominios(id) on delete cascade,
  fornecedor_id uuid references fornecedores(id),
  titulo text not null,
  descricao text,
  estado text not null default 'agendada' check (estado in ('agendada', 'em_curso', 'concluida', 'cancelada')),
  data_agendada date,
  data_conclusao date,
  custo numeric(10,2),
  created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Habilitar RLS em todas as tabelas
alter table condominios enable row level security;
alter table profiles enable row level security;
alter table fracoes enable row level security;
alter table quotas enable row level security;
alter table ocorrencias enable row level security;
alter table espacos_comuns enable row level security;
alter table reservas enable row level security;
alter table comunicados enable row level security;
alter table documentos enable row level security;
alter table orcamentos enable row level security;
alter table fornecedores enable row level security;
alter table manutencoes enable row level security;

-- Profiles: utilizador pode ver e editar o próprio perfil
create policy "profiles_select" on profiles for select using (auth.uid() = id);
create policy "profiles_update" on profiles for update using (auth.uid() = id);

-- Para as outras tabelas: utilizadores autenticados do mesmo condomínio podem ler
-- Admins podem inserir/atualizar/apagar
-- (Podes refinar conforme as regras de negócio)

create policy "auth_users_select" on fracoes for select using (auth.role() = 'authenticated');
create policy "auth_users_select" on quotas for select using (auth.role() = 'authenticated');
create policy "auth_users_select" on ocorrencias for select using (auth.role() = 'authenticated');
create policy "auth_users_select" on espacos_comuns for select using (auth.role() = 'authenticated');
create policy "auth_users_select" on reservas for select using (auth.role() = 'authenticated');
create policy "auth_users_select" on comunicados for select using (auth.role() = 'authenticated');
create policy "auth_users_select" on documentos for select using (auth.role() = 'authenticated');
create policy "auth_users_select" on orcamentos for select using (auth.role() = 'authenticated');
create policy "auth_users_select" on fornecedores for select using (auth.role() = 'authenticated');
create policy "auth_users_select" on manutencoes for select using (auth.role() = 'authenticated');
create policy "auth_users_select" on condominios for select using (auth.role() = 'authenticated');

-- Insert/Update/Delete para utilizadores autenticados (refinar para admins depois)
create policy "auth_insert" on ocorrencias for insert with check (auth.uid() = autor_id);
create policy "auth_insert" on reservas for insert with check (auth.uid() = morador_id);
create policy "auth_insert" on comunicados for insert with check (auth.role() = 'authenticated');
