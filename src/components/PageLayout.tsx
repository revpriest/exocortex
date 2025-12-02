import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TitleNav } from '../components/TitleNav';
import type { ExocortexEvent, ExocortexDB } from '@/lib/exocortex';
import { ExocortexGrid } from '@/components/ExocortexGrid';

interface PageLayoutProps {
  title: string;
  children: React.ReactNode;
  showNavigation?: boolean;
  extraActions?: React.ReactNode;
  db: ExocortexDB | null;
  triggerRefresh: (triggerRefresh: int) => void;
  setSkipDate: (newDate: Date) => void;
  currentView: string;
  explain: string;
}

export const PageLayout: React.FC<PageLayoutProps> = ({
  title,
  children,
  showNavigation = true,
  extraActions,
  currentView,
  db,
  triggerRefresh,
  setSkipDate,
  explain,
}) => {
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ExocortexEvent | null>(null);

  // Only inject onEventClick into ExocortexGrid, NOT every child indiscriminately
  const handleEventClick = (event: ExocortexEvent) => {
    setEditingEvent(event);
    setIsDialogOpen(true);
  };

  // Utility to check if the given child is an ExocortexGrid
  function isExocortexGridElement(child: React.ReactNode): boolean {
    return (React.isValidElement(child) &&
      (child.type === ExocortexGrid || (typeof child.type === 'function' && (child.type as any).name === 'ExocortexGrid')));
  }

  return (
    <div className="bg-background p-2 md:p-4 pb-16 md:pb-20 ">
      <TitleNav
        setSkipDate={setSkipDate}
        triggerRefresh={triggerRefresh}
        currentView={currentView}
        db={db}
        title={title}
        explain={explain}
        isDialogOpen={isDialogOpen}
        setIsDialogOpen={setIsDialogOpen}
        editingEvent={editingEvent}
        setEditingEvent={setEditingEvent}
      />
      <div className="space-y-8">
        {React.Children.map(children, (child) => {
          if (isExocortexGridElement(child)) {
            return React.cloneElement(child as any, { onEventClick: handleEventClick });
          }
          return child;
        })}
      </div>
    </div>
  );
};
