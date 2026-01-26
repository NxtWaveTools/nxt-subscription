-- ============================================================================
-- Enable Full-Text Search with Fuzzy Matching
-- ============================================================================
-- Description: Enables PostgreSQL pg_trgm extension for fuzzy text search
--              and creates GIN indexes on searchable columns for performance
-- ============================================================================

-- Enable pg_trgm extension for trigram matching (fuzzy search)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add GIN indexes for fast fuzzy search on users table
CREATE INDEX IF NOT EXISTS idx_users_name_gin_trgm 
  ON public.users USING GIN (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_users_email_gin_trgm 
  ON public.users USING GIN (email gin_trgm_ops);

-- Add GIN index for fuzzy search on departments table
CREATE INDEX IF NOT EXISTS idx_departments_name_gin_trgm 
  ON public.departments USING GIN (name gin_trgm_ops);

-- Add comment for documentation
COMMENT ON INDEX idx_users_name_gin_trgm IS 
  'GIN index using trigram ops for fuzzy search on user names';
COMMENT ON INDEX idx_users_email_gin_trgm IS 
  'GIN index using trigram ops for fuzzy search on user emails';
COMMENT ON INDEX idx_departments_name_gin_trgm IS 
  'GIN index using trigram ops for fuzzy search on department names';
