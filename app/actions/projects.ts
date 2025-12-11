'use server';

import { createClient, getCurrentUser } from '@/lib/supabase/server';
import { requireProjectRole } from '@/lib/auth/roles';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createProject(formData: FormData) {
  const name = formData.get('name') as string;
  const key = formData.get('key') as string;
  const description = formData.get('description') as string;

  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  const supabase = createClient();

  // Create project
  const { data: project, error: projectError } = await supabase
    .from('projects')
    // @ts-expect-error - TypeScript has issues inferring types with .single() in same function
    .insert({
      name,
      key: key.toUpperCase(),
      description,
      created_by: user.id,
    })
    .select()
    .single();

  if (projectError || !project) {
    throw new Error(projectError?.message || 'Failed to create project');
  }

  // Type assertion for the project
  const projectId = (project as { id: string }).id;

  // Add creator as administrator
  const { error: membershipError } = await supabase
    .from('project_memberships')
    // @ts-expect-error - TypeScript has issues inferring types after .single() calls
    .insert({
      project_id: projectId,
      user_id: user.id,
      role: 'ADMINISTRATOR',
    });

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  revalidatePath('/projects');
  redirect(`/projects/${projectId}`);
}

export async function updateProject(projectId: string, formData: FormData) {
  const name = formData.get('name') as string;
  const description = formData.get('description') as string;

  await requireProjectRole(projectId, ['ADMINISTRATOR']);

  const supabase = createClient();

  const { error } = await supabase
    .from('projects')
    // @ts-expect-error - TypeScript has issues inferring types when .single() used elsewhere in file
    .update({
      name,
      description,
    })
    .eq('id', projectId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/projects/${projectId}`);
}

export async function deleteProject(projectId: string) {
  await requireProjectRole(projectId, ['ADMINISTRATOR']);

  const supabase = createClient();

  const { error } = await supabase.from('projects').delete().eq('id', projectId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/projects');
  redirect('/projects');
}

export async function addProjectMember(
  projectId: string,
  userEmail: string,
  role: 'ADMINISTRATOR' | 'DEVELOPER' | 'CUSTOMER'
) {
  await requireProjectRole(projectId, ['ADMINISTRATOR']);

  const supabase = createClient();

  // Find user by email
  const { data: users, error: userError } = await supabase
    .from('auth.users')
    .select('id')
    .eq('email', userEmail)
    .single();

  if (userError || !users) {
    throw new Error('User not found');
  }

  // Type assertion for the selected field
  const userId = (users as { id: string }).id;

  // @ts-expect-error - TypeScript has issues inferring types after .single() calls
  const { error } = await supabase.from('project_memberships').insert({
    project_id: projectId,
    user_id: userId,
    role,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/projects/${projectId}`);
}

export async function updateProjectMemberRole(
  membershipId: string,
  projectId: string,
  role: 'ADMINISTRATOR' | 'DEVELOPER' | 'CUSTOMER'
) {
  await requireProjectRole(projectId, ['ADMINISTRATOR']);

  const supabase = createClient();

  const { error } = await supabase
    .from('project_memberships')
    // @ts-expect-error - TypeScript has issues inferring types when .single() used elsewhere in file
    .update({ role })
    .eq('id', membershipId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/projects/${projectId}`);
}

export async function removeProjectMember(
  membershipId: string,
  projectId: string
) {
  await requireProjectRole(projectId, ['ADMINISTRATOR']);

  const supabase = createClient();

  const { error } = await supabase
    .from('project_memberships')
    .delete()
    .eq('id', membershipId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/projects/${projectId}`);
}
