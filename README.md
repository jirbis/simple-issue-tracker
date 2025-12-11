# Issue Tracker

A minimal Jira-like issue tracker built with Next.js 14 (App Router), Supabase, and deployed on Vercel.

## Features

- **Projects Management**: Create and manage multiple projects with unique keys
- **Issue Tracking**: Create, update, and track tickets with different statuses (TODO, IN_PROGRESS, DONE)
- **Kanban Board**: Visual board with drag-and-drop functionality to manage ticket status
- **Role-Based Access Control**: Three roles (Administrator, Developer, Customer) with different permissions
- **Comments System**: Add public or internal comments to tickets
- **Priority Levels**: LOW, MEDIUM, HIGH, CRITICAL
- **Due Dates**: Set and track ticket due dates
- **Ticket Assignment**: Assign tickets to team members

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **Deployment**: Vercel
- **Authentication**: Supabase Auth

## Prerequisites

- Node.js 18+ installed
- A Supabase account and project
- A Vercel account (for deployment)
- npm or yarn package manager

## Local Development Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd simple-issue-tracker
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Supabase

1. Create a new project on [Supabase](https://supabase.com)
2. Go to Project Settings > API
3. Copy your project URL and anon key

### 4. Run Database Migrations

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of `supabase/migrations/001_initial_schema.sql`
4. Paste and run the migration in the SQL Editor

This will create:
- All necessary tables (projects, tickets, comments, memberships)
- Enums for status, priority, roles, and visibility
- Row Level Security (RLS) policies
- Database functions and triggers
- Indexes for performance

### 5. Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
cp .env.local.example .env.local
```

Update the values:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**Important**:
- `NEXT_PUBLIC_*` variables are exposed to the browser
- `SUPABASE_SERVICE_ROLE_KEY` is server-side only (never expose to browser)
- `NEXT_PUBLIC_SITE_URL` should be `http://localhost:3000` for local development

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment on Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

### 2. Deploy to Vercel

1. Go to [Vercel](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Configure the project:
   - **Framework Preset**: Next.js
   - **Root Directory**: ./
   - **Build Command**: `npm run build`
   - **Output Directory**: Leave default

### 3. Add Environment Variables

In Vercel project settings, add the following environment variables:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
NEXT_PUBLIC_SITE_URL=https://your-app-name.vercel.app
```

Make sure to add these for all environments (Production, Preview, Development).

**Important**: Set `NEXT_PUBLIC_SITE_URL` to your actual Vercel deployment URL (e.g., `https://simple-issue-tracker.vercel.app`).

### 4. Deploy

Click "Deploy" and Vercel will build and deploy your application.

### 5. Configure Supabase Authentication

After deploying to Vercel, you need to configure Supabase authentication settings:

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to **Authentication** > **URL Configuration**
3. Set the **Site URL** to your production URL:
   ```
   https://simple-issue-tracker.vercel.app
   ```
4. Add your deployment URL to **Redirect URLs**:
   ```
   https://simple-issue-tracker.vercel.app/**
   ```
5. For local development, also add:
   ```
   http://localhost:3000/**
   ```

**Why this is important**:
- The Site URL determines where magic link emails redirect users
- Without this configuration, magic links will use `localhost:3000` even in production
- Redirect URLs whitelist where authentication callbacks are allowed

## Project Structure

```
simple-issue-tracker/
├── app/                      # Next.js App Router
│   ├── actions/             # Server actions
│   │   ├── projects.ts
│   │   ├── tickets.ts
│   │   └── comments.ts
│   ├── projects/            # Projects pages
│   │   ├── page.tsx
│   │   └── [projectId]/
│   │       └── page.tsx
│   ├── tickets/             # Tickets pages
│   │   └── [ticketId]/
│   │       └── page.tsx
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/              # React components
│   ├── ui/                 # UI components
│   │   ├── Button.tsx
│   │   ├── Modal.tsx
│   │   └── Badge.tsx
│   ├── projects/           # Project components
│   │   ├── CreateProjectForm.tsx
│   │   ├── ProjectTabs.tsx
│   │   └── ProjectMembers.tsx
│   ├── tickets/            # Ticket components
│   │   ├── CreateTicketForm.tsx
│   │   ├── KanbanBoard.tsx
│   │   └── TicketList.tsx
│   ├── comments/           # Comment components
│   │   ├── CommentList.tsx
│   │   └── CommentForm.tsx
│   └── Navbar.tsx
├── lib/                    # Utilities
│   ├── supabase/
│   │   ├── server.ts      # Server-side Supabase client
│   │   ├── client.ts      # Client-side Supabase client
│   │   └── middleware.ts  # Auth middleware
│   └── auth/
│       └── roles.ts       # Role-based access helpers
├── types/                  # TypeScript types
│   └── database.ts
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
├── middleware.ts           # Next.js middleware
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.mjs
```

## Database Schema

### Tables

1. **projects**: Project information
   - id, key, name, description, created_at, created_by

2. **project_memberships**: User-project relationships with roles
   - id, project_id, user_id, role, created_at

3. **tickets**: Issue/ticket information
   - id, project_id, key, title, description, status, priority, assignee_id, reporter_id, due_date, created_at, updated_at

4. **ticket_comments**: Comments on tickets
   - id, ticket_id, author_id, body, visibility, created_at

### Enums

- **ticket_status**: TODO, IN_PROGRESS, DONE
- **ticket_priority**: LOW, MEDIUM, HIGH, CRITICAL
- **project_role**: ADMINISTRATOR, DEVELOPER, CUSTOMER
- **comment_visibility**: INTERNAL, PUBLIC

### Row Level Security (RLS)

All tables have RLS enabled with policies that:
- Users can only access projects they are members of
- Administrators have full control
- Developers can edit their assigned tickets
- Customers have limited access (can only edit their own tickets, no status changes)
- Customers can only see public comments; Admins/Developers see all comments

## Role Permissions

### Administrator
- Full access to project settings
- Can add/remove members and change roles
- Can create, edit, and delete any ticket
- Can create internal and public comments
- Can see all comments

### Developer
- Can create tickets
- Can edit tickets assigned to them or reported by them
- Can change ticket status
- Can create internal and public comments
- Can see all comments

### Customer
- Can create tickets
- Can only edit title and description of their own tickets
- Cannot change ticket status
- Can only create public comments
- Can only see public comments

## Key Features Explained

### Automatic Ticket Key Generation

Tickets automatically get unique keys like `PROJ-1`, `PROJ-2` based on the project key. This is handled by a PostgreSQL function and trigger.

### Drag-and-Drop Kanban Board

The Kanban board allows dragging tickets between TODO, IN_PROGRESS, and DONE columns. Status updates are immediately saved to the database.

### Comment Visibility

- **Public comments**: Visible to all project members
- **Internal comments**: Only visible to Administrators and Developers (hidden from Customers)

## Troubleshooting

### Environment Variables Not Working

Make sure:
1. `.env.local` file is in the root directory
2. All variables are properly set
3. You've restarted the dev server after adding variables

### RLS Policies Blocking Access

If you can't access data:
1. Make sure you're signed in
2. Check that you're a member of the project
3. Verify the RLS policies in Supabase dashboard

### Deployment Issues on Vercel

1. Check build logs for errors
2. Verify all environment variables are set in Vercel
3. Make sure Supabase is accessible from Vercel's network

## Future Enhancements

Potential features to add:
- Email notifications
- File attachments
- Advanced filtering and search
- Time tracking
- Sprint management
- Custom fields
- Webhooks
- API endpoints

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.
