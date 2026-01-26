# Database Migrations

Complete RBAC (Role-Based Access Control) schema for NxtSubscription.

## Schema Overview

### Core Tables
- **users** - User accounts synced with `auth.users` for OAuth (Google/Microsoft)
- **roles** - 4 system roles: ADMIN, FINANCE, HOD, POC
- **departments** - Organizational departments

### Relationship Tables
- **user_roles** - Many-to-many: Users ↔ Roles
- **hod_departments** - Many-to-many: HODs ↔ Departments they manage
- **hod_poc_mapping** - One-to-one: Each HOD has exactly one POC
- **poc_department_access** - Many-to-many: POCs ↔ Departments they can access

## Migrations Applied

1. **20260126000001_create_rbac_schema.sql**
   - Creates all 7 tables
   - Adds indexes for performance
   - Sets up foreign keys with proper constraints
   - Auto-updates `updated_at` timestamps

2. **20260126000002_enable_rls_policies.sql**
   - Enables Row Level Security on all tables
   - Creates helper functions for role checking
   - Sets up policies for ADMIN, FINANCE, HOD, POC roles

3. **20260126000003_auth_sync_trigger.sql**
   - Auto-creates user profile on OAuth signup
   - Syncs email changes from `auth.users` to `public.users`
   - New users start with `is_active = false` (admin approval required)

4. **20260126000004_seed_roles.sql**
   - Inserts 4 system roles with fixed UUIDs

## Fixed Role UUIDs

```typescript
const ROLE_IDS = {
  ADMIN:   '00000000-0000-0000-0000-000000000001',
  FINANCE: '00000000-0000-0000-0000-000000000002',
  HOD:     '00000000-0000-0000-0000-000000000003',
  POC:     '00000000-0000-0000-0000-000000000004',
}
```

## OAuth Integration Flow

1. User signs in with Google/Microsoft
2. Supabase Auth creates record in `auth.users`
3. Trigger automatically creates matching record in `public.users` (inactive)
4. Admin assigns role(s) via `user_roles` table
5. Admin activates user (`is_active = true`)
6. User can now access the system

## RLS Access Rules

### ADMIN / FINANCE
- Full access to all tables

### HOD
- Read own profile
- Read departments they manage
- Read their POC mapping

### POC
- Read own profile
- Read/update departments they can access
- Read their HOD mapping

## Regenerate Types

After schema changes, regenerate TypeScript types:

```bash
npx supabase gen types typescript --project-id qllcjdxxolziehyqcils > lib/supabase/database.types.ts
```

Or use Supabase MCP:
```typescript
await mcp_supabase_generate_typescript_types({ project_id: 'qllcjdxxolziehyqcils' })
```

## Database Best Practices

✅ UUIDs for all primary keys  
✅ Database-generated IDs (`gen_random_uuid()`)  
✅ RESTRICT on foreign keys (prevent orphan data)  
✅ CASCADE only on pure mapping tables  
✅ RLS enabled on all tables  
✅ Indexes on foreign keys  
✅ Auto-updated `created_at` and `updated_at`  
✅ OAuth integration with `auth.users`
