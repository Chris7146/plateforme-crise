# Plateforme de simulation de crise — consignes projet

Application web d'exercices de gestion de crise joués en salle : des équipes, chacune
sur plusieurs appareils, suivent des étapes minutées, reçoivent contenus et indices,
répondent à des questions ; un animateur pilote en temps réel puis exploite le RETEX.

- Spécification fonctionnelle et décisions : @docs/specification.md
- Maquettes de référence (HTML) : `docs/maquettes/` — à ouvrir et suivre pour tout écran.
- Schéma de base, fonctions et règles d'accès : `supabase/migrations/`
- Scénarios de sécurité attendus : `supabase/tests/scenario_securite.sql`

## Stack

- Front : Vite + React + TypeScript (strict) + Tailwind CSS + React Router.
  Application monopage (SPA) compilée en fichiers statiques.
- Back : Supabase (projet hébergé à Paris) — PostgreSQL, Auth, Realtime, Storage, Cron.
- Client : `@supabase/supabase-js`, types générés (`src/lib/database.types.ts`).
- Tests : Vitest (unitaires et intégration).
- Pas d'autre backend, pas de serveur Node. La logique métier sensible vit dans
  PostgreSQL (fonctions RPC `security definer`) et, si nécessaire, dans des Edge Functions.

## Règles non négociables

### Sécurité
- RLS activée sur TOUTE table. Toute nouvelle table arrive avec ses règles dans la même migration.
- La clé secrète Supabase (`service_role` / secret) n'apparaît JAMAIS dans le front,
  dans le dépôt, ni dans un fichier `.env` versionné. Seules l'URL et la clé publique sont côté navigateur.
- Si une requête est refusée par une règle d'accès : on corrige la règle ou on passe par une RPC.
  On ne contourne JAMAIS avec la clé secrète, on ne désactive JAMAIS la RLS.
- Les participants n'écrivent QUE via les RPC prévues (`join_team`, `save_draft`,
  `submit_answers`, `send_team_message`). Aucune écriture directe dans les tables.
- Le navigateur d'un participant ne reçoit JAMAIS : réponses types (`expected_answer`),
  barèmes (`scoring_guide`), étapes à venir, contenus non diffusés, données d'une autre équipe.
  Côté participant, la seule source de données est `get_team_view(team_id)`.
- Les RPC animateurs vérifient le rôle côté base (`_require_staff()`). L'interface masque
  les boutons, mais la sécurité ne dépend jamais de l'interface.

### Minuteurs
- Le serveur stocke des ÉCHÉANCES (`step_deadline`), jamais des décomptes.
- Le client calcule le temps restant : `step_deadline - (Date.now() + décalage)`,
  le décalage d'horloge étant mesuré via la RPC `server_now()` au chargement et à chaque reconnexion.
- Un `setInterval` sert uniquement à rafraîchir l'affichage, jamais de source de vérité.
- Le passage d'étape est décidé par le serveur (Supabase Cron → `advance_expired_steps()`,
  ou RPC animateur). Un navigateur participant ne fait JAMAIS avancer une étape.

### Temps réel : « signal puis relecture »
- Les clients écoutent les changements (Realtime, filtrés par RLS) sur `teams`,
  `answer_drafts`, `messages`, `answers`, `events` (animateurs).
- À chaque signal, on RELIT l'état complet via RPC (`get_team_view` côté participant).
  On ne reconstruit jamais l'état en appliquant les messages reçus.
- À chaque reconnexion (réseau, veille, rechargement), on relit l'état immédiatement.
- Exception tolérée : le texte d'un brouillon partagé peut être appliqué directement pour la fluidité.

### Journal d'événements
- Toute action significative produit un événement dans `events` (via les RPC, jamais depuis le front).
- `events` est en ajout seul : ni UPDATE ni DELETE. Le RETEX se construit en relisant ce journal.

### Modèles, variantes, sessions
- Copie figée : une variante se crée uniquement via `create_variant()`. Aucune propagation
  automatique d'un modèle vers ses variantes. La filiation (`source_id`, `is_modified`) est conservée.
- Session figée : au démarrage, `start_session()` gèle le contenu dans `sessions.snapshot`.
  Une session démarrée ne relit plus jamais la variante.

### Garde-fous d'exercice
- Le bandeau « Exercice · simulation · aucune situation réelle » est visible en permanence
  sur tous les écrans participants et sur la console animateur.
- Aucun envoi vers des canaux réels en V1 : pas d'e-mail, SMS, réseau social ni appel sortant.
- L'arrêt général (`stop_session`) est accessible en un clic depuis la console, séparé des autres actions.

## Base de données

- Toute modification de schéma = NOUVEAU fichier dans `supabase/migrations/`
  (horodaté, nom explicite). Ne jamais modifier une migration déjà appliquée.
- Ne jamais modifier la base à la main dans l'éditeur SQL sans migration correspondante.
- Après chaque migration : `npx supabase db push`, puis régénérer les types.
- Fonctions `security definer` : toujours `set search_path = ''` et noms qualifiés (`public.`).
- Nouvelles fonctions internes : `revoke execute ... from public, anon, authenticated`.

## Méthode de travail

- Avancer par petites étapes livrables, dans l'ordre des lots de `docs/specification.md`.
- Avant de coder un écran : relire la spécification et ouvrir la maquette correspondante.
- Si une décision fonctionnelle manque ou semble contredire ce fichier : POSER LA QUESTION,
  ne pas inventer. Les décisions déjà prises sont listées dans la spécification.
- Chaque fonctionnalité arrive avec ses tests. Avant de déclarer une étape terminée :
  `npm run typecheck`, `npm test`, `npm run build` doivent passer.
- Tests d'intégration obligatoires pour toute règle d'accès : deux participants anonymes
  dans deux équipes différentes, vérifier qu'aucun ne voit ni n'écrit chez l'autre.
- Commits fréquents, messages en français, un sujet par commit.
- Demander confirmation avant toute opération destructrice (suppression de données,
  réinitialisation de la base, `git push --force`).
- Code et identifiants en anglais ; interface, messages d'erreur et commentaires en français.

## Commandes

```bash
npm run dev          # serveur de développement
npm run typecheck    # vérification TypeScript
npm test             # tests Vitest
npm run build        # build de production (dossier dist/)
npx supabase db push # applique les nouvelles migrations au projet Supabase
npx supabase gen types typescript --linked > src/lib/database.types.ts
```

## Interface

- Direction « terminal de crise » : fond sombre, typographie à chasse fixe,
  vert = nominal, ambre = attention, rouge = urgence. Code couleur fixe, ne pas en inventer d'autres.
- Couleurs de référence : fond `#07100c`, carte `#0b1712`, bordure `#1d3328`,
  texte `#d7e5dc`, secondaire `#7f9a8a`, vert `#3ecf8e`, ambre `#f2b43c`, rouge `#ef6b6b`, bleu `#6fb6f2`.
- Effets décoratifs (pluie de chiffres) réservés à l'accueil ; écrans de travail sobres.
- Conçu d'abord pour ordinateur et tablette ; minuteur lisible depuis le fond d'une salle.
- Son d'ambiance : le clic « Commencer » déverrouille l'audio ; prévoir un bouton
  « réactiver le son » après rechargement (politique d'autoplay des navigateurs).
- Accessibilité : contrastes suffisants, focus visible, cibles tactiles d'au moins 44 px.

## Glossaire

modèle = template · variante = variant · étape = step · contenu = content ·
indice = hint · équipe = team · animateur = facilitator · journal = events ·
brouillon = draft · réponse type = expected_answer · barème = scoring_guide
