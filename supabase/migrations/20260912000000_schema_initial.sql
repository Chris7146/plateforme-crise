-- =============================================================================
-- Plateforme de simulation de crise — schéma initial (V1)
-- =============================================================================
-- Principes (détaillés dans CLAUDE.md) :
--   1. Journal d'événements en ajout seul (table events) : colonne vertébrale.
--   2. Minuteurs tenus côté serveur : on stocke des échéances, jamais des décomptes.
--   3. Copie figée : une variante est une copie indépendante de son modèle,
--      avec filiation enregistrée (source_id + is_modified). Aucune propagation.
--   4. Session figée : au démarrage, le contenu est gelé dans sessions.snapshot.
--   5. Isolation des équipes garantie par la base (RLS), jamais par l'interface.
--   6. Les participants n'écrivent QUE via des fonctions (RPC) contrôlées.
--      Ils ne voient JAMAIS les réponses types ni les étapes à venir.
-- Glossaire : modèle = template, variante = variant, étape = step,
--   contenu = content, indice = hint, animateur = facilitator.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Types énumérés
-- ---------------------------------------------------------------------------
create type public.exercise_kind  as enum ('template', 'variant');
create type public.staff_role     as enum ('admin', 'facilitator');
create type public.question_type  as enum ('open', 'single_choice', 'multiple_choice', 'yes_no');
create type public.content_type   as enum ('video', 'image', 'audio', 'document', 'article', 'text');
create type public.trigger_mode   as enum ('auto', 'manual');
create type public.end_of_time    as enum ('auto', 'facilitator');
create type public.session_status as enum ('draft', 'running', 'paused', 'finished', 'stopped');
create type public.team_status    as enum ('waiting', 'running', 'time_up', 'finished');

-- ---------------------------------------------------------------------------
-- Utilitaires
-- ---------------------------------------------------------------------------
create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Filiation « copie figée » : tout élément copié depuis un modèle (source_id
-- non nul) passe à is_modified = true dès qu'un de ses champs change.
create function public.mark_modified() returns trigger
language plpgsql set search_path = '' as $$
declare
  ignored text[] := array['id', 'created_at', 'updated_at', 'is_modified', 'source_id'];
begin
  if new.source_id is not null and not new.is_modified
     and (to_jsonb(new) - ignored) is distinct from (to_jsonb(old) - ignored) then
    new.is_modified := true;
  end if;
  return new;
end $$;

-- Code d'accès d'équipe : 6 caractères sans ambiguïté (pas de O/0, I/1).
create function public.generate_join_code() returns text
language sql volatile set search_path = '' as $$
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '')
  from generate_series(1, 6);
$$;

-- ---------------------------------------------------------------------------
-- Personnel (animateurs, administrateurs)
-- ---------------------------------------------------------------------------
create table public.staff_members (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  role         public.staff_role not null default 'facilitator',
  display_name text not null,
  created_at   timestamptz not null default now()
);

create table public.clients (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Modèles et variantes (même structure, distingués par kind)
-- ---------------------------------------------------------------------------
create table public.exercises (
  id                uuid primary key default gen_random_uuid(),
  kind              public.exercise_kind not null,
  title             text not null,
  description       text,
  client_id         uuid references public.clients (id) on delete restrict,
  source_id         uuid references public.exercises (id) on delete set null,
  max_content_score numeric not null default 8 check (max_content_score > 0),
  max_time_bonus    numeric not null default 2 check (max_time_bonus >= 0),
  created_by        uuid references auth.users (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint template_has_no_source check (kind = 'variant' or source_id is null)
);

create table public.steps (
  id                 uuid primary key default gen_random_uuid(),
  exercise_id        uuid not null references public.exercises (id) on delete cascade,
  position           int not null default 0,
  title              text not null,
  duration_seconds   int not null check (duration_seconds between 30 and 7200),
  end_of_time        public.end_of_time not null default 'auto',
  advance_on_submit  boolean not null default false,
  ambient_audio_path text,
  source_id          uuid references public.steps (id) on delete set null,
  is_modified        boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table public.contents (
  id                     uuid primary key default gen_random_uuid(),
  step_id                uuid not null references public.steps (id) on delete cascade,
  position               int not null default 0,
  type                   public.content_type not null,
  title                  text not null,
  body                   text,
  media_path             text,
  trigger_mode           public.trigger_mode not null default 'auto',
  trigger_offset_seconds int not null default 0 check (trigger_offset_seconds >= 0),
  source_id              uuid references public.contents (id) on delete set null,
  is_modified            boolean not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create table public.questions (
  id              uuid primary key default gen_random_uuid(),
  step_id         uuid not null references public.steps (id) on delete cascade,
  position        int not null default 0,
  type            public.question_type not null,
  prompt          text not null,
  options         jsonb not null default '[]'::jsonb,   -- [{ "id": "a", "label": "..." }]
  expected_answer jsonb,                                -- réponse type : JAMAIS exposée aux participants
  scoring_guide   text,                                 -- barème : JAMAIS exposé aux participants
  mandatory       boolean not null default true,
  source_id       uuid references public.questions (id) on delete set null,
  is_modified     boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table public.hints (
  id                     uuid primary key default gen_random_uuid(),
  step_id                uuid not null references public.steps (id) on delete cascade,
  position               int not null default 0,
  body                   text not null,
  trigger_mode           public.trigger_mode not null default 'manual',
  trigger_offset_seconds int not null default 0 check (trigger_offset_seconds >= 0),
  source_id              uuid references public.hints (id) on delete set null,
  is_modified            boolean not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index on public.steps (exercise_id, position);
create index on public.contents (step_id, position);
create index on public.questions (step_id, position);
create index on public.hints (step_id, position);

-- ---------------------------------------------------------------------------
-- Sessions jouées, équipes, participants
-- ---------------------------------------------------------------------------
create table public.sessions (
  id          uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  title       text not null,
  status      public.session_status not null default 'draft',
  snapshot    jsonb,          -- contenu figé au démarrage : JAMAIS lisible par les participants
  started_at  timestamptz,
  paused_at   timestamptz,
  ended_at    timestamptz,
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

create table public.teams (
  id                        uuid primary key default gen_random_uuid(),
  session_id                uuid not null references public.sessions (id) on delete cascade,
  name                      text not null,
  join_code                 text not null unique default public.generate_join_code(),
  status                    public.team_status not null default 'waiting',
  current_step              int not null default 0,
  step_started_at           timestamptz,
  step_deadline             timestamptz,
  remaining_on_pause_seconds int,
  state_version             bigint not null default 0,  -- incrémenté à chaque changement utile : signal de rafraîchissement
  created_at                timestamptz not null default now()
);
create index on public.teams (session_id);

create table public.participants (
  id                uuid primary key default gen_random_uuid(),
  team_id           uuid not null references public.teams (id) on delete cascade,
  user_id           uuid not null references auth.users (id) on delete cascade,
  display_name      text not null check (char_length(display_name) between 1 and 60),
  accepted_terms_at timestamptz not null,
  joined_at         timestamptz not null default now(),
  unique (team_id, user_id)
);
create index on public.participants (user_id);

-- ---------------------------------------------------------------------------
-- Réponses, notes, messages, observations
-- ---------------------------------------------------------------------------
-- question_id référence une question du snapshot (pas de clé étrangère :
-- la session est figée, la variante peut évoluer ensuite).
create table public.answer_drafts (
  team_id     uuid not null references public.teams (id) on delete cascade,
  question_id uuid not null,
  content     jsonb not null,
  updated_by  uuid references auth.users (id) on delete set null,
  updated_at  timestamptz not null default now(),
  primary key (team_id, question_id)
);

create table public.answers (
  id           uuid primary key default gen_random_uuid(),
  team_id      uuid not null references public.teams (id) on delete cascade,
  step_index   int not null,
  question_id  uuid not null,
  content      jsonb not null,
  submitted_by uuid references auth.users (id) on delete set null,
  submitted_at timestamptz not null default now(),
  unique (team_id, question_id)
);

create table public.scores (
  team_id       uuid not null references public.teams (id) on delete cascade,
  step_index    int not null,
  content_score numeric check (content_score >= 0),
  time_bonus    numeric check (time_bonus >= 0),
  scored_by     uuid references auth.users (id) on delete set null,
  updated_at    timestamptz not null default now(),
  primary key (team_id, step_index)
);

create table public.messages (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  team_id    uuid not null references public.teams (id) on delete cascade,
  from_staff boolean not null,
  author_id  uuid references auth.users (id) on delete set null,
  body       text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at    timestamptz
);
create index on public.messages (team_id, created_at);

create table public.observations (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  team_id    uuid references public.teams (id) on delete cascade,
  step_index int,
  body       text not null,
  author_id  uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Journal d'événements : AJOUT SEUL. Base du RETEX.
-- ---------------------------------------------------------------------------
create table public.events (
  id         bigint generated always as identity primary key,
  session_id uuid not null references public.sessions (id) on delete cascade,
  team_id    uuid references public.teams (id) on delete cascade,
  actor_id   uuid,
  actor_kind text not null check (actor_kind in ('participant', 'facilitator', 'system')),
  type       text not null,
  payload    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default clock_timestamp()
);
create index on public.events (session_id, created_at);
create index on public.events (team_id, type);

-- Seule exception : la suppression en cascade d'une session entière (sessions
-- de test), qui passe par un déclencheur de clé étrangère (profondeur > 1).
create function public.forbid_event_changes() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then
    return old;
  end if;
  raise exception 'Le journal d''événements est en ajout seul : modification et suppression interdites';
end $$;
create trigger events_append_only before update or delete on public.events
  for each row execute function public.forbid_event_changes();

-- La session jouée est figée : le snapshot ne change plus une fois posé.
create function public.forbid_snapshot_change() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.snapshot is not null and new.snapshot is distinct from old.snapshot then
    raise exception 'Le contenu d''une session démarrée est figé';
  end if;
  return new;
end $$;
create trigger sessions_snapshot_frozen before update on public.sessions
  for each row execute function public.forbid_snapshot_change();

-- Déclencheurs updated_at et filiation
create trigger exercises_updated before update on public.exercises for each row execute function public.set_updated_at();
create trigger steps_updated     before update on public.steps     for each row execute function public.set_updated_at();
create trigger contents_updated  before update on public.contents  for each row execute function public.set_updated_at();
create trigger questions_updated before update on public.questions for each row execute function public.set_updated_at();
create trigger hints_updated     before update on public.hints     for each row execute function public.set_updated_at();
create trigger observations_updated before update on public.observations for each row execute function public.set_updated_at();
create trigger steps_modified     before update on public.steps     for each row execute function public.mark_modified();
create trigger contents_modified  before update on public.contents  for each row execute function public.mark_modified();
create trigger questions_modified before update on public.questions for each row execute function public.mark_modified();
create trigger hints_modified     before update on public.hints     for each row execute function public.mark_modified();

-- ---------------------------------------------------------------------------
-- Fonctions d'autorisation (utilisées par les règles RLS)
-- ---------------------------------------------------------------------------
create function public.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.staff_members where user_id = auth.uid());
$$;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.staff_members where user_id = auth.uid() and role = 'admin');
$$;

create function public.is_team_member(p_team_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.participants where team_id = p_team_id and user_id = auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- Fonctions internes (non exposées)
-- ---------------------------------------------------------------------------
create function public._log(p_session uuid, p_team uuid, p_actor_kind text, p_type text, p_payload jsonb default '{}'::jsonb)
returns void language sql security definer set search_path = '' as $$
  insert into public.events (session_id, team_id, actor_id, actor_kind, type, payload)
  values (p_session, p_team, auth.uid(), p_actor_kind, p_type, coalesce(p_payload, '{}'::jsonb));
$$;

create function public._bump(p_team uuid) returns void
language sql security definer set search_path = '' as $$
  update public.teams set state_version = state_version + 1 where id = p_team;
$$;

create function public._require_staff() returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_staff() then
    raise exception 'Action réservée aux animateurs' using errcode = '42501';
  end if;
end $$;

-- Étape courante d'une équipe, lue dans le snapshot figé
create function public._current_step(p_team uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select s.snapshot -> 'steps' -> t.current_step
  from public.teams t join public.sessions s on s.id = t.session_id
  where t.id = p_team;
$$;

-- Secondes écoulées dans l'étape courante (figées pendant une pause)
create function public._elapsed_seconds(p_team uuid) returns int
language sql stable security definer set search_path = '' as $$
  select greatest(0, floor(extract(epoch from (coalesce(s.paused_at, now()) - t.step_started_at))))::int
  from public.teams t join public.sessions s on s.id = t.session_id
  where t.id = p_team and t.step_started_at is not null;
$$;

-- Éléments (contents ou hints) déjà diffusés à une équipe pour l'étape courante
create function public._released(p_team uuid, p_kind text) returns jsonb
language sql stable security definer set search_path = '' as $$
  with step as (select public._current_step(p_team) as j),
       items as (select value as item from step, jsonb_array_elements(step.j -> p_kind))
  select coalesce(jsonb_agg(item order by (item ->> 'position')::int), '[]'::jsonb)
  from items
  where (item ->> 'trigger_mode' = 'auto'
         and (item ->> 'trigger_offset_seconds')::int <= coalesce(public._elapsed_seconds(p_team), 0))
     or (item ->> 'trigger_mode' = 'manual'
         and exists (select 1 from public.events e
                     where e.team_id = p_team
                       and e.type = case p_kind when 'contents' then 'content_released' else 'hint_sent' end
                       and e.payload ->> 'item_id' = item ->> 'id'));
$$;

-- Passage d'une équipe à l'étape suivante (ou fin de parcours)
create function public._advance(p_team uuid, p_actor_kind text, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  t public.teams;
  s public.sessions;
  n int;
  next_duration int;
begin
  select * into t from public.teams where id = p_team for update;
  select * into s from public.sessions where id = t.session_id;
  n := jsonb_array_length(s.snapshot -> 'steps');
  if t.current_step + 1 >= n then
    update public.teams set status = 'finished', step_deadline = null, state_version = state_version + 1
      where id = p_team;
    perform public._log(t.session_id, p_team, p_actor_kind, 'team_finished', jsonb_build_object('reason', p_reason));
  else
    next_duration := (s.snapshot -> 'steps' -> (t.current_step + 1) ->> 'duration_seconds')::int;
    update public.teams
       set current_step = t.current_step + 1,
           status = 'running',
           step_started_at = now(),
           step_deadline = now() + make_interval(secs => next_duration),
           state_version = state_version + 1
     where id = p_team;
    perform public._log(t.session_id, p_team, p_actor_kind, 'step_started',
      jsonb_build_object('step_index', t.current_step + 1, 'reason', p_reason));
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- RPC publiques : utilitaires
-- ---------------------------------------------------------------------------
-- Heure du serveur : le client calcule son décalage d'horloge avec cette valeur.
create function public.server_now() returns timestamptz
language sql stable set search_path = '' as $$ select now(); $$;

-- ---------------------------------------------------------------------------
-- RPC participants
-- ---------------------------------------------------------------------------
create function public.join_team(p_code text, p_display_name text, p_accept_terms boolean)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  t public.teams;
  s public.sessions;
begin
  if auth.uid() is null then
    raise exception 'Connexion requise' using errcode = '42501';
  end if;
  if not coalesce(p_accept_terms, false) then
    raise exception 'Les conditions de participation doivent être acceptées';
  end if;
  select * into t from public.teams where join_code = upper(trim(p_code));
  if not found then
    raise exception 'Code d''équipe inconnu';
  end if;
  select * into s from public.sessions where id = t.session_id;
  if s.status in ('finished', 'stopped') then
    raise exception 'Cet exercice est terminé';
  end if;
  insert into public.participants (team_id, user_id, display_name, accepted_terms_at)
  values (t.id, auth.uid(), trim(p_display_name), now())
  on conflict (team_id, user_id) do update set display_name = excluded.display_name;
  perform public._log(t.session_id, t.id, 'participant', 'participant_joined',
    jsonb_build_object('display_name', trim(p_display_name)));
  perform public._bump(t.id);
  return t.id;
end $$;

-- Vue complète d'une équipe : SEULE source de vérité côté participant.
-- Ne renvoie jamais expected_answer, scoring_guide ni les étapes à venir.
create function public.get_team_view(p_team_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  t public.teams;
  s public.sessions;
  step jsonb;
  result jsonb;
begin
  if not (public.is_team_member(p_team_id) or public.is_staff()) then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  select * into t from public.teams where id = p_team_id;
  select * into s from public.sessions where id = t.session_id;

  result := jsonb_build_object(
    'server_now', now(),
    'session', jsonb_build_object('id', s.id, 'title', s.title, 'status', s.status),
    'team', jsonb_build_object(
      'id', t.id, 'name', t.name, 'status', t.status, 'current_step', t.current_step,
      'step_count', coalesce(jsonb_array_length(s.snapshot -> 'steps'), 0),
      'step_started_at', t.step_started_at, 'step_deadline', t.step_deadline,
      'remaining_on_pause_seconds', t.remaining_on_pause_seconds, 'state_version', t.state_version),
    'participants', (select coalesce(jsonb_agg(jsonb_build_object('name', p.display_name) order by p.joined_at), '[]'::jsonb)
                     from public.participants p where p.team_id = t.id),
    'messages', (select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'from_staff', m.from_staff, 'body', m.body,
                        'created_at', m.created_at) order by m.created_at), '[]'::jsonb)
                 from (select * from public.messages where team_id = t.id order by created_at desc limit 50) m));

  if s.snapshot is null or t.status in ('waiting', 'finished') then
    return result || jsonb_build_object('step', null);
  end if;

  step := public._current_step(t.id);
  return result || jsonb_build_object(
    'step', jsonb_build_object(
      'index', t.current_step,
      'title', step ->> 'title',
      'duration_seconds', (step ->> 'duration_seconds')::int,
      'ambient_audio_path', step ->> 'ambient_audio_path',
      'contents', (select coalesce(jsonb_agg(c - 'trigger_mode' - 'trigger_offset_seconds'), '[]'::jsonb)
                   from jsonb_array_elements(public._released(t.id, 'contents')) c),
      'hints', (select coalesce(jsonb_agg(jsonb_build_object('id', h ->> 'id', 'body', h ->> 'body')), '[]'::jsonb)
                from jsonb_array_elements(public._released(t.id, 'hints')) h),
      'questions', (select coalesce(jsonb_agg(q - 'expected_answer' - 'scoring_guide' order by (q ->> 'position')::int), '[]'::jsonb)
                    from jsonb_array_elements(step -> 'questions') q)),
    'drafts', (select coalesce(jsonb_object_agg(d.question_id, d.content), '{}'::jsonb)
               from public.answer_drafts d
               where d.team_id = t.id
                 and d.question_id::text in (select q ->> 'id' from jsonb_array_elements(step -> 'questions') q)),
    'submitted', exists (select 1 from public.answers a where a.team_id = t.id and a.step_index = t.current_step));
end $$;

create function public.save_draft(p_team_id uuid, p_question_id uuid, p_content jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  t public.teams;
begin
  if not public.is_team_member(p_team_id) then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  select * into t from public.teams where id = p_team_id;
  if t.status <> 'running' then
    raise exception 'L''étape n''est pas en cours';
  end if;
  if not exists (select 1 from jsonb_array_elements(public._current_step(p_team_id) -> 'questions') q
                 where q ->> 'id' = p_question_id::text) then
    raise exception 'Question hors de l''étape courante';
  end if;
  if exists (select 1 from public.answers where team_id = p_team_id and step_index = t.current_step) then
    raise exception 'La réponse de l''équipe a déjà été validée';
  end if;
  insert into public.answer_drafts (team_id, question_id, content, updated_by, updated_at)
  values (p_team_id, p_question_id, p_content, auth.uid(), now())
  on conflict (team_id, question_id)
  do update set content = excluded.content, updated_by = excluded.updated_by, updated_at = now();
end $$;

-- Validation unique de la réponse d'équipe pour l'étape courante
create function public.submit_answers(p_team_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  t public.teams;
  s public.sessions;
  step jsonb;
  q jsonb;
  d public.answer_drafts;
begin
  if not public.is_team_member(p_team_id) then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  select * into t from public.teams where id = p_team_id for update;
  select * into s from public.sessions where id = t.session_id;
  if t.status not in ('running', 'time_up') then
    raise exception 'L''étape n''est pas en cours';
  end if;
  if exists (select 1 from public.answers where team_id = p_team_id and step_index = t.current_step) then
    raise exception 'La réponse de l''équipe a déjà été validée';
  end if;
  step := public._current_step(p_team_id);
  for q in select value from jsonb_array_elements(step -> 'questions') loop
    select * into d from public.answer_drafts where team_id = p_team_id and question_id = (q ->> 'id')::uuid;
    if not found and (q ->> 'mandatory')::boolean then
      raise exception 'Réponse manquante : %', q ->> 'prompt';
    end if;
    if found then
      insert into public.answers (team_id, step_index, question_id, content, submitted_by)
      values (p_team_id, t.current_step, (q ->> 'id')::uuid, d.content, auth.uid());
    end if;
  end loop;
  -- Bonus de temps provisoire : plein si validé avant l'échéance (formule à confirmer, cf. note §3.3)
  insert into public.scores (team_id, step_index, time_bonus)
  values (p_team_id, t.current_step,
          case when t.step_deadline is null or now() <= t.step_deadline
               then (s.snapshot -> 'exercise' ->> 'max_time_bonus')::numeric else 0 end)
  on conflict (team_id, step_index) do update set time_bonus = excluded.time_bonus, updated_at = now();
  perform public._log(t.session_id, p_team_id, 'participant', 'answers_submitted',
    jsonb_build_object('step_index', t.current_step));
  perform public._bump(p_team_id);
  if (step ->> 'advance_on_submit')::boolean then
    perform public._advance(p_team_id, 'system', 'advance_on_submit');
  end if;
end $$;

create function public.send_team_message(p_team_id uuid, p_body text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  t public.teams;
begin
  if not public.is_team_member(p_team_id) then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  select * into t from public.teams where id = p_team_id;
  insert into public.messages (session_id, team_id, from_staff, author_id, body)
  values (t.session_id, p_team_id, false, auth.uid(), trim(p_body));
  perform public._log(t.session_id, p_team_id, 'participant', 'message_sent', jsonb_build_object('body', trim(p_body)));
end $$;

-- ---------------------------------------------------------------------------
-- RPC animateurs
-- ---------------------------------------------------------------------------
-- Crée une variante par COPIE FIGÉE d'un modèle, en enregistrant la filiation.
create function public.create_variant(p_template_id uuid, p_client_id uuid, p_title text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  new_ex uuid;
  st public.steps;
  new_step uuid;
begin
  perform public._require_staff();
  if not exists (select 1 from public.exercises where id = p_template_id and kind = 'template') then
    raise exception 'Modèle introuvable';
  end if;
  insert into public.exercises (kind, title, description, client_id, source_id, max_content_score, max_time_bonus, created_by)
  select 'variant', coalesce(p_title, title), description, p_client_id, id, max_content_score, max_time_bonus, auth.uid()
  from public.exercises where id = p_template_id
  returning id into new_ex;

  for st in select * from public.steps where exercise_id = p_template_id order by position loop
    insert into public.steps (exercise_id, position, title, duration_seconds, end_of_time, advance_on_submit, ambient_audio_path, source_id)
    values (new_ex, st.position, st.title, st.duration_seconds, st.end_of_time, st.advance_on_submit, st.ambient_audio_path, st.id)
    returning id into new_step;
    insert into public.contents (step_id, position, type, title, body, media_path, trigger_mode, trigger_offset_seconds, source_id)
      select new_step, position, type, title, body, media_path, trigger_mode, trigger_offset_seconds, id
      from public.contents where step_id = st.id;
    insert into public.questions (step_id, position, type, prompt, options, expected_answer, scoring_guide, mandatory, source_id)
      select new_step, position, type, prompt, options, expected_answer, scoring_guide, mandatory, id
      from public.questions where step_id = st.id;
    insert into public.hints (step_id, position, body, trigger_mode, trigger_offset_seconds, source_id)
      select new_step, position, body, trigger_mode, trigger_offset_seconds, id
      from public.hints where step_id = st.id;
  end loop;
  return new_ex;
end $$;

-- Réordonne les étapes d'un exercice (liste complète des identifiants dans le nouvel ordre)
create function public.reorder_steps(p_exercise_id uuid, p_step_ids uuid[]) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public._require_staff();
  update public.steps s set position = x.ord - 1
  from unnest(p_step_ids) with ordinality as x(id, ord)
  where s.id = x.id and s.exercise_id = p_exercise_id;
end $$;

-- Démarre une session : fige le contenu (snapshot) et lance toutes les équipes.
create function public.start_session(p_session_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  s public.sessions;
  snap jsonb;
  first_duration int;
begin
  perform public._require_staff();
  select * into s from public.sessions where id = p_session_id for update;
  if s.status <> 'draft' then
    raise exception 'La session a déjà été démarrée';
  end if;
  if not exists (select 1 from public.teams where session_id = p_session_id) then
    raise exception 'Aucune équipe dans cette session';
  end if;

  select jsonb_build_object(
    'exercise', jsonb_build_object('id', e.id, 'title', e.title,
                                   'max_content_score', e.max_content_score, 'max_time_bonus', e.max_time_bonus),
    'steps', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', st.id, 'position', st.position, 'title', st.title, 'duration_seconds', st.duration_seconds,
        'end_of_time', st.end_of_time, 'advance_on_submit', st.advance_on_submit,
        'ambient_audio_path', st.ambient_audio_path,
        'contents', (select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'position', c.position, 'type', c.type,
                        'title', c.title, 'body', c.body, 'media_path', c.media_path, 'trigger_mode', c.trigger_mode,
                        'trigger_offset_seconds', c.trigger_offset_seconds) order by c.position), '[]'::jsonb)
                     from public.contents c where c.step_id = st.id),
        'questions', (select coalesce(jsonb_agg(jsonb_build_object('id', q.id, 'position', q.position, 'type', q.type,
                        'prompt', q.prompt, 'options', q.options, 'mandatory', q.mandatory,
                        'expected_answer', q.expected_answer, 'scoring_guide', q.scoring_guide) order by q.position), '[]'::jsonb)
                      from public.questions q where q.step_id = st.id),
        'hints', (select coalesce(jsonb_agg(jsonb_build_object('id', h.id, 'position', h.position, 'body', h.body,
                        'trigger_mode', h.trigger_mode, 'trigger_offset_seconds', h.trigger_offset_seconds) order by h.position), '[]'::jsonb)
                  from public.hints h where h.step_id = st.id)
      ) order by st.position)
      from public.steps st where st.exercise_id = e.id), '[]'::jsonb))
  into snap
  from public.exercises e where e.id = s.exercise_id;

  if jsonb_array_length(snap -> 'steps') = 0 then
    raise exception 'L''exercice ne comporte aucune étape';
  end if;
  first_duration := (snap -> 'steps' -> 0 ->> 'duration_seconds')::int;

  update public.sessions set snapshot = snap, status = 'running', started_at = now() where id = p_session_id;
  update public.teams
     set status = 'running', current_step = 0, step_started_at = now(),
         step_deadline = now() + make_interval(secs => first_duration), state_version = state_version + 1
   where session_id = p_session_id;
  perform public._log(p_session_id, null, 'facilitator', 'session_started');
end $$;

create function public.advance_team(p_team_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public._require_staff();
  perform public._advance(p_team_id, 'facilitator', 'manual');
end $$;

-- Ajoute (ou retire, si négatif) du temps à l'étape courante d'une équipe
create function public.add_time(p_team_id uuid, p_seconds int) returns void
language plpgsql security definer set search_path = '' as $$
declare
  t public.teams;
begin
  perform public._require_staff();
  select * into t from public.teams where id = p_team_id for update;
  if t.status not in ('running', 'time_up') then
    raise exception 'L''équipe n''a pas d''étape en cours';
  end if;
  update public.teams
     set step_deadline = greatest(now(), coalesce(step_deadline, now())) + make_interval(secs => p_seconds),
         remaining_on_pause_seconds = case when remaining_on_pause_seconds is null then null
                                           else greatest(0, remaining_on_pause_seconds + p_seconds) end,
         status = 'running',
         state_version = state_version + 1
   where id = p_team_id;
  perform public._log(t.session_id, p_team_id, 'facilitator', 'time_changed', jsonb_build_object('seconds', p_seconds));
end $$;

create function public.pause_session(p_session_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public._require_staff();
  update public.sessions set status = 'paused', paused_at = now()
   where id = p_session_id and status = 'running';
  if not found then raise exception 'La session n''est pas en cours'; end if;
  update public.teams
     set remaining_on_pause_seconds = greatest(0, floor(extract(epoch from (step_deadline - now()))))::int,
         state_version = state_version + 1
   where session_id = p_session_id and step_deadline is not null;
  perform public._log(p_session_id, null, 'facilitator', 'session_paused');
end $$;

create function public.resume_session(p_session_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  s public.sessions;
begin
  perform public._require_staff();
  select * into s from public.sessions where id = p_session_id for update;
  if s.status <> 'paused' then raise exception 'La session n''est pas en pause'; end if;
  update public.teams
     set step_deadline = now() + make_interval(secs => remaining_on_pause_seconds),
         step_started_at = step_started_at + (now() - s.paused_at),
         remaining_on_pause_seconds = null,
         state_version = state_version + 1
   where session_id = p_session_id and remaining_on_pause_seconds is not null;
  update public.sessions set status = 'running', paused_at = null where id = p_session_id;
  perform public._log(p_session_id, null, 'facilitator', 'session_resumed');
end $$;

-- Arrêt général : interrompt immédiatement l'exercice pour toutes les équipes
create function public.stop_session(p_session_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public._require_staff();
  update public.sessions set status = 'stopped', ended_at = now(), paused_at = null
   where id = p_session_id and status in ('draft', 'running', 'paused');
  if not found then raise exception 'La session est déjà terminée'; end if;
  update public.teams set status = 'finished', step_deadline = null, state_version = state_version + 1
   where session_id = p_session_id;
  perform public._log(p_session_id, null, 'facilitator', 'session_stopped');
end $$;

create function public.finish_session(p_session_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public._require_staff();
  update public.sessions set status = 'finished', ended_at = now(), paused_at = null
   where id = p_session_id and status in ('running', 'paused');
  if not found then raise exception 'La session n''est pas en cours'; end if;
  update public.teams set status = 'finished', step_deadline = null, state_version = state_version + 1
   where session_id = p_session_id;
  perform public._log(p_session_id, null, 'facilitator', 'session_finished');
end $$;

-- Diffusion manuelle d'un contenu ou envoi d'un indice (p_team_ids null = toutes les équipes)
create function public.release_item(p_session_id uuid, p_kind text, p_item_id uuid, p_team_ids uuid[] default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  t public.teams;
begin
  perform public._require_staff();
  if p_kind not in ('content', 'hint') then raise exception 'Type inconnu : %', p_kind; end if;
  for t in select * from public.teams
            where session_id = p_session_id and (p_team_ids is null or id = any (p_team_ids)) loop
    perform public._log(p_session_id, t.id, 'facilitator',
      case p_kind when 'content' then 'content_released' else 'hint_sent' end,
      jsonb_build_object('item_id', p_item_id));
    perform public._bump(t.id);
  end loop;
end $$;

create function public.send_staff_message(p_team_id uuid, p_body text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  t public.teams;
begin
  perform public._require_staff();
  select * into t from public.teams where id = p_team_id;
  insert into public.messages (session_id, team_id, from_staff, author_id, body)
  values (t.session_id, p_team_id, true, auth.uid(), trim(p_body));
  perform public._log(t.session_id, p_team_id, 'facilitator', 'message_sent', jsonb_build_object('body', trim(p_body)));
  perform public._bump(p_team_id);
end $$;

-- ---------------------------------------------------------------------------
-- Tâche système : gestion des échéances (appelée toutes les 5 s par Supabase Cron)
-- ---------------------------------------------------------------------------
create function public.advance_expired_steps() returns int
language plpgsql security definer set search_path = '' as $$
declare
  t record;
  n int := 0;
begin
  for t in
    select tm.id, tm.session_id, tm.current_step, s.snapshot -> 'steps' -> tm.current_step ->> 'end_of_time' as eot
    from public.teams tm join public.sessions s on s.id = tm.session_id
    where s.status = 'running' and tm.status = 'running' and tm.step_deadline <= now()
    for update of tm skip locked
  loop
    if t.eot = 'auto' then
      perform public._advance(t.id, 'system', 'deadline');
    else
      update public.teams set status = 'time_up', state_version = state_version + 1 where id = t.id;
      perform public._log(t.session_id, t.id, 'system', 'time_up', jsonb_build_object('step_index', t.current_step));
    end if;
    n := n + 1;
  end loop;
  return n;
end $$;

-- ---------------------------------------------------------------------------
-- Droits d'exécution : tout est fermé par défaut, puis ouvert au cas par cas
-- ---------------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;

-- Fonctions appelées par les règles RLS (doivent rester exécutables)
grant execute on function public.is_staff(), public.is_admin(), public.is_team_member(uuid) to authenticated;
-- RPC exposées aux utilisateurs connectés (participants anonymes compris) ;
-- les RPC animateurs vérifient elles-mêmes le rôle via _require_staff().
grant execute on function
  public.server_now(),
  public.join_team(text, text, boolean),
  public.get_team_view(uuid),
  public.save_draft(uuid, uuid, jsonb),
  public.submit_answers(uuid),
  public.send_team_message(uuid, text),
  public.create_variant(uuid, uuid, text),
  public.reorder_steps(uuid, uuid[]),
  public.start_session(uuid),
  public.advance_team(uuid),
  public.add_time(uuid, int),
  public.pause_session(uuid),
  public.resume_session(uuid),
  public.stop_session(uuid),
  public.finish_session(uuid),
  public.release_item(uuid, text, uuid, uuid[]),
  public.send_staff_message(uuid, text)
to authenticated;
-- Fonctions de déclencheurs : exécutées par le système uniquement
grant execute on function public.set_updated_at(), public.mark_modified(), public.generate_join_code(),
  public.forbid_event_changes(), public.forbid_snapshot_change() to authenticated;

-- ---------------------------------------------------------------------------
-- Règles d'accès (RLS) : activées sur TOUTES les tables
-- ---------------------------------------------------------------------------
alter table public.staff_members enable row level security;
alter table public.clients       enable row level security;
alter table public.exercises     enable row level security;
alter table public.steps         enable row level security;
alter table public.contents      enable row level security;
alter table public.questions     enable row level security;
alter table public.hints         enable row level security;
alter table public.sessions      enable row level security;
alter table public.teams         enable row level security;
alter table public.participants  enable row level security;
alter table public.answer_drafts enable row level security;
alter table public.answers       enable row level security;
alter table public.scores        enable row level security;
alter table public.messages      enable row level security;
alter table public.observations  enable row level security;
alter table public.events        enable row level security;

-- Personnel : chacun voit sa ligne ; l'administrateur gère l'équipe d'animation
create policy staff_select on public.staff_members for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_staff()));
create policy staff_admin_write on public.staff_members for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Contenus de préparation : animateurs uniquement
create policy clients_staff   on public.clients   for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy exercises_staff on public.exercises for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy steps_staff     on public.steps     for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy contents_staff  on public.contents  for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy questions_staff on public.questions for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy hints_staff     on public.hints     for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));

-- Sessions : animateurs uniquement (le snapshot contient les réponses types)
create policy sessions_staff on public.sessions for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

-- Équipes : animateurs en écriture ; participants en lecture de LEUR équipe
create policy teams_staff on public.teams for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy teams_member_select on public.teams for select to authenticated
  using (public.is_team_member(id));

-- Participants, brouillons, réponses, messages : lecture par l'équipe concernée ;
-- écriture uniquement via les RPC.
create policy participants_select on public.participants for select to authenticated
  using ((select public.is_staff()) or public.is_team_member(team_id));
create policy participants_staff_delete on public.participants for delete to authenticated
  using ((select public.is_staff()));
create policy drafts_select on public.answer_drafts for select to authenticated
  using ((select public.is_staff()) or public.is_team_member(team_id));
create policy answers_select on public.answers for select to authenticated
  using ((select public.is_staff()) or public.is_team_member(team_id));
create policy messages_select on public.messages for select to authenticated
  using ((select public.is_staff()) or public.is_team_member(team_id));
create policy messages_staff_update on public.messages for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

-- Notes et observations : animateurs uniquement
create policy scores_staff on public.scores for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy observations_staff on public.observations for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

-- Journal : lecture animateurs ; AUCUNE écriture directe (uniquement via les RPC)
create policy events_staff_select on public.events for select to authenticated
  using ((select public.is_staff()));

-- Aucun accès pour le rôle anon (non connecté) : toute l'application exige une
-- connexion, anonyme pour les participants, par e-mail pour les animateurs.
revoke all on all tables in schema public from anon;

-- ---------------------------------------------------------------------------
-- Temps réel : les clients écoutent ces tables (filtrées par RLS) puis
-- rappellent get_team_view() — jamais de reconstruction d'état à partir des messages.
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.teams, public.answer_drafts, public.messages, public.answers, public.events;

-- ---------------------------------------------------------------------------
-- Stockage des médias : compartiment privé
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('media', 'media', false)
on conflict (id) do nothing;

-- Un participant ne peut lire un média que s'il est diffusé à son équipe
create function public.can_view_media(p_path text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.participants p
    join public.teams t on t.id = p.team_id
    where p.user_id = auth.uid()
      and t.status in ('running', 'time_up')
      and (   public._current_step(t.id) ->> 'ambient_audio_path' = p_path
           or exists (select 1 from jsonb_array_elements(public._released(t.id, 'contents')) c
                      where c ->> 'media_path' = p_path)));
$$;
revoke execute on function public.can_view_media(text) from public, anon;
grant execute on function public.can_view_media(text) to authenticated;

create policy media_staff_all on storage.objects for all to authenticated
  using (bucket_id = 'media' and (select public.is_staff()))
  with check (bucket_id = 'media' and (select public.is_staff()));
create policy media_participant_read on storage.objects for select to authenticated
  using (bucket_id = 'media' and public.can_view_media(name));
