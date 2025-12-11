-- ====================================
-- Issue Tracker - Initial Schema Migration
-- ====================================

-- 1. CREATE ENUMS
-- ====================================

create type ticket_status as enum ('TODO', 'IN_PROGRESS', 'DONE');

create type ticket_priority as enum ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

create type project_role as enum ('ADMINISTRATOR', 'DEVELOPER', 'CUSTOMER');

create type comment_visibility as enum ('INTERNAL', 'PUBLIC');

-- 2. CREATE TABLES
-- ====================================

-- 2.1. Projects Table
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users (id) on delete restrict
);

-- 2.2. Project Memberships Table
create table public.project_memberships (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role project_role not null,
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);

-- 2.3. Tickets Table
create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  key text not null,
  title text not null,
  description text,
  status ticket_status not null default 'TODO',
  priority ticket_priority not null default 'MEDIUM',
  assignee_id uuid references auth.users (id),
  reporter_id uuid not null references auth.users (id),
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index tickets_project_key_unique
  on public.tickets (project_id, key);

-- 2.4. Ticket Comments Table
create table public.ticket_comments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  author_id uuid not null references auth.users (id),
  body text not null,
  visibility comment_visibility not null default 'PUBLIC',
  created_at timestamptz not null default now()
);

-- 3. FUNCTIONS & TRIGGERS
-- ====================================

-- 3.1. Function to update updated_at timestamp
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 3.2. Trigger to auto-update updated_at on tickets
create trigger update_tickets_updated_at
  before update on public.tickets
  for each row
  execute function public.update_updated_at_column();

-- 3.3. Function to generate ticket key
create or replace function public.generate_ticket_key(p_project_id uuid)
returns text
language plpgsql
as $$
declare
  v_project_key text;
  v_next_number integer;
begin
  -- Get the project key
  select key into v_project_key
  from public.projects
  where id = p_project_id;

  if v_project_key is null then
    raise exception 'Project not found';
  end if;

  -- Find the maximum ticket number for this project
  select coalesce(
    max(
      (regexp_replace(t.key, v_project_key || '-', ''))::int
    ), 0
  ) + 1 into v_next_number
  from public.tickets t
  where t.project_id = p_project_id
    and t.key ~ ('^' || v_project_key || '-[0-9]+$');

  return v_project_key || '-' || v_next_number::text;
end;
$$;

-- 3.4. Function to auto-generate ticket key before insert
create or replace function public.set_ticket_key()
returns trigger
language plpgsql
as $$
begin
  if new.key is null or new.key = '' then
    new.key := public.generate_ticket_key(new.project_id);
  end if;
  return new;
end;
$$;

-- 3.5. Trigger to auto-generate ticket key
create trigger set_ticket_key_before_insert
  before insert on public.tickets
  for each row
  execute function public.set_ticket_key();

-- 4. HELPER VIEWS
-- ====================================

-- 4.1. View to get user roles in projects
create view public.project_user_roles as
select
  pm.project_id,
  pm.user_id,
  pm.role
from public.project_memberships pm;

-- 5. ENABLE ROW LEVEL SECURITY
-- ====================================

alter table public.projects enable row level security;
alter table public.project_memberships enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_comments enable row level security;

-- 6. RLS POLICIES
-- ====================================

-- 6.1. Projects Policies
-- Users can view projects they are members of
create policy "Users can view projects they are members of"
  on public.projects for select
  using (
    exists (
      select 1 from public.project_memberships pm
      where pm.project_id = id
        and pm.user_id = auth.uid()
    )
  );

-- Authenticated users can create projects
create policy "Authenticated users can create projects"
  on public.projects for insert
  with check (auth.uid() is not null);

-- Only administrators can update projects
create policy "Administrators can update projects"
  on public.projects for update
  using (
    exists (
      select 1 from public.project_memberships pm
      where pm.project_id = id
        and pm.user_id = auth.uid()
        and pm.role = 'ADMINISTRATOR'
    )
  );

-- Only administrators can delete projects
create policy "Administrators can delete projects"
  on public.projects for delete
  using (
    exists (
      select 1 from public.project_memberships pm
      where pm.project_id = id
        and pm.user_id = auth.uid()
        and pm.role = 'ADMINISTRATOR'
    )
  );

-- 6.2. Project Memberships Policies
-- Users can view memberships of projects they belong to
create policy "Users can view memberships of their projects"
  on public.project_memberships for select
  using (
    exists (
      select 1 from public.project_memberships pm
      where pm.project_id = project_id
        and pm.user_id = auth.uid()
    )
  );

-- Only allow inserts for authenticated users (handled in app logic)
create policy "Authenticated users can create memberships"
  on public.project_memberships for insert
  with check (auth.uid() is not null);

-- Only administrators can update memberships
create policy "Administrators can update memberships"
  on public.project_memberships for update
  using (
    exists (
      select 1 from public.project_memberships pm
      where pm.project_id = project_id
        and pm.user_id = auth.uid()
        and pm.role = 'ADMINISTRATOR'
    )
  );

-- Only administrators can delete memberships
create policy "Administrators can delete memberships"
  on public.project_memberships for delete
  using (
    exists (
      select 1 from public.project_memberships pm
      where pm.project_id = project_id
        and pm.user_id = auth.uid()
        and pm.role = 'ADMINISTRATOR'
    )
  );

-- 6.3. Tickets Policies
-- Users can view tickets of projects they are members of
create policy "Users can view tickets of their projects"
  on public.tickets for select
  using (
    exists (
      select 1 from public.project_memberships pm
      where pm.project_id = project_id
        and pm.user_id = auth.uid()
    )
  );

-- Members can create tickets in their projects
create policy "Members can create tickets in their projects"
  on public.tickets for insert
  with check (
    exists (
      select 1 from public.project_memberships pm
      where pm.project_id = project_id
        and pm.user_id = auth.uid()
    )
  );

-- Update policy with role-based restrictions
create policy "Users can update tickets based on role"
  on public.tickets for update
  using (
    -- Administrators can update any ticket
    exists (
      select 1 from public.project_memberships pm
      where pm.project_id = project_id
        and pm.user_id = auth.uid()
        and pm.role = 'ADMINISTRATOR'
    )
    or
    -- Developers can update tickets they are assigned to or reported
    (
      exists (
        select 1 from public.project_memberships pm
        where pm.project_id = project_id
          and pm.user_id = auth.uid()
          and pm.role = 'DEVELOPER'
      )
      and (assignee_id = auth.uid() or reporter_id = auth.uid())
    )
    or
    -- Customers can only update tickets they reported (limited fields)
    (
      exists (
        select 1 from public.project_memberships pm
        where pm.project_id = project_id
          and pm.user_id = auth.uid()
          and pm.role = 'CUSTOMER'
      )
      and reporter_id = auth.uid()
    )
  );

-- Users can delete tickets based on role
create policy "Administrators can delete tickets"
  on public.tickets for delete
  using (
    exists (
      select 1 from public.project_memberships pm
      where pm.project_id = project_id
        and pm.user_id = auth.uid()
        and pm.role = 'ADMINISTRATOR'
    )
  );

-- 6.4. Ticket Comments Policies
-- Users can view comments based on their role and visibility
create policy "Users can view comments based on role and visibility"
  on public.ticket_comments for select
  using (
    exists (
      select 1
      from public.tickets t
      join public.project_memberships pm on pm.project_id = t.project_id
      where t.id = ticket_id
        and pm.user_id = auth.uid()
        and (
          -- Admins and developers see all comments
          pm.role in ('ADMINISTRATOR', 'DEVELOPER')
          or
          -- Customers only see public comments
          (pm.role = 'CUSTOMER' and visibility = 'PUBLIC')
        )
    )
  );

-- Users can create comments based on their role
create policy "Users can create comments based on role"
  on public.ticket_comments for insert
  with check (
    exists (
      select 1
      from public.tickets t
      join public.project_memberships pm on pm.project_id = t.project_id
      where t.id = ticket_id
        and pm.user_id = auth.uid()
        and (
          -- Admins and developers can create any visibility
          pm.role in ('ADMINISTRATOR', 'DEVELOPER')
          or
          -- Customers can only create public comments
          (pm.role = 'CUSTOMER' and visibility = 'PUBLIC')
        )
    )
  );

-- Only comment authors can update their comments
create policy "Users can update their own comments"
  on public.ticket_comments for update
  using (author_id = auth.uid());

-- Only comment authors or admins can delete comments
create policy "Users can delete their own comments or admins can delete any"
  on public.ticket_comments for delete
  using (
    author_id = auth.uid()
    or
    exists (
      select 1
      from public.tickets t
      join public.project_memberships pm on pm.project_id = t.project_id
      where t.id = ticket_id
        and pm.user_id = auth.uid()
        and pm.role = 'ADMINISTRATOR'
    )
  );

-- 7. CREATE INDEXES FOR PERFORMANCE
-- ====================================

create index idx_project_memberships_user_id on public.project_memberships(user_id);
create index idx_project_memberships_project_id on public.project_memberships(project_id);
create index idx_tickets_project_id on public.tickets(project_id);
create index idx_tickets_assignee_id on public.tickets(assignee_id);
create index idx_tickets_reporter_id on public.tickets(reporter_id);
create index idx_tickets_status on public.tickets(status);
create index idx_ticket_comments_ticket_id on public.ticket_comments(ticket_id);
create index idx_ticket_comments_author_id on public.ticket_comments(author_id);
