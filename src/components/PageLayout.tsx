import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TitleNav } from '../components/TitleNav';
import type { ExocortexEvent, ExocortexDB } from '@/lib/exocortex';

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

  // Dialog state is now lifted here for ownership
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ExocortexEvent | null>(null);

  // Handler passed to ExocortexGrid for clicking an event
  const handleEventClick = (event: ExocortexEvent) => {
    setEditingEvent(event);
    setIsDialogOpen(true);
  };

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
        {/* Enhance children with event click capability if they receive the prop */}
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            // For ExocortexGrid pass onEventClick
            return React.cloneElement(child as any, { onEventClick: handleEventClick });
          }
          return child;
        })}
      </div>
    </div>
  );
};
