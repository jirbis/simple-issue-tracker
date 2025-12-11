'use client';

import { useState } from 'react';
import { KanbanBoard } from '@/components/tickets/KanbanBoard';
import { TicketList } from '@/components/tickets/TicketList';
import { Ticket } from '@/types/database';

interface ProjectTabsProps {
  tickets: Ticket[];
  membersComponent: React.ReactNode;
  isAdmin: boolean;
}

type Tab = 'board' | 'list' | 'members';

export function ProjectTabs({
  tickets,
  membersComponent,
  isAdmin,
}: ProjectTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('board');

  const tabs: { id: Tab; label: string; adminOnly?: boolean }[] = [
    { id: 'board', label: 'Board' },
    { id: 'list', label: 'Tickets' },
    { id: 'members', label: 'Members', adminOnly: true },
  ];

  const visibleTabs = tabs.filter((tab) => !tab.adminOnly || isAdmin);

  return (
    <div>
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div>
        {activeTab === 'board' && <KanbanBoard tickets={tickets} />}
        {activeTab === 'list' && <TicketList tickets={tickets} />}
        {activeTab === 'members' && isAdmin && membersComponent}
      </div>
    </div>
  );
}
