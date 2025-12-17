import React, { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CalendarWithYearNavProps {
  selectedDate?: Date;
  onChange?: (date: Date | undefined) => void;
}

/**
 * Shared calendar component with fast year navigation.
 *
 * Used by:
 * - TitleNav skip-to-date dialog
 * - Cats page "Start at" selector
 */
export const CalendarWithYearNav: React.FC<CalendarWithYearNavProps> = ({
  selectedDate,
  onChange,
}) => {
  const [currentMonth, setCurrentMonth] = useState<Date>(selectedDate || new Date());

  const handleYearUp = () => {
    const newDate = new Date(currentMonth);
    newDate.setFullYear(newDate.getFullYear() + 1);
    setCurrentMonth(newDate);
  };

  const handleYearDown = () => {
    const newDate = new Date(currentMonth);
    newDate.setFullYear(newDate.getFullYear() - 1);
    setCurrentMonth(newDate);
  };

  return (
    <div className="space-y-4">
      {/* Year navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={handleYearDown}
          className="bg-secondary border-border"
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
        <div className="text-lg font-semibold">
          {currentMonth.getFullYear()}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleYearUp}
          className="bg-secondary border-border"
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar */}
      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={(date) => {
          if (onChange) onChange(date ?? undefined);
          if (date) setCurrentMonth(date);
        }}
        month={currentMonth}
        onMonthChange={setCurrentMonth}
        className="rounded-md border-border"
        disabled={(date) => date > new Date()}
        initialFocus
      />
    </div>
  );
};
