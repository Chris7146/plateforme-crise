-- =============================================================================
-- Correctifs après le test « Vladivostok » du 29 octobre 2026
-- =============================================================================
-- Deux défauts constatés en salle, sur la session « Test 1 Vladivostok » :
--
--   1. Un indice AUTOMATIQUE envoyé à la main depuis la console restait
--      invisible. release_item() journalisait bien 'hint_sent', mais _released()
--      ne lisait cet événement que pour les indices en mode 'manual' : un indice
--      auto n'apparaissait qu'à son T+. Le journal affichait « indice envoyé »
--      alors que l'équipe ne voyait rien, et open_hint() le refusait.
--      Désormais, pour les INDICES, un événement 'hint_sent' rend l'indice
--      visible quel que soit son mode. Le comportement des CONTENUS est
--      inchangé (_released() sert aussi à can_view_media()).
--
--   2. Une validation prématurée était irréversible : une seule validation par
--      équipe et par étape, et aucun moyen de revenir en arrière. reopen_answers()
--      permet à l'animateur d'annuler la validation TANT QUE l'équipe est dans
--      l'étape concernée. Les brouillons restent en place : l'équipe retrouve
--      son texte, le corrige et revalide.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Éléments diffusés à une équipe pour l'étape courante.
--
-- Contenus (inchangé)  : auto = temps écoulé ; manuel = événement de diffusion.
-- Indices (corrigé)    : (auto ET T+ écoulé) OU événement 'hint_sent' reçu.
--
-- Un envoi manuel anticipé rend donc l'indice visible tout de suite, et
-- _hint_released_at() — qui retient le PREMIER 'hint_sent' — fait de l'heure
-- d'envoi l'heure de référence du délai de lecture.
-- Seule l'étape courante est lue : un indice d'une autre étape n'apparaît
-- jamais, même si son événement existe.
-- ---------------------------------------------------------------------------
create or replace function public._released(p_team uuid, p_kind text) returns jsonb
language sql stable security definer set search_path = '' as $$
  with step as (select public._current_step(p_team) as j),
       items as (select value as item from step, jsonb_array_elements(step.j -> p_kind))
  select coalesce(jsonb_agg(item order by (item ->> 'position')::int), '[]'::jsonb)
  from items
  where (item ->> 'trigger_mode' = 'auto'
         and (item ->> 'trigger_offset_seconds')::int <= coalesce(public._elapsed_seconds(p_team), 0))
     or ((p_kind = 'hints' or item ->> 'trigger_mode' = 'manual')
         and exists (select 1 from public.events e
                     where e.team_id = p_team
                       and e.type = case p_kind when 'contents' then 'content_released' else 'hint_sent' end
                       and e.payload ->> 'item_id' = item ->> 'id'));
$$;

-- ---------------------------------------------------------------------------
-- Réouverture de la réponse d'une équipe (RPC animateur).
--
-- Autorisée uniquement sur l'étape COURANTE de l'équipe, et seulement si
-- l'équipe y joue encore (running) ou attend l'animateur (time_up). Une fois
-- l'étape quittée, la réouverture n'est pas prévue en V1.
--
-- Effet : les réponses validées et la ligne de notes (note de contenu ET bonus
-- de temps) sont supprimées, après avoir été copiées dans le journal. Les
-- brouillons sont conservés : l'équipe retrouve son texte. Le bonus de temps
-- sera recalculé par submit_answers() à la nouvelle validation.
-- ---------------------------------------------------------------------------
create function public.reopen_answers(p_team_id uuid, p_step_index int) returns void
language plpgsql security definer set search_path = '' as $$
declare
  t        public.teams;
  note     public.scores;
  reponses jsonb;
begin
  perform public._require_staff();
  select * into t from public.teams where id = p_team_id for update;
  if not found then
    raise exception 'Équipe introuvable';
  end if;
  if t.status not in ('running', 'time_up') then
    raise exception 'L''équipe n''a pas d''étape en cours : sa réponse ne peut plus être rouverte';
  end if;
  if p_step_index is distinct from t.current_step then
    raise exception 'Seule l''étape en cours (étape %) peut être rouverte', t.current_step + 1;
  end if;

  -- Copie intégrale AVANT suppression : le journal est la mémoire du RETEX.
  select coalesce(jsonb_agg(jsonb_build_object(
           'question_id', a.question_id, 'content', a.content,
           'submitted_by', a.submitted_by, 'submitted_at', a.submitted_at)
         order by a.submitted_at), '[]'::jsonb)
    into reponses
    from public.answers a
   where a.team_id = p_team_id and a.step_index = p_step_index;

  if jsonb_array_length(reponses) = 0 then
    raise exception 'Aucune réponse validée à rouvrir pour cette étape';
  end if;

  select * into note from public.scores where team_id = p_team_id and step_index = p_step_index;

  delete from public.answers where team_id = p_team_id and step_index = p_step_index;
  delete from public.scores  where team_id = p_team_id and step_index = p_step_index;

  -- L'animateur qui rouvre est enregistré dans events.actor_id par _log().
  perform public._log(t.session_id, p_team_id, 'facilitator', 'answers_reopened',
    jsonb_build_object('step_index', p_step_index,
                       'answers', reponses,
                       'content_score', note.content_score,
                       'time_bonus', note.time_bonus));
  perform public._bump(p_team_id);
end $$;

-- ---------------------------------------------------------------------------
-- Droits : RPC animateur, ouverte aux comptes connectés mais protégée par
-- _require_staff() côté fonction. Aucun participant ne peut l'appeler.
-- ---------------------------------------------------------------------------
revoke execute on function public.reopen_answers(uuid, int) from public, anon;
grant execute on function public.reopen_answers(uuid, int) to authenticated;
