-- ---------------------------------------------------------------------------
-- Scénario « Vladivostok » — bad buzz : accusation de racisme à l'aéroport de Nantes
--
-- Reconstitution, pour la plateforme, de l'exercice joué avec Vinci Airports
-- (support PowerPoint « plan B » de Fès + dossier d'assets d'origine).
-- 12 étapes, 107 minutes de jeu, 4 équipes prévues (Madrid, Lisbonne, Berlin, Londres).
-- Fiche animateur : docs/scenarios/vladivostok.md
--
-- CE N'EST PAS UNE MIGRATION : ne pas le placer dans `supabase/migrations/`.
-- À exécuter à la demande depuis l'éditeur SQL du projet Supabase.
-- Rejouable : sans effet si le modèle existe déjà (aucune suppression, aucun doublon).
--
-- Médias : les contenus pointent vers des fichiers du compartiment privé `media`,
-- dans le dossier `vladivostok/`. Les fichiers sont fournis à part (dossier
-- `medias_plateforme/vladivostok/`) : les téléverser tels quels dans le
-- compartiment `media` (glisser le dossier `vladivostok` dans Storage → media).
-- Les noms de fichiers doivent rester identiques à ceux cités ci-dessous.
--
-- Comme pour le jeu de démonstration, la variante client se crée ensuite
-- depuis l'interface (`create_variant()`), en choisissant le client « Vinci Airports ».
-- ---------------------------------------------------------------------------

do $$
declare
  v_exercise uuid;
  v_step     uuid;
  v_auteur   uuid := (select user_id from public.staff_members order by created_at limit 1);
  v_titre    constant text := 'Vladivostok — Bad buzz : accusation de racisme à l''aéroport de Nantes';
begin
  if exists (select 1 from public.exercises where title = v_titre and kind = 'template') then
    raise notice 'Scénario Vladivostok déjà présent : rien à faire.';
    return;
  end if;

  insert into public.clients (name)
  select 'Vinci Airports'
  where not exists (select 1 from public.clients where name = 'Vinci Airports');

  insert into public.exercises (kind, title, description, created_by)
  values ('template', v_titre,
$t$Crise réputationnelle née sur les réseaux sociaux. Un influenceur franco-tunisien (yassinematue, 300 k abonnés) accuse un agent de sûreté de l'aéroport de Nantes Atlantique d'avoir humilié son cousin Youssef Jebali, voyageur d'origine tunisienne, sur le tarmac. La réclamation envoyée par Youssef est restée sans réponse depuis 48 h. Les équipes jouent la cellule de crise communication de Vinci Airports.

Chronologie fictive : jeu. 18/06 incident et réclamation (19 h 42) · sam. 20/06 story de l'influenceur, pétition Change.org (14 h 32), article de presse (16 h 12), sollicitations Mediapart et SOS Racisme · dim. 21/06 mail CGT, forum actionnaires · lun. 22/06 député, alertes internes (11 h 05 → 11 h 50), appel de Julien Courbet en direct.

Compétences travaillées : réaction au bad buzz, priorisation des parties prenantes, communication de crise (communiqué, éléments de langage), arbitrages de direction, OSINT et vérification de l'information.

Contenus entièrement fictifs créés pour la formation. Aucune diffusion hors exercice.$t$,
    v_auteur)
  returning id into v_exercise;

  -- =========================================================================
  -- Étape 1 — Story de l'influenceur (10 min)
  -- =========================================================================
  insert into public.steps (exercise_id, position, title, duration_seconds, end_of_time)
  values (v_exercise, 0, 'Story de l''influenceur', 10 * 60, 'facilitator')
  returning id into v_step;

  insert into public.contents (step_id, position, type, title, body, media_path, trigger_mode, trigger_offset_seconds) values
  (v_step, 0, 'text', 'Alerte de la cellule de veille — samedi 20 juin',
$t$L'influenceur franco-tunisien « yassinematue » (300 000 abonnés, compte certifié) publie une story sur Instagram.

Son cousin, Youssef, aurait été victime d'un incident raciste sur le tarmac de l'aéroport de Nantes Atlantique. Il montre un mail de réclamation envoyé 48 h plus tôt, resté sans réponse, mentionne @vinciairports et annonce qu'il ne laissera rien passer.

Vous êtes la cellule de crise communication de Vinci Airports.$t$, null, 'auto', 0),
  (v_step, 1, 'video', 'Story Instagram 1/3 — @yassinematue', 'Vidéo face caméra (41 s).',
   'vladivostok/story-1-influenceur.mp4', 'auto', 0),
  (v_step, 2, 'image', 'Story Instagram 2/3 — le mail de réclamation', null,
   'vladivostok/story-2-mail-reclamation.png', 'auto', 0),
  (v_step, 3, 'image', 'Story Instagram 3/3 — appel à la mobilisation', null,
   'vladivostok/story-3-appel-mobilisation.png', 'auto', 0),
  (v_step, 4, 'image', 'Boîte communication@vinci-airports.com — réclamation du 18 juin',
   'Le mail de Youssef Jebali est bien arrivé dans votre boîte, jeudi 18 juin à 19 h 42.',
   'vladivostok/mail-reclamation-youssef.png', 'manual', 0);

  insert into public.questions (step_id, position, type, prompt, expected_answer, scoring_guide, mandatory) values
  (v_step, 0, 'open',
   'Que faites-vous ? Listez vos actions dans l''ordre, avec qui les porte.',
   to_jsonb($t$1. Activer la cellule de crise (communication, direction de l'aéroport de Nantes, sûreté, juridique, RH) et désigner un pilote.
2. Retrouver la réclamation du 18/06 (voyages@nantes.aeroport.fr et communication@) et comprendre pourquoi elle est restée sans réponse.
3. Recontacter Youssef Jebali directement et personnellement (appel, pas de réponse type) : écoute, accusé de réception, engagement d'enquête.
4. Établir les faits : identifier l'agent et son employeur (sous-traitant ?), vidéosurveillance, témoins, rapports de la plateforme. Geler les preuves.
5. Mettre en place une veille renforcée (réseaux, presse) et préparer une déclaration d'attente (holding statement) : prise en compte, enquête, aucune tolérance pour la discrimination, sans reconnaître ni nier des faits non établis.
6. Informer la direction et préparer les éléments pour les autres publics (salariés, service client).
À éviter : silence prolongé, démenti ou accusation de l'influenceur, réponse publique précipitée.$t$::text),
   'Cellule activée et rôles : 2 pts · Contact direct avec Youssef : 2 pts · Établissement des faits / preuves : 2 pts · Veille + déclaration d''attente prudente : 2 pts',
   true);

  insert into public.hints (step_id, position, body, trigger_mode, trigger_offset_seconds) values
  (v_step, 0, 'La réclamation a été envoyée il y a 48 h à deux adresses. Qui devait la traiter, et qui doit maintenant parler à Youssef ?', 'auto', 6 * 60),
  (v_step, 1, 'Avant de communiquer, que savez-vous réellement des faits ? Quelles sources internes pouvez-vous mobiliser (vidéo, agents, prestataire) ?', 'manual', 0);

  -- =========================================================================
  -- Étape 2 — Page Instagram @vinciairports (10 min)
  -- =========================================================================
  insert into public.steps (exercise_id, position, title, duration_seconds, end_of_time)
  values (v_exercise, 1, 'Page Instagram @vinciairports', 10 * 60, 'facilitator')
  returning id into v_step;

  insert into public.contents (step_id, position, type, title, body, media_path, trigger_mode, trigger_offset_seconds) values
  (v_step, 0, 'text', 'Community manager — remontée urgente',
$t$La page Instagram @vinciairports est rapidement assaillie de commentaires et de messages privés négatifs, sous une publication sans rapport (inauguration du 20 juin).

Les accusations affluent : « RACISTES », « Vous n'avez pas honte ? », « Quand allez-vous lui donner réparation ??? ». Quelques internautes demandent la version de l'aéroport.$t$, null, 'auto', 0),
  (v_step, 1, 'image', 'Instagram — commentaires sous la dernière publication', null,
   'vladivostok/instagram-commentaires.png', 'auto', 0),
  (v_step, 2, 'image', 'Instagram — invitations par message', null,
   'vladivostok/instagram-messages-prives.png', 'auto', 60),
  (v_step, 3, 'image', 'X — recherche « vinci airports », onglet Récemment', 'Le sujet déborde sur X : #JusticePourYoussef, #BoycottVinci.',
   'vladivostok/tweets-x.png', 'auto', 3 * 60),
  (v_step, 4, 'video', 'Instagram — flot de commentaires en direct', 'Relance : le rythme s''accélère.',
   'vladivostok/instagram-commentaires-flood.mp4', 'manual', 0),
  (v_step, 5, 'video', 'X — flot de messages en direct', 'Relance : le rythme s''accélère.',
   'vladivostok/tweets-x-flood.mp4', 'manual', 0);

  insert into public.questions (step_id, position, type, prompt, options, expected_answer, scoring_guide, mandatory) values
  (v_step, 0, 'open',
   'Quelles actions entreprenez-vous sur les réseaux sociaux ? Rédigez, le cas échéant, le message publié.',
   '[]'::jsonb,
   to_jsonb($t$Ne pas supprimer en masse ni fermer les commentaires (effet Streisand) ; ne masquer que les contenus illicites (injures, menaces) selon la charte de modération.
Publier un message court et unique (commentaire épinglé ou story), puis renvoyer vers lui : « Nous avons pris connaissance du témoignage concernant l'aéroport de Nantes. Nous le prenons très au sérieux : une enquête interne est en cours et nous sommes en contact avec la personne concernée. Aucune forme de discrimination n'a sa place dans nos aéroports. »
Pas de débat au cas par cas en commentaires ; réponse type cohérente aux messages privés.
Prendre contact en privé avec l'influenceur (et surtout avec Youssef) plutôt que publiquement.
Renforcer la veille (volume, hashtags, comptes amplificateurs, part de faux comptes) et briefer le community management.$t$::text),
   'Pas de suppression massive / modération selon charte : 2 pts · Message public sobre et empathique, sans reconnaissance de faits : 3 pts · Contact privé influenceur / Youssef : 2 pts · Veille et consignes au CM : 1 pt',
   true),
  (v_step, 1, 'single_choice',
   'Que faites-vous des commentaires hostiles ?',
   '[{"id":"a","label":"Tout supprimer et désactiver les commentaires"},
     {"id":"b","label":"Laisser en ligne, ne masquer que les contenus illicites et renvoyer vers un message officiel"},
     {"id":"c","label":"Répondre individuellement à chaque commentaire"},
     {"id":"d","label":"Ne rien faire et attendre que ça passe"}]'::jsonb,
   to_jsonb('b — la suppression massive alimente la polémique ; le silence et les réponses au cas par cas aussi.'::text),
   'Réponse « b » attendue (prise en compte dans la note de l''étape)',
   true);

  insert into public.hints (step_id, position, body, trigger_mode, trigger_offset_seconds) values
  (v_step, 0, 'Supprimer des commentaires en pleine polémique : quel risque ?', 'manual', 0),
  (v_step, 1, 'Une seule prise de parole, épinglée, vaut mieux que cent réponses dispersées.', 'auto', 6 * 60);

  -- =========================================================================
  -- Étape 3 — Pétition Change.org (10 min)
  -- =========================================================================
  insert into public.steps (exercise_id, position, title, duration_seconds, end_of_time)
  values (v_exercise, 2, 'Pétition Change.org', 10 * 60, 'facilitator')
  returning id into v_step;

  insert into public.contents (step_id, position, type, title, body, media_path, trigger_mode, trigger_offset_seconds) values
  (v_step, 0, 'text', 'Cellule de veille',
$t$La cellule de veille vous remonte une pétition de soutien à la victime, lancée sur Change.org par le « Collectif Justice & Dignité » : « Incident RACISTE à l'aéroport de Nantes : VINCI Airports doit rendre des comptes ».

Elle atteint rapidement les 2 000 signatures. SOS Racisme relaie l'appel à signer.$t$, null, 'auto', 0),
  (v_step, 1, 'image', 'Change.org — page de la pétition', null,
   'vladivostok/petition-change.png', 'auto', 0),
  (v_step, 2, 'image', 'Facebook — publication de SOS Racisme', null,
   'vladivostok/sos-racisme-facebook.png', 'auto', 2 * 60),
  (v_step, 3, 'image', 'Instagram — publication de SOS Racisme', null,
   'vladivostok/sos-racisme-instagram.png', 'manual', 0),
  (v_step, 4, 'image', 'Boîte communication@ — SOS Racisme demande un entretien', null,
   'vladivostok/mail-sos-racisme.png', 'auto', 4 * 60);

  insert into public.questions (step_id, position, type, prompt, expected_answer, scoring_guide, mandatory) values
  (v_step, 0, 'open',
   'Que faites-vous face à la pétition et à l''entrée en jeu de SOS Racisme ?',
   to_jsonb($t$Ne pas contester ni dénigrer la pétition ou ses signataires ; la suivre (rythme des signatures, relais).
Identifier le collectif lanceur et les relais (SOS Racisme, comptes amplificateurs).
Répondre à SOS Racisme : accusé de réception rapide, proposition d'entretien, information sur l'enquête en cours. Un acteur associatif reconnu est un interlocuteur, pas un adversaire.
Accélérer le contact direct avec Youssef : une solution trouvée avec lui désamorce la pétition.
Préparer une prise de parole publique (communiqué) et des éléments de langage cohérents pour tous les canaux.$t$::text),
   'Pas de contestation de la pétition : 2 pts · Dialogue proposé à SOS Racisme : 2 pts · Lien avec Youssef / la victime : 2 pts · Préparation de la prise de parole publique : 2 pts',
   true);

  insert into public.hints (step_id, position, body, trigger_mode, trigger_offset_seconds) values
  (v_step, 0, 'SOS Racisme vous sollicite directement : qui lui répond, et quand ?', 'manual', 0);

  -- =========================================================================
  -- Étape 4 — Article de presse (7 min)
  -- =========================================================================
  insert into public.steps (exercise_id, position, title, duration_seconds, end_of_time)
  values (v_exercise, 3, 'Article de presse', 7 * 60, 'facilitator')
  returning id into v_step;

  insert into public.contents (step_id, position, type, title, body, media_path, trigger_mode, trigger_offset_seconds) values
  (v_step, 0, 'text', 'Cellule de veille',
   'La cellule de veille vous signale la diffusion d''un article de presse au sujet de l''incident et de la pétition, relayé sur les réseaux sociaux du média.',
   null, 'auto', 0),
  (v_step, 1, 'image', 'Business News — « VINCI Airports sommé de s''expliquer » (20 juin, 16 h 12)', null,
   'vladivostok/article-business-news.png', 'auto', 0),
  (v_step, 2, 'image', 'Business News — relais Facebook', null,
   'vladivostok/business-news-facebook.png', 'auto', 60),
  (v_step, 3, 'image', 'Business News — relais Instagram', null,
   'vladivostok/business-news-instagram.png', 'manual', 0),
  (v_step, 4, 'image', 'Boîte communication@ — Mediapart demande une réaction', 'Réponse attendue avant demain 12 h.',
   'vladivostok/mail-mediapart.png', 'auto', 2 * 60),
  (v_step, 5, 'video', 'Vidéo de la scène transmise à la rédaction', 'Relance : la vidéo évoquée par Mediapart circule.',
   'vladivostok/video-incident-tarmac.mp4', 'manual', 0);

  insert into public.questions (step_id, position, type, prompt, expected_answer, scoring_guide, mandatory) values
  (v_step, 0, 'open',
   'Que faites-vous vis-à-vis de la presse ? Que répondez-vous à Mediapart ?',
   to_jsonb($t$Vérifier si le service de presse a bien été « contacté » comme l'écrit l'article ; reprendre l'initiative auprès de la rédaction avec une déclaration écrite factuelle.
Répondre à Mediapart dans le délai (contradictoire) : prise en compte du témoignage, enquête interne ouverte, contact avec le voyageur, refus de toute discrimination ; pas de commentaire sur une vidéo non authentifiée ; entretien avec le directeur de l'aéroport à organiser plutôt qu'improvisé, ou réponse écrite.
Se procurer et conserver la vidéo, la verser à l'enquête.
Préparer un questions-réponses (Q&R) commun à tous les porte-parole, désigner un porte-parole unique.$t$::text),
   'Reprise de contact proactive avec les médias : 2 pts · Réponse à Mediapart dans le délai, factuelle : 3 pts · Traitement de la vidéo (conservation, pas de commentaire hâtif) : 1 pt · Porte-parole unique / Q&R : 2 pts',
   true);

  insert into public.hints (step_id, position, body, trigger_mode, trigger_offset_seconds) values
  (v_step, 0, 'Mediapart applique le contradictoire : ne pas répondre, c''est laisser publier « VINCI Airports n''a pas souhaité réagir ».', 'manual', 0);

  -- =========================================================================
  -- Étape 5 — Décision urgente : prévenir le DG ? (3 min)
  -- =========================================================================
  insert into public.steps (exercise_id, position, title, duration_seconds, end_of_time)
  values (v_exercise, 4, 'Décision urgente !', 3 * 60, 'facilitator')
  returning id into v_step;

  insert into public.contents (step_id, position, type, title, body, media_path, trigger_mode, trigger_offset_seconds) values
  (v_step, 0, 'text', 'Lundi 22 juin, 11 h 05',
   'L''assistante de direction écrit à la cellule : elle a été informée de la situation. Le DG est en voyage à l''étranger pour plusieurs jours. Faut-il le prévenir maintenant ?',
   null, 'auto', 0),
  (v_step, 1, 'image', 'Caroline Vasseur, assistante de direction — « Situation aéroport de Nantes »', null,
   'vladivostok/mail-assistante-direction.png', 'auto', 0);

  insert into public.questions (step_id, position, type, prompt, expected_answer, scoring_guide, mandatory) values
  (v_step, 0, 'yes_no',
   'Prévenez-vous le DG maintenant ?',
   to_jsonb('Oui. Un dirigeant ne doit jamais apprendre une crise par la presse ou par un partenaire ; la crise touche déjà la presse, un député, des associations et le titre.'::text),
   'Réponse « oui » : 3 pts',
   true),
  (v_step, 1, 'open',
   'Que lui transmettez-vous, et sous quelle forme ?',
   to_jsonb($t$Une note courte (5 lignes) ou un appel : faits connus / non établis, chronologie, exposition (réseaux, presse, pétition, SOS Racisme), actions engagées (enquête, contact avec Youssef, déclaration), décisions attendues de lui, prochain point à heure fixe. Un canal unique entre la cellule et le DG.$t$::text),
   'Note synthétique et factuelle : 3 pts · Décisions attendues et prochain point : 2 pts',
   true);

  -- =========================================================================
  -- Étape 6 — Question OSINT : joindre Change.org (15 min)
  -- =========================================================================
  insert into public.steps (exercise_id, position, title, duration_seconds, end_of_time)
  values (v_exercise, 5, 'Question OSINT — contacter Change.org', 15 * 60, 'facilitator')
  returning id into v_step;

  insert into public.contents (step_id, position, type, title, body, media_path, trigger_mode, trigger_offset_seconds) values
  (v_step, 0, 'text', 'Demande de la direction',
$t$La direction veut contacter quelqu'un chez Change.org.

Cible : Coraline Sainte-Beuve, Campaigns & Comms chez Change.org.

Il faut trouver le moyen de la joindre. Recherche à mener à l'extérieur de la plateforme, avec les méthodes OSINT vues en formation. Aucune prise de contact réelle : consignez seulement vos résultats et votre méthode.$t$,
   null, 'auto', 0);

  insert into public.questions (step_id, position, type, prompt, expected_answer, scoring_guide, mandatory) values
  (v_step, 0, 'open',
   'Quelles coordonnées avez-vous trouvées pour Coraline Sainte-Beuve ?',
   to_jsonb('À compléter par l''animateur avant la session : coordonnées de référence (professionnelles uniquement) et sources.'::text),
   'Coordonnée professionnelle exacte et sourcée : 5 pts · Coordonnée plausible non vérifiée : 2 pts',
   true),
  (v_step, 1, 'open',
   'Décrivez votre méthode : sources consultées, vérifications, niveau de confiance.',
   to_jsonb($t$Pistes attendues : profil professionnel (LinkedIn), pages presse et équipe de Change.org, communiqués et articles citant la personne, déduction du format d'adresse de l'entreprise puis vérification, recoupement d'au moins deux sources. Données strictement professionnelles ; aucune donnée personnelle.$t$::text),
   'Méthode structurée et recoupée : 3 pts',
   true);

  insert into public.hints (step_id, position, body, trigger_mode, trigger_offset_seconds) values
  (v_step, 0, 'Les entreprises ont souvent un format d''adresse e-mail unique : trouvez-en un exemple public, puis appliquez-le.', 'auto', 8 * 60),
  (v_step, 1, 'Les pages presse et les communiqués d''une plateforme citent souvent leurs responsables communication.', 'manual', 0);

  -- =========================================================================
  -- Étape 7 — Sollicitation du service client (15 min)
  -- =========================================================================
  insert into public.steps (exercise_id, position, title, duration_seconds, end_of_time)
  values (v_exercise, 6, 'Sollicitation du service client', 15 * 60, 'facilitator')
  returning id into v_step;

  insert into public.contents (step_id, position, type, title, body, media_path, trigger_mode, trigger_offset_seconds) values
  (v_step, 0, 'text', 'Lundi 22 juin, 11 h 20',
   'Le service client est pris d''assaut : le volume d''appels et de messages explose. Les équipes vous appellent au secours. Envoyez vos préconisations.',
   null, 'auto', 0),
  (v_step, 1, 'image', 'Karim Belaïd, responsable service client — « Afflux massif de réclamations »', null,
   'vladivostok/mail-service-client.png', 'auto', 0);

  insert into public.questions (step_id, position, type, prompt, expected_answer, scoring_guide, mandatory) values
  (v_step, 0, 'open',
   'Rédigez la consigne au service client : position à tenir et éléments de langage.',
   to_jsonb($t$Position : « Nous avons pris connaissance du témoignage. Nous le prenons très au sérieux. Une enquête interne est en cours et nous sommes en contact avec le voyageur concerné. Nous ne tolérons aucune forme de discrimination. Nous ne pouvons pas commenter une enquête en cours. »
Organisation : un script court commun à tous les canaux (téléphone, mail, réseaux) ; ne pas débattre, ne pas donner de détails sur l'agent ; journalistes → service de presse ; Youssef ou ses proches → interlocuteur dédié ; témoins éventuels → recueillir les coordonnées ; menaces et insultes → procédure et signalement.
Moyens : renfort d'effectifs, message d'accueil adapté, FAQ, point régulier cellule ↔ service client, soutien aux équipes exposées.$t$::text),
   'Éléments de langage cohérents avec la ligne publique : 3 pts · Règles d''aiguillage (presse, victime, témoins) : 2 pts · Renforts et organisation : 2 pts · Soutien aux équipes : 1 pt',
   true);

  insert into public.hints (step_id, position, body, trigger_mode, trigger_offset_seconds) values
  (v_step, 0, 'Vos conseillers doivent tenir le même discours que le communiqué à venir. Un script, pas une improvisation.', 'manual', 0);

  -- =========================================================================
  -- Étape 8 — Communiqué de presse (10 min)
  -- =========================================================================
  insert into public.steps (exercise_id, position, title, duration_seconds, end_of_time)
  values (v_exercise, 7, 'Communiqué de presse', 10 * 60, 'facilitator')
  returning id into v_step;

  insert into public.contents (step_id, position, type, title, body, media_path, trigger_mode, trigger_offset_seconds) values
  (v_step, 0, 'text', 'Lundi 22 juin, 11 h 35',
$t$Votre directrice de la communication, Frédérique Barthelemy, demande de préparer un communiqué de presse destiné à la presse locale, nationale et internationale.

Rédigez-le dans la plateforme : aucun envoi réel n'est effectué pendant l'exercice.$t$,
   null, 'auto', 0),
  (v_step, 1, 'image', 'Frédérique Barthelemy, directrice de la communication — « Communiqué sous 15 minutes »', null,
   'vladivostok/mail-dircom.png', 'auto', 0);

  insert into public.questions (step_id, position, type, prompt, expected_answer, scoring_guide, mandatory) values
  (v_step, 0, 'open',
   'Rédigez le communiqué de presse (titre + 15 lignes maximum).',
   to_jsonb($t$Titre factuel. Lieu, date.
1. Les faits établis à ce stade, sans reconnaître ce qui ne l'est pas : « Un voyageur a fait part d'un comportement inacceptable d'un agent lors de son débarquement le 18 juin. »
2. Empathie envers le voyageur, regret que sa réclamation n'ait pas reçu de réponse rapide.
3. Actions : enquête interne ouverte (avec le prestataire le cas échéant), mesure conservatoire sans préjuger (agent retiré du contact public le temps de l'enquête), contact établi avec le voyageur.
4. Valeurs : tolérance zéro face à toute discrimination, dispositif de signalement.
5. Engagement à communiquer les suites. Contact presse.
À proscrire : nom de l'agent, mise en cause de l'influenceur, jargon, « no comment », promesse de sanction avant enquête.$t$::text),
   'Faits prudents, rien de non établi : 2 pts · Empathie et regret du délai : 2 pts · Actions concrètes (enquête, mesure conservatoire, contact victime) : 2 pts · Valeurs et suites, contact presse : 1 pt · Forme (titre, concision, ton) : 1 pt',
   true);

  insert into public.hints (step_id, position, body, trigger_mode, trigger_offset_seconds) values
  (v_step, 0, 'Consigne de la dircom : factuels, mesurés, aucun fait reconnu qui ne soit établi.', 'auto', 5 * 60);

  -- =========================================================================
  -- Étape 9 — Question OSINT : vérifier un tweet (7 min)
  -- =========================================================================
  insert into public.steps (exercise_id, position, title, duration_seconds, end_of_time)
  values (v_exercise, 8, 'Question OSINT — vérifier un tweet', 7 * 60, 'facilitator')
  returning id into v_step;

  insert into public.contents (step_id, position, type, title, body, media_path, trigger_mode, trigger_offset_seconds) values
  (v_step, 0, 'text', 'Cellule de veille',
   'La veille vous remonte un tweet montrant que « c''est le bazar à Nantes » à cause de l''affaire. Pouvez-vous confirmer cette information ?',
   null, 'auto', 0),
  (v_step, 1, 'image', 'X — @aquaXOXO : « ahah c bien le bazar à #Nantes »', null,
   'vladivostok/tweet-bazar-nantes.jpeg', 'auto', 0),
  (v_step, 2, 'video', 'Snapchat — nouvelle vidéo du tarmac (« TheVoyageur »)', 'Relance : une seconde vidéo circule, elle montrerait un geste physique.',
   'vladivostok/snap-geste-physique.mp4', 'manual', 0);

  insert into public.questions (step_id, position, type, prompt, expected_answer, scoring_guide, mandatory) values
  (v_step, 0, 'open',
   'L''information est-elle vraie ? Comment l''avez-vous vérifié, et qu''en faites-vous ?',
   to_jsonb($t$Non, la photo ne montre pas Nantes aujourd'hui. Indices : foule en manteaux, bonnets et écharpes (photo d'hiver, alors que l'on est en juin) ; signalétique bilingue « Information vols / Flights information » d'un autre aéroport, vraisemblablement parisien ; compte anonyme au ton moqueur. Recherche d'image inversée (Google Lens, TinEye, Yandex) : photo d'archive ancienne.
Conduite à tenir : confirmer auprès de l'exploitation de Nantes que le trafic est normal ; ne pas relayer ; signaler la fausse information si besoin ; intégrer le démenti factuel au Q&R (trafic normal) sans polémiquer.$t$::text),
   'Conclusion « fausse » : 3 pts · Méthode (image inversée, indices visuels) : 3 pts · Conduite à tenir : 2 pts',
   true),
  (v_step, 1, 'open',
   'Si l''animateur vous a diffusé la vidéo Snapchat : quel crédit lui accordez-vous, et que faites-vous ?',
   to_jsonb($t$Ne pas conclure sur une vidéo courte, sans contexte ni date vérifiés : comparer avec la première vidéo et les images de vidéosurveillance, identifier la source, conserver la vidéo, la verser à l'enquête. Anticiper sa reprise par les médias dans le Q&R, sans la commenter publiquement.$t$::text),
   'Prudence et vérification croisée : bonus jusqu''à 2 pts dans la note de l''étape',
   false);

  insert into public.hints (step_id, position, body, trigger_mode, trigger_offset_seconds) values
  (v_step, 0, 'Regardez les tenues des voyageurs : sommes-nous bien le 22 juin ?', 'auto', 3 * 60),
  (v_step, 1, 'Une recherche d''image inversée prend moins d''une minute.', 'manual', 0);

  -- =========================================================================
  -- Étape 10 — Question du DG en Tunisie (5 min)
  -- =========================================================================
  insert into public.steps (exercise_id, position, title, duration_seconds, end_of_time)
  values (v_exercise, 9, 'Question du DG', 5 * 60, 'facilitator')
  returning id into v_step;

  insert into public.contents (step_id, position, type, title, body, media_path, trigger_mode, trigger_offset_seconds) values
  (v_step, 0, 'text', 'Lundi 22 juin, 11 h 50',
   'Votre DG vous annonce qu''il est en déplacement en Tunisie pour un appel d''offres sur la concession d''un aéroport. Il rencontre le partenaire local demain matin. Il vous demande s''il doit parler de la crise au décideur local et, si oui, quoi dire. Livrez-lui votre analyse.',
   null, 'auto', 0),
  (v_step, 1, 'image', 'Philippe Aubry, directeur général — « Je suis en Tunisie : je les préviens ou pas ? »', null,
   'vladivostok/mail-dg-tunisie.png', 'auto', 0),
  (v_step, 2, 'image', 'Boîte communication@ — le député Mehdi Sassi (groupe d''amitié France-Tunisie)', 'L''ambassade de Tunisie en France aurait également été alertée.',
   'vladivostok/mail-depute-sassi.png', 'auto', 90),
  (v_step, 3, 'image', 'Forum Boursorama — un actionnaire s''interroge (critères ESG)', null,
   'vladivostok/boursorama-actionnaire.png', 'manual', 0);

  insert into public.questions (step_id, position, type, prompt, expected_answer, scoring_guide, mandatory) values
  (v_step, 0, 'yes_no',
   'Le DG doit-il aborder le sujet avec le décideur tunisien ?',
   to_jsonb('Oui, de façon proactive et brève : la presse fait déjà le lien avec les appels d''offres tunisiens, l''ambassade et un député sont alertés. Mieux vaut que le partenaire l''apprenne du DG que par la presse.'::text),
   'Réponse « oui » : 3 pts',
   true),
  (v_step, 1, 'open',
   'Que doit-il dire ? Rédigez ses trois messages clés.',
   to_jsonb($t$1. Nous prenons ce témoignage très au sérieux ; une enquête interne est en cours et nous sommes en contact avec le voyageur.
2. Aucune discrimination n'est tolérée dans nos aéroports ; des mesures seront prises si les faits sont établis.
3. Respect et attachement à la relation avec la Tunisie et la communauté franco-tunisienne ; engagement à tenir le partenaire informé des suites.
Ton : court, factuel, sans minimiser ni entrer dans le détail ; aligné sur le communiqué. Prévoir aussi la réponse au député.$t$::text),
   'Messages alignés sur la ligne publique : 3 pts · Dimension relation franco-tunisienne : 1 pt · Concision, pas de minimisation : 1 pt',
   true);

  -- =========================================================================
  -- Étape 11 — Mail des syndicats (5 min)
  -- =========================================================================
  insert into public.steps (exercise_id, position, title, duration_seconds, end_of_time)
  values (v_exercise, 10, 'Mail des syndicats', 5 * 60, 'facilitator')
  returning id into v_step;

  insert into public.contents (step_id, position, type, title, body, media_path, trigger_mode, trigger_offset_seconds) values
  (v_step, 0, 'text', 'Front interne',
   'Vous recevez un mail de la section CGT de l''aéroport Nantes Atlantique. Un agent est nommément visé en ligne. Le syndicat demande des explications et une réunion en urgence.',
   null, 'auto', 0),
  (v_step, 1, 'image', 'Section CGT Nantes Atlantique — « Tarmac du 18 juin : demande d''explications urgente »', null,
   'vladivostok/mail-cgt.png', 'auto', 0);

  insert into public.questions (step_id, position, type, prompt, expected_answer, scoring_guide, mandatory) values
  (v_step, 0, 'open',
   'Que répondez-vous aux syndicats, et que faites-vous en interne ?',
   to_jsonb($t$Réponse rapide et écrite ; accepter la réunion (direction de l'aéroport, RH), à brève échéance.
Message : rappel de la fermeté contre tout acte raciste ET de la présomption d'innocence ; enquête interne contradictoire en cours ; protection de l'agent contre le harcèlement en ligne (pas de diffusion de son nom, accompagnement, soutien psychologique, éventuel dépôt de plainte) ; rappel des procédures de signalement.
En interne : communication aux salariés de la plateforme pour éviter la rumeur et les prises de parole individuelles sur les réseaux ; cohérence avec la ligne publique.$t$::text),
   'Réponse rapide et réunion acceptée : 2 pts · Équilibre fermeté / présomption d''innocence : 3 pts · Protection de l''agent : 2 pts · Communication interne : 1 pt',
   true);

  insert into public.hints (step_id, position, body, trigger_mode, trigger_offset_seconds) values
  (v_step, 0, 'Vous devez tenir deux exigences à la fois : l''écoute de la victime et la protection de vos salariés.', 'manual', 0);

  -- =========================================================================
  -- Étape 12 — Julien Courbet en direct (10 min)
  -- =========================================================================
  insert into public.steps (exercise_id, position, title, duration_seconds, end_of_time)
  values (v_exercise, 11, 'Julien Courbet en direct', 10 * 60, 'facilitator')
  returning id into v_step;

  insert into public.contents (step_id, position, type, title, body, media_path, trigger_mode, trigger_offset_seconds) values
  (v_step, 0, 'text', 'EN DIRECT À L''ANTENNE',
   'Julien Courbet, « Ça peut vous arriver », est en direct. Il vient d''appeler le standard et exige une réaction de Vinci Airports, maintenant. Écoutez son message.',
   null, 'auto', 0),
  (v_step, 1, 'audio', 'Message vocal — Julien Courbet, en direct', null,
   'vladivostok/vocal-courbet.mp3', 'auto', 0);

  insert into public.questions (step_id, position, type, prompt, options, expected_answer, scoring_guide, mandatory) values
  (v_step, 0, 'single_choice',
   'Qui prend l''antenne ?',
   '[{"id":"a","label":"Le directeur général, immédiatement"},
     {"id":"b","label":"Un porte-parole formé, avec trois messages clés, dans les minutes qui suivent"},
     {"id":"c","label":"Personne : « pas de commentaire »"},
     {"id":"d","label":"Le standardiste, qui lit le communiqué"}]'::jsonb,
   to_jsonb('b — on ne laisse ni un dirigeant non préparé improviser en direct, ni la chaise vide.'::text),
   'Réponse « b » : 2 pts',
   true),
  (v_step, 1, 'open',
   'Rédigez ce que dit votre porte-parole à l''antenne (1 minute).',
   '[]'::jsonb,
   to_jsonb($t$Empathie d'abord (« ce que décrit Youssef est grave, je comprends sa colère »), reconnaissance du délai de réponse à sa réclamation, actions concrètes (enquête en cours, contact établi avec lui, mesure conservatoire), tolérance zéro pour la discrimination, engagement à rendre compte des suites. Ne pas nommer l'agent, ne pas reconnaître des faits non établis, ne pas polémiquer avec l'animateur ni l'influenceur. Proposer de revenir à l'antenne avec les conclusions.$t$::text),
   'Empathie et reconnaissance du délai : 2 pts · Actions concrètes : 2 pts · Prudence sur les faits : 1 pt · Clarté orale, 1 minute : 1 pt',
   true);

  insert into public.hints (step_id, position, body, trigger_mode, trigger_offset_seconds) values
  (v_step, 0, 'Le direct ne pardonne pas l''improvisation… ni la chaise vide.', 'manual', 0);

  raise notice 'Scénario créé : « % », 12 étapes, 107 minutes.', v_titre;
end $$;
