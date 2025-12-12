-- ====================================
-- Fix Infinite Recursion in RLS Policies
-- ====================================
-- This migration fixes the circular dependency between projects and
-- project_memberships RLS policies that was causing infinite recursion.

-- 1. Create a security definer function to check project membership
-- This function bypasses RLS, preventing infinite recursion
-- ====================================

create or replace function public.is_project_member(p_project_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from public.project_memberships
    where project_id = p_project_id
      and user_id = p_user_id
  );
$$;

-- 2. Create a security definer function to check if user is admin
-- ====================================

create or replace function public.is_project_admin(p_project_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from public.project_memberships
    where project_id = p_project_id
      and user_id = p_user_id
      and role = 'ADMINISTRATOR'
  );
$$;

-- 3. Drop existing problematic policies
-- ====================================

-- Drop projects policies
drop policy if exists "Users can view projects they are members of" on public.projects;
drop policy if exists "Administrators can update projects" on public.projects;
drop policy if exists "Administrators can delete projects" on public.projects;

-- Drop project_memberships policies
drop policy if exists "Users can view memberships of their projects" on public.project_memberships;
drop policy if exists "Administrators can update memberships" on public.project_memberships;
drop policy if exists "Administrators can delete memberships" on public.project_memberships;

-- 4. Recreate projects policies using the helper functions
-- ====================================

create policy "Users can view projects they are members of"
  on public.projects for select
  using (
    public.is_project_member(id, auth.uid())
  );

create policy "Administrators can update projects"
  on public.projects for update
  using (
    public.is_project_admin(id, auth.uid())
  );

create policy "Administrators can delete projects"
  on public.projects for delete
  using (
    public.is_project_admin(id, auth.uid())
  );

-- 5. Recreate project_memberships policies without circular dependency
-- ====================================

-- Users can view memberships for projects they belong to
create policy "Users can view memberships of their projects"
  on public.project_memberships for select
  using (
    public.is_project_member(project_id, auth.uid())
  );

-- Ensure INSERT policy exists for project_memberships
drop policy if exists "Authenticated users can create memberships" on public.project_memberships;

create policy "Authenticated users can create memberships"
  on public.project_memberships for insert
  with check (auth.uid() is not null);

-- Only administrators can update memberships
create policy "Administrators can update memberships"
  on public.project_memberships for update
  using (
    public.is_project_admin(project_id, auth.uid())
  );

-- Only administrators can delete memberships
create policy "Administrators can delete memberships"
  on public.project_memberships for delete
  using (
    public.is_project_admin(project_id, auth.uid())
  );

-- 6. Ensure INSERT policy exists for projects
-- (In case migration 001 wasn't fully applied)
-- ====================================

drop policy if exists "Authenticated users can create projects" on public.projects;

create policy "Authenticated users can create projects"
  on public.projects for insert
  with check (auth.uid() is not null);

-- 7. Grant execute permissions on the helper functions
-- ====================================

grant execute on function public.is_project_member(uuid, uuid) to authenticated;
grant execute on function public.is_project_admin(uuid, uuid) to authenticated;
