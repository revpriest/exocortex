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
import { Grid3X3, BarChart3, Squirrel, Settings, Moon, Sun, RefreshCw, Database, HardDrive, Download, Upload, Trash2, ChevronUp, ChevronDown, CalendarIcon, Plus } from 'lucide-react';
import { ExocortexDB, ExocortexEvent } from '@/lib/exocortex';

/**
 * TitleNav Component Props Interface
 */
interface TitleNavProps {
  currentView: string;
  title: string;
  explain: string;
  db: ExocortexDB | null;
  triggerRefresh: (triggerRefresh: int) => void;
  setSkipDate: (newDate: Date) => void;
  // Dialog control props (lifted)
  isDialogOpen: boolean;
  setIsDialogOpen: (open: boolean) => void;
  editingEvent: ExocortexEvent | null;
  setEditingEvent: (e: ExocortexEvent | null) => void;
}

export function TitleNav({
  db, setSkipDate, triggerRefresh, title, explain, currentView = "grid",
  isDialogOpen, setIsDialogOpen, editingEvent, setEditingEvent,
}: TitleNavProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const [defaultValues, setDefaultValues] = useState({
    happiness: 0.7,
    wakefulness: 0.8,
    health: 0.9,
  });

  // Skip to date dialog state
  const [showDateSkipDialog, setShowDateSkipDialog] = useState(false);
  const [selectedSkipDate, setSelectedSkipDate] = useState<Date | undefined>(undefined);

  // Remove local event dialog state! All controlled via props now

  // Navigation handlers (no change)
  const handleGridClick = () => navigate('/');
  const handleStatsClick = () => navigate('/stats');
  const handleSummaryClick = () => navigate('/summary');
  const handleConfClick = () => navigate('/conf');

  // Custom calendar with year nav (unchanged)
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
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={handleYearDown} className="bg-secondary border-border"><ChevronDown className="h-4 w-4" /></Button>
          <div className="text-lg font-semibold">{currentMonth.getFullYear()}</div>
          <Button variant="outline" size="sm" onClick={handleYearUp} className="bg-secondary border-border"><ChevronUp className="h-4 w-4" /></Button>
        </div>
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
          disabled={date => date > new Date()}
          initialFocus
        />
      </div>
    );
  };

  // Dialog close handler
  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingEvent(null);
  };

  // Add, update, delete use existing code but use setEditingEvent(null) instead of local.
  const handleAddEvent = async (eventData: Omit<ExocortexEvent, 'id'>) => {
    if (!db) return;
    try {
      await db.addEvent(eventData);
      if (triggerRefresh) triggerRefresh(prev => prev + 1);
      setIsDialogOpen(false);
      setEditingEvent(null);
    } catch (error) {
      console.error('Failed to add event:', error);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!db) return;
    try {
      await db.deleteEvent(id);
      setIsDialogOpen(false);
      setEditingEvent(null);
      if (triggerRefresh) triggerRefresh(prev => prev + 1);
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  };

  const handleUpdateEvent = async (id: string, eventData: Omit<ExocortexEvent, 'id'>) => {
    if (!db) return;
    try {
      await db.updateEvent(id, eventData);
      setIsDialogOpen(false);
      setEditingEvent(null);
      if (triggerRefresh) triggerRefresh(prev => prev + 1);
    } catch (error) {
      console.error('Failed to update event:', error);
    }
  };

  // Add action only: setEditingEvent(null), setIsDialogOpen(true)
  const handleOpenAddDialog = async () => {
    if (db) {
      const defaults = await getLatestEventDefaults();
      setDefaultValues(defaults);
    }
    setEditingEvent(null);
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

  // Scroll to today
  const handleScrollToToday = useCallback(() => { if(setSkipDate){ setSkipDate(new Date()); } }, []);

  // Skip to date
  const handleSkipToDate = async () => {
    if (!db || !selectedSkipDate) return;
    setSkipDate(selectedSkipDate);
    setShowDateSkipDialog(false);
  };

  /**
   * Show the title and nav
   */
  return (
    <div className="mb-6">
      <EventDialog
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
        onSubmit={handleAddEvent}
        onUpdate={handleUpdateEvent}
        onDelete={handleDeleteEvent}
        editEvent={editingEvent}
        defaultValues={defaultValues}
      />
      {/* Skip to Date Dialog unchanged */}
      <Dialog open={showDateSkipDialog} onOpenChange={setShowDateSkipDialog}>
        <DialogContent className="sm:max-w-md bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle>Jump to Date</DialogTitle>
            <DialogDescription>Select a date to jump to in your time tracking data. Use the year buttons for faster navigation.</DialogDescription>
          </DialogHeader>
          <div className="py-4 flex justify-center"><CalendarWithYearNav /></div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => { setShowDateSkipDialog(false); setSelectedSkipDate(undefined); }} className="bg-secondary border-border">Cancel</Button>
            <Button onClick={handleSkipToDate} disabled={!selectedSkipDate} className="bg-primary hover:bg-primary/90">Jump to Date</Button>
          </div>
        </DialogContent>
      </Dialog>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <a href="/about"><h1 className="text-2xl md:text-3xl font-bold text-foreground">ExocortexLog</h1></a>
        <div className="flex gap-2">
          <Button variant={currentView === 'grid' ? 'default' : 'outline'} size="sm" onClick={handleGridClick}><Grid3X3 className="h-4 w-4 mr-2" />Grid</Button>
          <Button variant={currentView === 'summary' ? 'default' : 'outline'} size="sm" onClick={handleSummaryClick}><Squirrel className="h-4 w-4 mr-2" />Summary</Button>
          <Button variant={currentView === 'stats' ? 'default' : 'outline'} size="sm" onClick={handleStatsClick}><BarChart3 className="h-4 w-4 mr-2" />Stats</Button>
          <Button variant={currentView === 'conf' ? 'default' : 'outline'} size="sm" onClick={handleConfClick}><Settings className="h-4 w-4 mr-2" />Conf</Button>
        </div>
      </div>
      <h2 className="text-lg font-semibold text-white cursor-pointer hover:text-primary transition-colors" onClick={handleScrollToToday} title={explain}>{title}</h2>
      <div className="flex float-right gap-4" style={{position:"relative", top:"-1em"}}>
        {setSkipDate && (
          <Button variant="outline" size="sm" className="bg-blue-600/20 border-blue-600 text-blue-400 hover:bg-blue-600/30" title="Jump to a specific date" onClick={() => setShowDateSkipDialog(true)}>
            <CalendarIcon className="h-4 w-4 mr-1 md:mr-2" />
            <span className="hidden md:inline">Skip to Date</span>
          </Button>
        )}
        <Button variant="outline" size="sm" className="bg-blue-600/20 border-blue-600 text-blue-400 hover:bg-blue-600/30" title="Add a new event" onClick={handleOpenAddDialog}>
          <Plus className="h-4 w-4 mr-1 md:mr-2" />
          <span className="hidden md:inline">Add Event</span>
        </Button>
      </div>
    </div>
  );
}
