import { TicketComment } from '@/types/database';
import { Badge } from '@/components/ui/Badge';

interface CommentListProps {
  comments: Array<
    TicketComment & {
      author: { email: string };
    }
  >;
}

export function CommentList({ comments }: CommentListProps) {
  if (comments.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No comments yet. Be the first to comment!
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <div
          key={comment.id}
          className="bg-white border border-gray-200 rounded-lg p-4"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-900">
                {comment.author.email}
              </span>
              <span className="text-xs text-gray-500">
                {new Date(comment.created_at).toLocaleString()}
              </span>
            </div>
            {comment.visibility === 'INTERNAL' && (
              <Badge variant="warning">Internal</Badge>
            )}
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {comment.body}
          </p>
        </div>
      ))}
    </div>
  );
}
