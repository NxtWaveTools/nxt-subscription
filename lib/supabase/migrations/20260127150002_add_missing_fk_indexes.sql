-- ============================================================================
-- Migration: Add Missing Foreign Key Indexes
-- ============================================================================
-- Adds indexes for foreign keys that are missing covering indexes
-- https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys

-- subscription_payments foreign key indexes
CREATE INDEX IF NOT EXISTS idx_subscription_payments_invoice_file_id 
  ON public.subscription_payments(invoice_file_id);

CREATE INDEX IF NOT EXISTS idx_subscription_payments_payment_recorded_by 
  ON public.subscription_payments(payment_recorded_by);

CREATE INDEX IF NOT EXISTS idx_subscription_payments_poc_approved_by 
  ON public.subscription_payments(poc_approved_by);

-- subscriptions foreign key indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_location_id 
  ON public.subscriptions(location_id);

-- Add comments
COMMENT ON INDEX idx_subscription_payments_invoice_file_id IS 'Index for FK to subscription_files';
COMMENT ON INDEX idx_subscription_payments_payment_recorded_by IS 'Index for FK to users';
COMMENT ON INDEX idx_subscription_payments_poc_approved_by IS 'Index for FK to users';
COMMENT ON INDEX idx_subscriptions_location_id IS 'Index for FK to locations';
