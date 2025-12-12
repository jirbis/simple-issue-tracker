-- ====================================
-- Nuclear Option: Remove All Policies and Recreate Fresh
-- ====================================

-- 1. Drop ALL existing policies on projects
-- ====================================

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
-- ====================================

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

-- 3. Create helper functions if they don't exist
-- ====================================

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
-- ====================================

-- Allow authenticated users to create projects
CREATE POLICY "projects_insert_policy"
  ON public.projects FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Allow users to view projects they're members of
CREATE POLICY "projects_select_policy"
  ON public.projects FOR SELECT
  TO authenticated
  USING (public.is_project_member(id, auth.uid()));

-- Allow admins to update projects
CREATE POLICY "projects_update_policy"
  ON public.projects FOR UPDATE
  TO authenticated
  USING (public.is_project_admin(id, auth.uid()));

-- Allow admins to delete projects
CREATE POLICY "projects_delete_policy"
  ON public.projects FOR DELETE
  TO authenticated
  USING (public.is_project_admin(id, auth.uid()));

-- 5. Create fresh policies for project_memberships
-- ====================================

-- Allow authenticated users to create memberships
CREATE POLICY "memberships_insert_policy"
  ON public.project_memberships FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to view memberships of their projects
CREATE POLICY "memberships_select_policy"
  ON public.project_memberships FOR SELECT
  TO authenticated
  USING (public.is_project_member(project_id, auth.uid()));

-- Allow admins to update memberships
CREATE POLICY "memberships_update_policy"
  ON public.project_memberships FOR UPDATE
  TO authenticated
  USING (public.is_project_admin(project_id, auth.uid()));

-- Allow admins to delete memberships
CREATE POLICY "memberships_delete_policy"
  ON public.project_memberships FOR DELETE
  TO authenticated
  USING (public.is_project_admin(project_id, auth.uid()));

-- 6. Grant permissions
-- ====================================

GRANT EXECUTE ON FUNCTION public.is_project_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_admin(uuid, uuid) TO authenticated;
