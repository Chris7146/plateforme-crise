-- ---------------------------------------------------------------------------
-- Jeu de démonstration — modèle « Cyberattaque — établissement de santé »
--
-- Contenu fictif destiné à essayer l'éditeur d'étapes (lot 1) : 6 étapes,
-- 53 minutes au total, reprenant le scénario de `docs/maquettes/editeur-etapes.html`.
--
-- CE N'EST PAS UNE MIGRATION : ne pas le placer dans `supabase/migrations/`,
-- il ne modifie aucun schéma et n'est pas appliqué par `npx supabase db push`.
-- À exécuter à la demande depuis l'éditeur SQL du projet Supabase.
--
-- Le script est sans effet s'il a déjà été joué (il vérifie la présence du
-- modèle avant d'écrire) : aucune suppression, aucun doublon, rejouable.
--
-- Deux choses restent volontairement à faire depuis l'interface, puisque
-- ce sont justement les fonctions à éprouver :
--   - créer une variante (uniquement via la RPC `create_variant()`) ;
--   - téléverser les médias (les contenus créés ici sont des articles et
--     des textes, sans fichier dans le compartiment `media`).
-- ---------------------------------------------------------------------------

do $$
declare
  v_exercise uuid;
  v_step     uuid;
  v_auteur   uuid := (select user_id from public.staff_members order by created_at limit 1);
begin
  if exists (select 1 from public.exercises
             where title = 'Cyberattaque — établissement de santé' and kind = 'template') then
    raise notice 'Jeu de démonstration déjà présent : rien à faire.';
    return;
  end if;

  -- Clients de démonstration, pour essayer le choix du client à la création d'une variante.
  insert into public.clients (name)
  select 'CHU de Valmont'
  where not exists (select 1 from public.clients where name = 'CHU de Valmont');

  insert into public.clients (name)
  select 'Clinique du Parc'
  where not exists (select 1 from public.clients where name = 'Clinique du Parc');

  insert into public.exercises (kind, title, description, created_by)
  values (
    'template',
    'Cyberattaque — établissement de santé',
    'Rançongiciel sur le système d''information hospitalier : perte du dossier patient '
      || 'informatisé, bascule en mode dégradé, pression médiatique. Tronc commun déclinable '
      || 'par établissement.',
    v_auteur)
  returning id into v_exercise;

  -- === Étape 1 — Alerte initiale (5 min) ===================================
  insert into public.steps (exercise_id, position, title, duration_seconds, end_of_time)
  values (v_exercise, 0, 'Alerte initiale', 5 * 60, 'facilitator')
  returning id into v_step;

  insert into public.contents (step_id, position, type, title, body, trigger_mode, trigger_offset_seconds)
  values (v_step, 0, 'text', 'Appel du standard',
    '07 h 12 — Le standard signale que plusieurs services ne parviennent plus à ouvrir '
      || 'le dossier patient. Les postes affichent un message réclamant un paiement en '
      || 'cryptomonnaie. Les admissions se font sur papier.',
    'auto', 0);

  insert into public.questions (step_id, position, type, prompt, expected_answer, scoring_guide, mandatory)
  values (v_step, 0, 'open',
    'Quelles sont vos trois premières actions, dans l''ordre ?',
    to_jsonb('Isoler le réseau (débrancher les liaisons inter-sites), alerter la direction et la '
      || 'DSI d''astreinte, déclencher la cellule de crise et le mode dégradé papier.'::text),
    'Isolement réseau : 3 pts · Alerte hiérarchique et DSI : 3 pts · Déclenchement cellule de crise : 2 pts',
    true);

  insert into public.hints (step_id, position, body, trigger_mode, trigger_offset_seconds)
  values (v_step, 0, 'Le SIH est-il accessible depuis un autre site de l''établissement ?', 'manual', 0);

  -- === Étape 2 — Premiers constats (10 min) ================================
  insert into public.steps (exercise_id, position, title, duration_seconds, end_of_time)
  values (v_exercise, 1, 'Premiers constats', 10 * 60, 'auto')
  returning id into v_step;

  insert into public.contents (step_id, position, type, title, body, trigger_mode, trigger_offset_seconds)
  values (v_step, 0, 'text', 'Point de situation de la DSI',
    'La sauvegarde de la nuit est intacte mais son intégrité doit être vérifiée. '
      || 'Les 40 postes des urgences et de l''imagerie sont chiffrés. Le laboratoire fonctionne '
      || 'en autonomie. Délai de restauration estimé : 48 heures.',
    'auto', 0);

  insert into public.contents (step_id, position, type, title, body, trigger_mode, trigger_offset_seconds)
  values (v_step, 1, 'article', 'Le Courrier de Valmont · flash info',
    '« Le CHU de la ville victime d''une panne informatique majeure » — Selon nos informations, '
      || 'les urgences de l''établissement fonctionneraient au ralenti depuis ce matin. '
      || 'La direction n''a pas répondu à nos sollicitations.',
    'auto', 2 * 60);

  insert into public.questions (step_id, position, type, prompt, options, expected_answer, scoring_guide, mandatory)
  values (v_step, 0, 'multiple_choice',
    'Quelles décisions prenez-vous dans l''heure ?',
    '[{"id":"a","label":"Déclencher le plan blanc"},
      {"id":"b","label":"Dérouter les urgences vers les établissements voisins"},
      {"id":"c","label":"Payer la rançon"},
      {"id":"d","label":"Déposer plainte et signaler à l''ANSSI"},
      {"id":"e","label":"Couper les accès distants des prestataires"}]'::jsonb,
    to_jsonb('a, b, d et e. Le paiement de la rançon (c) est exclu : il ne garantit rien '
      || 'et finance l''attaquant.'::text),
    '3 bonnes décisions attendues au minimum · 10 pts · −4 pts si la rançon est payée',
    true);

  insert into public.hints (step_id, position, body, trigger_mode, trigger_offset_seconds)
  values (v_step, 0, 'Le signalement à l''ANSSI et à l''ARS est obligatoire pour un établissement de santé.',
    'auto', 6 * 60);

  -- === Étape 3 — Propagation (8 min) =======================================
  insert into public.steps (exercise_id, position, title, duration_seconds, end_of_time, advance_on_submit)
  values (v_exercise, 2, 'Propagation', 8 * 60, 'facilitator', true)
  returning id into v_step;

  insert into public.contents (step_id, position, type, title, body, trigger_mode, trigger_offset_seconds)
  values (v_step, 0, 'text', 'Alerte du laboratoire',
    'Le laboratoire de biologie signale à son tour des postes inaccessibles. '
      || 'L''attaque progresse malgré l''isolement annoncé.',
    'auto', 0);

  insert into public.questions (step_id, position, type, prompt, expected_answer, scoring_guide, mandatory)
  values (v_step, 0, 'yes_no',
    'Activez-vous la cellule de crise élargie (direction générale, ARS, forces de l''ordre) ?',
    to_jsonb('Oui. La propagation confirmée impose de passer à la cellule élargie.'::text),
    'Réponse « oui » : 4 pts · justification cohérente attendue à l''oral',
    true);

  insert into public.questions (step_id, position, type, prompt, expected_answer, scoring_guide, mandatory)
  values (v_step, 1, 'open',
    'Un journaliste appelle : que lui répondez-vous ?',
    to_jsonb('Confirmer l''incident sans détail technique, indiquer la continuité des soins, '
      || 'annoncer un point presse, ne jamais évoquer la rançon ni l''ampleur exacte.'::text),
    'Grille animateur : transparence maîtrisée, pas de détail technique, porte-parole unique · 10 pts',
    false);

  insert into public.hints (step_id, position, body, trigger_mode, trigger_offset_seconds)
  values (v_step, 0, 'Un seul porte-parole : qui ? La direction ou le chargé de communication ?', 'manual', 0);

  -- === Étape 4 — Pression médiatique (10 min) ==============================
  insert into public.steps (exercise_id, position, title, duration_seconds, end_of_time)
  values (v_exercise, 3, 'Pression médiatique', 10 * 60, 'facilitator')
  returning id into v_step;

  insert into public.contents (step_id, position, type, title, body, trigger_mode, trigger_offset_seconds)
  values (v_step, 0, 'article', 'Réseaux sociaux · fil d''actualité',
    '« Ma mère devait être opérée ce matin au CHU, on nous dit de rentrer chez nous, '
      || 'personne ne nous explique rien. » — publication partagée 1 200 fois en deux heures.',
    'auto', 0);

  insert into public.questions (step_id, position, type, prompt, expected_answer, scoring_guide, mandatory)
  values (v_step, 0, 'open',
    'Rédigez le communiqué de presse (10 lignes maximum).',
    to_jsonb('Faits confirmés, continuité des soins assurée, déprogrammation temporaire, '
      || 'aucune donnée patient exfiltrée à ce stade, numéro d''information dédié, '
      || 'prochain point à horaire annoncé.'::text),
    'Faits : 2 pts · Continuité des soins : 2 pts · Prudence sur les données : 2 pts · '
      || 'Canal et horaire du prochain point : 2 pts · Ton : 2 pts',
    true);

  insert into public.hints (step_id, position, body, trigger_mode, trigger_offset_seconds)
  values (v_step, 0, 'Annoncer l''heure du prochain point presse désamorce la pression immédiate.',
    'manual', 0);

  -- === Étape 5 — Arbitrages (12 min) =======================================
  insert into public.steps (exercise_id, position, title, duration_seconds, end_of_time)
  values (v_exercise, 4, 'Arbitrages', 12 * 60, 'facilitator')
  returning id into v_step;

  insert into public.contents (step_id, position, type, title, body, trigger_mode, trigger_offset_seconds)
  values (v_step, 0, 'text', 'Message de l''attaquant',
    '« Vos données sont chiffrées et copiées. 400 000 € en bitcoin sous 72 heures, '
      || 'sans quoi les dossiers patients seront publiés. »',
    'auto', 0);

  insert into public.questions (step_id, position, type, prompt, options, expected_answer, scoring_guide, mandatory)
  values (v_step, 0, 'single_choice',
    'Quel service rétablissez-vous en priorité ?',
    '[{"id":"a","label":"Les urgences et le bloc opératoire"},
      {"id":"b","label":"La facturation et l''administratif"},
      {"id":"c","label":"La messagerie interne"},
      {"id":"d","label":"Le site internet public"}]'::jsonb,
    to_jsonb('a — la continuité des soins prime sur toute autre considération.'::text),
    'Réponse « a » : 5 pts · toute autre réponse : 0',
    true);

  insert into public.questions (step_id, position, type, prompt, expected_answer, scoring_guide, mandatory)
  values (v_step, 1, 'open',
    'Comment informez-vous les patients dont les données pourraient avoir été copiées ?',
    to_jsonb('Information individuelle obligatoire (RGPD, article 34), notification à la CNIL '
      || 'sous 72 heures, cellule d''écoute dédiée.'::text),
    'Notification CNIL sous 72 h : 3 pts · information individuelle : 3 pts · '
      || 'cellule d''écoute : 2 pts',
    true);

  -- === Étape 6 — Sortie de crise (8 min) ===================================
  insert into public.steps (exercise_id, position, title, duration_seconds, end_of_time)
  values (v_exercise, 5, 'Sortie de crise', 8 * 60, 'auto')
  returning id into v_step;

  insert into public.contents (step_id, position, type, title, body, trigger_mode, trigger_offset_seconds)
  values (v_step, 0, 'text', 'J+4 — Retour progressif',
    'Les systèmes sont restaurés à partir des sauvegardes vérifiées. L''activité '
      || 'programmée reprend par paliers. L''enquête judiciaire se poursuit.',
    'auto', 0);

  insert into public.questions (step_id, position, type, prompt, expected_answer, scoring_guide, mandatory)
  values (v_step, 0, 'open',
    'Quels trois enseignements tirez-vous de cette crise ?',
    to_jsonb('Sauvegardes hors ligne testées régulièrement, cloisonnement du réseau, '
      || 'procédure dégradée papier connue et exercée, annuaire de crise à jour.'::text),
    'Grille animateur : 3 enseignements argumentés · 8 pts',
    true);

  raise notice 'Jeu de démonstration créé : modèle « Cyberattaque — établissement de santé », 6 étapes, 53 minutes.';
end $$;
