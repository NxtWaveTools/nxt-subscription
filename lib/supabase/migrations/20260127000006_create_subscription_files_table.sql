-- ============================================================================
-- Subscription Files Table
-- ============================================================================
-- Created: 2026-01-27
-- Description: File attachments for subscriptions (proof of payment, invoices)
-- Storage path: {subscriptionId}/{fileType}/{filename}
-- ============================================================================

-- ============================================================================
-- TABLE: subscription_files
-- ============================================================================
CREATE TABLE public.subscription_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  file_type TEXT NOT NULL CHECK (file_type IN ('PROOF_OF_PAYMENT', 'INVOICE')),
  storage_path TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_subscription_files_subscription_id ON public.subscription_files(subscription_id);
CREATE INDEX idx_subscription_files_file_type ON public.subscription_files(file_type);
CREATE INDEX idx_subscription_files_uploaded_by ON public.subscription_files(uploaded_by);

-- Comments
COMMENT ON TABLE public.subscription_files IS 'File attachments for subscriptions - proof of payment, invoices';
COMMENT ON COLUMN public.subscription_files.storage_path IS 'Supabase Storage path: {subscriptionId}/{fileType}/{filename}';
COMMENT ON COLUMN public.subscription_files.file_type IS 'PROOF_OF_PAYMENT (max 10MB images) or INVOICE (max 50MB pdf/images)';

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
ALTER TABLE public.subscription_files ENABLE ROW LEVEL SECURITY;

-- ADMIN: Full access
CREATE POLICY "subscription_files_admin_full_access"
ON public.subscription_files
FOR ALL
TO authenticated
USING (public.has_role('ADMIN'))
WITH CHECK (public.has_role('ADMIN'));

-- FINANCE: Full access
CREATE POLICY "subscription_files_finance_full_access"
ON public.subscription_files
FOR ALL
TO authenticated
USING (public.has_role('FINANCE'))
WITH CHECK (public.has_role('FINANCE'));

-- POC: Read/Insert files for subscriptions in their departments
CREATE POLICY "subscription_files_poc_access"
ON public.subscription_files
FOR ALL
TO authenticated
USING (
  public.has_role('POC') AND
  subscription_id IN (
    SELECT s.id 
    FROM public.subscriptions s
    JOIN public.poc_department_access pda ON s.department_id = pda.department_id
    WHERE pda.poc_id = auth.uid()
  )
)
WITH CHECK (
  public.has_role('POC') AND
  subscription_id IN (
    SELECT s.id 
    FROM public.subscriptions s
    JOIN public.poc_department_access pda ON s.department_id = pda.department_id
    WHERE pda.poc_id = auth.uid()
  )
);

-- HOD: Read files for subscriptions in their departments
CREATE POLICY "subscription_files_hod_read"
ON public.subscription_files
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

-- Requester: Can read files for their own subscriptions
CREATE POLICY "subscription_files_requester_read"
ON public.subscription_files
FOR SELECT
TO authenticated
USING (
  subscription_id IN (
    SELECT id FROM public.subscriptions WHERE requester_id = auth.uid()
  )
);
