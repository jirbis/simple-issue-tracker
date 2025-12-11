'use client';

import { useState } from 'react';
import { ProjectMembership, ProjectRole } from '@/types/database';
import {
  updateProjectMemberRole,
  removeProjectMember,
} from '@/app/actions/projects';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface ProjectMembersProps {
  projectId: string;
  memberships: Array<
    ProjectMembership & {
      user: { email: string };
    }
  >;
}

export function ProjectMembers({
  projectId,
  memberships,
}: ProjectMembersProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleRoleChange = async (membershipId: string, role: ProjectRole) => {
    try {
      await updateProjectMemberRole(membershipId, projectId, role);
      setEditingId(null);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update role');
    }
  };

  const handleRemoveMember = async (membershipId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) {
      return;
    }

    try {
      await removeProjectMember(membershipId, projectId);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to remove member');
    }
  };

  const getRoleBadgeVariant = (role: ProjectRole) => {
    switch (role) {
      case 'ADMINISTRATOR':
        return 'danger';
      case 'DEVELOPER':
        return 'info';
      case 'CUSTOMER':
        return 'default';
      default:
        return 'default';
    }
  };

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <ul className="divide-y divide-gray-200">
        {memberships.map((membership) => (
          <li key={membership.id} className="px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <p className="text-sm font-medium text-gray-900">
                  {membership.user.email}
                </p>
                {editingId === membership.id ? (
                  <select
                    value={membership.role}
                    onChange={(e) =>
                      handleRoleChange(
                        membership.id,
                        e.target.value as ProjectRole
                      )
                    }
                    className="text-sm rounded-md border border-gray-300 px-2 py-1"
                  >
                    <option value="ADMINISTRATOR">Administrator</option>
                    <option value="DEVELOPER">Developer</option>
                    <option value="CUSTOMER">Customer</option>
                  </select>
                ) : (
                  <Badge variant={getRoleBadgeVariant(membership.role)}>
                    {membership.role}
                  </Badge>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {editingId === membership.id ? (
                  <Button
                    variant="secondary"
                    onClick={() => setEditingId(null)}
                    className="text-sm py-1 px-3"
                  >
                    Cancel
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="secondary"
                      onClick={() => setEditingId(membership.id)}
                      className="text-sm py-1 px-3"
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => handleRemoveMember(membership.id)}
                      className="text-sm py-1 px-3"
                    >
                      Remove
                    </Button>
                  </>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
