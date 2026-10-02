\set ON_ERROR_STOP 1
-- Identités de test
insert into auth.users (id, is_anonymous) values
 ('00000000-0000-0000-0000-00000000000a', false),  -- animateur admin
 ('00000000-0000-0000-0000-0000000000c1', false),  -- utilisateur connecté non animateur
 ('00000000-0000-0000-0000-0000000000b1', true),   -- participant anonyme équipe 1
 ('00000000-0000-0000-0000-0000000000b2', true);   -- participant anonyme équipe 2
insert into public.staff_members (user_id, role, display_name) values ('00000000-0000-0000-0000-00000000000a', 'admin', 'Admin');

create table public._t (k text primary key, v text);  -- stockage des identifiants entre étapes
grant all on public._t to authenticated;

create function public._as(u text) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', u, false); end $$;
grant execute on function public._as(text) to authenticated;

create function public._expect_error(sql text, label text) returns void language plpgsql as $$
begin
  begin execute sql; exception when others then raise notice 'OK  % (refusé : %)', label, sqlerrm; return; end;
  raise exception 'ÉCHEC % : aurait dû être refusé', label;
end $$;
create function public._check(cond boolean, label text) returns void language plpgsql as $$
begin if cond then raise notice 'OK  %', label; else raise exception 'ÉCHEC %', label; end if; end $$;
grant execute on function public._expect_error(text, text), public._check(boolean, text) to authenticated;

-- ===== 1. L'animateur construit un modèle =====
set role authenticated;
select public._as('00000000-0000-0000-0000-00000000000a');
do $$
declare ex uuid; s1 uuid; s2 uuid;
begin
  insert into public.exercises (kind, title) values ('template', 'Cyberattaque établissement de santé') returning id into ex;
  insert into public.steps (exercise_id, position, title, duration_seconds, end_of_time) values (ex, 0, 'Alerte initiale', 300, 'auto') returning id into s1;
  insert into public.steps (exercise_id, position, title, duration_seconds, end_of_time) values (ex, 1, 'Propagation', 480, 'facilitator') returning id into s2;
  insert into public.contents (step_id, position, type, title, media_path, trigger_mode) values (s1, 0, 'video', 'Appel du standard', 'ex/appel.mp4', 'auto');
  insert into public.contents (step_id, position, type, title, media_path, trigger_mode) values (s1, 1, 'image', 'Écran de rançon', 'ex/rancon.png', 'manual');
  insert into public.questions (step_id, position, type, prompt, options, expected_answer, scoring_guide)
    values (s1, 0, 'single_choice', 'Qui prévenez-vous ?', '[{"id":"a","label":"Astreinte"},{"id":"b","label":"Presse"}]', '["a"]', 'Astreinte = 8 pts');
  -- Trois indices : un manuel diffusé, un automatique à T+60 s, un manuel jamais diffusé.
  insert into public.hints (step_id, position, body, trigger_mode) values (s1, 0, 'Consultez l''annuaire de crise', 'manual');
  insert into public.hints (step_id, position, body, trigger_mode, trigger_offset_seconds) values (s1, 1, 'L''ARS doit être prévenue sous une heure', 'auto', 60);
  insert into public.hints (step_id, position, body, trigger_mode) values (s1, 2, 'Le porte-parole doit rester unique', 'manual');
  insert into public._t values ('template', ex);
end $$;

-- ===== 2. Copie figée =====
do $$
declare tpl uuid := (select v from public._t where k = 'template'); var uuid; vs uuid;
begin
  var := public.create_variant(tpl, null, 'CHU de Valmont');
  insert into public._t values ('variant', var);
  perform public._check((select count(*) from public.steps where exercise_id = var) = 2, 'variante : 2 étapes copiées');
  perform public._check((select count(*) from public.steps where exercise_id = var and source_id is not null) = 2, 'variante : filiation enregistrée');
  perform public._check((select count(*) from public.questions q join public.steps s on s.id = q.step_id where s.exercise_id = var and q.source_id is not null) = 1, 'variante : question copiée avec filiation');
  select id into vs from public.steps where exercise_id = var and position = 0;
  update public.steps set title = 'Alerte initiale (CHU)' where id = vs;
  perform public._check((select is_modified from public.steps where id = vs), 'modification de variante marquée is_modified');
  perform public._check((select title from public.steps where exercise_id = tpl and position = 0) = 'Alerte initiale', 'modèle inchangé (copie figée)');
  update public.steps set title = 'Alerte initiale v2' where exercise_id = tpl and position = 0;
  perform public._check((select title from public.steps where id = vs) = 'Alerte initiale (CHU)', 'mise à jour du modèle non propagée');
end $$;

-- ===== 3. Un utilisateur non animateur ne voit rien =====
select public._as('00000000-0000-0000-0000-0000000000c1');
select public._check((select count(*) from public.exercises) = 0, 'non-animateur : aucun exercice visible');
select public._expect_error($$ select public.create_variant((select v::uuid from public._t where k='template'), null, 'x') $$, 'non-animateur : create_variant');
select public._expect_error($$ insert into public.exercises (kind, title) values ('template','pirate') $$, 'non-animateur : création d''exercice');

-- ===== 4. Session et équipes =====
select public._as('00000000-0000-0000-0000-00000000000a');
do $$
declare var uuid := (select v from public._t where k = 'variant'); ses uuid; t1 uuid; t2 uuid;
begin
  insert into public.sessions (exercise_id, title) values (var, 'Exercice du 24/09') returning id into ses;
  insert into public.teams (session_id, name) values (ses, 'Équipe 1') returning id into t1;
  insert into public.teams (session_id, name) values (ses, 'Équipe 2') returning id into t2;
  insert into public._t values ('session', ses), ('t1', t1), ('t2', t2),
    ('c1', (select join_code from public.teams where id = t1)), ('c2', (select join_code from public.teams where id = t2));
  perform public._check(length((select join_code from public.teams where id = t1)) = 6, 'code d''équipe à 6 caractères');
end $$;

-- ===== 5. Les participants rejoignent =====
select public._as('00000000-0000-0000-0000-0000000000b1');
select public._expect_error($$ select public.join_team((select v from public._t where k='c1'), 'Léa', false) $$, 'rejoindre sans accepter les conditions');
select public._expect_error($$ select public.join_team('ZZZZZZ', 'Léa', true) $$, 'rejoindre avec un code inconnu');
select public._check(public.join_team((select v from public._t where k='c1'), 'Léa', true) = (select v::uuid from public._t where k='t1'), 'P1 rejoint l''équipe 1');
select public._check((get_team_view((select v::uuid from public._t where k='t1')) ->> 'step') is null, 'avant démarrage : aucune étape visible');
select public._as('00000000-0000-0000-0000-0000000000b2');
select public.join_team((select v from public._t where k='c2'), 'Marc', true);

-- ===== 6. Démarrage =====
select public._as('00000000-0000-0000-0000-00000000000a');
select public.start_session((select v::uuid from public._t where k='session'));
select public._expect_error($$ select public.start_session((select v::uuid from public._t where k='session')) $$, 'double démarrage');

-- ===== 7. Isolation et confidentialité côté participant =====
select public._as('00000000-0000-0000-0000-0000000000b1');
do $$
declare t1 uuid := (select v from public._t where k = 't1'); view jsonb;
begin
  view := public.get_team_view(t1);
  perform public._check(view -> 'step' ->> 'title' = 'Alerte initiale (CHU)', 'P1 voit l''étape figée de la variante');
  perform public._check(jsonb_array_length(view -> 'step' -> 'contents') = 1, 'contenu manuel non diffusé invisible');
  perform public._check(jsonb_array_length(view -> 'step' -> 'hints') = 0, 'indice manuel non envoyé invisible');
  perform public._check(not (view::text like '%expected_answer%') and not (view::text like '%Astreinte = 8%'), 'réponse type et barème jamais exposés');
  perform public._check(not (view::text like '%Propagation%'), 'étape à venir non exposée');
end $$;
select public._expect_error($$ select public.get_team_view((select v::uuid from public._t where k='t2')) $$, 'P1 lit la vue de l''équipe 2');
select public._check((select count(*) from public.teams) = 1, 'P1 ne voit que son équipe');
select public._check((select count(*) from public.sessions) = 0, 'P1 ne voit pas les sessions (snapshot)');
select public._check((select count(*) from public.events) = 0, 'P1 ne lit pas le journal');
select public._check((select count(*) from public.exercises) = 0, 'P1 ne voit pas les exercices');
select public._expect_error($$ insert into public.events (session_id, actor_kind, type) values ((select v::uuid from public._t where k='session'), 'system', 'faux') $$, 'P1 écrit dans le journal');
update public.teams set current_step = 1;  -- RLS : aucune ligne modifiable, 0 ligne affectée
select public._check((select count(*) from public.teams where current_step = 1) = 0, 'aucune étape modifiée par P1');
select public._expect_error($$ select public.advance_team((select v::uuid from public._t where k='t1')) $$, 'P1 appelle une RPC animateur');
select public._expect_error($$ select public._advance((select v::uuid from public._t where k='t1'), 'participant', 'triche') $$, 'P1 appelle une fonction interne');
select public._expect_error($$ select public.advance_expired_steps() $$, 'P1 appelle la tâche système');

-- ===== 8. Brouillon partagé et validation =====
do $$
declare t1 uuid := (select v from public._t where k = 't1'); q uuid;
begin
  q := (public.get_team_view(t1) -> 'step' -> 'questions' -> 0 ->> 'id')::uuid;
  insert into public._t values ('q', q);
  perform public.save_draft(t1, q, '["a"]');
  perform public._check((public.get_team_view(t1) -> 'drafts' ->> q::text) = '["a"]', 'brouillon enregistré');
end $$;
select public._expect_error($$ select public.save_draft((select v::uuid from public._t where k='t1'), gen_random_uuid(), '"x"') $$, 'brouillon sur une question hors étape');
select public._as('00000000-0000-0000-0000-0000000000b2');
select public._check((select count(*) from public.answer_drafts) = 0, 'P2 ne voit pas les brouillons de l''équipe 1');
select public._expect_error($$ select public.save_draft((select v::uuid from public._t where k='t1'), (select v::uuid from public._t where k='q'), '"b"') $$, 'P2 écrit dans le brouillon de l''équipe 1');
select public._as('00000000-0000-0000-0000-0000000000b1');
select public.submit_answers((select v::uuid from public._t where k='t1'));
select public._check((select count(*) from public.answers) = 1, 'réponse d''équipe validée');
select public._check((get_team_view((select v::uuid from public._t where k='t1')) ->> 'submitted')::boolean, 'vue : étape validée');
select public._expect_error($$ select public.submit_answers((select v::uuid from public._t where k='t1')) $$, 'double validation');
select public._expect_error($$ select public.save_draft((select v::uuid from public._t where k='t1'), (select v::uuid from public._t where k='q'), '"b"') $$, 'brouillon après validation');
select public.send_team_message((select v::uuid from public._t where k='t1'), 'Qui contacte l''ARS ?');

-- ===== 9. Actions de l'animateur =====
select public._as('00000000-0000-0000-0000-00000000000a');
do $$
declare ses uuid := (select v from public._t where k = 'session'); t1 uuid := (select v from public._t where k = 't1');
        t2 uuid := (select v from public._t where k = 't2'); manual_content uuid; hint uuid; d1 timestamptz;
begin
  perform public._check((select time_bonus from public.scores where team_id = t1) = 2, 'bonus de temps automatique (2/2)');
  select (c ->> 'id')::uuid into manual_content
    from public.sessions s, jsonb_array_elements(s.snapshot -> 'steps' -> 0 -> 'contents') c
    where s.id = ses and c ->> 'trigger_mode' = 'manual';
  select (h ->> 'id')::uuid into hint from public.sessions s, jsonb_array_elements(s.snapshot -> 'steps' -> 0 -> 'hints') h
    where s.id = ses and (h ->> 'position')::int = 0;
  -- Indice jamais diffusé : sert à vérifier qu'il reste inouvrable (section 9 bis).
  insert into public._t values ('hint_cache',
    (select h ->> 'id' from public.sessions s, jsonb_array_elements(s.snapshot -> 'steps' -> 0 -> 'hints') h
      where s.id = ses and (h ->> 'position')::int = 2));
  perform public.release_item(ses, 'content', manual_content, array[t1]);
  perform public.release_item(ses, 'hint', hint, null);
  perform public._check(jsonb_array_length(public.get_team_view(t1) -> 'step' -> 'contents') = 2, 'contenu diffusé à l''équipe 1');
  perform public._check(jsonb_array_length(public.get_team_view(t2) -> 'step' -> 'contents') = 1, 'contenu non diffusé à l''équipe 2');
  perform public._check(jsonb_array_length(public.get_team_view(t2) -> 'step' -> 'hints') = 1, 'indice envoyé à toutes les équipes');
  select step_deadline into d1 from public.teams where id = t2;
  perform public.add_time(t2, 120);
  perform public._check((select step_deadline from public.teams where id = t2) >= d1 + interval '119 seconds', '+2 min appliquées');
  perform public.pause_session(ses);
  perform public._check((select remaining_on_pause_seconds from public.teams where id = t2) between 400 and 420, 'pause : temps restant mémorisé');
  perform public.resume_session(ses);
  perform public._check((select remaining_on_pause_seconds from public.teams where id = t2) is null, 'reprise : échéance recalculée');
  perform public.send_staff_message(t1, 'Pensez au porte-parole');
  perform public._check((select count(*) from public.messages where team_id = t1) = 2, 'messagerie dans les deux sens');
end $$;

-- ===== 9 bis. Indices : diffusion harmonisée et ouverture journalisée =====
-- L'indice automatique a dépassé son T+60 s : la tâche système lui écrit le
-- MÊME événement 'hint_sent' que la diffusion manuelle (un seul chemin).
select public._as('00000000-0000-0000-0000-00000000000a');
update public.teams set step_started_at = now() - interval '70 seconds';
reset role;
select public._check(public.release_due_hints() = 2, 'indice automatique journalisé pour les 2 équipes');
select public._check(public.release_due_hints() = 0, 'indice automatique : aucune double journalisation');
set role authenticated;
select public._as('00000000-0000-0000-0000-00000000000a');
select public._check((select count(*) from public.events where type = 'hint_sent') = 4,
  'diffusion : 2 équipes × (1 indice manuel + 1 automatique)');
select public._check(
  (select count(distinct cles) from public.events e,
     lateral (select array_agg(k order by k) from jsonb_object_keys(e.payload) k) c(cles)
    where e.type = 'hint_sent') = 1,
  'diffusion manuelle et automatique : même forme d''événement');

-- Le délai « diffusion → ouverture » se mesure depuis l'événement de diffusion :
-- cette pause le rend observable (now() est figé pendant le bloc qui suit).
select pg_sleep(1.2);
select public._as('00000000-0000-0000-0000-0000000000b1');
do $$
declare
  t1 uuid := (select v from public._t where k = 't1');
  v jsonb; manuel jsonb; auto jsonb; ouvert jsonb;
begin
  v := public.get_team_view(t1);
  perform public._check(jsonb_array_length(v -> 'step' -> 'hints') = 2, 'indices manuel et automatique visibles');
  manuel := v -> 'step' -> 'hints' -> 0;
  auto   := v -> 'step' -> 'hints' -> 1;
  insert into public._t values ('h_manuel', manuel ->> 'id'), ('h_auto', auto ->> 'id');
  perform public._check(
    (select array_agg(k order by k) from jsonb_object_keys(manuel) k)
      = (select array_agg(k order by k) from jsonb_object_keys(auto) k),
    'indice auto et indice manuel : même forme dans la vue');
  perform public._check(manuel ->> 'body' is null and auto ->> 'body' is null,
    'texte retenu tant que l''indice n''est pas ouvert');
  perform public._check(not (manuel ->> 'opened')::boolean and not (auto ->> 'opened')::boolean,
    'indices annoncés comme non ouverts');
  perform public._check(manuel ->> 'released_at' is not null and auto ->> 'released_at' is not null,
    'heure de diffusion transmise');

  ouvert := public.open_hint(t1, (auto ->> 'id')::uuid);
  perform public._check(ouvert ->> 'body' = 'L''ARS doit être prévenue sous une heure', 'ouverture : texte révélé');
  perform public._check((ouvert ->> 'opened')::boolean, 'ouverture : indice marqué ouvert');
  perform public._check((public.get_team_view(t1) -> 'step' -> 'hints' -> 1 ->> 'body') is not null,
    'indice ouvert : relisible sans nouvelle ouverture');
  perform public._check((public.get_team_view(t1) -> 'step' -> 'hints' -> 0 ->> 'body') is null,
    'indice non ouvert : toujours retenu');
  -- Deuxième ouverture (deuxième clic, rechargement) : sans effet.
  perform public.open_hint(t1, (auto ->> 'id')::uuid);
end $$;
select public._as('00000000-0000-0000-0000-00000000000a');
select public._check((select count(*) from public.events where type = 'hint_opened') = 1,
  'double ouverture : un seul événement');
select public._check((select (payload ->> 'delay_seconds')::int from public.events where type = 'hint_opened') between 1 and 30,
  'délai diffusion → ouverture mesuré');
select public._check((select count(*) from public.hint_opens) = 1, 'une seule ligne d''ouverture');

-- Isolation et écritures directes
select public._as('00000000-0000-0000-0000-0000000000b1');
select public._expect_error($$ select public.open_hint((select v::uuid from public._t where k='t2'), (select v::uuid from public._t where k='h_auto')) $$, 'P1 ouvre un indice de l''équipe 2');
select public._expect_error($$ select public.open_hint((select v::uuid from public._t where k='t1'), (select v::uuid from public._t where k='hint_cache')) $$, 'ouverture d''un indice non diffusé');
select public._expect_error($$ select public.open_hint((select v::uuid from public._t where k='t1'), gen_random_uuid()) $$, 'ouverture d''un indice inexistant');
select public._expect_error($$ insert into public.hint_opens (team_id, hint_id, user_id, step_index) values ((select v::uuid from public._t where k='t1'), (select v::uuid from public._t where k='h_manuel'), '00000000-0000-0000-0000-0000000000b1', 0) $$, 'P1 écrit directement dans les ouvertures');
select public._expect_error($$ select public.release_due_hints() $$, 'P1 appelle la diffusion automatique');
select public._as('00000000-0000-0000-0000-0000000000b2');
select public._expect_error($$ select public.open_hint((select v::uuid from public._t where k='t1'), (select v::uuid from public._t where k='h_auto')) $$, 'P2 ouvre un indice de l''équipe 1');
select public._check((select count(*) from public.hint_opens) = 0, 'P2 ne voit pas les ouvertures de l''équipe 1');
select public._check((public.get_team_view((select v::uuid from public._t where k='t2')) -> 'step' -> 'hints' -> 1 ->> 'opened')::boolean = false,
  'l''ouverture par P1 ne marque pas l''indice de l''équipe 2');

-- ===== 10. Médias : accès seulement si diffusé =====
select public._as('00000000-0000-0000-0000-0000000000b1');
select public._check(public.can_view_media('ex/rancon.png'), 'P1 accède au média diffusé');
select public._as('00000000-0000-0000-0000-0000000000b2');
select public._check(not public.can_view_media('ex/rancon.png'), 'P2 n''accède pas au média non diffusé');
select public._check(public.can_view_media('ex/appel.mp4'), 'P2 accède au média automatique');

-- ===== 11. Échéances (tâche système) =====
reset role;
update public.teams set step_deadline = now() - interval '1 second';
select public._check(public.advance_expired_steps() = 2, 'échéance : 2 équipes traitées');
select public._check((select count(*) from public.teams where current_step = 1 and status = 'running') = 2, 'fin du temps auto : passage à l''étape 2');
update public.teams set step_deadline = now() - interval '1 second';
select public.advance_expired_steps();
select public._check((select count(*) from public.teams where status = 'time_up' and current_step = 1) = 2, 'fin du temps animateur : équipes en attente');
select public._check((select count(*) from public.events where type = 'step_started' and actor_kind = 'system') = 2, 'passages journalisés');

-- ===== 12. Intégrité =====
select public._expect_error($$ update public.events set type = 'x' $$, 'modification du journal');
select public._expect_error($$ delete from public.events $$, 'suppression du journal');
select public._expect_error($$ update public.sessions set snapshot = '{}' $$, 'modification du contenu figé');
set role authenticated;
select public._as('00000000-0000-0000-0000-00000000000a');
select public.stop_session((select v::uuid from public._t where k='session'));
select public._check((select count(*) from public.teams where status = 'finished') = 2, 'arrêt général : toutes les équipes stoppées');
select public._check((select count(*) from public.events) >= 15, 'journal alimenté (' || (select count(*) from public.events) || ' événements)');
reset role;
set role anon;
select public._expect_error($$ select count(*) from public.teams $$, 'rôle anon (non connecté)');
reset role;
set role authenticated;
select public._as('00000000-0000-0000-0000-00000000000a');
delete from public.sessions where id = (select v::uuid from public._t where k='session');
select public._check((select count(*) from public.sessions) = 0, 'suppression d''une session entière (cascade autorisée)');
reset role;
select public._check((select count(*) from public.events) = 0, 'journal de la session supprimé avec elle');
\echo TOUS_LES_TESTS_PASSENT
