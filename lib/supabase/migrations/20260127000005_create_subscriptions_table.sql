-- ============================================================================
-- Subscriptions Table
-- ============================================================================
-- Created: 2026-01-27
-- Description: Core subscription management table with approval workflow
-- ============================================================================

-- ============================================================================
-- TABLE: subscriptions
-- ============================================================================
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Request details
  request_type TEXT NOT NULL CHECK (request_type IN ('INVOICE', 'QUOTATION')),
  subscription_name TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  vendor_name TEXT NOT NULL,
  
  -- Organizational
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  requester_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  
  -- Financial
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'INR' CHECK (currency IN ('USD', 'EUR', 'GBP', 'INR', 'SGD', 'CHF')),
  billing_frequency TEXT NOT NULL CHECK (billing_frequency IN ('MONTHLY', 'QUARTERLY', 'YEARLY', 'USAGE_BASED')),
  
  -- Payment tracking
  payment_utr TEXT,
  payment_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'IN_PROGRESS', 'PAID', 'DECLINED')),
  
  -- Workflow status
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVE', 'REJECTED', 'EXPIRED', 'CANCELLED')),
  
  -- Accounting
  accounting_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (accounting_status IN ('PENDING', 'DONE')),
  
  -- Additional metadata
  url TEXT,
  mail_id_username TEXT,
  poc_email TEXT,
  mandate_id TEXT,
  budget_period TEXT,
  requester_remarks TEXT,
  
  -- Dates
  start_date DATE NOT NULL,
  end_date DATE,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_end_date CHECK (end_date IS NULL OR end_date > start_date)
);

-- Indexes for common queries
CREATE INDEX idx_subscriptions_department_id ON public.subscriptions(department_id);
CREATE INDEX idx_subscriptions_location_id ON public.subscriptions(location_id);
CREATE INDEX idx_subscriptions_requester_id ON public.subscriptions(requester_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_subscriptions_payment_status ON public.subscriptions(payment_status);
CREATE INDEX idx_subscriptions_request_type ON public.subscriptions(request_type);
CREATE INDEX idx_subscriptions_billing_frequency ON public.subscriptions(billing_frequency);
CREATE INDEX idx_subscriptions_created_at ON public.subscriptions(created_at DESC);
CREATE INDEX idx_subscriptions_start_date ON public.subscriptions(start_date);
CREATE INDEX idx_subscriptions_end_date ON public.subscriptions(end_date);

-- Composite indexes for common filtered queries
CREATE INDEX idx_subscriptions_dept_status ON public.subscriptions(department_id, status, created_at DESC);
CREATE INDEX idx_subscriptions_status_payment ON public.subscriptions(status, payment_status);

-- Full-text search on vendor_name and subscription_name
CREATE INDEX idx_subscriptions_vendor_trgm ON public.subscriptions USING gin(vendor_name gin_trgm_ops);
CREATE INDEX idx_subscriptions_name_trgm ON public.subscriptions USING gin(subscription_name gin_trgm_ops);
CREATE INDEX idx_subscriptions_tool_trgm ON public.subscriptions USING gin(tool_name gin_trgm_ops);

-- Updated_at trigger
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE public.subscriptions IS 'Core subscription management table with FINANCE→POC approval workflow';
COMMENT ON COLUMN public.subscriptions.status IS 'Workflow status: PENDING (awaiting POC approval), ACTIVE (approved), REJECTED, EXPIRED, CANCELLED';
COMMENT ON COLUMN public.subscriptions.payment_status IS 'Payment tracking: PENDING, IN_PROGRESS, PAID, DECLINED';
COMMENT ON COLUMN public.subscriptions.vendor_name IS 'Free text vendor name field';

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- ADMIN: Full access
CREATE POLICY "subscriptions_admin_full_access"
ON public.subscriptions
FOR ALL
TO authenticated
USING (public.has_role('ADMIN'))
WITH CHECK (public.has_role('ADMIN'));

-- FINANCE: Full access (create, read, update, delete)
CREATE POLICY "subscriptions_finance_full_access"
ON public.subscriptions
FOR ALL
TO authenticated
USING (public.has_role('FINANCE'))
WITH CHECK (public.has_role('FINANCE'));

-- POC: Read subscriptions in their departments
CREATE POLICY "subscriptions_poc_read"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (
  public.has_role('POC') AND
  department_id IN (
    SELECT pda.department_id 
    FROM public.poc_department_access pda 
    WHERE pda.poc_id = auth.uid()
  )
);

-- POC: Update status fields only for subscriptions in their departments
CREATE POLICY "subscriptions_poc_update_status"
ON public.subscriptions
FOR UPDATE
TO authenticated
USING (
  public.has_role('POC') AND
  department_id IN (
    SELECT pda.department_id 
    FROM public.poc_department_access pda 
    WHERE pda.poc_id = auth.uid()
  )
)
WITH CHECK (
  public.has_role('POC') AND
  department_id IN (
    SELECT pda.department_id 
    FROM public.poc_department_access pda 
    WHERE pda.poc_id = auth.uid()
  )
);

-- HOD: Read subscriptions in their departments (view only)
CREATE POLICY "subscriptions_hod_read"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (
  public.has_role('HOD') AND
  department_id IN (
    SELECT hd.department_id 
    FROM public.hod_departments hd 
    WHERE hd.hod_id = auth.uid()
  )
);

-- Requester: Can read their own subscriptions
CREATE POLICY "subscriptions_requester_read_own"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (requester_id = auth.uid());
