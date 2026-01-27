-- ============================================================================
-- Audit Logging Table Migration
-- ============================================================================
-- Created: 2026-01-27
-- Description: Track all admin mutations for compliance and debugging
-- ============================================================================

-- Create audit_log table
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  changes JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity_type ON public.audit_log(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity_id ON public.audit_log(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public.audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at DESC);

-- Composite index for filtering by entity
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON public.audit_log(entity_type, entity_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs
CREATE POLICY "admin_read_audit_log"
ON public.audit_log
FOR SELECT
TO authenticated
USING (public.has_any_role(ARRAY['ADMIN', 'FINANCE']::TEXT[]));

-- Only the system (via service role) can insert audit logs
-- Regular users cannot insert directly
CREATE POLICY "system_insert_audit_log"
ON public.audit_log
FOR INSERT
TO authenticated
WITH CHECK (public.has_any_role(ARRAY['ADMIN', 'FINANCE']::TEXT[]));

-- No updates or deletes allowed on audit logs (immutable)
-- This ensures audit trail integrity

-- ============================================================================
-- Helper function to create audit log entries
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_audit_log(
  p_user_id UUID,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_changes JSONB DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_audit_id UUID;
BEGIN
  INSERT INTO public.audit_log (
    user_id,
    action,
    entity_type,
    entity_id,
    changes,
    ip_address,
    user_agent
  ) VALUES (
    p_user_id,
    p_action,
    p_entity_type,
    p_entity_id,
    p_changes,
    p_ip_address,
    p_user_agent
  )
  RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON TABLE public.audit_log IS 'Immutable audit trail for all admin operations';
COMMENT ON COLUMN public.audit_log.action IS 'Action performed: user.create, user.delete, department.update, etc.';
COMMENT ON COLUMN public.audit_log.entity_type IS 'Type of entity: user, department, role, etc.';
COMMENT ON COLUMN public.audit_log.changes IS 'JSON object containing before/after values';
