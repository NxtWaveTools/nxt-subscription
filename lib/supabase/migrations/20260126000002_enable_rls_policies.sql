-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================
-- Created: 2026-01-26
-- Description: Role-based access control policies
-- Access Rules:
--   - ADMIN/FINANCE: Full access to all tables
--   - HOD: Read access to own departments only
--   - POC: Read/Update access to assigned departments only
-- ============================================================================

-- ============================================================================
-- HELPER FUNCTIONS for Role Checking
-- ============================================================================

-- Check if current user has a specific role
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if current user has any of the specified roles
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if current user is HOD of a specific department
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if current user (POC) has access to a specific department
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ENABLE RLS on All Tables
-- ============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hod_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hod_poc_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poc_department_access ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES: users table
-- ============================================================================

-- ADMIN/FINANCE: Full access
CREATE POLICY "admin_finance_full_access_users"
ON public.users
FOR ALL
TO authenticated
USING (public.has_any_role(ARRAY['ADMIN', 'FINANCE']::TEXT[]))
WITH CHECK (public.has_any_role(ARRAY['ADMIN', 'FINANCE']::TEXT[]));

-- HOD: Read own profile and users in their departments
CREATE POLICY "hod_read_users"
ON public.users
FOR SELECT
TO authenticated
USING (
  public.has_role('HOD') AND (
    id = auth.uid() -- Own profile
    OR EXISTS ( -- Users in their departments
      SELECT 1
      FROM public.hod_departments hd
      WHERE hd.hod_id = auth.uid()
    )
  )
);

-- POC: Read own profile and users in accessible departments
CREATE POLICY "poc_read_users"
ON public.users
FOR SELECT
TO authenticated
USING (
  public.has_role('POC') AND (
    id = auth.uid() -- Own profile
    OR EXISTS ( -- Users in accessible departments
      SELECT 1
      FROM public.poc_department_access pda
      WHERE pda.poc_id = auth.uid()
    )
  )
);

-- All authenticated users can read their own profile
CREATE POLICY "users_read_own_profile"
ON public.users
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- All authenticated users can update their own profile
CREATE POLICY "users_update_own_profile"
ON public.users
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- ============================================================================
-- RLS POLICIES: roles table
-- ============================================================================

-- Everyone can read roles (needed for login/UI)
CREATE POLICY "roles_read_all"
ON public.roles
FOR SELECT
TO authenticated
USING (true);

-- Only ADMIN can manage roles
CREATE POLICY "admin_manage_roles"
ON public.roles
FOR ALL
TO authenticated
USING (public.has_role('ADMIN'))
WITH CHECK (public.has_role('ADMIN'));

-- ============================================================================
-- RLS POLICIES: departments table
-- ============================================================================

-- ADMIN/FINANCE: Full access
CREATE POLICY "admin_finance_full_access_departments"
ON public.departments
FOR ALL
TO authenticated
USING (public.has_any_role(ARRAY['ADMIN', 'FINANCE']::TEXT[]))
WITH CHECK (public.has_any_role(ARRAY['ADMIN', 'FINANCE']::TEXT[]));

-- HOD: Read own departments
CREATE POLICY "hod_read_departments"
ON public.departments
FOR SELECT
TO authenticated
USING (
  public.has_role('HOD') AND
  public.is_hod_of_department(id)
);

-- POC: Read accessible departments
CREATE POLICY "poc_read_departments"
ON public.departments
FOR SELECT
TO authenticated
USING (
  public.has_role('POC') AND
  public.has_poc_access_to_department(id)
);

-- ============================================================================
-- RLS POLICIES: user_roles table
-- ============================================================================

-- ADMIN: Full access
CREATE POLICY "admin_full_access_user_roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role('ADMIN'))
WITH CHECK (public.has_role('ADMIN'));

-- Users can read their own roles
CREATE POLICY "users_read_own_roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- ============================================================================
-- RLS POLICIES: hod_departments table
-- ============================================================================

-- ADMIN/FINANCE: Full access
CREATE POLICY "admin_finance_full_access_hod_departments"
ON public.hod_departments
FOR ALL
TO authenticated
USING (public.has_any_role(ARRAY['ADMIN', 'FINANCE']::TEXT[]))
WITH CHECK (public.has_any_role(ARRAY['ADMIN', 'FINANCE']::TEXT[]));

-- HOD: Read own department assignments
CREATE POLICY "hod_read_own_departments"
ON public.hod_departments
FOR SELECT
TO authenticated
USING (
  public.has_role('HOD') AND
  hod_id = auth.uid()
);

-- ============================================================================
-- RLS POLICIES: hod_poc_mapping table
-- ============================================================================

-- ADMIN: Full access
CREATE POLICY "admin_full_access_hod_poc_mapping"
ON public.hod_poc_mapping
FOR ALL
TO authenticated
USING (public.has_role('ADMIN'))
WITH CHECK (public.has_role('ADMIN'));

-- HOD/POC: Read own mappings
CREATE POLICY "hod_poc_read_own_mapping"
ON public.hod_poc_mapping
FOR SELECT
TO authenticated
USING (
  (public.has_role('HOD') AND hod_id = auth.uid()) OR
  (public.has_role('POC') AND poc_id = auth.uid())
);

-- ============================================================================
-- RLS POLICIES: poc_department_access table
-- ============================================================================

-- ADMIN/FINANCE: Full access
CREATE POLICY "admin_finance_full_access_poc_access"
ON public.poc_department_access
FOR ALL
TO authenticated
USING (public.has_any_role(ARRAY['ADMIN', 'FINANCE']::TEXT[]))
WITH CHECK (public.has_any_role(ARRAY['ADMIN', 'FINANCE']::TEXT[]));

-- HOD: Read POC access for their departments
CREATE POLICY "hod_read_poc_access"
ON public.poc_department_access
FOR SELECT
TO authenticated
USING (
  public.has_role('HOD') AND
  public.is_hod_of_department(department_id)
);

-- POC: Read own department access
CREATE POLICY "poc_read_own_access"
ON public.poc_department_access
FOR SELECT
TO authenticated
USING (
  public.has_role('POC') AND
  poc_id = auth.uid()
);

-- ============================================================================
-- GRANT USAGE on Helper Functions
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.has_role(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_any_role(TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_hod_of_department(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_poc_access_to_department(UUID) TO authenticated;
