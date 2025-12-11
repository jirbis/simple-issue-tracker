'use client';

import { useState } from 'react';
import { createProject } from '@/app/actions/projects';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

export function CreateProjectForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);

    try {
      await createProject(formData);
      setIsOpen(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to create project');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Create Project</Button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Create New Project">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Project Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              placeholder="e.g., My Project"
            />
          </div>

          <div>
            <label htmlFor="key" className="block text-sm font-medium text-gray-700">
              Project Key
            </label>
            <input
              type="text"
              id="key"
              name="key"
              required
              maxLength={10}
              pattern="[A-Z]+"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 uppercase"
              placeholder="e.g., PROJ"
            />
            <p className="mt-1 text-sm text-gray-500">
              2-10 uppercase letters (e.g., PROJ, SUP)
            </p>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              placeholder="Brief description of the project"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Project'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
