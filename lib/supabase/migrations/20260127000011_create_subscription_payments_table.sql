-- ============================================================================
-- Subscription Payments Table
-- ============================================================================
-- Created: 2026-01-27
-- Description: Tracks multiple payment cycles per subscription
-- ============================================================================

-- ============================================================================
-- ENUM: Payment Cycle Status
-- ============================================================================
CREATE TYPE public.payment_cycle_status AS ENUM (
  'PENDING_PAYMENT',      -- Waiting for Finance to record payment
  'PAYMENT_RECORDED',     -- Finance has recorded payment, waiting for POC invoice
  'PENDING_APPROVAL',     -- Awaiting POC approval for next renewal (10 days before)
  'APPROVED',             -- POC approved renewal
  'REJECTED',             -- POC rejected renewal
  'INVOICE_UPLOADED',     -- POC uploaded invoice
  'COMPLETED',            -- Cycle complete (payment + invoice done)
  'CANCELLED'             -- Cancelled due to missing invoice
);

-- ============================================================================
-- TABLE: subscription_payments
-- ============================================================================
CREATE TABLE public.subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  
  -- Payment cycle period
  cycle_number INTEGER NOT NULL DEFAULT 1,
  cycle_start_date DATE NOT NULL,
  cycle_end_date DATE NOT NULL,
  
  -- Finance records payment
  payment_utr VARCHAR(100),
  payment_status public.payment_status NOT NULL DEFAULT 'IN_PROGRESS',
  accounting_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (accounting_status IN ('PENDING', 'DONE')),
  mandate_id VARCHAR(100),
  payment_recorded_by UUID REFERENCES public.users(id),
  payment_recorded_at TIMESTAMPTZ,
  
  -- POC approval for renewal
  poc_approval_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (poc_approval_status IN ('PENDING', 'APPROVED', 'REJECTED')),
  poc_approved_by UUID REFERENCES public.users(id),
  poc_approved_at TIMESTAMPTZ,
  poc_rejection_reason TEXT,
  
  -- POC invoice upload
  invoice_file_id UUID REFERENCES public.subscription_files(id),
  invoice_uploaded_at TIMESTAMPTZ,
  invoice_deadline DATE NOT NULL, -- cycle_end_date
  
  -- Cycle status
  cycle_status public.payment_cycle_status NOT NULL DEFAULT 'PENDING_PAYMENT',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_cycle_dates CHECK (cycle_end_date > cycle_start_date),
  CONSTRAINT unique_subscription_cycle UNIQUE (subscription_id, cycle_number)
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX idx_subscription_payments_subscription_id ON public.subscription_payments(subscription_id);
CREATE INDEX idx_subscription_payments_cycle_status ON public.subscription_payments(cycle_status);
CREATE INDEX idx_subscription_payments_payment_status ON public.subscription_payments(payment_status);
CREATE INDEX idx_subscription_payments_poc_approval ON public.subscription_payments(poc_approval_status);
CREATE INDEX idx_subscription_payments_invoice_deadline ON public.subscription_payments(invoice_deadline);
CREATE INDEX idx_subscription_payments_cycle_dates ON public.subscription_payments(cycle_start_date, cycle_end_date);

-- Composite index for finding pending approvals (10 days before renewal)
CREATE INDEX idx_subscription_payments_pending_approval 
ON public.subscription_payments(cycle_end_date, poc_approval_status) 
WHERE poc_approval_status = 'PENDING';

-- Composite index for finding overdue invoices
CREATE INDEX idx_subscription_payments_overdue_invoices 
ON public.subscription_payments(invoice_deadline, cycle_status) 
WHERE cycle_status = 'PAYMENT_RECORDED';

-- ============================================================================
-- TRIGGER: Updated At
-- ============================================================================
CREATE TRIGGER update_subscription_payments_updated_at
  BEFORE UPDATE ON public.subscription_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE public.subscription_payments IS 'Tracks multiple payment cycles per subscription with Finance recording and POC invoice upload';
COMMENT ON COLUMN public.subscription_payments.cycle_number IS 'Sequential cycle number (1, 2, 3...) for this subscription';
COMMENT ON COLUMN public.subscription_payments.cycle_start_date IS 'Start date of this payment cycle';
COMMENT ON COLUMN public.subscription_payments.cycle_end_date IS 'End date of this payment cycle';
COMMENT ON COLUMN public.subscription_payments.invoice_deadline IS 'Deadline for POC to upload invoice (same as cycle_end_date)';
COMMENT ON COLUMN public.subscription_payments.cycle_status IS 'Current status of this payment cycle';

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;

-- ADMIN: Full access
CREATE POLICY "subscription_payments_admin_full_access"
ON public.subscription_payments
FOR ALL
TO authenticated
USING (public.has_role('ADMIN'))
WITH CHECK (public.has_role('ADMIN'));

-- FINANCE: Full access
CREATE POLICY "subscription_payments_finance_full_access"
ON public.subscription_payments
FOR ALL
TO authenticated
USING (public.has_role('FINANCE'))
WITH CHECK (public.has_role('FINANCE'));

-- POC: Read and update payments for subscriptions in their departments
CREATE POLICY "subscription_payments_poc_read"
ON public.subscription_payments
FOR SELECT
TO authenticated
USING (
  public.has_role('POC') AND
  subscription_id IN (
    SELECT s.id FROM public.subscriptions s
    WHERE s.department_id IN (
      SELECT pda.department_id 
      FROM public.poc_department_access pda 
      WHERE pda.poc_id = auth.uid()
    )
  )
);

CREATE POLICY "subscription_payments_poc_update"
ON public.subscription_payments
FOR UPDATE
TO authenticated
USING (
  public.has_role('POC') AND
  subscription_id IN (
    SELECT s.id FROM public.subscriptions s
    WHERE s.department_id IN (
      SELECT pda.department_id 
      FROM public.poc_department_access pda 
      WHERE pda.poc_id = auth.uid()
    )
  )
)
WITH CHECK (
  public.has_role('POC') AND
  subscription_id IN (
    SELECT s.id FROM public.subscriptions s
    WHERE s.department_id IN (
      SELECT pda.department_id 
      FROM public.poc_department_access pda 
      WHERE pda.poc_id = auth.uid()
    )
  )
);

-- HOD: Read only for subscriptions in their departments
CREATE POLICY "subscription_payments_hod_read"
ON public.subscription_payments
FOR SELECT
TO authenticated
USING (
  public.has_role('HOD') AND
  subscription_id IN (
    SELECT s.id FROM public.subscriptions s
    WHERE s.department_id IN (
      SELECT hd.department_id 
      FROM public.hod_departments hd 
      WHERE hd.hod_id = auth.uid()
    )
  )
);
