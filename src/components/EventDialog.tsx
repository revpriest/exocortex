/**
 * EventDialog.tsx - Event Creation and Editing Dialog
 *
 * This component provides the interface for adding new events and editing existing ones.
 * It includes:
 * - Category input with dropdown suggestions
 * - Time adjustment controls
 * - Mood sliders (happiness, wakefulness, health)
 * - Live smiley face preview that changes based on mood values
 * - Form validation and error handling
 * - Responsive design for mobile and desktop
 *
 * The dialog can be opened in two modes:
 * 1. Add mode: Create a new event with default values
 * 2. Edit mode: Modify an existing event with its current values
 */

// React hooks for state management and lifecycle
import React, { useState, useEffect, useRef } from 'react';

// Import UI components from our component library
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Import types and utilities
import { ExocortexEvent, getEventColor } from '@/lib/exocortex';
import { useAppContext } from '@/hooks/useAppContext';
import { Clock, ChevronLeft, ChevronRight, Trash2, AlertCircle, ChevronDown, X, Save, Plus } from 'lucide-react';
import { ExocortexDB } from '@/lib/exocortex';
import { useIsMobile } from '@/hooks/useIsMobile';

// Helper function to draw smiley face
function drawSmileyFaceOnCanvas(
  canvas: HTMLCanvasElement | null,
  healthArr: number[],
  wakefulnessArr: number[],
  happinessArr: number[]
) {
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = Math.min(canvas.width, canvas.height) * 0.35;

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Get current mood values from state arrays
  const healthVal = healthArr[0];
  const wakefulnessVal = wakefulnessArr[0];
  const happinessVal = happinessArr[0];

  // Calculate face color (yellow to green based on health)
  // Yellow: RGB(255, 255, 0), Green: RGB(0, 255, 0)
  const red = Math.round(255 * healthVal);
  const green = 255;
  const blue = 0;
  const faceColor = `rgb(${red}, ${green}, ${blue})`;

  // Draw face circle
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
  ctx.fillStyle = faceColor;
  ctx.fill();
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Draw eyes based on wakefulness (fixed: 0% = closed, 100% = open)
  const eyeWidth = radius * 0.2; // Bigger eyes
  const eyeHeight = Math.max(radius * 0.02, radius * 0.2 * wakefulnessVal); // Minimum height for closed eyes
  const eyeYOffset = radius * 0.3;
  const eyeXOffset = radius * 0.3;

  // Left eye
  ctx.beginPath();
  ctx.ellipse(centerX - eyeXOffset, centerY - eyeYOffset, eyeWidth, eyeHeight, 0, 0, 2 * Math.PI);
  ctx.fillStyle = '#333';
  ctx.fill();

  // Right eye
  ctx.beginPath();
  ctx.ellipse(centerX + eyeXOffset, centerY - eyeYOffset, eyeWidth, eyeHeight, 0, 0, 2 * Math.PI);
  ctx.fillStyle = '#333';
  ctx.fill();

  // Draw mouth based on happiness (exaggerated curve)
  const mouthWidth = radius * 0.6;
  const mouthY = centerY + radius * 0.25; // Even lower to compensate for exaggerated curve

  // Calculate mouth curve height based on happiness (exaggerated)
  // -0.6 to 0.6 range: negative = sad, positive = happy (twice as height)
  const mouthCurveHeight = (happinessVal - 0.5) * 1.2 * radius;

  ctx.beginPath();
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 3;

  // Use quadratic curve for smooth mouth
  ctx.moveTo(centerX - mouthWidth, mouthY);
  ctx.quadraticCurveTo(centerX, mouthY + mouthCurveHeight, centerX + mouthWidth, mouthY);
  ctx.stroke();
}

/**
 * EventDialog Component Props Interface
 *
 * This TypeScript interface defines what props the EventDialog component accepts:
 *
 * open: Controls whether dialog is visible
 * onOpenChange: Callback when dialog should open/close
 * onSubmit: Callback when user submits a new event
 * onUpdate: Callback when user updates an existing event
 * onDelete: Callback when user deletes an event
 * editEvent: The event being edited (null for new event mode)
 * defaultValues: Default mood values for new events
 */
interface EventDialogProps {
  /** Controls dialog visibility (true = open, false = closed) */
  open: boolean;
  /** Callback function called when dialog should open/close */
  onOpenChange: (open: boolean) => void;
  /** Callback function called when user submits a new event */
  onSubmit: (event: Omit<ExocortexEvent, 'id'>) => void;
  /** Callback function called when user updates an existing event */
  onUpdate?: (id: string, event: Omit<ExocortexEvent, 'id'>) => void;
  /** Callback function called when user deletes an event */
  onDelete?: (id: string) => void;
  /** The event being edited (null = adding new event) */
  editEvent?: ExocortexEvent | null;
  /** Default values for mood sliders (happiness, wakefulness, health) */
  defaultValues?: {
    happiness: number;
    wakefulness: number;
    health: number;
  };
}

export function EventDialog({ open, onOpenChange, onSubmit, onUpdate, onDelete, editEvent, defaultValues }: EventDialogProps) {
  const isMobile = useIsMobile();
  const { config } = useAppContext();
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');
  const [happinessState, setHappinessState] = useState([defaultValues?.happiness || 0.7]);
  const [wakefulnessState, setWakefulnessState] = useState([defaultValues?.wakefulness || 0.8]);
  const [healthState, setHealthState] = useState([defaultValues?.health || 0.9]);
  const [endTime, setEndTime] = useState(new Date());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [recentCategories, setRecentCategories] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);

  // Reset form when dialog opens or editEvent changes
  useEffect(() => {
    if (open) {
      if (editEvent) {
        setCategory(editEvent.category);
        setNotes(editEvent.notes || '');
        setHappinessState([editEvent.happiness]);
        setWakefulnessState([editEvent.wakefulness]);
        setHealthState([editEvent.health]);
        setEndTime(new Date(editEvent.endTime));
        calculateStartTime(new Date(editEvent.endTime));
      } else {
        setCategory('');
        setNotes('');
        setHappinessState([defaultValues?.happiness || 0.7]);
        setWakefulnessState([defaultValues?.wakefulness || 0.8]);
        setHealthState([defaultValues?.health || 0.9]);
        setEndTime(new Date());
        calculateStartTime(new Date());
      }
    }
  }, [open, editEvent, defaultValues]);

  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Draw smiley face based on current mood values
  const drawSmileyFace = () => {
    drawSmileyFaceOnCanvas(canvasRef.current, healthState, wakefulnessState, happinessState);
  };

  // Update canvas when mood values change
  useEffect(() => {
    drawSmileyFace();
  }, [happinessState, wakefulnessState, healthState]);

  // Initial draw when component mounts
  useEffect(() => {
    drawSmileyFace();
  }, []);

  // Load recent categories when dialog opens
  useEffect(() => {
    if (open) {
      loadRecentCategories();
    }
  }, [open]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      const dropdownContainer = target.closest('.relative');
      if (!dropdownContainer || !dropdownContainer.contains(target)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  // Calculate start time from previous event
  const calculateStartTime = async (currentEndTime: Date) => {
    try {
      const db = new ExocortexDB();
      await db.init();

      // Get all events from the same day and previous day to find the previous event
      const currentDay = currentEndTime.toISOString().split('T')[0];
      const previousDay = new Date(currentEndTime);
      previousDay.setDate(previousDay.getDate() - 1);
      const previousDayStr = previousDay.toISOString().split('T')[0];

      const [currentDayEvents, previousDayEvents] = await Promise.all([
        db.getEventsByDate(currentDay),
        db.getEventsByDate(previousDayStr)
      ]);

      // Combine events from both days and sort by end time
      const allEvents = [...previousDayEvents, ...currentDayEvents].sort((a, b) => a.endTime - b.endTime);

      // Find the previous event (the one that ends just before this event)
      const currentTime = currentEndTime.getTime();
      const previousEvent = allEvents
        .filter(event => event.endTime < currentTime)
        .sort((a, b) => b.endTime - a.endTime)[0]; // Get the latest event before current time

      if (previousEvent) {
        setStartTime(new Date(previousEvent.endTime));
      } else {
        setStartTime(null);
      }
    } catch (error) {
      console.error('Failed to calculate start time:', error);
      setStartTime(null);
    }
  };

  // Recalculate start time when end time changes
  useEffect(() => {
    if (open) {
      calculateStartTime(endTime);
    }
  }, [endTime, open]);

  // Load recent unique categories from database
  const loadRecentCategories = async () => {
    try {
      const db = new ExocortexDB();
      await db.init();

      // Get events from the last 30 days including today
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 29); // -29 to include 30 days total (today + 29 previous)

      const days = await db.getEventsByDateRange(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );

      // Extract all categories and get unique ones, keeping most recent first
      const allCategories = days.flatMap(day => day.events.map(event => event.category));

      // Reverse to get most recent first, then get unique ones
      const reversedCategories = [...allCategories].reverse();
      const uniqueCategories = [...new Set(reversedCategories)].slice(0, 12);

      // Always include default categories along with existing ones
      const defaultCategories = ['Work', 'Sleep', 'Exercise', 'Meal', 'Break', 'Study', 'Slack'];
      const combinedCategories = [...uniqueCategories, ...defaultCategories];
      const finalCategories = [...new Set(combinedCategories)].slice(0, 12); // Remove duplicates and limit to 12

      setRecentCategories(finalCategories);
    } catch (error) {
      // Add default categories even if there's an error
      const defaultCategories = ['Work', 'Sleep', 'Exercise', 'Meal', 'Break', 'Study', 'Slack'];
      setRecentCategories(defaultCategories);
    }
  };

  // Handle category selection from dropdown
  const handleCategorySelect = (selectedCategory: string) => {
    setCategory(selectedCategory);
    setShowDropdown(false);
  };

  const handleSubmit = () => {
    if (!category.trim()) {
      setError('Please enter a category');
      return;
    }

    setError(null);

    try {
      const eventData = {
        endTime: endTime.getTime(),
        category: category.trim(),
        notes: notes.trim() || undefined,
        happiness: happinessState[0],
        wakefulness: wakefulnessState[0],
        health: healthState[0],
      };

      if (editEvent && onUpdate) {
        onUpdate(editEvent.id, eventData);
      } else {
        onSubmit(eventData);
      }
    } catch (error) {
      console.error('Error saving event:', error);
      setError('Failed to save event. Please try again.');
    }
  };

  const confirmDelete = () => {
    if (editEvent && onDelete) {
      try {
        onDelete(editEvent.id);
        onOpenChange(false);
        setShowDeleteConfirm(false);
      } catch (error) {
        console.error('Error deleting event:', error);
        setError('Failed to delete event. Please try again.');
        setShowDeleteConfirm(false);
      }
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  const adjustTime = (minutes: number) => {
    const newTime = new Date(endTime.getTime() + minutes * 60000);

    // Round to nearest 5 minutes
    const roundedTime = new Date(newTime);
    const currentMinutes = roundedTime.getMinutes();
    const roundedMinutes = Math.round(currentMinutes / 5) * 5;

    // Handle the case where rounding goes to 60 minutes
    if (roundedMinutes === 60) {
      roundedTime.setHours(roundedTime.getHours() + 1);
      roundedTime.setMinutes(0);
    } else {
      roundedTime.setMinutes(roundedMinutes);
    }

    // Reset seconds and milliseconds to ensure clean 5-minute intervals
    roundedTime.setSeconds(0);
    roundedTime.setMilliseconds(0);

    setEndTime(roundedTime);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getColorPreview = () => {
    // Create a temporary event object to use the same color calculation as the grid
    const tempEvent: ExocortexEvent = {
      id: 'preview',
      endTime: endTime.getTime(),
      category: category || 'preview',
      notes: notes.trim() || undefined,
      happiness: happinessState[0],
      wakefulness: wakefulnessState[0],
      health: healthState[0],
    };

    return getEventColor(tempEvent, config.colorOverrides);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={`${isMobile ? '!w-[85vw] !max-w-[85vw] !h-[85vh] overflow-y-auto overscroll-behavior-contain' : 'sm:max-w-md'} bg-gray-800 border-gray-700 text-white`}
        >
          {error && (
            <Alert variant="destructive" className="border-red-600 bg-red-900/20">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Smiley face canvas with color preview background */}
          <div className="flex justify-center py-2">
            <div className="relative">
              <div
                className={`${isMobile ? 'w-20 h-20' : 'w-32 h-32'} rounded-full border-2 border-gray-600`}
                style={{ backgroundColor: getColorPreview() }}
              />
              <canvas
                ref={canvasRef}
                width={isMobile ? "80" : "128"}
                height={isMobile ? "80" : "128"}
                className={`absolute top-0 left-0 ${isMobile ? 'w-20 h-20' : 'w-32 h-32'}`}
              />
            </div>
          </div>

        <div className="space-y-4">
          {/* Category input with dropdown */}
          <div className={`${isMobile ? '!space-y-0' : 'space-y-1'}`}>
            <Label htmlFor="category" className={`${isMobile ? '!text-xs' : 'text-sm'}`}>Category</Label>
            <div className="relative">
              <Input
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., Work, Sleep, Exercise"
                className={`${isMobile ? 'text-sm' : ''} bg-gray-700 border-gray-600 text-white placeholder-gray-400 pr-10`}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowDropdown(!showDropdown);
                }}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-600"
              >
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </Button>

              {/* Dropdown menu */}
              {showDropdown && recentCategories.length > 0 && (
                <div className={`absolute ${isMobile ? 'left-0 right-0 -ml-4 -mr-4' : 'left-0 right-0'} mt-1 bg-gray-700 border border-gray-600 rounded-md shadow-lg z-50 max-h-48 overflow-y-auto`}>
                  {recentCategories.map((cat, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleCategorySelect(cat);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-600 focus:bg-gray-600 focus:outline-none transition-colors ${isMobile ? 'px-4' : ''}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
              {showDropdown && recentCategories.length === 0 && (
                <div className={`absolute ${isMobile ? 'left-0 right-0 -ml-4 -mr-4' : 'left-0 right-0'} mt-1 bg-gray-700 border border-gray-600 rounded-md shadow-lg z-50`}>
                  <div className={`px-3 py-2 text-sm text-gray-400 ${isMobile ? 'px-4' : ''}`}>
                    No recent categories found
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notes textarea */}
          <div className={`${isMobile ? '!space-y-0' : 'space-y-1'}`}>
            <Label htmlFor="notes" className={`${isMobile ? '!text-xs' : 'text-sm'}`}>Diary Notes</Label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add your thoughts, reflections, or details about this event..."
              className={`w-full ${isMobile ? 'text-sm min-h-[60px]' : 'min-h-[80px]'} bg-gray-700 border-gray-600 text-white placeholder-gray-400 rounded-md p-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500`}
              rows={isMobile ? 3 : 4}
            />
          </div>

          {/* Time selection */}
          <div className={`${isMobile ? '!space-y-0' : 'space-y-1'}`}>
            <Label className={`${isMobile ? '!text-xs' : 'text-sm'}`}>Time</Label>
            <div className="flex items-center space-x-2">
              <Clock className={`${isMobile ? '!h-3 !w-3' : 'h-4 w-4'} text-gray-400`} />
              <span className={`${isMobile ? '!text-xs' : 'text-sm'}`}>
                {startTime ? `${startTime.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}, ${formatTime(startTime)} → ${formatTime(endTime)}` : `${formatDate(endTime)}, ${formatTime(endTime)}`}
              </span>
            </div>

            <div className="flex flex-col space-y-2">
              {/* Hour adjustment row */}
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => adjustTime(-60)}
                  className="bg-gray-700 border-gray-600"
                >
                  <ChevronLeft className="h-4 w-4" />
                  -1h
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => adjustTime(60)}
                  className="bg-gray-700 border-gray-600"
                >
                  +1h
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Minute adjustment row */}
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => adjustTime(-5)}
                  className="bg-gray-700 border-gray-600"
                >
                  <ChevronLeft className="h-4 w-4" />
                  -5m
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => adjustTime(5)}
                  className="bg-gray-700 border-gray-600"
                >
                  +5m
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Happiness slider */}
          <div className="space-y-1">
            <Label className="text-sm">Happiness: {Math.round(happinessState[0] * 100)}%</Label>
            <Slider
              value={happinessState}
              onValueChange={setHappinessState}
              max={1}
              min={0}
              step={0.01}
              className="w-full"
            />
          </div>

          {/* Wakefulness slider */}
          <div className="space-y-1">
            <Label className="text-sm">Wakefulness: {Math.round(wakefulnessState[0] * 100)}%</Label>
            <Slider
              value={wakefulnessState}
              onValueChange={setWakefulnessState}
              max={1}
              min={0}
              step={0.01}
              className="w-full"
            />
          </div>

          {/* Health slider */}
          <div className="space-y-1">
            <Label className="text-sm">Health: {Math.round(healthState[0] * 100)}%</Label>
            <Slider
              value={healthState}
              onValueChange={setHealthState}
              max={1}
              min={0}
              step={0.01}
              className="w-full"
            />
          </div>

          {/* Action buttons */}
          <div className={`${isMobile ? 'flex-col space-y-2 pt-4' : 'flex justify-end items-center'}`}>
            {editEvent && onDelete && (
              <Button
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                className="bg-red-600 hover:bg-red-700 h-9 mr-4"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="bg-gray-700 border-gray-600 h-9 mr-4"
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700 h-9">
              {editEvent ? (
                <>
                  <Save className="h-4 w-4 mr-1" />
                  Update
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </>
              )}
            </Button>
          </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className={`${isMobile ? '!w-[80vw] !max-w-[80vw] !p-4' : 'sm:max-w-sm'} bg-gray-800 border-gray-700 text-white`}>
          <DialogHeader>
            <DialogTitle>Delete Event</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-300">
              Are you sure you want to delete this event? This action cannot be undone.
            </p>
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={cancelDelete}
              className="bg-gray-700 border-gray-600"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}