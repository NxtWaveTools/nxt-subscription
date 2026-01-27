-- ============================================================================
-- Notifications Table
-- ============================================================================
-- Created: 2026-01-27
-- Description: In-app notifications for subscription workflow
-- Auto-cleanup: Notifications older than 10 days are deleted
-- ============================================================================

-- ============================================================================
-- TABLE: notifications
-- ============================================================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('APPROVAL_REQUEST', 'APPROVAL_DECISION', 'PAYMENT_UPDATE', 'GENERAL')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_subscription_id ON public.notifications(subscription_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_type ON public.notifications(type);

-- Composite index for fetching user's notifications
CREATE INDEX idx_notifications_user_read_created ON public.notifications(user_id, is_read, created_at DESC);

-- Comments
COMMENT ON TABLE public.notifications IS 'In-app notifications for subscription workflow - 10 day retention';
COMMENT ON COLUMN public.notifications.type IS 'APPROVAL_REQUEST (to POC), APPROVAL_DECISION (to requester), PAYMENT_UPDATE, GENERAL';
COMMENT ON COLUMN public.notifications.subscription_id IS 'Optional link to related subscription for navigation';

-- ============================================================================
-- AUTO-CLEANUP: Delete notifications older than 10 days
-- ============================================================================
-- Function to cleanup old notifications
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.notifications
  WHERE created_at < NOW() - INTERVAL '10 days';
END;
$$;

-- Create a scheduled job to run daily (requires pg_cron extension)
-- If pg_cron is not available, this can be triggered via Supabase Edge Function or external cron
-- SELECT cron.schedule('cleanup-old-notifications', '0 0 * * *', 'SELECT cleanup_old_notifications()');

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only read their own notifications
CREATE POLICY "notifications_read_own"
ON public.notifications
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can update (mark as read) their own notifications
CREATE POLICY "notifications_update_own"
ON public.notifications
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- System can insert notifications for any user (via service role)
-- For app-level inserts, we'll use service role or SECURITY DEFINER functions
CREATE POLICY "notifications_insert_system"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Users can delete their own notifications
CREATE POLICY "notifications_delete_own"
ON public.notifications
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ADMIN: Full access for management
CREATE POLICY "notifications_admin_full_access"
ON public.notifications
FOR ALL
TO authenticated
USING (public.has_role('ADMIN'))
WITH CHECK (public.has_role('ADMIN'));
