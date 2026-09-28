# Spécification fonctionnelle — V1

Source : note de synthèse du 11 septembre 2026, document de référence du projet.
Le cahier des charges version 1 reste le point de départ ; en cas de divergence,
les décisions ci-dessous font foi.

## Acteurs

- **Administrateur** : gère l'équipe d'animation, les clients, les modèles.
- **Animateur** : prépare les variantes, crée et pilote les sessions, note, rédige le RETEX.
  Compte Supabase par e-mail, déclaré dans `staff_members`.
- **Participant** : rejoint une équipe avec un code, depuis n'importe quel appareil.
  Connexion anonyme Supabase (pas de compte, pas d'e-mail) + prénom + acceptation des conditions.

## Décisions actées (ne pas remettre en cause sans validation)

1. **Rythme** : synchronisation entre les appareils d'une même équipe ; chaque équipe
   avance à son rythme ; l'animateur peut imposer un passage. Chaque étape a un réglage
   « fin du temps » : passage automatique (`auto`) ou attente de l'animateur (`facilitator`).
   Option par étape `advance_on_submit` : passage dès la validation de la réponse.
2. **Réponses** : brouillon partagé entre les appareils de l'équipe ; une seule validation
   par équipe et par étape ; contributions individuelles journalisées.
3. **Interventions en direct (P0)** : pause / reprise générale, ajout ou retrait de temps,
   passage manuel à l'étape suivante, arrêt général.
4. **Notation** : réponse type et barème saisis dans l'éditeur ; note de contenu attribuée
   par l'animateur (sur 8 par défaut) ; bonus de temps calculé automatiquement (sur 2).
   Notation assistée par IA : hors V1.
5. **Appels** : V1 = lien visio externe (Teams, Meet, Jitsi) ouvert depuis la console et
   journalisé. Intégration native et enregistrement : hors V1.
6. **Modèles et variantes** : un modèle (tronc commun) se décline en variantes par client.
7. **Garde-fous** : bandeau « exercice » permanent, aucun canal réel, arrêt général.
8. **Propagation** : copie figée. Une variante est indépendante de son modèle dès sa création,
   la filiation est enregistrée. Aucune propagation. La session jouée est figée elle aussi.
9. **Format des réponses** (tranché au lot 3) : `answer_drafts.content` et `answers.content`
   partagent la même forme JSON, selon le type de question :
   ouverte `{ "text": "…" }` · choix unique `{ "choice": "a" }` ·
   choix multiple `{ "choices": ["a", "b"] }` · oui/non `{ "yes": true }`.
   Les identifiants d'options sont ceux saisis dans l'éditeur (`a`, `b`, …), jamais les libellés :
   renommer un libellé dans une variante ne change donc pas les réponses déjà enregistrées.

## Questions encore ouvertes (demander avant d'implémenter)

- Ciblage d'un contenu ou d'une question sur une seule équipe dans une étape
  (aujourd'hui seuls les diffusions manuelles et les indices sont ciblables).
- Formule de notation définitive (le 8 + 2 est provisoire, paramétrable par exercice).
- Accès au RETEX : animateurs seuls, commanditaire client, participants ?

## Lots de développement (dans cet ordre)

### Lot 0 — Socle
- Initialisation Vite + React + TS + Tailwind + Router + Vitest ; scripts `dev`,
  `typecheck`, `test`, `build`.
- Client Supabase (URL + clé publique depuis `.env.local`), types générés.
- Mise en page commune : bandeau « exercice », thème sombre, composants de base.
- Connexion animateur (e-mail + mot de passe) ; garde de routes animateur (vérifie `staff_members`).
- Utilitaire d'horloge : mesure du décalage via `server_now()`, calcul du temps restant. Tests unitaires.

### Lot 1 — Éditeur (maquette `editeur-etapes.html`)
- Listes des modèles et variantes ; création d'un modèle ; création d'une variante par
  `create_variant()` avec choix du client.
- Éditeur d'étapes : liste réordonnable (`reorder_steps()`), titre, durée (1 à 60 min),
  « fin du temps », passage à la validation, son d'ambiance.
- Par étape : contenus (vidéo, image, audio, document, article, texte) avec déclenchement
  auto en T+ ou manuel ; questions (ouverte, choix unique, choix multiple, oui/non) avec
  options, réponse type, barème, caractère obligatoire ; indices (auto en T+ ou manuels).
- Badges « modèle » / « variante » selon `source_id` et `is_modified`.
- Téléversement des médias dans le compartiment privé `media` ; compression recommandée
  avant envoi (afficher un avertissement au-delà de 50 Mo).

### Lot 2 — Sessions, équipes, accès participants (maquette `accueil.html`)
- Création d'une session à partir d'une variante ; création des équipes ; affichage des
  codes d'équipe (et QR code) à projeter ou imprimer.
- Parcours participant : page d'accueil → saisie du code et du prénom → écran des
  conditions (case à cocher obligatoire, bouton « Commencer » inactif tant qu'elle n'est pas
  cochée) → `signInAnonymously()` puis `join_team()` → salle d'attente jusqu'au démarrage.
- Mémoriser l'équipe dans le navigateur pour rejoindre directement après rechargement.

### Lot 3 — Interface participant (maquette `participant.html`)
- Bandeau exercice, nom d'équipe, nombre de connectés, étape n / N, barre de progression,
  minuteur (vert, ambre sous 2 min, rouge sous 1 min).
- Contenus diffusés (lecture vidéo/audio/image/document ; article en « faux média »),
  son d'ambiance, indices reçus, messagerie avec l'animateur.
- Questions avec brouillon partagé en temps réel (`save_draft`, avec anti-rebond),
  bouton « valider la réponse d'équipe » (`submit_answers`), état « réponse transmise ».
- États : attente de démarrage, étape en cours, temps écoulé (attente animateur), pause, fin.
- Robustesse : reconnexion automatique et relecture de l'état ; indicateur de connexion.

### Lot 4 — Console animateur (maquette `console.html`)
- Une carte par équipe : étape, minuteur, statut (à l'heure, en retard, en avance,
  réponse à noter, temps écoulé), messages non lus.
- Actions sur l'équipe sélectionnée : +2 min / −1 min, étape suivante, diffuser un contenu
  manuel, envoyer un indice, message ; actions globales : démarrer, pause, reprise,
  terminer, arrêt général (confirmation obligatoire).
- Lien visio externe configurable, dont l'ouverture est journalisée.
- Journal en direct (lecture de `events`).
- Notation : réponse de l'équipe à côté de la réponse type et du barème ; saisie de la note.

### Lot 5 — RETEX (maquette `retex.html`)
- Indicateurs : durée réelle vs prévue, note moyenne, temps de réponse médian, interventions.
- Frise par équipe sur un axe de temps commun (blocs colorés selon la note, pictogrammes
  d'événements), filtres par type d'événement, curseur « rejouer ».
- Détail d'une étape : réponses vs réponses types, décomposition de la note, événements,
  observations de l'animateur (table `observations`).
- Tout est calculé à partir du journal et du snapshot : aucune saisie supplémentaire.

### Lot 6 — Fiabilisation
- Tests multi-appareils (20 à 30), coupures réseau, rechargements, veille des tablettes.
- Vérification des règles d'accès par tests d'intégration automatisés.
- Revue de sécurité avec les ingénieurs réseaux ; passage au forfait Supabase Pro.
- Exercice à blanc complet avant le premier exercice client.

## Exigences non fonctionnelles

- 30 appareils par exercice, plusieurs exercices simultanés possibles.
- Navigateurs récents (Chrome, Edge, Safari, Firefox) ; tablettes iPad et Android.
- Aucune perte d'état à la reconnexion ; aucune triche possible par l'inspection réseau.
- Données hébergées dans l'Union européenne (projet Supabase en Irlande, région eu-west-1).

## Hors périmètre V1

Notation assistée par IA ; visio intégrée et enregistrement des appels ; bibliothèque de
scénarios avec recherche ; notification de mise à jour d'un modèle vers ses variantes ;
liste « où cet élément est-il utilisé » ; scénarios conditionnels ; export PDF du RETEX ;
comparaison avancée entre sessions ; multi-langue.
