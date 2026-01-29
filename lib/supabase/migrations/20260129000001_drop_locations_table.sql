-- ============================================================================
-- Drop Locations Table
-- ============================================================================
-- Migration: 20260129000001_drop_locations_table
-- Description: Remove locations table and related constraints/indexes
-- Date: 2026-01-29
-- ============================================================================

-- Drop foreign key constraint from subscriptions table
ALTER TABLE public.subscriptions 
  DROP CONSTRAINT IF EXISTS subscriptions_location_id_fkey;

-- Drop the index on location_id in subscriptions
DROP INDEX IF EXISTS idx_subscriptions_location_id;

-- Set location_id to NULL in subscriptions (if any data exists)
UPDATE public.subscriptions 
  SET location_id = NULL 
  WHERE location_id IS NOT NULL;

-- Drop the location_id column from subscriptions
ALTER TABLE public.subscriptions 
  DROP COLUMN IF EXISTS location_id;

-- Drop RLS policies on locations table
DROP POLICY IF EXISTS "admin_full_access_locations" ON public.locations;
DROP POLICY IF EXISTS "authenticated_read_locations" ON public.locations;
DROP POLICY IF EXISTS "locations_read_all" ON public.locations;
DROP POLICY IF EXISTS "locations_admin_finance_manage" ON public.locations;

-- Drop indexes on locations table
DROP INDEX IF EXISTS idx_locations_name;
DROP INDEX IF EXISTS idx_locations_type;
DROP INDEX IF EXISTS idx_locations_is_active;

-- Drop the trigger for updating locations updated_at (MUST be before function)
DROP TRIGGER IF EXISTS update_locations_updated_at_trigger ON public.locations;
DROP TRIGGER IF EXISTS locations_updated_at ON public.locations;

-- Drop the function for updating locations updated_at
DROP FUNCTION IF EXISTS public.update_locations_updated_at();

-- Drop the locations table
DROP TABLE IF EXISTS public.locations;

-- Add comment to migration
COMMENT ON SCHEMA public IS 'Removed locations table - no longer needed for subscription management';
