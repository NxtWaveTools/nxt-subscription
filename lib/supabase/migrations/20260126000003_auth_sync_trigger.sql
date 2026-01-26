-- ============================================================================
-- Auth Sync Trigger - OAuth Integration
-- ============================================================================
-- Created: 2026-01-26
-- Description: Automatically creates a user in public.users when a new user
--              signs up via OAuth (Google/Microsoft)
-- Flow: 
--   1. User signs up via OAuth
--   2. Supabase creates auth.users record
--   3. Trigger fires and creates matching public.users record
--   4. Admin assigns roles and activates user
-- ============================================================================

-- ============================================================================
-- TRIGGER FUNCTION: Create user profile on OAuth signup
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert new user into public.users table
  INSERT INTO public.users (id, email, name, is_active)
  VALUES (
    NEW.id,                                           -- Same UUID as auth.users
    NEW.email,                                        -- Email from OAuth
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',          -- Try full_name first
      NEW.raw_user_meta_data->>'name',               -- Fallback to name
      SPLIT_PART(NEW.email, '@', 1)                  -- Fallback to email username
    ),
    false                                             -- Needs admin approval
  )
  ON CONFLICT (id) DO NOTHING; -- Prevent duplicate inserts
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGER: Execute on new auth.users insert
-- ============================================================================
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- FUNCTION: Sync user email updates from auth.users to public.users
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_user_email_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Update email in public.users if it changed in auth.users
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    UPDATE public.users
    SET email = NEW.email,
        updated_at = NOW()
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGER: Sync email changes
-- ============================================================================
CREATE TRIGGER on_auth_user_email_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION public.handle_user_email_update();

-- ============================================================================
-- COMMENTS (Documentation)
-- ============================================================================
COMMENT ON FUNCTION public.handle_new_user() IS 
'Automatically creates a user profile in public.users when OAuth signup occurs';

COMMENT ON FUNCTION public.handle_user_email_update() IS 
'Syncs email changes from auth.users to public.users';
