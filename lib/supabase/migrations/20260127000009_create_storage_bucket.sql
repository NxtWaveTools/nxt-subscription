-- ============================================================================
-- Supabase Storage Bucket for Subscription Attachments
-- ============================================================================
-- Created: 2026-01-27
-- Description: Storage bucket for subscription files (proof of payment, invoices)
-- Path structure: {subscriptionId}/{fileType}/{filename}
-- ============================================================================

-- Note: Storage buckets are typically created via Supabase Dashboard or CLI
-- This migration documents the intended bucket configuration

-- Bucket name: subscription-attachments
-- Public: false (authenticated access only)
-- File size limits enforced at application level:
--   - PROOF_OF_PAYMENT: 10MB max, images only
--   - INVOICE: 50MB max, PDF and images

-- ============================================================================
-- Storage RLS Policies (applied via Supabase Dashboard)
-- ============================================================================
-- 
-- Policy: Allow authenticated users to upload to subscriptions they can access
-- INSERT policy:
--   bucket_id = 'subscription-attachments'
--   auth.role() = 'authenticated'
--
-- Policy: Allow authenticated users to read files from subscriptions they can access  
-- SELECT policy:
--   bucket_id = 'subscription-attachments'
--   auth.role() = 'authenticated'
--
-- Policy: Allow ADMIN/FINANCE to delete files
-- DELETE policy:
--   bucket_id = 'subscription-attachments'
--   auth.role() = 'authenticated'
--
-- ============================================================================

-- Create helper function to check subscription file access
CREATE OR REPLACE FUNCTION public.can_access_subscription_file(subscription_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_user_id UUID;
  v_subscription RECORD;
  v_has_access BOOLEAN := false;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Get subscription details
  SELECT id, department_id, requester_id INTO v_subscription
  FROM public.subscriptions
  WHERE id = subscription_uuid;
  
  IF v_subscription.id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user is the requester
  IF v_subscription.requester_id = v_user_id THEN
    RETURN true;
  END IF;
  
  -- Check if user is ADMIN or FINANCE
  IF public.has_any_role(ARRAY['ADMIN', 'FINANCE']::TEXT[]) THEN
    RETURN true;
  END IF;
  
  -- Check if user is POC with access to the department
  IF public.has_role('POC') THEN
    SELECT EXISTS(
      SELECT 1 FROM public.poc_department_access
      WHERE poc_id = v_user_id AND department_id = v_subscription.department_id
    ) INTO v_has_access;
    IF v_has_access THEN
      RETURN true;
    END IF;
  END IF;
  
  -- Check if user is HOD of the department
  IF public.has_role('HOD') THEN
    SELECT EXISTS(
      SELECT 1 FROM public.hod_departments
      WHERE hod_id = v_user_id AND department_id = v_subscription.department_id
    ) INTO v_has_access;
    IF v_has_access THEN
      RETURN true;
    END IF;
  END IF;
  
  RETURN false;
END;
$$;

COMMENT ON FUNCTION public.can_access_subscription_file IS 'Check if current user can access files for a subscription';
