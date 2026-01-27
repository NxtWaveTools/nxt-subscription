-- ============================================================================
-- Migration: Fix RLS Performance - auth.uid() Pattern
-- ============================================================================
-- Wraps all auth.uid() calls with (SELECT auth.uid()) to prevent re-evaluation per row
-- https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

-- ============================================================================
-- LOCATIONS TABLE - Fix policies and change to authenticated role
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "admin_full_access_locations" ON public.locations;
DROP POLICY IF EXISTS "authenticated_read_locations" ON public.locations;

-- Recreate with proper auth.uid() pattern and authenticated role
CREATE POLICY "admin_full_access_locations" ON public.locations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = (SELECT auth.uid()) 
        AND r.name = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = (SELECT auth.uid()) 
        AND r.name = 'ADMIN'
    )
  );

CREATE POLICY "authenticated_read_locations" ON public.locations
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL AND is_active = true);

-- ============================================================================
-- SUBSCRIPTIONS TABLE - Fix all policies
-- ============================================================================

DROP POLICY IF EXISTS "admin_full_access_subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "finance_read_subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "finance_create_subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "finance_update_subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "poc_read_subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "poc_update_subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "hod_read_subscriptions" ON public.subscriptions;

-- Admin full access
CREATE POLICY "admin_full_access_subscriptions" ON public.subscriptions
  FOR ALL
  TO authenticated
  USING (public.get_user_role_name((SELECT auth.uid())) = 'ADMIN')
  WITH CHECK (public.get_user_role_name((SELECT auth.uid())) = 'ADMIN');

-- Finance read all
CREATE POLICY "finance_read_subscriptions" ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING (public.get_user_role_name((SELECT auth.uid())) = 'FINANCE');

-- Finance create (must set created_by to their own id)
CREATE POLICY "finance_create_subscriptions" ON public.subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_user_role_name((SELECT auth.uid())) = 'FINANCE' 
    AND created_by = (SELECT auth.uid())
  );

-- Finance update all
CREATE POLICY "finance_update_subscriptions" ON public.subscriptions
  FOR UPDATE
  TO authenticated
  USING (public.get_user_role_name((SELECT auth.uid())) = 'FINANCE')
  WITH CHECK (public.get_user_role_name((SELECT auth.uid())) = 'FINANCE');

-- POC read their departments
CREATE POLICY "poc_read_subscriptions" ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING (
    public.get_user_role_name((SELECT auth.uid())) = 'POC'
    AND department_id IN (
      SELECT department_id 
      FROM public.poc_department_access 
      WHERE poc_id = (SELECT auth.uid())
    )
  );

-- POC update their departments
CREATE POLICY "poc_update_subscriptions" ON public.subscriptions
  FOR UPDATE
  TO authenticated
  USING (
    public.get_user_role_name((SELECT auth.uid())) = 'POC'
    AND department_id IN (
      SELECT department_id 
      FROM public.poc_department_access 
      WHERE poc_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    public.get_user_role_name((SELECT auth.uid())) = 'POC'
    AND department_id IN (
      SELECT department_id 
      FROM public.poc_department_access 
      WHERE poc_id = (SELECT auth.uid())
    )
  );

-- HOD read their departments
CREATE POLICY "hod_read_subscriptions" ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING (
    public.get_user_role_name((SELECT auth.uid())) = 'HOD'
    AND department_id IN (
      SELECT department_id 
      FROM public.hod_departments 
      WHERE hod_id = (SELECT auth.uid())
    )
  );

-- ============================================================================
-- SUBSCRIPTION_APPROVALS TABLE - Fix all policies
-- ============================================================================

DROP POLICY IF EXISTS "admin_full_access_approvals" ON public.subscription_approvals;
DROP POLICY IF EXISTS "finance_read_approvals" ON public.subscription_approvals;
DROP POLICY IF EXISTS "poc_create_approvals" ON public.subscription_approvals;
DROP POLICY IF EXISTS "poc_read_approvals" ON public.subscription_approvals;
DROP POLICY IF EXISTS "hod_read_approvals" ON public.subscription_approvals;

-- Admin full access
CREATE POLICY "admin_full_access_approvals" ON public.subscription_approvals
  FOR ALL
  TO authenticated
  USING (public.get_user_role_name((SELECT auth.uid())) = 'ADMIN')
  WITH CHECK (public.get_user_role_name((SELECT auth.uid())) = 'ADMIN');

-- Finance read
CREATE POLICY "finance_read_approvals" ON public.subscription_approvals
  FOR SELECT
  TO authenticated
  USING (public.get_user_role_name((SELECT auth.uid())) = 'FINANCE');

-- POC create approvals for their departments
CREATE POLICY "poc_create_approvals" ON public.subscription_approvals
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_user_role_name((SELECT auth.uid())) = 'POC'
    AND approver_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.subscriptions s
      JOIN public.poc_department_access pda ON pda.department_id = s.department_id
      WHERE s.id = subscription_id 
        AND pda.poc_id = (SELECT auth.uid())
    )
  );

-- POC read their departments
CREATE POLICY "poc_read_approvals" ON public.subscription_approvals
  FOR SELECT
  TO authenticated
  USING (
    public.get_user_role_name((SELECT auth.uid())) = 'POC'
    AND EXISTS (
      SELECT 1
      FROM public.subscriptions s
      JOIN public.poc_department_access pda ON pda.department_id = s.department_id
      WHERE s.id = subscription_id 
        AND pda.poc_id = (SELECT auth.uid())
    )
  );

-- HOD read their departments
CREATE POLICY "hod_read_approvals" ON public.subscription_approvals
  FOR SELECT
  TO authenticated
  USING (
    public.get_user_role_name((SELECT auth.uid())) = 'HOD'
    AND EXISTS (
      SELECT 1
      FROM public.subscriptions s
      JOIN public.hod_departments hd ON hd.department_id = s.department_id
      WHERE s.id = subscription_id 
        AND hd.hod_id = (SELECT auth.uid())
    )
  );

-- ============================================================================
-- SUBSCRIPTION_FILES TABLE - Fix all policies
-- ============================================================================

DROP POLICY IF EXISTS "admin_full_access_files" ON public.subscription_files;
DROP POLICY IF EXISTS "finance_manage_files" ON public.subscription_files;
DROP POLICY IF EXISTS "poc_read_files" ON public.subscription_files;
DROP POLICY IF EXISTS "poc_insert_files" ON public.subscription_files;
DROP POLICY IF EXISTS "hod_read_files" ON public.subscription_files;

-- Admin full access
CREATE POLICY "admin_full_access_files" ON public.subscription_files
  FOR ALL
  TO authenticated
  USING (public.get_user_role_name((SELECT auth.uid())) = 'ADMIN')
  WITH CHECK (public.get_user_role_name((SELECT auth.uid())) = 'ADMIN');

-- Finance manage files
CREATE POLICY "finance_manage_files" ON public.subscription_files
  FOR ALL
  TO authenticated
  USING (public.get_user_role_name((SELECT auth.uid())) = 'FINANCE')
  WITH CHECK (public.get_user_role_name((SELECT auth.uid())) = 'FINANCE');

-- POC read their departments
CREATE POLICY "poc_read_files" ON public.subscription_files
  FOR SELECT
  TO authenticated
  USING (
    public.get_user_role_name((SELECT auth.uid())) = 'POC'
    AND EXISTS (
      SELECT 1
      FROM public.subscriptions s
      JOIN public.poc_department_access pda ON pda.department_id = s.department_id
      WHERE s.id = subscription_id 
        AND pda.poc_id = (SELECT auth.uid())
    )
  );

-- POC insert for their departments
CREATE POLICY "poc_insert_files" ON public.subscription_files
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_user_role_name((SELECT auth.uid())) = 'POC'
    AND uploaded_by = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.subscriptions s
      JOIN public.poc_department_access pda ON pda.department_id = s.department_id
      WHERE s.id = subscription_id 
        AND pda.poc_id = (SELECT auth.uid())
    )
  );

-- HOD read their departments
CREATE POLICY "hod_read_files" ON public.subscription_files
  FOR SELECT
  TO authenticated
  USING (
    public.get_user_role_name((SELECT auth.uid())) = 'HOD'
    AND EXISTS (
      SELECT 1
      FROM public.subscriptions s
      JOIN public.hod_departments hd ON hd.department_id = s.department_id
      WHERE s.id = subscription_id 
        AND hd.hod_id = (SELECT auth.uid())
    )
  );

-- ============================================================================
-- SUBSCRIPTION_PAYMENTS TABLE - Fix policies
-- ============================================================================

DROP POLICY IF EXISTS "subscription_payments_poc_read" ON public.subscription_payments;
DROP POLICY IF EXISTS "subscription_payments_poc_update" ON public.subscription_payments;
DROP POLICY IF EXISTS "subscription_payments_hod_read" ON public.subscription_payments;

-- POC read their departments
CREATE POLICY "subscription_payments_poc_read" ON public.subscription_payments
  FOR SELECT
  TO authenticated
  USING (
    public.has_role('POC')
    AND subscription_id IN (
      SELECT s.id
      FROM public.subscriptions s
      WHERE s.department_id IN (
        SELECT pda.department_id
        FROM public.poc_department_access pda
        WHERE pda.poc_id = (SELECT auth.uid())
      )
    )
  );

-- POC update their departments
CREATE POLICY "subscription_payments_poc_update" ON public.subscription_payments
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role('POC')
    AND subscription_id IN (
      SELECT s.id
      FROM public.subscriptions s
      WHERE s.department_id IN (
        SELECT pda.department_id
        FROM public.poc_department_access pda
        WHERE pda.poc_id = (SELECT auth.uid())
      )
    )
  )
  WITH CHECK (
    public.has_role('POC')
    AND subscription_id IN (
      SELECT s.id
      FROM public.subscriptions s
      WHERE s.department_id IN (
        SELECT pda.department_id
        FROM public.poc_department_access pda
        WHERE pda.poc_id = (SELECT auth.uid())
      )
    )
  );

-- HOD read their departments
CREATE POLICY "subscription_payments_hod_read" ON public.subscription_payments
  FOR SELECT
  TO authenticated
  USING (
    public.has_role('HOD')
    AND subscription_id IN (
      SELECT s.id
      FROM public.subscriptions s
      WHERE s.department_id IN (
        SELECT hd.department_id
        FROM public.hod_departments hd
        WHERE hd.hod_id = (SELECT auth.uid())
      )
    )
  );

-- ============================================================================
-- VENDORS TABLE - Fix policies
-- ============================================================================

DROP POLICY IF EXISTS "Admin and Finance can manage vendors" ON public.vendors;

CREATE POLICY "Admin and Finance can manage vendors" ON public.vendors
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = (SELECT auth.uid()) 
        AND r.name IN ('ADMIN', 'FINANCE')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = (SELECT auth.uid()) 
        AND r.name IN ('ADMIN', 'FINANCE')
    )
  );

-- ============================================================================
-- PRODUCTS TABLE - Fix policies
-- ============================================================================

DROP POLICY IF EXISTS "Admin and Finance can manage products" ON public.products;

CREATE POLICY "Admin and Finance can manage products" ON public.products
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = (SELECT auth.uid()) 
        AND r.name IN ('ADMIN', 'FINANCE')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = (SELECT auth.uid()) 
        AND r.name IN ('ADMIN', 'FINANCE')
    )
  );

-- Add comment
COMMENT ON POLICY "admin_full_access_locations" ON public.locations IS 'Admin can manage all locations - optimized with SELECT auth.uid()';
COMMENT ON POLICY "authenticated_read_locations" ON public.locations IS 'Authenticated users can read active locations - optimized with SELECT auth.uid()';
