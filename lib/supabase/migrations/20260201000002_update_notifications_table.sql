-- ============================================================================
-- Update Notifications Table - Add cycle_id and New Types
-- ============================================================================
-- Created: 2026-02-01
-- Description: Enhances notifications table for renewal workflow
-- ============================================================================

-- ============================================================================
-- STEP 1: Add cycle_id Column
-- ============================================================================
ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS cycle_id UUID REFERENCES public.subscription_payments(id) ON DELETE CASCADE;

-- ============================================================================
-- STEP 2: Add Index for cycle_id
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_notifications_cycle_id ON public.notifications(cycle_id);

-- ============================================================================
-- STEP 3: Update Type Check Constraint
-- ============================================================================
-- Drop existing check constraint
ALTER TABLE public.notifications
DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add new check constraint with additional types
ALTER TABLE public.notifications
ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
  'APPROVAL_REQUEST',      -- POC needs to approve subscription
  'APPROVAL_DECISION',     -- Requester notified of approval/rejection
  'PAYMENT_UPDATE',        -- Payment status changed
  'RENEWAL_REMINDER',      -- Daily reminder for pending renewal approval
  'INVOICE_OVERDUE',       -- Invoice upload deadline passed
  'GENERAL'                -- General notifications
));

-- ============================================================================
-- STEP 4: Add Helper Function for Creating Notifications
-- ============================================================================
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_subscription_id UUID DEFAULT NULL,
  p_cycle_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    subscription_id,
    cycle_id,
    is_read,
    created_at
  ) VALUES (
    p_user_id,
    p_type,
    p_title,
    p_message,
    p_subscription_id,
    p_cycle_id,
    false,
    NOW()
  )
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION create_notification TO authenticated;

-- ============================================================================
-- STEP 5: Add Function to Check for Duplicate Notifications (Same Day)
-- ============================================================================
CREATE OR REPLACE FUNCTION notification_exists_today(
  p_user_id UUID,
  p_type TEXT,
  p_cycle_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.notifications
    WHERE user_id = p_user_id
      AND type = p_type
      AND cycle_id = p_cycle_id
      AND created_at::date = CURRENT_DATE
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION notification_exists_today TO authenticated;

-- ============================================================================
-- STEP 6: Update Comments
-- ============================================================================
COMMENT ON COLUMN public.notifications.cycle_id IS 'Optional link to related payment cycle for navigation';
COMMENT ON COLUMN public.notifications.type IS 'APPROVAL_REQUEST, APPROVAL_DECISION, PAYMENT_UPDATE, RENEWAL_REMINDER, INVOICE_OVERDUE, GENERAL';
