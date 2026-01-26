-- ============================================================================
-- RLS Performance Fix - Optimize auth.uid() Calls
-- ============================================================================
-- Created: 2026-01-26
-- Description: Replace auth.uid() with (SELECT auth.uid()) to prevent
--              re-evaluation for each row, improving query performance
-- Reference: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
-- ============================================================================

-- ============================================================================
-- FIX: users table policies
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "hod_read_users" ON public.users;
DROP POLICY IF EXISTS "poc_read_users" ON public.users;
DROP POLICY IF EXISTS "users_read_own_profile" ON public.users;
DROP POLICY IF EXISTS "users_update_own_profile" ON public.users;

-- Recreate with optimized auth.uid() calls
CREATE POLICY "hod_read_users"
ON public.users
FOR SELECT
TO authenticated
USING (
  public.has_role('HOD') AND (
    id = (SELECT auth.uid()) -- Optimized
    OR EXISTS (
      SELECT 1
      FROM public.hod_departments hd
      WHERE hd.hod_id = (SELECT auth.uid()) -- Optimized
    )
  )
);

CREATE POLICY "poc_read_users"
ON public.users
FOR SELECT
TO authenticated
USING (
  public.has_role('POC') AND (
    id = (SELECT auth.uid()) -- Optimized
    OR EXISTS (
      SELECT 1
      FROM public.poc_department_access pda
      WHERE pda.poc_id = (SELECT auth.uid()) -- Optimized
    )
  )
);

CREATE POLICY "users_read_own_profile"
ON public.users
FOR SELECT
TO authenticated
USING (id = (SELECT auth.uid())); -- Optimized

CREATE POLICY "users_update_own_profile"
ON public.users
FOR UPDATE
TO authenticated
USING (id = (SELECT auth.uid())) -- Optimized
WITH CHECK (id = (SELECT auth.uid())); -- Optimized

-- ============================================================================
-- FIX: user_roles table policies
-- ============================================================================

DROP POLICY IF EXISTS "users_read_own_roles" ON public.user_roles;

CREATE POLICY "users_read_own_roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid())); -- Optimized

-- ============================================================================
-- FIX: hod_departments table policies
-- ============================================================================

DROP POLICY IF EXISTS "hod_read_own_departments" ON public.hod_departments;

CREATE POLICY "hod_read_own_departments"
ON public.hod_departments
FOR SELECT
TO authenticated
USING (
  public.has_role('HOD') AND
  hod_id = (SELECT auth.uid()) -- Optimized
);

-- ============================================================================
-- FIX: hod_poc_mapping table policies
-- ============================================================================

DROP POLICY IF EXISTS "hod_poc_read_own_mapping" ON public.hod_poc_mapping;

CREATE POLICY "hod_poc_read_own_mapping"
ON public.hod_poc_mapping
FOR SELECT
TO authenticated
USING (
  hod_id = (SELECT auth.uid()) OR -- Optimized
  poc_id = (SELECT auth.uid()) -- Optimized
);

-- ============================================================================
-- FIX: poc_department_access table policies
-- ============================================================================

DROP POLICY IF EXISTS "poc_read_own_access" ON public.poc_department_access;

CREATE POLICY "poc_read_own_access"
ON public.poc_department_access
FOR SELECT
TO authenticated
USING (
  public.has_role('POC') AND
  poc_id = (SELECT auth.uid()) -- Optimized
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Run Supabase linter after applying to verify fixes:
-- SELECT * FROM pg_catalog.pg_policies WHERE schemaname = 'public';
