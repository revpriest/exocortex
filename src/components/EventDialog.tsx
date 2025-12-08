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

  const width = canvas.width;
  const height = canvas.height;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2 - 4;

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  const health = healthArr[0];
  const wakefulness = wakefulnessArr[0];
  const happiness = happinessArr[0];

  // Dynamic face color based on health
  const red = Math.round(255 * (1 - health));
  const green = Math.round(255 * health);
  const blue = 100;

  // Draw face circle
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fillStyle = `rgb(${red}, ${green}, ${blue})`;
  ctx.fill();

  // Draw eyes
  const eyeRadius = radius * 0.12;
  const eyeOffsetX = radius * 0.4;
  const eyeOffsetY = radius * 0.2;

  ctx.beginPath();
  ctx.arc(centerX - eyeOffsetX, centerY - eyeOffsetY, eyeRadius, 0, Math.PI * 2);
  ctx.arc(centerX + eyeOffsetX, centerY - eyeOffsetY, eyeRadius, 0, Math.PI * 2);
  ctx.fillStyle = '#000000';
  ctx.fill();

  // Draw mouth based on happiness
  const mouthWidth = radius * 0.8;
  const mouthHeight = radius * 0.6;
  const mouthY = centerY + radius * 0.1;

  ctx.beginPath();

  const happinessOffset = (happiness - 0.5) * 2; // -1 to 1
  const startAngle = Math.PI * (0.1 - 0.3 * happinessOffset);
  const endAngle = Math.PI * (0.9 + 0.3 * happinessOffset);
  const mouthRadius = mouthHeight * (1 + Math.abs(happinessOffset));

  ctx.arc(centerX, mouthY, mouthRadius, startAngle, endAngle);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#000000';
  ctx.stroke();

  // Draw wakefulness indicator as a halo glow
  const wakefulnessIntensity = wakefulness;
  const gradient = ctx.createRadialGradient(centerX, centerY, radius * 0.8, centerX, centerY, radius * 1.4);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
  gradient.addColorStop(1, `rgba(255, 255, 0, ${0.4 * wakefulnessIntensity})`);

  ctx.beginPath();
  ctx.arc(centerX, centerY, radius * 1.4, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
}

// Props for the EventDialog component
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

  // ...rest of component unchanged
}
