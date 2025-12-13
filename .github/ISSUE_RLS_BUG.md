# Bug: RLS Policy Error Preventing Project Creation

**Labels:** bug, database, priority-high

## Bug Description

Users cannot create new projects due to a Row Level Security (RLS) policy violation error.

## Error Message

```
Error: new row violates row-level security policy for table "projects"
```

**Full Stack Trace:**
```
Error: new row violates row-level security policy for table "projects"
    at c (/var/task/.next/server/chunks/941.js:1:2660)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async /var/task/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:16:408
    [...]
```

## Root Cause

The database has conflicting or missing RLS policies on the `projects` and `project_memberships` tables that are causing:

1. **Missing INSERT policy** for the `projects` table
2. **Infinite recursion** in SELECT policies due to circular dependencies between `projects` and `project_memberships` policies

The original policies were checking `project_memberships` within the `project_memberships` policy itself, causing infinite recursion.

## Impact

- ✗ Users cannot create new projects
- ✗ Project viewing may fail due to infinite recursion
- ✗ Blocks core functionality of the application

## Temporary Workaround

Apply this SQL script in Supabase Dashboard → SQL Editor to fix the issue:

```sql
-- ====================================
-- Remove All Policies and Recreate Fresh
-- ====================================

-- 1. Drop ALL existing policies on projects
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'projects' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.projects', pol.policyname);
    END LOOP;
END $$;

-- 2. Drop ALL existing policies on project_memberships
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'project_memberships' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.project_memberships', pol.policyname);
    END LOOP;
END $$;

-- 3. Create helper functions
CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_memberships
    WHERE project_id = p_project_id
      AND user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_project_admin(p_project_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_memberships
    WHERE project_id = p_project_id
      AND user_id = p_user_id
      AND role = 'ADMINISTRATOR'
  );
$$;

-- 4. Create fresh policies for projects
CREATE POLICY "projects_insert_policy"
  ON public.projects FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "projects_select_policy"
  ON public.projects FOR SELECT
  TO authenticated
  USING (public.is_project_member(id, auth.uid()));

CREATE POLICY "projects_update_policy"
  ON public.projects FOR UPDATE
  TO authenticated
  USING (public.is_project_admin(id, auth.uid()));

CREATE POLICY "projects_delete_policy"
  ON public.projects FOR DELETE
  TO authenticated
  USING (public.is_project_admin(id, auth.uid()));

-- 5. Create fresh policies for project_memberships
CREATE POLICY "memberships_insert_policy"
  ON public.project_memberships FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "memberships_select_policy"
  ON public.project_memberships FOR SELECT
  TO authenticated
  USING (public.is_project_member(project_id, auth.uid()));

CREATE POLICY "memberships_update_policy"
  ON public.project_memberships FOR UPDATE
  TO authenticated
  USING (public.is_project_admin(project_id, auth.uid()));

CREATE POLICY "memberships_delete_policy"
  ON public.project_memberships FOR DELETE
  TO authenticated
  USING (public.is_project_admin(project_id, auth.uid()));

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION public.is_project_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_admin(uuid, uuid) TO authenticated;
```

## Solution

The fix is available in migration file: `supabase/migrations/003_remove_and_recreate_policies.sql`

### How to Apply:
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Navigate to SQL Editor
3. Copy the SQL above
4. Click "Run"

## Related Files

- Migration: `supabase/migrations/003_remove_and_recreate_policies.sql`
- Server Action: `app/actions/projects.ts`
- Database Schema: `supabase/migrations/001_initial_schema.sql`

## Testing Checklist

After applying the fix, verify:
- [ ] Can create new projects
- [ ] Can view existing projects
- [ ] Can view project members
- [ ] No infinite recursion errors in logs
- [ ] Project creator is automatically added as ADMINISTRATOR
