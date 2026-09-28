-- Simulation minimale de l'environnement Supabase pour tester la migration
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key, is_anonymous boolean default false);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated, service_role;
grant select on auth.users to authenticated;
create schema storage;
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
create table storage.buckets (id text primary key, name text, public boolean default false);
alter table storage.objects enable row level security;
grant usage on schema storage to anon, authenticated;
grant all on storage.objects to anon, authenticated;
create publication supabase_realtime;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
