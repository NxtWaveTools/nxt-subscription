-- ============================================================================
-- RBAC Schema - Users, Roles, Departments & Relationships
-- ============================================================================
-- Created: 2026-01-26
-- Description: Complete RBAC system with OAuth integration support
-- Tables: users, roles, departments, user_roles, hod_departments, 
--         hod_poc_mapping, poc_department_access
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLE: users
-- ============================================================================
-- Synced with auth.users for OAuth (Google/Microsoft) integration
-- id matches auth.users.id
-- ============================================================================
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_is_active ON public.users(is_active);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to users
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TABLE: roles
-- ============================================================================
-- Fixed set: ADMIN, FINANCE, HOD, POC
-- ============================================================================
CREATE TABLE public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index on role name for lookups
CREATE INDEX idx_roles_name ON public.roles(name);

-- Apply updated_at trigger to roles
CREATE TRIGGER update_roles_updated_at
  BEFORE UPDATE ON public.roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TABLE: departments
-- ============================================================================
-- Organizational units (Physics, Chemistry, etc.)
-- ============================================================================
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_departments_name ON public.departments(name);
CREATE INDEX idx_departments_is_active ON public.departments(is_active);

-- Apply updated_at trigger to departments
CREATE TRIGGER update_departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TABLE: user_roles (Many-to-Many)
-- ============================================================================
-- Links users to their role(s)
-- CASCADE on user delete (cleanup mappings)
-- ============================================================================
CREATE TABLE public.user_roles (
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, role_id)
);

-- Indexes for foreign key lookups
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON public.user_roles(role_id);

-- ============================================================================
-- TABLE: hod_departments (Many-to-Many)
-- ============================================================================
-- Links HODs to departments they manage
-- One HOD can manage multiple departments
-- RESTRICT on both FKs (prevent orphan ownership)
-- ============================================================================
CREATE TABLE public.hod_departments (
  hod_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (hod_id, department_id)
);

-- Indexes for foreign key lookups
CREATE INDEX idx_hod_departments_hod_id ON public.hod_departments(hod_id);
CREATE INDEX idx_hod_departments_department_id ON public.hod_departments(department_id);

-- ============================================================================
-- TABLE: hod_poc_mapping (One-to-One)
-- ============================================================================
-- Each HOD has exactly ONE dedicated POC
-- RESTRICT on both FKs (enforce reassignment first)
-- ============================================================================
CREATE TABLE public.hod_poc_mapping (
  hod_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  poc_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (hod_id, poc_id),
  CONSTRAINT unique_hod UNIQUE (hod_id),
  CONSTRAINT unique_poc UNIQUE (poc_id),
  CONSTRAINT different_users CHECK (hod_id != poc_id)
);

-- Indexes
CREATE INDEX idx_hod_poc_mapping_hod_id ON public.hod_poc_mapping(hod_id);
CREATE INDEX idx_hod_poc_mapping_poc_id ON public.hod_poc_mapping(poc_id);

-- ============================================================================
-- TABLE: poc_department_access (Many-to-Many)
-- ============================================================================
-- Links POCs to departments they can access
-- One POC can access multiple departments
-- RESTRICT on both FKs
-- ============================================================================
CREATE TABLE public.poc_department_access (
  poc_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (poc_id, department_id)
);

-- Indexes for foreign key lookups
CREATE INDEX idx_poc_department_access_poc_id ON public.poc_department_access(poc_id);
CREATE INDEX idx_poc_department_access_department_id ON public.poc_department_access(department_id);

-- ============================================================================
-- COMMENTS (Documentation)
-- ============================================================================
COMMENT ON TABLE public.users IS 'User accounts synced with auth.users for OAuth integration';
COMMENT ON TABLE public.roles IS 'System roles: ADMIN, FINANCE, HOD, POC';
COMMENT ON TABLE public.departments IS 'Organizational departments';
COMMENT ON TABLE public.user_roles IS 'Many-to-many: Users to Roles mapping';
COMMENT ON TABLE public.hod_departments IS 'Many-to-many: HODs to Departments they manage';
COMMENT ON TABLE public.hod_poc_mapping IS 'One-to-one: Each HOD has exactly one POC';
COMMENT ON TABLE public.poc_department_access IS 'Many-to-many: POCs to Departments they can access';
