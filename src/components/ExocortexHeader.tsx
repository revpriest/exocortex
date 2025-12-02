// ExocortexHeader.tsx - Abstracted header for Grid and other views

import React from 'react';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon } from 'lucide-react';

interface ExocortexHeaderProps {
  title?: string;
  onSkipToDate?: () => void;
  skipButtonDisabled?: boolean;
}

export function ExocortexHeader({ title = 'Time Grid', onSkipToDate, skipButtonDisabled }: ExocortexHeaderProps) {
  return (
    <div className="mb-4">
      <div className="flex justify-between items-center gap-4">
        <h2
          className="text-lg font-semibold text-white cursor-pointer hover:text-primary transition-colors"
          title={title}
        >
          {title}
        </h2>
        {onSkipToDate && (
          <Button
            variant="outline"
            size="sm"
            onClick={onSkipToDate}
            className="bg-blue-600/20 border-blue-600 text-blue-400 hover:bg-blue-600/30"
            disabled={skipButtonDisabled}
            title="Jump to a specific date"
          >
            <CalendarIcon className="h-4 w-4 mr-1 md:mr-2" />
            <span className="hidden md:inline">Skip to Date</span>
          </Button>
        )}
      </div>
    </div>
  );
}
