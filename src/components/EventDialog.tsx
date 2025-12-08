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
import React, { useCallback, useEffect, useRef, useState } from 'react';

// Import UI components from our component library
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Import types and utilities
import { ExocortexEvent, getEventColor, getEventStartTime } from '@/lib/exocortex';
import { useAppContext } from '@/hooks/useAppContext';
import { Clock, ChevronLeft, ChevronRight, Trash2, AlertCircle, ChevronDown, X, Save, Plus } from 'lucide-react';
import { ExocortexDB } from '@/lib/exocortex';
import { useIsMobile } from '@/hooks/useIsMobile';

// Helper function to draw smiley face
function drawSmileyFaceOnCanvas(
  canvas: HTMLCanvasElement | null,
  healthArr: number[],
  wakefulnessArr: number[],
  happinessArr: number[],
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

  ctx.beginPath();
  ctx.ellipse(centerX - eyeXOffset, centerY - eyeYOffset, eyeWidth, eyeHeight, 0, 0, 2 * Math.PI);
  ctx.ellipse(centerX + eyeXOffset, centerY - eyeYOffset, eyeWidth, eyeHeight, 0, 0, 2 * Math.PI);
  ctx.fillStyle = '#000';
  ctx.fill();

  // Draw mouth based on happiness (big smile, flat, or frown)
  const mouthWidth = radius * 0.8;
  const mouthHeight = radius * 0.5;
  const mouthY = centerY + radius * 0.3;

  const startX = centerX - mouthWidth / 2;
  const endX = centerX + mouthWidth / 2;

  // Control point for quadratic curve (higher = smiling, lower = frowning)
  const happinessFactor = happinessVal * 2 - 1; // -1 to 1
  const controlY = mouthY + mouthHeight * -happinessFactor;

  ctx.beginPath();
  ctx.moveTo(startX, mouthY);
  ctx.quadraticCurveTo(centerX, controlY, endX, mouthY);
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 3;
  ctx.stroke();
}

interface EventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (eventData: Omit<ExocortexEvent, 'id' | 'dayKey'>) => void;
  onUpdate?: (id: string, eventData: Omit<ExocortexEvent, 'id' | 'dayKey'>) => void;
  onDelete?: (id: string) => void;
  editEvent?: ExocortexEvent | null;
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
  const [startLoadedForEventId, setStartLoadedForEventId] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Calculate start time from previous event using shared DB helper
  const calculateStartTime = useCallback(
    async (currentEndTime: Date) => {
      if (!open) return;

      try {
        const db = new ExocortexDB();
        await db.init();

        const startTimestamp = await getEventStartTime(db, currentEndTime.getTime());
        if (startTimestamp !== null) {
          setStartTime(new Date(startTimestamp));
        } else {
          setStartTime(null);
        }
      } catch (error) {
        console.error('Failed to calculate start time:', error);
        setStartTime(null);
      }
    },
    [open],
  );

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
        setStartLoadedForEventId(null);
      } else {
        setCategory('');
        setNotes('');
        setHappinessState([defaultValues?.happiness || 0.7]);
        setWakefulnessState([defaultValues?.wakefulness || 0.8]);
        setHealthState([defaultValues?.health || 0.9]);
        setEndTime(new Date());
        void calculateStartTime(new Date());
      }
    }
  }, [open, editEvent, defaultValues, calculateStartTime]);

  // Draw smiley face based on current mood values
  const drawSmileyFace = () => {
    drawSmileyFaceOnCanvas(canvasRef.current, healthState, wakefulnessState, happinessState);
  };

  // Update canvas when mood values change
  useEffect(() => {
    drawSmileyFace();
  });

  // Initial draw when component mounts
  useEffect(() => {
    drawSmileyFace();
  }, []);

  // Load recent categories when dialog opens
  useEffect(() => {
    if (open) {
      void loadRecentCategories();
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

  // Recalculate start time when relevant identifiers change
  useEffect(() => {
    if (!open) return;

    // When editing an existing event, we want the start time for that event once
    if (editEvent) {
      if (startLoadedForEventId !== editEvent.id) {
        setStartLoadedForEventId(editEvent.id);
        void calculateStartTime(new Date(editEvent.endTime));
      }
      return;
    }

    // For new events, recompute whenever the end time changes
    void calculateStartTime(endTime);
  }, [open, editEvent, endTime, startLoadedForEventId, calculateStartTime]);

  // Load recent unique categories from database
  const loadRecentCategories = async () => {
    try {
      const db = new ExocortexDB();
      await db.init();

      // Get events from the last 30 days including today
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 29); // -29 to include 30 days total (today + 29 previous)

      const days = await db.getEventsByDateRangeOnly(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0],
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
    } catch {
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
      }
    }
  };

  // ...rest of component JSX remains unchanged below
}
