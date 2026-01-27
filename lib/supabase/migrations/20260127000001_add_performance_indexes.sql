-- ============================================================================
-- Performance Indexes Migration
-- ============================================================================
-- Created: 2026-01-27
-- Description: Add indexes for frequently filtered/searched columns
-- ============================================================================

-- User indexes for common filters and searches
CREATE INDEX IF NOT EXISTS idx_users_is_active ON public.users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at DESC);

-- Use pg_trgm for fuzzy text search (extension already enabled)
CREATE INDEX IF NOT EXISTS idx_users_email_trgm ON public.users USING gin(email gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_name_trgm ON public.users USING gin(name gin_trgm_ops);

-- Department indexes
CREATE INDEX IF NOT EXISTS idx_departments_is_active ON public.departments(is_active);
CREATE INDEX IF NOT EXISTS idx_departments_created_at ON public.departments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_departments_name_trgm ON public.departments USING gin(name gin_trgm_ops);

-- User roles index for RLS performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON public.user_roles(role_id);

-- HOD departments indexes for RLS
CREATE INDEX IF NOT EXISTS idx_hod_departments_hod_id ON public.hod_departments(hod_id);
CREATE INDEX IF NOT EXISTS idx_hod_departments_department_id ON public.hod_departments(department_id);

-- POC department access indexes for RLS
CREATE INDEX IF NOT EXISTS idx_poc_department_access_poc_id ON public.poc_department_access(poc_id);
CREATE INDEX IF NOT EXISTS idx_poc_department_access_department_id ON public.poc_department_access(department_id);

-- Composite index for common user queries
CREATE INDEX IF NOT EXISTS idx_users_active_created ON public.users(is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_departments_active_created ON public.departments(is_active, created_at DESC);

-- ============================================================================
-- COMMENT on indexes for documentation
-- ============================================================================
COMMENT ON INDEX idx_users_is_active IS 'Optimizes filtering users by active status';
COMMENT ON INDEX idx_users_email_trgm IS 'Enables fast fuzzy search on email using pg_trgm';
COMMENT ON INDEX idx_users_name_trgm IS 'Enables fast fuzzy search on name using pg_trgm';
COMMENT ON INDEX idx_departments_name_trgm IS 'Enables fast fuzzy search on department name using pg_trgm';
