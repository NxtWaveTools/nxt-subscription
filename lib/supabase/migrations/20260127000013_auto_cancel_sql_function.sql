-- ============================================================================
-- Migration: Auto-Cancel Overdue Invoice Cycles (Pure SQL Version)
-- ============================================================================
-- This migration provides an alternative pure-SQL implementation for 
-- automatically cancelling payment cycles that have passed their invoice deadline.
-- 
-- Use this if you prefer not to use Edge Functions or need a simpler setup.
-- ============================================================================

-- Create the auto-cancel function
CREATE OR REPLACE FUNCTION auto_cancel_overdue_invoices()
RETURNS TABLE (
  cancelled_count integer,
  notification_count integer,
  error_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cancelled_count integer := 0;
  v_notification_count integer := 0;
  v_error_message text;
  v_cycle record;
  v_poc_user_id uuid;
  v_finance_role_id uuid;
  v_finance_user record;
BEGIN
  -- Get the Finance role ID for notifications
  SELECT id INTO v_finance_role_id 
  FROM roles 
  WHERE name = 'FINANCE';

  -- Find all overdue payment cycles
  FOR v_cycle IN 
    SELECT 
      sp.id AS payment_id,
      sp.subscription_id,
      sp.cycle_number,
      sp.invoice_deadline,
      s.id AS sub_id,
      s.tool_name,
      s.vendor_name,
      s.poc_email,
      d.name AS department_name
    FROM subscription_payments sp
    JOIN subscriptions s ON sp.subscription_id = s.id
    LEFT JOIN departments d ON s.department_id = d.id
    WHERE sp.cycle_status = 'PAYMENT_RECORDED'
      AND sp.invoice_file_id IS NULL
      AND sp.invoice_deadline < CURRENT_DATE
  LOOP
    BEGIN
      -- Update the payment cycle to CANCELLED
      UPDATE subscription_payments
      SET 
        cycle_status = 'CANCELLED',
        poc_rejection_reason = 'Invoice not uploaded by deadline - auto-cancelled',
        updated_at = now()
      WHERE id = v_cycle.payment_id;
      
      v_cancelled_count := v_cancelled_count + 1;
      
      -- Create audit log entry
      INSERT INTO audit_log (
        user_id,
        action,
        entity_type,
        entity_id,
        details
      ) VALUES (
        NULL,  -- System action
        'PAYMENT_CYCLE_AUTO_CANCELLED',
        'subscription_payments',
        v_cycle.payment_id,
        jsonb_build_object(
          'subscription_id', v_cycle.subscription_id,
          'cycle_number', v_cycle.cycle_number,
          'invoice_deadline', v_cycle.invoice_deadline,
          'reason', 'Invoice not uploaded by deadline - auto-cancelled'
        )
      );
      
      -- Get POC user for notification
      SELECT id INTO v_poc_user_id
      FROM users
      WHERE email = v_cycle.poc_email;
      
      IF v_poc_user_id IS NOT NULL THEN
        -- Create notification for POC
        INSERT INTO notifications (
          user_id,
          type,
          title,
          message,
          subscription_id,
          is_read
        ) VALUES (
          v_poc_user_id,
          'PAYMENT_UPDATE',
          'Payment Cycle Auto-Cancelled',
          format('Payment cycle #%s for %s was automatically cancelled due to missed invoice deadline (%s).',
            v_cycle.cycle_number, v_cycle.tool_name, v_cycle.invoice_deadline),
          v_cycle.sub_id,
          false
        );
        v_notification_count := v_notification_count + 1;
      END IF;
      
      -- Create notifications for Finance users
      FOR v_finance_user IN
        SELECT ur.user_id
        FROM user_roles ur
        WHERE ur.role_id = v_finance_role_id
      LOOP
        INSERT INTO notifications (
          user_id,
          type,
          title,
          message,
          subscription_id,
          is_read
        ) VALUES (
          v_finance_user.user_id,
          'PAYMENT_UPDATE',
          'Payment Cycle Auto-Cancelled',
          format('Payment cycle #%s for %s (%s) was automatically cancelled due to missed invoice deadline.',
            v_cycle.cycle_number, v_cycle.tool_name, COALESCE(v_cycle.department_name, 'Unknown Dept')),
          v_cycle.sub_id,
          false
        );
        v_notification_count := v_notification_count + 1;
      END LOOP;
      
    EXCEPTION WHEN OTHERS THEN
      v_error_message := COALESCE(v_error_message, '') || 
        format('Error processing cycle %s: %s. ', v_cycle.payment_id, SQLERRM);
    END;
  END LOOP;
  
  -- Log the results
  RAISE NOTICE 'Auto-cancel completed: % cycles cancelled, % notifications sent', 
    v_cancelled_count, v_notification_count;
  
  RETURN QUERY SELECT v_cancelled_count, v_notification_count, v_error_message;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION auto_cancel_overdue_invoices() TO postgres;
GRANT EXECUTE ON FUNCTION auto_cancel_overdue_invoices() TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION auto_cancel_overdue_invoices() IS 
'Automatically cancels payment cycles that have passed their invoice deadline without an uploaded invoice. 
Creates audit log entries and sends notifications to POC and Finance users.
Can be scheduled via pg_cron or called manually.';

-- ============================================================================
-- Alternative: Schedule this function directly with pg_cron
-- Uncomment and use this instead of the Edge Function approach if preferred:
--
-- SELECT cron.schedule(
--   'auto-cancel-overdue-invoices-sql',
--   '0 1 * * *',  -- daily at 1:00 AM
--   $$SELECT * FROM auto_cancel_overdue_invoices()$$
-- );
-- ============================================================================
