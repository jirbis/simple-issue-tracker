'use server';

import { createClient, getCurrentUser } from '@/lib/supabase/server';
import { requireProjectRole } from '@/lib/auth/roles';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { TicketStatus, TicketPriority } from '@/types/database';

export async function createTicket(projectId: string, formData: FormData) {
  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const priority = formData.get('priority') as TicketPriority;
  const assigneeId = formData.get('assignee_id') as string | null;
  const dueDateStr = formData.get('due_date') as string | null;

  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  // Check if user is a member of the project
  await requireProjectRole(projectId, [
    'ADMINISTRATOR',
    'DEVELOPER',
    'CUSTOMER',
  ]);

  const supabase = createClient();

  const { data: ticket, error } = await supabase
    .from('tickets')
    // @ts-expect-error - TypeScript has issues inferring types with .single() in same function
    .insert({
      project_id: projectId,
      title,
      description,
      priority: priority || 'MEDIUM',
      assignee_id: assigneeId || null,
      reporter_id: user.id,
      due_date: dueDateStr || null,
    })
    .select()
    .single();

  if (error || !ticket) {
    throw new Error(error?.message || 'Failed to create ticket');
  }

  // Type assertion for the ticket
  const ticketId = (ticket as { id: string }).id;

  revalidatePath(`/projects/${projectId}`);
  redirect(`/tickets/${ticketId}`);
}

export async function updateTicket(ticketId: string, formData: FormData) {
  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const status = formData.get('status') as TicketStatus;
  const priority = formData.get('priority') as TicketPriority;
  const assigneeId = formData.get('assignee_id') as string | null;
  const dueDateStr = formData.get('due_date') as string | null;

  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  const supabase = createClient();

  // Get ticket to check permissions
  const { data: ticket, error: fetchError } = await supabase
    .from('tickets')
    .select('project_id, reporter_id')
    .eq('id', ticketId)
    .single();

  if (fetchError || !ticket) {
    throw new Error('Ticket not found');
  }

  // Type assertion for the selected fields
  const ticketData = ticket as { project_id: string; reporter_id: string };

  const { role } = await requireProjectRole(ticketData.project_id, [
    'ADMINISTRATOR',
    'DEVELOPER',
    'CUSTOMER',
  ]);

  // Build update object based on role
  let updateData: any = {};

  if (role === 'ADMINISTRATOR') {
    // Admins can update everything
    updateData = {
      title,
      description,
      status,
      priority,
      assignee_id: assigneeId || null,
      due_date: dueDateStr || null,
    };
  } else if (role === 'DEVELOPER') {
    // Developers can update their own tickets
    if (ticketData.reporter_id === user.id || assigneeId === user.id) {
      updateData = {
        title,
        description,
        status,
        priority,
        assignee_id: assigneeId || null,
        due_date: dueDateStr || null,
      };
    } else {
      throw new Error('Insufficient permissions');
    }
  } else if (role === 'CUSTOMER') {
    // Customers can only update title and description of their own tickets
    if (ticketData.reporter_id === user.id) {
      updateData = {
        title,
        description,
      };
    } else {
      throw new Error('Insufficient permissions');
    }
  }

  const { error } = await supabase
    .from('tickets')
    // @ts-expect-error - TypeScript has issues inferring types after .single() calls
    .update(updateData)
    .eq('id', ticketId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/tickets/${ticketId}`);
}

export async function updateTicketStatus(
  ticketId: string,
  status: TicketStatus
) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  const supabase = createClient();

  // Get ticket to check permissions
  const { data: ticket, error: fetchError } = await supabase
    .from('tickets')
    .select('project_id')
    .eq('id', ticketId)
    .single();

  if (fetchError || !ticket) {
    throw new Error('Ticket not found');
  }

  // Type assertion for the selected field
  const projectId = (ticket as { project_id: string }).project_id;

  // Only admins and developers can change status
  await requireProjectRole(projectId, ['ADMINISTRATOR', 'DEVELOPER']);

  const { error } = await supabase
    .from('tickets')
    // @ts-expect-error - TypeScript has issues inferring types after .single() calls
    .update({ status })
    .eq('id', ticketId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/tickets/${ticketId}`);
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteTicket(ticketId: string) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  const supabase = createClient();

  // Get ticket to check permissions
  const { data: ticket, error: fetchError } = await supabase
    .from('tickets')
    .select('project_id')
    .eq('id', ticketId)
    .single();

  if (fetchError || !ticket) {
    throw new Error('Ticket not found');
  }

  // Type assertion for the selected field
  const projectId = (ticket as { project_id: string }).project_id;

  // Only admins can delete tickets
  await requireProjectRole(projectId, ['ADMINISTRATOR']);

  const { error } = await supabase.from('tickets').delete().eq('id', ticketId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}`);
}
