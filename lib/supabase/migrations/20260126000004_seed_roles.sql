-- ============================================================================
-- Seed Data - Initial Roles
-- ============================================================================
-- Created: 2026-01-26
-- Description: Insert 4 fixed system roles
-- Roles: ADMIN, FINANCE, HOD, POC
-- Note: Uses fixed UUIDs for consistency across environments
-- ============================================================================

-- ============================================================================
-- INSERT: System Roles
-- ============================================================================
INSERT INTO public.roles (id, name) VALUES
  ('00000000-0000-0000-0000-000000000001'::UUID, 'ADMIN'),
  ('00000000-0000-0000-0000-000000000002'::UUID, 'FINANCE'),
  ('00000000-0000-0000-0000-000000000003'::UUID, 'HOD'),
  ('00000000-0000-0000-0000-000000000004'::UUID, 'POC')
ON CONFLICT (name) DO NOTHING; -- Prevent duplicates if migration is re-run

-- ============================================================================
-- COMMENTS (Documentation)
-- ============================================================================
COMMENT ON TABLE public.roles IS 'System roles with fixed UUIDs for reference';
