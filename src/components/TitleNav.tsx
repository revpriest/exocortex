/**
 * TitleNav.tsx - Page Title and navigation
 *
 * This component displays the title and navigation on each view
 */

// React hooks for component lifecycle and state management
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { EventDialog } from './EventDialog';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { Grid3X3, BarChart3, Settings, Moon, Sun, RefreshCw, Database, HardDrive, Download, Upload, Trash2, ChevronUp, ChevronDown, CalendarIcon, Plus } from 'lucide-react';
import { ExocortexDB } from '@/lib/exocortex';

/**
 * TitleNav Component Props Interface
 *
 * Defines the props this component accepts:
 *
 * title: The title of this page variant
 */
interface TitleNavProps {
  /** Currently selected view */
  currentView: string;
  /** Title of the page, string */
  title: string;
  /** Mouseover text of the title */
  explain: string;
}


/**
 * Main TitleNav Component
 */
export function TitleNav({ title = "", explain="", currentView = "grid", db }: TitleNavProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // Default mood values (happiness, wakefulness, health) for new events
  const [defaultValues, setDefaultValues] = useState({
    happiness: 0.7,
    wakefulness: 0.8,
    health: 0.9,
  });

  // Controls whether the add/edit event dialog is visible
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Skip to date dialog state
  const [showDateSkipDialog, setShowDateSkipDialog] = useState(false);
  const [selectedSkipDate, setSelectedSkipDate] = useState<Date | undefined>(undefined);
  const [isJumpingToDate, setIsJumpingToDate] = useState(false);

  // Event being edited (null when adding a new event)
  const [editingEvent, setEditingEvent] = useState<ExocortexEvent | null>(null);


  /**
   * Navigation Handler Functions
   *
   * These functions handle switching between the different views.
   * They update the URL which triggers a re-render with the new view.
   */
  const handleGridClick = () => {
    // Navigate to root URL without query parameters for grid view
    navigate('/');
  };

  const handleStatsClick = () => {
    // Navigate to stats view using query parameter
    navigate('/?view=stats');
  };

  const handleConfClick = () => {
    // Navigate to conf view using query parameter
    navigate('/?view=conf');
  };



  // Skip to date functionality
  const handleSkipToDate = async () => {
    if (!db || !selectedSkipDate || isJumpingToDate) {
      return;
    }

    setIsJumpingToDate(true);

    try {
      const targetDate = selectedSkipDate;
      const today = new Date();
      const targetDateStr = targetDate.toISOString().split('T')[0];
      const todayStr = today.toISOString().split('T')[0];

      console.log('Jumping to date:', targetDateStr);

      // Calculate how many days between target and today
      const daysDiff = Math.ceil((today.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24));
      const totalDays = Math.max(daysDiff + 1, 7); // Include both dates + buffer

      // Generate all days from target to today
      const allDays: DayEvents[] = [];
      for (let i = 0; i < totalDays; i++) {
        const currentDate = new Date(today);
        currentDate.setDate(currentDate.getDate() - i);
        const dateStr = currentDate.toISOString().split('T')[0];
        allDays.push({ date: dateStr, events: [] }); // Start with empty days
      }

      // Try to get days with events
      const eventsByDate = await db.getEventsByDateRangeOnly(
        targetDateStr,
        todayStr
      );

      console.log('Found events for', eventsByDate.length, 'dates');

      // Merge events with our generated days
      eventsByDate.forEach(dayWithEvents => {
        const dayIndex = allDays.findIndex(day => day.date === dayWithEvents.date);
        if (dayIndex !== -1) {
          allDays[dayIndex] = dayWithEvents; // Replace empty day with day that has events
        }
      });

      // Sort by date (newest first for display)
      allDays.sort((a, b) => {
        const aDate = new Date(a.date);
        const bDate = new Date(b.date);
        return bDate.getTime() - aDate.getTime(); // Newest first
      });

      // Find the target date index in the sorted array
      const targetDayIndex = allDays.findIndex(day => day.date === targetDateStr);

      // Create a spacer element to ensure the target position is reachable
      const spacerHeight = Math.max(0, targetDayIndex) * ROW_HEIGHT;

      console.log('Target date index:', targetDayIndex, 'Spacer height:', spacerHeight);
      console.log('Total days loaded:', allDays.length);

      // Load all days immediately
      setDays(allDays);

      // Scroll to the target position
      if (gridRef.current) {
        // Create a temporary div to extend scrollable area if needed
        if (spacerHeight > 0) {
          const tempSpacer = document.createElement('div');
          tempSpacer.style.height = `${spacerHeight}px`;
          tempSpacer.className = 'temp-jump-spacer';
          gridRef.current.appendChild(tempSpacer);
        }

        // Scroll to the target position
        const scrollTarget = gridRef.current.scrollHeight - spacerHeight + ROW_HEIGHT / 2;
        console.log('Scrolling to position:', scrollTarget);
        gridRef.current.scrollTop = scrollTarget;

        // Remove spacer after scroll animation
        setTimeout(() => {
          const spacer = gridRef.current?.querySelector('.temp-jump-spacer');
          if (spacer && spacer.parentNode) {
            spacer.parentNode.removeChild(spacer);
          }
        }, 100);
      }

    } catch (error) {
      console.error('Failed to skip to date:', error);
    } finally {
      setIsJumpingToDate(false);
    }
  };

  // Custom calendar component with year navigation
  const CalendarWithYearNav = () => {
    const [currentMonth, setCurrentMonth] = useState(selectedSkipDate || new Date());

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
          selected={selectedSkipDate}
          onSelect={(date) => {
            setSelectedSkipDate(date);
            if (date) setCurrentMonth(date);
          }}
          month={currentMonth}
          onMonthChange={setCurrentMonth}
          className="rounded-md border-border"
          disabled={(date) => {
            // Don't allow dates in the future
            return date > new Date();
          }}
          initialFocus
        />
      </div>
    );
  };


  /** Handle adding an event **/
  const handleAddEvent = async (eventData: Omit<ExocortexEvent, 'id'>) => {
    if (!db) return;

    try {
      await db.addEvent(eventData);

      // Get the event date and previous date
      const eventDate = new Date(eventData.endTime).toISOString().split('T')[0];
      const previousDate = new Date(eventDate);
      previousDate.setDate(previousDate.getDate() - 1);
      const previousDateStr = previousDate.toISOString().split('T')[0];

      // Refresh both the event's day and the previous day (for spanning events)
      const [eventDayEvents, previousDayEvents] = await Promise.all([
        db.getEventsByDate(eventDate),
        db.getEventsByDate(previousDateStr)
      ]);

      setDays(prev => {
        const newDays = [...prev];

        // Update the event's day
        const eventDayIndex = newDays.findIndex(day => day.date === eventDate);
        if (eventDayIndex !== -1) {
          newDays[eventDayIndex] = { date: eventDate, events: eventDayEvents };
        } else {
          newDays.unshift({ date: eventDate, events: eventDayEvents });
        }

        // Update the previous day (if it exists in our display)
        const previousDayIndex = newDays.findIndex(day => day.date === previousDateStr);
        if (previousDayIndex !== -1) {
          newDays[previousDayIndex] = { date: previousDateStr, events: previousDayEvents };
        }

        return newDays;
      });

      setIsDialogOpen(false);
    } catch (error) {
      console.error('Failed to add event:', error);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!db) return;

    try {
      await db.deleteEvent(id);

      // Remove the event from the corresponding day
      setDays(prev => {
        const newDays = prev.map(day => ({
          ...day,
          events: day.events.filter(event => event.id !== id)
        })).filter(day => day.events.length > 0 || day.date === new Date().toISOString().split('T')[0]);

        return newDays;
      });
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  };



  /** Handle closing the event dialog **/
  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingEvent(null);
  };


  /** Handle updating an event **/
  const handleUpdateEvent = async (id: string, eventData: Omit<ExocortexEvent, 'id'>) => {
    if (!db) return;

    try {
      await db.updateEvent(id, eventData);

      // Get the event date and previous date
      const eventDate = new Date(eventData.endTime).toISOString().split('T')[0];
      const previousDate = new Date(eventDate);
      previousDate.setDate(previousDate.getDate() - 1);
      const previousDateStr = previousDate.toISOString().split('T')[0];

      // Refresh both the event's day and the previous day (for spanning events)
      const [eventDayEvents, previousDayEvents] = await Promise.all([
        db.getEventsByDate(eventDate),
        db.getEventsByDate(previousDateStr)
      ]);

      setDays(prev => {
        const newDays = [...prev];

        // Update the event's day
        const eventDayIndex = newDays.findIndex(day => day.date === eventDate);
        if (eventDayIndex !== -1) {
          newDays[eventDayIndex] = { date: eventDate, events: eventDayEvents };
        }

        // Update the previous day (if it exists in our display)
        const previousDayIndex = newDays.findIndex(day => day.date === previousDateStr);
        if (previousDayIndex !== -1) {
          newDays[previousDayIndex] = { date: previousDateStr, events: previousDayEvents };
        }

        return newDays;
      });

      setIsDialogOpen(false);
      setEditingEvent(null);
    } catch (error) {
      console.error('Failed to update event:', error);
    }
  };


  const handleOpenAddDialog = async () => {
    if (!db) {
      setIsDialogOpen(true);
      return;
    }

    // Get defaults from latest event
    const defaults = await getLatestEventDefaults();
    setDefaultValues(defaults);
    setIsDialogOpen(true);
  };


  const getLatestEventDefaults = async () => {
    if (!db) return { happiness: 0.7, wakefulness: 0.8, health: 0.9 };

    try {
      const latestEvent = await db.getLatestEvent();
      if (latestEvent) {
        return {
          happiness: latestEvent.happiness,
          wakefulness: latestEvent.wakefulness,
          health: latestEvent.health,
        };
      }
    } catch (error) {
      console.error('Failed to get latest event:', error);
    }

    return { happiness: 0.7, wakefulness: 0.8, health: 0.9 };
  };

  // Scroll to today functionality
  const handleScrollToToday = useCallback(() => {
    if (gridRef.current) {
      // Scroll to the very top (today is at the top)
      gridRef.current.scrollTop = 0;

      // Update the current date reference
      setCurrentDate(new Date());
    }
  }, []);


  /**
   * Show the title and nav
   */
  return (
        <div className="mb-6">
          {/* Event dialog */}
          <EventDialog
            open={isDialogOpen}
            onOpenChange={handleDialogClose}
            onSubmit={handleAddEvent}
            onUpdate={handleUpdateEvent}
            onDelete={handleDeleteEvent}
            editEvent={editingEvent}
            defaultValues={defaultValues}
          />

          {/* Skip to Date Dialog */}
          <Dialog open={showDateSkipDialog} onOpenChange={(open) => {
            if (!open) {
              setShowDateSkipDialog(false);
            }
          }}>
            <DialogContent className="sm:max-w-md bg-card border-border text-foreground">
              <DialogHeader>
                <DialogTitle>Jump to Date</DialogTitle>
                <DialogDescription>
                  Select a date to jump to in your time tracking data. Use the year buttons for faster navigation.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <div className="flex justify-center">
                  <CalendarWithYearNav />
                </div>
              </div>
              <div className="flex justify-end space-x-2" >
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDateSkipDialog(false);
                    setSelectedSkipDate(undefined);
                  }}
                  className="bg-secondary border-border"
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (!selectedSkipDate || isJumpingToDate) return;

                    // Close dialog immediately
                    setShowDateSkipDialog(false);

                    // Then handle the date jump
                    await handleSkipToDate();
                  }}
                  disabled={!selectedSkipDate || isJumpingToDate}
                  className="bg-primary hover:bg-primary/90"
                >
                  Jump to Date
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              ExocortexLog
            </h1>

            {/* View Toggle Buttons */}
            <div className="flex gap-2">
              <Button
                variant={currentView === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={handleGridClick}
              >
                <Grid3X3 className="h-4 w-4 mr-2" />
                Grid
              </Button>
              <Button
                variant={currentView === 'stats' ? 'default' : 'outline'}
                size="sm"
                onClick={handleStatsClick}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Stats
              </Button>
              <Button
                variant={currentView === 'conf' ? 'default' : 'outline'}
                size="sm"
                onClick={handleConfClick}
              >
                <Settings className="h-4 w-4 mr-2" />
                Conf
              </Button>
            </div>
          </div>

          <h2
            className="text-lg font-semibold text-white cursor-pointer hover:text-primary transition-colors"
            onClick={handleScrollToToday}
            title="{explain}"
          >
            {title}
          </h2>

          <div className="flex float-right gap-4" style={{margin:"0em 0em 1em"}}>
            {/* Skip to date button - mobile responsive */}
            <Button
              variant="outline"
              size="sm"
              className="bg-blue-600/20 border-blue-600 text-blue-400 hover:bg-blue-600/30"
              title="Jump to a specific date"
              onClick={() => setShowDateSkipDialog(true)}
            >
              <CalendarIcon className="h-4 w-4 mr-1 md:mr-2" />
              <span className="hidden md:inline">Skip to Date</span>
            </Button>

            {/* Add new event button - mobile responsive */}
            <Button
              variant="outline"
              size="sm"
              className="bg-blue-600/20 border-blue-600 text-blue-400 hover:bg-blue-600/30"
              title="Add a new event"
              onClick={handleOpenAddDialog}
            >
              <Plus className="h-4 w-4 mr-1 md:mr-2" />
              <span className="hidden md:inline">Add Event</span>
            </Button>

          </div>

        </div>

  );
}
