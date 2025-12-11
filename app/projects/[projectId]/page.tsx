import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUserProjectRole } from '@/lib/auth/roles';
import { Navbar } from '@/components/Navbar';
import { ProjectTabs } from '@/components/projects/ProjectTabs';
import { ProjectMembers } from '@/components/projects/ProjectMembers';
import { CreateTicketForm } from '@/components/tickets/CreateTicketForm';

export default async function ProjectPage({
  params,
}: {
  params: { projectId: string };
}) {
  const supabase = createClient();
  const projectId = params.projectId;

  // Get user role
  const role = await getUserProjectRole(projectId);

  if (!role) {
    notFound();
  }

  // Fetch project details
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (projectError || !project) {
    notFound();
  }

  // Fetch tickets
  const { data: tickets } = await supabase
    .from('tickets')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  // Fetch project members for ticket creation
  const { data: membershipsData } = await supabase
    .from('project_memberships')
    .select(
      `
      id,
      user_id,
      role,
      created_at,
      project_id
    `
    )
    .eq('project_id', projectId);

  // Get user details for members
  const userIds = membershipsData?.map((m: any) => m.user_id) || [];
  const users: Array<{ id: string; email: string }> = [];

  if (userIds.length > 0) {
    // Note: In production, you'd want to fetch user emails from auth.users
    // For now, we'll use a placeholder approach
    for (const userId of userIds) {
      const {
        data: { user },
      } = await supabase.auth.admin.getUserById(userId);
      if (user) {
        users.push({ id: user.id, email: user.email || 'Unknown' });
      }
    }
  }

  const memberships = membershipsData?.map((m: any) => ({
    ...m,
    user: users.find((u) => u.id === m.user_id) || {
      email: 'Unknown',
    },
  }));

  const isAdmin = role === 'ADMINISTRATOR';

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <div className="flex items-center text-sm text-gray-500 mb-2">
            <Link href="/projects" className="hover:text-gray-700">
              Projects
            </Link>
            <span className="mx-2">/</span>
            <span className="text-gray-900">{project.key}</span>
          </div>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {project.name}
              </h1>
              {project.description && (
                <p className="mt-2 text-gray-600">{project.description}</p>
              )}
            </div>
            <CreateTicketForm projectId={projectId} members={users} />
          </div>
        </div>

        <ProjectTabs
          tickets={tickets || []}
          membersComponent={
            <ProjectMembers
              projectId={projectId}
              memberships={memberships || []}
            />
          }
          isAdmin={isAdmin}
        />
      </div>
    </div>
  );
}
