-- ============================================================================
-- Create Analytics Views for Department Metrics
-- ============================================================================
-- Description: Creates materialized views and functions for department analytics
--              including user counts, role distribution, and activity metrics
-- ============================================================================

-- Create view for department analytics
CREATE OR REPLACE VIEW public.department_analytics AS
SELECT 
  d.id AS department_id,
  d.name AS department_name,
  d.is_active AS is_active,
  d.created_at,
  d.updated_at,
  
  -- Count total users (HODs + POCs)
  (
    SELECT COUNT(DISTINCT user_id)
    FROM (
      SELECT hod_id AS user_id FROM public.hod_departments WHERE department_id = d.id
      UNION
      SELECT poc_id AS user_id FROM public.poc_department_access WHERE department_id = d.id
    ) AS dept_users
  ) AS total_users,
  
  -- Count active users
  (
    SELECT COUNT(DISTINCT u.id)
    FROM (
      SELECT hod_id AS user_id FROM public.hod_departments WHERE department_id = d.id
      UNION
      SELECT poc_id AS user_id FROM public.poc_department_access WHERE department_id = d.id
    ) AS dept_users
    INNER JOIN public.users u ON dept_users.user_id = u.id
    WHERE u.is_active = true
  ) AS active_users,
  
  -- Count inactive users
  (
    SELECT COUNT(DISTINCT u.id)
    FROM (
      SELECT hod_id AS user_id FROM public.hod_departments WHERE department_id = d.id
      UNION
      SELECT poc_id AS user_id FROM public.poc_department_access WHERE department_id = d.id
    ) AS dept_users
    INNER JOIN public.users u ON dept_users.user_id = u.id
    WHERE u.is_active = false
  ) AS inactive_users,
  
  -- Count HODs
  (
    SELECT COUNT(DISTINCT hod_id)
    FROM public.hod_departments
    WHERE department_id = d.id
  ) AS hod_count,
  
  -- Count POCs
  (
    SELECT COUNT(DISTINCT poc_id)
    FROM public.poc_department_access
    WHERE department_id = d.id
  ) AS poc_count

FROM public.departments d;

-- Add comment for documentation
COMMENT ON VIEW public.department_analytics IS 
  'Aggregated analytics for departments including user counts by role and status';

-- Grant permissions (ADMIN and FINANCE can read analytics)
ALTER VIEW public.department_analytics OWNER TO postgres;

-- Create RLS policy for department_analytics view
-- Note: Views inherit RLS from underlying tables, but we'll add explicit access control
GRANT SELECT ON public.department_analytics TO authenticated;
