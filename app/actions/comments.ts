'use server';

import { createClient, getCurrentUser } from '@/lib/supabase/server';
import { getUserProjectRole } from '@/lib/auth/roles';
import { revalidatePath } from 'next/cache';
import { CommentVisibility } from '@/types/database';

export async function createComment(
  ticketId: string,
  formData: FormData
) {
  const body = formData.get('body') as string;
  const visibility = formData.get('visibility') as CommentVisibility;

  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  const supabase = createClient();

  // Get ticket's project
  const { data: ticket, error: ticketError } = await supabase
    .from('tickets')
    .select('project_id')
    .eq('id', ticketId)
    .single();

  if (ticketError || !ticket) {
    throw new Error('Ticket not found');
  }

  // Check user role in project
  const role = await getUserProjectRole(ticket.project_id);
  if (!role) {
    throw new Error('Not a member of this project');
  }

  // Customers can only create public comments
  if (role === 'CUSTOMER' && visibility === 'INTERNAL') {
    throw new Error('Customers cannot create internal comments');
  }

  const { error } = await supabase.from('ticket_comments').insert({
    ticket_id: ticketId,
    author_id: user.id,
    body,
    visibility: visibility || 'PUBLIC',
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/tickets/${ticketId}`);
}

export async function updateComment(
  commentId: string,
  ticketId: string,
  formData: FormData
) {
  const body = formData.get('body') as string;

  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  const supabase = createClient();

  // Check if user is the author
  const { data: comment, error: fetchError } = await supabase
    .from('ticket_comments')
    .select('author_id')
    .eq('id', commentId)
    .single();

  if (fetchError || !comment) {
    throw new Error('Comment not found');
  }

  if (comment.author_id !== user.id) {
    throw new Error('You can only edit your own comments');
  }

  const { error } = await supabase
    .from('ticket_comments')
    .update({ body })
    .eq('id', commentId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/tickets/${ticketId}`);
}

export async function deleteComment(commentId: string, ticketId: string) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  const supabase = createClient();

  // Check if user is the author or admin
  const { data: comment, error: fetchError } = await supabase
    .from('ticket_comments')
    .select('author_id, ticket_id')
    .eq('id', commentId)
    .single();

  if (fetchError || !comment) {
    throw new Error('Comment not found');
  }

  // Get ticket's project
  const { data: ticket, error: ticketError } = await supabase
    .from('tickets')
    .select('project_id')
    .eq('id', comment.ticket_id)
    .single();

  if (ticketError || !ticket) {
    throw new Error('Ticket not found');
  }

  // Check if user is author or admin
  const role = await getUserProjectRole(ticket.project_id);
  const isAuthor = comment.author_id === user.id;
  const isAdmin = role === 'ADMINISTRATOR';

  if (!isAuthor && !isAdmin) {
    throw new Error('Insufficient permissions');
  }

  const { error } = await supabase
    .from('ticket_comments')
    .delete()
    .eq('id', commentId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/tickets/${ticketId}`);
}
