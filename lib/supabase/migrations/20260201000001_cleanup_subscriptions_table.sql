-- ============================================================================
-- Cleanup Subscriptions Table - Remove Unused/Redundant Fields
-- ============================================================================
-- Created: 2026-02-01
-- Description: Removes fields that are either:
--   1. Completely unused in UI (product_id, budget_period)
--   2. Redundant with payment_cycles table (payment_utr, accounting_status)
-- NOTE: payment_status is KEPT as it's displayed in UI table and used for filtering
-- ============================================================================

-- ============================================================================
-- STEP 1: Drop Foreign Key Constraints
-- ============================================================================
ALTER TABLE public.subscriptions
DROP CONSTRAINT IF EXISTS subscriptions_product_id_fkey;

-- ============================================================================
-- STEP 2: Drop Indexes on Columns Being Removed
-- ============================================================================
DROP INDEX IF EXISTS idx_subscriptions_product_id;

-- ============================================================================
-- STEP 3: Remove Unused Columns
-- ============================================================================

-- product_id: Never used in UI, tool_name is free text
ALTER TABLE public.subscriptions
DROP COLUMN IF EXISTS product_id;

-- budget_period: Never used in any form or display
ALTER TABLE public.subscriptions
DROP COLUMN IF EXISTS budget_period;

-- payment_utr: Redundant - exists in subscription_payments table
ALTER TABLE public.subscriptions
DROP COLUMN IF EXISTS payment_utr;

-- accounting_status: Redundant - exists in subscription_payments table
ALTER TABLE public.subscriptions
DROP COLUMN IF EXISTS accounting_status;

-- NOTE: payment_status is KEPT - it's displayed in UI table view and used for filtering

-- ============================================================================
-- STEP 4: Add Comments for Documentation
-- ============================================================================
COMMENT ON TABLE public.subscriptions IS 
'Subscription records - detailed payment tracking is handled via subscription_payments table';

-- ============================================================================
-- NOTE: The products table is kept for now in case it's needed in the future
-- It can be dropped in a separate migration if confirmed unused
-- ============================================================================
