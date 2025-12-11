import { createClient } from '@/lib/supabase/server';
import { ProjectRole } from '@/types/database';

export async function getUserProjectRole(
  projectId: string
): Promise<ProjectRole | null> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from('project_memberships')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .single();

  if (error || !data) {
    return null;
  }

  return data.role;
}

export async function requireProjectRole(
  projectId: string,
  allowedRoles: ProjectRole[]
): Promise<{ role: ProjectRole; userId: string }> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  const { data, error } = await supabase
    .from('project_memberships')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .single();

  if (error || !data) {
    throw new Error('Not a member of this project');
  }

  if (!allowedRoles.includes(data.role)) {
    throw new Error('Insufficient permissions');
  }

  return { role: data.role, userId: user.id };
}

export async function isProjectAdmin(projectId: string): Promise<boolean> {
  const role = await getUserProjectRole(projectId);
  return role === 'ADMINISTRATOR';
}

export async function isProjectMember(projectId: string): Promise<boolean> {
  const role = await getUserProjectRole(projectId);
  return role !== null;
}

export async function canEditTicket(
  ticketId: string,
  userId: string
): Promise<boolean> {
  const supabase = createClient();

  // Get ticket details
  const { data: ticket, error: ticketError } = await supabase
    .from('tickets')
    .select('project_id, assignee_id, reporter_id')
    .eq('id', ticketId)
    .single();

  if (ticketError || !ticket) {
    return false;
  }

  // Get user role in project
  const role = await getUserProjectRole(ticket.project_id);

  if (!role) {
    return false;
  }

  // Administrators can edit any ticket
  if (role === 'ADMINISTRATOR') {
    return true;
  }

  // Developers can edit tickets they are assigned to or reported
  if (role === 'DEVELOPER') {
    return (
      ticket.assignee_id === userId || ticket.reporter_id === userId
    );
  }

  // Customers can only edit tickets they reported (limited fields)
  if (role === 'CUSTOMER') {
    return ticket.reporter_id === userId;
  }

  return false;
}
