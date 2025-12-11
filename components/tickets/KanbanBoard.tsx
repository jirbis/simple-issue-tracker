'use client';

import { useState } from 'react';
import Link from 'next/link';
import { updateTicketStatus } from '@/app/actions/tickets';
import { Ticket, TicketStatus } from '@/types/database';
import { Badge } from '@/components/ui/Badge';

interface KanbanBoardProps {
  tickets: Ticket[];
}

const COLUMNS: { status: TicketStatus; label: string }[] = [
  { status: 'TODO', label: 'To Do' },
  { status: 'IN_PROGRESS', label: 'In Progress' },
  { status: 'DONE', label: 'Done' },
];

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

export function KanbanBoard({ tickets }: KanbanBoardProps) {
  const [draggedTicket, setDraggedTicket] = useState<Ticket | null>(null);

  const handleDragStart = (ticket: Ticket) => {
    setDraggedTicket(ticket);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (status: TicketStatus) => {
    if (!draggedTicket || draggedTicket.status === status) {
      setDraggedTicket(null);
      return;
    }

    try {
      await updateTicketStatus(draggedTicket.id, status);
      setDraggedTicket(null);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update ticket');
      setDraggedTicket(null);
    }
  };

  return (
    <div className="grid grid-cols-3 gap-6">
      {COLUMNS.map((column) => {
        const columnTickets = tickets.filter((t) => t.status === column.status);

        return (
          <div
            key={column.status}
            className="bg-gray-50 rounded-lg p-4"
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(column.status)}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">{column.label}</h3>
              <span className="text-sm text-gray-500 bg-gray-200 px-2 py-1 rounded">
                {columnTickets.length}
              </span>
            </div>

            <div className="space-y-3">
              {columnTickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  href={`/tickets/${ticket.id}`}
                  draggable
                  onDragStart={() => handleDragStart(ticket)}
                  className="block p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-move"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs font-medium text-gray-500">
                      {ticket.key}
                    </span>
                    <Badge variant={getPriorityVariant(ticket.priority)}>
                      {ticket.priority}
                    </Badge>
                  </div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    {ticket.title}
                  </h4>
                  {ticket.due_date && (
                    <p className="text-xs text-gray-500">
                      Due: {new Date(ticket.due_date).toLocaleDateString()}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
