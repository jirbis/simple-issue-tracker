import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUserProjectRole } from '@/lib/auth/roles';
import { Navbar } from '@/components/Navbar';
import { CommentList } from '@/components/comments/CommentList';
import { CommentForm } from '@/components/comments/CommentForm';
import { Badge } from '@/components/ui/Badge';

function getPriorityVariant(priority: string) {
  switch (priority) {
    case 'CRITICAL':
      return 'danger';
    case 'HIGH':
      return 'warning';
    case 'MEDIUM':
      return 'info';
    case 'LOW':
      return 'default';
    default:
      return 'default';
  }
}

function getStatusVariant(status: string) {
  switch (status) {
    case 'DONE':
      return 'success';
    case 'IN_PROGRESS':
      return 'info';
    case 'TODO':
      return 'default';
    default:
      return 'default';
  }
}

export default async function TicketPage({
  params,
}: {
  params: { ticketId: string };
}) {
  const supabase = createClient();
  const ticketId = params.ticketId;

  // Fetch ticket details
  const { data: ticket, error: ticketError } = await supabase
    .from('tickets')
    .select(
      `
      *,
      project:projects(id, key, name)
    `
    )
    .eq('id', ticketId)
    .single();

  if (ticketError || !ticket) {
    notFound();
  }

  // Type assertion for the ticket to work around TypeScript inference issues
  const ticketData = ticket as {
    id: string;
    key: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    assignee_id: string | null;
    reporter_id: string;
    due_date: string | null;
    created_at: string;
    updated_at: string;
    project: { id: string; key: string; name: string };
  };

  // Get user role
  const role = await getUserProjectRole(ticketData.project.id);

  if (!role) {
    notFound();
  }

  // Fetch reporter and assignee details
  let reporter = null;
  let assignee = null;

  if (ticketData.reporter_id) {
    const {
      data: { user: reporterUser },
    } = await supabase.auth.admin.getUserById(ticketData.reporter_id);
    reporter = reporterUser
      ? { id: reporterUser.id, email: reporterUser.email || 'Unknown' }
      : null;
  }

  if (ticketData.assignee_id) {
    const {
      data: { user: assigneeUser },
    } = await supabase.auth.admin.getUserById(ticketData.assignee_id);
    assignee = assigneeUser
      ? { id: assigneeUser.id, email: assigneeUser.email || 'Unknown' }
      : null;
  }

  // Fetch comments (with visibility filtering via RLS)
  const { data: commentsData } = await supabase
    .from('ticket_comments')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });

  // Get author details for comments
  const comments = await Promise.all(
    (commentsData || []).map(async (comment: any) => {
      const {
        data: { user: authorUser },
      } = await supabase.auth.admin.getUserById(comment.author_id);
      return {
        ...comment,
        author: {
          email: authorUser?.email || 'Unknown',
        },
      };
    })
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="flex items-center text-sm text-gray-500 mb-6">
          <Link href="/projects" className="hover:text-gray-700">
            Projects
          </Link>
          <span className="mx-2">/</span>
          <Link
            href={`/projects/${ticketData.project.id}`}
            className="hover:text-gray-700"
          >
            {ticketData.project.key}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900">{ticketData.key}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Ticket details */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="text-sm text-gray-500">{ticketData.key}</span>
                  <h1 className="text-2xl font-bold text-gray-900 mt-1">
                    {ticketData.title}
                  </h1>
                </div>
                <div className="flex space-x-2">
                  <Badge variant={getPriorityVariant(ticketData.priority)}>
                    {ticketData.priority}
                  </Badge>
                  <Badge variant={getStatusVariant(ticketData.status)}>
                    {ticketData.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>

              {ticketData.description && (
                <div className="prose max-w-none">
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {ticketData.description}
                  </p>
                </div>
              )}
            </div>

            {/* Comments */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Comments
              </h2>
              <CommentList comments={comments} />
              <div className="mt-6 pt-6 border-t">
                <CommentForm ticketId={ticketId} userRole={role} />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">
                Details
              </h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-xs text-gray-500">Reporter</dt>
                  <dd className="text-sm text-gray-900">
                    {reporter?.email || 'Unknown'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Assignee</dt>
                  <dd className="text-sm text-gray-900">
                    {assignee?.email || 'Unassigned'}
                  </dd>
                </div>
                {ticketData.due_date && (
                  <div>
                    <dt className="text-xs text-gray-500">Due Date</dt>
                    <dd className="text-sm text-gray-900">
                      {new Date(ticketData.due_date).toLocaleDateString()}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs text-gray-500">Created</dt>
                  <dd className="text-sm text-gray-900">
                    {new Date(ticketData.created_at).toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Updated</dt>
                  <dd className="text-sm text-gray-900">
                    {new Date(ticketData.updated_at).toLocaleString()}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
