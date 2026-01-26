-- ============================================================================
-- Function Security Fix - Set Immutable search_path
-- ============================================================================
-- Created: 2026-01-26
-- Description: Add SET search_path = '' to all functions to prevent
--              security vulnerabilities from mutable search paths
-- Reference: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable
-- ============================================================================

-- ============================================================================
-- FIX: update_updated_at_column
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = ''; -- Security fix

-- ============================================================================
-- FIX: has_role
-- ============================================================================
CREATE OR REPLACE FUNCTION public.has_role(role_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND r.name = role_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''; -- Security fix

-- ============================================================================
-- FIX: has_any_role
-- ============================================================================
CREATE OR REPLACE FUNCTION public.has_any_role(role_names TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND r.name = ANY(role_names)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''; -- Security fix

-- ============================================================================
-- FIX: is_hod_of_department
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_hod_of_department(dept_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.hod_departments
    WHERE hod_id = auth.uid()
      AND department_id = dept_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''; -- Security fix

-- ============================================================================
-- FIX: has_poc_access_to_department
-- ============================================================================
CREATE OR REPLACE FUNCTION public.has_poc_access_to_department(dept_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.poc_department_access
    WHERE poc_id = auth.uid()
      AND department_id = dept_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''; -- Security fix

-- ============================================================================
-- FIX: handle_new_user
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      SPLIT_PART(NEW.email, '@', 1)
    ),
    false
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''; -- Security fix

-- ============================================================================
-- FIX: handle_user_email_update
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_user_email_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.email IS DISTINCT FROM NEW.email THEN
    UPDATE public.users
    SET email = NEW.email,
        updated_at = NOW()
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''; -- Security fix

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Verify all functions have immutable search_path:
-- SELECT proname, prosecdef, proconfig 
-- FROM pg_proc 
-- WHERE pronamespace = 'public'::regnamespace
-- AND proname IN ('has_role', 'has_any_role', 'is_hod_of_department', 
--                 'has_poc_access_to_department', 'handle_new_user', 
--                 'handle_user_email_update', 'update_updated_at_column');
