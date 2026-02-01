-- ============================================================================
-- Create Cron Job for Daily Renewal Reminders
-- ============================================================================
-- Created: 2026-02-01
-- Description: Schedules daily reminder notifications for pending approvals
-- ============================================================================

-- ============================================================================
-- STEP 1: Enable pg_cron and pg_net if not already enabled
-- (These may already be enabled from previous migrations)
-- ============================================================================
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================================================
-- STEP 2: Create the cron job to send daily reminders
-- Runs every day at 9:00 AM UTC
-- ============================================================================

-- First, remove any existing job with the same name
SELECT cron.unschedule('send-daily-reminders');

-- Schedule the daily reminders edge function
-- Runs at 9:00 AM UTC every day
SELECT cron.schedule(
  'send-daily-reminders',                    -- Job name
  '0 9 * * *',                               -- Cron expression: 9:00 AM UTC daily
  $$
  SELECT net.http_post(
    url := CONCAT(
      current_setting('app.settings.edge_function_url', true),
      '/send-daily-reminders'
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', CONCAT('Bearer ', current_setting('app.settings.service_role_key', true))
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- ============================================================================
-- STEP 3: Add comment for documentation
-- ============================================================================
COMMENT ON EXTENSION pg_cron IS 'Job scheduler for daily reminders and auto-create cycles';

-- ============================================================================
-- STEP 4: Alternative - Create SQL function that can be called by pg_cron
-- This is a backup if Edge Functions aren't available
-- ============================================================================

CREATE OR REPLACE FUNCTION send_renewal_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cycle RECORD;
  v_poc RECORD;
  v_days_remaining INTEGER;
  v_title TEXT;
  v_message TEXT;
  v_today DATE := CURRENT_DATE;
  v_reminder_window DATE := CURRENT_DATE + INTERVAL '10 days';
  v_notification_exists BOOLEAN;
BEGIN
  -- Loop through all pending approval cycles within reminder window
  FOR v_cycle IN
    SELECT 
      sp.id AS cycle_id,
      sp.cycle_number,
      sp.cycle_start_date,
      s.id AS subscription_id,
      s.subscription_id AS sub_code,
      s.tool_name,
      s.department_id
    FROM subscription_payments sp
    JOIN subscriptions s ON s.id = sp.subscription_id
    WHERE sp.poc_approval_status = 'PENDING'
      AND sp.cycle_status = 'PENDING_APPROVAL'
      AND sp.cycle_start_date <= v_reminder_window
  LOOP
    -- Calculate days remaining
    v_days_remaining := v_cycle.cycle_start_date - v_today;
    
    -- Generate reminder message based on urgency
    IF v_days_remaining <= 0 THEN
      v_title := 'Urgent: Renewal approval overdue';
      v_message := v_cycle.tool_name || ' renewal requires your immediate approval';
    ELSIF v_days_remaining <= 2 THEN
      v_title := 'Urgent: Renewal approval needed';
      v_message := v_cycle.tool_name || ' renewal requires your approval (' || v_days_remaining || ' day(s) remaining)';
    ELSIF v_days_remaining <= 5 THEN
      v_title := 'Reminder: Renewal approval pending';
      v_message := v_cycle.tool_name || ' renewal requires your approval (' || v_days_remaining || ' days remaining)';
    ELSE
      v_title := 'Renewal approval pending';
      v_message := v_cycle.tool_name || ' renewal requires your approval (' || v_days_remaining || ' days remaining)';
    END IF;
    
    -- Send reminder to each POC for this department
    FOR v_poc IN
      SELECT poc_id FROM poc_department_access WHERE department_id = v_cycle.department_id
    LOOP
      -- Check if reminder already sent today
      SELECT EXISTS (
        SELECT 1 FROM notifications
        WHERE user_id = v_poc.poc_id
          AND type = 'RENEWAL_REMINDER'
          AND cycle_id = v_cycle.cycle_id
          AND created_at::date = v_today
      ) INTO v_notification_exists;
      
      -- Skip if already sent today
      IF v_notification_exists THEN
        CONTINUE;
      END IF;
      
      -- Create reminder notification
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        subscription_id,
        cycle_id,
        is_read,
        created_at
      ) VALUES (
        v_poc.poc_id,
        'RENEWAL_REMINDER',
        v_title,
        v_message,
        v_cycle.subscription_id,
        v_cycle.cycle_id,
        false,
        NOW()
      );
      
      RAISE NOTICE 'Sent reminder to POC % for subscription %', v_poc.poc_id, v_cycle.sub_code;
    END LOOP;
  END LOOP;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION send_renewal_reminders TO authenticated;
GRANT EXECUTE ON FUNCTION send_renewal_reminders TO service_role;

-- ============================================================================
-- NOTE: You can also schedule the SQL function directly:
-- SELECT cron.schedule('send-daily-reminders-sql', '0 9 * * *', 'SELECT send_renewal_reminders()');
-- ============================================================================
