-- ============================================================================
-- Role Count Analytics Function Migration
-- ============================================================================
-- Created: 2026-01-27
-- Description: Database function to aggregate role counts efficiently
-- ============================================================================

-- Function to get role distribution counts
CREATE OR REPLACE FUNCTION public.get_role_distribution()
RETURNS TABLE (
  role_name TEXT,
  user_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.name AS role_name,
    COUNT(ur.user_id)::BIGINT AS user_count
  FROM public.roles r
  LEFT JOIN public.user_roles ur ON ur.role_id = r.id
  GROUP BY r.id, r.name
  ORDER BY r.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_role_distribution() TO authenticated;

-- Set search path for security
ALTER FUNCTION public.get_role_distribution() SET search_path = public;

-- ============================================================================
-- User Activity Stats Function
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_user_activity_stats()
RETURNS TABLE (
  total_users BIGINT,
  active_users BIGINT,
  inactive_users BIGINT,
  active_percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT 
      COUNT(*)::BIGINT AS total,
      COUNT(*) FILTER (WHERE is_active = true)::BIGINT AS active,
      COUNT(*) FILTER (WHERE is_active = false)::BIGINT AS inactive
    FROM public.users
  )
  SELECT 
    s.total AS total_users,
    s.active AS active_users,
    s.inactive AS inactive_users,
    CASE WHEN s.total > 0 
      THEN ROUND((s.active::NUMERIC / s.total::NUMERIC) * 100, 2)
      ELSE 0
    END AS active_percentage
  FROM stats s;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_user_activity_stats() TO authenticated;

-- Set search path for security
ALTER FUNCTION public.get_user_activity_stats() SET search_path = public;

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON FUNCTION public.get_role_distribution() IS 'Returns user count per role for analytics charts';
COMMENT ON FUNCTION public.get_user_activity_stats() IS 'Returns aggregated user activity statistics';
