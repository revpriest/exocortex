/**
 * TitleNav.tsx - Page Title and navigation
 *
 * This component displays the title and navigation on each view
 */

// React hooks for component lifecycle and state management
import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { EventDialog } from './EventDialog';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import { Brain, BarChart3, Squirrel, Settings, ChevronUp, ChevronDown, CalendarIcon, Plus } from 'lucide-react';
import { ExocortexEvent, ExocortexDB } from '@/lib/exocortex';
import { useHueInit } from '@/hooks/useHueInit';

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
  /** Database **/
  db: ExocortexDB | null;
  /** Trigger the grid to redraw **/
  triggerRefresh?: (prev: any) => any | undefined;
  /** Set to trigger the grid to skip to a date **/
  setSkipDate?: (newDate: Date) => void;
}

/**
 * Main TitleNav Component
 */
export function TitleNav({db, setSkipDate, triggerRefresh, title, explain, currentView = "grid" }: TitleNavProps) {
  const navigate = useNavigate();

  // Ensure global hue CSS variable is initialised for every page using TitleNav
  useHueInit();

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

  // Event being edited (null when adding a new event)
  const [editingEvent, setEditingEvent] = useState<ExocortexEvent | null>(null);

  /**
   * Navigation Handler Functions
   *
   * These functions handle switching between the different views.
   * They update the URL which triggers a re-render with the new view.
   */
  const handleGridClick = () => {
    navigate('/');
  };

  const handleStatsClick = () => {
    navigate('/stats');
  };

  const handleSummaryClick = () => {
    navigate('/summary');
  };

  const handleConfClick = () => {
    // Navigate to conf view using query parameter
    navigate('/conf');
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
            if (!date) return;
            // Normalise to midnight
            const normalized = new Date(date);
            normalized.setHours(0, 0, 0, 0);
            setSelectedSkipDate(normalized);
            setCurrentMonth(normalized);
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

  /** Handle closing the event dialog **/
  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingEvent(null);
  };

  /** Handle adding an event **/
  const handleAddEvent = async (eventData: Omit<ExocortexEvent, 'id'>) => {
    if (!db) {console.log("Not adding event, no DB");return};

    try {
      await db.addEvent(eventData);

      //After adding event we force a refresh of the top Date.
      if(triggerRefresh){
        triggerRefresh(prev => prev + 1);
        console.log("Triggered refresh? to try and trigger grid refresh");
      }else{
        console.log("No refresh required, perhaps not showing data on this page");
      }

      setIsDialogOpen(false);
    } catch (error) {
      console.error('Failed to add event:', error);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!db) return;

    try {
      await db.deleteEvent(id);
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
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
      const [_eventDayEvents, _previousDayEvents] = await Promise.all([
        db.getEventsByDate(eventDate),
        db.getEventsByDate(previousDateStr)
      ]);

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
    if (setSkipDate) {
      const targetDate = new Date();
      targetDate.setHours(0, 0, 0, 0);
      console.log('[TitleNav] Scroll-to-today clicked, targetDate', targetDate.toISOString());
      setSkipDate(targetDate);
    }
  }, [setSkipDate]);

  // scroll to given to date functionality
  const handleSkipToDate = useCallback(async () => {
    if (!selectedSkipDate || !setSkipDate) {
      return;
    }
    const targetDate = new Date(selectedSkipDate);
    targetDate.setHours(0, 0, 0, 0);
    console.log('[TitleNav] Jump-to-date from calendar', targetDate.toISOString(), 'has setSkipDate', !!setSkipDate);
    setSkipDate(targetDate);
  }, [selectedSkipDate, setSkipDate]);

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
                    if (!selectedSkipDate) return;

                    // Close dialog immediately
                    setShowDateSkipDialog(false);

                    // Then handle the date jump
                    await handleSkipToDate();
                  }}
                  disabled={!selectedSkipDate}
                  className="bg-primary hover:bg-primary/90"
                >
                  Jump to Date
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/about')}
              className="group inline-flex items-center gap-3 nobr text-2xl md:text-3xl font-bold text-foreground rounded-full px-3 py-1 transition-colors hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              aria-label="About Exocortex Log"
            >
              <span className="inline-flex items-center justify-center w-10 h-10 md:w-12 md:h-12">
                <img
                  src="/exocortexlog.png"
                  alt="Exocortex Log logo"
                  className="max-w-full max-h-full object-contain"
                />
              </span>
              <span className="group-hover:text-primary">Exocortex Log</span>
            </button>

            {/* View Toggle Buttons */}
            <div className="flex gap-2">
              <Button
                variant={currentView === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={handleGridClick}
                aria-label="Grid"
              >
                <Brain className="h-4 w-4" />
                <span className="hidden xs:inline sm:inline md:inline lg:inline xl:inline 2xl:inline ml-2">Grid</span>
              </Button>
              <Button
                variant={currentView === 'summary' ? 'default' : 'outline'}
                size="sm"
                onClick={handleSummaryClick}
                aria-label="Summary"
              >
                <Squirrel className="h-4 w-4" />
                <span className="hidden xs:inline sm:inline md:inline lg:inline xl:inline 2xl:inline ml-2">Summary</span>
              </Button>
              <Button
                variant={currentView === 'stats' ? 'default' : 'outline'}
                size="sm"
                onClick={handleStatsClick}
                aria-label="Stats"
              >
                <BarChart3 className="h-4 w-4" />
                <span className="hidden xs:inline sm:inline md:inline lg:inline xl:inline 2xl:inline ml-2">Stats</span>
              </Button>
              <Button
                variant={currentView === 'conf' ? 'default' : 'outline'}
                size="sm"
                onClick={handleConfClick}
                aria-label="Conf"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden xs:inline sm:inline md:inline lg:inline xl:inline 2xl:inline ml-2">Conf</span>
              </Button>
            </div>
          </div>

          <h2
            className="text-lg font-semibold text-white cursor-pointer hover:text-primary transition-colors"
            onClick={handleScrollToToday}
            title={explain}
          >
            {title}
          </h2>

          <div className="flex float-right gap-4" style={{position:"relative", top:"-1em"}}>
            {/* Skip to date button - mobile responsive */}
            {setSkipDate && (
              <Button
                variant="outline"
                size="sm"
                className="bg-blue-600/20 border-blue-600 text-blue-400 hover:bg-blue-600/30"
                title="Jump to a specific date"
                onClick={() => {
                  // Initialise selection when opening to avoid undefined
                  if (!selectedSkipDate) {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    setSelectedSkipDate(today);
                  }
                  setShowDateSkipDialog(true);
                }}
              >
                <CalendarIcon className="h-4 w-4 mr-1 md:mr-2" />
                <span className="hidden md:inline">Skip to Date</span>
              </Button>
            )}
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
