-- =============================================================================
-- Gestion automatique des échéances d'étape (Supabase Cron, toutes les 5 s)
-- =============================================================================
-- advance_expired_steps() fait passer à l'étape suivante les équipes dont le
-- temps est écoulé (étapes « fin du temps = auto »), ou les marque « time_up »
-- (étapes « fin du temps = animateur »). Le passage d'étape n'est JAMAIS
-- déclenché par un navigateur participant.
create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule(
  'avancer-etapes-expirees',
  '5 seconds',
  $$ select public.advance_expired_steps(); $$
);
