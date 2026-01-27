-- ============================================================================
-- Locations Table
-- ============================================================================
-- Created: 2026-01-27
-- Description: Location master for subscription management
-- ============================================================================

-- ============================================================================
-- TABLE: locations
-- ============================================================================
CREATE TABLE public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  location_type TEXT NOT NULL CHECK (location_type IN ('OFFICE', 'NIAT', 'OTHER')),
  address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_locations_name ON public.locations(name);
CREATE INDEX idx_locations_type ON public.locations(location_type);
CREATE INDEX idx_locations_is_active ON public.locations(is_active);

-- Comment
COMMENT ON TABLE public.locations IS 'Location master for subscription management - offices, NIAT centers, etc.';

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read locations
CREATE POLICY "locations_read_all"
ON public.locations
FOR SELECT
TO authenticated
USING (true);

-- ADMIN and FINANCE can manage locations
CREATE POLICY "locations_admin_finance_manage"
ON public.locations
FOR ALL
TO authenticated
USING (public.has_any_role(ARRAY['ADMIN', 'FINANCE']::TEXT[]))
WITH CHECK (public.has_any_role(ARRAY['ADMIN', 'FINANCE']::TEXT[]));
