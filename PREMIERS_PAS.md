# Premiers pas

Ce guide t'accompagne de ton compte Supabase jusqu'à la première session de travail avec
Claude Code. Compte environ une heure. Les étapes marquées **(toi)** doivent être faites
par toi : elles touchent à des mots de passe ou à des clés que Claude Code ne doit pas voir.

---

## 1. Installer les outils

- **Node.js** (version LTS) : https://nodejs.org — vérifier avec `node --version`.
- **Git** : https://git-scm.com — vérifier avec `git --version`.
- **Claude Code** — macOS / Linux :
  ```bash
  curl -fsSL https://claude.ai/install.sh | bash
  ```
  Windows (PowerShell) : `irm https://claude.ai/install.ps1 | iex`
  Documentation : https://code.claude.com/docs/en/setup
- La CLI Supabase n'a pas besoin d'être installée globalement : on l'utilisera via `npx supabase`.

## 2. Créer le dépôt

1. Sur GitHub, crée un dépôt **privé** nommé `plateforme-crise`.
2. Clone-le sur ton ordinateur, puis copie **tout le contenu de ce kit** à sa racine
   (`CLAUDE.md`, `docs/`, `supabase/`, `.gitignore`, `.env.example`, ce fichier).
3. Premier commit :
   ```bash
   git add . && git commit -m "Kit de démarrage : consignes, spécification, schéma" && git push
   ```

## 3. Configurer le projet Supabase **(toi)**

Dans le tableau de bord Supabase, projet `plateforme-crise` (région Paris) :

1. **Authentication → Sign In / Providers → Anonymous sign-ins** : activer.
   C'est ce qui permet aux participants de rejoindre sans créer de compte.
2. **Authentication → Users → Add user** : crée ton propre compte animateur
   (e-mail + mot de passe). Copie son identifiant (UUID).

## 4. Appliquer le schéma **(toi)**

Dans un terminal, à la racine du dépôt :

```bash
npx supabase init                                # crée supabase/config.toml (répondre « n » aux questions)
npx supabase login                               # ouvre le navigateur pour t'identifier
npx supabase link --project-ref <REF_DU_PROJET>  # la référence figure dans l'URL du tableau de bord
npx supabase db push                             # applique les deux migrations
```

La commande `link` demande le **mot de passe de la base** : tape-le toi-même dans le
terminal, ne le donne jamais à Claude Code.

Vérifie ensuite dans **Table Editor** que les tables (`exercises`, `steps`, `teams`, `events`…)
existent, et dans **Integrations → Cron** que la tâche `avancer-etapes-expirees` tourne.

## 5. Te déclarer administrateur **(toi)**

Dans **SQL Editor**, remplace l'identifiant par celui copié à l'étape 3 :

```sql
insert into public.staff_members (user_id, role, display_name)
values ('00000000-0000-0000-0000-000000000000', 'admin', 'Christophe');
```

## 6. Renseigner les clés publiques **(toi)**

Copie `.env.example` en `.env.local` et renseigne :
- `VITE_SUPABASE_URL` : l'URL du projet ;
- `VITE_SUPABASE_ANON_KEY` : la clé **publique** (anon / publishable).

**Jamais la clé secrète** (`service_role` / secret). `.env.local` est exclu du dépôt par `.gitignore`.

## 7. Première session avec Claude Code

Dans le terminal, à la racine du dépôt : `claude`

**Premier message** — vérifier qu'il a compris le cadre, sans rien coder :

> Lis CLAUDE.md et docs/specification.md. Résume en quinze lignes l'architecture et les
> règles que tu dois respecter, puis liste les questions qui te semblent encore ouvertes.
> Ne modifie aucun fichier.

**Deuxième message** — lancer le lot 0 en mode plan (touche `Maj+Tab` jusqu'à voir
« plan mode on » dans la barre d'état) :

> Réalise le lot 0 de la spécification. Présente d'abord ton plan, attends ma validation.

Puis, pour chaque lot suivant, le même schéma : plan → validation → réalisation → tests → commit.

## Bonnes habitudes

- **Un lot à la fois.** Commande `/clear` entre deux sujets pour repartir d'un contexte propre.
- **Tester dans le navigateur** à chaque étape, sur ordinateur et sur une tablette.
- **Commits fréquents** : chaque étape validée est commitée, ce qui permet de revenir en arrière.
- **Signaux d'alerte** : si Claude Code propose de désactiver la RLS, d'utiliser la clé secrète,
  de modifier une migration déjà appliquée ou de décrémenter un minuteur côté navigateur,
  refuse et rappelle-lui CLAUDE.md. Ces quatre dérives sont les plus probables.
- **Décision nouvelle** : si tu tranches une question en cours de route, ajoute-la à
  `docs/specification.md` (section « Décisions actées ») pour qu'elle s'applique à toutes les sessions.
- **Avant l'exercice à blanc** : passage au forfait Supabase Pro, et activation d'un CAPTCHA
  sur les connexions anonymes pour éviter les abus.
