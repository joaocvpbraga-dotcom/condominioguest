-- ============================================================
-- CondoGest - Supabase Schema (completo)
-- Para uma base de dados nova: corre este ficheiro inteiro
-- Para uma BD existente: usa o ficheiro migrations.sql
-- ============================================================

create extension if not exists "uuid-ossp";

-- ============================================================
-- HELPER: retorna o condominio_id do utilizador autenticado
-- ============================================================
create or replace function get_my_condominio_id()
returns uuid language sql security definer stable as $$
  select condominio_id from profiles where id = auth.uid()
$$;

-- ============================================================
-- CONDOMINIOS
-- ============================================================
create table condominios (
  id          uuid primary key default uuid_generate_v4(),
  nome        text not null,
  morada      text not null,
  nif         text,
  created_at  timestamptz default now()
);

-- ============================================================
-- PROFILES (estende auth.users)
-- ============================================================
create table profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  nome           text not null,
  email          text not null,
  telefone       text,
  role           text not null default 'morador'
                   check (role in ('admin', 'morador', 'inquilino')),
  condominio_id  uuid references condominios(id),
  created_at     timestamptz default now()
);

-- Trigger: cria profile básico automaticamente ao registar via Supabase Auth
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, nome, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- FRACOES
-- ============================================================
create table fracoes (
  id              uuid primary key default uuid_generate_v4(),
  condominio_id   uuid not null references condominios(id) on delete cascade,
  numero          text not null,
  andar           text,
  tipo            text not null default 'apartamento',
  area            numeric(8,2),
  permilagem      numeric(8,4) not null default 0,
  proprietario_id uuid references profiles(id),
  created_at      timestamptz default now()
);

-- ============================================================
-- QUOTAS
-- ============================================================
create table quotas (
  id              uuid primary key default uuid_generate_v4(),
  condominio_id   uuid not null references condominios(id) on delete cascade,
  fracao_id       uuid not null references fracoes(id) on delete cascade,
  descricao       text not null,
  valor           numeric(10,2) not null,
  data_vencimento date not null,
  estado          text not null default 'pendente'
                    check (estado in ('pendente', 'pago', 'em_atraso')),
  data_pagamento  date,
  created_at      timestamptz default now()
);

-- ============================================================
-- OCORRENCIAS
-- ============================================================
create table ocorrencias (
  id             uuid primary key default uuid_generate_v4(),
  condominio_id  uuid not null references condominios(id) on delete cascade,
  titulo         text not null,
  descricao      text not null,
  tipo           text not null default 'avaria'
                   check (tipo in ('reclamacao', 'avaria', 'sugestao', 'risco', 'intervencao', 'outro')),
  estado         text not null default 'aberta'
                   check (estado in ('aberta', 'aceite', 'em_analise', 'resolvida', 'fechada')),
  prioridade     text not null default 'media'
                   check (prioridade in ('baixa', 'media', 'alta', 'urgente')),
  autor_id       uuid not null references profiles(id),
  created_at     timestamptz default now()
);

-- ============================================================
-- COMUNICADOS
-- ============================================================
create table comunicados (
  id               uuid primary key default uuid_generate_v4(),
  condominio_id    uuid not null references condominios(id) on delete cascade,
  titulo           text not null,
  conteudo         text not null,
  autor_id         uuid not null references profiles(id),
  destinatario_id  uuid references profiles(id),
  importante       boolean not null default false,
  created_at       timestamptz default now()
);

-- ============================================================
-- DOCUMENTOS
-- ============================================================
create table documentos (
  id             uuid primary key default uuid_generate_v4(),
  condominio_id  uuid not null references condominios(id) on delete cascade,
  nome           text not null,
  descricao      text,
  categoria      text not null default 'outro'
                   check (categoria in ('ata', 'regulamento', 'contrato', 'seguro', 'comprovativo', 'outro')),
  url            text not null,
  tamanho        bigint,
  autor_id       uuid not null references profiles(id),
  morador_id     uuid references profiles(id),
  data_validade  date,
  periodo        text check (periodo in ('mensal', 'trimestral', 'semestral', 'anual')),
  created_at     timestamptz default now()
);

-- ============================================================
-- ORCAMENTOS
-- ============================================================
create table orcamentos (
  id              uuid primary key default uuid_generate_v4(),
  condominio_id   uuid not null references condominios(id) on delete cascade,
  ano             integer not null,
  rubrica         text not null,
  descricao       text,
  valor_previsto  numeric(12,2) not null,
  valor_real      numeric(12,2),
  tipo            text not null check (tipo in ('receita', 'despesa')),
  created_at      timestamptz default now()
);

-- ============================================================
-- FORNECEDORES
-- ============================================================
create table fornecedores (
  id             uuid primary key default uuid_generate_v4(),
  condominio_id  uuid not null references condominios(id) on delete cascade,
  nome           text not null,
  servico        text not null,
  contacto       text,
  email          text,
  nif            text,
  ativo          boolean not null default true,
  created_at     timestamptz default now()
);

-- ============================================================
-- MANUTENCOES
-- ============================================================
create table manutencoes (
  id              uuid primary key default uuid_generate_v4(),
  condominio_id   uuid not null references condominios(id) on delete cascade,
  fornecedor_id   uuid references fornecedores(id),
  titulo          text not null,
  descricao       text,
  estado          text not null default 'agendada'
                    check (estado in ('agendada', 'em_curso', 'concluida', 'cancelada')),
  data_agendada   date,
  data_conclusao  date,
  custo           numeric(10,2),
  created_at      timestamptz default now()
);

-- ============================================================
-- OBRAS
-- ============================================================
create table obras (
  id              uuid primary key default uuid_generate_v4(),
  condominio_id   uuid not null references condominios(id) on delete cascade,
  titulo          text not null,
  descricao       text,
  estado          text not null default 'necessaria'
                    check (estado in ('necessaria', 'aprovada', 'em_curso', 'concluida', 'cancelada')),
  prioridade      text not null default 'media'
                    check (prioridade in ('baixa', 'media', 'alta', 'urgente')),
  custo_estimado  numeric(12,2),
  custo_real      numeric(12,2),
  data_prevista   date,
  data_conclusao  date,
  created_at      timestamptz default now()
);

-- ============================================================
-- PERMISSOES_MORADORES
-- ============================================================
create table permissoes_moradores (
  morador_id       uuid primary key references profiles(id) on delete cascade,
  piscina          boolean not null default false,
  ginasio          boolean not null default false,
  estacionamento   boolean not null default false,
  sala_condominio  boolean not null default false,
  lavandaria       boolean not null default false,
  terracos         boolean not null default false,
  updated_at       timestamptz default now()
);

-- ============================================================
-- REGISTO_CAIXA (saldo mensal)
-- ============================================================
create table registo_caixa (
  id             uuid primary key default uuid_generate_v4(),
  condominio_id  uuid not null references condominios(id) on delete cascade,
  ano            integer not null,
  mes            integer not null check (mes between 1 and 12),
  valor          numeric(12,2) not null,
  notas          text,
  created_at     timestamptz default now(),
  unique (condominio_id, ano, mes)
);

-- ============================================================
-- RECEBIMENTOS_TRIMESTRAIS (recibos de quota)
-- ============================================================
create table recebimentos_trimestrais (
  id             uuid primary key default uuid_generate_v4(),
  condominio_id  uuid not null references condominios(id) on delete cascade,
  ano            integer not null,
  trimestre      integer not null check (trimestre between 1 and 4),
  valor          numeric(12,2) not null,
  notas          text,
  created_at     timestamptz default now(),
  unique (condominio_id, ano, trimestre)
);

-- ============================================================
-- ESPACOS COMUNS
-- ============================================================
create table espacos_comuns (
  id             uuid primary key default uuid_generate_v4(),
  condominio_id  uuid not null references condominios(id) on delete cascade,
  nome           text not null,
  descricao      text,
  capacidade     integer,
  ativo          boolean not null default true
);

-- ============================================================
-- RESERVAS
-- ============================================================
create table reservas (
  id           uuid primary key default uuid_generate_v4(),
  espaco_id    uuid not null references espacos_comuns(id) on delete cascade,
  morador_id   uuid not null references profiles(id),
  data_inicio  timestamptz not null,
  data_fim     timestamptz not null,
  estado       text not null default 'pendente'
                 check (estado in ('pendente', 'aprovada', 'rejeitada', 'cancelada')),
  notas        text,
  created_at   timestamptz default now(),
  constraint reservas_datas_check check (data_fim > data_inicio)
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

alter table condominios              enable row level security;
alter table profiles                 enable row level security;
alter table fracoes                  enable row level security;
alter table quotas                   enable row level security;
alter table ocorrencias              enable row level security;
alter table comunicados              enable row level security;
alter table documentos               enable row level security;
alter table orcamentos               enable row level security;
alter table fornecedores             enable row level security;
alter table manutencoes              enable row level security;
alter table obras                    enable row level security;
alter table permissoes_moradores     enable row level security;
alter table registo_caixa            enable row level security;
alter table recebimentos_trimestrais enable row level security;
alter table espacos_comuns           enable row level security;
alter table reservas                 enable row level security;

-- ── CONDOMINIOS ──────────────────────────────────────────────
create policy "condominios_select" on condominios
  for select using (id = get_my_condominio_id());

-- ── PROFILES ─────────────────────────────────────────────────
-- Ver o próprio perfil OU todos os perfis do mesmo condomínio
create policy "profiles_select" on profiles
  for select using (
    id = auth.uid()
    or condominio_id = get_my_condominio_id()
  );

-- Editar o próprio perfil
create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id);

-- ── SAME-CONDOMINIO SELECT ────────────────────────────────────
create policy "fracoes_select" on fracoes
  for select using (condominio_id = get_my_condominio_id());

create policy "quotas_select" on quotas
  for select using (condominio_id = get_my_condominio_id());

create policy "ocorrencias_select" on ocorrencias
  for select using (condominio_id = get_my_condominio_id());

create policy "comunicados_select" on comunicados
  for select using (condominio_id = get_my_condominio_id());

create policy "documentos_select" on documentos
  for select using (condominio_id = get_my_condominio_id());

create policy "orcamentos_select" on orcamentos
  for select using (condominio_id = get_my_condominio_id());

create policy "fornecedores_select" on fornecedores
  for select using (condominio_id = get_my_condominio_id());

create policy "manutencoes_select" on manutencoes
  for select using (condominio_id = get_my_condominio_id());

create policy "obras_select" on obras
  for select using (condominio_id = get_my_condominio_id());

create policy "registo_caixa_select" on registo_caixa
  for select using (condominio_id = get_my_condominio_id());

create policy "recebimentos_select" on recebimentos_trimestrais
  for select using (condominio_id = get_my_condominio_id());

create policy "espacos_select" on espacos_comuns
  for select using (condominio_id = get_my_condominio_id());

create policy "reservas_select" on reservas
  for select using (auth.uid() = morador_id);

create policy "permissoes_select" on permissoes_moradores
  for select using (
    morador_id = auth.uid()
    or (select condominio_id from profiles where id = morador_id) = get_my_condominio_id()
  );

-- ── WRITES ───────────────────────────────────────────────────
-- A app usa adminSupabase (service role) para a maioria das escritas.
-- Service role bypassa sempre o RLS.
-- Políticas abaixo permitem escritas via anon key em casos específicos.

create policy "ocorrencias_insert" on ocorrencias
  for insert with check (
    auth.uid() = autor_id
    and condominio_id = get_my_condominio_id()
  );

create policy "reservas_insert" on reservas
  for insert with check (auth.uid() = morador_id);
