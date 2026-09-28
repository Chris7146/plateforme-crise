-- =============================================================================
-- Console animateur (lot 4) : notation et lien visio
-- =============================================================================
-- Deux besoins de la console absents du schéma initial :
--   - enregistrer la note de contenu attribuée par l'animateur, en produisant
--     l'événement correspondant au journal (le RETEX se construit dessus) ;
--   - journaliser l'ouverture du lien visio externe (V1 : lien externe seul,
--     aucune intégration ni enregistrement d'appel).

-- Lien visio de la session (Teams, Meet, Jitsi), configurable par l'animateur.
alter table public.sessions add column if not exists call_url text;

-- ---------------------------------------------------------------------------
-- Note de contenu d'une équipe pour une étape.
-- Le bonus de temps reste calculé automatiquement par submit_answers().
-- ---------------------------------------------------------------------------
create function public.score_answers(p_team_id uuid, p_step_index int, p_content_score numeric)
returns void language plpgsql security definer set search_path = '' as $$
declare
  t public.teams;
  s public.sessions;
  bareme numeric;
begin
  perform public._require_staff();
  select * into t from public.teams where id = p_team_id;
  if not found then
    raise exception 'Équipe introuvable';
  end if;
  select * into s from public.sessions where id = t.session_id;
  if s.snapshot is null then
    raise exception 'La session n''a pas encore démarré';
  end if;
  if p_step_index < 0 or p_step_index >= coalesce(jsonb_array_length(s.snapshot -> 'steps'), 0) then
    raise exception 'Étape hors de l''exercice';
  end if;

  bareme := coalesce((s.snapshot -> 'exercise' ->> 'max_content_score')::numeric, 8);
  if p_content_score is null or p_content_score < 0 or p_content_score > bareme then
    raise exception 'Note hors barème (0 à %)', bareme;
  end if;

  insert into public.scores (team_id, step_index, content_score, scored_by, updated_at)
  values (p_team_id, p_step_index, p_content_score, auth.uid(), now())
  on conflict (team_id, step_index) do update
    set content_score = excluded.content_score,
        scored_by     = excluded.scored_by,
        updated_at    = now();

  perform public._log(t.session_id, p_team_id, 'facilitator', 'answers_scored',
    jsonb_build_object('step_index', p_step_index, 'content_score', p_content_score));
end $$;

-- ---------------------------------------------------------------------------
-- Ouverture du lien visio : journalisée, l'appel lui-même reste externe.
-- ---------------------------------------------------------------------------
create function public.log_call_opened(p_session_id uuid, p_team_id uuid default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  s public.sessions;
begin
  perform public._require_staff();
  select * into s from public.sessions where id = p_session_id;
  if not found then
    raise exception 'Session introuvable';
  end if;
  perform public._log(p_session_id, p_team_id, 'facilitator', 'call_opened',
    jsonb_build_object('url', s.call_url));
end $$;

-- Droits : RPC animateurs, ouvertes aux comptes connectés mais protégées par
-- _require_staff() côté fonction (voir schéma initial).
revoke execute on function public.score_answers(uuid, int, numeric) from public, anon;
revoke execute on function public.log_call_opened(uuid, uuid) from public, anon;
grant execute on function public.score_answers(uuid, int, numeric) to authenticated;
grant execute on function public.log_call_opened(uuid, uuid) to authenticated;
