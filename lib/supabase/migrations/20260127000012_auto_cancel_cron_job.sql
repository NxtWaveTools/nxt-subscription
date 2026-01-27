-- ============================================================================
-- Migration: Auto-Cancel Overdue Invoice Cycles
-- ============================================================================
-- This migration sets up the infrastructure for automatically cancelling
-- payment cycles that have passed their invoice deadline.
-- 
-- Components:
-- 1. Enable pg_cron and pg_net extensions
-- 2. Store project URL and API key in Vault
-- 3. Create a cron job to invoke the Edge Function daily
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Store the project URL and API key in Vault for secure access
-- NOTE: Replace these with actual values after deployment
-- These should be set manually via Supabase Dashboard > Settings > Vault
-- or via the SQL Editor with actual values

-- The cron job will call the Edge Function
-- Schedule: Every day at 1:00 AM (to process overdue invoices from the previous day)

-- First, let's create a helper function to invoke the Edge Function
CREATE OR REPLACE FUNCTION invoke_auto_cancel_function()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  project_url text;
  service_key text;
BEGIN
  -- Get secrets from vault (these need to be set up via Supabase Dashboard)
  SELECT decrypted_secret INTO project_url 
  FROM vault.decrypted_secrets 
  WHERE name = 'project_url';
  
  SELECT decrypted_secret INTO service_key 
  FROM vault.decrypted_secrets 
  WHERE name = 'service_role_key';
  
  -- Skip if secrets are not configured
  IF project_url IS NULL OR service_key IS NULL THEN
    RAISE NOTICE 'Vault secrets not configured. Skipping auto-cancel function invocation.';
    RETURN;
  END IF;
  
  -- Invoke the Edge Function
  PERFORM net.http_post(
    url := project_url || '/functions/v1/auto-cancel-invoices',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := jsonb_build_object(
      'triggered_at', now(),
      'trigger_source', 'pg_cron'
    ),
    timeout_milliseconds := 30000  -- 30 second timeout
  );
  
  RAISE NOTICE 'Auto-cancel function invoked at %', now();
END;
$$;

-- Grant execute permission to postgres (required for pg_cron)
GRANT EXECUTE ON FUNCTION invoke_auto_cancel_function() TO postgres;

-- Schedule the cron job to run daily at 1:00 AM
-- This gives time for all invoices to be uploaded before the deadline passes
SELECT cron.schedule(
  'auto-cancel-overdue-invoices',  -- job name
  '0 1 * * *',                      -- cron expression: daily at 1:00 AM
  $$SELECT invoke_auto_cancel_function()$$
);

-- Add comment for documentation
COMMENT ON FUNCTION invoke_auto_cancel_function() IS 
'Invokes the auto-cancel-invoices Edge Function to process payment cycles with overdue invoices. Called daily via pg_cron.';

-- ============================================================================
-- IMPORTANT: After deployment, you must set up the following Vault secrets:
-- 
-- 1. project_url: Your Supabase project URL (e.g., https://xxx.supabase.co)
-- 2. service_role_key: Your service role key for authenticated Edge Function calls
--
-- Run the following SQL in the SQL Editor (replace with actual values):
--
-- SELECT vault.create_secret('https://your-project.supabase.co', 'project_url');
-- SELECT vault.create_secret('your-service-role-key', 'service_role_key');
-- ============================================================================
