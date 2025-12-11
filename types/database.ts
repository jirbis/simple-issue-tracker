export type TicketStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ProjectRole = 'ADMINISTRATOR' | 'DEVELOPER' | 'CUSTOMER';
export type CommentVisibility = 'INTERNAL' | 'PUBLIC';

export interface Project {
  id: string;
  key: string;
  name: string;
  description: string | null;
  created_at: string;
  created_by: string;
}

export interface ProjectMembership {
  id: string;
  project_id: string;
  user_id: string;
  role: ProjectRole;
  created_at: string;
}

export interface Ticket {
  id: string;
  project_id: string;
  key: string;
  title: string;
  description: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  assignee_id: string | null;
  reporter_id: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketComment {
  id: string;
  ticket_id: string;
  author_id: string;
  body: string;
  visibility: CommentVisibility;
  created_at: string;
}

// Extended types with joined data
export interface ProjectWithRole extends Project {
  role: ProjectRole;
}

export interface TicketWithDetails extends Ticket {
  project: {
    key: string;
    name: string;
  };
  assignee: {
    id: string;
    email: string;
  } | null;
  reporter: {
    id: string;
    email: string;
  };
}

export interface CommentWithAuthor extends TicketComment {
  author: {
    id: string;
    email: string;
  };
}

// Database schema type (for Supabase client)
export type Database = {
  public: {
    Tables: {
      projects: {
        Row: Project;
        Insert: Omit<Project, 'id' | 'created_at'>;
        Update: Partial<Omit<Project, 'id' | 'created_at'>>;
      };
      project_memberships: {
        Row: ProjectMembership;
        Insert: Omit<ProjectMembership, 'id' | 'created_at'>;
        Update: Partial<Omit<ProjectMembership, 'id' | 'created_at'>>;
      };
      tickets: {
        Row: Ticket;
        Insert: Omit<Ticket, 'id' | 'created_at' | 'updated_at' | 'key'> & {
          key?: string;
        };
        Update: Partial<Omit<Ticket, 'id' | 'created_at' | 'updated_at'>>;
      };
      ticket_comments: {
        Row: TicketComment;
        Insert: Omit<TicketComment, 'id' | 'created_at'>;
        Update: Partial<Omit<TicketComment, 'id' | 'created_at'>>;
      };
    };
    Views: {
      project_user_roles: {
        Row: {
          project_id: string;
          user_id: string;
          role: ProjectRole;
        };
      };
    };
    Functions: {
      generate_ticket_key: {
        Args: { p_project_id: string };
        Returns: string;
      };
    };
    Enums: {
      ticket_status: TicketStatus;
      ticket_priority: TicketPriority;
      project_role: ProjectRole;
      comment_visibility: CommentVisibility;
    };
  };
};
