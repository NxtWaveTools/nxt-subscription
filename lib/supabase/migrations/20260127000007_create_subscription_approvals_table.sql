-- ============================================================================
-- Subscription Approvals Table
-- ============================================================================
-- Created: 2026-01-27
-- Description: Approval history for subscriptions (POC approve/reject actions)
-- ============================================================================

-- ============================================================================
-- TABLE: subscription_approvals
-- ============================================================================
CREATE TABLE public.subscription_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  action TEXT NOT NULL CHECK (action IN ('APPROVED', 'REJECTED')),
  comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_subscription_approvals_subscription_id ON public.subscription_approvals(subscription_id);
CREATE INDEX idx_subscription_approvals_approver_id ON public.subscription_approvals(approver_id);
CREATE INDEX idx_subscription_approvals_action ON public.subscription_approvals(action);
CREATE INDEX idx_subscription_approvals_created_at ON public.subscription_approvals(created_at DESC);

-- Comments
COMMENT ON TABLE public.subscription_approvals IS 'Approval history - tracks POC approve/reject actions with comments';
COMMENT ON COLUMN public.subscription_approvals.action IS 'APPROVED or REJECTED';
COMMENT ON COLUMN public.subscription_approvals.comments IS 'Optional for approval, required for rejection';

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
ALTER TABLE public.subscription_approvals ENABLE ROW LEVEL SECURITY;

-- ADMIN: Full access
CREATE POLICY "subscription_approvals_admin_full_access"
ON public.subscription_approvals
FOR ALL
TO authenticated
USING (public.has_role('ADMIN'))
WITH CHECK (public.has_role('ADMIN'));

-- FINANCE: Full access (read all, can insert)
CREATE POLICY "subscription_approvals_finance_full_access"
ON public.subscription_approvals
FOR ALL
TO authenticated
USING (public.has_role('FINANCE'))
WITH CHECK (public.has_role('FINANCE'));

-- POC: Read approvals for subscriptions in their departments, Insert their own approvals
CREATE POLICY "subscription_approvals_poc_read"
ON public.subscription_approvals
FOR SELECT
TO authenticated
USING (
  public.has_role('POC') AND
  subscription_id IN (
    SELECT s.id 
    FROM public.subscriptions s
    JOIN public.poc_department_access pda ON s.department_id = pda.department_id
    WHERE pda.poc_id = auth.uid()
  )
);

CREATE POLICY "subscription_approvals_poc_insert"
ON public.subscription_approvals
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role('POC') AND
  approver_id = auth.uid() AND
  subscription_id IN (
    SELECT s.id 
    FROM public.subscriptions s
    JOIN public.poc_department_access pda ON s.department_id = pda.department_id
    WHERE pda.poc_id = auth.uid()
  )
);

-- HOD: Read approvals for subscriptions in their departments
CREATE POLICY "subscription_approvals_hod_read"
ON public.subscription_approvals
FOR SELECT
TO authenticated
USING (
  public.has_role('HOD') AND
  subscription_id IN (
    SELECT s.id 
    FROM public.subscriptions s
    JOIN public.hod_departments hd ON s.department_id = hd.department_id
    WHERE hd.hod_id = auth.uid()
  )
);

-- Requester: Can read approvals for their own subscriptions
CREATE POLICY "subscription_approvals_requester_read"
ON public.subscription_approvals
FOR SELECT
TO authenticated
USING (
  subscription_id IN (
    SELECT id FROM public.subscriptions WHERE requester_id = auth.uid()
  )
);
