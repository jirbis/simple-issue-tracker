import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Navbar } from '@/components/Navbar';
import { CreateProjectForm } from '@/components/projects/CreateProjectForm';
import { ProjectWithRole } from '@/types/database';

export default async function ProjectsPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">
              Please sign in to view projects
            </h1>
          </div>
        </div>
      </div>
    );
  }

  // Fetch projects with user roles
  const { data: projects, error } = await supabase
    .from('projects')
    .select(
      `
      *,
      project_memberships!inner(role)
    `
    )
    .eq('project_memberships.user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching projects:', error);
  }

  const projectsWithRoles: ProjectWithRole[] =
    projects?.map((p: any) => ({
      ...p,
      role: p.project_memberships[0].role,
    })) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
          <CreateProjectForm />
        </div>

        {projectsWithRoles.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500">
              No projects yet. Create your first project to get started!
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projectsWithRoles.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {project.name}
                  </h2>
                  <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {project.key}
                  </span>
                </div>
                {project.description && (
                  <p className="text-gray-600 text-sm mb-4">
                    {project.description}
                  </p>
                )}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">
                    Role: {project.role}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
