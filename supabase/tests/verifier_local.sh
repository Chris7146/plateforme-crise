#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Rejoue le schéma, les scénarios de sécurité et le jeu de démonstration
# sur une base PostgreSQL locale jetable.
#
# Ne touche ni au projet Supabase hébergé, ni à un serveur PostgreSQL déjà
# installé : un cluster temporaire est créé dans un dossier temporaire, avec
# une socket privée, puis supprimé à la fin (même en cas d'erreur).
#
# Usage : supabase/tests/verifier_local.sh
# ---------------------------------------------------------------------------
set -euo pipefail

export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"

if ! command -v initdb > /dev/null; then
  echo "PostgreSQL introuvable. Installer le client :  brew install postgresql@17" >&2
  exit 1
fi

ICI="$(cd "$(dirname "$0")" && pwd)"
TRAVAIL="$(mktemp -d)"

nettoyer() {
  pg_ctl -D "$TRAVAIL/data" stop -m immediate > /dev/null 2>&1 || true
  rm -rf "$TRAVAIL"
}
trap nettoyer EXIT

echo "→ Cluster temporaire dans $TRAVAIL"
initdb -D "$TRAVAIL/data" -U postgres -A trust --no-sync > "$TRAVAIL/initdb.log" 2>&1
pg_ctl -D "$TRAVAIL/data" -o "-k $TRAVAIL -h '' -c listen_addresses=''" \
  -l "$TRAVAIL/serveur.log" start > /dev/null

psql_local() { psql -h "$TRAVAIL" -U postgres -v ON_ERROR_STOP=1 "$@"; }

# Prépare une base neuve : environnement simulé puis migrations.
ROLES_CREES=non
preparer() {
  local base="$1"
  createdb -h "$TRAVAIL" -U postgres "$base"
  if [ "$ROLES_CREES" = "oui" ]; then
    # Les rôles (anon, authenticated, service_role) appartiennent au cluster,
    # pas à la base : on ne les crée qu'une fois.
    sed '/^create role /d' "$ICI/environnement_simule.sql" | psql_local -d "$base" -q -f -
  else
    psql_local -d "$base" -q -f "$ICI/environnement_simule.sql"
    ROLES_CREES=oui
  fi
  local cron_disponible
  cron_disponible=$(psql_local -d "$base" -t -A \
    -c "select count(*) from pg_available_extensions where name = 'pg_cron'")
  for migration in "$ICI"/../migrations/*.sql; do
    # pg_cron est fourni par Supabase et n'existe pas dans une installation
    # locale : la planification n'est pas rejouable ici, le reste du schéma si.
    if grep -q pg_cron "$migration" && [ "$cron_disponible" = "0" ]; then
      echo "   $(basename "$migration") — ignorée (pg_cron : extension Supabase)"
      continue
    fi
    echo "   $(basename "$migration")"
    psql_local -d "$base" -q -f "$migration"
  done
}

echo "→ Base des scénarios de sécurité"
preparer securite
echo "→ Scénarios de sécurité"
psql_local -d securite -f "$ICI/scenario_securite.sql" | tail -3

# Base distincte : les comptages doivent porter sur le seul jeu de démonstration,
# sans les exercices créés par les scénarios de sécurité.
echo "→ Base du jeu de démonstration"
preparer demonstration
echo "→ Jeu de démonstration"
psql_local -d demonstration -q -f "$ICI/../seed_demo.sql"

echo "→ Contenu créé"
psql_local -d demonstration -t -c "
  select format(
    '   %s exercice · %s étapes · %s min · %s contenus · %s questions · %s indices · %s clients',
    (select count(*) from public.exercises),
    (select count(*) from public.steps),
    (select sum(duration_seconds) / 60 from public.steps),
    (select count(*) from public.contents),
    (select count(*) from public.questions),
    (select count(*) from public.hints),
    (select count(*) from public.clients));"

echo "→ Rejeu du jeu de démonstration (doit être sans effet)"
psql_local -d demonstration -q -f "$ICI/../seed_demo.sql"
psql_local -d demonstration -t -c "
  select format('   après rejeu : %s exercice · %s étapes · %s clients',
    (select count(*) from public.exercises),
    (select count(*) from public.steps),
    (select count(*) from public.clients));"

echo "✓ Vérification terminée."
