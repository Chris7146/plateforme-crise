-- =============================================================================
-- Panneau « Indices » côté participant (évolution du lot 3)
-- =============================================================================
-- Au test du 2 octobre 2026, les indices sont passés inaperçus. Trois besoins :
--
--   1. Enregistrer l'OUVERTURE de chaque indice par un participant, pour que le
--      RETEX sache ce qui a réellement été lu (table hint_opens + RPC open_hint).
--   2. Ne révéler le texte d'un indice qu'à son ouverture : get_team_view()
--      annonce désormais l'indice (identifiant, heure de diffusion, état ouvert)
--      sans son corps ; seul open_hint() renvoie le texte. On ne peut donc pas
--      lire un indice par l'inspection du réseau sans que ce soit journalisé.
--   3. HARMONISER les deux modes de diffusion. Jusqu'ici un indice automatique
--      n'écrivait AUCUN événement : _released() le rendait visible sur le seul
--      temps écoulé. Conséquences : le journal (donc le RETEX) ignorait les
--      indices automatiques, et aucun signal temps réel n'était émis — l'écran
--      participant ne les découvrait qu'à la relecture périodique, jusqu'à 30 s
--      plus tard. release_due_hints(), appelée par la tâche d'échéances déjà
--      planifiée, écrit maintenant le même événement 'hint_sent' et appelle
--      _bump() : les deux modes empruntent exactement le même chemin.
--
-- _released() n'est pas modifiée : l'affichage d'un indice automatique reste
-- piloté par le temps écoulé, l'événement ne fait que le journaliser. Un retard
-- de la tâche système ne retarde donc jamais un indice.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Ouvertures d'indices : une ligne par indice et par participant.
-- La clé primaire porte l'idempotence demandée (une seule ouverture comptée).
-- Pas de clé étrangère vers hints : l'indice appartient au snapshot figé de la
-- session, la variante d'origine peut évoluer ensuite (voir answers.question_id).
-- ---------------------------------------------------------------------------
create table public.hint_opens (
  team_id     uuid not null references public.teams (id) on delete cascade,
  hint_id     uuid not null,
  user_id     uuid not null references auth.users (id) on delete cascade,
  step_index  int not null,
  released_at timestamptz,
  opened_at   timestamptz not null default now(),
  primary key (team_id, hint_id, user_id)
);

alter table public.hint_opens enable row level security;

-- Lecture : l'animateur (RETEX) et le participant pour ses propres ouvertures.
-- AUCUNE règle d'écriture : seule open_hint() (security definer) insère.
create policy hint_opens_select on public.hint_opens for select to authenticated
  using ((select public.is_staff()) or user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Heure de diffusion d'un indice à une équipe.
-- Normalement l'événement 'hint_sent' (manuel comme automatique) ; à défaut,
-- l'instant théorique T+ de l'indice automatique dont l'événement n'a pas
-- encore été écrit par la tâche système. step_started_at est décalé à la
-- reprise de pause : le calcul reste juste après une pause.
-- ---------------------------------------------------------------------------
create function public._hint_released_at(p_team uuid, p_hint uuid) returns timestamptz
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select min(e.created_at)
       from public.events e
      where e.team_id = p_team
        and e.type = 'hint_sent'
        and e.payload ->> 'item_id' = p_hint::text),
    (select t.step_started_at + make_interval(secs => (h ->> 'trigger_offset_seconds')::int)
       from public.teams t, jsonb_array_elements(public._current_step(p_team) -> 'hints') h
      where t.id = p_team
        and h ->> 'id' = p_hint::text
        and h ->> 'trigger_mode' = 'auto'));
$$;

-- ---------------------------------------------------------------------------
-- Journalisation des indices automatiques échus (appelée par la tâche système).
-- Le verrou consultatif évite qu'une exécution qui déborde sur la suivante
-- écrive deux fois le même événement.
-- ---------------------------------------------------------------------------
create function public.release_due_hints() returns int
language plpgsql security definer set search_path = '' as $$
declare
  r record;
  n int := 0;
begin
  if not pg_catalog.pg_try_advisory_xact_lock(pg_catalog.hashtext('release_due_hints')) then
    return 0;
  end if;
  for r in
    select tm.id as team_id, tm.session_id, tm.current_step, (h ->> 'id')::uuid as hint_id
      from public.teams tm
      join public.sessions s on s.id = tm.session_id
      cross join lateral jsonb_array_elements(s.snapshot -> 'steps' -> tm.current_step -> 'hints') h
     where s.status = 'running'
       and tm.status in ('running', 'time_up')
       and h ->> 'trigger_mode' = 'auto'
       and (h ->> 'trigger_offset_seconds')::int <= coalesce(public._elapsed_seconds(tm.id), 0)
       and not exists (select 1 from public.events e
                        where e.team_id = tm.id
                          and e.type = 'hint_sent'
                          and e.payload ->> 'item_id' = h ->> 'id')
  loop
    perform public._log(r.session_id, r.team_id, 'system', 'hint_sent',
      jsonb_build_object('item_id', r.hint_id, 'step_index', r.current_step, 'trigger_mode', 'auto'));
    perform public._bump(r.team_id);
    n := n + 1;
  end loop;
  return n;
end $$;

-- ---------------------------------------------------------------------------
-- Tâche système : les indices automatiques échus sont journalisés au même
-- rythme que les échéances d'étape (Supabase Cron, toutes les 5 s). Aucune
-- nouvelle planification : une seule tâche pour tous les effets du temps qui
-- passe. La valeur de retour (équipes dont l'étape a expiré) est inchangée.
-- ---------------------------------------------------------------------------
create or replace function public.advance_expired_steps() returns int
language plpgsql security definer set search_path = '' as $$
declare
  t record;
  n int := 0;
begin
  perform public.release_due_hints();
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
-- Diffusion manuelle : même payload que la diffusion automatique.
-- La clé 'item_id' ne change pas (elle est lue par _released()).
-- ---------------------------------------------------------------------------
create or replace function public.release_item(p_session_id uuid, p_kind text, p_item_id uuid, p_team_ids uuid[] default null)
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
      jsonb_build_object('item_id', p_item_id, 'step_index', t.current_step, 'trigger_mode', 'manual'));
    perform public._bump(t.id);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Ouverture d'un indice par un participant.
-- Renvoie le texte de l'indice (seul moyen de l'obtenir) et journalise la
-- première ouverture seulement. Idempotente : un indice ouvert reste relisible.
-- ---------------------------------------------------------------------------
create function public.open_hint(p_team_id uuid, p_hint_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  t public.teams;
  s public.sessions;
  h jsonb;
  diffuse timestamptz;
  nouveau boolean;
begin
  if not public.is_team_member(p_team_id) then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  select * into t from public.teams where id = p_team_id;
  select * into s from public.sessions where id = t.session_id;
  if s.status not in ('running', 'paused') then
    raise exception 'L''exercice n''est pas en cours';
  end if;
  if t.status not in ('running', 'time_up') then
    raise exception 'L''étape n''est pas en cours';
  end if;

  -- _released() garantit que l'indice a bien été diffusé À CETTE équipe :
  -- un indice d'une autre équipe ou non encore diffusé n'y figure pas.
  select value into h
    from jsonb_array_elements(public._released(p_team_id, 'hints'))
   where value ->> 'id' = p_hint_id::text;
  if h is null then
    raise exception 'Indice non diffusé à cette équipe';
  end if;

  diffuse := public._hint_released_at(p_team_id, p_hint_id);
  insert into public.hint_opens (team_id, hint_id, user_id, step_index, released_at)
  values (p_team_id, p_hint_id, auth.uid(), t.current_step, diffuse)
  on conflict do nothing
  returning true into nouveau;

  if coalesce(nouveau, false) then
    perform public._log(t.session_id, p_team_id, 'participant', 'hint_opened',
      jsonb_build_object(
        'item_id', p_hint_id,
        'step_index', t.current_step,
        'delay_seconds', case when diffuse is null then null
                              else greatest(0, floor(extract(epoch from (now() - diffuse))))::int end));
  end if;

  return jsonb_build_object('id', p_hint_id, 'body', h ->> 'body',
                            'released_at', diffuse, 'opened', true);
end $$;

-- ---------------------------------------------------------------------------
-- Vue d'équipe : les indices portent désormais leur heure de diffusion et leur
-- état d'ouverture POUR LE PARTICIPANT COURANT. Le corps n'est transmis qu'une
-- fois l'indice ouvert (l'animateur, lui, voit toujours le texte).
-- Le reste de la fonction est inchangé (voir migration initiale).
-- ---------------------------------------------------------------------------
create or replace function public.get_team_view(p_team_id uuid) returns jsonb
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
      'hints', (select coalesce(jsonb_agg(jsonb_build_object(
                         'id', h.item ->> 'id',
                         'released_at', public._hint_released_at(t.id, (h.item ->> 'id')::uuid),
                         'opened', o.user_id is not null,
                         'body', case when o.user_id is not null or public.is_staff()
                                      then h.item ->> 'body' end)
                       order by (h.item ->> 'position')::int), '[]'::jsonb)
                from jsonb_array_elements(public._released(t.id, 'hints')) as h(item)
                left join public.hint_opens o
                       on o.team_id = t.id
                      and o.hint_id = (h.item ->> 'id')::uuid
                      and o.user_id = auth.uid()),
      'questions', (select coalesce(jsonb_agg(q - 'expected_answer' - 'scoring_guide' order by (q ->> 'position')::int), '[]'::jsonb)
                    from jsonb_array_elements(step -> 'questions') q)),
    'drafts', (select coalesce(jsonb_object_agg(d.question_id, d.content), '{}'::jsonb)
               from public.answer_drafts d
               where d.team_id = t.id
                 and d.question_id::text in (select q ->> 'id' from jsonb_array_elements(step -> 'questions') q)),
    'submitted', exists (select 1 from public.answers a where a.team_id = t.id and a.step_index = t.current_step));
end $$;

-- ---------------------------------------------------------------------------
-- Droits : fermé par défaut, ouvert au cas par cas.
-- ---------------------------------------------------------------------------
revoke execute on function public._hint_released_at(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.release_due_hints() from public, anon, authenticated;
revoke execute on function public.advance_expired_steps() from public, anon, authenticated;
revoke execute on function public.open_hint(uuid, uuid) from public, anon;
grant execute on function public.open_hint(uuid, uuid) to authenticated;
