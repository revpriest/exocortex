import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Calendar as CalendarIcon } from 'lucide-react';

interface HeaderProps {
  onAddEvent: () => void;
  onJumpToDate: () => void;
  onScrollToToday: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onAddEvent,
  onJumpToDate,
  onScrollToToday,
}) => {
  return (
    <div className="mb-4">
      <div className="flex justify-between items-center gap-4">
        <h2
          className="text-lg font-semibold text-white cursor-pointer hover:text-primary transition-colors"
          onClick={onScrollToToday}
          title="Scroll to today"
        >
          Time Grid
        </h2>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onJumpToDate}
            className="bg-blue-600/20 border-blue-600 text-blue-400 hover:bg-blue-600/30"
            title="Jump to a specific date"
          >
            <CalendarIcon className="h-4 w-4 mr-1 md:mr-2" />
            <span className="hidden md:inline">Skip to Date</span>
          </Button>

          <Button
            onClick={onAddEvent}
            className="bg-primary hover:bg-primary/90"
            title="Add new event"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </div>
  );
};
