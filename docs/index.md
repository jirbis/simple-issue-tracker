## Key building blocks

Data model: projects, memberships, tickets, and ticket_comments tables plus enums for status, priority, roles, and visibility (defined in supabase/migrations/001_initial_schema.sql).

Access control: Supabase RLS policies enforcing project membership and role-specific permissions.

Business logic: Next.js server actions in app/actions/ for creating/updating projects, tickets, and comments.

Frontend/UX: Kanban board and ticket forms under components/tickets/, project management in components/projects/, and shared UI primitives in components/ui/.

