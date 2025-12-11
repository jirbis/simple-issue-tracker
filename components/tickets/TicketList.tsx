import Link from 'next/link';
import { Ticket } from '@/types/database';
import { Badge } from '@/components/ui/Badge';

interface TicketListProps {
  tickets: Ticket[];
}

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

export function TicketList({ tickets }: TicketListProps) {
  if (tickets.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow">
        <p className="text-gray-500">No tickets found.</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <ul className="divide-y divide-gray-200">
        {tickets.map((ticket) => (
          <li key={ticket.id}>
            <Link
              href={`/tickets/${ticket.id}`}
              className="block hover:bg-gray-50 transition-colors"
            >
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-gray-500">
                      {ticket.key}
                    </span>
                    <p className="text-sm font-medium text-gray-900">
                      {ticket.title}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={getPriorityVariant(ticket.priority)}>
                      {ticket.priority}
                    </Badge>
                    <Badge variant={getStatusVariant(ticket.status)}>
                      {ticket.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
                {ticket.due_date && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Due: {new Date(ticket.due_date).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
