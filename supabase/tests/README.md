# Scénarios de sécurité de référence

`scenario_securite.sql` décrit, sous forme exécutable, le comportement attendu du schéma :
copie figée, isolation des équipes, confidentialité des réponses types et des étapes à venir,
minuteurs, journal en ajout seul, arrêt général. 61 vérifications.

Il a été exécuté avec succès sur PostgreSQL 16 lors de la préparation du kit, dans un
environnement simulant Supabase (`environnement_simule.sql`), avant toute application au
projet réel.

**Ces fichiers ne sont pas des migrations** : ne pas les appliquer au projet Supabase.
Ils servent de référence à Claude Code pour écrire les tests d'intégration du front
(Vitest + participants anonymes réels), qui vérifieront les mêmes comportements sur le
projet hébergé.

Pour les rejouer en local :

```bash
npm run verif:sql
```

`verifier_local.sh` crée un cluster PostgreSQL temporaire (socket privée, aucun service
permanent), y applique l'environnement simulé puis les migrations, joue les scénarios de
sécurité dans une base, le jeu de démonstration dans une autre, et supprime tout à la fin —
même en cas d'erreur. Il ne touche ni au projet Supabase hébergé ni à un serveur local existant.

Prérequis : `brew install postgresql@17` (même version majeure que le projet hébergé).

La migration `..._cron_echeances.sql` est ignorée en local : `pg_cron` est une extension
fournie par Supabase, absente d'une installation PostgreSQL ordinaire. La planification des
échéances ne peut donc être vérifiée que sur le projet hébergé.

## Jeu de démonstration

`../seed_demo.sql` crée un modèle fictif complet (« Cyberattaque — établissement de santé »,
6 étapes, 53 minutes) pour essayer l'éditeur. Ce n'est pas une migration : à coller dans
l'éditeur SQL du projet Supabase, à la demande. Le script est rejouable sans créer de doublon.
