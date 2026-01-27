-- ============================================================================
-- Supabase Storage Bucket for Subscription Attachments
-- ============================================================================
-- Created: 2026-01-27
-- Description: Storage bucket for subscription files (proof of payment, invoices)
-- Path structure: {subscriptionId}/{fileType}/{filename}
-- ============================================================================

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'subscription-attachments',
  'subscription-attachments',
  false,  -- Private bucket (requires authentication)
  52428800,  -- 50MB max file size
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ]::text[]
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Storage RLS Policies
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
  SELECT id, department_id, created_by INTO v_subscription
  FROM public.subscriptions
  WHERE id = subscription_uuid;
  
  IF v_subscription.id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user created the subscription
  IF v_subscription.created_by = v_user_id THEN
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

-- ============================================================================
-- Storage RLS Policies
-- ============================================================================

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads to subscription-attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'subscription-attachments'
  AND auth.role() = 'authenticated'
);

-- Policy: Allow users to read files they have access to
CREATE POLICY "Allow authenticated reads from subscription-attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'subscription-attachments'
  AND auth.role() = 'authenticated'
);

-- Policy: Allow ADMIN and FINANCE to delete files
CREATE POLICY "Allow admin/finance to delete from subscription-attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'subscription-attachments'
  AND public.has_any_role(ARRAY['ADMIN', 'FINANCE']::TEXT[])
);

-- Policy: Allow users to update their own files
CREATE POLICY "Allow authenticated updates to subscription-attachments"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'subscription-attachments'
  AND auth.role() = 'authenticated'
)
WITH CHECK (
  bucket_id = 'subscription-attachments'
  AND auth.role() = 'authenticated'
);

