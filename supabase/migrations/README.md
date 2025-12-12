# Database Migrations

## How to Apply Migrations

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar
4. Click **New query**
5. Copy the contents of the migration file you want to run
6. Paste it into the SQL editor
7. Click **Run** (or press Cmd/Ctrl + Enter)

### Option 2: Using Supabase CLI

If you have the Supabase CLI installed:

```bash
# Install Supabase CLI if you haven't already
npm install -g supabase

# Link your project (one-time setup)
supabase link --project-ref your-project-ref

# Apply migrations
supabase db push
```

## Current Migrations

- `001_initial_schema.sql` - Initial database schema with tables, RLS policies, and indexes
- `002_fix_rls_infinite_recursion.sql` - **IMPORTANT FIX** - Fixes infinite recursion in RLS policies

## Migration 002: Fix RLS Infinite Recursion

**Problem:** The RLS policies had a circular dependency where:
- `projects` policies checked `project_memberships` table
- `project_memberships` policies also checked `project_memberships` table
- This caused infinite recursion errors

**Solution:** Created security definer functions that bypass RLS to check membership, breaking the circular dependency.

**Status:** ⚠️ This migration must be applied to fix project creation and viewing issues.
