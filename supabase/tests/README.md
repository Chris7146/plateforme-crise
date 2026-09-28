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

Pour les rejouer sur une base PostgreSQL locale vide :

```bash
createdb test_crise
psql -d test_crise -f environnement_simule.sql
psql -d test_crise -f ../migrations/20260912000000_schema_initial.sql
psql -d test_crise -f scenario_securite.sql   # doit se terminer par TOUS_LES_TESTS_PASSENT
```
