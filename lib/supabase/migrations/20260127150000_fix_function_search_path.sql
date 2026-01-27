-- ============================================================================
-- Migration: Fix Function Search Path Security
-- ============================================================================
-- Fixes all functions with mutable search_path to prevent schema injection attacks
-- https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable

-- Fix auto_generate_subscription_code
CREATE OR REPLACE FUNCTION public.auto_generate_subscription_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  dept_short_code VARCHAR(10);
  current_fiscal_year INTEGER;
  current_month INTEGER;
  next_sequence INTEGER;
  new_subscription_code VARCHAR(50);
BEGIN
  -- Get department short code
  SELECT short_code INTO dept_short_code
  FROM public.departments
  WHERE id = NEW.department_id;
  
  IF dept_short_code IS NULL THEN
    dept_short_code := 'UNK';
  END IF;
  
  -- Calculate fiscal year (April to March)
  current_month := EXTRACT(MONTH FROM CURRENT_DATE);
  IF current_month >= 4 THEN
    current_fiscal_year := EXTRACT(YEAR FROM CURRENT_DATE) - 2000 + 1;
  ELSE
    current_fiscal_year := EXTRACT(YEAR FROM CURRENT_DATE) - 2000;
  END IF;
  
  -- Get and increment sequence with locking
  INSERT INTO public.subscription_sequences (department_id, fiscal_year, last_sequence_number)
  VALUES (NEW.department_id, current_fiscal_year, 1)
  ON CONFLICT (department_id, fiscal_year)
  DO UPDATE SET 
    last_sequence_number = public.subscription_sequences.last_sequence_number + 1,
    updated_at = NOW()
  RETURNING last_sequence_number INTO next_sequence;
  
  -- Format: DEPT/FY26/001
  new_subscription_code := dept_short_code || '/FY' || current_fiscal_year || '/' || LPAD(next_sequence::TEXT, 3, '0');
  
  NEW.subscription_id := new_subscription_code;
  
  RETURN NEW;
END;
$$;

-- Fix generate_short_code
CREATE OR REPLACE FUNCTION public.generate_short_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_code VARCHAR(10);
  counter INTEGER := 0;
  final_code VARCHAR(10);
BEGIN
  -- Generate base short code from department name (first letters of each word)
  base_code := UPPER(
    SUBSTRING(
      REGEXP_REPLACE(
        ARRAY_TO_STRING(
          ARRAY(
            SELECT SUBSTRING(word FROM 1 FOR 1)
            FROM UNNEST(STRING_TO_ARRAY(NEW.name, ' ')) AS word
            WHERE LENGTH(word) > 0
          ),
          ''
        ),
        '[^A-Za-z]', '', 'g'
      )
      FROM 1 FOR 5
    )
  );
  
  -- If empty, use first 5 chars of name
  IF LENGTH(base_code) = 0 THEN
    base_code := UPPER(SUBSTRING(REGEXP_REPLACE(NEW.name, '[^A-Za-z]', '', 'g') FROM 1 FOR 5));
  END IF;
  
  -- Ensure at least 2 characters
  IF LENGTH(base_code) < 2 THEN
    base_code := 'DEPT';
  END IF;
  
  final_code := base_code;
  
  -- Check for uniqueness and append number if needed
  WHILE EXISTS (SELECT 1 FROM public.departments WHERE short_code = final_code AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)) LOOP
    counter := counter + 1;
    final_code := base_code || counter::TEXT;
  END LOOP;
  
  NEW.short_code := final_code;
  RETURN NEW;
END;
$$;

-- Fix generate_subscription_code
CREATE OR REPLACE FUNCTION public.generate_subscription_code(p_department_id UUID)
RETURNS VARCHAR
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  dept_short_code VARCHAR(10);
  current_fiscal_year INTEGER;
  current_month INTEGER;
  next_sequence INTEGER;
  new_subscription_code VARCHAR(50);
BEGIN
  -- Get department short code
  SELECT short_code INTO dept_short_code
  FROM public.departments
  WHERE id = p_department_id;
  
  IF dept_short_code IS NULL THEN
    dept_short_code := 'UNK';
  END IF;
  
  -- Calculate fiscal year (April to March)
  current_month := EXTRACT(MONTH FROM CURRENT_DATE);
  IF current_month >= 4 THEN
    current_fiscal_year := EXTRACT(YEAR FROM CURRENT_DATE) - 2000 + 1;
  ELSE
    current_fiscal_year := EXTRACT(YEAR FROM CURRENT_DATE) - 2000;
  END IF;
  
  -- Get and increment sequence with locking
  INSERT INTO public.subscription_sequences (department_id, fiscal_year, last_sequence_number)
  VALUES (p_department_id, current_fiscal_year, 1)
  ON CONFLICT (department_id, fiscal_year)
  DO UPDATE SET 
    last_sequence_number = public.subscription_sequences.last_sequence_number + 1,
    updated_at = NOW()
  RETURNING last_sequence_number INTO next_sequence;
  
  -- Format: DEPT/FY26/001
  new_subscription_code := dept_short_code || '/FY' || current_fiscal_year || '/' || LPAD(next_sequence::TEXT, 3, '0');
  
  RETURN new_subscription_code;
END;
$$;

-- Fix update_locations_updated_at
CREATE OR REPLACE FUNCTION public.update_locations_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix update_subscriptions_updated_at
CREATE OR REPLACE FUNCTION public.update_subscriptions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix get_user_role_name
CREATE OR REPLACE FUNCTION public.get_user_role_name(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  role_name TEXT;
BEGIN
  SELECT r.name INTO role_name
  FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  WHERE ur.user_id = p_user_id;
  
  RETURN role_name;
END;
$$;

-- Fix can_access_subscription_file
CREATE OR REPLACE FUNCTION public.can_access_subscription_file(p_subscription_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_role_name TEXT;
  v_department_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Get user's role
  SELECT r.name INTO v_role_name
  FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  WHERE ur.user_id = v_user_id;
  
  -- Admin and Finance can access all
  IF v_role_name IN ('ADMIN', 'FINANCE') THEN
    RETURN TRUE;
  END IF;
  
  -- Get subscription's department
  SELECT department_id INTO v_department_id
  FROM public.subscriptions
  WHERE id = p_subscription_id;
  
  -- HOD can access their department's subscriptions
  IF v_role_name = 'HOD' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.hod_departments
      WHERE hod_id = v_user_id AND department_id = v_department_id
    );
  END IF;
  
  -- POC can access their department's subscriptions
  IF v_role_name = 'POC' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.poc_department_access
      WHERE poc_id = v_user_id AND department_id = v_department_id
    );
  END IF;
  
  RETURN FALSE;
END;
$$;

-- Add comment explaining the security fix
COMMENT ON FUNCTION public.auto_generate_subscription_code IS 'Generates subscription codes with fixed search_path for security';
COMMENT ON FUNCTION public.generate_short_code IS 'Generates department short codes with fixed search_path for security';
COMMENT ON FUNCTION public.generate_subscription_code IS 'Generates subscription codes with fixed search_path for security';
COMMENT ON FUNCTION public.update_locations_updated_at IS 'Updates timestamp with fixed search_path for security';
COMMENT ON FUNCTION public.update_subscriptions_updated_at IS 'Updates timestamp with fixed search_path for security';
COMMENT ON FUNCTION public.get_user_role_name IS 'Gets user role name with fixed search_path for security';
COMMENT ON FUNCTION public.can_access_subscription_file IS 'Checks file access with fixed search_path for security';
