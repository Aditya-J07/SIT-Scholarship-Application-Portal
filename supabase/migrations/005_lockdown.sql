-- ==============================================================================
-- 005_lockdown.sql
-- Purpose: stop logged-in users (and anonymous visitors) from reading or writing
-- your tables directly through Supabase's public REST API.
--
-- Why: this app reads and writes the database ONLY from the Next.js server, using the
-- secret (service_role) key. The browser only uses Supabase Auth. So the roles
-- "anon" and "authenticated" need NO direct table access at all.
-- Before this file, the RLS policies allowed any logged-in student to UPDATE their own
-- profiles row (including the "role" column) and to INSERT/UPDATE their own
-- applications rows (including "status" and "merit_score") by calling the REST API
-- directly with the publishable key. RLS cannot restrict individual columns.
--
-- Safe to run more than once. Run it in the Supabase SQL Editor (New query).
-- ==============================================================================

-- 1. Remove every direct table and sequence privilege from the public API roles.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

-- 2. Make sure tables created later are not exposed by default.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;

-- 3. Functions that can be called through the REST API ("RPC") must be
--    service_role only. PUBLIC must be revoked as well, because every role inherits it.
REVOKE ALL ON FUNCTION public.rate_limit_hit(TEXT, INT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rate_limit_hit(TEXT, INT, INT) TO service_role;

REVOKE ALL ON FUNCTION public.cleanup_expired_rate_limits() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_rate_limits() TO service_role;

-- 4. Remove the write policies that no longer make sense (defence in depth).
DROP POLICY IF EXISTS "Users can update their own non-role profile fields" ON public.profiles;
DROP POLICY IF EXISTS "Students can create applications for themselves" ON public.applications;
DROP POLICY IF EXISTS "Students can update their own draft applications" ON public.applications;
DROP POLICY IF EXISTS "Students can upload their own application files" ON public.application_files;

-- 5. Give the SECURITY DEFINER functions a fixed search_path.
ALTER FUNCTION public.rate_limit_hit(TEXT, INT, INT) SET search_path = '';
ALTER FUNCTION public.cleanup_expired_rate_limits() SET search_path = '';

-- ==============================================================================
-- CHECKS: run these AFTER the lines above, as separate queries.
-- ==============================================================================

-- A. Should return ZERO rows (no direct table access for anon/authenticated):
--   SELECT grantee, table_name, privilege_type
--   FROM information_schema.role_table_grants
--   WHERE table_schema = 'public' AND grantee IN ('anon', 'authenticated');

-- B. Should return false for every row:
--   SELECT has_table_privilege('authenticated', 'public.profiles', 'UPDATE') AS can_update_profiles,
--          has_table_privilege('authenticated', 'public.applications', 'UPDATE') AS can_update_applications,
--          has_table_privilege('authenticated', 'public.applications', 'INSERT') AS can_insert_applications;

-- C. Should return ZERO rows (no storage policies exposing your files):
--   SELECT policyname, roles, cmd FROM pg_policies
--   WHERE schemaname = 'storage' AND tablename = 'objects';

-- ==============================================================================
-- BEFORE REAL LAUNCH ONLY (not on the test project, because the automated tests use
-- the open cycles): the seed in 001_init.sql creates the cycles as OPEN with made-up
-- dates. On the production project run this so nothing can be submitted until the
-- Accounts Section confirms the real dates and opens the cycle from the admin page:
--
--   UPDATE public.cycles
--   SET status = 'closed', opens_at = NULL, closes_at = NULL
--   WHERE id IN ('cycle_mnc_2026', 'cycle_sska_2026');
-- ==============================================================================
