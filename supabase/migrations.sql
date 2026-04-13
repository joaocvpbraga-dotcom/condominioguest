-- ============================================================
-- CondoGest - Migrações para BD existente
-- Corre este ficheiro no SQL Editor do Supabase
-- É seguro correr múltiplas vezes (idempotente)
-- ============================================================

-- ── 1. HELPER FUNCTION ───────────────────────────────────────
create or replace function get_my_condominio_id()
returns uuid language sql security definer stable as $$
  select condominio_id from profiles where id = auth.uid()
$$;

-- ── 2. COLUNAS EM FALTA ──────────────────────────────────────

-- comunicados: destinatario_id
alter table comunicados
  add column if not exists destinatario_id uuid references profiles(id);

-- documentos: morador_id, data_validade, periodo
alter table documentos
  add column if not exists morador_id    uuid references profiles(id),
  add column if not exists data_validade date,
  add column if not exists periodo       text check (periodo in ('mensal', 'trimestral', 'semestral', 'anual'));

-- documentos: categoria - alargar constraint para incluir 'seguro' e 'comprovativo'
alter table documentos drop constraint if exists documentos_categoria_check;
alter table documentos add constraint documentos_categoria_check
  check (categoria in ('ata', 'regulamento', 'contrato', 'seguro', 'comprovativo', 'outro'));

-- ── 3. CORRIGIR CONSTRAINTS DE OCORRENCIAS ───────────────────

alter table ocorrencias drop constraint if exists ocorrencias_tipo_check;
alter table ocorrencias add constraint ocorrencias_tipo_check
  check (tipo in ('reclamacao', 'avaria', 'sugestao', 'risco', 'intervencao', 'outro'));

alter table ocorrencias drop constraint if exists ocorrencias_estado_check;
alter table ocorrencias add constraint ocorrencias_estado_check
  check (estado in ('aberta', 'aceite', 'em_analise', 'resolvida', 'fechada'));

-- perfis: migrar role legado funcionario -> inquilino
update profiles set role = 'inquilino' where role = 'funcionario';
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('admin', 'morador', 'inquilino'));

-- ── 4. NOVAS TABELAS ─────────────────────────────────────────

-- OBRAS
create table if not exists obras (
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

-- PERMISSOES_MORADORES
create table if not exists permissoes_moradores (
  morador_id       uuid primary key references profiles(id) on delete cascade,
  piscina          boolean not null default false,
  ginasio          boolean not null default false,
  estacionamento   boolean not null default false,
  sala_condominio  boolean not null default false,
  lavandaria       boolean not null default false,
  terracos         boolean not null default false,
  updated_at       timestamptz default now()
);

-- REGISTO_CAIXA
create table if not exists registo_caixa (
  id             uuid primary key default uuid_generate_v4(),
  condominio_id  uuid not null references condominios(id) on delete cascade,
  ano            integer not null,
  mes            integer not null check (mes between 1 and 12),
  valor          numeric(12,2) not null,
  notas          text,
  created_at     timestamptz default now(),
  unique (condominio_id, ano, mes)
);

-- RECEBIMENTOS_TRIMESTRAIS
create table if not exists recebimentos_trimestrais (
  id             uuid primary key default uuid_generate_v4(),
  condominio_id  uuid not null references condominios(id) on delete cascade,
  ano            integer not null,
  trimestre      integer not null check (trimestre between 1 and 4),
  valor          numeric(12,2) not null,
  notas          text,
  created_at     timestamptz default now(),
  unique (condominio_id, ano, trimestre)
);

-- ── 5. ATIVAR RLS NAS NOVAS TABELAS ─────────────────────────
alter table obras                    enable row level security;
alter table permissoes_moradores     enable row level security;
alter table registo_caixa            enable row level security;
alter table recebimentos_trimestrais enable row level security;

-- ── 6. CORRIGIR POLÍTICAS RLS ────────────────────────────────

-- Profiles: a policy antiga só deixava ver o próprio perfil.
-- Substituir por uma que permite ver todos do mesmo condomínio.
drop policy if exists "profiles_select" on profiles;
create policy "profiles_select" on profiles
  for select using (
    id = auth.uid()
    or condominio_id = get_my_condominio_id()
  );

-- Remover policies com nome duplicado "auth_users_select" (schema antigo)
drop policy if exists "auth_users_select" on fracoes;
drop policy if exists "auth_users_select" on quotas;
drop policy if exists "auth_users_select" on ocorrencias;
drop policy if exists "auth_users_select" on espacos_comuns;
drop policy if exists "auth_users_select" on reservas;
drop policy if exists "auth_users_select" on comunicados;
drop policy if exists "auth_users_select" on documentos;
drop policy if exists "auth_users_select" on orcamentos;
drop policy if exists "auth_users_select" on fornecedores;
drop policy if exists "auth_users_select" on manutencoes;
drop policy if exists "auth_users_select" on condominios;

-- Re-criar policies de SELECT filtradas por condomínio
drop policy if exists "condominios_select"   on condominios;
drop policy if exists "fracoes_select"       on fracoes;
drop policy if exists "quotas_select"        on quotas;
drop policy if exists "ocorrencias_select"   on ocorrencias;
drop policy if exists "comunicados_select"   on comunicados;
drop policy if exists "documentos_select"    on documentos;
drop policy if exists "orcamentos_select"    on orcamentos;
drop policy if exists "fornecedores_select"  on fornecedores;
drop policy if exists "manutencoes_select"   on manutencoes;
drop policy if exists "obras_select"         on obras;
drop policy if exists "registo_caixa_select" on registo_caixa;
drop policy if exists "recebimentos_select"  on recebimentos_trimestrais;
drop policy if exists "espacos_select"       on espacos_comuns;
drop policy if exists "reservas_select"      on reservas;
drop policy if exists "permissoes_select"    on permissoes_moradores;

create policy "condominios_select" on condominios
  for select using (id = get_my_condominio_id());

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

-- Trigger on_auth_user_created: adicionar ON CONFLICT para evitar duplicados
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
