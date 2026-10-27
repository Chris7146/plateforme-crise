\set ON_ERROR_STOP 1
-- ---------------------------------------------------------------------------
-- Vérification du scénario Vladivostok (seed_vladivostok.sql) joué en session :
-- structure, confidentialité des réponses types, diffusion des médias
-- (automatique / manuelle) et parcours complet des 12 étapes.
-- À rejouer via `npm run verif:sql` (base locale jetable), jamais sur le projet hébergé.
-- ---------------------------------------------------------------------------
insert into auth.users (id, is_anonymous) values
 ('00000000-0000-0000-0000-00000000000a', false),
 ('00000000-0000-0000-0000-0000000000b1', true);
insert into public.staff_members (user_id, role, display_name)
values ('00000000-0000-0000-0000-00000000000a', 'admin', 'Admin');

\ir ../seed_vladivostok.sql

create table public._v (k text primary key, v text);
grant all on public._v to authenticated;
create function public._as(u text) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', u, false); end $$;
create function public._check(cond boolean, label text) returns void language plpgsql as $$
begin if cond then raise notice 'OK  %', label; else raise exception 'ÉCHEC %', label; end if; end $$;
grant execute on function public._as(text), public._check(boolean, text) to authenticated;

-- ===== Structure =====
do $$
declare ex uuid := (select id from public.exercises where title like 'Vladivostok%');
begin
  perform public._check(ex is not null, 'modèle Vladivostok créé');
  perform public._check((select count(*) from public.steps where exercise_id = ex) = 12, '12 étapes');
  perform public._check((select sum(duration_seconds) from public.steps where exercise_id = ex) = 107 * 60, '107 minutes');
  perform public._check(not exists (
    select 1 from public.contents c join public.steps s on s.id = c.step_id
    where s.exercise_id = ex and c.type in ('video','image','audio','document') and c.media_path is null),
    'chaque contenu média a un fichier');
  perform public._check((select count(distinct c.media_path) from public.contents c join public.steps s on s.id = c.step_id
    where s.exercise_id = ex) = 28, '28 médias distincts');
  perform public._check(not exists (
    select 1 from public.steps s where s.exercise_id = ex
      and not exists (select 1 from public.questions q where q.step_id = s.id and q.mandatory)),
    'au moins une question obligatoire par étape');
  perform public._check(not exists (
    select 1 from public.questions q join public.steps s on s.id = q.step_id
    where s.exercise_id = ex and (q.expected_answer is null or q.scoring_guide is null)),
    'réponse type et barème partout');
  perform public._check((select count(*) from public.clients where name = 'Vinci Airports') = 1, 'client Vinci Airports');
end $$;

-- ===== Session jouée =====
set role authenticated;
select public._as('00000000-0000-0000-0000-00000000000a');
do $$
declare sess uuid; team uuid;
begin
  insert into public.sessions (exercise_id, title)
  values ((select id from public.exercises where title like 'Vladivostok%'), 'Test Vladivostok') returning id into sess;
  insert into public.teams (session_id, name) values (sess, 'Madrid') returning id into team;
  insert into public._v values ('session', sess), ('team', team),
    ('code', (select join_code from public.teams where id = team));
  perform public.start_session(sess);
end $$;

select public._as('00000000-0000-0000-0000-0000000000b1');
select public.join_team((select v from public._v where k = 'code'), 'Alice', true);

do $$
declare
  team uuid := (select v from public._v where k = 'team')::uuid;
  vue jsonb := public.get_team_view(team);
begin
  perform public._check(vue -> 'step' ->> 'title' = 'Story de l''influenceur', 'étape 1 affichée');
  perform public._check(jsonb_array_length(vue -> 'step' -> 'contents') = 4, 'étape 1 : 4 contenus auto, le manuel est retenu');
  perform public._check(position('expected_answer' in vue::text) = 0 and position('scoring_guide' in vue::text) = 0,
    'aucune réponse type ni barème côté participant');
  perform public._check(public.can_view_media('vladivostok/story-1-influenceur.mp4'), 'story lisible');
  perform public._check(not public.can_view_media('vladivostok/mail-reclamation-youssef.png'), 'mail manuel non lisible avant diffusion');
  perform public._check(not public.can_view_media('vladivostok/vocal-courbet.mp3'), 'média d''une étape à venir non lisible');
end $$;

select public._as('00000000-0000-0000-0000-00000000000a');
select public.release_item((select v from public._v where k = 'session')::uuid, 'content',
  (select (c ->> 'id')::uuid from public.sessions s, jsonb_array_elements(s.snapshot -> 'steps' -> 0 -> 'contents') c
   where s.id = (select v from public._v where k = 'session')::uuid
     and c ->> 'media_path' = 'vladivostok/mail-reclamation-youssef.png'));

select public._as('00000000-0000-0000-0000-0000000000b1');
select public._check(public.can_view_media('vladivostok/mail-reclamation-youssef.png'), 'mail lisible après diffusion manuelle');

-- Parcours complet : l'animateur fait avancer l'équipe jusqu'à l'étape 12
select public._as('00000000-0000-0000-0000-00000000000a');
do $$
declare team uuid := (select v from public._v where k = 'team')::uuid;
begin
  for i in 1..11 loop perform public.advance_team(team); end loop;
end $$;

select public._as('00000000-0000-0000-0000-0000000000b1');
do $$
declare vue jsonb := public.get_team_view((select v from public._v where k = 'team')::uuid);
begin
  perform public._check(vue -> 'step' ->> 'title' = 'Julien Courbet en direct', 'étape 12 atteinte');
  perform public._check((vue -> 'team' ->> 'step_count')::int = 12, '12 étapes dans la session figée');
  perform public._check(public.can_view_media('vladivostok/vocal-courbet.mp3'), 'vocal Courbet lisible à l''étape 12');
end $$;

reset role;
\echo 'Scénario Vladivostok : vérifications terminées.'
