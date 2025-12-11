'use client';

import { useState } from 'react';
import { createComment } from '@/app/actions/comments';
import { Button } from '@/components/ui/Button';
import { ProjectRole } from '@/types/database';

interface CommentFormProps {
  ticketId: string;
  userRole: ProjectRole;
}

export function CommentForm({ ticketId, userRole }: CommentFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [body, setBody] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'INTERNAL'>('PUBLIC');

  const canCreateInternal = userRole === 'ADMINISTRATOR' || userRole === 'DEVELOPER';

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData();
    formData.append('body', body);
    formData.append('visibility', visibility);

    try {
      await createComment(ticketId, formData);
      setBody('');
      setVisibility('PUBLIC');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to create comment');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="body" className="block text-sm font-medium text-gray-700 mb-2">
          Add a comment
        </label>
        <textarea
          id="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          rows={4}
          className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
          placeholder="Write your comment here..."
        />
      </div>

      {canCreateInternal && (
        <div className="flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="radio"
              value="PUBLIC"
              checked={visibility === 'PUBLIC'}
              onChange={(e) => setVisibility(e.target.value as 'PUBLIC')}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Public</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="INTERNAL"
              checked={visibility === 'INTERNAL'}
              onChange={(e) => setVisibility(e.target.value as 'INTERNAL')}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Internal</span>
          </label>
        </div>
      )}

      <div>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Posting...' : 'Post Comment'}
        </Button>
      </div>
    </form>
  );
}
